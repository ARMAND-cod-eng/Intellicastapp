/**
 * News Content Enrichment Services - Main Export
 * Complete content enrichment pipeline with local NLP processing
 */

// Main pipeline orchestrator
export { default as EnrichmentPipeline } from './EnrichmentPipeline';
export type {
  EnrichmentConfig,
  EnrichmentStep,
  EnrichmentResult,
  EnrichmentJob,
  PipelineStats
} from './EnrichmentPipeline';

// Individual enrichment services
export { default as ReadabilityService } from './ReadabilityService';
export type {
  ExtractionResult as ReadabilityResult,
  ExtractionOptions as ReadabilityOptions
} from './ReadabilityService';

export { default as NERService } from './NERService';
export type {
  EntityMatch,
  ProcessedEntity,
  EntityExtractionResult
} from './NERService';

export { default as TagClassificationService } from './TagClassificationService';
export type {
  TagPrediction,
  TagClassificationResult,
  TagCategories
} from './TagClassificationService';

export { default as ContentAnalysisService } from './ContentAnalysisService';
export type {
  TextMetrics,
  ReadabilityScores,
  ContentAnalysis,
  AnalysisResult as ContentAnalysisResult
} from './ContentAnalysisService';

export { default as QuoteExtractionService } from './QuoteExtractionService';
export type {
  Quote,
  QuoteExtractionResult
} from './QuoteExtractionService';

export { default as StanceBiasDetectionService } from './StanceBiasDetectionService';
export type {
  StanceAnalysis,
  StanceDetectionResult,
  BiasIndicators
} from './StanceBiasDetectionService';

export { default as RelatedArticleService } from './RelatedArticleService';
export type {
  ArticleRelationship,
  RelatedArticleResult,
  SimilarityMetrics
} from './RelatedArticleService';

// Convenience factory function for creating enrichment pipeline
export function createEnrichmentPipeline(
  db: any,
  options: {
    tempDir?: string;
    pythonPath?: string;
  } = {}
): EnrichmentPipeline {
  return new (require('./EnrichmentPipeline').default)(db, options);
}

/**
 * Example usage patterns and utilities
 */
