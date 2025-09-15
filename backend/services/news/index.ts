/**
 * News Aggregation System - Main Export
 * Complete news aggregation solution with RSS feeds, NewsAPI, and AI processing
 */

// Main service
export { NewsAggregationService, createNewsAggregationService, defaultConfig } from './NewsAggregationService';

// Individual services
export { NewsScheduler } from './scheduler/NewsScheduler';
export { DeduplicationService } from './processing/DeduplicationService';
export { ClassificationService } from './processing/ClassificationService';
export { PriorityService } from './processing/PriorityService';
export { SearchService } from './search/SearchService';
export { NewsCronJob } from './cron/NewsCronJob';

// News sources
export { NewsAPISource } from './sources/NewsAPISource';
export { RSSSource } from './sources/RSSSource';

// Types
export * from './types/NewsTypes';

// Re-export commonly used types for convenience
export type {
  Article,
  NewsSourceConfig,
  SearchOptions,
  SearchResult,
  FetchResult,
  NewsMetrics,
  RateLimitInfo
} from './types/NewsTypes';

/**
 * Quick start function - creates a ready-to-use news aggregation system
 */
export async function createNewsAggregator(options: {
  databasePath?: string;
  newsApiKey?: string;
  fetchIntervalMinutes?: number;
  enableCron?: boolean;
  enableProcessing?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
} = {}): Promise<NewsAggregationService> {
  const {
    databasePath = './data/news.db',
    newsApiKey = process.env.NEWS_API_KEY || '',
    fetchIntervalMinutes = 30,
    enableCron = true,
    enableProcessing = true,
    logLevel = 'info'
  } = options;

  const logger = createLogger(logLevel);

  const config = {
    database: {
      path: databasePath,
      enableWAL: true,
      enableForeignKeys: true,
      busyTimeout: 5000
    },
    newsApi: {
      apiKey: newsApiKey,
      dailyLimit: 100
    },
    scheduler: {
      intervalMinutes: fetchIntervalMinutes,
      maxConcurrentJobs: 3,
      enableProcessing
    },
    processing: {
      enableDeduplication: true,
      enableClassification: true,
      enablePriority: true,
      similarityThreshold: 0.85
    },
    cron: {
      enabled: enableCron,
      timezone: 'UTC'
    }
  };

  const service = await createNewsAggregationService(config, logger);

  logger.info('News aggregation system created successfully', {
    databasePath,
    hasNewsApiKey: !!newsApiKey,
    fetchIntervalMinutes,
    enableCron,
    enableProcessing
  });

  return service;
}

/**
 * Simple logger implementation
 */
function createLogger(level: string) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[level as keyof typeof levels] || 1;

  return {
    debug: (message: string, meta?: any) => {
      if (currentLevel <= 0) console.debug(`[DEBUG] ${message}`, meta || '');
    },
    info: (message: string, meta?: any) => {
      if (currentLevel <= 1) console.info(`[INFO] ${message}`, meta || '');
    },
    warn: (message: string, meta?: any) => {
      if (currentLevel <= 2) console.warn(`[WARN] ${message}`, meta || '');
    },
    error: (message: string, meta?: any) => {
      if (currentLevel <= 3) console.error(`[ERROR] ${message}`, meta || '');
    }
  };
}

/**
 * Example usage patterns and utilities
 */
