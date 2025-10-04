export interface Voice {
  id: string;
  name: string;
  language: string;
  accent: string;
  style: string;
  description: string;
  gender: 'male' | 'female';
  category: 'professional' | 'casual' | 'narrative';
  preview?: string;
}

export interface NarrationType {
  id: string;
  name: string;
  description: string;
  duration?: string;
  icon: string;
}

export interface PodcastStyle {
  id: string;
  name: string;
  description: string;
  features: string[];
  recommended?: boolean;
  icon: string;
  color: string;
}

export interface BackgroundMusic {
  id: string;
  name: string;
  genre: string;
  mood: string;
  preview?: string;
}

export interface ContentSource {
  id: string;
  type: 'document' | 'url' | 'ai-discovery';
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: any;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface PodcastConfiguration {
  contentSource?: ContentSource;
  style?: PodcastStyle;
  voice?: Voice;
  narrationType?: NarrationType;
  backgroundMusic?: BackgroundMusic;
  useBackgroundMusic: boolean;
  customSettings?: {
    speed: number;
    pitch: number;
    volume: number;
  };
}

export interface GeneratedPodcast {
  id: string;
  title: string;
  description: string;
  duration: number;
  audioUrl?: string;
  configuration: PodcastConfiguration;
  status: 'generating' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  metadata: {
    wordCount: number;
    estimatedDuration: number;
    chapters?: Array<{ title: string; timestamp: number }>;
  };
}

// ==========================================
// AI PODCAST SHOW MANAGEMENT TYPES
// ==========================================

export type PodcasterType = 'ai' | 'human';
export type PodcastStyleType = 'conversational' | 'expert-panel' | 'debate' | 'interview' | 'storytelling';
export type EpisodeStatus = 'draft' | 'scheduled' | 'generating' | 'published' | 'failed';

// AI Persona
export interface AIPersona {
  id: string;
  name: string;
  personality: string;
  voice: string;
  traits: string[];
  icon: string;
  color: string;
  description: string;
}

// Podcast Show
export interface PodcastShow {
  id: string;
  title: string;
  description: string;
  artwork?: string;
  type: PodcasterType;

  // AI-specific fields
  style?: PodcastStyleType;
  personas?: AIPersona[];
  defaultTone?: string;
  episodeLength?: string; // '10min', '15min', '20min'

  // Metadata
  author: string;
  category: string;
  topics: string[];
  episodeCount: number;
  subscribers: number;

  // RSS feed for human podcasts
  rssFeed?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastEpisodeDate?: Date;
}

// Episode Topic (for planning)
export interface EpisodeTopic {
  id: string;
  showId: string;
  title: string;
  description: string;
  keyPoints: string[];
  researchNotes?: string;
  status: EpisodeStatus;
  scheduledDate?: Date;

  // AI generation config
  sourceDocuments?: string[];
  customPrompt?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Podcast Episode
export interface PodcastEpisode {
  id: string;
  showId: string;
  topicId?: string; // Link to planned topic

  // Episode info
  title: string;
  description: string;
  episodeNumber: number;
  seasonNumber?: number;

  // Audio
  audioUrl?: string;
  duration?: number; // seconds
  fileSize?: number;

  // AI-specific
  type: PodcasterType;
  generationType?: 'single' | 'multi_voice';
  speakers?: number;
  personas?: AIPersona[];
  script?: ConversationScript;
  sourceDocument?: string;

  // Metadata
  topics: string[];
  artwork?: string;
  publishDate: Date;
  status: EpisodeStatus;

  // Stats
  playCount: number;
  likeCount: number;

  // User progress
  progress?: {
    position: number;
    completed: boolean;
    lastPlayed: Date;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Conversation Script
export interface ConversationScript {
  turns: ConversationTurn[];
  totalDuration: number;
  speakers: Speaker[];
  generatedAt: Date;
}

export interface ConversationTurn {
  id: string;
  speaker: string;
  personaId: string;
  text: string;
  timestamp: number; // seconds from start
  duration: number; // seconds
  emotion?: string;
}

export interface Speaker {
  id: string;
  personaId: string;
  name: string;
  voice: string;
  role: 'host' | 'guest' | 'cohost';
}

// Show Creation Request
export interface CreateShowRequest {
  title: string;
  description: string;
  style: PodcastStyleType;
  personas: AIPersona[];
  category: string;
  topics: string[];
  episodeLength: string;
  tone: string;
  artwork?: File;
}

// Episode Creation Request
export interface CreateEpisodeRequest {
  showId: string;
  topicId?: string;
  title: string;
  description: string;
  keyPoints?: string[];
  sourceDocument?: File;
  customPrompt?: string;
  scheduledDate?: Date;
  generateNow: boolean;
}

// Generation Job
export interface GenerationJob {
  id: string;
  episodeId: string;
  showId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;

  // Generation config
  config: {
    style: PodcastStyleType;
    personas: AIPersona[];
    length: string;
    tone: string;
  };
}

// Show Statistics
export interface ShowStatistics {
  showId: string;
  totalEpisodes: number;
  publishedEpisodes: number;
  scheduledEpisodes: number;
  totalPlays: number;
  totalDuration: number; // seconds
  averageEpisodeLength: number; // seconds
  subscribers: number;
  lastPublished?: Date;
}