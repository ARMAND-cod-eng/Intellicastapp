import fetch from 'node-fetch';

class OllamaService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.primaryModel = options.primaryModel || 'qwen2.5:7b';
    this.fallbackModel = options.fallbackModel || 'llama3.1:8b';
    this.fastModel = options.fastModel || 'llama3.1:8b'; // Faster model for quick tasks
    this.timeout = options.timeout || 120000; // 2 minutes - back to original speed
    this.cache = new Map(); // Simple in-memory cache
  }

  /**
   * Test connection to Ollama service
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        const availableModels = data.models?.map(m => m.name) || [];
        
        return {
          connected: true,
          models: availableModels,
          primaryAvailable: availableModels.some(m => m.includes(this.primaryModel.split(':')[0])),
          fallbackAvailable: availableModels.some(m => m.includes(this.fallbackModel.split(':')[0]))
        };
      }
      
      return { connected: false, error: 'Service not responding' };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Generate text using Ollama with retry logic
   */
  async generateText(prompt, options = {}) {
    const {
      model = this.primaryModel,
      temperature = 0.7,
      maxTokens = 2000,
      useCache = true,
      retryWithFallback = true
    } = options;

    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, { model, temperature, maxTokens });
    if (useCache && this.cache.has(cacheKey)) {
      console.log('📦 Using cached response');
      return this.cache.get(cacheKey);
    }

    try {
      const result = await this.callOllama(prompt, { model, temperature, maxTokens });
      
      // Cache successful results
      if (useCache && result.success) {
        this.cache.set(cacheKey, result);
      }
      
      return result;
      
    } catch (error) {
      console.warn(`⚠️  Primary model (${model}) failed:`, error.message);
      
      // Retry with fallback model if enabled and not already using it
      if (retryWithFallback && model !== this.fallbackModel) {
        console.log(`🔄 Retrying with fallback model: ${this.fallbackModel}`);
        return await this.generateText(prompt, { 
          ...options, 
          model: this.fallbackModel, 
          retryWithFallback: false 
        });
      }
      
      throw error;
    }
  }

  async callOllama(prompt, options) {
    const { model, temperature, maxTokens } = options;
    
    const requestBody = {
      model,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
        top_p: 0.9,
        top_k: 40
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log(`🤖 Generating with model: ${model}`);
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('No response from model');
      }

      return {
        success: true,
        response: data.response.trim(),
        model: model,
        totalDuration: data.total_duration,
        tokensGenerated: data.eval_count || 0
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error(`⏱️  Ollama request timed out after ${this.timeout / 1000} seconds for model: ${model}`);
        throw new Error(`Request timeout after ${this.timeout / 1000} seconds`);
      }
      
      console.error(`❌ Ollama API error:`, error.message);
      console.error(`❌ Model: ${model}, URL: ${this.baseUrl}/api/generate`);
      
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  /**
   * Clean up generated script to remove any stage directions
   */
  cleanNarrationScript(script) {
    // Remove common stage directions and formatting
    let cleaned = script
      // Remove parenthetical stage directions
      .replace(/\([^)]*pause[^)]*\)/gi, '')
      .replace(/\([^)]*emphasis[^)]*\)/gi, '')
      .replace(/\([^)]*dramatic[^)]*\)/gi, '')
      .replace(/\([^)]*effect[^)]*\)/gi, '')
      .replace(/\([^)]*sound[^)]*\)/gi, '')
      .replace(/\([^)]*music[^)]*\)/gi, '')
      .replace(/\([^)]*beat[^)]*\)/gi, '')
      .replace(/\([^)]*silence[^)]*\)/gi, '')
      // Remove bracket-based stage directions
      .replace(/\[[^\]]*pause[^\]]*\]/gi, '')
      .replace(/\[[^\]]*emphasis[^\]]*\]/gi, '')
      .replace(/\[[^\]]*dramatic[^\]]*\]/gi, '')
      .replace(/\[[^\]]*effect[^\]]*\]/gi, '')
      // Remove other formatting
      .replace(/\*[^*]*\*/g, '') // Remove *emphasis*
      .replace(/_[^_]*_/g, '')   // Remove _underlined_
      .replace(/\s*\.\.\.\s*/g, '... ') // Clean up ellipses
      // Clean up multiple spaces and newlines
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return cleaned;
  }

  /**
   * Generate narration script based on content type
   */
  async generateNarrationScript(text, type = 'summary', contentAnalysis = {}) {
    const prompts = this.getNarrationPrompts(contentAnalysis);
    const prompt = prompts[type] || prompts.summary;
    
    // Only use truncation for extremely large documents (25KB+)
    if (text.length > 25000) {
      console.log(`📏 Extremely large document detected (${text.length} chars), using truncated approach`);
      const truncatedText = text.substring(0, 8000) + '...\n\n[Note: This is a very large document - summary based on key sections]';
      const fullPrompt = `${prompt}\n\nContent to summarize:\n${truncatedText}`;
      
      console.log(`📝 Generating ${type} narration script for large document...`);
      
      const result = await this.generateText(fullPrompt, {
        temperature: 0.7,
        maxTokens: this.calculateMaxTokens(type, 8000)
      });

      // Clean the generated script
      if (result.success) {
        result.response = this.cleanNarrationScript(result.response);
      }
      
      return result;
    }
    
    const fullPrompt = `${prompt}\n\nContent to narrate:\n${text}`;
    
    console.log(`📝 Generating ${type} narration script...`);
    
    const result = await this.generateText(fullPrompt, {
      temperature: 0.7,
      maxTokens: this.calculateMaxTokens(type, text.length)
    });

    // Clean the generated script
    if (result.success) {
      result.response = this.cleanNarrationScript(result.response);
    }
    
    return result;
  }

  /**
   * Get specialized prompts based on content analysis
   */
  getNarrationPrompts(contentAnalysis = {}) {
    const { contentType = 'general', complexity = 'medium' } = contentAnalysis;
    
    const baseInstructions = `Create an engaging narration script for a podcast. Use natural, conversational language that flows smoothly when spoken aloud. Write only the words that should be spoken - NO stage directions, sound effects, or formatting instructions. Keep sentences clear and not too long.`;
    
    return {
      summary: `${baseInstructions}

Task: Create a compelling summary that captures the main points and key insights. Focus on the most important information that listeners need to know.

Requirements:
- Start with a brief, engaging introduction
- Present key points in logical order
- Use conversational tone that flows naturally
- End with a memorable conclusion
- Write ONLY spoken words - no parenthetical directions, no (pause), no (emphasis)
- Length: Aim for 3-5 minutes of spoken content`,

      full: `${baseInstructions}

Task: Convert this content into a complete narration that covers all important details while remaining engaging for audio listeners.

Requirements:
- Maintain all crucial information
- Break complex concepts into digestible parts
- Use storytelling techniques where appropriate
- Create smooth transitions between sections with natural language
- Include brief explanations for technical terms
- Write ONLY spoken words - no stage directions or parenthetical instructions`,

      explanatory: `${baseInstructions}

Task: Create an educational narration that explains concepts clearly and thoroughly.

Requirements:
- Start with context and background
- Break down complex ideas step by step
- Use analogies and examples naturally in speech
- Define key terms conversationally
- Encourage understanding rather than memorization
- Include rhetorical questions as natural speech
- Write ONLY spoken words - no stage directions or formatting`,

      briefing: `${baseInstructions}

Task: Create a focused briefing that highlights actionable insights and key takeaways.

Requirements:
- Lead with the most important points
- Focus on practical implications
- Highlight actionable items naturally in speech
- Present information in clear, organized manner
- Keep it concise but comprehensive
- Write ONLY spoken words - no formatting or stage directions`,

      interactive: `${baseInstructions}

Task: Create an interactive narration that engages listeners and encourages active thinking.

Requirements:
- Include rhetorical questions naturally in speech
- Use "think about this" and similar phrases conversationally
- Create mental exercises through natural speech
- Encourage listeners to relate content to their experience
- Make it feel like a natural conversation
- Write ONLY spoken words - no stage directions or parenthetical instructions`,

      'document-summary': `Create a concise, professional document summary without any podcast formatting or conversational elements.

Task: Generate a clean, focused summary that captures the essential information and key insights from the document.

Requirements:
- Write in clear, formal prose
- Focus on main points, arguments, and conclusions
- Use 2-3 well-structured paragraphs
- No introductions, welcomes, or conversational tone
- No podcast formatting, brackets, or host references
- Direct, informative summary style
- Highlight the most important insights and takeaways`
    };
  }

  /**
   * Calculate appropriate max tokens based on narration type and content length
   */
  calculateMaxTokens(type, contentLength) {
    const baseTokens = Math.min(Math.ceil(contentLength / 3), 1500); // Conservative estimate
    
    const multipliers = {
      summary: 0.8,      // Shorter output
      full: 1.2,         // Longer, more detailed
      explanatory: 1.5,  // Most detailed
      briefing: 0.9,     // Concise
      interactive: 1.1   // Slightly longer with questions
    };
    
    return Math.ceil(baseTokens * (multipliers[type] || 1));
  }

  /**
   * Answer questions about the content
   */
  async answerQuestion(content, question, context = {}) {
    const prompt = `Based on the following content, answer the question in a conversational, natural way suitable for audio narration.

Content:
${content}

Question: ${question}

Requirements:
- Provide a clear, direct answer
- Use conversational tone
- Keep response concise but informative
- If the answer isn't in the content, say so clearly
- Make it sound natural when spoken aloud`;

    console.log(`❓ Answering question: ${question.slice(0, 50)}...`);
    
    return await this.generateText(prompt, {
      temperature: 0.6, // Slightly lower for more focused answers
      maxTokens: 800
    });
  }

  /**
   * Generate cache key for responses
   */
  generateCacheKey(prompt, options) {
    const keyData = {
      prompt: prompt.slice(0, 100), // First 100 chars to keep key size reasonable
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    };
    
    return JSON.stringify(keyData);
  }

  /**
   * Clear cache (useful for memory management)
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️  Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()).map(key => JSON.parse(key).prompt.slice(0, 30) + '...')
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      const connectionTest = await this.testConnection();
      
      if (!connectionTest.connected) {
        return {
          status: 'unhealthy',
          error: connectionTest.error,
          timestamp: new Date().toISOString()
        };
      }

      // Test with a simple generation
      const testResult = await this.generateText('Hello', {
        maxTokens: 10,
        useCache: false,
        retryWithFallback: false
      });

      return {
        status: 'healthy',
        models: connectionTest,
        cache: this.getCacheStats(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default OllamaService;