export const examples = {
  basicUsage: `
// Basic setup
import { createNewsAggregator } from './services/news';

const newsService = await createNewsAggregator({
  newsApiKey: 'your-api-key',
  databasePath: './news.db',
  fetchIntervalMinutes: 30
});

// Fetch news manually
const results = await newsService.fetchNews();
console.log('Fetched', results.newArticles, 'new articles');

// Search articles
const searchResults = await newsService.search({
  query: 'artificial intelligence',
  limit: 10,
  categories: ['technology']
});

// Get breaking news
const breaking = await newsService.getBreakingNews();
  `,

  advancedUsage: `
// Advanced configuration
import { NewsAggregationService } from './services/news';

const config = {
  database: {
    path: './data/news.db',
    enableWAL: true,
    enableForeignKeys: true
  },
  newsApi: {
    apiKey: process.env.NEWS_API_KEY,
    dailyLimit: 100
  },
  scheduler: {
    intervalMinutes: 15, // More frequent fetching
    maxConcurrentJobs: 5,
    enableProcessing: true
  },
  processing: {
    enableDeduplication: true,
    enableClassification: true,
    enablePriority: true,
    similarityThreshold: 0.90 // Stricter duplicate detection
  },
  cron: {
    enabled: true,
    timezone: 'America/New_York'
  }
};

const service = new NewsAggregationService(config);
await service.initialize();

// Add custom RSS source
await service.addSource({
  name: 'Custom Tech Blog',
  type: 'rss',
  url: 'https://example.com/feed.xml',
  category: 'technology',
  priority: 5,
  rateLimitPerHour: 10,
  language: 'en'
});
  `,

  searchExamples: `
// Full-text search
const results = await newsService.search({
  query: 'machine learning breakthrough',
  limit: 20,
  sortBy: 'relevance'
});

// Filtered search
const filtered = await newsService.search({
  query: 'covid vaccine',
  categories: ['health', 'science'],
  priorities: ['breaking', 'trending'],
  dateFrom: new Date('2024-01-01'),
  limit: 50
});

// Find similar articles
const similar = await newsService.findSimilarArticles(123, 10);

// Get search suggestions
const suggestions = await newsService.getSuggestions('artif', 10);
  `,

  metricsAndMonitoring: `
// Get system metrics
const metrics = await newsService.getMetrics();
console.log('Total articles:', metrics.totalArticles);
console.log('Articles last 24h:', metrics.articlesLast24h);
console.log('Category breakdown:', metrics.categoryDistribution);

// Health check
const health = await newsService.healthCheck();
console.log('System status:', health.status);
console.log('Service details:', health.services);

// Get service status
const status = newsService.getStatus();
console.log('Cron job status:', status.cronJob);
console.log('Scheduler status:', status.scheduler);
  `
};

/**
 * Utility functions for common operations
 */
export const utils = {
  // Format article for display
  formatArticle: (article: any) => ({
    id: article.id,
    title: article.title,
    summary: article.description?.substring(0, 200) + '...',
    source: article.source_name,
    publishedAt: new Date(article.published_at).toLocaleDateString(),
    priority: article.priority,
    category: article.category,
    url: article.url
  }),

  // Calculate reading time
  calculateReadingTime: (wordCount: number, wpm = 200) => {
    return Math.ceil(wordCount / wpm);
  },

  // Get priority weight for sorting
  getPriorityWeight: (priority: string) => {
    const weights = { breaking: 1, trending: 2, regular: 3 };
    return weights[priority as keyof typeof weights] || 3;
  },

  // Format time ago
  timeAgo: (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
};

/**
 * Default RSS feeds for common news sources
 */
export const defaultRSSFeeds = [
  // BBC
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'general', priority: 1 },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'technology', priority: 2 },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'business', priority: 2 },

  // CNN
  { name: 'CNN Top Stories', url: 'http://rss.cnn.com/rss/edition.rss', category: 'general', priority: 1 },
  { name: 'CNN Technology', url: 'http://rss.cnn.com/rss/edition_technology.rss', category: 'technology', priority: 2 },

  // Reuters
  { name: 'Reuters World News', url: 'https://feeds.reuters.com/reuters/worldNews', category: 'world', priority: 1 },
  { name: 'Reuters Technology', url: 'https://feeds.reuters.com/reuters/technologyNews', category: 'technology', priority: 2 },

  // Tech Sites
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'technology', priority: 1 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'technology', priority: 1 },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'technology', priority: 2 }
];

/**
 * Configuration presets for different use cases
 */
export const presets = {
  // Minimal setup for testing
  minimal: {
    database: { path: ':memory:' },
    scheduler: { intervalMinutes: 60, enableProcessing: false },
    processing: { enableDeduplication: false, enableClassification: false, enablePriority: false },
    cron: { enabled: false }
  },

  // Production setup with all features
  production: {
    database: { path: './data/news.db', enableWAL: true, enableForeignKeys: true },
    scheduler: { intervalMinutes: 30, maxConcurrentJobs: 5, enableProcessing: true },
    processing: { enableDeduplication: true, enableClassification: true, enablePriority: true },
    cron: { enabled: true, timezone: 'UTC' }
  },

  // High-frequency setup for breaking news
  realtime: {
    database: { path: './data/news.db', enableWAL: true },
    scheduler: { intervalMinutes: 10, maxConcurrentJobs: 8, enableProcessing: true },
    processing: { enableDeduplication: true, enableClassification: true, enablePriority: true },
    cron: { enabled: true, timezone: 'UTC' }
  }
};

/**
 * Version and build info
 */
export const NEWS_AGGREGATION_VERSION = '1.0.0';
export const SUPPORTED_SOURCES = ['newsapi', 'rss', 'custom'];
export const SUPPORTED_CATEGORIES = [
  'general', 'business', 'technology', 'science', 'health',
  'sports', 'entertainment', 'politics', 'world'
];

export default NewsAggregationService;