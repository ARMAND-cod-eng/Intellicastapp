/**
 * AI Service Configuration
 * Centralized configuration management for the AI service layer
 */

import { AIServiceConfig, CacheConfig, RetryConfig, OllamaConfig } from '../types';

// Default configuration values - Optimized for high-quality content generation
const DEFAULT_AI_CONFIG: AIServiceConfig = {
  defaultModel: 'qwen2.5:7b', // Primary model for superior analytical capabilities
  providers: {
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:7b', // Force Qwen for quality
      availableModels: [
        'qwen2.5:7b',        // Primary: Exceptional analytical and summarization capabilities
        'llama3.1:8b',       // Fallback: Good general performance
        'llama3.1:70b',      // Large model option
        'llama2:7b',
        'llama2:13b',
        'codellama:7b',
        'mistral:7b',
        'neural-chat:7b'
      ],
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '120000'),
      maxConcurrentRequests: parseInt(process.env.OLLAMA_MAX_CONCURRENT || '3'),
      healthCheckInterval: parseInt(process.env.OLLAMA_HEALTH_CHECK_INTERVAL || '30000')
    }
  },
  cache: {
    provider: (process.env.CACHE_PROVIDER as 'redis' | 'memory' | 'none') || 'memory',
    ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour default
    keyPrefix: process.env.CACHE_KEY_PREFIX || 'ai_service',
    compression: process.env.CACHE_COMPRESSION === 'true',
    encryption: process.env.CACHE_ENCRYPTION === 'true'
  },
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
    baseDelay: parseInt(process.env.RETRY_BASE_DELAY || '1000'),
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '30000'),
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMIT',
      'TEMPORARY_FAILURE',
      'OLLAMA_API_ERROR',
      'CONNECTION_ERROR'
    ],
    timeout: parseInt(process.env.OPERATION_TIMEOUT || '120000')
  },
  rateLimit: {
    requests: parseInt(process.env.RATE_LIMIT_REQUESTS || '60'),
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000') // 1 minute
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    metricsCollection: process.env.METRICS_COLLECTION !== 'false'
  }
};

export class AIServiceConfigManager {
  private config: AIServiceConfig;
  private configPath?: string;

  constructor(customConfig?: Partial<AIServiceConfig>, configPath?: string) {
    this.configPath = configPath;
    this.config = this.mergeConfig(DEFAULT_AI_CONFIG, customConfig);
    this.validateConfig();
  }

  /**
   * Get the current configuration
   */
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  /**
   * Get Ollama provider configuration
   */
  getOllamaConfig(): OllamaConfig {
    return { ...this.config.providers.ollama };
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(): CacheConfig {
    return { ...this.config.cache };
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.config.retry };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<AIServiceConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.validateConfig();
  }

  /**
   * Load configuration from environment variables
   */
  static fromEnvironment(): AIServiceConfigManager {
    return new AIServiceConfigManager();
  }

  /**
   * Load configuration from file
   */
  static async fromFile(filePath: string): Promise<AIServiceConfigManager> {
    try {
      const fs = await import('fs/promises');
      const configData = await fs.readFile(filePath, 'utf-8');
      const customConfig = JSON.parse(configData);
      return new AIServiceConfigManager(customConfig, filePath);
    } catch (error) {
      console.warn(`Failed to load config from ${filePath}:`, error);
      return new AIServiceConfigManager(undefined, filePath);
    }
  }

