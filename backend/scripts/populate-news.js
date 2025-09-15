/**
 * Quick News Population Script
 * Directly fetches RSS feeds and populates the database with articles
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// RSS Feed sources
const RSS_SOURCES = [
  {
    name: 'BBC News',
    url: 'https://feeds.bbci.co.uk/news/rss.xml',
    category: 'general'
  },
  {
    name: 'BBC Technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    category: 'technology'
  },
  {
    name: 'Reuters World',
    url: 'https://feeds.reuters.com/reuters/worldNews',
    category: 'world'
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'technology'
  },
  {
    name: 'Hacker News',
    url: 'https://hnrss.org/frontpage',
    category: 'technology'
  },
  {
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'technology'
  }
];

class NewsPopulator {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../database.db');
  }

  async initialize() {
    console.log('🚀 Initializing News Populator...');

    // Ensure database directory exists
    await fs.ensureDir(path.dirname(this.dbPath));

    // Initialize database
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    await this.createTables();

    console.log('✅ News Populator initialized');
  }

  async createTables() {
    const schema = `
      -- News Sources
      CREATE TABLE IF NOT EXISTS news_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'rss',
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

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at);
      CREATE INDEX IF NOT EXISTS idx_news_articles_source_id ON news_articles(source_id);
      CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
      CREATE INDEX IF NOT EXISTS idx_news_articles_url ON news_articles(url);
    `;

    const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        this.db.exec(statement);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  async setupSources() {
    console.log('📰 Setting up news sources...');

    for (const source of RSS_SOURCES) {
      try {
        const existing = this.db.prepare('SELECT id FROM news_sources WHERE url = ?').get(source.url);

        if (!existing) {
          const result = this.db.prepare(`
            INSERT INTO news_sources (name, type, url, config, enabled)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            source.name,
            'rss',
            source.url,
            JSON.stringify({ category: source.category }),
            1
          );

          console.log(`✅ Added source: ${source.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to add source ${source.name}:`, error.message);
      }
    }
  }

  async fetchRSSFeed(url) {
    try {
      console.log(`📡 Fetching RSS feed: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      const articles = [];

      // Parse RSS items
      $('item').each((index, element) => {
        try {
          const $item = $(element);

          const title = $item.find('title').text().trim();
          const link = $item.find('link').text().trim();
          const description = $item.find('description').text().trim();
          const author = $item.find('author').text().trim() || $item.find('dc\\:creator').text().trim();
          const pubDate = $item.find('pubDate').text().trim();
          const category = $item.find('category').first().text().trim();

          // Parse publication date
          let publishedAt;
          try {
            publishedAt = new Date(pubDate).toISOString();
          } catch {
            publishedAt = new Date().toISOString();
          }

          // Extract image from description or enclosure
          let imageUrl = null;
          const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          } else {
            const enclosure = $item.find('enclosure[type*="image"]');
            if (enclosure.length) {
              imageUrl = enclosure.attr('url');
            }
          }

          // Clean description of HTML
          const cleanDescription = $('<div>').html(description).text().trim();

          if (title && link) {
            articles.push({
              title,
              url: link,
              description: cleanDescription,
              author: author || null,
              publishedAt,
              imageUrl,
              category: category || 'general'
            });
          }
        } catch (error) {
          console.error('❌ Error parsing RSS item:', error.message);
        }
      });

      console.log(`📰 Found ${articles.length} articles`);
      return articles;

    } catch (error) {
      console.error(`❌ Failed to fetch RSS feed ${url}:`, error.message);
      return [];
    }
  }

  async populateArticles() {
    console.log('📥 Populating articles from RSS feeds...');

    const sources = this.db.prepare('SELECT * FROM news_sources WHERE enabled = 1').all();
    let totalAdded = 0;
    let totalSkipped = 0;

    for (const source of sources) {
      try {
        const articles = await this.fetchRSSFeed(source.url);

        for (const article of articles) {
          try {
            // Check if article already exists
            const existing = this.db.prepare(`
              SELECT id FROM news_articles
              WHERE url = ? OR title = ?
            `).get(article.url, article.title);

            if (existing) {
              totalSkipped++;
              continue;
            }

            // Calculate word count and reading time
            const wordCount = article.description ? article.description.split(' ').length : 0;
            const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute

            // Get source config
            const config = source.config ? JSON.parse(source.config) : {};

            // Insert article
            this.db.prepare(`
              INSERT INTO news_articles (
                source_id, title, content, summary, author, published_at,
                url, image_url, category, tags, word_count, reading_time, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              source.id,
              article.title,
              article.description,
              article.description?.substring(0, 200) + '...' || null,
              article.author,
              article.publishedAt,
              article.url,
              article.imageUrl,
              config.category || article.category || 'general',
              JSON.stringify([config.category || article.category || 'general']),
              wordCount,
              readingTime,
              'active'
            );

            totalAdded++;

          } catch (error) {
            console.error(`❌ Failed to insert article "${article.title}":`, error.message);
          }
        }

        // Small delay between sources to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed to fetch from source ${source.name}:`, error.message);
      }
    }

    console.log(`✅ Population complete: ${totalAdded} articles added, ${totalSkipped} skipped`);
    return { added: totalAdded, skipped: totalSkipped };
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
        LIMIT 10
      `).all(),
      recentTitles: this.db.prepare(`
        SELECT title, published_at, category
        FROM news_articles
        ORDER BY published_at DESC
        LIMIT 5
      `).all()
    };

    return stats;
  }

  cleanup() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Main execution
async function main() {
  const populator = new NewsPopulator();

  try {
    await populator.initialize();
    await populator.setupSources();

    console.log('\n📊 Current database stats:');
    const initialStats = await populator.getStats();
    console.log(`- Total articles: ${initialStats.totalArticles}`);
    console.log(`- Active sources: ${initialStats.totalSources}`);
    console.log(`- Recent articles (24h): ${initialStats.recentArticles}`);

    console.log('\n🔄 Fetching fresh articles...');
    const result = await populator.populateArticles();

    console.log('\n📊 Final stats:');
    const finalStats = await populator.getStats();
    console.log(`- Total articles: ${finalStats.totalArticles}`);
    console.log(`- Added in this run: ${result.added}`);
    console.log(`- Skipped (duplicates): ${result.skipped}`);

    if (finalStats.articlesByCategory.length > 0) {
      console.log('\n📂 Articles by category:');
      finalStats.articlesByCategory.forEach(cat => {
        console.log(`  - ${cat.category}: ${cat.count} articles`);
      });
    }

    if (finalStats.recentTitles.length > 0) {
      console.log('\n📰 Latest articles:');
      finalStats.recentTitles.forEach(article => {
        console.log(`  - [${article.category}] ${article.title}`);
      });
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    populator.cleanup();
    console.log('\n🎉 News population completed!');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default NewsPopulator;