/**
 * Full-Text Search Service using SQLite FTS5
 * Advanced search capabilities with ranking, filtering, and faceted search
 */

import { SearchOptions, SearchResult, Article } from '../types/NewsTypes';

interface SearchConfig {
  defaultLimit: number;
  maxLimit: number;
  enableFacets: boolean;
  enableHighlighting: boolean;
  enableSpellCheck: boolean;
  rankingWeights: {
    title: number;
    description: number;
    content: number;
    author: number;
    category: number;
  };
}

interface HighlightOptions {
  startTag: string;
  endTag: string;
  maxSnippets: number;
  snippetLength: number;
}

interface FacetCounts {
  categories: { [category: string]: number };
  sources: { [source: string]: number };
  priorities: { [priority: string]: number };
  authors: { [author: string]: number };
  dateRanges: { [range: string]: number };
}

export class SearchService {
  private config: SearchConfig;
  private database: any;
  private logger: any;

  constructor(
    database: any,
    config?: Partial<SearchConfig>,
    logger?: any
  ) {
    this.database = database;
    this.logger = logger || console;

    this.config = {
      defaultLimit: 20,
      maxLimit: 100,
      enableFacets: true,
      enableHighlighting: true,
      enableSpellCheck: false, // Would require additional setup
      rankingWeights: {
        title: 3.0,
        description: 2.0,
        content: 1.0,
        author: 1.5,
        category: 0.5
      },
      ...config
    };
  }

  /**
   * Main search function
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // Validate and normalize options
      const normalizedOptions = this.normalizeSearchOptions(options);

      // Build search query
      const { query, params } = this.buildSearchQuery(normalizedOptions);

      // Execute search
      const articles = await this.executeSearch(query, params);

      // Get total count (without limit/offset)
      const totalCount = await this.getTotalCount(normalizedOptions);

      // Generate facets if enabled
      let facets: FacetCounts | undefined;
      if (this.config.enableFacets && normalizedOptions.query) {
        facets = await this.generateFacets(normalizedOptions);
      }

      // Apply highlighting if enabled
      if (this.config.enableHighlighting && normalizedOptions.query) {
        await this.applyHighlighting(articles, normalizedOptions.query);
      }

      const duration = Date.now() - startTime;

      this.logger.debug('Search completed', {
        query: normalizedOptions.query,
        results: articles.length,
        totalCount,
        duration: `${duration}ms`
      });

      return {
        articles,
        totalCount,
        query: normalizedOptions.query || '',
        facets
      };

    } catch (error) {
      this.logger.error('Search failed', error);
      throw error;
    }
  }

  /**
   * Search for similar articles (more like this)
   */
  async findSimilar(articleId: number, limit = 10): Promise<Article[]> {
    try {
      // Get the reference article
      const article = await this.getArticleById(articleId);
      if (!article) {
        throw new Error(`Article ${articleId} not found`);
      }

      // Extract key terms from the article
      const keyTerms = this.extractKeyTerms(article);

      // Search for articles with similar terms
      const searchOptions: SearchOptions = {
        query: keyTerms.join(' OR '),
        limit,
        sortBy: 'relevance'
      };

      // Exclude the original article
      const result = await this.search(searchOptions);
      return result.articles.filter(a => a.id !== articleId);

    } catch (error) {
      this.logger.error(`Failed to find similar articles for ${articleId}`, error);
      throw error;
    }
  }

