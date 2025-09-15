/**
 * AI Service Type Definitions
 * Comprehensive type system for AI service abstraction layer
 */

// Base AI Provider Interface
export interface IAIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateResponse(prompt: string, options?: GenerationOptions): Promise<AIResponse>;
  generateStreamResponse(prompt: string, options?: GenerationOptions): AsyncGenerator<StreamChunk, void, unknown>;
  getModelInfo(): Promise<ModelInfo>;
}

// Generation Options
export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  stream?: boolean;
  systemPrompt?: string;
  context?: string[];
  stopSequences?: string[];
  seed?: number;
  timeout?: number;
  retryAttempts?: number;
}

// AI Response Types
export interface AIResponse {
  content: string;
  model: string;
  usage?: TokenUsage;
  finishReason?: 'stop' | 'length' | 'error' | 'timeout';
  metadata?: Record<string, any>;
  cached?: boolean;
  responseTime?: number;
  timestamp: Date;
}

export interface StreamChunk {
  content: string;
  finished: boolean;
  model?: string;
  usage?: Partial<TokenUsage>;
  metadata?: Record<string, any>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelInfo {
  name: string;
  size: string;
  description?: string;
  capabilities: string[];
  contextLength: number;
  available: boolean;
}

// Service-Specific Types
export interface SummarizationOptions extends GenerationOptions {
  type: 'brief' | 'detailed' | 'bullet-points';
  maxLength?: number;
  includeKeyPoints?: boolean;
  focusAreas?: string[];
}

export interface SummarizationResult {
  summary: string;
  keyPoints?: string[];
  wordCount: number;
  originalLength: number;
  compressionRatio: number;
  confidence: number;
  type: 'brief' | 'detailed' | 'bullet-points';
  metadata?: {
    topicCoverage: string[];
    sentiment?: SentimentResult;
    readingTime: number;
  };
}

export interface DialogueOptions extends GenerationOptions {
  speakers: SpeakerProfile[];
  style: 'casual' | 'professional' | 'educational' | 'entertaining';
  duration?: number; // target duration in minutes
  includeIntroduction?: boolean;
  includeConclusion?: boolean;
  segments?: DialogueSegment[];
}

export interface SpeakerProfile {
  id: string;
  name: string;
  role: string;
  personality: string;
  expertise: string[];
  speakingStyle: string;
  voiceCharacteristics?: {
    tone: string;
    pace: string;
    formality: string;
  };
}

export interface DialogueSegment {
  type: 'introduction' | 'main-content' | 'transition' | 'conclusion';
  topic: string;
  duration?: number;
  keyPoints?: string[];
}

export interface DialogueResult {
  dialogue: DialogueExchange[];
  speakers: SpeakerProfile[];
  metadata: {
    totalDuration: number;
    wordCount: number;
    speakerBalance: Record<string, number>;
    topicCoverage: string[];
    style: string;
  };
  script: string; // formatted script for TTS
}

export interface DialogueExchange {
  speaker: string;
  content: string;
  timestamp?: number;
  emotion?: string;
  notes?: string;
}

export interface SentimentOptions extends GenerationOptions {
  aspects?: string[]; // specific aspects to analyze
  includeEmotions?: boolean;
  includeConfidence?: boolean;
}

export interface SentimentResult {
  overall: SentimentScore;
  aspects?: Record<string, SentimentScore>;
  emotions?: EmotionScore[];
  confidence: number;
  reasoning?: string;
}

export interface SentimentScore {
  label: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  intensity: 'low' | 'medium' | 'high';
}

export interface EmotionScore {
  emotion: string;
  intensity: number; // 0 to 1
  confidence: number;
}

export interface ClassificationOptions extends GenerationOptions {
  categories: string[] | 'auto';
  maxCategories?: number;
  includeConfidence?: boolean;
  hierarchical?: boolean;
}

export interface ClassificationResult {
  categories: CategoryMatch[];
  primaryCategory: string;
  confidence: number;
  reasoning?: string;
  hierarchicalPath?: string[];
}

export interface CategoryMatch {
  category: string;
  confidence: number;
  relevance: number;
  keywords?: string[];
}

// Cache Types
export interface CacheConfig {
  provider: 'redis' | 'memory' | 'none';
  ttl: number; // time to live in seconds
  keyPrefix: string;
  compression?: boolean;
  encryption?: boolean;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: Date;
  ttl: number;
  hits: number;
  metadata?: Record<string, any>;
}

// Error Types
export class AIServiceError extends Error {
  public code: string;
  public provider?: string;
  public retryable: boolean;
  public originalError?: Error;

  constructor(
    message: string,
    code: string,
    provider?: string,
    retryable = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.provider = provider;
    this.retryable = retryable;
    this.originalError = originalError;
  }
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  timeout: number;
}

// Configuration Types
export interface AIServiceConfig {
  defaultModel: string;
  providers: {
    ollama: OllamaConfig;
  };
  cache: CacheConfig;
  retry: RetryConfig;
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
  monitoring?: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsCollection: boolean;
  };
}

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  availableModels: string[];
  timeout: number;
  maxConcurrentRequests: number;
  healthCheckInterval: number;
}

// Metrics and Monitoring
export interface AIMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
  tokenUsage: TokenUsage;
  modelUsage: Record<string, number>;
  errorBreakdown: Record<string, number>;
}

export interface PerformanceMetrics {
  timestamp: Date;
  operation: string;
  model: string;
  responseTime: number;
  tokenCount: number;
  cacheHit: boolean;
  success: boolean;
  errorCode?: string;
}

// Utility Types
export type AIOperation = 'summarize' | 'dialogue' | 'sentiment' | 'classify' | 'generate';

export type PromptTemplate = {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  modelOptimized: string[];
  examples?: PromptExample[];
};

export type PromptExample = {
  input: Record<string, any>;
  expectedOutput: string;
  description?: string;
};

// Event Types for Monitoring
export interface AIServiceEvent {
  type: 'request' | 'response' | 'error' | 'cache_hit' | 'cache_miss';
  timestamp: Date;
  operation: AIOperation;
  model: string;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
}

// Type Guards
export const isStreamChunk = (obj: any): obj is StreamChunk => {
  return obj && typeof obj.content === 'string' && typeof obj.finished === 'boolean';
};

export const isAIResponse = (obj: any): obj is AIResponse => {
  return obj && typeof obj.content === 'string' && obj.timestamp instanceof Date;
};

export const isAIServiceError = (error: any): error is AIServiceError => {
  return error instanceof AIServiceError;
};