import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with better error handling
if (typeof window !== 'undefined') {
  try {
    // Try multiple worker sources for better compatibility
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  } catch (error) {
    console.warn('PDF.js worker configuration failed:', error);
  }
}

export interface PDFProcessor {
  extractContent(file: File): Promise<string>;
}

export class PDFProcessor implements PDFProcessor {
  async extractContent(file: File): Promise<string> {
    try {
      console.log(`Starting PDF extraction for: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      console.log(`PDF file loaded, size: ${arrayBuffer.byteLength} bytes`);
      
      // Try PDF.js with comprehensive error handling
      try {
        const pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: false
        }).promise;
        
        console.log(`PDF document loaded successfully, pages: ${pdf.numPages}`);
        
        let fullText = '';
        const numPages = pdf.numPages;

        // Extract text from each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          try {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items with proper spacing
            const pageText = textContent.items
              .map((item: any) => {
                // Handle text items with transform information for better layout
                if ('str' in item) {
                  return item.str;
                }
                return '';
              })
              .join(' ')
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();

            if (pageText) {
              fullText += pageText + '\n\n';
            }
          } catch (pageError) {
            console.warn(`Failed to extract text from page ${pageNum}:`, pageError);
            // Continue with other pages
          }
        }

        if (fullText.trim()) {
          // Clean up the extracted text
          return this.cleanText(fullText);
        } else {
          throw new Error('No text content found in PDF');
        }
        
      } catch (pdfError) {
        console.error('PDF.js processing failed:', pdfError);
        
        // Fallback: Return a placeholder message indicating PDF was received but couldn't be processed
        const fileName = file.name;
        const fileSize = (file.size / 1024).toFixed(2) + ' KB';
        
        return `PDF Document: ${fileName}

This PDF file (${fileSize}) has been uploaded but could not be processed for text extraction. 

This could be due to:
- The PDF contains primarily images or scanned content
- The PDF has security restrictions
- Browser compatibility issues with PDF.js

To use this content for podcast generation, please:
1. Try converting the PDF to a text file (.txt)
2. Copy and paste the text content into a new document
3. Save as a Word document (.docx) or text file

File details:
- Name: ${fileName}
- Size: ${fileSize}
- Type: ${file.type || 'application/pdf'}

The system is ready to process the document once you provide it in a supported text format.`;
      }
      
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Fix common PDF extraction issues
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2') // Add paragraph breaks after sentences
      // Remove page numbers and headers/footers (basic patterns)
      .replace(/^\d+\s*$/gm, '') // Remove standalone page numbers
      .replace(/^Page \d+.*$/gm, '') // Remove "Page X" lines
      // Clean up line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize paragraph breaks
      .trim();
  }

  // Extract metadata from PDF
  async extractMetadata(file: File): Promise<any> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const metadata = await pdf.getMetadata();
      
      return {
        title: (metadata.info as any)?.Title || '',
        author: (metadata.info as any)?.Author || '',
        subject: (metadata.info as any)?.Subject || '',
        creator: (metadata.info as any)?.Creator || '',
        producer: (metadata.info as any)?.Producer || '',
        creationDate: (metadata.info as any)?.CreationDate || null,
        modificationDate: (metadata.info as any)?.ModDate || null,
        pageCount: pdf.numPages
      };
    } catch (error) {
      console.warn('Could not extract PDF metadata:', error);
      return {};
    }
  }

  // Check if PDF contains images or is primarily scanned content
  async isScannedDocument(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Check first few pages for text content ratio
      const pagesToCheck = Math.min(3, pdf.numPages);
      let totalTextLength = 0;
      let pagesWithMinimalText = 0;

      for (let pageNum = 1; pageNum <= pagesToCheck; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
        
        totalTextLength += pageText.length;
        
        // If page has very little text, it's likely scanned
        if (pageText.length < 50) {
          pagesWithMinimalText++;
        }
      }

      // If most pages have minimal text, likely scanned
      return pagesWithMinimalText >= pagesToCheck * 0.7 || totalTextLength < 200;
    } catch (error) {
      console.warn('Could not determine if PDF is scanned:', error);
      return false;
    }
  }
}