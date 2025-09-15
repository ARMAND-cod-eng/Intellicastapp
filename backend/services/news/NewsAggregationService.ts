/**
 * Main News Aggregation Service
 * Orchestrates all news aggregation components and provides unified API
 */

import { EventEmitter } from 'events';
import sqlite3 from 'sqlite3';
import path from 'path';

// Service imports
import { NewsScheduler } from './scheduler/NewsScheduler';
import { DeduplicationService } from './processing/DeduplicationService';
import { ClassificationService } from './processing/ClassificationService';
import { PriorityService } from './processing/PriorityService';
import { SearchService } from './search/SearchService';
import { NewsCronJob } from './cron/NewsCronJob';
import { NewsAPISource } from './sources/NewsAPISource';
import { RSSSource } from './sources/RSSSource';

// Type imports
import {
  NewsSourceConfig,
  Article,
  SearchOptions,
  SearchResult,
  NewsMetrics,
  DatabaseConfig,
  SystemConfig
} from './types/NewsTypes';

interface NewsAggregationConfig {
  database: DatabaseConfig;
  newsApi: {
    apiKey: string;
    dailyLimit: number;
  };
  scheduler: {
    intervalMinutes: number;
    maxConcurrentJobs: number;
    enableProcessing: boolean;
  };
  processing: {
    enableDeduplication: boolean;
    enableClassification: boolean;
    enablePriority: boolean;
    similarityThreshold: number;
  };
  cron: {
    enabled: boolean;
    timezone: string;
  };
}

export class NewsAggregationService extends EventEmitter {
  private config: NewsAggregationConfig;
  private database: sqlite3.Database;
  private logger: any;

  // Core services
  private scheduler: NewsScheduler;
  private deduplicationService: DeduplicationService;
  private classificationService: ClassificationService;
  private priorityService: PriorityService;
  private searchService: SearchService;
  private cronJob: NewsCronJob;

  private isInitialized = false;
  private isShuttingDown = false;

  constructor(config: NewsAggregationConfig, logger?: any) {
    super();

    this.config = config;
    this.logger = logger || console;

    // Initialize database
    this.database = new sqlite3.Database(
      this.config.database.path,
      (err) => {
        if (err) {
          this.logger.error('Failed to open database', err);
          throw err;
        } else {
          this.logger.info('Database connected successfully');
        }
      }
    );

    // Configure database
    if (this.config.database.enableWAL) {
      this.database.run('PRAGMA journal_mode = WAL');
    }

    if (this.config.database.enableForeignKeys) {
      this.database.run('PRAGMA foreign_keys = ON');
    }

    if (this.config.database.busyTimeout) {
      this.database.run(`PRAGMA busy_timeout = ${this.config.database.busyTimeout}`);
    }
  }

  /**
   * Initialize the news aggregation service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('News aggregation service already initialized');
      return;
    }

    try {
      this.logger.info('Initializing news aggregation service');

      // Initialize database schema
      await this.initializeDatabase();

      // Initialize services
      await this.initializeServices();

      // Start cron jobs if enabled
      if (this.config.cron.enabled) {
        this.cronJob.start();
      }

      this.isInitialized = true;

      this.logger.info('News aggregation service initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize news aggregation service', error);
      throw error;
    }
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Service is already shutting down');
      return;
    }

    this.isShuttingDown = true;

    try {
      this.logger.info('Shutting down news aggregation service');

      // Stop cron jobs
      if (this.cronJob) {
        this.cronJob.stop();
      }

      // Stop scheduler
      if (this.scheduler) {
        await this.scheduler.stop();
      }

      // Close database
      await new Promise<void>((resolve, reject) => {
        this.database.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      this.logger.info('News aggregation service shut down successfully');
      this.emit('shutdown');

    } catch (error) {
      this.logger.error('Error during service shutdown', error);
      throw error;
    }
  }

  /**
   * News fetching methods
   */
  async fetchNews(): Promise<{
    jobsExecuted: number;
    articlesFound: number;
    newArticles: number;
    duplicates: number;
  }> {
    this.ensureInitialized();

    const results = await this.scheduler.manualFetch();

    const totals = results.reduce(
      (acc, job) => ({
        jobsExecuted: acc.jobsExecuted + 1,
        articlesFound: acc.articlesFound + job.articlesFetched,
        newArticles: acc.newArticles + job.articlesNew,
        duplicates: acc.duplicates + job.articlesDuplicates
      }),
      { jobsExecuted: 0, articlesFound: 0, newArticles: 0, duplicates: 0 }
    );

    this.emit('newsFetched', totals);
    return totals;
  }

