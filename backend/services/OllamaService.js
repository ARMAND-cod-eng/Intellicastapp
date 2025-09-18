import fetch from 'node-fetch';

class OllamaService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.primaryModel = options.primaryModel || 'qwen2.5:7b';
    this.fallbackModel = options.fallbackModel || 'llama3.1:8b';
    this.fastModel = options.fastModel || 'llama3.1:8b'; // Faster model for quick tasks
    this.timeout = options.timeout || 600000; // 10 minutes for stable AI generation
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
        throw new Error(`AI model taking too long to respond. Please try again with shorter content or wait for the model to warm up.`);
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

    // ALWAYS use Qwen model for high-quality content generation
    const QWEN_MODEL = 'qwen2.5:7b'; // Force Qwen for all narration tasks
    let modelToUse = QWEN_MODEL;
    let temperatureToUse = 0.7;

    // For document summaries, use ultra-precise settings for maximum quality
    if (type === 'document-summary' || type === 'summary') {
      temperatureToUse = 0.2; // Ultra-low temperature for maximum precision and consistency
      console.log(`🎯 Using PREMIUM Qwen mode: ${modelToUse} with temperature ${temperatureToUse} for ${type}`);
    } else {
      temperatureToUse = 0.4; // Reduced temperature for all narration types for better quality
      console.log(`🎯 Using high-quality Qwen mode: ${modelToUse} with temperature ${temperatureToUse} for ${type}`);
    }

    console.log(`🎯 Using model: ${modelToUse} for ${type} (content length: ${text.length})`);

    // Only use truncation for extremely large documents (20KB+) to maintain quality
    if (text.length > 20000) {
      console.log(`📏 Very large document detected (${text.length} chars), using intelligent truncation`);

      // Smart truncation: Take first 8KB + last 2KB to capture intro and conclusion
      const firstPart = text.substring(0, 8000);
      const lastPart = text.substring(text.length - 2000);
      const truncatedText = firstPart + '\n\n[... content continues ...]\n\n' + lastPart;

      const fullPrompt = `${prompt}\n\nContent to summarize:\n${truncatedText}`;

      console.log(`📝 Generating ${type} narration script for very large document...`);

      const result = await this.generateText(fullPrompt, {
        model: modelToUse,
        temperature: temperatureToUse,
        maxTokens: this.calculateMaxTokens(type, 12000) // Adjust for truncated content
      });

      // Clean the generated script
      if (result.success) {
        result.response = this.cleanNarrationScript(result.response);
      }

      return result;
    }

    const fullPrompt = `${prompt}\n\nContent to summarize:\n${text}`;

    console.log(`📝 Generating ${type} narration script...`);

    const result = await this.generateText(fullPrompt, {
      model: modelToUse,
      temperature: temperatureToUse,
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

      'document-summary': `You are an expert content analyst with exceptional analytical capabilities and deep subject matter expertise. Your task is to create a masterful, high-quality summary that captures the true essence and value of the provided document.

ANALYTICAL FRAMEWORK:
1. CORE ANALYSIS: Identify the document's central thesis, primary arguments, and foundational concepts
2. INSIGHT EXTRACTION: Uncover both explicit findings and implicit insights that may not be immediately obvious
3. CONTEXTUAL UNDERSTANDING: Assess the document's significance within its broader field or domain
4. CRITICAL EVALUATION: Analyze the strength of arguments, quality of evidence, and logical coherence
5. SYNTHESIS: Connect disparate concepts and identify underlying patterns or themes

SUMMARY REQUIREMENTS:
- LENGTH: 300-500 words for substantive, professional-grade analysis
- STRUCTURE: Begin with the document's primary purpose, proceed through key findings, and conclude with significance
- DEPTH: Go beyond surface-level description to provide meaningful analysis and interpretation
- PRECISION: Use exact, specific language that accurately represents the document's content and intent
- INSIGHTS: Highlight novel concepts, important implications, and actionable information
- CONNECTIONS: Show relationships between different ideas and how they support the overall thesis
- CONTEXT: Explain why this document matters and what makes it valuable or unique
- CLARITY: Write in clear, sophisticated prose that demonstrates intellectual rigor

QUALITY STANDARDS:
- Demonstrate deep comprehension through nuanced analysis
- Include specific examples or evidence when they illuminate key points
- Avoid generic statements; every sentence should add substantive value
- Capture the author's voice and perspective while maintaining analytical objectivity
- Ensure the summary could serve as a standalone piece for understanding the document's core value

Write a comprehensive summary that showcases both the document's content and your analytical expertise. Focus on delivering exceptional quality that reflects serious intellectual engagement with the material.`
    };
  }

  /**
   * Calculate appropriate max tokens based on narration type and content length
   */
  calculateMaxTokens(type, contentLength) {
    // Enhanced calculation for higher quality outputs
    const baseTokens = Math.min(Math.ceil(contentLength / 4), 1200); // Increased base for better quality

    const multipliers = {
      summary: 0.6,      // Increased for better summaries
      full: 0.9,         // Increased for more complete content
      explanatory: 1.2,  // Increased for detailed explanations
      briefing: 0.7,     // Increased for comprehensive briefings
      interactive: 0.8,  // Increased for engaging content
      'document-summary': 0.8 // Significantly increased for high-quality summaries (200-400 words)
    };

    // Ensure minimum tokens for document summaries to get quality output
    let result = Math.ceil(baseTokens * (multipliers[type] || 0.6));

    if (type === 'document-summary') {
      result = Math.max(result, 600); // Minimum 600 tokens for substantive summaries
    }

    console.log(`🧮 Calculated max tokens for ${type}: ${result} (content length: ${contentLength})`);
    return result;
  }

  /**
   * Generate high-quality document summary (dedicated method)
   * ALWAYS uses Qwen model for superior analytical capabilities
   */
  async generateDocumentSummary(content, options = {}) {
    const {
      focusAreas = [],
      summaryStyle = 'comprehensive',
      maxLength = 500 // Increased for higher quality
    } = options;

    // FORCE Qwen model for document summaries - no fallback for quality
    const QWEN_MODEL = 'qwen2.5:7b'; // Hardcoded to ensure Qwen is always used

    let enhancedPrompt = `You are a world-class content analyst with exceptional expertise in document analysis and synthesis. Your mission is to create a masterful, publication-quality summary that demonstrates profound understanding and analytical depth.

INTELLECTUAL APPROACH:
1. DEEP READING: Comprehensively analyze the document's structure, arguments, and underlying logic
2. CRITICAL THINKING: Evaluate the strength of evidence, identify assumptions, and assess reasoning quality
3. INSIGHT MINING: Extract both explicit findings and subtle implications that require analytical sophistication
4. SYNTHESIS: Weave together disparate concepts to reveal the document's unified message and broader significance
5. CONTEXTUAL EVALUATION: Assess the document's contribution within its field and potential impact

PREMIUM SUMMARY STANDARDS:
- LENGTH: ${maxLength} words minimum - prioritize depth and comprehensiveness over brevity
- ANALYTICAL RIGOR: Demonstrate sophisticated understanding through nuanced interpretation
- INTELLECTUAL SOPHISTICATION: Use precise, scholarly language that reflects serious academic engagement
- STRUCTURAL EXCELLENCE: Create logical flow from purpose → key findings → implications → significance
- INSIGHT DENSITY: Every sentence must deliver substantial analytical value
- EVIDENCE INTEGRATION: Incorporate specific examples that illuminate broader patterns
- CRITICAL PERSPECTIVE: Show awareness of strengths, limitations, and broader context

EXECUTION REQUIREMENTS:
- Begin with the document's core purpose and primary contribution
- Systematically develop key findings with analytical commentary
- Highlight novel insights and their practical implications
- Connect ideas to show how they support the overarching thesis
- Conclude with the document's broader significance and value proposition
- Maintain scholarly objectivity while capturing the author's perspective
- Eliminate all generic language - every word must serve the analysis

OUTPUT QUALITY:
Your summary should be indistinguishable from expert academic analysis. It must demonstrate both comprehensive understanding of the content and sophisticated analytical interpretation that adds genuine intellectual value.`;

    if (focusAreas.length > 0) {
      enhancedPrompt += `\n\nANALYTICAL FOCUS AREAS: Provide enhanced analysis of these specific dimensions: ${focusAreas.join(', ')}`;
    }

    enhancedPrompt += `\n\nDOCUMENT FOR EXPERT ANALYSIS:\n${content}`;

    console.log(`🎯 Generating PREMIUM document summary using Qwen model: ${QWEN_MODEL}...`);
    console.log(`📊 Content length: ${content.length} characters | Target quality: MAXIMUM`);

    const result = await this.generateText(enhancedPrompt, {
      model: QWEN_MODEL, // FORCE Qwen - no substitution allowed
      temperature: 0.2, // Very low temperature for maximum precision and consistency
      maxTokens: Math.max(800, Math.ceil(maxLength * 2)), // Generous token allowance for quality
      useCache: true,
      retryWithFallback: false // NO FALLBACK - Qwen only for quality assurance
    });

    if (result.success) {
      // Advanced text cleaning for professional output
      result.response = result.response
        .trim()
        // Remove generic openings
        .replace(/^(This document|The document|This text|The text|This paper|The paper|This article|The article)[\s\w]*?[:.,]\s*/i, '')
        .replace(/^(Summary|Overview|Analysis)[:.]?\s*/i, '')
        // Remove meta-commentary
        .replace(/^(In summary|To summarize|In conclusion)[:,.]?\s*/i, '')
        // Clean up any remaining formatting issues
        .replace(/\s+/g, ' ')
        .trim();

      console.log(`✅ HIGH-QUALITY summary generated: ${result.response.length} characters using ${result.model}`);
    }

    return result;
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