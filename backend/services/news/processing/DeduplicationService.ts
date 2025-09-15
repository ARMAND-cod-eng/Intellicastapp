/**
 * Article Deduplication Service using Embeddings
 * Uses all-MiniLM-L6-v2 model for semantic similarity detection
 */

import { Article, SimilarityResult, EmbeddingResult } from '../types/NewsTypes';
import { createHash } from 'crypto';

interface DeduplicationConfig {
  embeddingModel: string;
  similarityThreshold: number;
  batchSize: number;
  maxComparisonDistance: number; // Only compare articles within this many days
  enableFuzzyMatching: boolean;
  enableTitleMatching: boolean;
}

interface EmbeddingAPI {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

// Mock embedding API - in production, this would connect to a real embedding service
class MockEmbeddingAPI implements EmbeddingAPI {
  async generateEmbedding(text: string): Promise<number[]> {
    // Simulate embedding generation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate a mock 384-dimensional embedding (same as all-MiniLM-L6-v2)
    const embedding = new Array(384).fill(0).map(() => Math.random() - 0.5);

    // Add some deterministic aspects based on text content for consistency
    const hash = createHash('md5').update(text).digest('hex');
    for (let i = 0; i < Math.min(16, embedding.length); i++) {
      const hashChar = hash[i];
      embedding[i] += parseInt(hashChar, 16) / 16 - 0.5;
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // Process in smaller batches to simulate API limits
    const batchSize = 10;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return results;
  }
}

export class DeduplicationService {
  private config: DeduplicationConfig;
  private database: any;
  private embeddingAPI: EmbeddingAPI;
  private logger: any;

  constructor(
    database: any,
    embeddingAPI?: EmbeddingAPI,
    config?: Partial<DeduplicationConfig>,
    logger?: any
  ) {
    this.database = database;
    this.embeddingAPI = embeddingAPI || new MockEmbeddingAPI();
    this.logger = logger || console;

    this.config = {
      embeddingModel: 'all-MiniLM-L6-v2',
      similarityThreshold: 0.85,
      batchSize: 50,
      maxComparisonDistance: 7, // 7 days
      enableFuzzyMatching: true,
      enableTitleMatching: true,
      ...config
    };
  }

  /**
   * Process articles for deduplication
   */
  async processArticles(articleIds?: number[]): Promise<{
    processed: number;
    duplicatesFound: number;
    embeddingsGenerated: number;
    similarityChecks: number;
  }> {
    const startTime = Date.now();

    try {
      // Get articles to process
      const articles = await this.getArticlesToProcess(articleIds);

      if (articles.length === 0) {
        return {
          processed: 0,
          duplicatesFound: 0,
          embeddingsGenerated: 0,
          similarityChecks: 0
        };
      }

      this.logger.info(`Processing ${articles.length} articles for deduplication`);

      // Step 1: Generate embeddings for articles that don't have them
      const embeddingsGenerated = await this.generateMissingEmbeddings(articles);

      // Step 2: Find duplicates using multiple methods
      const duplicatesFound = await this.findDuplicates(articles);

      const duration = Date.now() - startTime;

      this.logger.info('Deduplication processing completed', {
        processed: articles.length,
        duplicatesFound,
        embeddingsGenerated,
        duration: `${duration}ms`
      });

      return {
        processed: articles.length,
        duplicatesFound,
        embeddingsGenerated,
        similarityChecks: this.calculateSimilarityChecks(articles.length)
      };

    } catch (error) {
      this.logger.error('Deduplication processing failed', error);
      throw error;
    }
  }

  /**
   * Find duplicate of a single article
   */
  async findDuplicateForArticle(articleId: number): Promise<{
    isDuplicate: boolean;
    duplicateOf?: number;
    similarityScore?: number;
    method?: string;
  }> {
    try {
      const article = await this.getArticleById(articleId);
      if (!article) {
        throw new Error(`Article ${articleId} not found`);
      }

      // Quick checks first
      const quickDuplicate = await this.quickDuplicateCheck(article);
      if (quickDuplicate) {
        return quickDuplicate;
      }

      // Ensure article has embedding
      if (!article.embedding_vector) {
        await this.generateEmbeddingForArticle(article);
        // Reload article with embedding
        const updatedArticle = await this.getArticleById(articleId);
        if (updatedArticle) {
          article.embedding_vector = updatedArticle.embedding_vector;
        }
      }

      // Find semantic duplicates
      const semanticDuplicate = await this.findSemanticDuplicates([article]);
      if (semanticDuplicate.length > 0) {
        const duplicate = semanticDuplicate[0];
        return {
          isDuplicate: true,
          duplicateOf: duplicate.article1Id === articleId ? duplicate.article2Id : duplicate.article1Id,
          similarityScore: duplicate.similarityScore,
          method: duplicate.comparisonMethod
        };
      }

      return { isDuplicate: false };

    } catch (error) {
      this.logger.error(`Failed to check duplicate for article ${articleId}`, error);
      throw error;
    }
  }

