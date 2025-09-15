/**
 * News Fetching Script
 * Fetches news articles from multiple sources and populates the database
 */

import { createNewsAggregator } from '../services/news/index.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  databasePath: path.join(__dirname, '../database.db'),
  newsApiKey: process.env.NEWS_API_KEY || '', // Add your NewsAPI key
  fetchIntervalMinutes: 30,
  enableCron: false, // Disable cron for manual fetching
  enableProcessing: true,
  logLevel: 'info',
  maxArticlesPerSource: 20
};

class NewsFetcher {
  constructor() {
    this.db = null;
    this.newsService = null;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing News Fetcher...');

      // Ensure database directory exists
      await fs.ensureDir(path.dirname(CONFIG.databasePath));

      // Initialize database
      this.db = new Database(CONFIG.databasePath);
      this.db.pragma('journal_mode = WAL');

      // Create tables if they don't exist
      await this.createTables();

      // Initialize news aggregation service
      this.newsService = await createNewsAggregator({
        databasePath: path.join(__dirname, '../data/news.db'),
        newsApiKey: CONFIG.newsApiKey,
        fetchIntervalMinutes: CONFIG.fetchIntervalMinutes,
        enableCron: CONFIG.enableCron,
        enableProcessing: CONFIG.enableProcessing,
        logLevel: CONFIG.logLevel
      });

      console.log('✅ News Fetcher initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize News Fetcher:', error.message);
      throw error;
    }
  }

  async createTables() {
    // Create news-related tables compatible with news-audio module
    const schema = `
      -- News Sources
      CREATE TABLE IF NOT EXISTS news_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        config TEXT,
        enabled BOOLEAN DEFAULT 1,
        fetch_interval INTEGER DEFAULT 3600,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- News Articles
      CREATE TABLE IF NOT EXISTS news_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER,
        external_id TEXT,
        title TEXT NOT NULL,
        content TEXT,
        summary TEXT,
        author TEXT,
        published_at DATETIME NOT NULL,
        url TEXT,
        image_url TEXT,
        category TEXT,
        tags TEXT,
        language TEXT DEFAULT 'en',
        word_count INTEGER DEFAULT 0,
        reading_time INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_id) REFERENCES news_sources(id)
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at);
      CREATE INDEX IF NOT EXISTS idx_news_articles_source_id ON news_articles(source_id);
      CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
      CREATE INDEX IF NOT EXISTS idx_news_articles_status ON news_articles(status);
      CREATE INDEX IF NOT EXISTS idx_news_articles_external_id ON news_articles(external_id);
    `;

    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        this.db.exec(statement);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error executing SQL:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }
  }

  async setupDefaultSources() {
    console.log('📰 Setting up default news sources...');

    const defaultSources = [
      {
        name: 'BBC News',
        type: 'rss',
        url: 'https://feeds.bbci.co.uk/news/rss.xml',
        config: { category: 'general', priority: 1 }
      },
      {
        name: 'BBC Technology',
        type: 'rss',
        url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
        config: { category: 'technology', priority: 2 }
      },
      {
        name: 'CNN Top Stories',
        type: 'rss',
        url: 'http://rss.cnn.com/rss/edition.rss',
        config: { category: 'general', priority: 1 }
      },
      {
        name: 'Reuters World News',
        type: 'rss',
        url: 'https://feeds.reuters.com/reuters/worldNews',
        config: { category: 'world', priority: 1 }
      },
      {
        name: 'TechCrunch',
        type: 'rss',
        url: 'https://techcrunch.com/feed/',
        config: { category: 'technology', priority: 1 }
      },
      {
        name: 'The Verge',
        type: 'rss',
        url: 'https://www.theverge.com/rss/index.xml',
        config: { category: 'technology', priority: 1 }
      }
    ];

    for (const source of defaultSources) {
      try {
        // Check if source already exists
        const existing = this.db.prepare('SELECT id FROM news_sources WHERE url = ?').get(source.url);

        if (!existing) {
          const result = this.db.prepare(`
            INSERT INTO news_sources (name, type, url, config, enabled)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            source.name,
            source.type,
            source.url,
            JSON.stringify(source.config),
            1
          );

          console.log(`✅ Added source: ${source.name} (ID: ${result.lastInsertRowid})`);

          // Add to news aggregation service
          await this.newsService.addSource({
            name: source.name,
            type: source.type,
            url: source.url,
            category: source.config.category,
            priority: source.config.priority,
            rateLimitPerHour: 10,
            language: 'en'
          });
        } else {
          console.log(`⏭️  Source already exists: ${source.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to add source ${source.name}:`, error.message);
      }
    }
  }

  async fetchNews() {
    try {
      console.log('📥 Fetching news from all sources...');

      // Fetch news using the aggregation service
      const result = await this.newsService.fetchNews();

      console.log(`📊 Fetch Results:
        - New articles: ${result.newArticles}
        - Updated articles: ${result.updatedArticles}
        - Duplicates found: ${result.duplicatesFound}
        - Processing time: ${result.processingTime}ms
      `);

      // Transfer articles from news aggregation DB to main DB
      await this.transferArticles();

      return result;
    } catch (error) {
      console.error('❌ Failed to fetch news:', error.message);
      throw error;
    }
  }

  async transferArticles() {
    try {
      console.log('🔄 Transferring articles to main database...');

      // Get articles from news aggregation service
      const searchResult = await this.newsService.search({
        limit: 100,
        sortBy: 'date'
      });

      let transferred = 0;
      let skipped = 0;

      for (const article of searchResult.articles) {
        try {
          // Check if article already exists in main DB
          const existing = this.db.prepare(`
            SELECT id FROM news_articles
            WHERE url = ? OR (title = ? AND published_at = ?)
          `).get(article.url, article.title, article.published_at);

          if (existing) {
            skipped++;
            continue;
          }

          // Find or create source
          let sourceId = this.getOrCreateSource(article.source_name, article.source_url);

          // Calculate reading time
          const wordCount = article.description ? article.description.split(' ').length : 0;
          const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

          // Insert article
          const result = this.db.prepare(`
            INSERT INTO news_articles (
              source_id, external_id, title, content, summary, author,
              published_at, url, image_url, category, tags, language,
              word_count, reading_time, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            sourceId,
            article.id?.toString() || null,
            article.title,
            article.description || null,
            article.description?.substring(0, 200) + '...' || null,
            article.author || null,
            article.published_at,
            article.url,
            article.urlToImage || null,
            article.category || 'general',
            JSON.stringify([article.category || 'general']),
            'en',
            wordCount,
            readingTime,
            'active'
          );

          transferred++;

          if (transferred % 10 === 0) {
            console.log(`📊 Transferred ${transferred} articles...`);
          }
        } catch (error) {
          console.error(`❌ Failed to transfer article "${article.title}":`, error.message);
        }
      }

      console.log(`✅ Transfer complete: ${transferred} articles transferred, ${skipped} skipped`);
    } catch (error) {
      console.error('❌ Failed to transfer articles:', error.message);
      throw error;
    }
  }

  getOrCreateSource(sourceName, sourceUrl) {
    // Try to find existing source
    let source = this.db.prepare('SELECT id FROM news_sources WHERE name = ?').get(sourceName);

    if (!source) {
      // Create new source
      const result = this.db.prepare(`
        INSERT INTO news_sources (name, type, url, config, enabled)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        sourceName,
        'rss',
        sourceUrl || '',
        JSON.stringify({ category: 'general' }),
        1
      );

      source = { id: result.lastInsertRowid };
      console.log(`📰 Created new source: ${sourceName} (ID: ${source.id})`);
    }

    return source.id;
  }

  async getStats() {
    const stats = {
      totalArticles: this.db.prepare('SELECT COUNT(*) as count FROM news_articles').get().count,
      totalSources: this.db.prepare('SELECT COUNT(*) as count FROM news_sources WHERE enabled = 1').get().count,
      recentArticles: this.db.prepare(`
        SELECT COUNT(*) as count FROM news_articles
        WHERE created_at >= datetime('now', '-24 hours')
      `).get().count,
      articlesByCategory: this.db.prepare(`
        SELECT category, COUNT(*) as count
        FROM news_articles
        GROUP BY category
        ORDER BY count DESC
      `).all()
    };

    return stats;
  }

  async cleanup() {
    if (this.db) {
      this.db.close();
    }
    if (this.newsService) {
      await this.newsService.cleanup();
    }
  }
}

// Main execution
async function main() {
  const fetcher = new NewsFetcher();

  try {
    await fetcher.initialize();
    await fetcher.setupDefaultSources();

    console.log('\n📊 Current stats:');
    const initialStats = await fetcher.getStats();
    console.log(`- Total articles: ${initialStats.totalArticles}`);
    console.log(`- Active sources: ${initialStats.totalSources}`);
    console.log(`- Recent articles (24h): ${initialStats.recentArticles}`);

    if (initialStats.totalArticles < 10) {
      console.log('\n🔄 Low article count detected, fetching fresh news...');
      await fetcher.fetchNews();

      console.log('\n📊 Updated stats:');
      const finalStats = await fetcher.getStats();
      console.log(`- Total articles: ${finalStats.totalArticles}`);
      console.log(`- Recent articles (24h): ${finalStats.recentArticles}`);

      if (finalStats.articlesByCategory.length > 0) {
        console.log('\n📂 Articles by category:');
        finalStats.articlesByCategory.forEach(cat => {
          console.log(`  - ${cat.category}: ${cat.count} articles`);
        });
      }
    } else {
      console.log('✅ Sufficient articles found, skipping fetch');
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await fetcher.cleanup();
    console.log('\n🎉 News fetching completed!');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default NewsFetcher;