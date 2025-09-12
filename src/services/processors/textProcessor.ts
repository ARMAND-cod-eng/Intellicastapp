export interface TextProcessor {
  extractContent(file: File): Promise<string>;
}

export class TextProcessor implements TextProcessor {
  async extractContent(file: File): Promise<string> {
    try {
      const textContent = await file.text();
      return this.cleanText(textContent);
    } catch (error) {
      throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract structured content from plain text
  async extractStructuredContent(file: File): Promise<{
    text: string;
    paragraphs: Array<{ text: string; index: number }>;
    lines: Array<{ text: string; index: number; isEmpty: boolean }>;
    potentialHeadings: Array<{ text: string; index: number; confidence: number }>;
    statistics: {
      lineCount: number;
      paragraphCount: number;
      wordCount: number;
      characterCount: number;
      averageWordsPerParagraph: number;
      averageCharactersPerLine: number;
    };
  }> {
    try {
      const rawContent = await file.text();
      const text = this.cleanText(rawContent);
      
      // Split into lines and paragraphs
      const lines = rawContent.split('\n').map((line, index) => ({
        text: line,
        index,
        isEmpty: line.trim().length === 0
      }));

      const paragraphs = this.extractParagraphs(text);
      const potentialHeadings = this.identifyPotentialHeadings(lines);
      const statistics = this.calculateStatistics(text, paragraphs, lines);

      return {
        text,
        paragraphs,
        lines,
        potentialHeadings,
        statistics
      };
    } catch (error) {
      throw new Error(`Text structure extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Attempt to identify document sections
  async identifyDocumentSections(file: File): Promise<{
    text: string;
    sections: Array<{
      title?: string;
      content: string;
      startIndex: number;
      endIndex: number;
      confidence: number;
    }>;
  }> {
    try {
      const textContent = await file.text();
      const text = this.cleanText(textContent);
      const lines = text.split('\n');
      
      const sections: Array<{
        title?: string;
        content: string;
        startIndex: number;
        endIndex: number;
        confidence: number;
      }> = [];

      let currentSection = { startIndex: 0, content: '', title: undefined as string | undefined };
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if line could be a section heading
        const headingConfidence = this.calculateHeadingConfidence(line, i, lines);
        
        if (headingConfidence > 0.7 && currentSection.content.length > 100) {
          // End current section and start new one
          sections.push({
            title: currentSection.title,
            content: currentSection.content.trim(),
            startIndex: currentSection.startIndex,
            endIndex: i - 1,
            confidence: 0.8 // Base confidence for detected sections
          });
          
          currentSection = {
            startIndex: i,
            content: '',
            title: line || undefined
          };
        } else {
          if (!currentSection.title && line.length > 0 && line.length < 100) {
            currentSection.title = line;
          } else {
            currentSection.content += line + '\n';
          }
        }
      }

      // Add the last section
      if (currentSection.content.length > 50) {
        sections.push({
          title: currentSection.title,
          content: currentSection.content.trim(),
          startIndex: currentSection.startIndex,
          endIndex: lines.length - 1,
          confidence: 0.8
        });
      }

      return { text, sections };
    } catch (error) {
      throw new Error(`Document section identification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private cleanText(text: string): string {
    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive whitespace while preserving paragraph breaks
      .replace(/[ \t]+/g, ' ')
      // Normalize multiple line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Fix common encoding issues
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
      .replace(/\u2019/g, "'") // Replace smart apostrophes
      .replace(/\u2018/g, "'") // Replace smart quotes
      .replace(/\u201C/g, '"') // Replace smart quotes
      .replace(/\u201D/g, '"') // Replace smart quotes
      .replace(/\u2013/g, '-') // Replace en dashes
      .replace(/\u2014/g, '--') // Replace em dashes
      .replace(/\u2026/g, '...') // Replace ellipsis
      .trim();
  }

  private extractParagraphs(text: string): Array<{ text: string; index: number }> {
    const paragraphs: Array<{ text: string; index: number }> = [];
    const paragraphTexts = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    paragraphTexts.forEach((paragraph, index) => {
      const cleanParagraph = paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanParagraph.length > 20) { // Skip very short paragraphs
        paragraphs.push({
          text: cleanParagraph,
          index
        });
      }
    });

    return paragraphs;
  }

  private identifyPotentialHeadings(lines: Array<{ text: string; index: number; isEmpty: boolean }>): Array<{ text: string; index: number; confidence: number }> {
    const headings: Array<{ text: string; index: number; confidence: number }> = [];
    
    lines.forEach((line, i) => {
      if (line.isEmpty) return;
      
      const confidence = this.calculateHeadingConfidence(line.text, i, lines.map(l => l.text));
      
      if (confidence > 0.5) {
        headings.push({
          text: line.text.trim(),
          index: line.index,
          confidence
        });
      }
    });

    return headings.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateHeadingConfidence(line: string, lineIndex: number, allLines: string[]): number {
    const trimmedLine = line.trim();
    
    if (trimmedLine.length === 0) return 0;
    
    let confidence = 0;
    
    // Length-based scoring (headings are typically short)
    if (trimmedLine.length < 80) confidence += 0.2;
    if (trimmedLine.length < 50) confidence += 0.2;
    
    // Position-based scoring (headings often at start or after blank lines)
    if (lineIndex === 0) confidence += 0.3;
    if (lineIndex > 0 && allLines[lineIndex - 1].trim() === '') confidence += 0.2;
    if (lineIndex < allLines.length - 1 && allLines[lineIndex + 1].trim() === '') confidence += 0.2;
    
    // Content-based scoring
    // No ending punctuation (except question marks)
    if (!/[.!,;:]$/.test(trimmedLine)) confidence += 0.2;
    if (trimmedLine.endsWith('?')) confidence += 0.1; // Questions can be headings
    
    // Title case or all caps
    if (/^[A-Z][a-z\s]*[A-Z]/.test(trimmedLine)) confidence += 0.1;
    if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3) confidence += 0.2;
    
    // Contains typical heading words
    const headingWords = /\b(chapter|section|part|introduction|conclusion|summary|overview|background)\b/i;
    if (headingWords.test(trimmedLine)) confidence += 0.3;
    
    // Numeric patterns (e.g., "1. Introduction", "Chapter 1")
    if (/^\d+[\.\)]\s/.test(trimmedLine)) confidence += 0.2;
    if (/^(chapter|section|part)\s+\d+/i.test(trimmedLine)) confidence += 0.3;
    
    return Math.min(confidence, 1.0);
  }

  private calculateStatistics(
    text: string,
    paragraphs: Array<{ text: string; index: number }>,
    lines: Array<{ text: string; index: number; isEmpty: boolean }>
  ) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const nonEmptyLines = lines.filter(line => !line.isEmpty);
    
    return {
      lineCount: lines.length,
      paragraphCount: paragraphs.length,
      wordCount: words.length,
      characterCount: text.length,
      averageWordsPerParagraph: paragraphs.length > 0 ? words.length / paragraphs.length : 0,
      averageCharactersPerLine: nonEmptyLines.length > 0 ? text.length / nonEmptyLines.length : 0
    };
  }

  // Detect encoding and handle different text formats
  static async detectEncoding(file: File): Promise<string> {
    try {
      // Try to read as UTF-8 first
      const text = await file.text();
      
      // Check for common encoding indicators
      if (text.includes('\uFFFD')) {
        // Replacement character suggests encoding issue
        return 'unknown';
      }
      
      // Check for BOM
      if (text.charCodeAt(0) === 0xFEFF) {
        return 'utf-8-bom';
      }
      
      return 'utf-8';
    } catch (error) {
      return 'unknown';
    }
  }
}