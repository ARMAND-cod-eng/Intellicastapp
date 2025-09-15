/**
 * Cache Manager - Redis-based caching for AI responses
 * Provides intelligent caching with compression and TTL management
 */

import { createHash } from 'crypto';
import {
  CacheConfig,
  CacheEntry,
  AIResponse,
  SummarizationResult,
  DialogueResult,
  SentimentResult,
  ClassificationResult,
  AIServiceError
} from '../types';

// Redis client type (compatible with both redis and ioredis)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<string>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

export class CacheManager {
  private redis: RedisClient | null = null;
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private hitCounts: Map<string, number> = new Map();

  constructor(config: CacheConfig, redisClient?: RedisClient) {
    this.config = config;

    if (config.provider === 'redis' && redisClient) {
      this.redis = redisClient;
    }
  }

  /**
   * Generate cache key from operation and parameters
   */
  private generateCacheKey(operation: string, params: any): string {
    const normalizedParams = this.normalizeParams(params);
    const paramString = JSON.stringify(normalizedParams);
    const hash = createHash('sha256').update(paramString).digest('hex');

    return `${this.config.keyPrefix}:${operation}:${hash.substring(0, 16)}`;
  }

  /**
   * Normalize parameters for consistent caching
   */
  private normalizeParams(params: any): any {
    if (typeof params === 'string') {
      // For content strings, create a hash if too long
      return params.length > 1000
        ? createHash('md5').update(params).digest('hex')
        : params;
    }

    if (Array.isArray(params)) {
      return params.map(item => this.normalizeParams(item));
    }

    if (params && typeof params === 'object') {
      const normalized: any = {};
      Object.keys(params)
        .sort() // Ensure consistent key ordering
        .forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            normalized[key] = this.normalizeParams(params[key]);
          }
        });
      return normalized;
    }

    return params;
  }

  /**
   * Get cached result
   */
  async get<T = any>(operation: string, params: any): Promise<T | null> {
    try {
      const key = this.generateCacheKey(operation, params);
      let entry: CacheEntry<T> | null = null;

      if (this.config.provider === 'redis' && this.redis) {
        const cached = await this.redis.get(key);
        if (cached) {
          const parsedEntry = JSON.parse(cached) as CacheEntry<T>;
          entry = parsedEntry;
        }
      } else if (this.config.provider === 'memory') {
        const cached = this.memoryCache.get(key) as CacheEntry<T>;
        if (cached && !this.isExpired(cached)) {
          entry = cached;
        } else if (cached && this.isExpired(cached)) {
          this.memoryCache.delete(key);
        }
      }

      if (entry && !this.isExpired(entry)) {
        // Update hit count and access time
        entry.hits++;
        entry.metadata = { ...entry.metadata, lastAccessed: new Date() };

        this.hitCounts.set(key, (this.hitCounts.get(key) || 0) + 1);

        // Update the cache with new metadata
        await this.updateCacheEntry(key, entry);

        return entry.value;
      }

      return null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached result
   */
  async set<T = any>(operation: string, params: any, value: T, customTtl?: number): Promise<void> {
    try {
      const key = this.generateCacheKey(operation, params);
      const ttl = customTtl || this.config.ttl;

      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: new Date(),
        ttl,
        hits: 0,
        metadata: {
          operation,
          paramHash: createHash('md5').update(JSON.stringify(params)).digest('hex'),
          size: JSON.stringify(value).length
        }
      };

      if (this.config.provider === 'redis' && this.redis) {
        const serialized = JSON.stringify(entry);
        await this.redis.setex(key, ttl, serialized);
      } else if (this.config.provider === 'memory') {
        this.memoryCache.set(key, entry);

        // Clean up expired entries periodically
        this.cleanupMemoryCache();
      }
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Update cache entry metadata
   */
  private async updateCacheEntry<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (this.config.provider === 'redis' && this.redis) {
      const ttl = await this.redis.ttl(key);
      if (ttl > 0) {
        const serialized = JSON.stringify(entry);
        await this.redis.setex(key, ttl, serialized);
      }
    } else if (this.config.provider === 'memory') {
      this.memoryCache.set(key, entry);
    }
  }

  /**
   * Delete cached result
   */
  async delete(operation: string, params: any): Promise<void> {
    try {
      const key = this.generateCacheKey(operation, params);

      if (this.config.provider === 'redis' && this.redis) {
        await this.redis.del(key);
      } else if (this.config.provider === 'memory') {
        this.memoryCache.delete(key);
      }

      this.hitCounts.delete(key);
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries for an operation
   */
  async clearOperation(operation: string): Promise<void> {
    try {
      const pattern = `${this.config.keyPrefix}:${operation}:*`;

      if (this.config.provider === 'redis' && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await Promise.all(keys.map(key => this.redis!.del(key)));
        }
      } else if (this.config.provider === 'memory') {
        for (const [key] of this.memoryCache) {
          if (key.includes(`:${operation}:`)) {
            this.memoryCache.delete(key);
            this.hitCounts.delete(key);
          }
        }
      }
    } catch (error) {
      console.warn('Cache clear operation error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      if (this.config.provider === 'redis' && this.redis) {
        const keys = await this.redis.keys(`${this.config.keyPrefix}:*`);
        if (keys.length > 0) {
          await Promise.all(keys.map(key => this.redis!.del(key)));
        }
      } else if (this.config.provider === 'memory') {
        this.memoryCache.clear();
        this.hitCounts.clear();
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    provider: string;
    totalEntries: number;
    totalHits: number;
    hitRate: number;
    memoryUsage?: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    try {
      let totalEntries = 0;
      let totalHits = 0;
      let oldestEntry: Date | undefined;
      let newestEntry: Date | undefined;
      let memoryUsage = 0;

      if (this.config.provider === 'redis' && this.redis) {
        const keys = await this.redis.keys(`${this.config.keyPrefix}:*`);
        totalEntries = keys.length;

        // Sample some entries to get hit statistics
        const sampleKeys = keys.slice(0, Math.min(100, keys.length));
        const samples = await Promise.all(
          sampleKeys.map(async key => {
            const data = await this.redis!.get(key);
            return data ? JSON.parse(data) as CacheEntry : null;
          })
        );

        samples.forEach(entry => {
          if (entry) {
            totalHits += entry.hits;
            const entryDate = new Date(entry.timestamp);
            if (!oldestEntry || entryDate < oldestEntry) oldestEntry = entryDate;
            if (!newestEntry || entryDate > newestEntry) newestEntry = entryDate;
          }
        });

      } else if (this.config.provider === 'memory') {
        totalEntries = this.memoryCache.size;

        for (const [key, entry] of this.memoryCache) {
          totalHits += entry.hits;
          memoryUsage += JSON.stringify(entry).length;

          const entryDate = new Date(entry.timestamp);
          if (!oldestEntry || entryDate < oldestEntry) oldestEntry = entryDate;
          if (!newestEntry || entryDate > newestEntry) newestEntry = entryDate;
        }
      }

      const hitRate = totalEntries > 0 ? totalHits / totalEntries : 0;

      return {
        provider: this.config.provider,
        totalEntries,
        totalHits,
        hitRate,
        memoryUsage: this.config.provider === 'memory' ? memoryUsage : undefined,
        oldestEntry,
        newestEntry
      };

    } catch (error) {
      console.warn('Cache stats error:', error);
      return {
        provider: this.config.provider,
        totalEntries: 0,
        totalHits: 0,
        hitRate: 0
      };
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const entryTime = new Date(entry.timestamp).getTime();
    const ttlMs = entry.ttl * 1000;

    return (now - entryTime) > ttlMs;
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    if (this.config.provider !== 'memory') return;

    // Only cleanup if we have more than 1000 entries
    if (this.memoryCache.size < 1000) return;

    const toDelete: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => {
      this.memoryCache.delete(key);
      this.hitCounts.delete(key);
    });
  }

  /**
   * Specialized cache methods for different AI operations
   */

  async getSummarization(content: string, options: any): Promise<SummarizationResult | null> {
    return this.get<SummarizationResult>('summarize', { content, ...options });
  }

  async setSummarization(content: string, options: any, result: SummarizationResult): Promise<void> {
    return this.set('summarize', { content, ...options }, result);
  }

  async getDialogue(content: string, options: any): Promise<DialogueResult | null> {
    return this.get<DialogueResult>('dialogue', { content, ...options });
  }

  async setDialogue(content: string, options: any, result: DialogueResult): Promise<void> {
    return this.set('dialogue', { content, ...options }, result);
  }

  async getSentiment(content: string, options: any): Promise<SentimentResult | null> {
    return this.get<SentimentResult>('sentiment', { content, ...options });
  }

  async setSentiment(content: string, options: any, result: SentimentResult): Promise<void> {
    // Sentiment analysis results have shorter TTL since content sentiment can change context
    return this.set('sentiment', { content, ...options }, result, Math.floor(this.config.ttl / 2));
  }

  async getClassification(content: string, options: any): Promise<ClassificationResult | null> {
    return this.get<ClassificationResult>('classify', { content, ...options });
  }

  async setClassification(content: string, options: any, result: ClassificationResult): Promise<void> {
    return this.set('classify', { content, ...options }, result);
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      if (this.config.provider === 'redis' && this.redis) {
        // Test Redis connection
        const testKey = `${this.config.keyPrefix}:health:${Date.now()}`;
        await this.redis.set(testKey, 'test');
        const result = await this.redis.get(testKey);
        await this.redis.del(testKey);

        if (result !== 'test') {
          return { status: 'unhealthy', details: 'Redis read/write test failed' };
        }
      }

      const stats = await this.getStats();
      return {
        status: 'healthy',
        details: {
          provider: this.config.provider,
          entries: stats.totalEntries,
          hitRate: stats.hitRate
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
}