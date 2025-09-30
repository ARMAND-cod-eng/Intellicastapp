const API_BASE_URL = 'http://localhost:3004/api';

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
  static async generateDocumentSummary(
    documentContent: string,
    summaryType: 'quick' | 'detailed' = 'detailed'
  ): Promise<{ success: boolean; summary: string; model: string; }> {
    // Map frontend summary types to backend narration types
    const narrationTypeMap = {
      'quick': 'quick-summary',
      'detailed': 'document-summary'
    };

    const response = await fetch(`${API_BASE_URL}/narration/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentContent,
        narrationType: narrationTypeMap[summaryType], // Use mapped summary type
        voice: 'emma_en', // Single professional voice for consistent quality
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
    voice: string = 'bf991597-6c13-4d2c-8d3d-2f4f2a4c9e4e', // Default Cartesia Newslady voice
    speed: number = 1.0,
    backgroundMusic: boolean = false,
    musicType: string = 'none',
    podcastStyle: string = 'conversational',
    voiceSettings?: {
      exaggeration?: number;
      temperature?: number;
      cfg_weight?: number;
      min_p?: number;
      top_p?: number;
      repetition_penalty?: number;
      seed?: number;
      reference_audio?: File | null;
    }
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
        podcastStyle,
        ...(voiceSettings && {
          exaggeration: voiceSettings.exaggeration,
          temperature: voiceSettings.temperature,
          cfg_weight: voiceSettings.cfg_weight,
          min_p: voiceSettings.min_p,
          top_p: voiceSettings.top_p,
          repetition_penalty: voiceSettings.repetition_penalty,
          seed: voiceSettings.seed,
          // Note: reference_audio file upload would need FormData, handling separately
        }),
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