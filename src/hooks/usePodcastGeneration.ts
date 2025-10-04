// Hook for Podcast Generation with Backend Integration
import { useState, useCallback } from 'react';
import apiClient, { type PodcastGenerationRequest, type GenerationJob } from '../services/apiClient';

export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  status: 'idle' | 'uploading' | 'analyzing' | 'generating' | 'completed' | 'error';
  message: string;
  jobId: string | null;
  result: any | null;
  error: string | null;
}

export interface GenerationOptions {
  documentText: string;
  length: '5min' | '10min' | '15min' | '20min' | '30min';
  numSpeakers: 2 | 3;
  style: 'conversational' | 'expert-panel' | 'debate' | 'interview' | 'storytelling';
  tone: 'friendly' | 'professional' | 'casual' | 'educational' | 'dramatic';
  hostVoice?: string;
  guestVoice?: string;
  cohostVoice?: string;
}

export const usePodcastGeneration = () => {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    status: 'idle',
    message: '',
    jobId: null,
    result: null,
    error: null,
  });

  const updateState = useCallback((updates: Partial<GenerationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      progress: 0,
      status: 'idle',
      message: '',
      jobId: null,
      result: null,
      error: null,
    });
  }, []);

  // Estimate cost before generation
  const estimateCost = useCallback(async (documentText: string, length: string = '10min') => {
    try {
      const response = await apiClient.estimateCost(documentText, length);
      return response.estimate;
    } catch (error) {
      console.error('Cost estimation failed:', error);
      throw error;
    }
  }, []);

  // Get AI-powered style recommendation
  const recommendStyle = useCallback(async (documentText: string) => {
    try {
      updateState({
        status: 'analyzing',
        message: 'Analyzing content for optimal podcast style...'
      });

      const response = await apiClient.recommendStyle(documentText);
      return response.recommendation;
    } catch (error) {
      console.error('Style recommendation failed:', error);
      throw error;
    }
  }, [updateState]);

  // Analyze content
  const analyzeContent = useCallback(async (documentText: string) => {
    try {
      const response = await apiClient.analyzeContent(documentText);
      return {
        analysis: response.analysis,
        recommendation: response.recommendation,
      };
    } catch (error) {
      console.error('Content analysis failed:', error);
      throw error;
    }
  }, []);

  // Generate podcast (async with job polling)
  const generatePodcast = useCallback(async (options: GenerationOptions) => {
    try {
      reset();

      updateState({
        isGenerating: true,
        status: 'uploading',
        progress: 5,
        message: 'Starting podcast generation...',
      });

      // Map frontend options to backend request
      const request: PodcastGenerationRequest = {
        document_text: options.documentText,
        length: options.length,
        host_voice: options.hostVoice || 'host_male_friendly',
        guest_voice: options.guestVoice || 'guest_female_expert',
        cohost_voice: options.cohostVoice || 'cohost_male_casual',
        style: options.style,
        tone: options.tone,
        num_speakers: options.numSpeakers,
        output_format: 'mp3',
        save_script: true,
      };

      // Start generation
      const startResponse = await apiClient.generatePodcast(request);

      updateState({
        jobId: startResponse.job_id,
        status: 'generating',
        progress: 10,
        message: 'Podcast generation in progress...',
      });

      // Poll for status updates
      const job = await apiClient.pollJobStatus(
        startResponse.job_id,
        (jobUpdate: GenerationJob) => {
          // Update state based on job progress
          updateState({
            progress: jobUpdate.progress,
            message: jobUpdate.message,
          });
        },
        2000 // Poll every 2 seconds
      );

      // Generation completed successfully
      updateState({
        status: 'completed',
        progress: 100,
        message: 'Podcast generated successfully!',
        result: job.result,
        isGenerating: false,
      });

      return job.result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';

      updateState({
        status: 'error',
        error: errorMessage,
        message: errorMessage,
        isGenerating: false,
      });

      throw error;
    }
  }, [reset, updateState]);

  // Upload file to backend
  const uploadFile = useCallback(async (file: File) => {
    try {
      updateState({
        status: 'uploading',
        progress: 0,
        message: 'Uploading document...',
      });

      const response = await apiClient.uploadDocument(file);

      updateState({
        progress: 100,
        message: 'Document uploaded successfully',
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateState({
        status: 'error',
        error: errorMessage,
        message: errorMessage,
      });
      throw error;
    }
  }, [updateState]);

  // Get available voices
  const getVoices = useCallback(async () => {
    try {
      const response = await apiClient.getAvailableVoices();
      return response.voices;
    } catch (error) {
      console.error('Failed to get voices:', error);
      throw error;
    }
  }, []);

  // Download podcast
  const downloadPodcast = useCallback(async (filename: string) => {
    try {
      const blob = await apiClient.downloadPodcast(filename);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }, []);

  // Get download URL
  const getDownloadUrl = useCallback((filename: string) => {
    return apiClient.getDownloadUrl(filename);
  }, []);

  return {
    // State
    state,

    // Actions
    generatePodcast,
    estimateCost,
    recommendStyle,
    analyzeContent,
    uploadFile,
    getVoices,
    downloadPodcast,
    getDownloadUrl,
    reset,
  };
};

export default usePodcastGeneration;
