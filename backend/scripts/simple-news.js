/**
 * Simple News Population Script
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 Starting simple news population...');

  // Database setup
  const dbPath = path.join(__dirname, '../database.db');
  await fs.ensureDir(path.dirname(dbPath));

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Create tables
  console.log('📋 Creating database tables...');
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS news_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'rss',
        url TEXT NOT NULL,
        config TEXT,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS news_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_id) REFERENCES news_sources(id)
      );
    `);
    console.log('✅ Tables created successfully');
  } catch (error) {
    console.log('⚠️  Tables already exist or error:', error.message);
  }

  // Add source
  console.log('📰 Adding news source...');
  let sourceId;
  try {
    const existing = db.prepare('SELECT id FROM news_sources WHERE url = ?').get('https://feeds.bbci.co.uk/news/rss.xml');
    if (existing) {
      sourceId = existing.id;
      console.log('⏭️  Source already exists');
    } else {
      const result = db.prepare(`
        INSERT INTO news_sources (name, type, url, config, enabled)
        VALUES (?, ?, ?, ?, ?)
      `).run('BBC News', 'rss', 'https://feeds.bbci.co.uk/news/rss.xml', '{"category":"general"}', 1);
      sourceId = result.lastInsertRowid;
      console.log('✅ Added BBC News source');
    }
  } catch (error) {
    console.error('❌ Failed to add source:', error.message);
    return;
  }

  // Fetch RSS
  console.log('📡 Fetching RSS feed...');
  try {
    const response = await fetch('https://feeds.bbci.co.uk/news/rss.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    console.log('📰 Parsing articles...');
    let added = 0;
    let skipped = 0;

    $('item').each((index, element) => {
      try {
        const $item = $(element);

        const title = $item.find('title').text().trim();
        const link = $item.find('link').text().trim();
        const description = $item.find('description').text().trim();
        const pubDate = $item.find('pubDate').text().trim();

        if (!title || !link) return;

        // Clean description
        const cleanDesc = $('<div>').html(description).text().trim();

        // Parse date
        let publishedAt;
        try {
          publishedAt = new Date(pubDate).toISOString();
        } catch {
          publishedAt = new Date().toISOString();
        }

        // Check if exists
        const existing = db.prepare('SELECT id FROM news_articles WHERE url = ?').get(link);
        if (existing) {
          skipped++;
          return;
        }

        // Calculate reading time
        const wordCount = cleanDesc.split(' ').length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));

        // Insert article
        db.prepare(`
          INSERT INTO news_articles (
            source_id, title, content, summary, published_at, url,
            category, tags, word_count, reading_time, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sourceId,
          title,
          cleanDesc,
          cleanDesc.substring(0, 200) + '...',
          publishedAt,
          link,
          'general',
          '["general"]',
          wordCount,
          readingTime,
          'active'
        );

        added++;
        console.log(`📄 Added: ${title.substring(0, 50)}...`);

      } catch (error) {
        console.error('❌ Error processing article:', error.message);
      }
    });

    console.log(`✅ Completed: ${added} articles added, ${skipped} skipped`);

    // Show stats
    const totalArticles = db.prepare('SELECT COUNT(*) as count FROM news_articles').get().count;
    const totalSources = db.prepare('SELECT COUNT(*) as count FROM news_sources').get().count;

    console.log(`\n📊 Database Stats:
- Total articles: ${totalArticles}
- Total sources: ${totalSources}
- Added in this run: ${added}
    `);

    // Show recent articles
    console.log('\n📰 Recent articles:');
    const recent = db.prepare(`
      SELECT title, category, published_at
      FROM news_articles
      ORDER BY published_at DESC
      LIMIT 5
    `).all();

    recent.forEach(article => {
      console.log(`  - [${article.category}] ${article.title}`);
    });

  } catch (error) {
    console.error('❌ Failed to fetch RSS:', error.message);
  } finally {
    db.close();
    console.log('\n🎉 News population completed!');
  }
}

main().catch(console.error);