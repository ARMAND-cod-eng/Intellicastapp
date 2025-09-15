/**
 * AI Service Factory
 * Main entry point for creating and configuring AI service instances
 */

import { AIService } from './AIService';
import { OllamaProvider } from './providers/OllamaProvider';
import { CacheManager } from './cache/CacheManager';
import { RetryManager, createAIRetryManager } from './utils/RetryManager';
import { AIServiceConfigManager, defaultAIConfig } from './config/AIServiceConfig';
import {
  IAIProvider,
  AIServiceConfig,
  AIServiceError,
  AIMetrics,
  PerformanceMetrics,
  AIServiceEvent
} from './types';

interface ServiceDependencies {
  redisClient?: any; // Redis client instance
  configManager?: AIServiceConfigManager;
  logger?: {
    debug: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  };
}

export class AIServiceFactory {
  private static instance: AIServiceFactory;
  private configManager: AIServiceConfigManager;
  private provider: IAIProvider | null = null;
  private cacheManager: CacheManager | null = null;
  private retryManager: RetryManager | null = null;
  private aiService: AIService | null = null;
  private logger: ServiceDependencies['logger'];
  private metrics: AIMetrics;
  private eventListeners: Map<string, Function[]> = new Map();

  private constructor(dependencies: ServiceDependencies = {}) {
    this.configManager = dependencies.configManager || defaultAIConfig;
    this.logger = dependencies.logger || console;
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      modelUsage: {},
      errorBreakdown: {}
    };

