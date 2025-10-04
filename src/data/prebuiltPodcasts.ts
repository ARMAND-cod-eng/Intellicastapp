/**
 * Pre-built AI Podcast Shows
 * These are AI-generated podcasts with established personalities and episode libraries
 * Users can subscribe and listen like real podcasts
 */

import type { PodcastShow, PodcastEpisode, AIPersona } from '../types/podcast';

// AI Show Personas with Distinct Characters
export const SHOW_PERSONAS = {
  techTalk: [
    {
      id: 'alex-tech',
      name: 'Alex',
      personality: 'Enthusiastic tech evangelist, always excited about new innovations',
      voice: 'host_male_friendly',
      traits: ['optimistic', 'forward-thinking', 'conversational'],
      icon: '👨‍💻',
      color: '#00D4E4',
      description: 'Your friendly guide to the tech world'
    },
    {
      id: 'maya-analyst',
      name: 'Maya',
      personality: 'Critical analyst who asks tough questions',
      voice: 'guest_female_expert',
      traits: ['analytical', 'questioning', 'detail-oriented'],
      icon: '👩‍🔬',
      color: '#F59E0B',
      description: 'The voice of reason and critical thinking'
    }
  ],
  businessInsights: [
    {
      id: 'david-strategist',
      name: 'David',
      personality: 'Experienced business strategist with practical insights',
      voice: 'host_male_friendly',
      traits: ['strategic', 'experienced', 'practical'],
      icon: '👔',
      color: '#8B5CF6',
      description: 'Strategic business advisor'
    },
    {
      id: 'sarah-entrepreneur',
      name: 'Sarah',
      personality: 'Serial entrepreneur with startup experience',
      voice: 'guest_female_expert',
      traits: ['innovative', 'risk-taking', 'inspiring'],
      icon: '💼',
      color: '#10B981',
      description: 'Startup veteran and innovation leader'
    }
  ],
  scienceExplained: [
    {
      id: 'dr-james',
      name: 'Dr. James',
      personality: 'Patient science educator who makes complex topics accessible',
      voice: 'host_male_friendly',
      traits: ['patient', 'educational', 'clear'],
      icon: '🔬',
      color: '#3B82F6',
      description: 'Science made simple'
    },
    {
      id: 'lisa-curious',
      name: 'Lisa',
      personality: 'Curious learner who asks questions everyone wants to know',
      voice: 'guest_female_expert',
      traits: ['curious', 'relatable', 'enthusiastic'],
      icon: '🤔',
      color: '#EC4899',
      description: 'Your curious science companion'
    }
  ],
  aiRevolution: [
    {
      id: 'kai-futurist',
      name: 'Kai',
      personality: 'AI futurist exploring the implications of artificial intelligence',
      voice: 'host_male_friendly',
      traits: ['visionary', 'thoughtful', 'philosophical'],
      icon: '🤖',
      color: '#00D4E4',
      description: 'AI visionary and futurist'
    },
    {
      id: 'emma-ethicist',
      name: 'Emma',
      personality: 'AI ethicist concerned with responsible development',
      voice: 'guest_female_expert',
      traits: ['ethical', 'balanced', 'thoughtful'],
      icon: '⚖️',
      color: '#F59E0B',
      description: 'Ethics and responsibility advocate'
    }
  ],
  dailyNews: [
    {
      id: 'tom-anchor',
      name: 'Tom',
      personality: 'Professional news anchor with a calm demeanor',
      voice: 'host_male_friendly',
      traits: ['professional', 'authoritative', 'clear'],
      icon: '📰',
      color: '#EF4444',
      description: 'Your trusted news anchor'
    },
    {
      id: 'nina-reporter',
      name: 'Nina',
      personality: 'On-the-ground reporter with deep analysis',
      voice: 'guest_female_expert',
      traits: ['investigative', 'analytical', 'engaging'],
      icon: '📹',
      color: '#F59E0B',
      description: 'Investigative reporter'
    }
  ]
};

