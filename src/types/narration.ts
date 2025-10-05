import type { LucideProps } from 'lucide-react';
import type React from 'react';

// Preset Configuration for Narration Styles
export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<LucideProps>;
  color: string;
  gradient: string;
  narrationType: string;
  voice: string;
  speed: number;
  podcastStyle: string;
  summaryType: 'quick' | 'detailed' | 'full';
  tags: string[];
}

// Generation History Item
export interface HistoryItem {
  id: string;
  title: string;
  voiceName: string;
  duration: string;
  createdAt: Date;
  audioUrl: string;
  presetName: string;
}
