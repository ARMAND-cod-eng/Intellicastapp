/**
 * Retry Manager - Handles retry logic with exponential backoff
 * Provides intelligent retry mechanisms for AI service operations
 */

import { RetryConfig, AIServiceError } from '../types';

interface RetryContext {
  attempt: number;
  startTime: number;
  lastError?: Error;
  totalDelay: number;
}

interface RetryOperation<T> {
  operation: () => Promise<T>;
  context?: any;
  customConfig?: Partial<RetryConfig>;
}

export class RetryManager {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT',
        'RATE_LIMIT',
        'TEMPORARY_FAILURE',
        'OLLAMA_API_ERROR'
      ],
      timeout: 120000,
      ...config
    };
  }

  /**
   * Execute operation with retry logic
   */
  async execute<T>(operation: () => Promise<T>, customConfig?: Partial<RetryConfig>): Promise<T> {
    const config = { ...this.config, ...customConfig };
    const context: RetryContext = {
      attempt: 0,
      startTime: Date.now(),
      totalDelay: 0
    };

    while (context.attempt < config.maxAttempts) {
      context.attempt++;

      try {
        // Set up timeout for the operation
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new AIServiceError(
              `Operation timed out after ${config.timeout}ms`,
              'TIMEOUT',
              undefined,
              true
            ));
          }, config.timeout);
        });

        // Execute the operation with timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);

        // Log successful retry if we had previous failures
        if (context.attempt > 1) {
          console.log(`Operation succeeded on attempt ${context.attempt}/${config.maxAttempts}`);
        }

        return result;

      } catch (error) {
        context.lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        const isRetryable = this.isRetryableError(context.lastError, config);
        const hasAttemptsLeft = context.attempt < config.maxAttempts;

        if (!isRetryable || !hasAttemptsLeft) {
          // Log final failure
          console.error(`Operation failed after ${context.attempt} attempts:`, context.lastError.message);
          throw this.createFinalError(context, config);
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(context.attempt, config);
        context.totalDelay += delay;

        console.warn(`Attempt ${context.attempt}/${config.maxAttempts} failed: ${context.lastError.message}. Retrying in ${delay}ms...`);

        // Wait before retry
        await this.delay(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw this.createFinalError(context, config);
  }

  /**
   * Execute multiple operations with retry, with optional concurrency limit
   */
  async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    concurrency = 3,
    customConfig?: Partial<RetryConfig>
  ): Promise<Array<T | Error>> {
    const results: Array<T | Error> = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      const executeWithRetry = async (index: number) => {
        try {
          const result = await this.execute(operation, customConfig);
          results[index] = result;
        } catch (error) {
          results[index] = error instanceof Error ? error : new Error(String(error));
        }
      };

      const promise = executeWithRetry(i);
      executing.push(promise);

      // Limit concurrency
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        for (let j = executing.length - 1; j >= 0; j--) {
          const isSettled = await Promise.race([
            executing[j].then(() => true),
            Promise.resolve(false)
          ]);
          if (isSettled) {
            executing.splice(j, 1);
          }
        }
      }
    }

    // Wait for all remaining operations to complete
    await Promise.all(executing);

    return results;
  }

  /**
   * Circuit breaker functionality
   */
  createCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold?: number;
      resetTimeout?: number;
      monitoringPeriod?: number;
    } = {}
  ): () => Promise<T> {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitoringPeriod = 60000
    } = options;

    let state: 'closed' | 'open' | 'half-open' = 'closed';
    let failureCount = 0;
    let lastFailureTime = 0;
    let successCount = 0;

    return async (): Promise<T> => {
      const now = Date.now();

      // Reset failure count if monitoring period has passed
      if (now - lastFailureTime > monitoringPeriod) {
        failureCount = 0;
        successCount = 0;
      }

      // Check circuit breaker state
      switch (state) {
        case 'open':
          if (now - lastFailureTime < resetTimeout) {
            throw new AIServiceError(
              'Circuit breaker is OPEN. Service temporarily unavailable.',
              'CIRCUIT_BREAKER_OPEN',
              undefined,
              true
            );
          }
          state = 'half-open';
          break;

        case 'half-open':
          // In half-open state, allow one request through
          break;

        case 'closed':
          // Normal operation
          break;
      }

      try {
        const result = await this.execute(operation);

        // Success - update state
        successCount++;
        if (state === 'half-open') {
          state = 'closed';
          failureCount = 0;
        }

        return result;

      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        // Check if we should open the circuit
        if (failureCount >= failureThreshold) {
          state = 'open';
          console.warn(`Circuit breaker opened after ${failureCount} failures`);
        }

        throw error;
      }
    };
  }

  /**
   * Check if error is retryable based on error type and configuration
   */
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    if (error instanceof AIServiceError) {
      return error.retryable && config.retryableErrors.includes(error.code);
    }

    // Check for common retryable error patterns
    const errorMessage = error.message.toLowerCase();
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'econnreset',
      'enotfound',
      'rate limit',
      'too many requests',
      'service unavailable',
      'internal server error'
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Calculate delay for next retry attempt using exponential backoff with jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);

    // Add jitter (±25% of the delay)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    const delayWithJitter = exponentialDelay + jitter;

    // Cap at maxDelay
    return Math.min(delayWithJitter, config.maxDelay);
  }

  /**
   * Create a delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create final error after all retries have been exhausted
   */
  private createFinalError(context: RetryContext, config: RetryConfig): AIServiceError {
    const totalTime = Date.now() - context.startTime;

    return new AIServiceError(
      `Operation failed after ${context.attempt} attempts over ${totalTime}ms. Last error: ${context.lastError?.message || 'Unknown error'}`,
      'MAX_RETRIES_EXCEEDED',
      undefined,
      false,
      context.lastError
    );
  }

  /**
   * Get retry statistics and health metrics
   */
  getStats(): {
    config: RetryConfig;
    uptime: number;
  } {
    return {
      config: this.config,
      uptime: Date.now()
    };
  }

  /**
   * Update retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Utility functions for common retry patterns
 */

/**
 * Create a retry manager with default configuration for AI operations
 */
export function createAIRetryManager(overrides?: Partial<RetryConfig>): RetryManager {
  const defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMIT',
      'TEMPORARY_FAILURE',
      'OLLAMA_API_ERROR',
      'CONNECTION_ERROR'
    ],
    timeout: 120000
  };

  return new RetryManager({ ...defaultConfig, ...overrides });
}

/**
 * Decorator for automatically adding retry logic to methods
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  retryManager: RetryManager,
  customConfig?: Partial<RetryConfig>
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      return retryManager.execute(
        () => originalMethod.apply(this, args),
        customConfig
      );
    };

    return descriptor;
  };
}

/**
 * Create a rate-limited retry manager
 */
export function createRateLimitedRetryManager(
  requestsPerSecond: number,
  overrides?: Partial<RetryConfig>
): RetryManager {
  const rateLimitConfig: Partial<RetryConfig> = {
    baseDelay: Math.ceil(1000 / requestsPerSecond),
    maxAttempts: 5,
    retryableErrors: [
      'RATE_LIMIT',
      'TOO_MANY_REQUESTS',
      ...overrides?.retryableErrors || []
    ]
  };

  return new RetryManager({ ...rateLimitConfig, ...overrides });
}