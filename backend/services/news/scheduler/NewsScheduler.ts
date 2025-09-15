/**
 * Smart News Scheduler with Rate Limit Management
 * Intelligently schedules news fetching while respecting API limits
 */

import { EventEmitter } from 'events';
import {
  NewsSourceConfig,
  FetchJob,
  SchedulerConfig,
  SchedulerJob,
  RateLimitInfo,
  NewsEvent
} from '../types/NewsTypes';
import { NewsAPISource } from '../sources/NewsAPISource';
import { RSSSource } from '../sources/RSSSource';

interface SchedulerDependencies {
  database: any; // Database connection
  logger?: {
    debug: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  };
}

export class NewsScheduler extends EventEmitter {
  private config: SchedulerConfig;
  private database: any;
  private logger: SchedulerDependencies['logger'];
  private schedulerTimer: NodeJS.Timeout | null = null;
  private runningJobs: Map<number, Promise<void>> = new Map();
  private isRunning = false;
  private sources: Map<number, NewsAPISource | RSSSource> = new Map();
  private rateLimits: Map<string, RateLimitInfo> = new Map();

  // Scheduler statistics
  private stats = {
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    articlesFound: 0,
    duplicatesSkipped: 0,
    lastRunTime: new Date(),
    averageJobTime: 0
  };

  constructor(config: SchedulerConfig, dependencies: SchedulerDependencies) {
    super();

    this.config = {
      intervalMinutes: 30,
      maxConcurrentJobs: 3,
      retryFailedJobs: true,
      respectRateLimits: true,
      prioritizeBySourcePriority: true,
      ...config
    };

    this.database = dependencies.database;
    this.logger = dependencies.logger || console;

    this.initializeSources();
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger?.warn('Scheduler is already running');
      return;
    }

    this.logger?.info('Starting news scheduler', {
      intervalMinutes: this.config.intervalMinutes,
      maxConcurrentJobs: this.config.maxConcurrentJobs
    });

    this.isRunning = true;

    // Run initial fetch
    await this.runScheduledFetch();

    // Set up recurring schedule
    this.schedulerTimer = setInterval(
      () => this.runScheduledFetch(),
      this.config.intervalMinutes * 60 * 1000
    );

