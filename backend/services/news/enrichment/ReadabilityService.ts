/**
 * Readability Service for Full Article Text Extraction
 * Uses Mozilla's Readability algorithm to extract clean article content
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

interface ReadabilityConfig {
  timeout: number;
  userAgent: string;
  maxContentLength: number;
  minContentLength: number;
  preserveImages: boolean;
  preserveLinks: boolean;
}

interface ExtractionResult {
  success: boolean;
  title?: string;
  content?: string;
  textContent?: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  publishedTime?: string;
  dir?: string;
  length: number;
  wordCount: number;
  error?: string;
  url: string;
  extractionMethod: 'readability' | 'fallback';
}

export class ReadabilityService {
  private config: ReadabilityConfig;
  private logger: any;

  constructor(config?: Partial<ReadabilityConfig>, logger?: any) {
    this.config = {
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (compatible; NewsEnrichment/1.0)',
      maxContentLength: 500000, // 500KB limit
      minContentLength: 200,    // Minimum viable content
      preserveImages: false,     // Strip images for text processing
      preserveLinks: true,       // Keep links for context
      ...config
    };

    this.logger = logger || console;
  }

  /**
   * Extract article content from URL
   */
  async extractFromUrl(url: string): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Extracting content from URL: ${url}`);

      // Fetch the HTML content
      const html = await this.fetchHtml(url);

      if (!html) {
        return {
          success: false,
          error: 'Failed to fetch HTML content',
          url,
          length: 0,
          wordCount: 0,
          extractionMethod: 'readability'
        };
      }

      // Extract using Readability
      const result = await this.extractFromHtml(html, url);

      const duration = Date.now() - startTime;
      this.logger.debug(`Content extraction completed in ${duration}ms`, {
        url,
        success: result.success,
        wordCount: result.wordCount
      });

      return result;

    } catch (error) {
      this.logger.error(`Failed to extract content from ${url}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        url,
        length: 0,
        wordCount: 0,
        extractionMethod: 'readability'
      };
    }
  }

  /**
   * Extract article content from HTML string
   */
  async extractFromHtml(html: string, url: string): Promise<ExtractionResult> {
    try {
      // Check content length
      if (html.length > this.config.maxContentLength) {
        this.logger.warn(`HTML content too large: ${html.length} bytes, truncating`);
        html = html.substring(0, this.config.maxContentLength);
      }

      // Create DOM from HTML
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      // Check if document was created successfully
      if (!document || !document.documentElement) {
        throw new Error('Invalid HTML document');
      }

      // Try Readability extraction first
      const readabilityResult = await this.tryReadabilityExtraction(document, url);

      if (readabilityResult.success) {
        return readabilityResult;
      }

      // Fallback extraction method
      this.logger.debug(`Readability failed, trying fallback extraction for ${url}`);
      const fallbackResult = await this.fallbackExtraction(document, url);

      return fallbackResult;

    } catch (error) {
      this.logger.error(`HTML extraction failed for ${url}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        url,
        length: 0,
        wordCount: 0,
        extractionMethod: 'readability'
      };
    }
  }

  /**
   * Try Mozilla's Readability extraction
   */
  private async tryReadabilityExtraction(document: Document, url: string): Promise<ExtractionResult> {
    try {
      // Clone the document for Readability (it modifies the DOM)
      const documentClone = document.cloneNode(true) as Document;

      // Check if document is probably readable
      const isProbablyReaderable = Readability.isProbablyReaderable(documentClone, {
        minContentLength: this.config.minContentLength,
        minScore: 20
      });

      if (!isProbablyReaderable) {
        this.logger.debug(`Document probably not readable: ${url}`);
      }

      // Create Readability instance
      const reader = new Readability(documentClone, {
        debug: false,
        maxElemsToParse: 0, // No limit
        nbTopCandidates: 5,
        charThreshold: this.config.minContentLength,
        classesToPreserve: ['caption', 'credit'],
        keepClasses: this.config.preserveLinks,
        serializer: (el: Element) => {
          // Custom serialization to clean up content
          return this.serializeElement(el);
        }
      });

      // Parse the document
      const article = reader.parse();

      if (!article) {
        return {
          success: false,
          error: 'Readability could not parse the article',
          url,
          length: 0,
          wordCount: 0,
          extractionMethod: 'readability'
        };
      }

      // Clean and process the content
      const cleanContent = this.cleanContent(article.content);
      const textContent = this.extractTextContent(cleanContent);
      const wordCount = this.calculateWordCount(textContent);

      // Validate minimum content requirements
      if (wordCount < this.config.minContentLength / 4) {
        return {
          success: false,
          error: 'Extracted content too short',
          url,
          length: cleanContent.length,
          wordCount,
          extractionMethod: 'readability'
        };
      }

      return {
        success: true,
        title: this.cleanText(article.title) || undefined,
        content: cleanContent,
        textContent,
        excerpt: this.generateExcerpt(textContent),
        byline: this.cleanText(article.byline) || undefined,
        siteName: this.cleanText(article.siteName) || undefined,
        publishedTime: article.publishedTime || undefined,
        dir: article.dir || undefined,
        length: cleanContent.length,
        wordCount,
        url,
        extractionMethod: 'readability'
      };

    } catch (error) {
      this.logger.debug(`Readability extraction failed: ${error}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        url,
        length: 0,
        wordCount: 0,
        extractionMethod: 'readability'
      };
    }
  }

  /**
   * Fallback content extraction when Readability fails
   */
  private async fallbackExtraction(document: Document, url: string): Promise<ExtractionResult> {
    try {
      // Remove unwanted elements
      this.removeUnwantedElements(document);

      // Try common content selectors
      const contentSelectors = [
        'article',
        '[role="main"]',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content',
        '#content',
        '.story-body',
        '.article-body',
        'main'
      ];

      let content = '';
      let title = '';

      // Extract title
      const titleElement = document.querySelector('h1') ||
                          document.querySelector('title') ||
                          document.querySelector('.title');

      if (titleElement) {
        title = this.cleanText(titleElement.textContent || '');
      }

      // Try content selectors
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const elementText = element.textContent || '';
          if (elementText.length > content.length) {
            content = elementText;
          }
        }
      }

      // If still no good content, try body
      if (content.length < this.config.minContentLength) {
        const body = document.querySelector('body');
        if (body) {
          content = body.textContent || '';
        }
      }

      // Clean the content
      content = this.cleanText(content);
      const wordCount = this.calculateWordCount(content);

      if (wordCount < this.config.minContentLength / 4) {
        return {
          success: false,
          error: 'Fallback extraction: content too short',
          url,
          length: content.length,
          wordCount,
          extractionMethod: 'fallback'
        };
      }

      return {
        success: true,
        title: title || undefined,
        content: content,
        textContent: content,
        excerpt: this.generateExcerpt(content),
        length: content.length,
        wordCount,
        url,
        extractionMethod: 'fallback'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        url,
        length: 0,
        wordCount: 0,
        extractionMethod: 'fallback'
      };
    }
  }

  /**
   * Fetch HTML content from URL
   */
  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      if (!html || html.length < 100) {
        throw new Error('Empty or too short HTML response');
      }

      return html;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`Request timeout for ${url}`);
      } else {
        this.logger.error(`Failed to fetch ${url}:`, error);
      }
      return null;
    }
  }

  /**
   * Remove unwanted elements from document
   */
  private removeUnwantedElements(document: Document): void {
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      'aside',
      '.advertisement',
      '.ads',
      '.social-share',
      '.comments',
      '.sidebar',
      '.related-articles',
      '.newsletter-signup',
      '.popup',
      '.modal'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => element.remove());
    });
  }

  /**
   * Custom element serialization for Readability
   */
  private serializeElement(element: Element): string {
    if (!element) return '';

    // For text nodes, return the text
    if (element.nodeType === 3) {
      return element.textContent || '';
    }

    // For element nodes
    let result = '';

    if (element.tagName) {
      const tag = element.tagName.toLowerCase();

      // Add spacing for block elements
      if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br'].includes(tag)) {
        result += '\n';
      }

      // Handle lists
      if (tag === 'li') {
        result += '\n• ';
      }

      // Add the text content
      result += element.textContent || '';

      // Add spacing after block elements
      if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        result += '\n';
      }
    }

    return result;
  }

  /**
   * Clean HTML content and convert to clean text
   */
  private cleanContent(html: string): string {
    if (!html) return '';

    // Remove HTML tags but preserve formatting
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<[^>]+>/g, ' ');

    return this.cleanText(text);
  }

  /**
   * Extract plain text content from HTML
   */
  private extractTextContent(html: string): string {
    if (!html) return '';

    // Create a temporary DOM to extract text
    try {
      const dom = new JSDOM(html);
      return dom.window.document.body?.textContent || html;
    } catch {
      // Fallback to regex-based cleaning
      return this.cleanContent(html);
    }
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    if (!text) return '';

    return text
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      // Clean up whitespace
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      // Remove extra spaces around punctuation
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/([.!?])\s*\n/g, '$1\n')
      .trim();
  }

  /**
   * Calculate word count
   */
  private calculateWordCount(text: string): number {
    if (!text) return 0;

    return text
      .split(/\s+/)
      .filter(word => word.length > 0 && /\w/.test(word))
      .length;
  }

  /**
   * Generate article excerpt
   */
  private generateExcerpt(text: string, maxLength = 300): string {
    if (!text || text.length <= maxLength) return text;

    // Find the last complete sentence within the limit
    const truncated = text.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );

    if (lastSentenceEnd > maxLength * 0.6) {
      return truncated.substring(0, lastSentenceEnd + 1).trim();
    }

    // If no good sentence break, cut at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace).trim() + '...';
    }

    return truncated.trim() + '...';
  }

  /**
   * Batch process multiple URLs
   */
  async extractBatch(urls: string[], concurrency = 3): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      const extractPromise = this.extractFromUrl(url).then(result => {
        results[i] = result;
      });

      executing.push(extractPromise);

      // Limit concurrency
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        for (let j = executing.length - 1; j >= 0; j--) {
          const isSettled = await Promise.race([
            executing[j].then(() => true, () => true),
            Promise.resolve(false)
          ]);
          if (isSettled) {
            executing.splice(j, 1);
          }
        }
      }
    }

    // Wait for all remaining extractions
    await Promise.all(executing);

    return results;
  }

  /**
   * Get extraction statistics
   */
  getStats(): {
    totalExtractions: number;
    successfulExtractions: number;
    failedExtractions: number;
    averageContentLength: number;
    averageWordCount: number;
  } {
    // This would be tracked in a real implementation
    return {
      totalExtractions: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      averageContentLength: 0,
      averageWordCount: 0
    };
  }

  /**
   * Test if a URL is extractable
   */
  async testExtraction(url: string): Promise<{
    isProbablyReadable: boolean;
    hasContent: boolean;
    estimatedWordCount: number;
    extractionMethod: string;
  }> {
    try {
      const html = await this.fetchHtml(url);
      if (!html) {
        return {
          isProbablyReadable: false,
          hasContent: false,
          estimatedWordCount: 0,
          extractionMethod: 'none'
        };
      }

      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      const isProbablyReadable = Readability.isProbablyReaderable(document, {
        minContentLength: this.config.minContentLength
      });

      const bodyText = document.body?.textContent || '';
      const wordCount = this.calculateWordCount(bodyText);

      return {
        isProbablyReadable,
        hasContent: wordCount > 50,
        estimatedWordCount: wordCount,
        extractionMethod: isProbablyReadable ? 'readability' : 'fallback'
      };

    } catch (error) {
      return {
        isProbablyReadable: false,
        hasContent: false,
        estimatedWordCount: 0,
        extractionMethod: 'error'
      };
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      // Test with a known good URL (could be a test endpoint)
      const testUrl = 'https://example.com';
      const testResult = await this.testExtraction(testUrl);

      return {
        status: 'healthy',
        details: {
          service: 'ReadabilityService',
          testUrl,
          canFetch: true,
          config: {
            timeout: this.config.timeout,
            maxContentLength: this.config.maxContentLength,
            minContentLength: this.config.minContentLength
          }
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          service: 'ReadabilityService',
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}