  /**
   * Get trending search terms
   */
  async getTrendingSearches(limit = 10): Promise<Array<{
    term: string;
    count: number;
    trend: 'rising' | 'stable' | 'falling';
  }>> {
    // This would require search query logging
    // For now, return empty array - implementation would depend on search tracking
    return [];
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSuggestions(partial: string, limit = 10): Promise<string[]> {
    if (!partial || partial.length < 2) {
      return [];
    }

    try {
      // Get suggestions from article titles, authors, and categories
      const suggestions = new Set<string>();

      // Title suggestions
      const titleSuggestions = await this.getTitleSuggestions(partial, limit);
      titleSuggestions.forEach(s => suggestions.add(s));

      // Author suggestions
      const authorSuggestions = await this.getAuthorSuggestions(partial, limit);
      authorSuggestions.forEach(s => suggestions.add(s));

      // Category suggestions
      const categorySuggestions = await this.getCategorySuggestions(partial);
      categorySuggestions.forEach(s => suggestions.add(s));

      return Array.from(suggestions).slice(0, limit);

    } catch (error) {
      this.logger.error('Failed to get suggestions', error);
      return [];
    }
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(criteria: {
    title?: string;
    author?: string;
    content?: string;
    category?: string;
    source?: string;
    dateFrom?: Date;
    dateTo?: Date;
    priority?: string;
    minWords?: number;
    maxWords?: number;
  }): Promise<SearchResult> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];

      // Build FTS query parts
      const ftsConditions: string[] = [];

      if (criteria.title) {
        ftsConditions.push(`title:${this.escapeFTSQuery(criteria.title)}`);
      }

      if (criteria.author) {
        ftsConditions.push(`author:${this.escapeFTSQuery(criteria.author)}`);
      }

      if (criteria.content) {
        ftsConditions.push(`content:${this.escapeFTSQuery(criteria.content)}`);
      }

      // Non-FTS conditions
      if (criteria.category) {
        conditions.push('a.category = ?');
        params.push(criteria.category);
      }

      if (criteria.source) {
        conditions.push('a.source_name = ?');
        params.push(criteria.source);
      }

      if (criteria.priority) {
        conditions.push('a.priority = ?');
        params.push(criteria.priority);
      }

      if (criteria.dateFrom) {
        conditions.push('a.published_at >= ?');
        params.push(criteria.dateFrom.toISOString());
      }

      if (criteria.dateTo) {
        conditions.push('a.published_at <= ?');
        params.push(criteria.dateTo.toISOString());
      }

      if (criteria.minWords) {
        conditions.push('a.word_count >= ?');
        params.push(criteria.minWords);
      }

      if (criteria.maxWords) {
        conditions.push('a.word_count <= ?');
        params.push(criteria.maxWords);
      }

      // Build query
      let query: string;

      if (ftsConditions.length > 0) {
        // Use FTS search
        query = `
          SELECT a.*, bm25(articles_fts) as rank
          FROM articles_fts
          JOIN articles a ON articles_fts.rowid = a.id
          WHERE articles_fts MATCH ?
        `;
        params.unshift(ftsConditions.join(' AND '));

        if (conditions.length > 0) {
          query += ` AND ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY rank`;
      } else {
        // Regular search without FTS
        query = `
          SELECT a.*
          FROM articles a
          WHERE a.is_duplicate = 0
        `;

        if (conditions.length > 0) {
          query += ` AND ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY a.published_at DESC`;
      }

      query += ` LIMIT 100`;

      const articles = await this.executeQuery(query, params);

      return {
        articles,
        totalCount: articles.length,
        query: 'Advanced Search'
      };

    } catch (error) {
      this.logger.error('Advanced search failed', error);
      throw error;
    }
  }

  /**
   * Search within specific time ranges
   */
  async searchByTimeRange(
    query: string,
    timeRange: 'hour' | 'day' | 'week' | 'month',
    limit = 20
  ): Promise<SearchResult> {
    const timeRangeMap = {
      hour: '-1 hour',
      day: '-1 day',
      week: '-7 days',
      month: '-30 days'
    };

    const dateFrom = new Date();
    // SQLite datetime calculation would be done in the query

    const searchOptions: SearchOptions = {
      query,
      dateFrom,
      limit,
      sortBy: 'date',
      sortOrder: 'desc'
    };

    // Modify the query to include time range
    const result = await this.search(searchOptions);

    // Filter results by the specific time range (as backup to SQL filtering)
    const cutoffTime = Date.now() - this.getTimeRangeMs(timeRange);
    result.articles = result.articles.filter(article => {
      const publishedTime = new Date(article.publishedAt).getTime();
      return publishedTime >= cutoffTime;
    });

    return result;
  }

  /**
   * Private helper methods
   */
  private normalizeSearchOptions(options: SearchOptions): Required<SearchOptions> {
    return {
      query: options.query?.trim() || '',
      categories: options.categories || [],
      priorities: options.priorities || [],
      sources: options.sources || [],
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      limit: Math.min(options.limit || this.config.defaultLimit, this.config.maxLimit),
      offset: options.offset || 0,
      sortBy: options.sortBy || 'relevance',
      sortOrder: options.sortOrder || 'desc'
    };
  }

  private buildSearchQuery(options: Required<SearchOptions>): { query: string; params: any[] } {
    const params: any[] = [];
    const conditions: string[] = [];

    let baseQuery: string;

    if (options.query) {
      // Use FTS search with ranking
      const ftsQuery = this.buildFTSQuery(options.query);

      baseQuery = `
        SELECT
          a.*,
          bm25(articles_fts, ${this.config.rankingWeights.title}, ${this.config.rankingWeights.description}, ${this.config.rankingWeights.content}, ${this.config.rankingWeights.author}, ${this.config.rankingWeights.category}) as search_rank,
          snippet(articles_fts, 1, '${this.config.enableHighlighting ? '<mark>' : ''}', '${this.config.enableHighlighting ? '</mark>' : ''}', '...', 32) as snippet
        FROM articles_fts
        JOIN articles a ON articles_fts.rowid = a.id
        WHERE articles_fts MATCH ?
      `;
      params.push(ftsQuery);
    } else {
      // Regular query without FTS
      baseQuery = `
        SELECT a.*, NULL as search_rank, NULL as snippet
        FROM articles a
        WHERE 1=1
      `;
    }

    // Add base condition
    conditions.push('a.is_duplicate = 0');

    // Category filter
    if (options.categories.length > 0) {
      conditions.push(`a.category IN (${options.categories.map(() => '?').join(',')})`);
      params.push(...options.categories);
    }

    // Priority filter
    if (options.priorities.length > 0) {
      conditions.push(`a.priority IN (${options.priorities.map(() => '?').join(',')})`);
      params.push(...options.priorities);
    }

    // Source filter
    if (options.sources.length > 0) {
      conditions.push(`a.source_name IN (${options.sources.map(() => '?').join(',')})`);
      params.push(...options.sources);
    }

    // Date filters
    if (options.dateFrom) {
      conditions.push('a.published_at >= ?');
      params.push(options.dateFrom.toISOString());
    }

    if (options.dateTo) {
      conditions.push('a.published_at <= ?');
      params.push(options.dateTo.toISOString());
    }

    // Combine conditions
    if (conditions.length > 0) {
      if (options.query) {
        baseQuery += ` AND ${conditions.join(' AND ')}`;
      } else {
        baseQuery += ` AND ${conditions.join(' AND ')}`;
      }
    }

    // Add ordering
    const orderClause = this.buildOrderClause(options);
    baseQuery += ` ${orderClause}`;

    // Add pagination
    baseQuery += ` LIMIT ? OFFSET ?`;
    params.push(options.limit, options.offset);

    return { query: baseQuery, params };
  }

  private buildFTSQuery(query: string): string {
    // Clean and prepare the FTS query
    let ftsQuery = query
      .replace(/[^\w\s"'-]/g, ' ') // Remove special characters except quotes and hyphens
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .trim();

    // Handle phrase queries (quoted strings)
    const phrases = ftsQuery.match(/"[^"]+"/g) || [];
    phrases.forEach(phrase => {
      ftsQuery = ftsQuery.replace(phrase, phrase.replace(/\s+/g, ' '));
    });

    // If no phrases, check for implicit phrase (multiple words)
    if (phrases.length === 0 && ftsQuery.includes(' ')) {
      const words = ftsQuery.split(' ').filter(w => w.length > 0);

      if (words.length <= 4) {
        // For short queries, try exact phrase first, then individual words
        ftsQuery = `"${ftsQuery}" OR ${words.join(' OR ')}`;
      } else {
        // For longer queries, use individual words with AND
        ftsQuery = words.join(' AND ');
      }
    }

    return ftsQuery;
  }

  private buildOrderClause(options: Required<SearchOptions>): string {
    const order = options.sortOrder.toUpperCase();

    switch (options.sortBy) {
      case 'relevance':
        if (options.query) {
          return `ORDER BY search_rank ${order}, a.published_at DESC`;
        } else {
          return `ORDER BY a.priority ASC, a.published_at DESC`;
        }

      case 'date':
        return `ORDER BY a.published_at ${order}`;

      case 'priority':
        return `ORDER BY
          CASE a.priority
            WHEN 'breaking' THEN 1
            WHEN 'trending' THEN 2
            WHEN 'regular' THEN 3
            ELSE 4
          END ${order},
          a.published_at DESC`;

      default:
        return `ORDER BY a.published_at DESC`;
    }
  }

  private async executeSearch(query: string, params: any[]): Promise<Article[]> {
    return this.executeQuery(query, params);
  }

  private async executeQuery(query: string, params: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.database.all(query, params, (err: any, rows: any[]) => {
        if (err) {
          this.logger.error('Query execution failed', { query, params, error: err });
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  private async getTotalCount(options: Required<SearchOptions>): Promise<number> {
    const params: any[] = [];
    const conditions: string[] = ['a.is_duplicate = 0'];

    let countQuery: string;

    if (options.query) {
      countQuery = `
        SELECT COUNT(*) as count
        FROM articles_fts
        JOIN articles a ON articles_fts.rowid = a.id
        WHERE articles_fts MATCH ?
      `;
      params.push(this.buildFTSQuery(options.query));
    } else {
      countQuery = `
        SELECT COUNT(*) as count
        FROM articles a
        WHERE 1=1
      `;
    }

    // Add the same filters as main query
    if (options.categories.length > 0) {
      conditions.push(`a.category IN (${options.categories.map(() => '?').join(',')})`);
      params.push(...options.categories);
    }

    if (options.priorities.length > 0) {
      conditions.push(`a.priority IN (${options.priorities.map(() => '?').join(',')})`);
      params.push(...options.priorities);
    }

    if (options.sources.length > 0) {
      conditions.push(`a.source_name IN (${options.sources.map(() => '?').join(',')})`);
      params.push(...options.sources);
    }

    if (options.dateFrom) {
      conditions.push('a.published_at >= ?');
      params.push(options.dateFrom.toISOString());
    }

    if (options.dateTo) {
      conditions.push('a.published_at <= ?');
      params.push(options.dateTo.toISOString());
    }

    if (conditions.length > 0) {
      countQuery += ` AND ${conditions.join(' AND ')}`;
    }

    return new Promise((resolve, reject) => {
      this.database.get(countQuery, params, (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });
  }

  private async generateFacets(options: Required<SearchOptions>): Promise<FacetCounts> {
    const facets: FacetCounts = {
      categories: {},
      sources: {},
      priorities: {},
      authors: {},
      dateRanges: {}
    };

    try {
      // Build base query for facet generation
      const params: any[] = [];
      let baseQuery = '';

      if (options.query) {
        baseQuery = `
          FROM articles_fts
          JOIN articles a ON articles_fts.rowid = a.id
          WHERE articles_fts MATCH ? AND a.is_duplicate = 0
        `;
        params.push(this.buildFTSQuery(options.query));
      } else {
        baseQuery = `
          FROM articles a
          WHERE a.is_duplicate = 0
        `;
      }

      // Category facets
      const categoryQuery = `SELECT a.category, COUNT(*) as count ${baseQuery} GROUP BY a.category`;
      const categoryRows = await this.executeQuery(categoryQuery, params);
      categoryRows.forEach(row => {
        if (row.category) {
          facets.categories[row.category] = row.count;
        }
      });

      // Source facets
      const sourceQuery = `SELECT a.source_name, COUNT(*) as count ${baseQuery} GROUP BY a.source_name`;
      const sourceRows = await this.executeQuery(sourceQuery, params);
      sourceRows.forEach(row => {
        if (row.source_name) {
          facets.sources[row.source_name] = row.count;
        }
      });

      // Priority facets
      const priorityQuery = `SELECT a.priority, COUNT(*) as count ${baseQuery} GROUP BY a.priority`;
      const priorityRows = await this.executeQuery(priorityQuery, params);
      priorityRows.forEach(row => {
        if (row.priority) {
          facets.priorities[row.priority] = row.count;
        }
      });

      // Author facets (limit to top 10)
      const authorQuery = `
        SELECT a.author, COUNT(*) as count ${baseQuery}
        AND a.author IS NOT NULL
        GROUP BY a.author
        ORDER BY count DESC
        LIMIT 10
      `;
      const authorRows = await this.executeQuery(authorQuery, params);
      authorRows.forEach(row => {
        if (row.author) {
          facets.authors[row.author] = row.count;
        }
      });

      // Date range facets
      const dateRangeQuery = `
        SELECT
          CASE
            WHEN a.published_at > datetime('now', '-1 hour') THEN 'Last Hour'
            WHEN a.published_at > datetime('now', '-1 day') THEN 'Last 24 Hours'
            WHEN a.published_at > datetime('now', '-7 days') THEN 'Last Week'
            WHEN a.published_at > datetime('now', '-30 days') THEN 'Last Month'
            ELSE 'Older'
          END as date_range,
          COUNT(*) as count
        ${baseQuery}
        GROUP BY date_range
      `;
      const dateRangeRows = await this.executeQuery(dateRangeQuery, params);
      dateRangeRows.forEach(row => {
        facets.dateRanges[row.date_range] = row.count;
      });

    } catch (error) {
      this.logger.error('Failed to generate facets', error);
    }

    return facets;
  }

  private async applyHighlighting(articles: any[], query: string): Promise<void> {
    // Highlighting is handled in the SQL query using snippet() function
    // Additional client-side highlighting could be added here if needed
  }

  private escapeFTSQuery(query: string): string {
    return query.replace(/"/g, '""');
  }

  private extractKeyTerms(article: any, maxTerms = 10): string[] {
    const text = `${article.title} ${article.description}`.toLowerCase();

    // Simple keyword extraction - could be enhanced with TF-IDF
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    // Count frequencies
    const wordFreq: { [word: string]: number } = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Return top terms
    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxTerms)
      .map(([word]) => word);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'since', 'without'
    ]);

    return stopWords.has(word);
  }

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

  private async getTitleSuggestions(partial: string, limit: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.database.all(
        `SELECT DISTINCT title FROM articles
         WHERE title LIKE ? AND LENGTH(title) < 100
         ORDER BY published_at DESC LIMIT ?`,
        [`%${partial}%`, limit],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.title));
        }
      );
    });
  }

  private async getAuthorSuggestions(partial: string, limit: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.database.all(
        `SELECT DISTINCT author FROM articles
         WHERE author LIKE ? AND author IS NOT NULL
         ORDER BY fetched_at DESC LIMIT ?`,
        [`%${partial}%`, limit],
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.author));
        }
      );
    });
  }

  private async getCategorySuggestions(partial: string): Promise<string[]> {
    const categories = [
      'general', 'business', 'technology', 'science', 'health',
      'sports', 'entertainment', 'politics', 'world'
    ];

    return categories.filter(category =>
      category.toLowerCase().includes(partial.toLowerCase())
    );
  }

  private getTimeRangeMs(range: 'hour' | 'day' | 'week' | 'month'): number {
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    return ranges[range];
  }

  /**
   * Get search statistics
   */
  async getStats(): Promise<{
    totalArticles: number;
    articlesWithContent: number;
    ftsIndexSize: number;
    averageArticleLength: number;
    topCategories: Array<{ category: string; count: number }>;
    topSources: Array<{ source: string; count: number }>;
  }> {
    return new Promise((resolve, reject) => {
      this.database.serialize(() => {
        let stats: any = {};

        // Basic counts
        this.database.get(
          'SELECT COUNT(*) as total, AVG(word_count) as avg_length FROM articles WHERE is_duplicate = 0',
          (err: any, row: any) => {
            if (err) {
              reject(err);
              return;
            }
            stats.totalArticles = row.total;
            stats.averageArticleLength = Math.round(row.avg_length || 0);

            // Articles with content
            this.database.get(
              'SELECT COUNT(*) as count FROM articles WHERE content IS NOT NULL AND LENGTH(content) > 0',
              (err: any, row: any) => {
                if (err) {
                  reject(err);
                  return;
                }
                stats.articlesWithContent = row.count;

                // Top categories
                this.database.all(
                  'SELECT category, COUNT(*) as count FROM articles WHERE is_duplicate = 0 GROUP BY category ORDER BY count DESC LIMIT 10',
                  (err: any, rows: any[]) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    stats.topCategories = rows || [];

                    // Top sources
                    this.database.all(
                      'SELECT source_name as source, COUNT(*) as count FROM articles WHERE is_duplicate = 0 GROUP BY source_name ORDER BY count DESC LIMIT 10',
                      (err: any, rows: any[]) => {
                        if (err) {
                          reject(err);
                          return;
                        }
                        stats.topSources = rows || [];
                        stats.ftsIndexSize = -1; // Would need additional query to get FTS index size

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
}