// Pre-built Podcast Shows
export const PREBUILT_SHOWS: PodcastShow[] = [
  {
    id: 'show_tech_talk',
    title: 'Tech Talk Daily',
    description: 'Your daily dose of technology news, trends, and innovations. Alex and Maya break down the latest in tech with enthusiasm and critical analysis.',
    artwork: '🎙️',
    type: 'ai',
    style: 'conversational',
    personas: SHOW_PERSONAS.techTalk,
    defaultTone: 'friendly',
    episodeLength: '15min',
    author: 'Intellicast AI',
    category: 'Technology',
    topics: ['AI', 'Software', 'Hardware', 'Startups', 'Innovation'],
    episodeCount: 156,
    subscribers: 12500,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    lastEpisodeDate: new Date()
  },
  {
    id: 'show_business_insights',
    title: 'Business Insights',
    description: 'Strategic business analysis and startup stories with David and Sarah. Learn from successful entrepreneurs and business leaders.',
    artwork: '💼',
    type: 'ai',
    style: 'expert-panel',
    personas: SHOW_PERSONAS.businessInsights,
    defaultTone: 'professional',
    episodeLength: '20min',
    author: 'Intellicast AI',
    category: 'Business',
    topics: ['Strategy', 'Leadership', 'Startups', 'Growth', 'Management'],
    episodeCount: 98,
    subscribers: 8900,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    lastEpisodeDate: new Date()
  },
  {
    id: 'show_science_explained',
    title: 'Science Explained',
    description: 'Complex science made simple! Dr. James and Lisa explore fascinating scientific discoveries and explain them in everyday language.',
    artwork: '🔬',
    type: 'ai',
    style: 'interview',
    personas: SHOW_PERSONAS.scienceExplained,
    defaultTone: 'educational',
    episodeLength: '15min',
    author: 'Intellicast AI',
    category: 'Science',
    topics: ['Physics', 'Biology', 'Chemistry', 'Space', 'Research'],
    episodeCount: 127,
    subscribers: 15300,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    lastEpisodeDate: new Date()
  },
  {
    id: 'show_ai_revolution',
    title: 'The AI Revolution',
    description: 'Kai and Emma explore the rapidly evolving world of artificial intelligence, discussing breakthroughs, ethics, and the future of AI.',
    artwork: '🤖',
    type: 'ai',
    style: 'debate',
    personas: SHOW_PERSONAS.aiRevolution,
    defaultTone: 'thoughtful',
    episodeLength: '20min',
    author: 'Intellicast AI',
    category: 'Technology',
    topics: ['AI', 'Machine Learning', 'Ethics', 'Future', 'Society'],
    episodeCount: 84,
    subscribers: 21000,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    lastEpisodeDate: new Date()
  },
  {
    id: 'show_daily_news',
    title: 'AI News Brief',
    description: 'Tom and Nina bring you the most important news stories of the day, analyzed and explained in just 10 minutes.',
    artwork: '📰',
    type: 'ai',
    style: 'conversational',
    personas: SHOW_PERSONAS.dailyNews,
    defaultTone: 'professional',
    episodeLength: '10min',
    author: 'Intellicast AI',
    category: 'News',
    topics: ['World News', 'Politics', 'Economy', 'Technology', 'Science'],
    episodeCount: 312,
    subscribers: 34500,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date(),
    lastEpisodeDate: new Date()
  },
  {
    id: 'show_wellness',
    title: 'Mind & Body Wellness',
    description: 'Holistic health discussions covering mental wellness, fitness, nutrition, and mindfulness practices.',
    artwork: '🧘',
    type: 'ai',
    style: 'conversational',
    personas: [
      {
        id: 'wellness-coach',
        name: 'Rachel',
        personality: 'Certified wellness coach with holistic approach',
        voice: 'guest_female_expert',
        traits: ['calm', 'supportive', 'knowledgeable'],
        icon: '🌿',
        color: '#10B981',
        description: 'Your wellness guide'
      },
      {
        id: 'dr-wellness',
        name: 'Dr. Mike',
        personality: 'Medical doctor specializing in preventive health',
        voice: 'host_male_friendly',
        traits: ['scientific', 'practical', 'caring'],
        icon: '⚕️',
        color: '#3B82F6',
        description: 'Medical wellness expert'
      }
    ],
    defaultTone: 'calm',
    episodeLength: '15min',
    author: 'Intellicast AI',
    category: 'Health',
    topics: ['Mental Health', 'Fitness', 'Nutrition', 'Mindfulness', 'Sleep'],
    episodeCount: 76,
    subscribers: 11200,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(),
    lastEpisodeDate: new Date()
  }
];

