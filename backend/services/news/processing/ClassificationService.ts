/**
 * Article Classification Service using BERT
 * Classifies news articles into predefined categories with confidence scores
 */

import { Article, ClassificationResult, KeywordExtractionResult } from '../types/NewsTypes';

interface ClassificationConfig {
  model: string;
  confidenceThreshold: number;
  maxCategories: number;
  enableKeywordExtraction: boolean;
  batchSize: number;
}

interface ClassificationAPI {
  classifyText(text: string, categories?: string[]): Promise<{
    category: string;
    confidence: number;
    allScores?: { [category: string]: number };
  }>;
  classifyBatch(texts: string[], categories?: string[]): Promise<Array<{
    category: string;
    confidence: number;
    allScores?: { [category: string]: number };
  }>>;
  extractKeywords(text: string, maxKeywords?: number): Promise<Array<{
    keyword: string;
    score: number;
  }>>;
}

// Mock BERT API - in production, this would connect to a real BERT service
class MockBERTAPI implements ClassificationAPI {
  private categories = [
    'general', 'business', 'technology', 'science', 'health',
    'sports', 'entertainment', 'politics', 'world'
  ];

  async classifyText(text: string, categories?: string[]): Promise<{
    category: string;
    confidence: number;
    allScores?: { [category: string]: number };
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const targetCategories = categories || this.categories;
    const scores: { [category: string]: number } = {};

    // Simple keyword-based mock classification
    const lowerText = text.toLowerCase();

    // Business keywords
    const businessKeywords = ['business', 'market', 'economy', 'financial', 'stock', 'company', 'corporate', 'trade', 'investment', 'revenue'];
    scores.business = this.calculateKeywordScore(lowerText, businessKeywords);

    // Technology keywords
    const techKeywords = ['technology', 'tech', 'software', 'ai', 'artificial intelligence', 'computer', 'internet', 'digital', 'app', 'startup', 'innovation'];
    scores.technology = this.calculateKeywordScore(lowerText, techKeywords);

    // Science keywords
    const scienceKeywords = ['science', 'research', 'study', 'scientist', 'discovery', 'experiment', 'laboratory', 'scientific', 'analysis', 'data'];
    scores.science = this.calculateKeywordScore(lowerText, scienceKeywords);

    // Health keywords
    const healthKeywords = ['health', 'medical', 'hospital', 'doctor', 'patient', 'disease', 'treatment', 'medicine', 'healthcare', 'virus'];
    scores.health = this.calculateKeywordScore(lowerText, healthKeywords);

    // Sports keywords
    const sportsKeywords = ['sports', 'game', 'team', 'player', 'match', 'tournament', 'championship', 'league', 'coach', 'athlete'];
    scores.sports = this.calculateKeywordScore(lowerText, sportsKeywords);

    // Politics keywords
    const politicsKeywords = ['politics', 'government', 'election', 'president', 'minister', 'congress', 'parliament', 'policy', 'law', 'vote'];
    scores.politics = this.calculateKeywordScore(lowerText, politicsKeywords);

    // Entertainment keywords
    const entertainmentKeywords = ['entertainment', 'movie', 'film', 'music', 'celebrity', 'actor', 'actress', 'show', 'concert', 'festival'];
    scores.entertainment = this.calculateKeywordScore(lowerText, entertainmentKeywords);

    // World news keywords
    const worldKeywords = ['international', 'global', 'world', 'country', 'nation', 'foreign', 'embassy', 'diplomat', 'border', 'treaty'];
    scores.world = this.calculateKeywordScore(lowerText, worldKeywords);

    // General gets a base score
    scores.general = 0.3;

    // Find the category with highest score
    const sortedScores = Object.entries(scores)
      .filter(([cat]) => targetCategories.includes(cat))
      .sort(([,a], [,b]) => b - a);

    const topCategory = sortedScores[0];

    return {
      category: topCategory[0],
      confidence: Math.min(topCategory[1], 0.95), // Cap confidence
      allScores: scores
    };
  }