  /**
   * Save current configuration to file
   */
  async saveToFile(filePath?: string): Promise<void> {
    const targetPath = filePath || this.configPath;
    if (!targetPath) {
      throw new Error('No file path specified for saving configuration');
    }

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(targetPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config to ${targetPath}: ${error}`);
    }
  }

  /**
   * Get configuration for specific operations
   */
  getOperationConfig(operation: 'summarize' | 'dialogue' | 'sentiment' | 'classify') {
    const baseConfig = {
      model: this.config.defaultModel,
      cache: this.config.cache,
      retry: this.config.retry
    };

    // Operation-specific overrides - Optimized for Qwen model performance
    const operationDefaults = {
      summarize: {
        model: 'qwen2.5:7b',  // Force Qwen for superior summarization quality
        temperature: 0.2,     // Ultra-low for maximum precision and consistency
        maxTokens: 1600,      // Increased for comprehensive high-quality summaries
        cacheTtl: this.config.cache.ttl * 2  // Longer cache for expensive high-quality summaries
      },
      dialogue: {
        temperature: 0.8,
        maxTokens: 4096,
        cacheTtl: this.config.cache.ttl * 2 // Longer cache for dialogues
      },
      sentiment: {
        temperature: 0.2,
        maxTokens: 512,
        cacheTtl: Math.floor(this.config.cache.ttl / 2) // Shorter cache for sentiment
      },
      classify: {
        temperature: 0.1,
        maxTokens: 512,
        cacheTtl: this.config.cache.ttl
      }
    };

    return {
      ...baseConfig,
      ...operationDefaults[operation]
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Validate Ollama config
    if (!this.config.providers.ollama.baseUrl) {
      errors.push('Ollama baseUrl is required');
    }

    if (!this.config.providers.ollama.defaultModel) {
      errors.push('Ollama defaultModel is required');
    }

    if (this.config.providers.ollama.timeout < 1000) {
      errors.push('Ollama timeout must be at least 1000ms');
    }

    // Validate cache config
    if (!['redis', 'memory', 'none'].includes(this.config.cache.provider)) {
      errors.push('Cache provider must be redis, memory, or none');
    }

    if (this.config.cache.ttl < 60) {
      errors.push('Cache TTL must be at least 60 seconds');
    }

    // Validate retry config
    if (this.config.retry.maxAttempts < 1 || this.config.retry.maxAttempts > 10) {
      errors.push('Retry maxAttempts must be between 1 and 10');
    }

    if (this.config.retry.baseDelay < 100) {
      errors.push('Retry baseDelay must be at least 100ms');
    }

    if (this.config.retry.maxDelay < this.config.retry.baseDelay) {
      errors.push('Retry maxDelay must be greater than baseDelay');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(base: AIServiceConfig, override?: Partial<AIServiceConfig>): AIServiceConfig {
    if (!override) return { ...base };

    const merged = { ...base };

    // Handle nested objects
    if (override.providers) {
      merged.providers = {
        ...base.providers,
        ...override.providers,
        ollama: {
          ...base.providers.ollama,
          ...override.providers.ollama
        }
      };
    }

    if (override.cache) {
      merged.cache = {
        ...base.cache,
        ...override.cache
      };
    }

    if (override.retry) {
      merged.retry = {
        ...base.retry,
        ...override.retry
      };
    }

    if (override.rateLimit) {
      merged.rateLimit = {
        ...base.rateLimit,
        ...override.rateLimit
      };
    }

    if (override.monitoring) {
      merged.monitoring = {
        ...base.monitoring,
        ...override.monitoring
      };
    }

    // Handle primitive properties
    if (override.defaultModel) merged.defaultModel = override.defaultModel;

    return merged;
  }

  /**
   * Get environment-specific configuration
   */
  static getEnvironmentConfig(): Partial<AIServiceConfig> {
    const env = process.env.NODE_ENV || 'development';

    const envConfigs = {
      development: {
        monitoring: {
          enabled: true,
          logLevel: 'debug' as const,
          metricsCollection: true
        },
        cache: {
          provider: 'memory' as const,
          ttl: 1800 // 30 minutes
        }
      },
      production: {
        monitoring: {
          enabled: true,
          logLevel: 'warn' as const,
          metricsCollection: true
        },
        cache: {
          provider: 'redis' as const,
          ttl: 3600 // 1 hour
        },
        retry: {
          maxAttempts: 5
        }
      },
      test: {
        monitoring: {
          enabled: false,
          logLevel: 'error' as const,
          metricsCollection: false
        },
        cache: {
          provider: 'none' as const
        },
        retry: {
          maxAttempts: 1,
          baseDelay: 100
        }
      }
    };

    return envConfigs[env as keyof typeof envConfigs] || envConfigs.development;
  }

  /**
   * Health check for configuration
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      // Validate current config
      this.validateConfig();

      // Check if Ollama is accessible
      const ollamaUrl = this.config.providers.ollama.baseUrl;
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return {
          status: 'unhealthy',
          details: `Ollama not accessible at ${ollamaUrl}`
        };
      }

      return {
        status: 'healthy',
        details: {
          ollamaUrl,
          cacheProvider: this.config.cache.provider,
          defaultModel: this.config.defaultModel
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get configuration summary for logging/debugging
   */
  getConfigSummary(): any {
    return {
      defaultModel: this.config.defaultModel,
      ollama: {
        baseUrl: this.config.providers.ollama.baseUrl,
        model: this.config.providers.ollama.defaultModel,
        timeout: this.config.providers.ollama.timeout
      },
      cache: {
        provider: this.config.cache.provider,
        ttl: this.config.cache.ttl
      },
      retry: {
        maxAttempts: this.config.retry.maxAttempts,
        timeout: this.config.retry.timeout
      },
      monitoring: {
        enabled: this.config.monitoring?.enabled,
        logLevel: this.config.monitoring?.logLevel
      }
    };
  }
}

// Export singleton instance
export const defaultAIConfig = AIServiceConfigManager.fromEnvironment();

// Export utility functions
export function createAIConfig(overrides?: Partial<AIServiceConfig>): AIServiceConfigManager {
  const envConfig = AIServiceConfigManager.getEnvironmentConfig();
  return new AIServiceConfigManager({ ...envConfig, ...overrides });
}

export function getAIConfigFromEnv(): AIServiceConfig {
  return defaultAIConfig.getConfig();
}