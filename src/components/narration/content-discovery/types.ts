/**
 * Shared TypeScript interfaces for AI Content Discovery feature
 */

import { TrendingTopic } from '../../../services/trendingApi';

export interface AIContentDiscoveryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
}

export interface HistoryItem {
  id: string;
  title: string;
  voiceName: string;
  duration: string;
  createdAt: Date;
  audioUrl: string;
  presetName: string;
}

export interface ScriptPreviewData {
  topicId: string;
  script: string;
  wordCount: number;
  estimatedDuration: number;
}

export interface VoiceOption {
  id: string;
  name: string;
  desc: string;
  gender: 'male' | 'female';
  accent: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  icon: any;
}

export interface EstimationData {
  topicCount: number;
  estimated_duration?: string;
  llm_cost?: number;
  tts_cost?: number;
  total_cost?: number;
}

export interface AudioTrackData {
  title: string;
  artist: string;
  duration: string;
  artwork: string;
  description?: string;
}

export interface CurrentAudio {
  id: string;
  audioUrl: string;
  trackData: AudioTrackData;
}

export { TrendingTopic };
