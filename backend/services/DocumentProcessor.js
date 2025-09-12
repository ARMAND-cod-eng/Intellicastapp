import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs-extra';
import crypto from 'crypto';

class DocumentProcessor {
  constructor() {
    this.supportedFormats = ['.pdf', '.docx', '.txt', '.md'];
    this.maxTokens = 4000; // Safe limit for Qwen2.5:7b
  }

  /**
   * Extract text from various document formats
   */
  async extractText(filePath, mimeType) {
    try {
      console.log(`📄 Processing document: ${filePath}, type: ${mimeType}`);

      let text = '';

      switch (mimeType) {
        case 'application/pdf':
          text = await this.extractFromPDF(filePath);
          break;
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          text = await this.extractFromDOCX(filePath);
          break;
        
        case 'text/plain':
        case 'text/markdown':
          text = await this.extractFromText(filePath);
          break;
        
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const cleanText = this.cleanText(text);
      console.log(`✅ Extracted ${cleanText.length} characters`);
      
      return cleanText;

    } catch (error) {
      console.error('❌ Text extraction failed:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  async extractFromPDF(filePath) {
    const buffer = await fs.readFile(filePath);
    const data = await pdf(buffer);
    return data.text;
  }

  async extractFromDOCX(filePath) {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  async extractFromText(filePath) {
    return await fs.readFile(filePath, 'utf8');
  }

  /**
   * Clean and normalize text for processing
   */
  cleanText(text) {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere with TTS
      .replace(/[^\w\s.,!?;:()\-"']/g, '')
      // Fix common formatting issues
      .replace(/\s+([.,!?;:])/g, '$1')
      // Ensure proper sentence endings
      .replace(/([.!?])\s*(?=[A-Z])/g, '$1 ')
      // Remove leading/trailing whitespace
      .trim();
  }

  /**
   * Split text into chunks suitable for AI processing
   */
  async chunkText(text, maxTokens = this.maxTokens) {
    // Rough estimation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 3; // Conservative estimate
    
    if (text.length <= maxChars) {
      return [text];
    }

    const chunks = [];
    const sentences = this.splitIntoSentences(text);
    let currentChunk = '';

    for (const sentence of sentences) {
      // If adding this sentence would exceed the limit
      if ((currentChunk + sentence).length > maxChars) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          // Single sentence is too long, split it further
          const subChunks = this.splitLongSentence(sentence, maxChars);
          chunks.push(...subChunks);
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    console.log(`📝 Split into ${chunks.length} chunks`);
    return chunks.filter(chunk => chunk.length > 0);
  }

  splitIntoSentences(text) {
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0);
  }

  splitLongSentence(sentence, maxLength) {
    const chunks = [];
    let current = '';
    const words = sentence.split(' ');

    for (const word of words) {
      if ((current + word).length <= maxLength) {
        current += (current ? ' ' : '') + word;
      } else {
        if (current) {
          chunks.push(current);
          current = word;
        } else {
          // Word itself is too long
          chunks.push(word.slice(0, maxLength));
          current = word.slice(maxLength);
        }
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  }

  /**
   * Analyze document content for metadata
   */
  async analyzeContent(text) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = this.splitIntoSentences(text);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    // Estimate reading time (average 250 words per minute)
    const readingTime = Math.ceil(words.length / 250);

    // Determine content complexity based on sentence structure
    const avgWordsPerSentence = words.length / sentences.length;
    const complexity = this.determineComplexity(avgWordsPerSentence, text);

    // Detect content type based on patterns
    const contentType = this.detectContentType(text);

    // Generate content hash for caching
    const contentHash = crypto.createHash('md5').update(text).digest('hex');

    const analysis = {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      characterCount: text.length,
      readingTime,
      complexity,
      contentType,
      contentHash,
      estimatedTokens: Math.ceil(text.length / 3), // Rough token estimate
      metadata: {
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
        avgSentencesPerParagraph: Math.round((sentences.length / paragraphs.length) * 100) / 100
      }
    };

    console.log('📊 Content Analysis:', {
      words: analysis.wordCount,
      sentences: analysis.sentenceCount,
      readingTime: `${analysis.readingTime} min`,
      complexity: analysis.complexity,
      type: analysis.contentType
    });

    return analysis;
  }

  determineComplexity(avgWordsPerSentence, text) {
    // Simple heuristics for complexity
    if (avgWordsPerSentence < 15) return 'simple';
    if (avgWordsPerSentence < 25) return 'medium';
    return 'complex';
  }

  detectContentType(text) {
    const lowerText = text.toLowerCase();
    
    // Keywords for different content types
    const patterns = {
      academic: /abstract|methodology|hypothesis|conclusion|bibliography|references/,
      news: /breaking|reported|according to|journalist|newspaper|press/,
      technical: /algorithm|implementation|configuration|documentation|api/,
      business: /revenue|profit|market|strategy|analysis|financial/,
      educational: /learn|understand|explain|concept|definition|example/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerText)) {
        return type;
      }
    }

    return 'general';
  }

  /**
   * Generate content hash for caching
   */
  generateContentHash(content, options = {}) {
    const hashContent = JSON.stringify({ content, options });
    return crypto.createHash('sha256').update(hashContent).digest('hex');
  }

  /**
   * Validate document before processing
   */
  validateDocument(filePath, mimeType) {
    const errors = [];

    if (!fs.existsSync(filePath)) {
      errors.push('File does not exist');
    }

    const supportedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    if (!supportedMimes.includes(mimeType)) {
      errors.push(`Unsupported file type: ${mimeType}`);
    }

    const stats = fs.statSync(filePath);
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (stats.size > maxSize) {
      errors.push(`File too large: ${Math.round(stats.size / 1024 / 1024)}MB (max: 50MB)`);
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return true;
  }
}

export default DocumentProcessor;