// Chatterbox TTS Voice Types

export interface ChatterboxVoice {
  id: string;
  name: string;
  language: string;
  voice_id: string;
  emotion: number;
  speed: number;
  description: string;
  characteristics: string[];
  best_for: string[];
}

export interface VoicesByLanguage {
  [languageCode: string]: ChatterboxVoice[];
}

export interface ChatterboxVoicesResponse {
  success: boolean;
  voices_by_language: VoicesByLanguage;
  total_voices: number;
  supported_languages: string[];
  features: string[];
  timestamp: string;
}

export interface VoiceRecommendation {
  id: string;
  name: string;
  language: string;
  description: string;
  characteristics: string[];
  best_for: string[];
  emotion: number;
  speed: number;
  score?: number; // Recommendation relevance score
}

export interface VoicePreview {
  success: boolean;
  voiceId: string;
  language: string;
  audioUrl: string;
  fileName: string;
  duration: number;
  model: string;
  error?: string;
}

export interface VoiceComparison {
  voiceId: string;
  language: string;
  audioUrl: string;
  duration: number;
  characteristics: string[];
  emotion: number;
  model: string;
  success: boolean;
  error?: string;
}

export interface AudioGenerationOptions {
  voice?: string;
  speed?: number;
  emotion?: number;
  outputFile?: string;
  autoDetect?: boolean;
}

export interface AudioGenerationResult {
  success: boolean;
  audioUrl?: string;
  filePath?: string;
  fileName?: string;
  duration?: number;
  fileSize?: number;
  voice?: string;
  language?: string;
  emotion?: number;
  voiceCharacteristics?: ChatterboxVoice;
  speed?: number;
  textLength?: number;
  model?: string;
  error?: string;
}

export interface VoiceCloneResult {
  success: boolean;
  clonedVoiceId?: string;
  error?: string;
}

// UI Component Props
export interface ChatterboxVoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  onPreviewPlay?: (voiceId: string) => void;
  currentlyPlaying?: string | null;
  contentCategory?: string;
  showAdvanced?: boolean;
  compact?: boolean;
}

// Language mapping
export interface LanguageConfig {
  code: string;
  name: string;
  flag: string;
  nativeName?: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  'en': {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    nativeName: 'English'
  },
  'es': {
    code: 'es', 
    name: 'Spanish',
    flag: '🇪🇸',
    nativeName: 'Español'
  },
  'fr': {
    code: 'fr',
    name: 'French', 
    flag: '🇫🇷',
    nativeName: 'Français'
  },
  'de': {
    code: 'de',
    name: 'German',
    flag: '🇩🇪', 
    nativeName: 'Deutsch'
  },
  'ar': {
    code: 'ar',
    name: 'Arabic',
    flag: '🇸🇦',
    nativeName: 'العربية'
  },
  'da': {
    code: 'da',
    name: 'Danish',
    flag: '🇩🇰',
    nativeName: 'Dansk'
  },
  'el': {
    code: 'el',
    name: 'Greek',
    flag: '🇬🇷',
    nativeName: 'Ελληνικά'
  },
  'fi': {
    code: 'fi',
    name: 'Finnish',
    flag: '🇫🇮',
    nativeName: 'Suomi'
  },
  'he': {
    code: 'he',
    name: 'Hebrew',
    flag: '🇮🇱',
    nativeName: 'עברית'
  },
  'hi': {
    code: 'hi',
    name: 'Hindi',
    flag: '🇮🇳',
    nativeName: 'हिन्दी'
  },
  'it': {
    code: 'it',
    name: 'Italian',
    flag: '🇮🇹',
    nativeName: 'Italiano'
  },
  'ja': {
    code: 'ja',
    name: 'Japanese',
    flag: '🇯🇵',
    nativeName: '日本語'
  },
  'ko': {
    code: 'ko',
    name: 'Korean',
    flag: '🇰🇷',
    nativeName: '한국어'
  },
  'ms': {
    code: 'ms',
    name: 'Malay',
    flag: '🇲🇾',
    nativeName: 'Bahasa Melayu'
  },
  'nl': {
    code: 'nl',
    name: 'Dutch',
    flag: '🇳🇱',
    nativeName: 'Nederlands'
  },
  'no': {
    code: 'no',
    name: 'Norwegian',
    flag: '🇳🇴',
    nativeName: 'Norsk'
  },
  'pl': {
    code: 'pl',
    name: 'Polish',
    flag: '🇵🇱',
    nativeName: 'Polski'
  },
  'pt': {
    code: 'pt',
    name: 'Portuguese',
    flag: '🇵🇹',
    nativeName: 'Português'
  },
  'ru': {
    code: 'ru',
    name: 'Russian',
    flag: '🇷🇺',
    nativeName: 'Русский'
  },
  'sv': {
    code: 'sv',
    name: 'Swedish',
    flag: '🇸🇪',
    nativeName: 'Svenska'
  },
  'sw': {
    code: 'sw',
    name: 'Swahili',
    flag: '🇰🇪',
    nativeName: 'Kiswahili'
  },
  'tr': {
    code: 'tr',
    name: 'Turkish',
    flag: '🇹🇷',
    nativeName: 'Türkçe'
  },
  'zh': {
    code: 'zh',
    name: 'Chinese',
    flag: '🇨🇳',
    nativeName: '中文'
  }
};

// Content categories for voice recommendations
export const CONTENT_CATEGORIES = [
  'general',
  'news',
  'business', 
  'educational',
  'storytelling',
  'technical',
  'conversational',
  'documentary',
  'formal',
  'cultural'
] as const;

export type ContentCategory = typeof CONTENT_CATEGORIES[number];

// Voice characteristics
export const VOICE_CHARACTERISTICS = [
  'professional',
  'warm',
  'clear', 
  'authoritative',
  'confident',
  'expressive',
  'natural',
  'elegant',
  'sophisticated',
  'distinguished',
  'refined',
  'precise',
  'dramatic',
  'gentle',
  'soothing',
  'friendly',
  'engaging'
] as const;

export type VoiceCharacteristic = typeof VOICE_CHARACTERISTICS[number];