    this.emit('started');
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger?.warn('Scheduler is not running');
      return;
    }

    this.logger?.info('Stopping news scheduler');

    this.isRunning = false;

    // Clear the timer
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    // Wait for running jobs to complete
    if (this.runningJobs.size > 0) {
      this.logger?.info(`Waiting for ${this.runningJobs.size} jobs to complete`);
      await Promise.all(this.runningJobs.values());
    }

    this.emit('stopped');
  }

  /**
   * Manually trigger a fetch for all sources or specific sources
   */
  async manualFetch(sourceIds?: number[]): Promise<FetchJob[]> {
    this.logger?.info('Manual fetch triggered', { sourceIds });

    const jobs = await this.createFetchJobs('manual', sourceIds);
    const results = await this.executeFetchJobs(jobs);

    this.emit('manualFetchCompleted', { jobs: results });

    return results;
  }

  /**
   * Get current scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    runningJobs: number;
    nextRunTime?: Date;
    stats: typeof this.stats;
    rateLimits: { [source: string]: RateLimitInfo };
  } {
    const nextRunTime = this.schedulerTimer
      ? new Date(Date.now() + this.config.intervalMinutes * 60 * 1000)
      : undefined;

    return {
      isRunning: this.isRunning,
      runningJobs: this.runningJobs.size,
      nextRunTime,
      stats: { ...this.stats },
      rateLimits: Object.fromEntries(this.rateLimits)
    };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    this.logger?.info('Scheduler configuration updated', {
      oldConfig,
      newConfig: this.config
    });

    // If interval changed and scheduler is running, restart it
    if (oldConfig.intervalMinutes !== this.config.intervalMinutes && this.isRunning) {
      this.restart();
    }
  }

  /**
   * Restart the scheduler
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Main scheduled fetch execution
   */
  private async runScheduledFetch(): Promise<void> {
    if (!this.isRunning) return;

    const startTime = Date.now();

    try {
      this.logger?.info('Starting scheduled news fetch');

      // Create fetch jobs for all eligible sources
      const jobs = await this.createFetchJobs('scheduled');

      if (jobs.length === 0) {
        this.logger?.info('No eligible sources for fetching at this time');
        return;
      }

      // Execute jobs
      const results = await this.executeFetchJobs(jobs);

      // Update statistics
      this.updateStats(results, Date.now() - startTime);

      this.logger?.info('Scheduled fetch completed', {
        totalJobs: results.length,
        successful: results.filter(j => j.status === 'completed').length,
        failed: results.filter(j => j.status === 'failed').length,
        duration: Date.now() - startTime
      });

      this.emit('scheduledFetchCompleted', { jobs: results });

    } catch (error) {
      this.logger?.error('Scheduled fetch failed', error);
      this.emit('scheduledFetchFailed', { error });
    }
  }

  /**
   * Create fetch jobs for eligible sources
   */
  private async createFetchJobs(jobType: 'scheduled' | 'manual', sourceIds?: number[]): Promise<SchedulerJob[]> {
    try {
      // Get active news sources
      const sources = await this.getEligibleSources(sourceIds);

      // Filter sources based on rate limits and last fetch time
      const eligibleSources = await this.filterEligibleSources(sources);

      // Sort by priority if enabled
      if (this.config.prioritizeBySourcePriority) {
        eligibleSources.sort((a, b) => a.priority - b.priority);
      }

      // Create scheduler jobs
      return eligibleSources.map(source => ({
        sourceId: source.id!,
        sourceName: source.name,
        priority: source.priority,
        scheduledAt: new Date(),
        lastFetchAt: source.lastFetchAt,
        canFetch: true,
        rateLimitInfo: this.rateLimits.get(`${source.type}_${source.id}`)
      }));

    } catch (error) {
      this.logger?.error('Failed to create fetch jobs', error);
      return [];
    }
  }

  /**
   * Execute fetch jobs with concurrency control
   */
  private async executeFetchJobs(jobs: SchedulerJob[]): Promise<FetchJob[]> {
    const results: FetchJob[] = [];
    const executing: Promise<void>[] = [];

    for (const job of jobs) {
      // Respect concurrency limit
      if (executing.length >= this.config.maxConcurrentJobs) {
        await Promise.race(executing);
        // Remove completed promises
        for (let i = executing.length - 1; i >= 0; i--) {
          const promise = executing[i];
          const isSettled = await Promise.race([
            promise.then(() => true, () => true),
            Promise.resolve(false)
          ]);
          if (isSettled) {
            executing.splice(i, 1);
          }
        }
      }

      // Start job execution
      const jobPromise = this.executeFetchJob(job).then(result => {
        results.push(result);
      });

      executing.push(jobPromise);
    }

    // Wait for all remaining jobs
    await Promise.all(executing);

    return results;
  }

  /**
   * Execute a single fetch job
   */
  private async executeFetchJob(schedulerJob: SchedulerJob): Promise<FetchJob> {
    const fetchJob: FetchJob = {
      sourceId: schedulerJob.sourceId,
      jobType: 'scheduled',
      status: 'pending',
      articlesFetched: 0,
      articlesNew: 0,
      articlesDuplicates: 0,
      articlesProcessed: 0,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    };

    try {
      // Save job to database
      const jobId = await this.saveJobToDatabase(fetchJob);
      fetchJob.id = jobId;

      // Update status to running
      fetchJob.status = 'running';
      fetchJob.startedAt = new Date();
      await this.updateJobInDatabase(fetchJob);

      this.runningJobs.set(schedulerJob.sourceId, Promise.resolve());

      this.logger?.debug(`Starting fetch job for source ${schedulerJob.sourceName}`);

      // Get news source instance
      const newsSource = this.sources.get(schedulerJob.sourceId);
      if (!newsSource) {
        throw new Error(`News source ${schedulerJob.sourceId} not found`);
      }

      // Fetch articles
      const fetchResult = await newsSource.fetchArticles();

      if (!fetchResult.success) {
        throw new Error(fetchResult.error || 'Fetch failed');
      }

      // Process articles (save to database, check for duplicates, etc.)
      const processResult = await this.processArticles(fetchResult.articles, schedulerJob.sourceId);

      // Update job with results
      fetchJob.status = 'completed';
      fetchJob.completedAt = new Date();
      fetchJob.durationMs = fetchJob.completedAt.getTime() - fetchJob.startedAt!.getTime();
      fetchJob.articlesFetched = fetchResult.articles.length;
      fetchJob.articlesNew = processResult.newArticles;
      fetchJob.articlesDuplicates = processResult.duplicates;
      fetchJob.articlesProcessed = processResult.processed;

      // Update rate limit info if available
      if (fetchResult.rateLimitInfo) {
        fetchJob.rateLimitRemaining = fetchResult.rateLimitInfo.dailyRemaining;
        fetchJob.rateLimitResetAt = fetchResult.rateLimitInfo.resetTime;
        this.rateLimits.set(`newsapi_${schedulerJob.sourceId}`, fetchResult.rateLimitInfo);
      }

      this.logger?.info(`Fetch job completed for ${schedulerJob.sourceName}`, {
        fetched: fetchJob.articlesFetched,
        new: fetchJob.articlesNew,
        duplicates: fetchJob.articlesDuplicates,
        duration: fetchJob.durationMs
      });

      // Update source last fetch time
      await this.updateSourceLastFetch(schedulerJob.sourceId);

    } catch (error) {
      fetchJob.status = 'failed';
      fetchJob.completedAt = new Date();
      fetchJob.errorMessage = error instanceof Error ? error.message : String(error);

      if (fetchJob.startedAt) {
        fetchJob.durationMs = fetchJob.completedAt.getTime() - fetchJob.startedAt.getTime();
      }

      this.logger?.error(`Fetch job failed for ${schedulerJob.sourceName}`, error);

      // Schedule retry if enabled and under retry limit
      if (this.config.retryFailedJobs && fetchJob.retryCount < fetchJob.maxRetries) {
        await this.scheduleRetry(fetchJob);
      }

    } finally {
      // Update job in database
      await this.updateJobInDatabase(fetchJob);

      // Remove from running jobs
      this.runningJobs.delete(schedulerJob.sourceId);

      // Emit event
      const event: NewsEvent = {
        type: fetchJob.status === 'completed' ? 'article_fetched' : 'error',
        timestamp: new Date(),
        sourceId: schedulerJob.sourceId,
        sourceName: schedulerJob.sourceName,
        metadata: {
          articlesFetched: fetchJob.articlesFetched,
          articlesNew: fetchJob.articlesNew,
          duration: fetchJob.durationMs
        },
        error: fetchJob.errorMessage
      };

      this.emit('jobCompleted', { job: fetchJob, event });
    }

    return fetchJob;
  }

  /**
   * Get eligible sources for fetching
   */
  private async getEligibleSources(sourceIds?: number[]): Promise<NewsSourceConfig[]> {
    let query = 'SELECT * FROM news_sources WHERE is_active = 1';
    const params: any[] = [];

    if (sourceIds && sourceIds.length > 0) {
      query += ` AND id IN (${sourceIds.map(() => '?').join(',')})`;
      params.push(...sourceIds);
    }

    query += ' ORDER BY priority ASC, last_fetch_at ASC NULLS FIRST';

    return new Promise((resolve, reject) => {
      this.database.all(query, params, (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Filter sources based on rate limits and timing
   */
  private async filterEligibleSources(sources: NewsSourceConfig[]): Promise<NewsSourceConfig[]> {
    const eligible: NewsSourceConfig[] = [];
    const now = new Date();

    for (const source of sources) {
      let canFetch = true;
      const timeSinceLastFetch = source.lastFetchAt
        ? now.getTime() - source.lastFetchAt.getTime()
        : Infinity;

      // Check minimum interval (don't fetch too frequently)
      const minInterval = Math.max(
        (60 * 60 * 1000) / source.rateLimitPerHour, // Based on rate limit
        5 * 60 * 1000 // Minimum 5 minutes between fetches
      );

      if (timeSinceLastFetch < minInterval) {
        canFetch = false;
        this.logger?.debug(`Source ${source.name} skipped: too recent (${Math.round(timeSinceLastFetch / 60000)}min ago)`);
      }

      // Check rate limits for NewsAPI sources
      if (source.type === 'newsapi' && this.config.respectRateLimits) {
        const rateLimitKey = `newsapi_${source.id}`;
        const rateLimitInfo = this.rateLimits.get(rateLimitKey);

        if (rateLimitInfo && !rateLimitInfo.canMakeRequest) {
          canFetch = false;
          this.logger?.debug(`Source ${source.name} skipped: rate limit exceeded`);
        }
      }

      // Check consecutive errors
      if (source.consecutiveErrors >= 5) {
        canFetch = false;
        this.logger?.debug(`Source ${source.name} skipped: too many consecutive errors (${source.consecutiveErrors})`);
      }

      if (canFetch) {
        eligible.push(source);
      }
    }

    return eligible;
  }

  /**
   * Initialize news source instances
   */
  private async initializeSources(): Promise<void> {
    try {
      const sources = await this.getEligibleSources();

      for (const sourceConfig of sources) {
        if (sourceConfig.type === 'newsapi' && sourceConfig.apiKey) {
          const newsApiSource = new NewsAPISource({
            apiKey: sourceConfig.apiKey,
            dailyLimit: 100,
            requestsPerHour: sourceConfig.rateLimitPerHour
          });

          this.sources.set(sourceConfig.id!, newsApiSource);

        } else if (sourceConfig.type === 'rss') {
          const rssSource = new RSSSource(sourceConfig.url, sourceConfig.name, {
            timeout: 30000,
            maxItems: 50
          });

          this.sources.set(sourceConfig.id!, rssSource);
        }
      }

      this.logger?.info(`Initialized ${this.sources.size} news sources`);

    } catch (error) {
      this.logger?.error('Failed to initialize news sources', error);
    }
  }

  /**
   * Process fetched articles (save, deduplicate, classify)
   */
  private async processArticles(
    articles: any[],
    sourceId: number
  ): Promise<{ newArticles: number; duplicates: number; processed: number }> {
    let newArticles = 0;
    let duplicates = 0;
    let processed = 0;

    for (const article of articles) {
      try {
        // Check if article already exists (by URL hash)
        const existingArticle = await this.findArticleByUrlHash(article.urlHash);

        if (existingArticle) {
          duplicates++;
          continue;
        }

        // Save new article
        await this.saveArticleToDatabase(article, sourceId);
        newArticles++;
        processed++;

        // TODO: Queue for AI processing (categorization, embedding generation)

      } catch (error) {
        this.logger?.warn('Failed to process article', { error, article: article.title });
      }
    }

    return { newArticles, duplicates, processed };
  }

  /**
   * Database helper methods
   */
  private async saveJobToDatabase(job: FetchJob): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO fetch_jobs (
          source_id, job_type, status, articles_fetched, articles_new,
          articles_duplicates, articles_processed, retry_count, max_retries, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.database.run(
        query,
        [
          job.sourceId, job.jobType, job.status, job.articlesFetched,
          job.articlesNew, job.articlesDuplicates, job.articlesProcessed,
          job.retryCount, job.maxRetries, job.createdAt.toISOString()
        ],
        function (this: any, err: any) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  private async updateJobInDatabase(job: FetchJob): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE fetch_jobs SET
          status = ?, started_at = ?, completed_at = ?, duration_ms = ?,
          articles_fetched = ?, articles_new = ?, articles_duplicates = ?,
          articles_processed = ?, error_message = ?, rate_limit_remaining = ?,
          rate_limit_reset_at = ?
        WHERE id = ?
      `;

      this.database.run(
        query,
        [
          job.status,
          job.startedAt?.toISOString(),
          job.completedAt?.toISOString(),
          job.durationMs,
          job.articlesFetched,
          job.articlesNew,
          job.articlesDuplicates,
          job.articlesProcessed,
          job.errorMessage,
          job.rateLimitRemaining,
          job.rateLimitResetAt?.toISOString(),
          job.id
        ],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async findArticleByUrlHash(urlHash: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.database.get(
        'SELECT id FROM articles WHERE url_hash = ?',
        [urlHash],
        (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  private async saveArticleToDatabase(article: any, sourceId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO articles (
          title, description, content, url, url_hash, source_id, source_name,
          author, published_at, category, priority, word_count, reading_time,
          language, image_url, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.database.run(
        query,
        [
          article.title, article.description, article.content, article.url,
          article.urlHash, sourceId, article.sourceName, article.author,
          article.publishedAt.toISOString(), article.category, article.priority,
          article.wordCount, article.readingTime, article.language,
          article.imageUrl, new Date().toISOString()
        ],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async updateSourceLastFetch(sourceId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.run(
        'UPDATE news_sources SET last_fetch_at = ?, consecutive_errors = 0 WHERE id = ?',
        [new Date().toISOString(), sourceId],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async scheduleRetry(job: FetchJob): Promise<void> {
    // Implement retry logic - could use a job queue like Bull or simple setTimeout
    const retryDelay = Math.pow(2, job.retryCount) * 60 * 1000; // Exponential backoff

    setTimeout(async () => {
      job.retryCount++;
      // Re-execute the job
      // This is a simplified version - in production you'd want a proper job queue
    }, retryDelay);
  }

  private updateStats(jobs: FetchJob[], totalDuration: number): void {
    this.stats.totalJobs += jobs.length;
    this.stats.successfulJobs += jobs.filter(j => j.status === 'completed').length;
    this.stats.failedJobs += jobs.filter(j => j.status === 'failed').length;
    this.stats.articlesFound += jobs.reduce((sum, j) => sum + j.articlesFetched, 0);
    this.stats.duplicatesSkipped += jobs.reduce((sum, j) => sum + j.articlesDuplicates, 0);
    this.stats.lastRunTime = new Date();

    // Update average job time
    if (jobs.length > 0) {
      const avgJobTime = totalDuration / jobs.length;
      this.stats.averageJobTime = (this.stats.averageJobTime + avgJobTime) / 2;
    }
  }
}