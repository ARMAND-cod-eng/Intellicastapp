import type { DocumentContent, ProcessingResult, ProcessingStatus } from '../types/document';
// import { PDFProcessor } from './processors/pdfProcessor'; // Temporarily disabled
import { SimplePDFProcessor } from './processors/simplePdfProcessor';
import { DOCXProcessor } from './processors/docxProcessor';
import { HTMLProcessor } from './processors/htmlProcessor';
import { MarkdownProcessor } from './processors/markdownProcessor';
import { TextProcessor } from './processors/textProcessor';
import { EPUBProcessor } from './processors/epubProcessor';
import { ContentAnalyzer } from './contentAnalyzer';

export class DocumentProcessor {
  // private pdfProcessor: PDFProcessor; // Temporarily disabled
  private simplePdfProcessor: SimplePDFProcessor;
  private docxProcessor: DOCXProcessor;
  private htmlProcessor: HTMLProcessor;
  private markdownProcessor: MarkdownProcessor;
  private textProcessor: TextProcessor;
  private epubProcessor: EPUBProcessor;
  private contentAnalyzer: ContentAnalyzer;

  constructor() {
    // this.pdfProcessor = new PDFProcessor(); // Temporarily disabled
    this.simplePdfProcessor = new SimplePDFProcessor();
    this.docxProcessor = new DOCXProcessor();
    this.htmlProcessor = new HTMLProcessor();
    this.markdownProcessor = new MarkdownProcessor();
    this.textProcessor = new TextProcessor();
    this.epubProcessor = new EPUBProcessor();
    this.contentAnalyzer = new ContentAnalyzer();
  }

  async processDocument(
    file: File,
    onProgress?: (status: ProcessingStatus) => void
  ): Promise<ProcessingResult> {
    const startTime = new Date().toISOString();
    
    try {
      // Initial status
      const initialStatus: ProcessingStatus = {
        stage: 'uploading',
        progress: 0,
        message: 'Starting document processing...',
        startedAt: startTime
      };
      onProgress?.(initialStatus);

      // Determine processor based on file type
      const processor = this.getProcessor(file);
      if (!processor) {
        throw new Error(`Unsupported file type: ${file.type}`);
      }

      // Update status to extracting
      onProgress?.({
        ...initialStatus,
        stage: 'extracting',
        progress: 20,
        message: 'Extracting text content...'
      });

      // Extract raw content
      const rawContent = await processor.extractContent(file);

      // Update status to analyzing
      onProgress?.({
        ...initialStatus,
        stage: 'analyzing',
        progress: 50,
        message: 'Analyzing document structure...'
      });

      // Analyze content structure
      const structure = await this.contentAnalyzer.analyzeStructure(rawContent);

      // Update status to structuring
      onProgress?.({
        ...initialStatus,
        stage: 'structuring',
        progress: 80,
        message: 'Building document structure...'
      });

      // Create document content
      const documentContent: DocumentContent = {
        id: this.generateId(),
        title: this.extractTitle(file.name, rawContent, structure),
        content: rawContent,
        structure,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadDate: startTime,
          wordCount: this.countWords(rawContent),
          characterCount: rawContent.length
        },
        processingStatus: {
          stage: 'completed',
          progress: 100,
          message: 'Document processing completed',
          startedAt: startTime,
          completedAt: new Date().toISOString()
        }
      };

      // Final status update
      onProgress?.(documentContent.processingStatus);

      return {
        success: true,
        document: documentContent
      };

    } catch (error) {
      const errorStatus: ProcessingStatus = {
        stage: 'error',
        progress: 0,
        message: 'Processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        startedAt: startTime
      };
      onProgress?.(errorStatus);

      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error
        }
      };
    }
  }

  private getProcessor(file: File) {
    const mimeType = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (mimeType === 'application/pdf' || extension === 'pdf') {
      // Use simple processor temporarily while fixing PDF.js issues
      return this.simplePdfProcessor;
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
      return this.docxProcessor;
    }
    if (mimeType === 'text/html' || extension === 'html' || extension === 'htm') {
      return this.htmlProcessor;
    }
    if (mimeType === 'text/markdown' || extension === 'md' || extension === 'markdown') {
      return this.markdownProcessor;
    }
    if (mimeType === 'text/plain' || extension === 'txt') {
      return this.textProcessor;
    }
    if (mimeType === 'application/epub+zip' || extension === 'epub') {
      return this.epubProcessor;
    }
    
    return null;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private extractTitle(fileName: string, content: string, structure: any): string {
    // Try to extract title from document structure
    if (structure.headings && structure.headings.length > 0) {
      const firstHeading = structure.headings.find((h: any) => h.level === 1);
      if (firstHeading) {
        return firstHeading.text;
      }
    }

    // Try to extract from first line of content
    const firstLine = content.split('\n')[0]?.trim();
    if (firstLine && firstLine.length > 0 && firstLine.length < 200) {
      return firstLine;
    }

    // Fall back to filename without extension
    return fileName.replace(/\.[^/.]+$/, '');
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Static method for quick file validation
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/html',
      'text/markdown',
      'text/plain',
      'application/epub+zip'
    ];

    const supportedExtensions = ['pdf', 'docx', 'html', 'htm', 'md', 'markdown', 'txt', 'epub'];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const isTypeSupported = supportedTypes.includes(file.type) || 
                           (extension && supportedExtensions.includes(extension));

    if (!isTypeSupported) {
      return { valid: false, error: 'Unsupported file type' };
    }

    return { valid: true };
  }
}