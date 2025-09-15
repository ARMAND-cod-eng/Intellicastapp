/**
 * News API Routes
 * Handles all news-related API endpoints
 */

import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize database connection
const dbPath = path.join(__dirname, '../database.db');
let db = null;

try {
  db = new Database(dbPath);
  console.log('✅ News API: Connected to database');
} catch (error) {
  console.error('❌ News API: Failed to connect to database:', error.message);
}

/**
 * GET /api/news/articles
 * Fetch news articles with filtering and pagination
 */
router.get('/articles', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const {
      category = 'all',
      limit = 20,
      offset = 0,
      source_id,
      status = 'active'
    } = req.query;

    // Build query
    let query = `
      SELECT
        a.*,
        s.name as source_name,
        s.type as source_type
      FROM news_articles a
      LEFT JOIN news_sources s ON a.source_id = s.id
      WHERE a.status = ?
    `;
    const params = [status];

    // Add category filter
    if (category && category !== 'all') {
      query += ' AND a.category = ?';
      params.push(category);
    }

    // Add source filter
    if (source_id) {
      query += ' AND a.source_id = ?';
      params.push(source_id);
    }

    // Add ordering and pagination
    query += ' ORDER BY a.published_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const articles = db.prepare(query).all(...params);

    // Transform articles to match frontend interface
    const transformedArticles = articles.map(article => ({
      id: article.id,
      title: article.title,
      summary: article.summary || article.content?.substring(0, 200) + '...',
      content: article.content,
      author: article.author,
      published_at: article.published_at,
      source_name: article.source_name || 'Unknown Source',
      category: article.category || 'general',
      status: 'pending', // Default to pending since we don't have audio sessions yet
      url: article.url,
      image_url: article.image_url,
      word_count: article.word_count,
      reading_time: article.reading_time,
      tags: article.tags ? JSON.parse(article.tags) : []
    }));

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM news_articles a
      WHERE a.status = ?
    `;
    const countParams = [status];

    if (category && category !== 'all') {
      countQuery += ' AND a.category = ?';
      countParams.push(category);
    }

    if (source_id) {
      countQuery += ' AND a.source_id = ?';
      countParams.push(source_id);
    }

    const totalResult = db.prepare(countQuery).get(...countParams);
    const total = totalResult?.total || 0;

    res.json({
      articles: transformedArticles,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + transformedArticles.length < total
      }
    });

  } catch (error) {
    console.error('❌ Error fetching articles:', error.message);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

/**
 * GET /api/news/sources
 * Fetch all news sources
 */
router.get('/sources', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const sources = db.prepare(`
      SELECT
        s.*,
        COUNT(a.id) as article_count,
        MAX(a.published_at) as latest_article
      FROM news_sources s
      LEFT JOIN news_articles a ON s.id = a.source_id
      GROUP BY s.id
      ORDER BY s.name
    `).all();

    res.json({ sources });

  } catch (error) {
    console.error('❌ Error fetching sources:', error.message);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

/**
 * GET /api/news/categories
 * Get available categories with article counts
 */
router.get('/categories', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const categories = db.prepare(`
      SELECT
        category,
        COUNT(*) as count
      FROM news_articles
      WHERE status = 'active'
      GROUP BY category
      ORDER BY count DESC
    `).all();

    // Add 'all' category
    const totalArticles = categories.reduce((sum, cat) => sum + cat.count, 0);
    const result = [
      { category: 'all', count: totalArticles },
      ...categories
    ];

    res.json({ categories: result });

  } catch (error) {
    console.error('❌ Error fetching categories:', error.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/news/article/:id
 * Get single article by ID
 */
router.get('/article/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const { id } = req.params;

    const article = db.prepare(`
      SELECT
        a.*,
        s.name as source_name,
        s.type as source_type
      FROM news_articles a
      LEFT JOIN news_sources s ON a.source_id = s.id
      WHERE a.id = ?
    `).get(id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Transform article
    const transformedArticle = {
      id: article.id,
      title: article.title,
      summary: article.summary,
      content: article.content,
      author: article.author,
      published_at: article.published_at,
      source_name: article.source_name,
      category: article.category,
      status: 'pending',
      url: article.url,
      image_url: article.image_url,
      word_count: article.word_count,
      reading_time: article.reading_time,
      tags: article.tags ? JSON.parse(article.tags) : []
    };

    res.json({ article: transformedArticle });

  } catch (error) {
    console.error('❌ Error fetching article:', error.message);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

/**
 * GET /api/news/stats
 * Get news database statistics
 */
router.get('/stats', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const stats = {
      totalArticles: db.prepare('SELECT COUNT(*) as count FROM news_articles WHERE status = "active"').get().count,
      totalSources: db.prepare('SELECT COUNT(*) as count FROM news_sources WHERE enabled = 1').get().count,
      recentArticles: db.prepare(`
        SELECT COUNT(*) as count FROM news_articles
        WHERE status = 'active' AND published_at >= datetime('now', '-24 hours')
      `).get().count,
      categoryDistribution: db.prepare(`
        SELECT category, COUNT(*) as count
        FROM news_articles
        WHERE status = 'active'
        GROUP BY category
        ORDER BY count DESC
      `).all()
    };

    res.json({ stats });

  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * POST /api/news/refresh
 * Trigger news refresh (run update script)
 */
router.post('/refresh', async (req, res) => {
  try {
    // Import and run the news update script
    const { spawn } = await import('child_process');
    const scriptPath = path.join(__dirname, '../scripts/update-news.js');

    const updateProcess = spawn('node', [scriptPath], {
      cwd: path.dirname(__dirname)
    });

    let output = '';
    let error = '';

    updateProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    updateProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    updateProcess.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          message: 'News refresh completed successfully',
          output: output.split('\n').slice(-10).join('\n') // Last 10 lines
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'News refresh failed',
          error: error
        });
      }
    });

    // Set timeout for the refresh operation
    setTimeout(() => {
      updateProcess.kill();
      res.status(408).json({
        success: false,
        message: 'News refresh timed out'
      });
    }, 30000); // 30 second timeout

  } catch (error) {
    console.error('❌ Error refreshing news:', error.message);
    res.status(500).json({ error: 'Failed to refresh news' });
  }
});

export default router;