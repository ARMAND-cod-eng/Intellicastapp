/**
 * Content Enrichment Pipeline Orchestrator
 * Coordinates all enrichment services and manages the processing workflow
 */

import { Database } from 'better-sqlite3';
import ReadabilityService from './ReadabilityService';
import NERService from './NERService';
import TagClassificationService from './TagClassificationService';
import ContentAnalysisService from './ContentAnalysisService';
import QuoteExtractionService from './QuoteExtractionService';
import StanceBiasDetectionService from './StanceBiasDetectionService';
import RelatedArticleService from './RelatedArticleService';

export interface EnrichmentConfig {
  enableTextExtraction: boolean;
  enableEntityExtraction: boolean;
  enableTagGeneration: boolean;
  enableContentAnalysis: boolean;
  enableQuoteExtraction: boolean;
  enableStanceBiasDetection: boolean;
  enableRelatedArticles: boolean;
  batchSize: number;
  maxRetries: number;
  timeoutMs: number;
  skipIfExists: boolean;
}

export interface EnrichmentStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  result?: any;
}

export interface EnrichmentResult {
  articleId: number;
  success: boolean;
  totalDuration: number;
  steps: EnrichmentStep[];
  errors: string[];
  skippedSteps: string[];
}

export interface EnrichmentJob {
  id: string;
  articleIds: number[];
  config: EnrichmentConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    completed: number;
    total: number;
    currentArticle?: number;
  };
  results: EnrichmentResult[];
  startTime?: Date;
  endTime?: Date;
  totalDuration?: number;
}

export interface PipelineStats {
  totalArticlesProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  stepSuccessRates: { [key: string]: number };
  commonErrors: Array<{ error: string; count: number }>;
}

export class EnrichmentPipeline {
  private db: Database;
  private readabilityService: ReadabilityService;
  private nerService: NERService;
  private tagService: TagClassificationService;
  private analysisService: ContentAnalysisService;
  private quoteService: QuoteExtractionService;
  private stanceBiasService: StanceBiasDetectionService;
  private relatedService: RelatedArticleService;

  private runningJobs = new Map<string, EnrichmentJob>();

  // Default configuration
  private readonly defaultConfig: EnrichmentConfig = {
    enableTextExtraction: true,
    enableEntityExtraction: true,
    enableTagGeneration: true,
    enableContentAnalysis: true,
    enableQuoteExtraction: true,
    enableStanceBiasDetection: true,
    enableRelatedArticles: true,
    batchSize: 10,
    maxRetries: 2,
    timeoutMs: 300000, // 5 minutes per article
    skipIfExists: true
  };

  constructor(
    db: Database,
    options: {
      tempDir?: string;
      pythonPath?: string;
    } = {}
  ) {
    this.db = db;

    // Initialize all services
    this.readabilityService = new ReadabilityService(db, options);
    this.nerService = new NERService(db, options);
    this.tagService = new TagClassificationService(db, options);
    this.analysisService = new ContentAnalysisService(db);
    this.quoteService = new QuoteExtractionService(db);
    this.stanceBiasService = new StanceBiasDetectionService(db, options);
    this.relatedService = new RelatedArticleService(db);
  }

  async initialize(): Promise<void> {
    // Initialize all services that require setup
    await Promise.all([
      this.readabilityService.initialize(),
      this.nerService.initialize(),
      this.tagService.initialize(),
      this.stanceBiasService.initialize()
    ]);
  }

  async enrichArticle(
    articleId: number,
    config: Partial<EnrichmentConfig> = {}
  ): Promise<EnrichmentResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = new Date();

    const result: EnrichmentResult = {
      articleId,
      success: false,
      totalDuration: 0,
      steps: [],
      errors: [],
      skippedSteps: []
    };