export const enrichmentExamples = {
  basicEnrichment: `
// Basic article enrichment
import { EnrichmentPipeline } from './services/news/enrichment';

const pipeline = new EnrichmentPipeline(db);
await pipeline.initialize();

// Enrich a single article
const result = await pipeline.enrichArticle(123, {
  enableTextExtraction: true,
  enableEntityExtraction: true,
  enableTagGeneration: true,
  skipIfExists: true
});

console.log('Enrichment completed:', result.success);
console.log('Processing time:', result.totalDuration, 'ms');
console.log('Extracted entities:', result.steps.find(s => s.name === 'Entity Extraction')?.result);
  `,

  batchProcessing: `
// Batch enrichment with progress tracking
const job = await pipeline.enrichBatch([123, 124, 125], {
  enableTextExtraction: true,
  enableEntityExtraction: true,
  enableTagGeneration: true,
  enableContentAnalysis: true,
  enableQuoteExtraction: true,
  enableStanceBiasDetection: true,
  enableRelatedArticles: true,
  batchSize: 5,
  maxRetries: 3
});

console.log('Job started:', job.id);

// Monitor progress
const checkProgress = setInterval(() => {
  const currentJob = pipeline.getJob(job.id);
  if (currentJob) {
    console.log(\`Progress: \${currentJob.progress.completed}/\${currentJob.progress.total}\`);

    if (currentJob.status === 'completed' || currentJob.status === 'failed') {
      clearInterval(checkProgress);
      console.log('Job finished:', currentJob.status);
      console.log('Results:', currentJob.results.length);
    }
  }
}, 1000);
  `,

  individualServices: `
// Using individual enrichment services
import {
  NERService,
  TagClassificationService,
  ContentAnalysisService
} from './services/news/enrichment';

// Named Entity Recognition
const nerService = new NERService(db);
await nerService.initialize();

const entities = await nerService.extractEntities(
  123,
  "Apple Inc. announced a new iPhone model in Cupertino, California."
);
console.log('Entities:', entities.entities);

// Tag Generation
const tagService = new TagClassificationService(db);
await tagService.initialize();

const tags = await tagService.generateTags(
  123,
  "New breakthrough in artificial intelligence research shows promise...",
  "AI Breakthrough Announced",
  { includeCategories: ['topics', 'sentiment'] }
);
console.log('Generated tags:', tags.tags);

// Content Analysis
const analysisService = new ContentAnalysisService(db);
const analysis = await analysisService.analyzeContent(123, articleText);
console.log('Reading time:', analysis.analysis.readingTimeMinutes, 'minutes');
console.log('Complexity score:', analysis.analysis.readabilityScores.complexityScore);
  `,

  advancedConfiguration: `
// Advanced enrichment with custom configuration
const customConfig = {
  enableTextExtraction: true,
  enableEntityExtraction: true,
  enableTagGeneration: true,
  enableContentAnalysis: true,
  enableQuoteExtraction: true,
  enableStanceBiasDetection: true,
  enableRelatedArticles: true,
  batchSize: 3,
  maxRetries: 2,
  timeoutMs: 120000, // 2 minutes per step
  skipIfExists: false // Re-process existing enrichments
};

// Process unprocessed articles
const unprocessedIds = await pipeline.getUnprocessedArticles(50);
console.log(\`Found \${unprocessedIds.length} unprocessed articles\`);

if (unprocessedIds.length > 0) {
  const job = await pipeline.enrichBatch(unprocessedIds, customConfig);
  console.log('Started enrichment job:', job.id);
}
  `,

  queryEnrichedData: `
// Querying enriched article data
import { Database } from 'better-sqlite3';

// Get articles with high complexity scores
const complexArticles = db.prepare(\`
  SELECT a.title, e.complexity_score, e.reading_time_minutes
  FROM articles a
  JOIN article_enrichment e ON a.id = e.article_id
  WHERE e.complexity_score > 0.7
  ORDER BY e.complexity_score DESC
  LIMIT 10
\`).all();

// Get articles by entity type
const techArticles = db.prepare(\`
  SELECT DISTINCT a.title, a.published_at
  FROM articles a
  JOIN article_entities e ON a.id = e.article_id
  WHERE e.entity_type = 'ORG'
    AND e.entity_text IN ('Apple', 'Google', 'Microsoft', 'Amazon')
    AND e.importance_score > 0.7
  ORDER BY a.published_at DESC
\`).all();

// Get articles by sentiment/stance
const positiveArticles = db.prepare(\`
  SELECT a.title, e.stance, e.stance_confidence, e.bias_score
  FROM articles a
  JOIN article_enrichment e ON a.id = e.article_id
  WHERE e.stance = 'positive' AND e.stance_confidence > 0.7
  ORDER BY e.stance_confidence DESC
\`).all();

// Find related articles
const relatedArticles = db.prepare(\`
  SELECT
    a1.title as article_title,
    a2.title as related_title,
    r.relationship_type,
    r.similarity_score
  FROM article_relationships r
  JOIN articles a1 ON r.article_id = a1.id
  JOIN articles a2 ON r.related_article_id = a2.id
  WHERE r.similarity_score > 0.8
  ORDER BY r.similarity_score DESC
\`).all();
  `
};

/**
 * Configuration presets for different enrichment scenarios
 */
export const enrichmentPresets = {
  // Fast enrichment with core features only
  fast: {
    enableTextExtraction: true,
    enableEntityExtraction: true,
    enableTagGeneration: true,
    enableContentAnalysis: true,
    enableQuoteExtraction: false,
    enableStanceBiasDetection: false,
    enableRelatedArticles: false,
    batchSize: 10,
    maxRetries: 1,
    timeoutMs: 60000,
    skipIfExists: true
  },

  // Comprehensive enrichment with all features
  comprehensive: {
    enableTextExtraction: true,
    enableEntityExtraction: true,
    enableTagGeneration: true,
    enableContentAnalysis: true,
    enableQuoteExtraction: true,
    enableStanceBiasDetection: true,
    enableRelatedArticles: true,
    batchSize: 5,
    maxRetries: 3,
    timeoutMs: 300000,
    skipIfExists: true
  },

  // Lightweight enrichment for high-volume processing
  lightweight: {
    enableTextExtraction: false,
    enableEntityExtraction: true,
    enableTagGeneration: true,
    enableContentAnalysis: true,
    enableQuoteExtraction: false,
    enableStanceBiasDetection: false,
    enableRelatedArticles: false,
    batchSize: 20,
    maxRetries: 1,
    timeoutMs: 30000,
    skipIfExists: true
  },

  // Analysis-focused enrichment for research purposes
  research: {
    enableTextExtraction: true,
    enableEntityExtraction: true,
    enableTagGeneration: true,
    enableContentAnalysis: true,
    enableQuoteExtraction: true,
    enableStanceBiasDetection: true,
    enableRelatedArticles: true,
    batchSize: 3,
    maxRetries: 3,
    timeoutMs: 600000,
    skipIfExists: false // Re-process for consistency
  }
};

