/**
 * News Aggregation Cron Job System
 * Automated news fetching every 30 minutes with intelligent rate limiting
 */

import { CronJob } from 'cron';
import { NewsScheduler } from '../scheduler/NewsScheduler';
import { DeduplicationService } from '../processing/DeduplicationService';
import { ClassificationService } from '../processing/ClassificationService';
import { PriorityService } from '../processing/PriorityService';
import { NewsEvent } from '../types/NewsTypes';

interface CronConfig {
  fetchIntervalMinutes: number;
  processingDelayMinutes: number;
  maintenanceHour: number; // Hour of day for maintenance (0-23)
  enableProcessing: boolean;
  enableMaintenance: boolean;
  maxConcurrentJobs: number;
  timezone: string;
}

interface JobStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunTime: Date;
  lastRunDuration: number;
  articlesProcessed: number;
  averageArticlesPerRun: number;
  nextRunTime: Date;
}

export class NewsCronJob {
  private config: CronConfig;
  private database: any;
  private logger: any;

  // Service instances
  private scheduler: NewsScheduler;
  private deduplicationService: DeduplicationService;
  private classificationService: ClassificationService;
  private priorityService: PriorityService;

  // Cron jobs
  private fetchJob: CronJob | null = null;
  private processingJob: CronJob | null = null;
  private maintenanceJob: CronJob | null = null;

