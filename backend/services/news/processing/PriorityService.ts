/**
 * Priority System for News Articles
 * Intelligently assigns priority levels: breaking > trending > regular
 */

import { Article, Priority } from '../types/NewsTypes';

interface PriorityConfig {
  breakingThreshold: number;
  trendingThreshold: number;
  timeDecayFactor: number;
  sourceWeights: { [sourceType: string]: number };
  categoryWeights: { [category: string]: number };
  enableTimeDecay: boolean;
  enableSourceWeighting: boolean;
  updateIntervalMinutes: number;
}

interface PriorityFactors {
  keywordScore: number;
  timeScore: number;
  sourceScore: number;
  categoryScore: number;
  engagementScore: number;
  duplicateScore: number;
}

interface PriorityResult {
  articleId: number;
  oldPriority: Priority;
  newPriority: Priority;
  score: number;
  factors: PriorityFactors;
  reason: string;
}

export class PriorityService {
  private config: PriorityConfig;
  private database: any;
  private logger: any;

  // Breaking news keywords
  private breakingKeywords = [
    'breaking', 'urgent', 'alert', 'developing', 'live', 'just in',
    'update', 'emergency', 'crisis', 'tragic', 'accident', 'attack',
    'explosion', 'fire', 'earthquake', 'disaster', 'dead', 'killed',
    'injured', 'arrested', 'shooting', 'crash', 'collision'
  ];

  // Trending keywords
  private trendingKeywords = [
    'viral', 'trending', 'popular', 'exclusive', 'major', 'significant',
    'important', 'announcement', 'reveals', 'launches', 'introduces',
    'breakthrough', 'revolutionary', 'unprecedented', 'historic',
    'milestone', 'record', 'first ever', 'groundbreaking'
  ];

  // Time-sensitive keywords that boost priority when recent
  private timeSensitiveKeywords = [
    'today', 'tonight', 'now', 'currently', 'happening', 'ongoing',
    'minutes ago', 'hours ago', 'this morning', 'this evening',
    'immediate', 'instant', 'sudden', 'unexpected'
  ];

  constructor(
    database: any,
    config?: Partial<PriorityConfig>,
    logger?: any
  ) {
    this.database = database;
    this.logger = logger || console;

    this.config = {
      breakingThreshold: 0.8,
      trendingThreshold: 0.6,
      timeDecayFactor: 0.1,
      sourceWeights: {
        'newsapi': 1.0,
        'rss': 0.9,
        'custom': 0.7
      },
      categoryWeights: {
        'politics': 1.2,
        'world': 1.1,
        'business': 1.0,
        'technology': 0.9,
        'science': 0.8,
        'health': 1.1,
        'sports': 0.7,
        'entertainment': 0.6,
        'general': 0.8
      },
      enableTimeDecay: true,
      enableSourceWeighting: true,
      updateIntervalMinutes: 15,
      ...config
    };
  }

