/**
 * RSS Feed Parser for Major News Sites
 * Robust RSS parsing with error handling and content normalization
 */

import { NewsSource, Article, FetchResult, RSSFeed, RSSFeedItem } from '../types/NewsTypes';
import { createHash } from 'crypto';
import { parse } from 'node-html-parser';

interface RSSConfig {
  timeout?: number;
  userAgent?: string;
  maxItems?: number;
  retryAttempts?: number;
  validateSSL?: boolean;
}

export class RSSSource implements NewsSource {
  private config: RSSConfig;
  private feedUrl: string;
  private sourceName: string;

  constructor(feedUrl: string, sourceName: string, config: RSSConfig = {}) {
    this.feedUrl = feedUrl;
    this.sourceName = sourceName;
    this.config = {
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
      maxItems: 50,
      retryAttempts: 3,
      validateSSL: true,
      ...config
    };
  }

  async fetchArticles(): Promise<FetchResult> {
    const startTime = Date.now();

    try {
      // Fetch RSS content with retries
      const rssContent = await this.fetchRSSContent();

      // Parse RSS content
      const feed = await this.parseRSS(rssContent);

      // Convert RSS items to articles
      const articles = this.convertRSSItemsToArticles(feed.items);

      const duration = Date.now() - startTime;

      return {
        success: true,
        articles,
        totalResults: articles.length,
        source: this.sourceName,
        duration,
        metadata: {
          feedTitle: feed.title,
          feedDescription: feed.description,
          feedLink: feed.link,
          lastBuildDate: feed.lastBuildDate,
          language: feed.language
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        articles: [],
        totalResults: 0,
        source: this.sourceName,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async fetchRSSContent(): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.feedUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': this.config.userAgent!,
            'Accept': 'application/rss+xml, application/xml, text/xml, text/plain',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!this.isValidRSSContentType(contentType)) {
          console.warn(`Unexpected content type: ${contentType} for ${this.feedUrl}`);
        }

        const content = await response.text();

        if (!content.trim()) {
          throw new Error('Empty RSS content received');
        }

        return content;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retryAttempts! - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to fetch RSS content');
  }

  private isValidRSSContentType(contentType: string): boolean {
    const validTypes = [
      'application/rss+xml',
      'application/xml',
      'text/xml',
      'text/plain',
      'application/atom+xml'
    ];

    return validTypes.some(type => contentType.toLowerCase().includes(type));
  }

  private async parseRSS(content: string): Promise<RSSFeed> {
    try {
      // Clean up common RSS issues
      const cleanedContent = this.cleanRSSContent(content);

      // Parse XML using node-html-parser (which can handle XML)
      const doc = parse(cleanedContent, {
        lowerCaseKeys: false,
        parseNoneClosedTags: true
      });

      // Determine if this is RSS or Atom
      const isAtom = cleanedContent.includes('<feed') || doc.querySelector('feed');

      if (isAtom) {
        return this.parseAtomFeed(doc);
      } else {
        return this.parseRSSFeed(doc);
      }

    } catch (error) {
      throw new Error(`RSS parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private cleanRSSContent(content: string): string {
    return content
      // Remove BOM if present
      .replace(/^\uFEFF/, '')
      // Fix common encoding issues
      .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
      // Remove null characters
      .replace(/\0/g, '')
      // Normalize whitespace in XML tags
      .replace(/\s+>/g, '>')
      .replace(/>\s+</g, '><');
  }

  private parseRSSFeed(doc: any): RSSFeed {
    const channel = doc.querySelector('channel') || doc.querySelector('rss channel');

    if (!channel) {
      throw new Error('No RSS channel found in feed');
    }

    const feed: RSSFeed = {
      title: this.getTextContent(channel.querySelector('title')) || 'Unknown Feed',
      description: this.getTextContent(channel.querySelector('description')) || '',
      link: this.getTextContent(channel.querySelector('link')) || '',
      lastBuildDate: this.getTextContent(channel.querySelector('lastBuildDate')),
      language: this.getTextContent(channel.querySelector('language')),
      items: []
    };

    // Parse items
    const items = channel.querySelectorAll('item');

    for (const item of items.slice(0, this.config.maxItems)) {
      try {
        const rssItem = this.parseRSSItem(item);
        if (rssItem && this.isValidRSSItem(rssItem)) {
          feed.items.push(rssItem);
        }
      } catch (error) {
        console.warn(`Failed to parse RSS item: ${error}`);
        // Continue with other items
      }
    }

    return feed;
  }

  private parseAtomFeed(doc: any): RSSFeed {
    const feedElement = doc.querySelector('feed');

    if (!feedElement) {
      throw new Error('No Atom feed element found');
    }

    const feed: RSSFeed = {
      title: this.getTextContent(feedElement.querySelector('title')) || 'Unknown Feed',
      description: this.getTextContent(feedElement.querySelector('subtitle')) || '',
      link: this.getAtomLink(feedElement),
      lastBuildDate: this.getTextContent(feedElement.querySelector('updated')),
      language: feedElement.getAttribute('xml:lang'),
      items: []
    };

    // Parse entries
    const entries = feedElement.querySelectorAll('entry');

    for (const entry of entries.slice(0, this.config.maxItems)) {
      try {
        const atomItem = this.parseAtomEntry(entry);
        if (atomItem && this.isValidRSSItem(atomItem)) {
          feed.items.push(atomItem);
        }
      } catch (error) {
        console.warn(`Failed to parse Atom entry: ${error}`);
        // Continue with other entries
      }
    }

    return feed;
  }

  private parseRSSItem(item: any): RSSFeedItem | null {
    const title = this.getTextContent(item.querySelector('title'));
    const link = this.getTextContent(item.querySelector('link'));

    if (!title || !link) {
      return null;
    }

    return {
      title: this.cleanText(title),
      description: this.cleanText(this.getTextContent(item.querySelector('description')) || ''),
      link: link.trim(),
      pubDate: this.getTextContent(item.querySelector('pubDate')),
      author: this.getTextContent(item.querySelector('author')) ||
              this.getTextContent(item.querySelector('dc:creator')),
      category: this.getCategories(item),
      content: this.getContent(item),
      guid: this.getTextContent(item.querySelector('guid')),
      enclosure: this.getEnclosure(item)
    };
  }

  private parseAtomEntry(entry: any): RSSFeedItem | null {
    const title = this.getTextContent(entry.querySelector('title'));
    const link = this.getAtomLink(entry);

    if (!title || !link) {
      return null;
    }

    return {
      title: this.cleanText(title),
      description: this.cleanText(this.getTextContent(entry.querySelector('summary')) || ''),
      link: link.trim(),
      pubDate: this.getTextContent(entry.querySelector('published')) ||
               this.getTextContent(entry.querySelector('updated')),
      author: this.getAtomAuthor(entry),
      category: this.getAtomCategories(entry),
      content: this.getAtomContent(entry),
      guid: this.getTextContent(entry.querySelector('id'))
    };
  }

  private getTextContent(element: any): string | undefined {
    if (!element) return undefined;

    // Handle CDATA sections
    const text = element.innerHTML || element.textContent || element.text || '';
    return text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
  }

  private getAtomLink(element: any): string {
    const linkElement = element.querySelector('link[rel="alternate"]') ||
                       element.querySelector('link[type="text/html"]') ||
                       element.querySelector('link');

    return linkElement?.getAttribute('href') || '';
  }

  private getAtomAuthor(entry: any): string | undefined {
    const author = entry.querySelector('author name');
    return author ? this.getTextContent(author) : undefined;
  }

  private getCategories(item: any): string[] {
    const categories: string[] = [];

    // RSS categories
    const categoryElements = item.querySelectorAll('category');
    for (const cat of categoryElements) {
      const text = this.getTextContent(cat);
      if (text) categories.push(text);
    }

    return categories;
  }

  private getAtomCategories(entry: any): string[] {
    const categories: string[] = [];

    const categoryElements = entry.querySelectorAll('category');
    for (const cat of categoryElements) {
      const term = cat.getAttribute('term');
      if (term) categories.push(term);
    }

    return categories;
  }

  private getContent(item: any): string | undefined {
    // Try content:encoded first, then description
    const contentEncoded = item.querySelector('content\\:encoded') ||
                          item.querySelector('content');

    if (contentEncoded) {
      return this.cleanText(this.getTextContent(contentEncoded) || '');
    }

    return undefined;
  }

  private getAtomContent(entry: any): string | undefined {
    const content = entry.querySelector('content');
    return content ? this.cleanText(this.getTextContent(content) || '') : undefined;
  }

  private getEnclosure(item: any): { url: string; type: string; length?: number } | undefined {
    const enclosure = item.querySelector('enclosure');

    if (enclosure) {
      const url = enclosure.getAttribute('url');
      const type = enclosure.getAttribute('type');
      const length = enclosure.getAttribute('length');

      if (url && type) {
        return {
          url,
          type,
          length: length ? parseInt(length, 10) : undefined
        };
      }
    }

    return undefined;
  }

  private isValidRSSItem(item: RSSFeedItem): boolean {
    return !!(item.title && item.link && item.title.trim() && item.link.trim());
  }

  private cleanText(text: string): string {
    if (!text) return '';

    return text
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  private convertRSSItemsToArticles(items: RSSFeedItem[]): Article[] {
    return items
      .map(item => this.convertRSSItemToArticle(item))
      .filter((article): article is Article => article !== null);
  }

  private convertRSSItemToArticle(item: RSSFeedItem): Article | null {
    try {
      const urlHash = createHash('sha256').update(item.link).digest('hex');

      // Parse publication date
      let publishedAt: Date;
      if (item.pubDate) {
        publishedAt = new Date(item.pubDate);
        // If invalid date, use current time
        if (isNaN(publishedAt.getTime())) {
          publishedAt = new Date();
        }
      } else {
        publishedAt = new Date();
      }

      const content = item.content || item.description || '';
      const wordCount = this.calculateWordCount(content);

      return {
        title: item.title,
        description: item.description || '',
        content,
        url: item.link,
        urlHash,
        sourceName: this.sourceName,
        author: item.author || null,
        publishedAt,
        category: this.determineCategory(item),
        priority: this.determinePriority(item),
        wordCount,
        readingTime: Math.ceil(wordCount / 200), // ~200 WPM
        language: 'en', // Default to English, can be enhanced
        imageUrl: this.extractImageUrl(item),
        embeddingVector: undefined, // Will be computed later
        embeddingModel: undefined
      };

    } catch (error) {
      console.warn(`Failed to convert RSS item to article: ${error}`, item);
      return null;
    }
  }

  private determineCategory(item: RSSFeedItem): string {
    // Use RSS categories if available
    if (item.category && item.category.length > 0) {
      const category = item.category[0].toLowerCase();

      // Map common RSS categories to our categories
      const categoryMap: { [key: string]: string } = {
        'tech': 'technology',
        'technology': 'technology',
        'business': 'business',
        'science': 'science',
        'health': 'health',
        'sports': 'sports',
        'entertainment': 'entertainment',
        'politics': 'politics',
        'world': 'world'
      };

      return categoryMap[category] || 'general';
    }

    // Try to determine from source name
    const sourceName = this.sourceName.toLowerCase();
    if (sourceName.includes('tech')) return 'technology';
    if (sourceName.includes('business')) return 'business';
    if (sourceName.includes('science')) return 'science';
    if (sourceName.includes('health')) return 'health';
    if (sourceName.includes('sports')) return 'sports';

    return 'general';
  }

  private determinePriority(item: RSSFeedItem): 'breaking' | 'trending' | 'regular' {
    const title = item.title.toLowerCase();
    const description = (item.description || '').toLowerCase();

    // Breaking news indicators
    const breakingKeywords = [
      'breaking', 'urgent', 'alert', 'developing', 'live',
      'just in', 'update', 'emergency', 'crisis'
    ];

    const trendingKeywords = [
      'exclusive', 'major', 'significant', 'important',
      'announcement', 'reveals', 'launches'
    ];

    const text = `${title} ${description}`;

    if (breakingKeywords.some(keyword => text.includes(keyword))) {
      return 'breaking';
    }

    if (trendingKeywords.some(keyword => text.includes(keyword))) {
      return 'trending';
    }

    return 'regular';
  }

  private calculateWordCount(text: string): number {
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractImageUrl(item: RSSFeedItem): string | undefined {
    // Check for enclosure with image type
    if (item.enclosure && item.enclosure.type.startsWith('image/')) {
      return item.enclosure.url;
    }

    // Try to extract from content or description
    const content = item.content || item.description || '';
    const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);

    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }

    return undefined;
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Quick fetch test
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(this.feedUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.userAgent!
        }
      });

      clearTimeout(timeoutId);

      const status = response.ok ? 'healthy' : 'unhealthy';

      return {
        status,
        details: {
          feedUrl: this.feedUrl,
          sourceName: this.sourceName,
          statusCode: response.status,
          contentType: response.headers.get('content-type'),
          lastModified: response.headers.get('last-modified')
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          feedUrl: this.feedUrl,
          sourceName: this.sourceName,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // Static method to create RSS sources for common news sites
  static createCommonSources(): RSSSource[] {
    const sources = [
      // BBC
      { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC News' },
      { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Technology' },
      { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business' },
      { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', name: 'BBC Science' },

      // CNN
      { url: 'http://rss.cnn.com/rss/edition.rss', name: 'CNN Top Stories' },
      { url: 'http://rss.cnn.com/rss/edition_technology.rss', name: 'CNN Technology' },
      { url: 'http://rss.cnn.com/rss/money_latest.rss', name: 'CNN Business' },

      // Reuters
      { url: 'https://feeds.reuters.com/reuters/worldNews', name: 'Reuters World News' },
      { url: 'https://feeds.reuters.com/reuters/technologyNews', name: 'Reuters Technology' },
      { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters Business' },

      // Tech Sites
      { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' },
      { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' },
      { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica' },
      { url: 'https://feeds.feedburner.com/venturebeat/SZYF', name: 'VentureBeat' }
    ];

    return sources.map(source => new RSSSource(source.url, source.name));
  }
}