// Sample episodes for pre-built shows
export const PREBUILT_EPISODES: PodcastEpisode[] = [
  // Tech Talk Daily Episodes
  {
    id: 'ep_tech_1',
    showId: 'show_tech_talk',
    title: 'AI Breakthrough: GPT-5 Rumors and Reality',
    description: 'Alex and Maya discuss the latest rumors about GPT-5, separating fact from fiction and exploring what it could mean for the future of AI.',
    episodeNumber: 156,
    type: 'ai',
    generationType: 'multi_voice',
    speakers: 2,
    personas: SHOW_PERSONAS.techTalk,
    topics: ['AI', 'GPT-5', 'Machine Learning'],
    status: 'published',
    publishDate: new Date(),
    playCount: 3420,
    likeCount: 287,
    duration: 900,
    audioUrl: '/audio/sample-tech-1.mp3',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ep_tech_2',
    showId: 'show_tech_talk',
    title: 'Quantum Computing Goes Mainstream',
    description: 'Is quantum computing finally ready for everyday use? We break down recent announcements from major tech companies.',
    episodeNumber: 155,
    type: 'ai',
    generationType: 'multi_voice',
    speakers: 2,
    personas: SHOW_PERSONAS.techTalk,
    topics: ['Quantum Computing', 'Hardware', 'Innovation'],
    status: 'published',
    publishDate: new Date(Date.now() - 86400000),
    playCount: 4120,
    likeCount: 356,
    duration: 900,
    audioUrl: '/audio/sample-tech-2.mp3',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000)
  },
  // Business Insights Episodes
  {
    id: 'ep_biz_1',
    showId: 'show_business_insights',
    title: 'From Garage to Billion: Startup Success Stories',
    description: 'David and Sarah analyze what made recent unicorn startups successful and the lessons entrepreneurs can learn.',
    episodeNumber: 98,
    type: 'ai',
    generationType: 'multi_voice',
    speakers: 2,
    personas: SHOW_PERSONAS.businessInsights,
    topics: ['Startups', 'Growth', 'Success Stories'],
    status: 'published',
    publishDate: new Date(),
    playCount: 2890,
    likeCount: 234,
    duration: 1200,
    audioUrl: '/audio/sample-biz-1.mp3',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Science Explained Episodes
  {
    id: 'ep_sci_1',
    showId: 'show_science_explained',
    title: 'Black Holes Explained: What Really Happens Inside?',
    description: 'Dr. James and Lisa dive into the mysteries of black holes, explaining the latest discoveries in simple terms.',
    episodeNumber: 127,
    type: 'ai',
    generationType: 'multi_voice',
    speakers: 2,
    personas: SHOW_PERSONAS.scienceExplained,
    topics: ['Physics', 'Space', 'Astronomy'],
    status: 'published',
    publishDate: new Date(),
    playCount: 5670,
    likeCount: 498,
    duration: 900,
    audioUrl: '/audio/sample-sci-1.mp3',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // AI Revolution Episodes
  {
    id: 'ep_ai_1',
    showId: 'show_ai_revolution',
    title: 'AI Ethics: Who Decides What\'s Right?',
    description: 'Kai and Emma debate the ethical frameworks needed for AI development and who should be making these crucial decisions.',
    episodeNumber: 84,
    type: 'ai',
    generationType: 'multi_voice',
    speakers: 2,
    personas: SHOW_PERSONAS.aiRevolution,
    topics: ['AI Ethics', 'Governance', 'Society'],
    status: 'published',
    publishDate: new Date(),
    playCount: 7320,
    likeCount: 612,
    duration: 1200,
    audioUrl: '/audio/sample-ai-1.mp3',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Daily News Episodes
  {
    id: 'ep_news_1',
    showId: 'show_daily_news',
    title: 'Today\'s Top Stories: Tech, Politics, and More',
    description: 'Tom and Nina bring you today\'s most important news in technology, politics, and global events.',
    episodeNumber: 312,
    type: 'ai',
    generationType: 'multi_voice',
    speakers: 2,
    personas: SHOW_PERSONAS.dailyNews,
    topics: ['News', 'Technology', 'Politics'],
    status: 'published',
    publishDate: new Date(),
    playCount: 12500,
    likeCount: 1023,
    duration: 600,
    audioUrl: '/audio/sample-news-1.mp3',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Helper function to get episodes for a show
export function getShowEpisodes(showId: string): PodcastEpisode[] {
  return PREBUILT_EPISODES.filter(ep => ep.showId === showId);
}

// Helper function to get featured shows
export function getFeaturedShows(): PodcastShow[] {
  return PREBUILT_SHOWS.slice(0, 3);
}

// Helper function to get trending shows
export function getTrendingShows(): PodcastShow[] {
  return [...PREBUILT_SHOWS].sort((a, b) => b.subscribers - a.subscribers).slice(0, 4);
}

// Helper function to get shows by category
export function getShowsByCategory(category: string): PodcastShow[] {
  return PREBUILT_SHOWS.filter(show => show.category === category);
}