  private calculateKeywordScore(text: string, keywords: string[]): number {
    let score = 0;
    const textWords = text.split(/\s+/);

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        // Boost score for exact keyword match
        score += 0.2;

        // Additional boost for keyword in title-like position (beginning of text)
        if (text.substring(0, 100).includes(keyword)) {
          score += 0.1;
        }
      }
    }

    // Normalize by text length (longer texts might naturally have more matches)
    const lengthFactor = Math.min(textWords.length / 100, 1);
    score *= lengthFactor;

    // Add some randomness to simulate real classification uncertainty
    score += (Math.random() - 0.5) * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  async classifyBatch(texts: string[], categories?: string[]): Promise<Array<{
    category: string;
    confidence: number;
    allScores?: { [category: string]: number };
  }>> {
    // Process in smaller batches to simulate API limits
    const batchSize = 5;
    const results: Array<{
      category: string;
      confidence: number;
      allScores?: { [category: string]: number };
    }> = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.classifyText(text, categories));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  async extractKeywords(text: string, maxKeywords = 10): Promise<Array<{
    keyword: string;
    score: number;
  }>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));

    // Simple keyword extraction based on word frequency and length
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    const wordFreq: { [word: string]: number } = {};

    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Calculate scores based on frequency and word importance
    const keywords = Object.entries(wordFreq)
      .map(([word, freq]) => ({
        keyword: word,
        score: Math.min(freq / words.length * 10, 1) // Normalize and cap
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxKeywords);

    return keywords;
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'since', 'without',
      'under', 'within', 'along', 'following', 'across', 'behind', 'beyond',
      'plus', 'except', 'but', 'versus', 'via', 'than', 'this', 'that',
      'these', 'those', 'said', 'says', 'will', 'would', 'could', 'should',
      'have', 'has', 'had', 'been', 'being', 'were', 'was', 'are', 'is',
      'can', 'may', 'might', 'must', 'shall'
    ]);

    return stopWords.has(word);
  }
}

export class ClassificationService {
  private config: ClassificationConfig;
  private database: any;
  private classificationAPI: ClassificationAPI;
  private logger: any;

  constructor(
    database: any,
    classificationAPI?: ClassificationAPI,
    config?: Partial<ClassificationConfig>,
    logger?: any
  ) {
    this.database = database;
    this.classificationAPI = classificationAPI || new MockBERTAPI();
    this.logger = logger || console;

    this.config = {
      model: 'bert-base-uncased',
      confidenceThreshold: 0.6,
      maxCategories: 3,
      enableKeywordExtraction: true,
      batchSize: 20,
      ...config
    };
  }

