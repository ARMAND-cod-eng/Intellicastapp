import { ENDPOINTS, getAudioUrl, getPodcastDownloadUrl, getPodcastStatusUrl } from '../config/api';

const API_BASE_URL = ENDPOINTS.NARRATION.BASE.replace('/narration', '');

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

  // NotebookLM Podcast Generation Methods
  static async generatePodcastEstimate(documentText: string, length: string = '10min'): Promise<any> {
    try {
      const response = await fetch(ENDPOINTS.PODCAST.ESTIMATE_COST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_text: documentText,
          length: length
        })
      });

      if (!response.ok) {
        throw new Error(`Estimate failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Podcast estimate error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async generatePodcast(params: {
    documentText: string;
    length?: string;
    hostVoice?: string;
    guestVoice?: string;
    style?: string;
    tone?: string;
    numSpeakers?: number;
    outputFormat?: string;
    saveScript?: boolean;
  }): Promise<any> {
    try {
      const response = await fetch(ENDPOINTS.PODCAST.GENERATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_text: params.documentText,
          length: params.length || '10min',
          host_voice: params.hostVoice || 'host_male_friendly',
          guest_voice: params.guestVoice || 'guest_female_expert',
          style: params.style || 'conversational',
          tone: params.tone || 'friendly',
          num_speakers: params.numSpeakers || 2,
          output_format: params.outputFormat || 'mp3',
          save_script: params.saveScript !== false
        })
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Podcast generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getPodcastStatus(jobId: string): Promise<any> {
    try {
      const response = await fetch(getPodcastStatusUrl(jobId));

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Status check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getAvailableVoices(): Promise<any> {
    try {
      const response = await fetch(ENDPOINTS.PODCAST.VOICES);

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Voice fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        voices: []
      };
    }
  }

  // AI-Powered Style Recommendation Methods
  static async recommendPodcastStyle(documentText: string): Promise<any> {
    try {
      const response = await fetch(ENDPOINTS.PODCAST.RECOMMEND_STYLE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_text: documentText
        })
      });

      if (!response.ok) {
        throw new Error(`Style recommendation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Style recommendation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async analyzeDocumentContent(documentText: string): Promise<any> {
    try {
      const response = await fetch(ENDPOINTS.PODCAST.ANALYZE_CONTENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_text: documentText
        })
      });

      if (!response.ok) {
        throw new Error(`Content analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Content analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}