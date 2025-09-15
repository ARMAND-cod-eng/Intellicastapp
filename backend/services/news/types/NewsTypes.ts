/**
 * News Aggregation System Type Definitions
 * Comprehensive types for the news aggregation and processing system
 */

// Core Article Interface
export interface Article {
  id?: number;
  title: string;
  description: string;
  content: string;
  summary?: string; // AI-generated summary
  url: string;
  urlHash: string; // SHA-256 hash for deduplication

  // Source information
  sourceId?: number;
  sourceName: string;
  author: string | null;

  // Timing
  publishedAt: Date;
  fetchedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // Classification
  category: string;
  priority: 'breaking' | 'trending' | 'regular';
  confidenceScore?: number;

  // Content analysis
  wordCount: number;
  readingTime?: number; // in minutes
  language: string;
  sentimentScore?: number; // -1 to 1

  // Media
  imageUrl?: string | null;
  videoUrl?: string | null;

  // Flags
  isDuplicate?: boolean;
  duplicateOf?: number;
  isProcessed?: boolean;
  hasAudio?: boolean;

  // Embeddings
  embeddingVector?: number[];
  embeddingModel?: string;

  // Engagement (if available)
  viewCount?: number;
  likeCount?: number;
  shareCount?: number;
}

// News Source Configuration
export interface NewsSourceConfig {
  id?: number;
  name: string;
  type: 'newsapi' | 'rss' | 'custom';
  url: string;
  apiKey?: string;
  category: string;
  country?: string;
  language: string;
  priority: number; // 1-10, 1 = highest
  rateLimitPerHour: number;
  lastFetchAt?: Date;
  fetchCountToday: number;
  isActive: boolean;
  configJson: any; // Additional configuration
  consecutiveErrors: number;
  lastError?: string;
  lastErrorAt?: Date;
}

// Fetch Result Interface
export interface FetchResult {
  success: boolean;
  articles: Article[];
  totalResults: number;
  source: string;
  duration: number; // milliseconds
  error?: string;
  rateLimitInfo?: RateLimitInfo;
  metadata?: any;
}

// Rate Limiting Information
export interface RateLimitInfo {
  dailyLimit: number;
  dailyRemaining: number;
  hourlyLimit: number;
  hourlyRemaining: number;
  resetTime: Date;
  canMakeRequest: boolean;
}

// News Source Interface
export interface NewsSource {
  fetchArticles(options?: any): Promise<FetchResult>;
  healthCheck(): Promise<{ status: string; details: any }>;
}

// RSS Feed Specific Types
export interface RSSFeedItem {
  title: string;
  description?: string;
  link: string;
  pubDate?: string;
  author?: string;
  category?: string[];
  content?: string;
  guid?: string;
  enclosure?: {
    url: string;
    type: string;
    length?: number;
  };
}

export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  lastBuildDate?: string;
  language?: string;
  items: RSSFeedItem[];
}

// Deduplication Types
export interface SimilarityResult {
  article1Id: number;
  article2Id: number;
  similarityScore: number;
  comparisonMethod: 'cosine' | 'jaccard' | 'fuzzy';
}

export interface EmbeddingResult {
  articleId: number;
  embedding: number[];
  model: string;
}

// Classification Types
export interface ClassificationResult {
  articleId: number;
  category: string;
  confidence: number;
  classifierModel: string;
}

export interface KeywordExtractionResult {
  articleId: number;
  keywords: {
    keyword: string;
    relevanceScore: number;
  }[];
  extractionMethod: string;
}

// Fetch Job Tracking
export interface FetchJob {
  id?: number;
  sourceId: number;
  jobType: 'scheduled' | 'manual' | 'retry';
  status: 'pending' | 'running' | 'completed' | 'failed';

  // Timing
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;

  // Results
  articlesFetched: number;
  articlesNew: number;
  articlesDuplicates: number;
  articlesProcessed: number;

  // Error handling
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;

  // Rate limiting
  rateLimitRemaining?: number;
  rateLimitResetAt?: Date;

  createdAt: Date;
}

// Scheduler Types
export interface SchedulerConfig {
  intervalMinutes: number;
  maxConcurrentJobs: number;
  retryFailedJobs: boolean;
  respectRateLimits: boolean;
  prioritizeBySourcePriority: boolean;
}