    try {
      // Get article information
      const article = await this.getArticle(articleId);
      if (!article) {
        throw new Error(`Article ${articleId} not found`);
      }

      // Check if enrichment already exists and should be skipped
      if (finalConfig.skipIfExists && await this.isAlreadyEnriched(articleId)) {
        result.success = true;
        result.skippedSteps.push('All steps (already enriched)');
        result.totalDuration = Date.now() - startTime.getTime();
        return result;
      }

      // Step 1: Text Extraction
      if (finalConfig.enableTextExtraction) {
        const step = await this.executeStep(
          'Text Extraction',
          () => this.readabilityService.extractContent(articleId, article.url),
          finalConfig
        );
        result.steps.push(step);
        if (step.status === 'failed') result.errors.push(step.error!);
      }

      // Get enriched text for subsequent steps
      const enrichedArticle = await this.getEnrichedArticle(articleId);
      const textForProcessing = enrichedArticle?.full_text || article.description || article.title;

      if (!textForProcessing) {
        throw new Error('No text content available for enrichment');
      }

      // Step 2: Entity Extraction
      if (finalConfig.enableEntityExtraction) {
        const step = await this.executeStep(
          'Entity Extraction',
          () => this.nerService.extractEntities(articleId, textForProcessing),
          finalConfig
        );
        result.steps.push(step);
        if (step.status === 'failed') result.errors.push(step.error!);
      }

      // Step 3: Tag Generation
      if (finalConfig.enableTagGeneration) {
        const step = await this.executeStep(
          'Tag Generation',
          () => this.tagService.generateTags(articleId, textForProcessing, article.title),
          finalConfig
        );
        result.steps.push(step);
        if (step.status === 'failed') result.errors.push(step.error!);
      }

      // Step 4: Content Analysis
      if (finalConfig.enableContentAnalysis) {
        const step = await this.executeStep(
          'Content Analysis',
          () => this.analysisService.analyzeContent(articleId, textForProcessing),
          finalConfig
        );
        result.steps.push(step);
        if (step.status === 'failed') result.errors.push(step.error!);
      }

      // Step 5: Quote Extraction
      if (finalConfig.enableQuoteExtraction) {
        const step = await this.executeStep(
          'Quote Extraction',
          () => this.quoteService.extractQuotes(articleId, textForProcessing),
          finalConfig
        );
        result.steps.push(step);
        if (step.status === 'failed') result.errors.push(step.error!);
      }

      // Step 6: Stance/Bias Detection
      if (finalConfig.enableStanceBiasDetection) {
        const step = await this.executeStep(
          'Stance/Bias Detection',
          () => this.stanceBiasService.analyzeStanceAndBias(articleId, textForProcessing, article.title),
          finalConfig
        );
        result.steps.push(step);
        if (step.status === 'failed') result.errors.push(step.error!);
      }

      // Step 7: Related Articles (run after other enrichments for better similarity)
      if (finalConfig.enableRelatedArticles) {
        const step = await this.executeStep(
          'Related Articles',
          () => this.relatedService.findRelatedArticles(articleId),
          finalConfig
        );
        result.steps.push(step);
        if (step.status === 'failed') result.errors.push(step.error!);
      }

      // Mark article as processed
      await this.markAsProcessed(articleId);

      result.success = result.errors.length === 0 || result.steps.some(s => s.status === 'completed');
      result.totalDuration = Date.now() - startTime.getTime();

      // Store job result
      await this.storeEnrichmentJob(articleId, result, finalConfig);

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.totalDuration = Date.now() - startTime.getTime();
      return result;
    }
  }

  async enrichBatch(
    articleIds: number[],
    config: Partial<EnrichmentConfig> = {}
  ): Promise<EnrichmentJob> {
    const jobId = this.generateJobId();
    const finalConfig = { ...this.defaultConfig, ...config };

    const job: EnrichmentJob = {
      id: jobId,
      articleIds,
      config: finalConfig,
      status: 'pending',
      progress: {
        completed: 0,
        total: articleIds.length
      },
      results: [],
      startTime: new Date()
    };

    this.runningJobs.set(jobId, job);

    // Process in background
    this.processBatchJob(job).catch(error => {
      job.status = 'failed';
      job.endTime = new Date();
      console.error(`Enrichment job ${jobId} failed:`, error);
    });

    return job;
  }

  private async processBatchJob(job: EnrichmentJob): Promise<void> {
    job.status = 'running';

    const batches = this.createBatches(job.articleIds, job.config.batchSize);

    for (const batch of batches) {
      if (job.status === 'cancelled') break;

      // Process articles in parallel within batch
      const batchPromises = batch.map(async (articleId) => {
        job.progress.currentArticle = articleId;
        const result = await this.enrichArticle(articleId, job.config);
        job.results.push(result);
        job.progress.completed++;
        return result;
      });

      await Promise.all(batchPromises);
    }

    job.status = job.status === 'cancelled' ? 'cancelled' : 'completed';
    job.endTime = new Date();
    job.totalDuration = job.endTime.getTime() - job.startTime!.getTime();
  }

  private async executeStep<T>(
    stepName: string,
    stepFunction: () => Promise<T>,
    config: EnrichmentConfig
  ): Promise<EnrichmentStep> {
    const step: EnrichmentStep = {
      name: stepName,
      status: 'pending',
      startTime: new Date()
    };

    let retries = 0;
    while (retries <= config.maxRetries) {
      try {
        step.status = 'running';

        // Execute with timeout
        const result = await Promise.race([
          stepFunction(),
          this.createTimeoutPromise(config.timeoutMs)
        ]);

        step.status = 'completed';
        step.result = result;
        break;
      } catch (error) {
        retries++;
        step.error = error instanceof Error ? error.message : 'Unknown error';

        if (retries > config.maxRetries) {
          step.status = 'failed';
          break;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }

    step.endTime = new Date();
    step.duration = step.endTime.getTime() - step.startTime!.getTime();

    return step;
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Step timeout after ${timeoutMs}ms`)), timeoutMs);
    });
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async getArticle(articleId: number): Promise<any> {
    return this.db.prepare(`
      SELECT id, title, description, url, published_at, source_name
      FROM articles WHERE id = ?
    `).get(articleId);
  }

  private async getEnrichedArticle(articleId: number): Promise<any> {
    return this.db.prepare(`
      SELECT full_text, reading_time_minutes, complexity_score
      FROM article_enrichment WHERE article_id = ?
    `).get(articleId);
  }

  private async isAlreadyEnriched(articleId: number): Promise<boolean> {
    const enrichment = this.db.prepare(`
      SELECT id FROM article_enrichment WHERE article_id = ? AND extraction_success = 1
    `).get(articleId);
    return !!enrichment;
  }

  private async markAsProcessed(articleId: number): Promise<void> {
    this.db.prepare(`
      UPDATE articles SET is_processed = 1 WHERE id = ?
    `).run(articleId);
  }

  private async storeEnrichmentJob(
    articleId: number,
    result: EnrichmentResult,
    config: EnrichmentConfig
  ): Promise<void> {
    const insertStmt = this.db.prepare(`
      INSERT INTO enrichment_jobs (
        article_id, job_type, status, started_at, completed_at, duration_ms,
        steps_completed, steps_failed, error_message, pipeline_config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const completedSteps = result.steps.filter(s => s.status === 'completed').map(s => s.name);
    const failedSteps = result.steps.filter(s => s.status === 'failed').map(s => s.name);

    insertStmt.run(
      articleId,
      'full_enrichment',
      result.success ? 'completed' : 'failed',
      new Date().toISOString(),
      new Date().toISOString(),
      result.totalDuration,
      JSON.stringify(completedSteps),
      JSON.stringify(failedSteps),
      result.errors.join('; ') || null,
      JSON.stringify(config)
    );
  }

  private generateJobId(): string {
    return `enrichment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for job management
  getJob(jobId: string): EnrichmentJob | undefined {
    return this.runningJobs.get(jobId);
  }

  cancelJob(jobId: string): boolean {
    const job = this.runningJobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'cancelled';
      return true;
    }
    return false;
  }

  getRunningJobs(): EnrichmentJob[] {
    return Array.from(this.runningJobs.values()).filter(job => job.status === 'running');
  }

  async getStats(): Promise<PipelineStats> {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as totalArticlesProcessed,
        AVG(duration_ms) as averageProcessingTime,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as successRate
      FROM enrichment_jobs
      WHERE job_type = 'full_enrichment'
    `).get() as any;

    // Get step success rates
    const stepStats = this.db.prepare(`
      SELECT steps_completed, steps_failed FROM enrichment_jobs
      WHERE job_type = 'full_enrichment' AND (steps_completed IS NOT NULL OR steps_failed IS NOT NULL)
    `).all() as Array<{ steps_completed: string; steps_failed: string }>;

    const stepSuccessRates: { [key: string]: number } = {};
    const stepCounts: { [key: string]: { success: number; total: number } } = {};

    stepStats.forEach(row => {
      const completed = row.steps_completed ? JSON.parse(row.steps_completed) : [];
      const failed = row.steps_failed ? JSON.parse(row.steps_failed) : [];

      [...completed, ...failed].forEach(step => {
        if (!stepCounts[step]) {
          stepCounts[step] = { success: 0, total: 0 };
        }
        stepCounts[step].total++;
        if (completed.includes(step)) {
          stepCounts[step].success++;
        }
      });
    });

    Object.keys(stepCounts).forEach(step => {
      stepSuccessRates[step] = stepCounts[step].success / stepCounts[step].total;
    });

    // Get common errors
    const errors = this.db.prepare(`
      SELECT error_message, COUNT(*) as count
      FROM enrichment_jobs
      WHERE error_message IS NOT NULL AND error_message != ''
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 10
    `).all() as Array<{ error_message: string; count: number }>;

    const commonErrors = errors.map(e => ({
      error: e.error_message,
      count: e.count
    }));

    return {
      totalArticlesProcessed: stats.totalArticlesProcessed || 0,
      averageProcessingTime: stats.averageProcessingTime || 0,
      successRate: stats.successRate || 0,
      stepSuccessRates,
      commonErrors
    };
  }

  async getUnprocessedArticles(limit = 100): Promise<number[]> {
    const articles = this.db.prepare(`
      SELECT id FROM articles
      WHERE is_processed = 0
      ORDER BY published_at DESC
      LIMIT ?
    `).all(limit);

    return articles.map((a: any) => a.id);
  }

  async cleanup(): Promise<void> {
    // Clean up running jobs
    this.runningJobs.clear();

    // Clean up individual services
    await Promise.all([
      this.nerService.cleanup(),
      this.tagService.cleanup(),
      this.stanceBiasService.cleanup()
    ]);
  }
}

export default EnrichmentPipeline;