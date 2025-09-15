/**
 * Related Article Service
 * Finds and analyzes relationships between articles based on content similarity
 */

import { Database } from 'better-sqlite3';

export interface ArticleRelationship {
  articleId: number;
  relatedArticleId: number;
  relationshipType: 'similar' | 'followup' | 'contradiction' | 'update';
  similarityScore: number;
  relationshipStrength: 'weak' | 'moderate' | 'strong';
  sharedEntities: string[];
  sharedTags: string[];
  contentOverlap: number;
  detectionMethod: string;
  confidence: number;
}

export interface RelatedArticleResult {
  relationships: ArticleRelationship[];
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export interface SimilarityMetrics {
  entitySimilarity: number;
  tagSimilarity: number;
  titleSimilarity: number;
  contentSimilarity: number;
  temporalRelevance: number;
  sourceDiversity: number;
}

export class RelatedArticleService {
  private db: Database;

  // Similarity thresholds
  private readonly similarityThresholds = {
    strong: 0.8,
    moderate: 0.6,
    weak: 0.4
  };

  // Relationship type weights
  private readonly relationshipWeights = {
    entity: 0.3,
    tag: 0.25,
    title: 0.2,
    content: 0.15,
    temporal: 0.1
  };

  constructor(db: Database) {
    this.db = db;
  }

