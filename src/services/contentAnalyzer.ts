import type { DocumentStructure, Heading, Section, Chapter, Citation } from '../types/document';

export class ContentAnalyzer {
  async analyzeStructure(content: string): Promise<DocumentStructure> {
    try {
      const structure: DocumentStructure = {
        headings: this.extractHeadings(content),
        sections: [],
        chapters: [],
        citations: this.extractCitations(content)
      };

      // Build sections from headings
      structure.sections = this.buildSections(content, structure.headings || []);
      
      // Build chapters (top-level sections)
      structure.chapters = this.buildChapters(structure.sections || []);

      return structure;
    } catch (error) {
      console.error('Content analysis failed:', error);
      return {
        headings: [],
        sections: [],
        chapters: [],
        citations: []
      };
    }
  }

  private extractHeadings(content: string): Heading[] {
    const headings: Heading[] = [];
    const lines = content.split('\n');
    let headingId = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const level = this.detectHeadingLevel(line, i, lines);
      if (level > 0) {
        headings.push({
          id: `heading-${headingId++}`,
          text: this.cleanHeadingText(line),
          level,
          index: i
        });
      }
    }

    return headings;
  }

  private detectHeadingLevel(line: string, lineIndex: number, allLines: string[]): number {
    // Check for markdown-style headings
    const markdownMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (markdownMatch) {
      return markdownMatch[1].length;
    }

    // Heuristic detection for plain text
    let confidence = 0;
    const trimmedLine = line.trim();

    // Length-based scoring
    if (trimmedLine.length < 100) confidence += 0.2;
    if (trimmedLine.length < 60) confidence += 0.2;

    // Position-based scoring
    if (lineIndex === 0) confidence += 0.3;
    if (lineIndex > 0 && allLines[lineIndex - 1].trim() === '') confidence += 0.2;
    if (lineIndex < allLines.length - 1 && allLines[lineIndex + 1].trim() === '') confidence += 0.2;

    // Content-based scoring
    if (!/[.!,;:]$/.test(trimmedLine)) confidence += 0.2;
    if (/^[A-Z][a-z\s]*[A-Z]/.test(trimmedLine)) confidence += 0.1;
    if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3) confidence += 0.2;

    // Typical heading patterns
    if (/^\d+[\.\)]\s/.test(trimmedLine)) confidence += 0.3;
    if (/^(chapter|section|part)\s+\d+/i.test(trimmedLine)) confidence += 0.4;
    if (/\b(introduction|conclusion|summary|overview|background|methodology|results|discussion)\b/i.test(trimmedLine)) confidence += 0.3;

    // Return heading level based on confidence and content
    if (confidence > 0.8) {
      if (/^(chapter|part)\s+\d+/i.test(trimmedLine)) return 1;
      if (/^(section|\d+\.)\s/i.test(trimmedLine)) return 2;
      return 3;
    } else if (confidence > 0.6) {
      return 4;
    }

    return 0;
  }

  private cleanHeadingText(text: string): string {
    return text
      .replace(/^#+\s*/, '') // Remove markdown hashes
      .replace(/^\d+[\.\)]\s*/, '') // Remove numbering
      .replace(/^(chapter|section|part)\s+\d+:?\s*/i, '') // Remove chapter/section prefixes
      .trim();
  }

  private buildSections(content: string, headings: Heading[]): Section[] {
    if (headings.length === 0) {
      // No headings found, treat entire content as one section
      return [{
        id: 'section-0',
        title: 'Document Content',
        content: content,
        startIndex: 0,
        endIndex: content.length,
        level: 1
      }];
    }

    const sections: Section[] = [];
    const lines = content.split('\n');
    let sectionId = 0;

    for (let i = 0; i < headings.length; i++) {
      const currentHeading = headings[i];
      const nextHeading = headings[i + 1];

      const startIndex = currentHeading.index;
      const endIndex = nextHeading ? nextHeading.index - 1 : lines.length - 1;

      // Extract content between headings
      const sectionLines = lines.slice(startIndex + 1, endIndex + 1);
      const sectionContent = sectionLines.join('\n').trim();

      if (sectionContent.length > 20) { // Only include sections with substantial content
        sections.push({
          id: `section-${sectionId++}`,
          title: currentHeading.text,
          content: sectionContent,
          startIndex,
          endIndex,
          level: currentHeading.level
        });
      }
    }

    return sections;
  }

  private buildChapters(sections: Section[]): Chapter[] {
    const chapters: Chapter[] = [];
    let chapterId = 0;

    // Group sections into chapters (level 1 and 2 headings become chapters)
    let currentChapter: Chapter | null = null;

    for (const section of sections) {
      if (section.level <= 2) {
        // Start new chapter
        if (currentChapter) {
          chapters.push(currentChapter);
        }

        currentChapter = {
          id: `chapter-${chapterId++}`,
          title: section.title,
          content: section.content,
          startIndex: section.startIndex,
          endIndex: section.endIndex,
          level: section.level
        };
      } else if (currentChapter) {
        // Add to current chapter
        currentChapter.content += '\n\n' + section.content;
        currentChapter.endIndex = section.endIndex;
      } else {
        // No chapter yet, create one
        currentChapter = {
          id: `chapter-${chapterId++}`,
          title: 'Introduction',
          content: section.content,
          startIndex: section.startIndex,
          endIndex: section.endIndex,
          level: 1
        };
      }
    }

    // Add final chapter
    if (currentChapter) {
      chapters.push(currentChapter);
    }

    return chapters;
  }

  private extractCitations(content: string): Citation[] {
    const citations: Citation[] = [];
    let citationId = 0;

    // Pattern for academic citations [1], [Author, Year], etc.
    const citationPatterns = [
      /\[(\d+)\]/g,
      /\[([A-Za-z\s]+,\s*\d{4})\]/g,
      /\(([A-Za-z\s]+,\s*\d{4})\)/g,
      /\[([A-Za-z\s]+\s+et\s+al\.,?\s*\d{4})\]/g
    ];

    citationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        citations.push({
          id: `citation-${citationId++}`,
          text: match[0],
          source: match[1],
          index: match.index
        });
      }
    });

    // Remove duplicates
    const uniqueCitations = citations.filter((citation, index, self) =>
      index === self.findIndex(c => c.text === citation.text)
    );

    return uniqueCitations.sort((a, b) => a.index - b.index);
  }

  // Analyze content for optimal chunking
  analyzeChunking(content: string, maxChunkSize: number = 4000): {
    chunks: Array<{
      content: string;
      startIndex: number;
      endIndex: number;
      wordCount: number;
      hasHeading: boolean;
    }>;
    totalChunks: number;
    averageChunkSize: number;
  } {
    const words = content.split(/\s+/);
    const chunks: Array<{
      content: string;
      startIndex: number;
      endIndex: number;
      wordCount: number;
      hasHeading: boolean;
    }> = [];

    let currentChunk = '';
    let currentWordCount = 0;
    let chunkStartIndex = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + word;

      if (testChunk.length > maxChunkSize && currentChunk.length > 0) {
        // Try to break at a natural boundary (sentence or paragraph)
        const breakPoint = this.findNaturalBreakpoint(currentChunk);
        
        chunks.push({
          content: breakPoint.content,
          startIndex: chunkStartIndex,
          endIndex: chunkStartIndex + breakPoint.content.length,
          wordCount: breakPoint.content.split(/\s+/).length,
          hasHeading: this.containsHeading(breakPoint.content)
        });

        currentChunk = breakPoint.remainder + (breakPoint.remainder ? ' ' : '') + word;
        chunkStartIndex += breakPoint.content.length;
        currentWordCount = currentChunk.split(/\s+/).length;
      } else {
        currentChunk = testChunk;
        currentWordCount++;
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk,
        startIndex: chunkStartIndex,
        endIndex: chunkStartIndex + currentChunk.length,
        wordCount: currentWordCount,
        hasHeading: this.containsHeading(currentChunk)
      });
    }

    const averageChunkSize = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length;

    return {
      chunks,
      totalChunks: chunks.length,
      averageChunkSize
    };
  }

  private findNaturalBreakpoint(text: string): { content: string; remainder: string } {
    // Try to break at paragraph boundaries first
    const paragraphs = text.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      const breakIndex = Math.floor(paragraphs.length * 0.8);
      const content = paragraphs.slice(0, breakIndex).join('\n\n');
      const remainder = paragraphs.slice(breakIndex).join('\n\n');
      return { content, remainder };
    }

    // Try to break at sentence boundaries
    const sentences = text.split(/[.!?]\s+/);
    if (sentences.length > 1) {
      const breakIndex = Math.floor(sentences.length * 0.8);
      const content = sentences.slice(0, breakIndex).join('. ') + '.';
      const remainder = sentences.slice(breakIndex).join('. ');
      return { content, remainder };
    }

    // Fallback to word boundary
    const words = text.split(/\s+/);
    const breakIndex = Math.floor(words.length * 0.8);
    const content = words.slice(0, breakIndex).join(' ');
    const remainder = words.slice(breakIndex).join(' ');
    return { content, remainder };
  }

  private containsHeading(text: string): boolean {
    const lines = text.split('\n');
    return lines.some(line => {
      const trimmedLine = line.trim();
      return this.detectHeadingLevel(trimmedLine, 0, lines) > 0;
    });
  }
}