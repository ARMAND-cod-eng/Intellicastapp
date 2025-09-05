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