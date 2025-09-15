/**
 * Update News Script - Run this regularly to keep articles fresh
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateNews() {
  console.log('🔄 Updating news database...');

  const dbPath = path.join(__dirname, '../database.db');
  const db = new Database(dbPath);

  try {
    // Get all enabled sources
    const sources = db.prepare('SELECT * FROM news_sources WHERE enabled = 1').all();
    console.log(`📰 Found ${sources.length} active sources`);

    let totalAdded = 0;
    let totalSkipped = 0;

    for (const source of sources) {
      console.log(`\n📡 Updating from ${source.name}...`);

      try {
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        });

        if (!response.ok) {
          console.log(`  ❌ Failed: HTTP ${response.status}`);
          continue;
        }

        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        let sourceAdded = 0;
        let sourceSkipped = 0;

        $('item').each((index, element) => {
          if (index >= 10) return false; // Limit to 10 new articles per source

          try {
            const $item = $(element);
            const title = $item.find('title').text().trim();
            const link = $item.find('link').text().trim();
            const description = $item.find('description').text().trim();
            const pubDate = $item.find('pubDate').text().trim();

            if (!title || !link) return;

            // Check if article already exists
            const existing = db.prepare('SELECT id FROM news_articles WHERE url = ?').get(link);
            if (existing) {
              sourceSkipped++;
              return;
            }

            // Parse publication date
            let publishedAt;
            try {
              publishedAt = new Date(pubDate).toISOString();
            } catch {
              publishedAt = new Date().toISOString();
            }

            // Only add articles from the last 7 days
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            if (new Date(publishedAt) < oneWeekAgo) {
              sourceSkipped++;
              return;
            }

            // Clean description
            const cleanDesc = $('<div>').html(description).text().trim();
            const wordCount = cleanDesc.split(' ').length;
            const readingTime = Math.max(1, Math.ceil(wordCount / 200));

            // Get source config
            const config = source.config ? JSON.parse(source.config) : {};

            // Insert article
            db.prepare(`
              INSERT INTO news_articles (
                source_id, title, content, summary, published_at, url,
                category, tags, word_count, reading_time, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              source.id,
              title,
              cleanDesc,
              cleanDesc.substring(0, 200) + '...',
              publishedAt,
              link,
              config.category || 'general',
              JSON.stringify([config.category || 'general']),
              wordCount,
              readingTime,
              'active'
            );

            sourceAdded++;
            console.log(`    📄 Added: ${title.substring(0, 60)}...`);

          } catch (error) {
            console.error(`    ❌ Error processing article: ${error.message}`);
          }
        });

        console.log(`  ✅ ${source.name}: ${sourceAdded} added, ${sourceSkipped} skipped`);
        totalAdded += sourceAdded;
        totalSkipped += sourceSkipped;

        // Small delay between sources
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`  ❌ Failed to fetch from ${source.name}: ${error.message}`);
      }
    }

    // Clean up old articles (older than 30 days)
    console.log('\n🧹 Cleaning up old articles...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleteResult = db.prepare(`
      DELETE FROM news_articles
      WHERE published_at < ?
    `).run(thirtyDaysAgo.toISOString());

    console.log(`  🗑️  Removed ${deleteResult.changes} old articles`);

    // Final stats
    const stats = {
      totalArticles: db.prepare('SELECT COUNT(*) as count FROM news_articles').get().count,
      recentArticles: db.prepare(`
        SELECT COUNT(*) as count FROM news_articles
        WHERE published_at >= datetime('now', '-24 hours')
      `).get().count,
      categoryStats: db.prepare(`
        SELECT category, COUNT(*) as count
        FROM news_articles
        GROUP BY category
        ORDER BY count DESC
      `).all()
    };

    console.log(`\n📊 Update Results:
- Articles added: ${totalAdded}
- Duplicates skipped: ${totalSkipped}
- Old articles removed: ${deleteResult.changes}
- Total articles in database: ${stats.totalArticles}
- Articles from last 24h: ${stats.recentArticles}
    `);

    console.log('\n📂 Current distribution:');
    stats.categoryStats.forEach(cat => {
      console.log(`  - ${cat.category}: ${cat.count} articles`);
    });

    // Show recent articles
    const recentArticles = db.prepare(`
      SELECT title, category, published_at, source_id
      FROM news_articles
      ORDER BY published_at DESC
      LIMIT 5
    `).all();

    console.log('\n📰 Latest articles:');
    recentArticles.forEach(article => {
      const publishedDate = new Date(article.published_at).toLocaleDateString();
      console.log(`  - [${article.category}] ${article.title} (${publishedDate})`);
    });

  } catch (error) {
    console.error('❌ Update failed:', error.message);
  } finally {
    db.close();
    console.log('\n🎉 News update completed!');
  }
}

// Run the update
updateNews().catch(console.error);