    this.initializeServices(dependencies);
  }

  /**
   * Get singleton instance
   */
  static getInstance(dependencies?: ServiceDependencies): AIServiceFactory {
    if (!AIServiceFactory.instance) {
      AIServiceFactory.instance = new AIServiceFactory(dependencies);
    }
    return AIServiceFactory.instance;
  }

  /**
   * Create a new AI service factory (non-singleton)
   */
  static create(dependencies?: ServiceDependencies): AIServiceFactory {
    return new AIServiceFactory(dependencies);
  }

  /**
   * Initialize all service components
   */
  private async initializeServices(dependencies: ServiceDependencies): Promise<void> {
    try {
      const config = this.configManager.getConfig();

      // Initialize provider
      this.provider = new OllamaProvider(
        config.providers.ollama.baseUrl,
        config.providers.ollama.defaultModel,
        config.providers.ollama.timeout
      );

      // Initialize cache manager
      this.cacheManager = new CacheManager(
        config.cache,
        dependencies.redisClient
      );

      // Initialize retry manager
      this.retryManager = createAIRetryManager(config.retry);

      // Create AI service with instrumentation
      this.aiService = this.createInstrumentedAIService();

      this.logger?.info('AI Service Factory initialized successfully', {
        provider: this.provider.name,
        cacheProvider: config.cache.provider,
        defaultModel: config.defaultModel
      });

    } catch (error) {
      this.logger?.error('Failed to initialize AI Service Factory', error);
      throw new AIServiceError(
        'AI Service Factory initialization failed',
        'INITIALIZATION_FAILED',
        'factory',
        false,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the main AI service instance
   */
  getAIService(): AIService {
    if (!this.aiService) {
      throw new AIServiceError(
        'AI service not initialized',
        'SERVICE_NOT_INITIALIZED',
        'factory',
        false
      );
    }
    return this.aiService;
  }

  /**
   * Get the Ollama provider instance
   */
  getProvider(): IAIProvider {
    if (!this.provider) {
      throw new AIServiceError(
        'Provider not initialized',
        'PROVIDER_NOT_INITIALIZED',
        'factory',
        false
      );
    }
    return this.provider;
  }

  /**
   * Get the cache manager instance
   */
  getCacheManager(): CacheManager {
    if (!this.cacheManager) {
      throw new AIServiceError(
        'Cache manager not initialized',
        'CACHE_NOT_INITIALIZED',
        'factory',
        false
      );
    }
    return this.cacheManager;
  }

  /**
   * Create an instrumented AI service with caching and retry logic
   */
  private createInstrumentedAIService(): AIService {
    if (!this.provider || !this.cacheManager || !this.retryManager) {
      throw new AIServiceError(
        'Required services not initialized',
        'SERVICES_NOT_INITIALIZED',
        'factory',
        false
      );
    }

    const baseService = new AIService(this.provider);

    // Wrap methods with caching and retry logic
    return this.wrapServiceMethods(baseService);
  }

  /**
   * Wrap AI service methods with instrumentation, caching, and retry logic
   */
  private wrapServiceMethods(service: AIService): AIService {
    const instrumentedService = Object.create(service);

    // Wrap summarizeContent
    instrumentedService.summarizeContent = async (content: string, options: any) => {
      return this.executeWithInstrumentation(
        'summarize',
        { content, ...options },
        async () => {
          // Check cache first
          const cached = await this.cacheManager!.getSummarization(content, options);
          if (cached) {
            this.emitEvent('cache_hit', 'summarize', { cached: true });
            return cached;
          }

          // Execute with retry
          const result = await this.retryManager!.execute(() =>
            service.summarizeContent(content, options)
          );

          // Cache result
          await this.cacheManager!.setSummarization(content, options, result);
          this.emitEvent('cache_miss', 'summarize', { cached: false });

          return result;
        }
      );
    };

    // Wrap generateDialogue
    instrumentedService.generateDialogue = async (content: string, options: any) => {
      return this.executeWithInstrumentation(
        'dialogue',
        { content, ...options },
        async () => {
          const cached = await this.cacheManager!.getDialogue(content, options);
          if (cached) {
            this.emitEvent('cache_hit', 'dialogue', { cached: true });
            return cached;
          }

          const result = await this.retryManager!.execute(() =>
            service.generateDialogue(content, options)
          );

          await this.cacheManager!.setDialogue(content, options, result);
          this.emitEvent('cache_miss', 'dialogue', { cached: false });

          return result;
        }
      );
    };

    // Wrap analyzeSentiment
    instrumentedService.analyzeSentiment = async (content: string, options: any = {}) => {
      return this.executeWithInstrumentation(
        'sentiment',
        { content, ...options },
        async () => {
          const cached = await this.cacheManager!.getSentiment(content, options);
          if (cached) {
            this.emitEvent('cache_hit', 'sentiment', { cached: true });
            return cached;
          }

          const result = await this.retryManager!.execute(() =>
            service.analyzeSentiment(content, options)
          );

          await this.cacheManager!.setSentiment(content, options, result);
          this.emitEvent('cache_miss', 'sentiment', { cached: false });

          return result;
        }
      );
    };

    // Wrap classifyContent
    instrumentedService.classifyContent = async (content: string, options: any) => {
      return this.executeWithInstrumentation(
        'classify',
        { content, ...options },
        async () => {
          const cached = await this.cacheManager!.getClassification(content, options);
          if (cached) {
            this.emitEvent('cache_hit', 'classify', { cached: true });
            return cached;
          }

          const result = await this.retryManager!.execute(() =>
            service.classifyContent(content, options)
          );

          await this.cacheManager!.setClassification(content, options, result);
          this.emitEvent('cache_miss', 'classify', { cached: false });

          return result;
        }
      );
    };

    // Copy other methods without instrumentation
    instrumentedService.streamSummarization = service.streamSummarization.bind(service);
    instrumentedService.getProviderInfo = service.getProviderInfo.bind(service);

    return instrumentedService;
  }

  /**
   * Execute operation with performance monitoring and error tracking
   */
  private async executeWithInstrumentation<T>(
    operation: string,
    params: any,
    executor: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      this.metrics.requestCount++;
      this.emitEvent('request', operation, { params });

      const result = await executor();

      const duration = Date.now() - startTime;
      this.updateResponseTimeMetrics(duration);
      this.emitEvent('response', operation, { success: true, duration });

      this.logger?.debug(`${operation} completed in ${duration}ms`);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.errorCount++;

      const errorCode = error instanceof AIServiceError ? error.code : 'UNKNOWN_ERROR';
      this.metrics.errorBreakdown[errorCode] = (this.metrics.errorBreakdown[errorCode] || 0) + 1;

      this.emitEvent('error', operation, { error: errorCode, duration });
      this.logger?.error(`${operation} failed after ${duration}ms:`, error);

      throw error;
    }
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(duration: number): void {
    const totalRequests = this.metrics.requestCount;
    const currentAvg = this.metrics.averageResponseTime;
    this.metrics.averageResponseTime = ((currentAvg * (totalRequests - 1)) + duration) / totalRequests;
  }

  /**
   * Event system for monitoring and hooks
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(type: string, operation: string, metadata?: any): void {
    const event: AIServiceEvent = {
      type: type as any,
      timestamp: new Date(),
      operation: operation as any,
      model: this.configManager.getConfig().defaultModel,
      success: type !== 'error',
      metadata
    };

    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        this.logger?.warn('Event listener error:', error);
      }
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): AIMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      modelUsage: {},
      errorBreakdown: {}
    };
  }

  /**
   * Comprehensive health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, { status: 'healthy' | 'unhealthy'; details?: any }>;
    metrics?: AIMetrics;
  }> {
    const services: Record<string, any> = {};

    // Check configuration
    try {
      services.config = await this.configManager.healthCheck();
    } catch (error) {
      services.config = { status: 'unhealthy', details: error };
    }

    // Check provider
    try {
      if (this.provider) {
        const available = await this.provider.isAvailable();
        services.provider = {
          status: available ? 'healthy' : 'unhealthy',
          details: { name: this.provider.name, available }
        };
      }
    } catch (error) {
      services.provider = { status: 'unhealthy', details: error };
    }

    // Check cache
    try {
      if (this.cacheManager) {
        services.cache = await this.cacheManager.healthCheck();
      }
    } catch (error) {
      services.cache = { status: 'unhealthy', details: error };
    }

    const allHealthy = Object.values(services).every(
      service => service.status === 'healthy'
    );

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
      metrics: this.getMetrics()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger?.info('Shutting down AI Service Factory');

    try {
      // Clear caches if needed
      if (this.cacheManager) {
        // Optionally clear cache on shutdown
        // await this.cacheManager.clear();
      }

      // Clear event listeners
      this.eventListeners.clear();

      this.logger?.info('AI Service Factory shutdown completed');

    } catch (error) {
      this.logger?.error('Error during AI Service Factory shutdown:', error);
      throw error;
    }
  }
}

// Convenience functions for common usage patterns

/**
 * Create and initialize AI service with default configuration
 */
export async function createAIService(dependencies?: ServiceDependencies): Promise<AIService> {
  const factory = AIServiceFactory.create(dependencies);
  return factory.getAIService();
}

/**
 * Get singleton AI service instance
 */
export function getAIService(dependencies?: ServiceDependencies): AIService {
  return AIServiceFactory.getInstance(dependencies).getAIService();
}

/**
 * Create AI service with custom configuration
 */
export async function createCustomAIService(
  config: Partial<AIServiceConfig>,
  dependencies?: ServiceDependencies
): Promise<AIService> {
  const configManager = new AIServiceConfigManager(config);
  const factory = AIServiceFactory.create({
    ...dependencies,
    configManager
  });
  return factory.getAIService();
}

// Export the main factory class and convenience functions
export default AIServiceFactory;