/**
 * Utility functions for enrichment data processing
 */
export const enrichmentUtils = {
  // Format enrichment results for display
  formatEnrichmentResult: (result: any) => ({
    success: result.success,
    duration: `${Math.round(result.totalDuration / 1000)}s`,
    completedSteps: result.steps.filter((s: any) => s.status === 'completed').length,
    totalSteps: result.steps.length,
    errors: result.errors.length,
    stepDetails: result.steps.map((s: any) => ({
      name: s.name,
      status: s.status,
      duration: s.duration ? `${Math.round(s.duration / 1000)}s` : 'N/A'
    }))
  }),

  // Calculate enrichment coverage statistics
  calculateCoverage: (db: any) => {
    const total = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
    const enriched = db.prepare(`
      SELECT COUNT(*) as count FROM article_enrichment
      WHERE extraction_success = 1
    `).get().count;

    const withEntities = db.prepare(`
      SELECT COUNT(DISTINCT article_id) as count FROM article_entities
    `).get().count;

    const withTags = db.prepare(`
      SELECT COUNT(DISTINCT article_id) as count FROM article_tags
    `).get().count;

    const withQuotes = db.prepare(`
      SELECT COUNT(DISTINCT article_id) as count FROM article_quotes
    `).get().count;

    return {
      totalArticles: total,
      enrichedArticles: enriched,
      enrichmentRate: total > 0 ? (enriched / total * 100).toFixed(1) + '%' : '0%',
      entityCoverage: total > 0 ? (withEntities / total * 100).toFixed(1) + '%' : '0%',
      tagCoverage: total > 0 ? (withTags / total * 100).toFixed(1) + '%' : '0%',
      quoteCoverage: total > 0 ? (withQuotes / total * 100).toFixed(1) + '%' : '0%'
    };
  },

  // Get enrichment quality metrics
  getQualityMetrics: (db: any) => {
    const avgComplexity = db.prepare(`
      SELECT AVG(complexity_score) as avg FROM article_enrichment
      WHERE complexity_score IS NOT NULL
    `).get()?.avg || 0;

    const avgReadingTime = db.prepare(`
      SELECT AVG(reading_time_minutes) as avg FROM article_enrichment
      WHERE reading_time_minutes IS NOT NULL
    `).get()?.avg || 0;

    const entityDistribution = db.prepare(`
      SELECT entity_type, COUNT(*) as count
      FROM article_entities
      GROUP BY entity_type
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const tagDistribution = db.prepare(`
      SELECT tag, COUNT(*) as count
      FROM article_tags
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `).all();

    return {
      averageComplexity: parseFloat(avgComplexity.toFixed(2)),
      averageReadingTime: parseFloat(avgReadingTime.toFixed(1)),
      topEntityTypes: entityDistribution,
      topTags: tagDistribution
    };
  }
};

/**
 * Version and feature info
 */
export const ENRICHMENT_VERSION = '1.0.0';
export const SUPPORTED_FEATURES = [
  'text_extraction',
  'named_entity_recognition',
  'tag_classification',
  'content_analysis',
  'quote_extraction',
  'stance_bias_detection',
  'related_articles'
];

export const REQUIRED_PYTHON_PACKAGES = [
  'beautifulsoup4',
  'lxml',
  'spacy',
  'transformers',
  'torch',
  'textblob',
  'vaderSentiment'
];

export default EnrichmentPipeline;