  /**
   * Get articles that need processing
   */
  private async getArticlesToProcess(articleIds?: number[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT id, title, description, content, url, url_hash, published_at,
               source_id, source_name, embedding_vector, is_duplicate
        FROM articles
        WHERE is_processed = 0
      `;

      const params: any[] = [];

      if (articleIds && articleIds.length > 0) {
        query += ` AND id IN (${articleIds.map(() => '?').join(',')})`;
        params.push(...articleIds);
      }

      // Only process recent articles to avoid excessive comparisons
      query += ` AND published_at > datetime('now', '-${this.config.maxComparisonDistance} days')`;
      query += ` ORDER BY published_at DESC`;

      this.database.all(query, params, (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Generate embeddings for articles that don't have them
   */
  private async generateMissingEmbeddings(articles: any[]): Promise<number> {
    const articlesNeedingEmbeddings = articles.filter(article => !article.embedding_vector);

    if (articlesNeedingEmbeddings.length === 0) {
      return 0;
    }

    this.logger.info(`Generating embeddings for ${articlesNeedingEmbeddings.length} articles`);

    let generated = 0;

    // Process in batches
    for (let i = 0; i < articlesNeedingEmbeddings.length; i += this.config.batchSize) {
      const batch = articlesNeedingEmbeddings.slice(i, i + this.config.batchSize);

      try {
        // Prepare texts for embedding
        const texts = batch.map(article => this.prepareTextForEmbedding(article));

        // Generate embeddings
        const embeddings = await this.embeddingAPI.generateBatchEmbeddings(texts);

        // Save embeddings to database
        for (let j = 0; j < batch.length; j++) {
          const article = batch[j];
          const embedding = embeddings[j];

          await this.saveEmbeddingToDatabase(article.id, embedding);

          // Update local article object
          article.embedding_vector = JSON.stringify(embedding);

          generated++;
        }

        this.logger.debug(`Generated embeddings for batch ${i / this.config.batchSize + 1}`);

      } catch (error) {
        this.logger.error(`Failed to generate embeddings for batch starting at ${i}`, error);
        // Continue with next batch
      }
    }

    return generated;
  }

  /**
   * Find duplicates using various methods
   */
  private async findDuplicates(articles: any[]): Promise<number> {
    let duplicatesFound = 0;

    // Method 1: Exact URL matching (should be handled earlier, but double-check)
    duplicatesFound += await this.findExactUrlDuplicates(articles);

    // Method 2: Title similarity
    if (this.config.enableTitleMatching) {
      duplicatesFound += await this.findTitleDuplicates(articles);
    }

    // Method 3: Content fuzzy matching
    if (this.config.enableFuzzyMatching) {
      duplicatesFound += await this.findFuzzyDuplicates(articles);
    }

    // Method 4: Semantic similarity using embeddings
    const semanticDuplicates = await this.findSemanticDuplicates(articles);
    duplicatesFound += await this.markDuplicates(semanticDuplicates);

    return duplicatesFound;
  }

  /**
   * Quick duplicate checks (URL, exact title match)
   */
  private async quickDuplicateCheck(article: any): Promise<{
    isDuplicate: boolean;
    duplicateOf?: number;
    similarityScore?: number;
    method?: string;
  } | null> {
    // Check for exact URL match
    const urlDuplicate = await this.findExistingArticleByUrl(article.url_hash, article.id);
    if (urlDuplicate) {
      return {
        isDuplicate: true,
        duplicateOf: urlDuplicate.id,
        similarityScore: 1.0,
        method: 'exact_url'
      };
    }

    // Check for exact title match
    if (this.config.enableTitleMatching) {
      const titleDuplicate = await this.findExistingArticleByTitle(article.title, article.id);
      if (titleDuplicate) {
        const similarity = this.calculateTextSimilarity(article.title, titleDuplicate.title);
        if (similarity > 0.95) {
          return {
            isDuplicate: true,
            duplicateOf: titleDuplicate.id,
            similarityScore: similarity,
            method: 'exact_title'
          };
        }
      }
    }

    return null;
  }

  /**
   * Find semantic duplicates using embeddings
   */
  private async findSemanticDuplicates(articles: any[]): Promise<SimilarityResult[]> {
    const duplicates: SimilarityResult[] = [];

    // Get existing articles for comparison (within time window)
    const existingArticles = await this.getRecentArticlesWithEmbeddings(articles[0]?.published_at);

    for (const article of articles) {
      if (!article.embedding_vector) continue;

      const articleEmbedding = JSON.parse(article.embedding_vector);

      for (const existing of existingArticles) {
        if (existing.id === article.id) continue;
        if (existing.is_duplicate) continue; // Don't compare against already marked duplicates

        if (!existing.embedding_vector) continue;

        const existingEmbedding = JSON.parse(existing.embedding_vector);

        // Calculate cosine similarity
        const similarity = this.calculateCosineSimilarity(articleEmbedding, existingEmbedding);

        if (similarity >= this.config.similarityThreshold) {
          duplicates.push({
            article1Id: article.id,
            article2Id: existing.id,
            similarityScore: similarity,
            comparisonMethod: 'cosine'
          });

          // Mark article as duplicate to avoid further processing
          article.is_duplicate = true;
          break; // Found a duplicate, no need to check further
        }
      }
    }

    return duplicates;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Find title-based duplicates
   */
  private async findTitleDuplicates(articles: any[]): Promise<number> {
    let found = 0;

    for (const article of articles) {
      if (article.is_duplicate) continue;

      const similar = await this.findSimilarTitles(article.title, article.id);

      for (const similarArticle of similar) {
        const similarity = this.calculateTextSimilarity(article.title, similarArticle.title);

        if (similarity >= 0.9) {
          await this.markArticleAsDuplicate(article.id, similarArticle.id, similarity, 'title_similarity');
          article.is_duplicate = true;
          found++;
          break;
        }
      }
    }

    return found;
  }

  /**
   * Find fuzzy content duplicates
   */
  private async findFuzzyDuplicates(articles: any[]): Promise<number> {
    let found = 0;

    for (const article of articles) {
      if (article.is_duplicate) continue;

      const contentWords = this.extractKeywords(article.content || article.description || '');
      if (contentWords.length < 5) continue; // Skip articles with too few words

      // Find articles with similar content keywords
      const candidates = await this.findArticlesByKeywords(contentWords, article.id);

      for (const candidate of candidates) {
        const candidateWords = this.extractKeywords(candidate.content || candidate.description || '');
        const similarity = this.calculateJaccardSimilarity(contentWords, candidateWords);

        if (similarity >= 0.7) {
          await this.markArticleAsDuplicate(article.id, candidate.id, similarity, 'fuzzy_content');
          article.is_duplicate = true;
          found++;
          break;
        }
      }
    }

    return found;
  }

  /**
   * Extract keywords from text for fuzzy matching
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
      .slice(0, 20); // Limit to top 20 words
  }

  /**
   * Simple stop words list
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'since', 'without',
      'under', 'within', 'along', 'following', 'across', 'behind', 'beyond',
      'plus', 'except', 'but', 'versus', 'via', 'than', 'this', 'that',
      'these', 'those', 'said', 'says', 'will', 'would', 'could', 'should'
    ]);

    return stopWords.has(word);
  }

  /**
   * Calculate Jaccard similarity
   */
  private calculateJaccardSimilarity(set1: string[], set2: string[]): number {
    const s1 = new Set(set1);
    const s2 = new Set(set2);

    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculate text similarity using simple metrics
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    return this.calculateJaccardSimilarity(words1, words2);
  }

  /**
   * Prepare text for embedding generation
   */
  private prepareTextForEmbedding(article: any): string {
    const title = article.title || '';
    const description = article.description || '';
    const content = article.content || '';

    // Combine title (weighted more) with description and content
    let text = `${title} ${title} ${description}`;

    if (content && content.length > description.length) {
      text += ` ${content.substring(0, 1000)}`; // Limit content length
    }

    return text.trim();
  }

  /**
   * Database operations
   */
  private async getArticleById(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.database.get(
        'SELECT * FROM articles WHERE id = ?',
        [id],
        (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  private async getRecentArticlesWithEmbeddings(fromDate?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const cutoff = fromDate || new Date(Date.now() - this.config.maxComparisonDistance * 24 * 60 * 60 * 1000).toISOString();

      this.database.all(
        `SELECT id, title, description, embedding_vector, is_duplicate
         FROM articles
         WHERE embedding_vector IS NOT NULL
         AND published_at > ?
         AND is_duplicate = 0
         ORDER BY published_at DESC`,
        [cutoff],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  private async saveEmbeddingToDatabase(articleId: number, embedding: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.run(
        'UPDATE articles SET embedding_vector = ?, embedding_model = ? WHERE id = ?',
        [JSON.stringify(embedding), this.config.embeddingModel, articleId],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async markArticleAsDuplicate(
    articleId: number,
    duplicateOfId: number,
    similarityScore: number,
    method: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.serialize(() => {
        // Mark article as duplicate
        this.database.run(
          'UPDATE articles SET is_duplicate = 1, duplicate_of = ? WHERE id = ?',
          [duplicateOfId, articleId],
          (err: any) => {
            if (err) {
              reject(err);
              return;
            }

            // Record similarity
            this.database.run(
              `INSERT OR REPLACE INTO article_similarities
               (article1_id, article2_id, similarity_score, comparison_method)
               VALUES (?, ?, ?, ?)`,
              [articleId, duplicateOfId, similarityScore, method],
              (err: any) => {
                if (err) reject(err);
                else resolve();
              }
            );
          }
        );
      });
    });
  }

  private async markDuplicates(similarities: SimilarityResult[]): Promise<number> {
    let marked = 0;

    for (const similarity of similarities) {
      try {
        await this.markArticleAsDuplicate(
          similarity.article1Id,
          similarity.article2Id,
          similarity.similarityScore,
          similarity.comparisonMethod
        );
        marked++;
      } catch (error) {
        this.logger.error('Failed to mark duplicate', { similarity, error });
      }
    }

    return marked;
  }

  private async findExactUrlDuplicates(articles: any[]): Promise<number> {
    let found = 0;

    for (const article of articles) {
      const existing = await this.findExistingArticleByUrl(article.url_hash, article.id);
      if (existing) {
        await this.markArticleAsDuplicate(article.id, existing.id, 1.0, 'exact_url');
        found++;
      }
    }

    return found;
  }

  private async findExistingArticleByUrl(urlHash: string, excludeId?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT id FROM articles WHERE url_hash = ? AND is_duplicate = 0';
      const params = [urlHash];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      query += ' LIMIT 1';

      this.database.get(query, params, (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private async findExistingArticleByTitle(title: string, excludeId?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT id, title FROM articles WHERE title = ? AND is_duplicate = 0';
      const params = [title];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      query += ' LIMIT 1';

      this.database.get(query, params, (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private async findSimilarTitles(title: string, excludeId: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Use SQLite's LIKE for basic similarity (could be enhanced with FTS)
      const titleWords = title.split(' ').slice(0, 3); // First 3 words
      const likePattern = `%${titleWords.join('%')}%`;

      this.database.all(
        'SELECT id, title FROM articles WHERE title LIKE ? AND id != ? AND is_duplicate = 0 LIMIT 10',
        [likePattern, excludeId],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  private async findArticlesByKeywords(keywords: string[], excludeId: number): Promise<any[]> {
    // This is a simplified version - in production, you'd use proper full-text search
    return new Promise((resolve, reject) => {
      const keywordPattern = keywords.slice(0, 5).join('|');

      this.database.all(
        `SELECT id, content, description FROM articles
         WHERE (content LIKE ? OR description LIKE ?)
         AND id != ? AND is_duplicate = 0
         AND published_at > datetime('now', '-7 days')
         LIMIT 20`,
        [`%${keywordPattern}%`, `%${keywordPattern}%`, excludeId],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  private async generateEmbeddingForArticle(article: any): Promise<void> {
    const text = this.prepareTextForEmbedding(article);
    const embedding = await this.embeddingAPI.generateEmbedding(text);
    await this.saveEmbeddingToDatabase(article.id, embedding);
  }

  private calculateSimilarityChecks(articleCount: number): number {
    // Rough estimate of pairwise comparisons made
    return Math.floor((articleCount * (articleCount - 1)) / 2);
  }

  /**
   * Get deduplication statistics
   */
  async getStats(): Promise<{
    totalArticles: number;
    duplicateArticles: number;
    uniqueArticles: number;
    articlesWithEmbeddings: number;
    duplicatesByMethod: { [method: string]: number };
  }> {
    return new Promise((resolve, reject) => {
      this.database.serialize(() => {
        let stats: any = {};

        // Total and duplicate counts
        this.database.get(
          'SELECT COUNT(*) as total, SUM(is_duplicate) as duplicates FROM articles',
          (err: any, row: any) => {
            if (err) {
              reject(err);
              return;
            }
            stats.totalArticles = row.total;
            stats.duplicateArticles = row.duplicates;
            stats.uniqueArticles = row.total - row.duplicates;

            // Articles with embeddings
            this.database.get(
              'SELECT COUNT(*) as count FROM articles WHERE embedding_vector IS NOT NULL',
              (err: any, row: any) => {
                if (err) {
                  reject(err);
                  return;
                }
                stats.articlesWithEmbeddings = row.count;

                // Duplicates by method
                this.database.all(
                  'SELECT comparison_method, COUNT(*) as count FROM article_similarities GROUP BY comparison_method',
                  (err: any, rows: any[]) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    stats.duplicatesByMethod = {};
                    if (rows) {
                      rows.forEach(row => {
                        stats.duplicatesByMethod[row.comparison_method] = row.count;
                      });
                    }

                    resolve(stats);
                  }
                );
              }
            );
          }
        );
      });
    });
  }
}