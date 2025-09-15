/**
 * AI Service - Main Entry Point
 * Complete AI service abstraction layer with Ollama integration
 */

// Main service classes
export { AIService } from './AIService';
export { AIServiceFactory, createAIService, getAIService, createCustomAIService } from './AIServiceFactory';

// Providers
export { OllamaProvider } from './providers/OllamaProvider';

// Cache management
export { CacheManager } from './cache/CacheManager';

// Utility classes
export { RetryManager, createAIRetryManager, createRateLimitedRetryManager } from './utils/RetryManager';

// Configuration
export { AIServiceConfigManager, defaultAIConfig, createAIConfig, getAIConfigFromEnv } from './config/AIServiceConfig';

// Prompt templates
export { PromptTemplates } from './templates/PromptTemplates';

// Type definitions
export * from './types';

// Re-export commonly used types for convenience
export type {
  IAIProvider,
  AIResponse,
  StreamChunk,
  SummarizationOptions,
  SummarizationResult,
  DialogueOptions,
  DialogueResult,
  SentimentOptions,
  SentimentResult,
  ClassificationOptions,
  ClassificationResult,
  AIServiceConfig,
  GenerationOptions,
  TokenUsage,
  ModelInfo,
  AIServiceError
} from './types';

/**
 * Quick start function - creates a ready-to-use AI service instance
 * with default configuration and common providers
 */
export async function initializeAIService(options: {
  ollamaUrl?: string;
  defaultModel?: string;
  cacheProvider?: 'redis' | 'memory' | 'none';
  redisClient?: any;
  enableMetrics?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
} = {}): Promise<{
  aiService: AIService;
  factory: AIServiceFactory;
  healthCheck: () => Promise<any>;
}> {
  const {
    ollamaUrl = 'http://localhost:11434',
    defaultModel = 'llama3.1:8b',
    cacheProvider = 'memory',
    redisClient,
    enableMetrics = true,
    logLevel = 'info'
  } = options;

  // Create custom configuration
  const customConfig = createAIConfig({
    defaultModel,
    providers: {
      ollama: {
        baseUrl: ollamaUrl,
        defaultModel,
        availableModels: ['llama3.1:8b', 'llama3.1:70b', 'llama2:7b'],
        timeout: 120000,
        maxConcurrentRequests: 3,
        healthCheckInterval: 30000
      }
    },
    cache: {
      provider: cacheProvider,
      ttl: 3600,
      keyPrefix: 'ai_service',
      compression: false,
      encryption: false
    },
    monitoring: {
      enabled: enableMetrics,
      logLevel,
      metricsCollection: enableMetrics
    }
  });

  // Create factory with dependencies
  const factory = AIServiceFactory.create({
    configManager: customConfig,
    redisClient: cacheProvider === 'redis' ? redisClient : undefined,
    logger: createLogger(logLevel)
  });

  // Get the AI service instance
  const aiService = factory.getAIService();

  // Return service with health check function
  return {
    aiService,
    factory,
    healthCheck: () => factory.healthCheck()
  };
}

/**
 * Create a simple logger based on log level
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
 * Example usage and utility functions
 */

/**
 * Create a simple AI service for basic operations
 */
export async function createBasicAIService(ollamaUrl?: string): Promise<AIService> {
  const { aiService } = await initializeAIService({
    ollamaUrl,
    cacheProvider: 'memory',
    enableMetrics: false,
    logLevel: 'warn'
  });
  return aiService;
}

/**
 * Create a production-ready AI service with Redis caching
 */
export async function createProductionAIService(
  redisClient: any,
  ollamaUrl?: string
): Promise<AIService> {
  const { aiService } = await initializeAIService({
    ollamaUrl,
    cacheProvider: 'redis',
    redisClient,
    enableMetrics: true,
    logLevel: 'info'
  });
  return aiService;
}

/**
 * Convenience function for testing - creates service with minimal setup
 */
export async function createTestAIService(): Promise<AIService> {
  const { aiService } = await initializeAIService({
    cacheProvider: 'none',
    enableMetrics: false,
    logLevel: 'error'
  });
  return aiService;
}

/**
 * Health check utilities
 */
export async function checkAIServiceHealth(service: AIService): Promise<boolean> {
  try {
    const providerInfo = await service.getProviderInfo();
    return providerInfo.available;
  } catch (error) {
    console.error('AI Service health check failed:', error);
    return false;
  }
}

/**
 * Default export - factory class for advanced usage
 */
export default AIServiceFactory;

/**
 * Version and build info
 */
export const AI_SERVICE_VERSION = '1.0.0';
export const SUPPORTED_MODELS = [
  'llama3.1:8b',
  'llama3.1:70b',
  'llama2:7b',
  'llama2:13b',
  'codellama:7b',
  'mistral:7b',
  'neural-chat:7b'
];

/**
 * Example usage patterns
 */
export const examples = {
  basicUsage: `
// Basic usage
import { initializeAIService } from './ai';

const { aiService } = await initializeAIService();

// Summarize content
const summary = await aiService.summarizeContent(
  "Your content here...",
  { type: 'brief', maxLength: 100 }
);

// Generate dialogue
const dialogue = await aiService.generateDialogue(
  "Content to turn into dialogue...",
  {
    speakers: [
      { id: 'host', name: 'Host', role: 'interviewer', personality: 'friendly', expertise: ['general'], speakingStyle: 'casual' },
      { id: 'expert', name: 'Expert', role: 'guest', personality: 'knowledgeable', expertise: ['AI'], speakingStyle: 'professional' }
    ],
    style: 'educational'
  }
);
  `,

  streamingUsage: `
// Streaming responses
for await (const chunk of aiService.streamSummarization(content, options)) {
  process.stdout.write(chunk);
}
  `,

  healthCheck: `
// Health monitoring
const { healthCheck } = await initializeAIService();
const health = await healthCheck();
console.log('AI Service Status:', health.status);
  `
};