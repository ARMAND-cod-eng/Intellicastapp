import { marked } from 'marked';

export interface MarkdownProcessor {
  extractContent(file: File): Promise<string>;
}

export class MarkdownProcessor implements MarkdownProcessor {
  constructor() {
    // Configure marked for better parsing
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Convert line breaks to <br>
    });
  }

  async extractContent(file: File): Promise<string> {
    try {
      const markdownContent = await file.text();
      return this.markdownToPlainText(markdownContent);
    } catch (error) {
      throw new Error(`Markdown processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract structured content with markdown elements preserved
  async extractStructuredContent(file: File): Promise<{
    text: string;
    html: string;
    headings: Array<{ level: number; text: string; index: number; id?: string }>;
    codeBlocks: Array<{ language: string; code: string; index: number }>;
    links: Array<{ text: string; url: string; title?: string; index: number }>;
    images: Array<{ alt: string; url: string; title?: string; index: number }>;
    tables: Array<{ headers: string[]; rows: string[][]; index: number }>;
    metadata?: any;
  }> {
    try {
      const markdownContent = await file.text();
      
      // Extract frontmatter if present
      const { content, metadata } = this.extractFrontmatter(markdownContent);
      
      // Convert to HTML for structure extraction
      const html = await marked.parse(content);
      
      // Extract plain text
      const text = this.markdownToPlainText(content);
      
      // Extract various elements
      const headings = this.extractHeadings(content);
      const codeBlocks = this.extractCodeBlocks(content);
      const links = this.extractLinks(content);
      const images = this.extractImages(content);
      const tables = this.extractTables(content);

      return {
        text,
        html,
        headings,
        codeBlocks,
        links,
        images,
        tables,
        metadata
      };
    } catch (error) {
      throw new Error(`Markdown structure extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private markdownToPlainText(markdown: string): string {
    // Remove frontmatter
    const { content } = this.extractFrontmatter(markdown);
    
    let text = content
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, ' [CODE BLOCK] ')
      .replace(/`[^`\n]+`/g, ' [CODE] ')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Convert links to text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove headings markup
      .replace(/^#{1,6}\s+/gm, '')
      // Remove emphasis
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove strikethrough
      .replace(/~~([^~]+)~~/g, '$1')
      // Convert lists
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove blockquotes
      .replace(/^\s*>\s+/gm, '')
      // Remove horizontal rules
      .replace(/^\s*[-*_]{3,}\s*$/gm, '')
      // Clean up tables (basic removal)
      .replace(/\|.*\|/g, '')
      .replace(/[-|:\s]+/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n');

    return this.cleanText(text);
  }

  private extractFrontmatter(content: string): { content: string; metadata?: any } {
    // YAML frontmatter pattern
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return { content };
    }

    try {
      const yamlContent = match[1];
      const markdownContent = match[2];
      
      // Simple YAML parser for common frontmatter
      const metadata: any = {};
      const lines = yamlContent.split('\n');
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          
          // Remove quotes and parse arrays
          if (value.startsWith('[') && value.endsWith(']')) {
            metadata[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
          } else {
            metadata[key] = value.replace(/^["']|["']$/g, '');
          }
        }
      }

      return { content: markdownContent, metadata };
    } catch (error) {
      console.warn('Could not parse frontmatter:', error);
      return { content: match[2] };
    }
  }

  private extractHeadings(content: string): Array<{ level: number; text: string; index: number; id?: string }> {
    const headings: Array<{ level: number; text: string; index: number; id?: string }> = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = this.generateHeadingId(text);
        
        headings.push({ level, text, index, id });
      }
    });

    return headings;
  }

  private extractCodeBlocks(content: string): Array<{ language: string; code: string; index: number }> {
    const codeBlocks: Array<{ language: string; code: string; index: number }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      codeBlocks.push({ language, code, index: index++ });
    }

    return codeBlocks;
  }

  private extractLinks(content: string): Array<{ text: string; url: string; title?: string; index: number }> {
    const links: Array<{ text: string; url: string; title?: string; index: number }> = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g;
    let match;
    let index = 0;

    while ((match = linkRegex.exec(content)) !== null) {
      const text = match[1];
      const url = match[2];
      const title = match[3];
      
      links.push({ text, url, title, index: index++ });
    }

    return links;
  }

  private extractImages(content: string): Array<{ alt: string; url: string; title?: string; index: number }> {
    const images: Array<{ alt: string; url: string; title?: string; index: number }> = [];
    const imageRegex = /!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g;
    let match;
    let index = 0;

    while ((match = imageRegex.exec(content)) !== null) {
      const alt = match[1];
      const url = match[2];
      const title = match[3];
      
      images.push({ alt, url, title, index: index++ });
    }

    return images;
  }

  private extractTables(content: string): Array<{ headers: string[]; rows: string[][]; index: number }> {
    const tables: Array<{ headers: string[]; rows: string[][]; index: number }> = [];
    const lines = content.split('\n');
    let index = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line looks like a table header
      if (line.includes('|') && lines[i + 1]?.includes('|') && lines[i + 1]?.includes('-')) {
        const headers = line.split('|').map(h => h.trim()).filter(h => h);
        const separatorLine = lines[i + 1];
        
        // Verify it's a table separator
        if (separatorLine.split('|').some(cell => cell.includes('-'))) {
          const rows: string[][] = [];
          
          // Extract table rows
          for (let j = i + 2; j < lines.length; j++) {
            const rowLine = lines[j].trim();
            if (!rowLine.includes('|')) break;
            
            const cells = rowLine.split('|').map(cell => cell.trim()).filter(cell => cell);
            if (cells.length > 0) {
              rows.push(cells);
            } else {
              break;
            }
          }
          
          if (headers.length > 0 && rows.length > 0) {
            tables.push({ headers, rows, index: index++ });
          }
          
          // Skip processed lines
          i += rows.length + 1;
        }
      }
    }

    return tables;
  }

  private generateHeadingId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Clean up excessive line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }
}