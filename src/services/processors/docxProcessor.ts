import mammoth from 'mammoth';

export interface DOCXProcessor {
  extractContent(file: File): Promise<string>;
}

export class DOCXProcessor implements DOCXProcessor {
  async extractContent(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Extract text with basic formatting preservation
      const result = await mammoth.extractRawText({
        arrayBuffer: arrayBuffer
      });

      if (result.messages.length > 0) {
        console.warn('DOCX processing warnings:', result.messages);
      }

      return this.cleanText(result.value);
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract content with HTML formatting preserved
  async extractWithFormatting(file: File): Promise<{ text: string; html: string }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Extract both raw text and HTML
      const [textResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ arrayBuffer }),
        mammoth.convertToHtml({ arrayBuffer })
      ]);

      return {
        text: this.cleanText(textResult.value),
        html: htmlResult.value
      };
    } catch (error) {
      throw new Error(`DOCX formatting extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract document structure including headings and styles
  async extractStructuredContent(file: File): Promise<{
    text: string;
    headings: Array<{ level: number; text: string; index: number }>;
    paragraphs: Array<{ text: string; style?: string; index: number }>;
  }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const result = await mammoth.convertToHtml({
        arrayBuffer
      });

      const html = result.value;
      const text = this.htmlToText(html);
      
      // Extract headings from HTML
      const headings = this.extractHeadingsFromHtml(html);
      
      // Extract paragraphs
      const paragraphs = this.extractParagraphsFromHtml(html);

      return {
        text: this.cleanText(text),
        headings,
        paragraphs
      };
    } catch (error) {
      throw new Error(`DOCX structure extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Fix common DOCX extraction issues
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
      .replace(/\u2019/g, "'") // Replace smart apostrophes
      .replace(/\u2018/g, "'") // Replace smart quotes
      .replace(/\u201C/g, '"') // Replace smart quotes
      .replace(/\u201D/g, '"') // Replace smart quotes
      .replace(/\u2013/g, '-') // Replace en dashes
      .replace(/\u2014/g, '--') // Replace em dashes
      // Add proper paragraph breaks
      .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2')
      // Clean up excessive line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<h[1-6][^>]*>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private extractHeadingsFromHtml(html: string): Array<{ level: number; text: string; index: number }> {
    const headings: Array<{ level: number; text: string; index: number }> = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;
    let index = 0;

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const text = this.htmlToText(match[2]).trim();
      if (text) {
        headings.push({ level, text, index: index++ });
      }
    }

    return headings;
  }

  private extractParagraphsFromHtml(html: string): Array<{ text: string; style?: string; index: number }> {
    const paragraphs: Array<{ text: string; style?: string; index: number }> = [];
    const paragraphRegex = /<p([^>]*)>(.*?)<\/p>/gi;
    let match;
    let index = 0;

    while ((match = paragraphRegex.exec(html)) !== null) {
      const attributes = match[1];
      const text = this.htmlToText(match[2]).trim();
      
      if (text) {
        // Extract style information if available
        const styleMatch = attributes.match(/class="([^"]*)"/);
        const style = styleMatch ? styleMatch[1] : undefined;
        
        paragraphs.push({ text, style, index: index++ });
      }
    }

    return paragraphs;
  }

  // Extract document metadata
  async extractMetadata(file: File): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    createdDate?: Date;
    modifiedDate?: Date;
  }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Mammoth doesn't directly expose document properties,
      // but we can try to extract some basic information
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      
      // Look for title in the first heading
      const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const title = titleMatch ? this.htmlToText(titleMatch[1]).trim() : undefined;

      return {
        title,
        // Other metadata would need to be extracted using a different library
        // or by parsing the raw DOCX structure
      };
    } catch (error) {
      console.warn('Could not extract DOCX metadata:', error);
      return {};
    }
  }
}