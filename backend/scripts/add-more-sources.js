/**
 * Add Multiple News Sources Script
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCES = [
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'technology'
  },
  {
    name: 'Reuters World',
    url: 'https://feeds.reuters.com/reuters/worldNews',
    category: 'world'
  },
  {
    name: 'BBC Technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    category: 'technology'
  },
  {
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'technology'
  }
];

async function fetchFromSource(source, db) {
  console.log(`📡 Fetching from ${source.name}...`);

  try {
    // Add source if not exists
    let sourceRecord = db.prepare('SELECT id FROM news_sources WHERE url = ?').get(source.url);

    if (!sourceRecord) {
      const result = db.prepare(`
        INSERT INTO news_sources (name, type, url, config, enabled)
        VALUES (?, ?, ?, ?, ?)
      `).run(source.name, 'rss', source.url, JSON.stringify({category: source.category}), 1);
      sourceRecord = { id: result.lastInsertRowid };
      console.log(`✅ Added source: ${source.name}`);
    }

    // Fetch RSS
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    if (!response.ok) {
      console.log(`❌ Failed to fetch ${source.name}: HTTP ${response.status}`);
      return { added: 0, skipped: 0 };
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    let added = 0;
    let skipped = 0;

    $('item').each((index, element) => {
      if (index >= 15) return false; // Limit to 15 articles per source

      try {
        const $item = $(element);
        const title = $item.find('title').text().trim();
        const link = $item.find('link').text().trim();
        const description = $item.find('description').text().trim();
        const pubDate = $item.find('pubDate').text().trim();
        const author = $item.find('author').text().trim() || $item.find('dc\\:creator').text().trim();

        if (!title || !link) return;

        // Check if exists
        const existing = db.prepare('SELECT id FROM news_articles WHERE url = ?').get(link);
        if (existing) {
          skipped++;
          return;
        }

        // Clean description
        const cleanDesc = $('<div>').html(description).text().trim();

        // Parse date
        let publishedAt;
        try {
          publishedAt = new Date(pubDate).toISOString();
        } catch {
          publishedAt = new Date().toISOString();
        }

        // Calculate reading time
        const wordCount = cleanDesc.split(' ').length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));

        // Insert article
        db.prepare(`
          INSERT INTO news_articles (
            source_id, title, content, summary, author, published_at, url,
            category, tags, word_count, reading_time, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sourceRecord.id,
          title,
          cleanDesc,
          cleanDesc.substring(0, 200) + '...',
          author || null,
          publishedAt,
          link,
          source.category,
          JSON.stringify([source.category]),
          wordCount,
          readingTime,
          'active'
        );

        added++;
        console.log(`  📄 Added: ${title.substring(0, 60)}...`);

      } catch (error) {
        console.error(`  ❌ Error processing article: ${error.message}`);
      }
    });

    console.log(`  ✅ ${source.name}: ${added} added, ${skipped} skipped`);
    return { added, skipped };

  } catch (error) {
    console.error(`❌ Failed to process ${source.name}: ${error.message}`);
    return { added: 0, skipped: 0 };
  }
}

async function main() {
  console.log('🚀 Adding more news sources...');

  const dbPath = path.join(__dirname, '../database.db');
  const db = new Database(dbPath);

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const source of SOURCES) {
    const result = await fetchFromSource(source, db);
    totalAdded += result.added;
    totalSkipped += result.skipped;

    // Small delay between sources
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final stats
  const totalArticles = db.prepare('SELECT COUNT(*) as count FROM news_articles').get().count;
  const totalSources = db.prepare('SELECT COUNT(*) as count FROM news_sources').get().count;

  const categoryStats = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM news_articles
    GROUP BY category
    ORDER BY count DESC
  `).all();

  console.log(`\n📊 Final Database Stats:
- Total articles: ${totalArticles}
- Total sources: ${totalSources}
- Added in this run: ${totalAdded}
- Skipped (duplicates): ${totalSkipped}
  `);

  console.log('\n📂 Articles by category:');
  categoryStats.forEach(cat => {
    console.log(`  - ${cat.category}: ${cat.count} articles`);
  });

  console.log('\n📰 Latest articles from each category:');
  for (const cat of categoryStats) {
    const latest = db.prepare(`
      SELECT title, published_at
      FROM news_articles
      WHERE category = ?
      ORDER BY published_at DESC
      LIMIT 2
    `).all(cat.category);

    console.log(`\n${cat.category.toUpperCase()}:`);
    latest.forEach(article => {
      console.log(`  - ${article.title}`);
    });
  }

  db.close();
  console.log('\n🎉 Successfully added more news sources and articles!');
}

main().catch(console.error);