  /**
   * Classify articles and update their categories
   */
  async processArticles(articleIds?: number[]): Promise<{
    processed: number;
    classified: number;
    keywordsExtracted: number;
    categoryCounts: { [category: string]: number };
  }> {
    const startTime = Date.now();

    try {
      // Get articles to classify
      const articles = await this.getArticlesToClassify(articleIds);

      if (articles.length === 0) {
        return {
          processed: 0,
          classified: 0,
          keywordsExtracted: 0,
          categoryCounts: {}
        };
      }

      this.logger.info(`Classifying ${articles.length} articles`);

      // Process articles in batches
      let classified = 0;
      let keywordsExtracted = 0;
      const categoryCounts: { [category: string]: number } = {};

      for (let i = 0; i < articles.length; i += this.config.batchSize) {
        const batch = articles.slice(i, i + this.config.batchSize);

        try {
          // Classify batch
          const batchResults = await this.classifyBatch(batch);
          classified += batchResults.filter(r => r.success).length;

          // Update category counts
          batchResults.forEach(result => {
            if (result.success && result.classification) {
              const category = result.classification.category;
              categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
          });

          // Extract keywords if enabled
          if (this.config.enableKeywordExtraction) {
            const keywordResults = await this.extractKeywordsBatch(batch);
            keywordsExtracted += keywordResults.filter(r => r.success).length;
          }

          this.logger.debug(`Processed batch ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(articles.length / this.config.batchSize)}`);

        } catch (error) {
          this.logger.error(`Failed to process batch starting at ${i}`, error);
          // Continue with next batch
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info('Classification processing completed', {
        processed: articles.length,
        classified,
        keywordsExtracted,
        categoryCounts,
        duration: `${duration}ms`
      });

      return {
        processed: articles.length,
        classified,
        keywordsExtracted,
        categoryCounts
      };

    } catch (error) {
      this.logger.error('Classification processing failed', error);
      throw error;
    }
  }

  /**
   * Classify a single article
   */
  async classifyArticle(articleId: number, forceReclassify = false): Promise<{
    success: boolean;
    classification?: ClassificationResult;
    keywords?: KeywordExtractionResult;
    error?: string;
  }> {
    try {
      const article = await this.getArticleById(articleId);
      if (!article) {
        throw new Error(`Article ${articleId} not found`);
      }

      // Check if already classified
      if (!forceReclassify) {
        const existingClassification = await this.getExistingClassification(articleId);
        if (existingClassification) {
          return {
            success: true,
            classification: existingClassification
          };
        }
      }

      // Prepare text for classification
      const text = this.prepareTextForClassification(article);

      // Classify article
      const classificationResult = await this.classificationAPI.classifyText(text);

      if (classificationResult.confidence < this.config.confidenceThreshold) {
        this.logger.debug(`Low confidence classification for article ${articleId}: ${classificationResult.confidence}`);
      }

      // Save classification result
      const classification: ClassificationResult = {
        articleId,
        category: classificationResult.category,
        confidence: classificationResult.confidence,
        classifierModel: this.config.model
      };

      await this.saveClassificationToDatabase(classification);

      // Update article's primary category
      await this.updateArticleCategory(articleId, classificationResult.category, classificationResult.confidence);

      // Extract keywords if enabled
      let keywords: KeywordExtractionResult | undefined;
      if (this.config.enableKeywordExtraction) {
        try {
          const keywordResult = await this.classificationAPI.extractKeywords(text);

          keywords = {
            articleId,
            keywords: keywordResult.map(k => ({
              keyword: k.keyword,
              relevanceScore: k.score
            })),
            extractionMethod: 'bert_keywords'
          };

          await this.saveKeywordsToDatabase(keywords);
        } catch (error) {
          this.logger.warn(`Failed to extract keywords for article ${articleId}`, error);
        }
      }

      return {
        success: true,
        classification,
        keywords
      };

    } catch (error) {
      this.logger.error(`Failed to classify article ${articleId}`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get classification statistics
   */
  async getStats(): Promise<{
    totalArticles: number;
    classifiedArticles: number;
    unclassifiedArticles: number;
    categoryDistribution: { [category: string]: number };
    averageConfidence: number;
    modelUsage: { [model: string]: number };
  }> {
    return new Promise((resolve, reject) => {
      this.database.serialize(() => {
        let stats: any = {};

        // Total and classified counts
        this.database.get(
          `SELECT
             COUNT(*) as total,
             COUNT(CASE WHEN category IS NOT NULL AND category != 'general' THEN 1 END) as classified
           FROM articles`,
          (err: any, row: any) => {
            if (err) {
              reject(err);
              return;
            }
            stats.totalArticles = row.total;
            stats.classifiedArticles = row.classified;
            stats.unclassifiedArticles = row.total - row.classified;

            // Category distribution
            this.database.all(
              'SELECT category, COUNT(*) as count FROM articles WHERE category IS NOT NULL GROUP BY category',
              (err: any, rows: any[]) => {
                if (err) {
                  reject(err);
                  return;
                }

                stats.categoryDistribution = {};
                if (rows) {
                  rows.forEach(row => {
                    stats.categoryDistribution[row.category] = row.count;
                  });
                }

                // Average confidence
                this.database.get(
                  'SELECT AVG(confidence) as avg_confidence FROM article_categories WHERE confidence > 0',
                  (err: any, row: any) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    stats.averageConfidence = row.avg_confidence || 0;

                    // Model usage
                    this.database.all(
                      'SELECT classifier_model, COUNT(*) as count FROM article_categories GROUP BY classifier_model',
                      (err: any, rows: any[]) => {
                        if (err) {
                          reject(err);
                          return;
                        }

                        stats.modelUsage = {};
                        if (rows) {
                          rows.forEach(row => {
                            stats.modelUsage[row.classifier_model] = row.count;
                          });
                        }

                        resolve(stats);
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  /**
   * Reclassify articles with low confidence scores
   */
  async reclassifyLowConfidenceArticles(threshold = 0.7): Promise<{
    processed: number;
    improved: number;
    degraded: number;
  }> {
    const articles = await this.getLowConfidenceArticles(threshold);

    let improved = 0;
    let degraded = 0;

    for (const article of articles) {
      try {
        const result = await this.classifyArticle(article.id, true);

        if (result.success && result.classification) {
          if (result.classification.confidence > threshold) {
            improved++;
          } else if (result.classification.confidence < article.confidence) {
            degraded++;
          }
        }
      } catch (error) {
        this.logger.error(`Failed to reclassify article ${article.id}`, error);
      }
    }

    return {
      processed: articles.length,
      improved,
      degraded
    };
  }

  /**
   * Private helper methods
   */
  private async getArticlesToClassify(articleIds?: number[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT id, title, description, content, category, confidence_score
        FROM articles
        WHERE (category IS NULL OR category = 'general' OR confidence_score < ?)
      `;

      const params: any[] = [this.config.confidenceThreshold];

      if (articleIds && articleIds.length > 0) {
        query += ` AND id IN (${articleIds.map(() => '?').join(',')})`;
        params.push(...articleIds);
      }

      query += ` ORDER BY fetched_at DESC LIMIT 1000`;

      this.database.all(query, params, (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  private async classifyBatch(articles: any[]): Promise<Array<{
    success: boolean;
    articleId: number;
    classification?: ClassificationResult;
    error?: string;
  }>> {
    try {
      // Prepare texts for classification
      const texts = articles.map(article => this.prepareTextForClassification(article));

      // Classify batch
      const results = await this.classificationAPI.classifyBatch(texts);

      // Process results
      const processedResults = [];

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const result = results[i];

        try {
          if (result.confidence >= this.config.confidenceThreshold) {
            const classification: ClassificationResult = {
              articleId: article.id,
              category: result.category,
              confidence: result.confidence,
              classifierModel: this.config.model
            };

            await this.saveClassificationToDatabase(classification);
            await this.updateArticleCategory(article.id, result.category, result.confidence);

            processedResults.push({
              success: true,
              articleId: article.id,
              classification
            });
          } else {
            // Low confidence - keep as general
            processedResults.push({
              success: false,
              articleId: article.id,
              error: `Low confidence: ${result.confidence}`
            });
          }
        } catch (error) {
          processedResults.push({
            success: false,
            articleId: article.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      return processedResults;

    } catch (error) {
      // Return failure for all articles in batch
      return articles.map(article => ({
        success: false,
        articleId: article.id,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  private async extractKeywordsBatch(articles: any[]): Promise<Array<{
    success: boolean;
    articleId: number;
    keywords?: KeywordExtractionResult;
    error?: string;
  }>> {
    const results = [];

    for (const article of articles) {
      try {
        const text = this.prepareTextForClassification(article);
        const keywordResult = await this.classificationAPI.extractKeywords(text);

        const keywords: KeywordExtractionResult = {
          articleId: article.id,
          keywords: keywordResult.map(k => ({
            keyword: k.keyword,
            relevanceScore: k.score
          })),
          extractionMethod: 'bert_keywords'
        };

        await this.saveKeywordsToDatabase(keywords);

        results.push({
          success: true,
          articleId: article.id,
          keywords
        });

      } catch (error) {
        results.push({
          success: false,
          articleId: article.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  private prepareTextForClassification(article: any): string {
    const title = article.title || '';
    const description = article.description || '';
    const content = article.content || '';

    // Combine title (weighted more heavily) with description and content
    let text = `${title}. ${description}`;

    if (content && content.length > description.length) {
      text += ` ${content.substring(0, 2000)}`; // Limit content length
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

  private async getExistingClassification(articleId: number): Promise<ClassificationResult | null> {
    return new Promise((resolve, reject) => {
      this.database.get(
        'SELECT * FROM article_categories WHERE article_id = ? ORDER BY created_at DESC LIMIT 1',
        [articleId],
        (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row ? {
            articleId: row.article_id,
            category: row.category,
            confidence: row.confidence,
            classifierModel: row.classifier_model
          } : null);
        }
      );
    });
  }

  private async saveClassificationToDatabase(classification: ClassificationResult): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.run(
        `INSERT OR REPLACE INTO article_categories
         (article_id, category, confidence, classifier_model, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          classification.articleId,
          classification.category,
          classification.confidence,
          classification.classifierModel,
          new Date().toISOString()
        ],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async updateArticleCategory(articleId: number, category: string, confidence: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.run(
        'UPDATE articles SET category = ?, confidence_score = ? WHERE id = ?',
        [category, confidence, articleId],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async saveKeywordsToDatabase(keywords: KeywordExtractionResult): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.serialize(() => {
        // Delete existing keywords for this article
        this.database.run(
          'DELETE FROM article_keywords WHERE article_id = ?',
          [keywords.articleId],
          (err: any) => {
            if (err) {
              reject(err);
              return;
            }

            // Insert new keywords
            const stmt = this.database.prepare(
              `INSERT INTO article_keywords
               (article_id, keyword, relevance_score, extraction_method, created_at)
               VALUES (?, ?, ?, ?, ?)`
            );

            for (const keyword of keywords.keywords) {
              stmt.run([
                keywords.articleId,
                keyword.keyword,
                keyword.relevanceScore,
                keywords.extractionMethod,
                new Date().toISOString()
              ]);
            }

            stmt.finalize((err: any) => {
              if (err) reject(err);
              else resolve();
            });
          }
        );
      });
    });
  }

  private async getLowConfidenceArticles(threshold: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.database.all(
        'SELECT id, confidence_score as confidence FROM articles WHERE confidence_score < ? AND confidence_score > 0',
        [threshold],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}