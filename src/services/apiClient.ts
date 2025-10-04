// API Client for Backend Integration
// Connects frontend to FastAPI backend for podcast generation

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============= Type Definitions =============

export interface PodcastGenerationRequest {
  document_text: string;
  length: string;
  host_voice: string;
  guest_voice: string;
  cohost_voice: string;
  style: string;
  tone: string;
  num_speakers: number;
  output_format: string;
  save_script: boolean;
}

export interface CostEstimate {
  llm_cost: number;
  tts_cost: number;
  total_cost: number;
  estimated_duration: number;
  word_count: number;
}

export interface GenerationJob {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  created_at: string;
  result?: PodcastResult;
  error?: string;
}

export interface PodcastResult {
  success: boolean;
  audio_file: string;
  script_file: string;
  duration_seconds: number;
  total_cost: number;
  metadata: any;
}

export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  gender: string;
  style: string;
  language: string;
}

export interface StyleRecommendation {
  recommended_style: string;
  recommended_tone: string;
  num_speakers: number;
  reasoning: string;
  confidence: number;
  alternative_styles: string[];
}

export interface ContentAnalysis {
  content_type: string;
  complexity_level: string;
  key_themes: string[];
  technical_level: string;
  audience_level: string;
  estimated_length: string;
}

// ============= API Client Class =============

class APIClient {
  private baseUrl: string;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        const errorMessage = error.detail || `HTTP ${response.status}: ${response.statusText}`;

        // Retry on 5xx errors or network issues
        if (response.status >= 500 && retryCount < this.retryAttempts) {
          console.warn(`Request failed with ${response.status}, retrying... (${retryCount + 1}/${this.retryAttempts})`);
          await this.sleep(this.retryDelay * (retryCount + 1));
          return this.request<T>(endpoint, options, retryCount + 1);
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      // Retry on network errors
      if (error instanceof TypeError && error.message.includes('fetch') && retryCount < this.retryAttempts) {
        console.warn(`Network error, retrying... (${retryCount + 1}/${this.retryAttempts})`);
        await this.sleep(this.retryDelay * (retryCount + 1));
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('Backend connection failed:', error);
      return false;
    }
  }

  // ============= Health & Status =============

  async healthCheck(): Promise<{
    status: string;
    llm_ready: boolean;
    tts_ready: boolean;
    tracker_ready: boolean;
  }> {
    return this.request('/health');
  }

  // ============= Cost Estimation =============

  async estimateCost(documentText: string, length: string = '10min'): Promise<{
    success: boolean;
    estimate: CostEstimate;
    breakdown: {
      llm_cost: string;
      tts_cost: string;
      total_cost: string;
    };
  }> {
    return this.request('/api/podcast/estimate-cost', {
      method: 'POST',
      body: JSON.stringify({
        document_text: documentText,
        length,
      }),
    });
  }

  // ============= Podcast Generation =============

  async generatePodcast(request: PodcastGenerationRequest): Promise<{
    success: boolean;
    job_id: string;
    message: string;
    status_url: string;
  }> {
    return this.request('/api/podcast/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generatePodcastSync(request: PodcastGenerationRequest): Promise<{
    success: boolean;
    audio_file: string;
    script_file: string;
    duration: number;
    cost: number;
    metadata: any;
  }> {
    return this.request('/api/podcast/generate-sync', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getJobStatus(jobId: string): Promise<{
    success: boolean;
    job: GenerationJob;
  }> {
    return this.request(`/api/podcast/status/${jobId}`);
  }

  async pollJobStatus(
    jobId: string,
    onProgress?: (job: GenerationJob) => void,
    pollInterval: number = 2000
  ): Promise<GenerationJob> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await this.getJobStatus(jobId);
          const job = response.job;

          if (onProgress) {
            onProgress(job);
          }

          if (job.status === 'completed') {
            resolve(job);
          } else if (job.status === 'failed') {
            reject(new Error(job.error || job.message));
          } else {
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  // ============= Content Analysis =============

  async recommendStyle(documentText: string): Promise<{
    success: boolean;
    recommendation: StyleRecommendation;
    message: string;
  }> {
    return this.request('/api/podcast/recommend-style', {
      method: 'POST',
      body: JSON.stringify({
        document_text: documentText,
      }),
    });
  }

  async analyzeContent(documentText: string): Promise<{
    success: boolean;
    analysis: ContentAnalysis;
    recommendation: StyleRecommendation;
  }> {
    return this.request('/api/podcast/analyze-content', {
      method: 'POST',
      body: JSON.stringify({
        document_text: documentText,
      }),
    });
  }

  // ============= Voice Management =============

  async getAvailableVoices(): Promise<{
    success: boolean;
    voices: VoicePreset[];
  }> {
    return this.request('/api/podcast/voices');
  }

  // ============= File Management =============

  async uploadDocument(file: File): Promise<{
    success: boolean;
    filename: string;
    file_path: string;
    size: number;
    text_preview: string | null;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/api/upload/document`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return await response.json();
  }

  getDownloadUrl(filename: string): string {
    return `${this.baseUrl}/api/podcast/download/${filename}`;
  }

  async downloadPodcast(filename: string): Promise<Blob> {
    const url = this.getDownloadUrl(filename);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return await response.blob();
  }

  // ============= Usage Tracking =============

  async getUsageSummary(): Promise<{
    success: boolean;
    usage: any;
  }> {
    return this.request('/api/usage/summary');
  }
}

// ============= Export Singleton =============

export const apiClient = new APIClient();
export default apiClient;