  // Statistics
  private stats: JobStats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    lastRunTime: new Date(),
    lastRunDuration: 0,
    articlesProcessed: 0,
    averageArticlesPerRun: 0,
    nextRunTime: new Date()
  };

  private isRunning = false;
  private currentJobs = new Set<string>();

  constructor(
    database: any,
    scheduler: NewsScheduler,
    deduplicationService: DeduplicationService,
    classificationService: ClassificationService,
    priorityService: PriorityService,
    config?: Partial<CronConfig>,
    logger?: any
  ) {
    this.database = database;
    this.scheduler = scheduler;
    this.deduplicationService = deduplicationService;
    this.classificationService = classificationService;
    this.priorityService = priorityService;
    this.logger = logger || console;

    this.config = {
      fetchIntervalMinutes: 30,
      processingDelayMinutes: 5, // Wait 5 minutes after fetch to process
      maintenanceHour: 3, // 3 AM maintenance
      enableProcessing: true,
      enableMaintenance: true,
      maxConcurrentJobs: 1,
      timezone: 'UTC',
      ...config
    };

    this.initializeCronJobs();
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Cron jobs are already running');
      return;
    }

    this.logger.info('Starting news aggregation cron jobs', {
      fetchInterval: `${this.config.fetchIntervalMinutes} minutes`,
      processingDelay: `${this.config.processingDelayMinutes} minutes`,
      maintenanceHour: `${this.config.maintenanceHour}:00`,
      timezone: this.config.timezone
    });

    // Start fetch job
    if (this.fetchJob) {
      this.fetchJob.start();
      this.updateNextRunTime();
    }

    // Start processing job
    if (this.processingJob && this.config.enableProcessing) {
      this.processingJob.start();
    }

    // Start maintenance job
    if (this.maintenanceJob && this.config.enableMaintenance) {
      this.maintenanceJob.start();
    }

    this.isRunning = true;
    this.logger.info('News cron jobs started successfully');
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Cron jobs are not running');
      return;
    }

    this.logger.info('Stopping news aggregation cron jobs');

    // Stop all jobs
    if (this.fetchJob) {
      this.fetchJob.stop();
    }

    if (this.processingJob) {
      this.processingJob.stop();
    }

    if (this.maintenanceJob) {
      this.maintenanceJob.stop();
    }

    // Wait for any running jobs to complete
    if (this.currentJobs.size > 0) {
      this.logger.info(`Waiting for ${this.currentJobs.size} jobs to complete...`);
      // In a real implementation, you'd wait for the jobs to finish
    }

    this.isRunning = false;
    this.logger.info('News cron jobs stopped');
  }

  /**
   * Get current status and statistics
   */
  getStatus(): {
    isRunning: boolean;
    currentJobs: string[];
    stats: JobStats;
    config: CronConfig;
    nextJobs: {
      fetch?: string;
      processing?: string;
      maintenance?: string;
    };
  } {
    const nextJobs: any = {};

    if (this.fetchJob) {
      nextJobs.fetch = this.fetchJob.nextDates(1)[0]?.toISO() || 'Not scheduled';
    }

    if (this.processingJob) {
      nextJobs.processing = this.processingJob.nextDates(1)[0]?.toISO() || 'Not scheduled';
    }

    if (this.maintenanceJob) {
      nextJobs.maintenance = this.maintenanceJob.nextDates(1)[0]?.toISO() || 'Not scheduled';
    }

    return {
      isRunning: this.isRunning,
      currentJobs: Array.from(this.currentJobs),
      stats: { ...this.stats },
      config: { ...this.config },
      nextJobs
    };
  }

  /**
   * Manually trigger a fetch job
   */
  async triggerFetch(): Promise<void> {
    if (this.currentJobs.has('fetch')) {
      throw new Error('Fetch job is already running');
    }

    this.logger.info('Manually triggering news fetch');
    await this.runFetchJob();
  }

  /**
   * Manually trigger processing
   */
  async triggerProcessing(): Promise<void> {
    if (this.currentJobs.has('processing')) {
      throw new Error('Processing job is already running');
    }

    this.logger.info('Manually triggering article processing');
    await this.runProcessingJob();
  }

  /**
   * Manually trigger maintenance
   */
  async triggerMaintenance(): Promise<void> {
    if (this.currentJobs.has('maintenance')) {
      throw new Error('Maintenance job is already running');
    }

    this.logger.info('Manually triggering maintenance');
    await this.runMaintenanceJob();
  }

  /**
   * Update configuration and restart if needed
   */
  updateConfig(newConfig: Partial<CronConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    this.logger.info('Updating cron configuration', {
      oldConfig,
      newConfig: this.config
    });

    // If timing changed and jobs are running, restart them
    if (this.isRunning && (
      oldConfig.fetchIntervalMinutes !== this.config.fetchIntervalMinutes ||
      oldConfig.processingDelayMinutes !== this.config.processingDelayMinutes ||
      oldConfig.maintenanceHour !== this.config.maintenanceHour
    )) {
      this.restart();
    }
  }

  /**
   * Restart all cron jobs
   */
  restart(): void {
    this.stop();
    this.initializeCronJobs();
    this.start();
  }

  /**
   * Initialize cron job instances
   */
  private initializeCronJobs(): void {
    // Main fetch job - every N minutes
    const fetchCronPattern = `0 */${this.config.fetchIntervalMinutes} * * * *`;

    this.fetchJob = new CronJob(
      fetchCronPattern,
      () => this.runFetchJob(),
      null,
      false,
      this.config.timezone
    );

    // Processing job - runs N minutes after fetch
    const processingCronPattern = `0 ${this.config.processingDelayMinutes},${35 + this.config.processingDelayMinutes} * * * *`;

    this.processingJob = new CronJob(
      processingCronPattern,
      () => this.runProcessingJob(),
      null,
      false,
      this.config.timezone
    );

    // Daily maintenance job - runs at specified hour
    const maintenanceCronPattern = `0 0 ${this.config.maintenanceHour} * * *`;

    this.maintenanceJob = new CronJob(
      maintenanceCronPattern,
      () => this.runMaintenanceJob(),
      null,
      false,
      this.config.timezone
    );

    this.logger.debug('Cron jobs initialized', {
      fetchPattern: fetchCronPattern,
      processingPattern: processingCronPattern,
      maintenancePattern: maintenanceCronPattern
    });
  }

  /**
   * Run the main fetch job
   */
  private async runFetchJob(): Promise<void> {
    if (this.currentJobs.has('fetch')) {
      this.logger.warn('Fetch job already running, skipping');
      return;
    }

    const jobId = 'fetch';
    const startTime = Date.now();

    try {
      this.currentJobs.add(jobId);
      this.stats.totalRuns++;

      this.logger.info('Starting scheduled news fetch');

      // Run the scheduled fetch
      const fetchResults = await this.scheduler.runScheduledFetch();

      // Update statistics
      const duration = Date.now() - startTime;
      this.updateStats(true, duration, fetchResults.length);

      this.logger.info('Scheduled news fetch completed', {
        jobsExecuted: fetchResults.length,
        duration: `${duration}ms`
      });

      // Emit event
      this.emitEvent({
        type: 'article_fetched',
        timestamp: new Date(),
        metadata: {
          jobType: 'scheduled',
          jobsExecuted: fetchResults.length,
          duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateStats(false, duration, 0);

      this.logger.error('Scheduled news fetch failed', error);

      // Emit error event
      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          jobType: 'fetch',
          duration
        }
      });

    } finally {
      this.currentJobs.delete(jobId);
      this.updateNextRunTime();
    }
  }

  /**
   * Run article processing (deduplication, classification, priority)
   */
  private async runProcessingJob(): Promise<void> {
    if (!this.config.enableProcessing) return;

    if (this.currentJobs.has('processing')) {
      this.logger.warn('Processing job already running, skipping');
      return;
    }

    const jobId = 'processing';
    const startTime = Date.now();

    try {
      this.currentJobs.add(jobId);

      this.logger.info('Starting article processing');

      // Get recently fetched articles that need processing
      const recentArticles = await this.getRecentUnprocessedArticles();

      if (recentArticles.length === 0) {
        this.logger.info('No articles to process');
        return;
      }

      const articleIds = recentArticles.map(a => a.id);

      // Step 1: Deduplication
      this.logger.debug('Running deduplication');
      const deduplicationResult = await this.deduplicationService.processArticles(articleIds);

      // Step 2: Classification
      this.logger.debug('Running classification');
      const classificationResult = await this.classificationService.processArticles(articleIds);

      // Step 3: Priority assignment
      this.logger.debug('Running priority assignment');
      const priorityResult = await this.priorityService.processArticles(articleIds);

      // Mark articles as processed
      await this.markArticlesAsProcessed(articleIds);

      const duration = Date.now() - startTime;

      this.logger.info('Article processing completed', {
        articlesProcessed: recentArticles.length,
        duplicatesFound: deduplicationResult.duplicatesFound,
        classified: classificationResult.classified,
        priorityChanges: priorityResult.priorityChanges.length,
        duration: `${duration}ms`
      });

      // Emit event
      this.emitEvent({
        type: 'article_fetched',
        timestamp: new Date(),
        metadata: {
          jobType: 'processing',
          articlesProcessed: recentArticles.length,
          duplicatesFound: deduplicationResult.duplicatesFound,
          classified: classificationResult.classified,
          duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Article processing failed', error);

      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          jobType: 'processing',
          duration
        }
      });

    } finally {
      this.currentJobs.delete(jobId);
    }
  }

  /**
   * Run daily maintenance tasks
   */
  private async runMaintenanceJob(): Promise<void> {
    if (!this.config.enableMaintenance) return;

    if (this.currentJobs.has('maintenance')) {
      this.logger.warn('Maintenance job already running, skipping');
      return;
    }

    const jobId = 'maintenance';
    const startTime = Date.now();

    try {
      this.currentJobs.add(jobId);

      this.logger.info('Starting daily maintenance');

      // 1. Clean up old articles (older than 30 days)
      const cleanupResult = await this.cleanupOldArticles(30);

      // 2. Update source statistics
      await this.updateSourceStatistics();

      // 3. Demote stale breaking news
      const demotedBreaking = await this.priorityService.demoteStaleBreaking(24);

      // 4. Run priority maintenance
      const priorityMaintenance = await this.priorityService.runMaintenance();

      // 5. Reset daily counters
      await this.resetDailyCounters();

      // 6. Vacuum database (SQLite optimization)
      await this.vacuumDatabase();

      const duration = Date.now() - startTime;

      this.logger.info('Daily maintenance completed', {
        articlesDeleted: cleanupResult.deleted,
        demotedBreaking,
        priorityUpdates: priorityMaintenance.updated,
        duration: `${duration}ms`
      });

      // Emit event
      this.emitEvent({
        type: 'article_fetched',
        timestamp: new Date(),
        metadata: {
          jobType: 'maintenance',
          articlesDeleted: cleanupResult.deleted,
          demotedBreaking,
          duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Daily maintenance failed', error);

      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          jobType: 'maintenance',
          duration
        }
      });

    } finally {
      this.currentJobs.delete(jobId);
    }
  }

  /**
   * Helper methods
   */
  private updateStats(success: boolean, duration: number, articlesCount: number): void {
    if (success) {
      this.stats.successfulRuns++;
    } else {
      this.stats.failedRuns++;
    }

    this.stats.lastRunTime = new Date();
    this.stats.lastRunDuration = duration;
    this.stats.articlesProcessed += articlesCount;

    if (this.stats.totalRuns > 0) {
      this.stats.averageArticlesPerRun = this.stats.articlesProcessed / this.stats.totalRuns;
    }
  }

  private updateNextRunTime(): void {
    if (this.fetchJob && this.isRunning) {
      const nextDate = this.fetchJob.nextDates(1)[0];
      if (nextDate) {
        this.stats.nextRunTime = nextDate.toJSDate();
      }
    }
  }

  private async getRecentUnprocessedArticles(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - 60 * 60 * 1000); // Last hour

      this.database.all(
        'SELECT id FROM articles WHERE is_processed = 0 AND fetched_at > ? ORDER BY fetched_at DESC LIMIT 500',
        [cutoffTime.toISOString()],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  private async markArticlesAsProcessed(articleIds: number[]): Promise<void> {
    if (articleIds.length === 0) return;

    return new Promise((resolve, reject) => {
      const placeholders = articleIds.map(() => '?').join(',');
      this.database.run(
        `UPDATE articles SET is_processed = 1, updated_at = ? WHERE id IN (${placeholders})`,
        [new Date().toISOString(), ...articleIds],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async cleanupOldArticles(daysOld: number): Promise<{ deleted: number }> {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      this.database.run(
        'DELETE FROM articles WHERE published_at < ?',
        [cutoffDate.toISOString()],
        function (this: any, err: any) {
          if (err) reject(err);
          else resolve({ deleted: this.changes });
        }
      );
    });
  }

  private async updateSourceStatistics(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Reset daily fetch counts if it's a new day
      const query = `
        UPDATE news_sources SET
          fetch_count_today = 0,
          consecutive_errors = CASE
            WHEN last_error_at IS NULL OR last_error_at < datetime('now', '-1 day')
            THEN 0
            ELSE consecutive_errors
          END
        WHERE DATE(last_fetch_at) < DATE('now')
      `;

      this.database.run(query, [], (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async resetDailyCounters(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.run(
        'UPDATE system_config SET value = "0", updated_at = ? WHERE key = "newsapi_requests_today"',
        [new Date().toISOString()],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async vacuumDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.run('VACUUM', [], (err: any) => {
        if (err) {
          this.logger.warn('Database vacuum failed', err);
          resolve(); // Don't fail maintenance for this
        } else {
          this.logger.debug('Database vacuum completed');
          resolve();
        }
      });
    });
  }

  private emitEvent(event: NewsEvent): void {
    // In a real implementation, this would emit events to an event system
    // For now, just log the event
    this.logger.debug('News event emitted', event);
  }

  /**
   * Get historical job execution data
   */
  async getJobHistory(limit = 50): Promise<Array<{
    timestamp: Date;
    jobType: string;
    status: string;
    duration: number;
    articlesProcessed?: number;
    error?: string;
  }>> {
    // This would require a job history table in a real implementation
    return [];
  }

  /**
   * Get health status of the cron system
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  } {
    const now = Date.now();
    const lastRunAge = now - this.stats.lastRunTime.getTime();
    const expectedInterval = this.config.fetchIntervalMinutes * 60 * 1000;

    // Check if jobs are running as expected
    const isOverdue = lastRunAge > expectedInterval * 2; // Allow some buffer
    const hasRecentFailures = this.stats.failedRuns > this.stats.successfulRuns * 0.2; // >20% failure rate
    const hasRunningJobs = this.currentJobs.size > 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (isOverdue && !hasRunningJobs) {
      status = 'unhealthy';
    } else if (hasRecentFailures || (isOverdue && hasRunningJobs)) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        isRunning: this.isRunning,
        lastRunAge: Math.round(lastRunAge / 1000), // seconds
        expectedIntervalSeconds: Math.round(expectedInterval / 1000),
        successRate: this.stats.totalRuns > 0 ? this.stats.successfulRuns / this.stats.totalRuns : 1,
        currentJobs: this.currentJobs.size,
        nextRunIn: Math.max(0, this.stats.nextRunTime.getTime() - now)
      }
    };
  }
}