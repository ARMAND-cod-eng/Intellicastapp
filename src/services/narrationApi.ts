const API_BASE_URL = 'http://localhost:3002/api';

export interface DocumentAnalysis {
  wordCount: number;
  sentenceCount: number;
  readingTime: number;
  complexity: string;
  contentType: string;
}

export interface ProcessDocumentResponse {
  success: boolean;
  document: {
    originalName: string;
    text: string;
    analysis: DocumentAnalysis;
    chunks: number;
    contentHash: string;
  };
}

export interface GenerateNarrationResponse {
  success: boolean;
  narrationId: string;
  script: string;
  analysis: DocumentAnalysis;
  model: string;
  tokensGenerated: number;
  audioUrl: string | null;
  duration: number | null;
}

export interface AskQuestionResponse {
  success: boolean;
  question: string;
  answer: string;
  model: string;
  audioUrl: string | null;
}

export class NarrationAPI {
  static async generateDocumentSummary(documentContent: string): Promise<{ success: boolean; summary: string; model: string; }> {
    const response = await fetch(`${API_BASE_URL}/narration/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentContent,
        narrationType: 'document-summary', // Use special summary type
        voice: 'emma',
        speed: 1.0,
        backgroundMusic: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate summary: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: result.success,
      summary: result.script || '', // Should be clean summary now
      model: result.model
    };
  }

  static async processDocument(file: File): Promise<ProcessDocumentResponse> {
    const formData = new FormData();
    formData.append('document', file);

    const response = await fetch(`${API_BASE_URL}/narration/process-document`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to process document: ${response.statusText}`);
    }

    return await response.json();
  }

  static async generateNarration(
    documentContent: string,
    narrationType: string = 'summary',
    voice: string = 'emma',
    speed: number = 1.0,
    backgroundMusic: boolean = false,
    musicType: string = 'none'
  ): Promise<GenerateNarrationResponse> {
    const response = await fetch(`${API_BASE_URL}/narration/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentContent,
        narrationType,
        voice,
        speed,
        backgroundMusic,
        musicType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate narration: ${response.statusText}`);
    }

    return await response.json();
  }

  static async askQuestion(
    documentContent: string,
    question: string
  ): Promise<AskQuestionResponse> {
    const response = await fetch(`${API_BASE_URL}/narration/ask-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentContent,
        question,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to ask question: ${response.statusText}`);
    }

    return await response.json();
  }

  static async checkHealth(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/narration/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.json();
  }
}