  /**
   * Article processing methods
   */
  async processArticles(articleIds?: number[]): Promise<{
    deduplication: any;
    classification: any;
    priority: any;
  }> {
    this.ensureInitialized();

    const results = await Promise.all([
      this.config.processing.enableDeduplication
        ? this.deduplicationService.processArticles(articleIds)
        : Promise.resolve({}),
      this.config.processing.enableClassification
        ? this.classificationService.processArticles(articleIds)
        : Promise.resolve({}),
      this.config.processing.enablePriority
        ? this.priorityService.processArticles(articleIds)
        : Promise.resolve({})
    ]);

    const processedResults = {
      deduplication: results[0],
      classification: results[1],
      priority: results[2]
    };

    this.emit('articlesProcessed', processedResults);
    return processedResults;
  }

  /**
   * Search methods
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    this.ensureInitialized();

    return this.searchService.search(options);
  }

  async findSimilarArticles(articleId: number, limit = 10): Promise<Article[]> {
    this.ensureInitialized();

    return this.searchService.findSimilar(articleId, limit);
  }

  async getSuggestions(partial: string, limit = 10): Promise<string[]> {
    this.ensureInitialized();

    return this.searchService.getSuggestions(partial, limit);
  }

  /**
   * Article management methods
   */
  async getArticle(id: number): Promise<Article | null> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.database.get(
        'SELECT * FROM articles WHERE id = ?',
        [id],
        (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  async getArticles(options: {
    limit?: number;
    offset?: number;
    category?: string;
    priority?: string;
    source?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}): Promise<{ articles: Article[]; total: number }> {
    this.ensureInitialized();

    const {
      limit = 20,
      offset = 0,
      category,
      priority,
      source,
      fromDate,
      toDate
    } = options;

    // Build query
    const conditions: string[] = ['is_duplicate = 0'];
    const params: any[] = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (priority) {
      conditions.push('priority = ?');
      params.push(priority);
    }

    if (source) {
      conditions.push('source_name = ?');
      params.push(source);
    }

    if (fromDate) {
      conditions.push('published_at >= ?');
      params.push(fromDate.toISOString());
    }

    if (toDate) {
      conditions.push('published_at <= ?');
      params.push(toDate.toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get articles
    const articlesQuery = `
      SELECT * FROM articles
      ${whereClause}
      ORDER BY priority ASC, published_at DESC
      LIMIT ? OFFSET ?
    `;

    const articles = await new Promise<any[]>((resolve, reject) => {
      this.database.all(
        articlesQuery,
        [...params, limit, offset],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM articles ${whereClause}`;

    const total = await new Promise<number>((resolve, reject) => {
      this.database.get(countQuery, params, (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row?.total || 0);
      });
    });

    return { articles, total };
  }

  async getBreakingNews(limit = 10): Promise<Article[]> {
    return this.getArticlesByPriority('breaking', limit);
  }

  async getTrendingNews(limit = 20): Promise<Article[]> {
    return this.getArticlesByPriority('trending', limit);
  }

  private async getArticlesByPriority(priority: string, limit: number): Promise<Article[]> {
    return new Promise((resolve, reject) => {
      this.database.all(
        'SELECT * FROM articles WHERE priority = ? AND is_duplicate = 0 ORDER BY published_at DESC LIMIT ?',
        [priority, limit],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Source management methods
   */
  async getSources(): Promise<NewsSourceConfig[]> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.database.all(
        'SELECT * FROM news_sources ORDER BY priority ASC',
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async addSource(source: Omit<NewsSourceConfig, 'id'>): Promise<number> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.database.run(
        `INSERT INTO news_sources
         (name, type, url, api_key, category, country, language, priority, rate_limit_per_hour, config_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          source.name, source.type, source.url, source.apiKey || null,
          source.category, source.country || null, source.language,
          source.priority, source.rateLimitPerHour, JSON.stringify(source.configJson || {})
        ],
        function (this: any, err: any) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async updateSource(id: number, updates: Partial<NewsSourceConfig>): Promise<void> {
    this.ensureInitialized();

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(key === 'configJson' ? JSON.stringify(value) : value);
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    return new Promise((resolve, reject) => {
      this.database.run(
        `UPDATE news_sources SET ${fields.join(', ')} WHERE id = ?`,
        values,
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async deleteSource(id: number): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.database.run(
        'DELETE FROM news_sources WHERE id = ?',
        [id],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Statistics and monitoring methods
   */
  async getMetrics(): Promise<NewsMetrics> {
    this.ensureInitialized();

    const metrics: Partial<NewsMetrics> = {};

    // Get basic counts
    const counts = await new Promise<any>((resolve, reject) => {
      this.database.get(`
        SELECT
          COUNT(*) as totalArticles,
          COUNT(CASE WHEN fetched_at > datetime('now', '-1 day') THEN 1 END) as articlesLast24h,
          COUNT(CASE WHEN fetched_at > datetime('now', '-7 days') THEN 1 END) as articlesLast7d,
          COUNT(CASE WHEN is_duplicate = 1 THEN 1 END) as duplicatesDetected
        FROM articles
      `, (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    metrics.totalArticles = counts.totalArticles;
    metrics.articlesLast24h = counts.articlesLast24h;
    metrics.articlesLast7d = counts.articlesLast7d;
    metrics.duplicatesDetected = counts.duplicatesDetected;

    // Get category distribution
    const categoryDist = await new Promise<any[]>((resolve, reject) => {
      this.database.all(
        'SELECT category, COUNT(*) as count FROM articles WHERE is_duplicate = 0 GROUP BY category',
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    metrics.categoryDistribution = {};
    categoryDist.forEach(row => {
      metrics.categoryDistribution![row.category] = row.count;
    });

    // Get priority distribution
    const priorityDist = await new Promise<any[]>((resolve, reject) => {
      this.database.all(
        'SELECT priority, COUNT(*) as count FROM articles WHERE is_duplicate = 0 GROUP BY priority',
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    metrics.priorityDistribution = {};
    priorityDist.forEach(row => {
      metrics.priorityDistribution![row.priority] = row.count;
    });

    // Get average fetch time (mock for now)
    metrics.averageFetchTime = 2500; // ms

    // Get source health status
    metrics.sourceHealthStatus = {};
    const sources = await this.getSources();
    sources.forEach(source => {
      if (source.consecutiveErrors > 5) {
        metrics.sourceHealthStatus![source.name] = 'unhealthy';
      } else if (source.consecutiveErrors > 2) {
        metrics.sourceHealthStatus![source.name] = 'degraded';
      } else {
        metrics.sourceHealthStatus![source.name] = 'healthy';
      }
    });

    // Mock rate limit status
    metrics.rateLimitStatus = {};

    return metrics as NewsMetrics;
  }

  async getSystemConfig(): Promise<SystemConfig> {
    this.ensureInitialized();

    const configRows = await new Promise<any[]>((resolve, reject) => {
      this.database.all(
        'SELECT key, value FROM system_config',
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const config: any = {};
    configRows.forEach(row => {
      let value = row.value;
      // Try to parse numeric values
      if (!isNaN(value)) {
        value = parseFloat(value);
      } else if (value === 'true' || value === 'false') {
        value = value === 'true';
      }
      config[row.key] = value;
    });

    return config;
  }

  async updateSystemConfig(key: string, value: any): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.database.run(
        'INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, ?)',
        [key, String(value), new Date().toISOString()],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Service status methods
   */
  getStatus(): {
    initialized: boolean;
    scheduler: any;
    cronJob: any;
    database: 'connected' | 'disconnected';
  } {
    return {
      initialized: this.isInitialized,
      scheduler: this.scheduler ? this.scheduler.getStatus() : null,
      cronJob: this.cronJob ? this.cronJob.getStatus() : null,
      database: this.database ? 'connected' : 'disconnected'
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: { [service: string]: any };
  }> {
    const services: { [service: string]: any } = {};

    // Check database
    try {
      await new Promise<void>((resolve, reject) => {
        this.database.get('SELECT 1', (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      services.database = { status: 'healthy' };
    } catch (error) {
      services.database = { status: 'unhealthy', error: error instanceof Error ? error.message : String(error) };
    }

    // Check scheduler
    if (this.scheduler) {
      const schedulerStatus = this.scheduler.getStatus();
      services.scheduler = {
        status: schedulerStatus.isRunning ? 'healthy' : 'unhealthy',
        details: schedulerStatus
      };
    }

    // Check cron jobs
    if (this.cronJob) {
      const cronStatus = this.cronJob.getHealthStatus();
      services.cronJob = cronStatus;
    }

    // Determine overall status
    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy');
    const degradedServices = Object.values(services).filter(s => s.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return { status: overallStatus, services };
  }

  /**
   * Private helper methods
   */
  private async initializeDatabase(): Promise<void> {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const fs = require('fs').promises;

    try {
      const schema = await fs.readFile(schemaPath, 'utf-8');
      const statements = schema.split(';').filter(stmt => stmt.trim());

      for (const statement of statements) {
        await new Promise<void>((resolve, reject) => {
          this.database.run(statement, (err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      this.logger.info('Database schema initialized');
    } catch (error) {
      this.logger.error('Failed to initialize database schema', error);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    // Initialize scheduler
    this.scheduler = new NewsScheduler(
      {
        intervalMinutes: this.config.scheduler.intervalMinutes,
        maxConcurrentJobs: this.config.scheduler.maxConcurrentJobs,
        retryFailedJobs: true,
        respectRateLimits: true,
        prioritizeBySourcePriority: true
      },
      {
        database: this.database,
        logger: this.logger
      }
    );

    // Initialize processing services
    this.deduplicationService = new DeduplicationService(
      this.database,
      undefined, // Use mock embedding API
      {
        similarityThreshold: this.config.processing.similarityThreshold
      },
      this.logger
    );

    this.classificationService = new ClassificationService(
      this.database,
      undefined, // Use mock BERT API
      {},
      this.logger
    );

    this.priorityService = new PriorityService(
      this.database,
      {},
      this.logger
    );

    // Initialize search service
    this.searchService = new SearchService(
      this.database,
      {},
      this.logger
    );

    // Initialize cron job
    this.cronJob = new NewsCronJob(
      this.database,
      this.scheduler,
      this.deduplicationService,
      this.classificationService,
      this.priorityService,
      {
        fetchIntervalMinutes: this.config.scheduler.intervalMinutes,
        enableProcessing: this.config.scheduler.enableProcessing,
        timezone: this.config.cron.timezone
      },
      this.logger
    );

    this.logger.info('All services initialized');
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('News aggregation service not initialized');
    }

    if (this.isShuttingDown) {
      throw new Error('News aggregation service is shutting down');
    }
  }
}

/**
 * Factory function to create and configure the news aggregation service
 */
export async function createNewsAggregationService(
  config: NewsAggregationConfig,
  logger?: any
): Promise<NewsAggregationService> {
  const service = new NewsAggregationService(config, logger);
  await service.initialize();
  return service;
}

/**
 * Default configuration for the news aggregation service
 */
export const defaultConfig: NewsAggregationConfig = {
  database: {
    path: './data/news.db',
    enableWAL: true,
    enableForeignKeys: true,
    busyTimeout: 5000
  },
  newsApi: {
    apiKey: process.env.NEWS_API_KEY || '',
    dailyLimit: 100
  },
  scheduler: {
    intervalMinutes: 30,
    maxConcurrentJobs: 3,
    enableProcessing: true
  },
  processing: {
    enableDeduplication: true,
    enableClassification: true,
    enablePriority: true,
    similarityThreshold: 0.85
  },
  cron: {
    enabled: true,
    timezone: 'UTC'
  }
};