  async findRelatedArticles(
    articleId: number,
    options: {
      maxRelated?: number;
      minSimilarity?: number;
      includeSelfRelations?: boolean;
      timeWindowDays?: number;
      preferRecentArticles?: boolean;
    } = {}
  ): Promise<RelatedArticleResult> {
    const startTime = Date.now();
    const {
      maxRelated = 10,
      minSimilarity = 0.4,
      includeSelfRelations = false,
      timeWindowDays = 30,
      preferRecentArticles = true
    } = options;

    try {
      // Get article details
      const article = await this.getArticleDetails(articleId);
      if (!article) {
        throw new Error(`Article ${articleId} not found`);
      }

      // Find candidate articles
      const candidates = await this.getCandidateArticles(
        articleId,
        timeWindowDays,
        includeSelfRelations
      );

      // Calculate similarities and relationships
      const relationships: ArticleRelationship[] = [];

      for (const candidate of candidates) {
        const similarity = await this.calculateSimilarity(article, candidate);

        if (similarity.overall >= minSimilarity) {
          const relationship = await this.buildRelationship(
            articleId,
            candidate.id,
            similarity,
            article,
            candidate
          );

          if (relationship) {
            relationships.push(relationship);
          }
        }
      }

      // Sort by similarity score and apply limits
      const sortedRelationships = relationships
        .sort((a, b) => {
          if (preferRecentArticles) {
            // Combine similarity with recency
            return (b.similarityScore * 0.8 + b.confidence * 0.2) -
                   (a.similarityScore * 0.8 + a.confidence * 0.2);
          }
          return b.similarityScore - a.similarityScore;
        })
        .slice(0, maxRelated);

      // Store relationships in database
      await this.storeRelationships(sortedRelationships);

      const processingTimeMs = Date.now() - startTime;

      return {
        relationships: sortedRelationships,
        processingTimeMs,
        success: true
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      return {
        relationships: [],
        processingTimeMs,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getArticleDetails(articleId: number): Promise<any> {
    const article = this.db.prepare(`
      SELECT
        a.id, a.title, a.description, a.published_at, a.source_name,
        e.full_text, e.word_count
      FROM articles a
      LEFT JOIN article_enrichment e ON a.id = e.article_id
      WHERE a.id = ?
    `).get(articleId);

    if (!article) return null;

    // Get entities
    const entities = this.db.prepare(`
      SELECT entity_text, entity_type, importance_score
      FROM article_entities
      WHERE article_id = ? AND importance_score > 0.5
      ORDER BY importance_score DESC
      LIMIT 20
    `).all(articleId);

    // Get tags
    const tags = this.db.prepare(`
      SELECT tag, confidence, tag_category
      FROM article_tags
      WHERE article_id = ? AND confidence > 0.4
      ORDER BY confidence DESC
      LIMIT 15
    `).all(articleId);

    return {
      ...article,
      entities,
      tags
    };
  }

  private async getCandidateArticles(
    articleId: number,
    timeWindowDays: number,
    includeSelfRelations: boolean
  ): Promise<any[]> {
    const selfCondition = includeSelfRelations ? '' : 'AND a.id != ?';
    const params = [timeWindowDays];
    if (!includeSelfRelations) params.push(articleId);

    const candidates = this.db.prepare(`
      SELECT
        a.id, a.title, a.description, a.published_at, a.source_name,
        e.full_text, e.word_count
      FROM articles a
      LEFT JOIN article_enrichment e ON a.id = e.article_id
      WHERE a.published_at >= datetime('now', '-' || ? || ' days')
      ${selfCondition}
      ORDER BY a.published_at DESC
      LIMIT 200
    `).all(...params);

    // Enrich candidates with entities and tags
    for (const candidate of candidates) {
      // Get entities
      candidate.entities = this.db.prepare(`
        SELECT entity_text, entity_type, importance_score
        FROM article_entities
        WHERE article_id = ? AND importance_score > 0.5
        ORDER BY importance_score DESC
        LIMIT 20
      `).all(candidate.id);

      // Get tags
      candidate.tags = this.db.prepare(`
        SELECT tag, confidence, tag_category
        FROM article_tags
        WHERE article_id = ? AND confidence > 0.4
        ORDER BY confidence DESC
        LIMIT 15
      `).all(candidate.id);
    }

    return candidates;
  }

  private async calculateSimilarity(article1: any, article2: any): Promise<SimilarityMetrics & { overall: number }> {
    // Entity similarity
    const entitySimilarity = this.calculateEntitySimilarity(
      article1.entities || [],
      article2.entities || []
    );

    // Tag similarity
    const tagSimilarity = this.calculateTagSimilarity(
      article1.tags || [],
      article2.tags || []
    );

    // Title similarity
    const titleSimilarity = this.calculateTextSimilarity(
      article1.title || '',
      article2.title || ''
    );

    // Content similarity (using descriptions as proxy for full content)
    const contentSimilarity = this.calculateTextSimilarity(
      article1.description || '',
      article2.description || ''
    );

    // Temporal relevance (closer in time = more relevant)
    const temporalRelevance = this.calculateTemporalRelevance(
      article1.published_at,
      article2.published_at
    );

    // Source diversity (different sources might indicate broader coverage)
    const sourceDiversity = article1.source_name !== article2.source_name ? 0.1 : 0;

    // Calculate overall similarity
    const overall = (
      entitySimilarity * this.relationshipWeights.entity +
      tagSimilarity * this.relationshipWeights.tag +
      titleSimilarity * this.relationshipWeights.title +
      contentSimilarity * this.relationshipWeights.content +
      temporalRelevance * this.relationshipWeights.temporal
    ) + sourceDiversity;

    return {
      entitySimilarity,
      tagSimilarity,
      titleSimilarity,
      contentSimilarity,
      temporalRelevance,
      sourceDiversity,
      overall: Math.max(0, Math.min(1, overall))
    };
  }

  private calculateEntitySimilarity(entities1: any[], entities2: any[]): number {
    if (entities1.length === 0 && entities2.length === 0) return 0;
    if (entities1.length === 0 || entities2.length === 0) return 0;

    const entities1Set = new Set(entities1.map(e => e.entity_text.toLowerCase()));
    const entities2Set = new Set(entities2.map(e => e.entity_text.toLowerCase()));

    const intersection = new Set([...entities1Set].filter(x => entities2Set.has(x)));
    const union = new Set([...entities1Set, ...entities2Set]);

    // Jaccard similarity with importance weighting
    const jaccardSimilarity = intersection.size / union.size;

    // Weight by entity importance
    let weightedSimilarity = 0;
    let totalWeight = 0;

    for (const entity1 of entities1) {
      for (const entity2 of entities2) {
        if (entity1.entity_text.toLowerCase() === entity2.entity_text.toLowerCase()) {
          const weight = (entity1.importance_score + entity2.importance_score) / 2;
          weightedSimilarity += weight;
          totalWeight += weight;
        }
      }
    }

    const importanceWeightedSimilarity = totalWeight > 0 ? weightedSimilarity / totalWeight : 0;

    return (jaccardSimilarity + importanceWeightedSimilarity) / 2;
  }

  private calculateTagSimilarity(tags1: any[], tags2: any[]): number {
    if (tags1.length === 0 && tags2.length === 0) return 0;
    if (tags1.length === 0 || tags2.length === 0) return 0;

    const tags1Set = new Set(tags1.map(t => t.tag.toLowerCase()));
    const tags2Set = new Set(tags2.map(t => t.tag.toLowerCase()));

    const intersection = new Set([...tags1Set].filter(x => tags2Set.has(x)));
    const union = new Set([...tags1Set, ...tags2Set]);

    // Jaccard similarity with confidence weighting
    const jaccardSimilarity = intersection.size / union.size;

    // Weight by tag confidence
    let weightedSimilarity = 0;
    let totalWeight = 0;

    for (const tag1 of tags1) {
      for (const tag2 of tags2) {
        if (tag1.tag.toLowerCase() === tag2.tag.toLowerCase()) {
          const weight = (tag1.confidence + tag2.confidence) / 2;
          weightedSimilarity += weight;
          totalWeight += weight;
        }
      }
    }

    const confidenceWeightedSimilarity = totalWeight > 0 ? weightedSimilarity / totalWeight : 0;

    return (jaccardSimilarity + confidenceWeightedSimilarity) / 2;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Simple n-gram based similarity
    const words1 = this.tokenize(text1.toLowerCase());
    const words2 = this.tokenize(text2.toLowerCase());

    if (words1.length === 0 && words2.length === 0) return 1;
    if (words1.length === 0 || words2.length === 0) return 0;

    // Unigram similarity
    const unigram1 = new Set(words1);
    const unigram2 = new Set(words2);
    const unigramIntersection = new Set([...unigram1].filter(x => unigram2.has(x)));
    const unigramUnion = new Set([...unigram1, ...unigram2]);
    const unigramSimilarity = unigramIntersection.size / unigramUnion.size;

    // Bigram similarity
    const bigrams1 = this.generateBigrams(words1);
    const bigrams2 = this.generateBigrams(words2);
    const bigramSimilarity = this.calculateSetSimilarity(bigrams1, bigrams2);

    return (unigramSimilarity * 0.7 + bigramSimilarity * 0.3);
  }

  private calculateTemporalRelevance(date1: string, date2: string): number {
    const time1 = new Date(date1).getTime();
    const time2 = new Date(date2).getTime();
    const timeDiff = Math.abs(time1 - time2);

    // Convert to days
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    // Exponential decay: articles closer in time are more relevant
    const relevance = Math.exp(-daysDiff / 7); // Half-life of 7 days

    return Math.max(0, Math.min(1, relevance));
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private generateBigrams(words: string[]): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]} ${words[i + 1]}`);
    }
    return bigrams;
  }

  private calculateSetSimilarity(set1: Set<string>, set2: Set<string>): number {
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private async buildRelationship(
    articleId: number,
    relatedId: number,
    similarity: SimilarityMetrics & { overall: number },
    article: any,
    relatedArticle: any
  ): Promise<ArticleRelationship | null> {
    // Determine relationship type
    const relationshipType = this.determineRelationshipType(similarity, article, relatedArticle);

    // Determine relationship strength
    const relationshipStrength = this.determineRelationshipStrength(similarity.overall);

    // Find shared entities
    const sharedEntities = this.findSharedItems(
      article.entities || [],
      relatedArticle.entities || [],
      'entity_text'
    );

    // Find shared tags
    const sharedTags = this.findSharedItems(
      article.tags || [],
      relatedArticle.tags || [],
      'tag'
    );

    // Calculate content overlap
    const contentOverlap = similarity.contentSimilarity;

    // Determine detection method
    const detectionMethod = this.getDetectionMethod(similarity);

    return {
      articleId,
      relatedArticleId: relatedId,
      relationshipType,
      similarityScore: similarity.overall,
      relationshipStrength,
      sharedEntities,
      sharedTags,
      contentOverlap,
      detectionMethod,
      confidence: this.calculateConfidence(similarity)
    };
  }

  private determineRelationshipType(
    similarity: SimilarityMetrics & { overall: number },
    article: any,
    relatedArticle: any
  ): ArticleRelationship['relationshipType'] {
    const timeDiff = Math.abs(
      new Date(article.published_at).getTime() - new Date(relatedArticle.published_at).getTime()
    );
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    // If articles are very similar and close in time, might be update or followup
    if (similarity.overall > 0.8 && daysDiff < 3) {
      // Check if one is significantly longer (update) or has different stance (contradiction)
      const wordCount1 = article.word_count || 0;
      const wordCount2 = relatedArticle.word_count || 0;

      if (Math.abs(wordCount1 - wordCount2) > Math.max(wordCount1, wordCount2) * 0.3) {
        return 'update';
      }
    }

    // Default to similar for high similarity
    if (similarity.overall > 0.6) {
      return 'similar';
    }

    // For lower similarity, check if it might be a followup
    if (daysDiff < 7 && similarity.entitySimilarity > 0.7) {
      return 'followup';
    }

    return 'similar';
  }

  private determineRelationshipStrength(similarityScore: number): ArticleRelationship['relationshipStrength'] {
    if (similarityScore >= this.similarityThresholds.strong) return 'strong';
    if (similarityScore >= this.similarityThresholds.moderate) return 'moderate';
    return 'weak';
  }

  private findSharedItems(items1: any[], items2: any[], field: string): string[] {
    const set1 = new Set(items1.map(item => item[field].toLowerCase()));
    const set2 = new Set(items2.map(item => item[field].toLowerCase()));

    return [...set1].filter(item => set2.has(item));
  }

  private getDetectionMethod(similarity: SimilarityMetrics): string {
    const methods = [];

    if (similarity.entitySimilarity > 0.5) methods.push('entity_overlap');
    if (similarity.tagSimilarity > 0.5) methods.push('tag_similarity');
    if (similarity.titleSimilarity > 0.5) methods.push('title_similarity');
    if (similarity.contentSimilarity > 0.5) methods.push('content_similarity');

    return methods.length > 0 ? methods.join(', ') : 'overall_similarity';
  }

  private calculateConfidence(similarity: SimilarityMetrics): number {
    // Confidence based on multiple similarity factors
    const factors = [
      similarity.entitySimilarity,
      similarity.tagSimilarity,
      similarity.titleSimilarity,
      similarity.contentSimilarity
    ];

    const activeFactor = factors.filter(f => f > 0.3).length;
    const avgSimilarity = factors.reduce((sum, f) => sum + f, 0) / factors.length;

    // Higher confidence if multiple factors contribute
    const diversityBonus = (activeFactor - 1) * 0.1;

    return Math.max(0.3, Math.min(0.95, avgSimilarity + diversityBonus));
  }

  private async storeRelationships(relationships: ArticleRelationship[]): Promise<void> {
    if (relationships.length === 0) return;

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO article_relationships (
        article_id, related_article_id, relationship_type, similarity_score,
        relationship_strength, shared_entities, shared_tags, content_overlap,
        detection_method, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const rel of relationships) {
        insertStmt.run(
          rel.articleId,
          rel.relatedArticleId,
          rel.relationshipType,
          rel.similarityScore,
          rel.relationshipStrength,
          JSON.stringify(rel.sharedEntities),
          JSON.stringify(rel.sharedTags),
          rel.contentOverlap,
          rel.detectionMethod,
          rel.confidence
        );
      }
    });

    transaction();
  }

  async getRelatedArticles(
    articleId: number,
    options: {
      relationshipTypes?: string[];
      minSimilarity?: number;
      limit?: number;
    } = {}
  ): Promise<ArticleRelationship[]> {
    const { relationshipTypes = [], minSimilarity = 0, limit = 10 } = options;

    let query = `
      SELECT
        article_id as articleId, related_article_id as relatedArticleId,
        relationship_type as relationshipType, similarity_score as similarityScore,
        relationship_strength as relationshipStrength, shared_entities as sharedEntities,
        shared_tags as sharedTags, content_overlap as contentOverlap,
        detection_method as detectionMethod, confidence
      FROM article_relationships
      WHERE article_id = ?
    `;
    const params: any[] = [articleId];

    if (relationshipTypes.length > 0) {
      query += ` AND relationship_type IN (${relationshipTypes.map(() => '?').join(',')})`;
      params.push(...relationshipTypes);
    }

    if (minSimilarity > 0) {
      query += ` AND similarity_score >= ?`;
      params.push(minSimilarity);
    }

    query += ` ORDER BY similarity_score DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(query).all(...params);

    return rows.map(row => ({
      ...row,
      sharedEntities: JSON.parse(row.sharedEntities),
      sharedTags: JSON.parse(row.sharedTags)
    })) as ArticleRelationship[];
  }

  async getRelationshipStats(): Promise<{
    totalRelationships: number;
    byType: Array<{ type: string; count: number }>;
    byStrength: Array<{ strength: string; count: number }>;
    avgSimilarityScore: number;
  }> {
    const total = this.db.prepare(`
      SELECT COUNT(*) as count FROM article_relationships
    `).get() as { count: number };

    const byType = this.db.prepare(`
      SELECT relationship_type as type, COUNT(*) as count
      FROM article_relationships
      GROUP BY relationship_type
      ORDER BY count DESC
    `).all() as Array<{ type: string; count: number }>;

    const byStrength = this.db.prepare(`
      SELECT relationship_strength as strength, COUNT(*) as count
      FROM article_relationships
      GROUP BY relationship_strength
      ORDER BY count DESC
    `).all() as Array<{ strength: string; count: number }>;

    const avgScore = this.db.prepare(`
      SELECT AVG(similarity_score) as avg FROM article_relationships
    `).get() as { avg: number };

    return {
      totalRelationships: total.count,
      byType,
      byStrength,
      avgSimilarityScore: avgScore.avg || 0
    };
  }
}

export default RelatedArticleService;