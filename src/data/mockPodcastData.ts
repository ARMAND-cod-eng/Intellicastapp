import type { Voice, NarrationType, PodcastStyle, BackgroundMusic, ContentSource } from '../types/podcast';

export const voices: Voice[] = [
  {
    id: 'rachel',
    name: 'Rachel',
    language: 'English (American)',
    accent: 'American',
    style: 'Conversational',
    description: 'Warm, friendly voice perfect for casual conversations',
    gender: 'female',
    category: 'casual'
  },
  {
    id: 'clyde',
    name: 'Clyde',
    language: 'English (American)',
    accent: 'American', 
    style: 'Intense',
    description: 'Deep, authoritative voice for serious content',
    gender: 'male',
    category: 'professional'
  },
  {
    id: 'roger',
    name: 'Roger',
    language: 'English (American)',
    accent: 'American',
    style: 'Conversational',
    description: 'Classy, sophisticated tone for professional content',
    gender: 'male',
    category: 'professional'
  },
  {
    id: 'sarah',
    name: 'Sarah',
    language: 'English (American)',
    accent: 'American',
    style: 'Professional',
    description: 'Clear, articulate voice for business content',
    gender: 'female',
    category: 'professional'
  },
  {
    id: 'laura',
    name: 'Laura',
    language: 'English (American)',
    accent: 'American',
    style: 'Social Media',
    description: 'Sassy, energetic voice for modern content',
    gender: 'female',
    category: 'casual'
  },
  {
    id: 'thomas',
    name: 'Thomas',
    language: 'English (American)',
    accent: 'American',
    style: 'Meditative',
    description: 'Calm, soothing voice for relaxing content',
    gender: 'male',
    category: 'casual'
  },
  {
    id: 'charlie',
    name: 'Charlie',
    language: 'English (Australian)',
    accent: 'Australian',
    style: 'Conversational',
    description: 'Hyped, enthusiastic Australian voice',
    gender: 'male',
    category: 'casual'
  },
  {
    id: 'george',
    name: 'George',
    language: 'English (British)',
    accent: 'British',
    style: 'Narrative & Story',
    description: 'Mature, storytelling voice with British accent',
    gender: 'male',
    category: 'narrative'
  }
];

export const narrationTypes: NarrationType[] = [
  {
    id: 'summary',
    name: 'Summary',
    description: 'Concise overview highlighting key points and main ideas',
    duration: '2-5 min',
    icon: '📋'
  },
  {
    id: 'full-article',
    name: 'Full Article',
    description: 'Complete narration of the entire document content',
    duration: '10-30 min',
    icon: '📖'
  },
  {
    id: 'explanatory',
    name: 'Explanatory',
    description: 'Detailed breakdown with explanations and context',
    duration: '5-15 min',
    icon: '🎓'
  },
  {
    id: 'personalized-briefing',
    name: 'Personalized Briefing',
    description: 'Tailored summary based on your interests and preferences',
    duration: '3-8 min',
    icon: '👤'
  },
  {
    id: 'interactive',
    name: 'Interactive',
    description: 'Q&A style discussion with multiple perspectives',
    duration: '8-20 min',
    icon: '💬'
  }
];

export const podcastStyles: PodcastStyle[] = [
  {
    id: 'single-voice',
    name: 'Single Voice Narration',
    description: 'Professional narrator reading your content with adjustable speed',
    features: ['Natural speech patterns', 'Customizable pace', 'Clear pronunciation'],
    recommended: false,
    icon: '🎙️',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'multi-voice',
    name: 'Multi-Voice Conversation',
    description: 'Dynamic discussion between 2-4 AI speakers about your content',
    features: ['Natural interruptions', 'Emotional responses', 'Engaging dialogue'],
    recommended: true,
    icon: '👥',
    color: 'from-accent-500 to-primary-600'
  },
  {
    id: 'expert-panel',
    name: 'Expert Panel Discussion',
    description: 'Professional analysis with multiple expert perspectives',
    features: ['In-depth analysis', 'Opposing viewpoints', 'Expert insights'],
    recommended: false,
    icon: '🎯',
    color: 'from-purple-500 to-purple-600'
  }
];

export const backgroundMusic: BackgroundMusic[] = [
  {
    id: 'none',
    name: 'No Background Music',
    genre: 'None',
    mood: 'Clean'
  },
  {
    id: 'ambient-calm',
    name: 'Ambient Calm',
    genre: 'Ambient',
    mood: 'Relaxing'
  },
  {
    id: 'corporate-upbeat',
    name: 'Corporate Upbeat',
    genre: 'Corporate',
    mood: 'Professional'
  },
  {
    id: 'documentary-subtle',
    name: 'Documentary Style',
    genre: 'Cinematic',
    mood: 'Informative'
  },
  {
    id: 'podcast-intro',
    name: 'Podcast Intro',
    genre: 'Modern',
    mood: 'Engaging'
  }
];

export const contentSources: ContentSource[] = [
  {
    id: 'document-upload',
    type: 'document',
    status: 'idle',
    name: 'Upload Document',
    icon: '📄',
    color: 'from-blue-500 to-blue-600',
    description: 'Transform PDF, DOCX, TXT, or Markdown files into engaging podcasts'
  },
  {
    id: 'url-import',
    type: 'url',
    status: 'idle',
    name: 'Import from URL',
    icon: '🔗',
    color: 'from-green-500 to-green-600',
    description: 'Extract content from web articles and news stories'
  },
  {
    id: 'ai-discovery',
    type: 'ai-discovery',
    status: 'idle',
    name: 'AI Content Discovery',
    icon: '✨',
    color: 'from-purple-500 to-purple-600',
    description: 'Let AI find trending topics and create podcasts automatically'
  }
];