export interface SchedulerJob {
  sourceId: number;
  sourceName: string;
  priority: number;
  scheduledAt: Date;
  lastFetchAt?: Date;
  canFetch: boolean;
  rateLimitInfo?: RateLimitInfo;
}

// Search and Query Types
export interface SearchOptions {
  query?: string;
  categories?: string[];
  priorities?: ('breaking' | 'trending' | 'regular')[];
  sources?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  articles: Article[];
  totalCount: number;
  query: string;
  facets?: {
    categories: { [key: string]: number };
    sources: { [key: string]: number };
    priorities: { [key: string]: number };
  };
}

// Audio Generation Types
export interface AudioConfig {
  voiceModel: string;
  speakerVoice: string;
  speed?: number;
  pitch?: number;
  outputFormat?: 'mp3' | 'wav' | 'ogg';
}

export interface AudioGenerationJob {
  id?: number;
  articleId: number;
  audioPath?: string;
  audioUrl?: string;
  durationSeconds?: number;
  voiceModel: string;
  speakerVoice: string;
  generationStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// System Configuration
export interface SystemConfig {
  newsapiDailyLimit: number;
  newsapiRequestsToday: number;
  newsapiLastReset: Date;
  embeddingModel: string;
  similarityThreshold: number;
  maxArticlesPerFetch: number;
  schedulerIntervalMinutes: number;
  enableDeduplication: boolean;
  enableCategorization: boolean;
  enableAudioGeneration: boolean;
}

// Metrics and Analytics
export interface NewsMetrics {
  totalArticles: number;
  articlesLast24h: number;
  articlesLast7d: number;
  duplicatesDetected: number;
  averageFetchTime: number;
  sourceHealthStatus: { [sourceName: string]: 'healthy' | 'degraded' | 'unhealthy' };
  categoryDistribution: { [category: string]: number };
  priorityDistribution: { [priority: string]: number };
  rateLimitStatus: { [source: string]: RateLimitInfo };
}

// Database Connection Types
export interface DatabaseConfig {
  path: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  busyTimeout?: number;
  cacheSize?: number;
}

// Error Types
export class NewsAggregationError extends Error {
  public code: string;
  public source?: string;
  public retryable: boolean;

  constructor(
    message: string,
    code: string,
    source?: string,
    retryable = false
  ) {
    super(message);
    this.name = 'NewsAggregationError';
    this.code = code;
    this.source = source;
    this.retryable = retryable;
  }
}

// Event Types for System Monitoring
export interface NewsEvent {
  type: 'article_fetched' | 'duplicate_detected' | 'classification_completed' | 'audio_generated' | 'error';
  timestamp: Date;
  sourceId?: number;
  sourceName?: string;
  articleId?: number;
  metadata?: any;
  error?: string;
}

// Integration Types
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  retryAttempts?: number;
  timeoutMs?: number;
}

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    recipients: string[];
    smtp: any;
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel?: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl: string;
  };
}

// Export utility types
export type Priority = 'breaking' | 'trending' | 'regular';
export type SourceType = 'newsapi' | 'rss' | 'custom';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export type ComparisonMethod = 'cosine' | 'jaccard' | 'fuzzy';
export type SortBy = 'relevance' | 'date' | 'priority';
export type SortOrder = 'asc' | 'desc';

// Type guards
export const isArticle = (obj: any): obj is Article => {
  return obj && typeof obj.title === 'string' && typeof obj.url === 'string';
};

export const isNewsSource = (obj: any): obj is NewsSourceConfig => {
  return obj && typeof obj.name === 'string' && typeof obj.type === 'string';
};

export const isFetchResult = (obj: any): obj is FetchResult => {
  return obj && typeof obj.success === 'boolean' && Array.isArray(obj.articles);
};

// Constants
export const DEFAULT_CATEGORIES = [
  'general',
  'business',
  'entertainment',
  'health',
  'science',
  'sports',
  'technology',
  'world',
  'politics'
];

export const PRIORITY_WEIGHTS = {
  breaking: 1,
  trending: 2,
  regular: 3
};

export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;
export const DEFAULT_FETCH_TIMEOUT = 30000;
export const DEFAULT_SCHEDULER_INTERVAL = 30; // minutes