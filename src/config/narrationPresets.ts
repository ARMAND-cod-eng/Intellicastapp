import { Newspaper, BookOpen, GraduationCap, Mic2, Briefcase, Headphones } from 'lucide-react';
import type { PresetConfig } from '../types/narration';

export const narrationPresets: PresetConfig[] = [
  {
    id: 'news-brief',
    name: 'News Brief',
    description: 'Quick, professional news-style delivery perfect for current events and updates',
    icon: Newspaper,
    color: '#00D4E4',
    gradient: 'radial-gradient(circle, rgba(0,212,228,0.3) 0%, transparent 70%)',
    narrationType: 'briefing',
    voice: '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', // Linda - Professional
    speed: 1.1,
    podcastStyle: 'professional',
    summaryType: 'detailed',
    tags: ['Fast', 'Professional', 'News']
  },
  {
    id: 'audiobook',
    name: 'Audiobook',
    description: 'Warm, engaging storytelling voice ideal for long-form content and narratives',
    icon: BookOpen,
    color: '#8B5CF6',
    gradient: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
    narrationType: 'full',
    voice: '694f9389-aac1-45b6-b726-9d9369183238', // Sarah - Soothing
    speed: 0.95,
    podcastStyle: 'storytelling',
    summaryType: 'full',
    tags: ['Relaxing', 'Story', 'Long-form']
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Clear, patient teacher voice designed for learning and explanations',
    icon: GraduationCap,
    color: '#10B981',
    gradient: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
    narrationType: 'explanatory',
    voice: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b', // Brooke - Approachable
    speed: 1.0,
    podcastStyle: 'educational',
    summaryType: 'detailed',
    tags: ['Clear', 'Teaching', 'Detailed']
  },
  {
    id: 'podcast-conversational',
    name: 'Podcast Chat',
    description: 'Friendly, casual conversational tone for engaging podcast-style content',
    icon: Mic2,
    color: '#F59E0B',
    gradient: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)',
    narrationType: 'summary',
    voice: 'f786b574-daa5-4673-aa0c-cbe3e8534c02', // Katie - Enunciating
    speed: 1.05,
    podcastStyle: 'conversational',
    summaryType: 'detailed',
    tags: ['Friendly', 'Casual', 'Engaging']
  },
  {
    id: 'business-brief',
    name: 'Business Brief',
    description: 'Confident, authoritative voice for professional and business content',
    icon: Briefcase,
    color: '#3B82F6',
    gradient: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
    narrationType: 'briefing',
    voice: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', // Blake - Energetic male
    speed: 1.0,
    podcastStyle: 'professional',
    summaryType: 'quick',
    tags: ['Professional', 'Confident', 'Business']
  },
  {
    id: 'meditation',
    name: 'Calm & Relaxing',
    description: 'Gentle, soothing voice perfect for mindfulness and relaxation content',
    icon: Headphones,
    color: '#EC4899',
    gradient: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)',
    narrationType: 'full',
    voice: '694f9389-aac1-45b6-b726-9d9369183238', // Sarah - Meditation voice
    speed: 0.85,
    podcastStyle: 'meditation',
    summaryType: 'full',
    tags: ['Calm', 'Slow', 'Peaceful']
  }
];

// Helper function to get preset by ID
export const getPresetById = (id: string): PresetConfig | undefined => {
  return narrationPresets.find(preset => preset.id === id);
};

// Helper function to get recommended preset based on content analysis
export const getRecommendedPreset = (contentType: string, wordCount: number): PresetConfig => {
  // Simple heuristics - can be enhanced with AI later
  if (contentType.includes('news') || wordCount < 500) {
    return narrationPresets.find(p => p.id === 'news-brief')!;
  }

  if (contentType.includes('educational') || contentType.includes('tutorial')) {
    return narrationPresets.find(p => p.id === 'educational')!;
  }

  if (contentType.includes('business') || contentType.includes('professional')) {
    return narrationPresets.find(p => p.id === 'business-brief')!;
  }

  if (wordCount > 5000) {
    return narrationPresets.find(p => p.id === 'audiobook')!;
  }

  // Default to podcast conversational
  return narrationPresets.find(p => p.id === 'podcast-conversational')!;
};