  /**
   * Process articles and update their priorities
   */
  async processArticles(articleIds?: number[]): Promise<{
    processed: number;
    breaking: number;
    trending: number;
    regular: number;
    priorityChanges: PriorityResult[];
  }> {
    const startTime = Date.now();

    try {
      // Get articles to process
      const articles = await this.getArticlesToProcess(articleIds);

      if (articles.length === 0) {
        return {
          processed: 0,
          breaking: 0,
          trending: 0,
          regular: 0,
          priorityChanges: []
        };
      }

      this.logger.info(`Processing priority for ${articles.length} articles`);

      const priorityChanges: PriorityResult[] = [];
      let breaking = 0;
      let trending = 0;
      let regular = 0;

      // Process each article
      for (const article of articles) {
        try {
          const result = await this.calculateArticlePriority(article);

          if (result.newPriority !== result.oldPriority) {
            priorityChanges.push(result);
            await this.updateArticlePriority(result.articleId, result.newPriority, result.score);
          }

          // Count by new priority
          switch (result.newPriority) {
            case 'breaking':
              breaking++;
              break;
            case 'trending':
              trending++;
              break;
            case 'regular':
              regular++;
              break;
          }

        } catch (error) {
          this.logger.error(`Failed to process priority for article ${article.id}`, error);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info('Priority processing completed', {
        processed: articles.length,
        breaking,
        trending,
        regular,
        changes: priorityChanges.length,
        duration: `${duration}ms`
      });

      return {
        processed: articles.length,
        breaking,
        trending,
        regular,
        priorityChanges
      };

    } catch (error) {
      this.logger.error('Priority processing failed', error);
      throw error;
    }
  }

  /**
   * Calculate priority for a single article
   */
  async calculateArticlePriority(article: any): Promise<PriorityResult> {
    const factors = await this.calculatePriorityFactors(article);
    const totalScore = this.combinePriorityFactors(factors);

    const oldPriority = article.priority as Priority;
    let newPriority: Priority;
    let reason: string;

    // Determine priority based on score
    if (totalScore >= this.config.breakingThreshold) {
      newPriority = 'breaking';
      reason = this.generatePriorityReason(factors, 'breaking');
    } else if (totalScore >= this.config.trendingThreshold) {
      newPriority = 'trending';
      reason = this.generatePriorityReason(factors, 'trending');
    } else {
      newPriority = 'regular';
      reason = this.generatePriorityReason(factors, 'regular');
    }

    return {
      articleId: article.id,
      oldPriority,
      newPriority,
      score: totalScore,
      factors,
      reason
    };
  }

  /**
   * Calculate various factors that influence priority
   */
  private async calculatePriorityFactors(article: any): Promise<PriorityFactors> {
    const factors: PriorityFactors = {
      keywordScore: 0,
      timeScore: 0,
      sourceScore: 0,
      categoryScore: 0,
      engagementScore: 0,
      duplicateScore: 0
    };

    // 1. Keyword Score (breaking and trending keywords)
    factors.keywordScore = this.calculateKeywordScore(article);

    // 2. Time Score (recency boost)
    factors.timeScore = this.calculateTimeScore(article);

    // 3. Source Score (based on source reliability and type)
    factors.sourceScore = await this.calculateSourceScore(article);

    // 4. Category Score (some categories are more important)
    factors.categoryScore = this.calculateCategoryScore(article);

    // 5. Engagement Score (views, shares, etc.)
    factors.engagementScore = this.calculateEngagementScore(article);

    // 6. Duplicate Score (penalty for duplicates)
    factors.duplicateScore = this.calculateDuplicateScore(article);

    return factors;
  }

  /**
   * Calculate keyword-based priority score
   */
  private calculateKeywordScore(article: any): number {
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();

    let score = 0;

    // Breaking keywords (highest weight)
    const breakingMatches = this.breakingKeywords.filter(keyword =>
      text.includes(keyword)
    ).length;
    score += breakingMatches * 0.4;

    // Trending keywords (medium weight)
    const trendingMatches = this.trendingKeywords.filter(keyword =>
      text.includes(keyword)
    ).length;
    score += trendingMatches * 0.25;

    // Time-sensitive keywords (with recency boost)
    const timeSensitiveMatches = this.timeSensitiveKeywords.filter(keyword =>
      text.includes(keyword)
    ).length;

    if (timeSensitiveMatches > 0) {
      const hoursAgo = this.getHoursAgo(article.published_at);
      const recencyBoost = Math.max(0, 1 - hoursAgo / 24); // Boost decreases over 24 hours
      score += timeSensitiveMatches * 0.3 * recencyBoost;
    }

    // Title prominence (keywords in title are more important)
    const titleText = (article.title || '').toLowerCase();
    const titleBreakingMatches = this.breakingKeywords.filter(keyword =>
      titleText.includes(keyword)
    ).length;
    score += titleBreakingMatches * 0.2; // Additional boost for title

    // Cap the keyword score
    return Math.min(score, 1.0);
  }

  /**
   * Calculate time-based score (recency boost)
   */
  private calculateTimeScore(article: any): number {
    if (!this.config.enableTimeDecay) return 0.5;

    const hoursAgo = this.getHoursAgo(article.published_at);

    // Strong boost for very recent articles (first 2 hours)
    if (hoursAgo <= 2) {
      return 0.9;
    }

    // Medium boost for recent articles (first 6 hours)
    if (hoursAgo <= 6) {
      return 0.7;
    }

    // Gradual decay over time
    const decay = Math.exp(-hoursAgo * this.config.timeDecayFactor);
    return Math.max(0.1, decay);
  }

  /**
   * Calculate source-based score
   */
  private async calculateSourceScore(article: any): Promise<number> {
    if (!this.config.enableSourceWeighting) return 0.5;

    // Get source information
    const source = await this.getSourceInfo(article.source_id);
    if (!source) return 0.5;

    let score = 0.5; // Base score

    // Source type weight
    const typeWeight = this.config.sourceWeights[source.type] || 0.5;
    score *= typeWeight;

    // Source priority (1-10, where 1 is highest priority)
    const priorityScore = (11 - source.priority) / 10;
    score *= priorityScore;

    // Source reliability (based on error rate)
    const errorRate = source.consecutive_errors / Math.max(source.total_fetches || 1, 1);
    const reliabilityScore = Math.max(0.1, 1 - errorRate);
    score *= reliabilityScore;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate category-based score
   */
  private calculateCategoryScore(article: any): number {
    const category = article.category || 'general';
    const weight = this.config.categoryWeights[category] || 0.8;

    // Normalize to 0-1 range
    return Math.min(weight, 1.0);
  }

  /**
   * Calculate engagement-based score
   */
  private calculateEngagementScore(article: any): number {
    const views = article.view_count || 0;
    const likes = article.like_count || 0;
    const shares = article.share_count || 0;

    // Simple engagement calculation
    const totalEngagement = views * 0.1 + likes * 2 + shares * 5;

    // Logarithmic scale to prevent huge scores
    const engagementScore = Math.log(totalEngagement + 1) / 10;

    return Math.min(engagementScore, 1.0);
  }

  /**
   * Calculate duplicate penalty score
   */
  private calculateDuplicateScore(article: any): number {
    if (article.is_duplicate) {
      return -0.5; // Heavy penalty for duplicates
    }

    return 0; // No penalty for originals
  }

  /**
   * Combine all priority factors into final score
   */
  private combinePriorityFactors(factors: PriorityFactors): number {
    // Weighted combination of factors
    const weights = {
      keywordScore: 0.35,      // Most important
      timeScore: 0.25,         // Very important for breaking news
      sourceScore: 0.15,       // Source credibility matters
      categoryScore: 0.10,     // Category importance
      engagementScore: 0.10,   // User engagement
      duplicateScore: 0.05     // Duplicate penalty
    };

    let totalScore = 0;

    totalScore += factors.keywordScore * weights.keywordScore;
    totalScore += factors.timeScore * weights.timeScore;
    totalScore += factors.sourceScore * weights.sourceScore;
    totalScore += factors.categoryScore * weights.categoryScore;
    totalScore += factors.engagementScore * weights.engagementScore;
    totalScore += factors.duplicateScore * weights.duplicateScore;

    // Ensure score is in valid range
    return Math.max(0, Math.min(1, totalScore));
  }

  /**
   * Generate human-readable reason for priority assignment
   */
  private generatePriorityReason(factors: PriorityFactors, priority: Priority): string {
    const reasons: string[] = [];

    if (factors.keywordScore > 0.5) {
      reasons.push('contains breaking/trending keywords');
    }

    if (factors.timeScore > 0.7) {
      reasons.push('very recent article');
    }

    if (factors.sourceScore > 0.8) {
      reasons.push('high-priority source');
    }

    if (factors.engagementScore > 0.3) {
      reasons.push('high engagement');
    }

    if (factors.duplicateScore < 0) {
      reasons.push('duplicate content penalty');
    }

    const reason = reasons.length > 0
      ? `Classified as ${priority}: ${reasons.join(', ')}`
      : `Classified as ${priority} based on overall scoring`;

    return reason;
  }

  /**
   * Update multiple articles to breaking priority (for urgent situations)
   */
  async promoteToBreaking(articleIds: number[], reason: string): Promise<void> {
    for (const articleId of articleIds) {
      await this.updateArticlePriority(articleId, 'breaking', 1.0);
      this.logger.info(`Manually promoted article ${articleId} to breaking: ${reason}`);
    }
  }

  /**
   * Demote articles that are no longer breaking
   */
  async demoteStaleBreaking(maxAgeHours = 24): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const staleBreaking = await this.getStaleBreakingArticles(cutoffDate);
    let demoted = 0;

    for (const article of staleBreaking) {
      // Recalculate priority
      const result = await this.calculateArticlePriority(article);

      if (result.newPriority !== 'breaking') {
        await this.updateArticlePriority(article.id, result.newPriority, result.score);
        demoted++;

        this.logger.info(`Demoted stale breaking article ${article.id} to ${result.newPriority}`);
      }
    }

    return demoted;
  }

  /**
   * Get priority statistics
   */
  async getStats(): Promise<{
    totalArticles: number;
    priorityDistribution: { [priority: string]: number };
    averageScores: { [priority: string]: number };
    recentBreaking: number;
    staleBraking: number;
  }> {
    return new Promise((resolve, reject) => {
      this.database.serialize(() => {
        let stats: any = {};

        // Total articles
        this.database.get(
          'SELECT COUNT(*) as total FROM articles',
          (err: any, row: any) => {
            if (err) {
              reject(err);
              return;
            }
            stats.totalArticles = row.total;

            // Priority distribution
            this.database.all(
              'SELECT priority, COUNT(*) as count FROM articles GROUP BY priority',
              (err: any, rows: any[]) => {
                if (err) {
                  reject(err);
                  return;
                }

                stats.priorityDistribution = {};
                if (rows) {
                  rows.forEach(row => {
                    stats.priorityDistribution[row.priority] = row.count;
                  });
                }

                // Average confidence scores by priority
                this.database.all(
                  'SELECT priority, AVG(confidence_score) as avg_score FROM articles WHERE confidence_score > 0 GROUP BY priority',
                  (err: any, rows: any[]) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    stats.averageScores = {};
                    if (rows) {
                      rows.forEach(row => {
                        stats.averageScores[row.priority] = row.avg_score;
                      });
                    }

                    // Recent breaking news (last 24 hours)
                    this.database.get(
                      'SELECT COUNT(*) as count FROM articles WHERE priority = "breaking" AND published_at > datetime("now", "-1 day")',
                      (err: any, row: any) => {
                        if (err) {
                          reject(err);
                          return;
                        }
                        stats.recentBreaking = row.count;

                        // Stale breaking news (older than 24 hours)
                        this.database.get(
                          'SELECT COUNT(*) as count FROM articles WHERE priority = "breaking" AND published_at <= datetime("now", "-1 day")',
                          (err: any, row: any) => {
                            if (err) {
                              reject(err);
                              return;
                            }
                            stats.staleBreaking = row.count;

                            resolve(stats);
                          }
                        );
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
   * Helper methods
   */
  private getHoursAgo(publishedAt: string): number {
    const published = new Date(publishedAt);
    const now = new Date();
    return (now.getTime() - published.getTime()) / (1000 * 60 * 60);
  }

  private async getArticlesToProcess(articleIds?: number[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT id, title, description, content, published_at, source_id, category,
               priority, confidence_score, view_count, like_count, share_count, is_duplicate
        FROM articles
        WHERE published_at > datetime('now', '-7 days')
      `;

      const params: any[] = [];

      if (articleIds && articleIds.length > 0) {
        query += ` AND id IN (${articleIds.map(() => '?').join(',')})`;
        params.push(...articleIds);
      }

      query += ` ORDER BY published_at DESC`;

      this.database.all(query, params, (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  private async getSourceInfo(sourceId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.database.get(
        'SELECT type, priority, consecutive_errors FROM news_sources WHERE id = ?',
        [sourceId],
        (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  private async updateArticlePriority(articleId: number, priority: Priority, score: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.run(
        'UPDATE articles SET priority = ?, confidence_score = ?, updated_at = ? WHERE id = ?',
        [priority, score, new Date().toISOString(), articleId],
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async getStaleBreakingArticles(cutoffDate: Date): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.database.all(
        'SELECT * FROM articles WHERE priority = "breaking" AND published_at < ?',
        [cutoffDate.toISOString()],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Automated priority maintenance (can be called by scheduler)
   */
  async runMaintenance(): Promise<{
    processed: number;
    demoted: number;
    updated: number;
  }> {
    this.logger.info('Running priority maintenance');

    // Demote stale breaking news
    const demoted = await this.demoteStaleBreaking(24);

    // Reprocess recent articles (last 6 hours) for priority updates
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentArticles = await this.getRecentArticles(sixHoursAgo);

    let updated = 0;
    for (const article of recentArticles) {
      try {
        const result = await this.calculateArticlePriority(article);
        if (result.newPriority !== result.oldPriority) {
          await this.updateArticlePriority(result.articleId, result.newPriority, result.score);
          updated++;
        }
      } catch (error) {
        this.logger.error(`Failed to update priority for article ${article.id}`, error);
      }
    }

    this.logger.info('Priority maintenance completed', {
      processed: recentArticles.length,
      demoted,
      updated
    });

    return {
      processed: recentArticles.length,
      demoted,
      updated
    };
  }

  private async getRecentArticles(fromDate: Date): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.database.all(
        'SELECT * FROM articles WHERE published_at > ? ORDER BY published_at DESC',
        [fromDate.toISOString()],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}