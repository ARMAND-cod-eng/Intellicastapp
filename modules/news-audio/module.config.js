/**
 * News Audio Module Configuration
 * Defines module metadata, dependencies, and registration info
 */

export default {
  // Module Identity
  name: 'news-audio',
  version: '1.0.0',
  displayName: 'News Audio',
  description: 'AI-powered news article to audio conversion with voice narration',

  // Feature Flags
  enabled: process.env.NEWS_AUDIO_ENABLED === 'true' || false,
  beta: true,

  // Module Dependencies
  dependencies: {
    core: ['auth', 'database', 'tts', 'ai-processing'],
    modules: [], // No other module dependencies
  },

  // API Configuration
  api: {
    prefix: '/api/news-audio',
    version: 'v1',
    routes: {
      articles: '/articles',
      generate: '/generate',
      library: '/library',
      settings: '/settings'
    }
  },

  // Database Configuration
  database: {
    tables: [
      'news_articles',
      'news_audio_sessions',
      'news_sources',
      'user_news_preferences'
    ]
  },

  // Frontend Configuration
  frontend: {
    routes: [
      {
        path: '/news-audio',
        component: 'NewsAudioDashboard',
        protected: true
      },
      {
        path: '/news-audio/library',
        component: 'NewsAudioLibrary',
        protected: true
      },
      {
        path: '/news-audio/settings',
        component: 'NewsAudioSettings',
        protected: true
      }
    ],
    navigation: {
      label: 'News Audio',
      icon: 'Newspaper',
      order: 2,
      parentMenu: null
    }
  },

  // Permissions
  permissions: {
    required: ['authenticated'],
    roles: ['user', 'admin'],
    features: {
      'news-audio:read': 'View news audio content',
      'news-audio:create': 'Generate news audio',
      'news-audio:manage': 'Manage news sources and settings'
    }
  },

  // Module Lifecycle Hooks
  hooks: {
    onInit: 'initializeNewsAudioModule',
    onEnable: 'enableNewsAudioFeature',
    onDisable: 'disableNewsAudioFeature',
    onUnload: 'cleanupNewsAudioModule'
  }
};