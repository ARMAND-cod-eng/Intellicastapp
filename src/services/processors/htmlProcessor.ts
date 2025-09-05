import { htmlToText } from 'html-to-text';

export interface HTMLProcessor {
  extractContent(file: File): Promise<string>;
}

export class HTMLProcessor implements HTMLProcessor {
  async extractContent(file: File): Promise<string> {
    try {
      const htmlContent = await file.text();
      return this.htmlToPlainText(htmlContent);
    } catch (error) {
      throw new Error(`HTML processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract content while preserving some structure
  async extractStructuredContent(file: File): Promise<{
    text: string;
    headings: Array<{ level: number; text: string; index: number }>;
    paragraphs: Array<{ text: string; index: number }>;
    links: Array<{ text: string; url: string; index: number }>;
    metadata: any;
  }> {
    try {
      const htmlContent = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Extract text content
      const text = this.htmlToPlainText(htmlContent);
      
      // Extract headings
      const headings = this.extractHeadings(doc);
      
      // Extract paragraphs
      const paragraphs = this.extractParagraphs(doc);
      
      // Extract links
      const links = this.extractLinks(doc);
      
      // Extract metadata
      const metadata = this.extractMetadata(doc);

      return {
        text,
        headings,
        paragraphs,
        links,
        metadata
      };
    } catch (error) {
      throw new Error(`HTML structure extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private htmlToPlainText(html: string): string {
    // Use html-to-text library for better conversion
    const text = htmlToText(html, {
      wordwrap: false,
      selectors: [
        // Preserve headings with line breaks
        { selector: 'h1', options: { uppercase: false } },
        { selector: 'h2', options: { uppercase: false } },
        { selector: 'h3', options: { uppercase: false } },
        { selector: 'h4', options: { uppercase: false } },
        { selector: 'h5', options: { uppercase: false } },
        { selector: 'h6', options: { uppercase: false } },
        // Ignore script and style tags
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: 'nav', format: 'skip' },
        { selector: 'footer', format: 'skip' },
        // Preserve list structure
        { selector: 'ul', options: { itemPrefix: '• ' } },
        { selector: 'ol', options: { itemPrefix: '1. ' } }
      ]
    });

    return this.cleanText(text);
  }

  private extractHeadings(doc: Document): Array<{ level: number; text: string; index: number }> {
    const headings: Array<{ level: number; text: string; index: number }> = [];
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headingElements.forEach((element, index) => {
      const level = parseInt(element.tagName.charAt(1));
      const text = element.textContent?.trim() || '';
      
      if (text) {
        headings.push({ level, text, index });
      }
    });

    return headings;
  }

  private extractParagraphs(doc: Document): Array<{ text: string; index: number }> {
    const paragraphs: Array<{ text: string; index: number }> = [];
    const paragraphElements = doc.querySelectorAll('p');
    
    paragraphElements.forEach((element, index) => {
      const text = element.textContent?.trim() || '';
      
      if (text && text.length > 20) { // Skip very short paragraphs
        paragraphs.push({ text, index });
      }
    });

    return paragraphs;
  }

  private extractLinks(doc: Document): Array<{ text: string; url: string; index: number }> {
    const links: Array<{ text: string; url: string; index: number }> = [];
    const linkElements = doc.querySelectorAll('a[href]');
    
    linkElements.forEach((element, index) => {
      const text = element.textContent?.trim() || '';
      const url = element.getAttribute('href') || '';
      
      if (text && url && !url.startsWith('#')) { // Skip anchor links
        links.push({ text, url, index });
      }
    });

    return links;
  }

  private extractMetadata(doc: Document): any {
    const metadata: any = {};
    
    // Extract title
    const titleElement = doc.querySelector('title');
    if (titleElement) {
      metadata.title = titleElement.textContent?.trim();
    }

    // Extract meta tags
    const metaTags = doc.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      
      if (name && content) {
        // Handle common meta tags
        switch (name.toLowerCase()) {
          case 'description':
            metadata.description = content;
            break;
          case 'keywords':
            metadata.keywords = content.split(',').map(k => k.trim());
            break;
          case 'author':
            metadata.author = content;
            break;
          case 'og:title':
            metadata.ogTitle = content;
            break;
          case 'og:description':
            metadata.ogDescription = content;
            break;
          case 'article:published_time':
            metadata.publishedTime = content;
            break;
          case 'article:author':
            metadata.articleAuthor = content;
            break;
          default:
            metadata[name] = content;
        }
      }
    });

    // Extract canonical URL
    const canonicalLink = doc.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      metadata.canonicalUrl = canonicalLink.getAttribute('href');
    }

    return metadata;
  }

  private cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Fix common issues
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
      .replace(/\u2019/g, "'") // Replace smart apostrophes
      .replace(/\u2018/g, "'") // Replace smart quotes
      .replace(/\u201C/g, '"') // Replace smart quotes
      .replace(/\u201D/g, '"') // Replace smart quotes
      .replace(/\u2013/g, '-') // Replace en dashes
      .replace(/\u2014/g, '--') // Replace em dashes
      // Clean up excessive line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  // Extract main content from article/blog posts
  async extractMainContent(file: File): Promise<string> {
    try {
      const htmlContent = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Try to find main content selectors
      const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '.post-content',
        '.article-content',
        '.entry-content',
        '#content',
        '.main-content'
      ];

      let mainContent = null;
      
      for (const selector of contentSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
          mainContent = element.innerHTML;
          break;
        }
      }

      // Fallback to body if no main content found
      if (!mainContent) {
        const body = doc.querySelector('body');
        if (body) {
          mainContent = body.innerHTML;
        } else {
          mainContent = htmlContent;
        }
      }

      return this.htmlToPlainText(mainContent);
    } catch (error) {
      throw new Error(`Main content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}