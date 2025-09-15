/**
 * News Audio Module Database Models
 * Provides data access layer for the news audio feature
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NewsAudioModels {
  constructor(dbPath = null) {
    // Use existing app database or create module-specific one
    this.dbPath = dbPath || path.join(__dirname, '../../../../backend/database.db');
    this.db = null;
  }

  /**
   * Initialize database connection and create tables if needed
   */
  async initialize() {
    try {
      // Ensure database directory exists
      await fs.ensureDir(path.dirname(this.dbPath));

      // Connect to database
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');

      // Create tables from schema
      await this.createTables();

      console.log('✅ News Audio database models initialized');
    } catch (error) {
      console.error('❌ Failed to initialize News Audio models:', error.message);
      throw error;
    }
  }

  /**
   * Create database tables from SQL schema
   */
  async createTables() {
    const schemaPath = path.join(__dirname, '../database/schema.sql');

    if (await fs.pathExists(schemaPath)) {
      const schema = await fs.readFile(schemaPath, 'utf8');

      // Split and execute SQL statements
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
  }

  /**
   * NEWS SOURCES METHODS
   */

  // Get all news sources
  getNewsSources(enabledOnly = false) {
    const query = enabledOnly
      ? 'SELECT * FROM news_sources WHERE enabled = 1 ORDER BY name'
      : 'SELECT * FROM news_sources ORDER BY name';

    return this.db.prepare(query).all();
  }

  // Add a new news source
  addNewsSource(sourceData) {
    const stmt = this.db.prepare(`
      INSERT INTO news_sources (name, type, url, config, enabled, fetch_interval)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      sourceData.name,
      sourceData.type,
      sourceData.url,
      JSON.stringify(sourceData.config || {}),
      sourceData.enabled || true,
      sourceData.fetch_interval || 3600
    );
  }

  // Update news source
  updateNewsSource(id, updates) {
    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'config') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE news_sources
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    return stmt.run(...values);
  }

  /**
   * NEWS ARTICLES METHODS
   */

  // Get articles with filtering
  getNewsArticles(filters = {}) {
    let query = `
      SELECT a.*, s.name as source_name
      FROM news_articles a
      LEFT JOIN news_sources s ON a.source_id = s.id
    `;

    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('a.status = ?');
      params.push(filters.status);
    }

    if (filters.source_id) {
      conditions.push('a.source_id = ?');
      params.push(filters.source_id);
    }

    if (filters.category) {
      conditions.push('a.category = ?');
      params.push(filters.category);
    }

    if (filters.language) {
      conditions.push('a.language = ?');
      params.push(filters.language);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.published_at DESC';

    if (filters.limit) {
      query += ` LIMIT ${parseInt(filters.limit)}`;
    }

    if (filters.offset) {
      query += ` OFFSET ${parseInt(filters.offset)}`;
    }

    return this.db.prepare(query).all(...params);
  }

  // Add news article
  addNewsArticle(articleData) {
    const stmt = this.db.prepare(`
      INSERT INTO news_articles (
        source_id, external_id, title, content, summary, author,
        published_at, url, image_url, category, tags, language,
        word_count, reading_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      articleData.source_id,
      articleData.external_id,
      articleData.title,
      articleData.content,
      articleData.summary || null,
      articleData.author || null,
      articleData.published_at,
      articleData.url || null,
      articleData.image_url || null,
      articleData.category || null,
      JSON.stringify(articleData.tags || []),
      articleData.language || 'en',
      articleData.word_count || 0,
      articleData.reading_time || 0,
      articleData.status || 'pending'
    );
  }

  // Update article status
  updateArticleStatus(id, status, errorMessage = null) {
    const stmt = this.db.prepare(`
      UPDATE news_articles
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(status, errorMessage, id);
  }

  /**
   * NEWS AUDIO SESSIONS METHODS
   */

  // Get audio sessions for user
  getAudioSessions(userId, filters = {}) {
    let query = `
      SELECT s.*, a.title as article_title, a.author, a.published_at
      FROM news_audio_sessions s
      LEFT JOIN news_articles a ON s.article_id = a.id
      WHERE s.user_id = ?
    `;
    const params = [userId];

    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY s.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT ${parseInt(filters.limit)}`;
    }

    return this.db.prepare(query).all(...params);
  }

  // Create audio session
  createAudioSession(sessionData) {
    const stmt = this.db.prepare(`
      INSERT INTO news_audio_sessions (
        user_id, article_id, session_name, voice_settings,
        audio_format, audio_quality, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      sessionData.user_id,
      sessionData.article_id,
      sessionData.session_name || null,
      JSON.stringify(sessionData.voice_settings || {}),
      sessionData.audio_format || 'mp3',
      sessionData.audio_quality || 'standard',
      sessionData.status || 'queued',
      JSON.stringify(sessionData.metadata || {})
    );
  }

  // Update audio session
  updateAudioSession(id, updates) {
    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (['voice_settings', 'metadata'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE news_audio_sessions
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    return stmt.run(...values);
  }

  /**
   * USER PREFERENCES METHODS
   */

  // Get user preferences
  getUserPreferences(userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM user_news_preferences WHERE user_id = ?
    `);

    const result = stmt.get(userId);
    if (result) {
      // Parse JSON fields
      ['preferred_sources', 'categories', 'languages', 'voice_profile', 'delivery_schedule', 'notification_settings'].forEach(field => {
        if (result[field]) {
          result[field] = JSON.parse(result[field]);
        }
      });
    }

    return result;
  }

  // Save user preferences
  saveUserPreferences(userId, preferences) {
    const existing = this.getUserPreferences(userId);

    if (existing) {
      // Update existing preferences
      const stmt = this.db.prepare(`
        UPDATE user_news_preferences
        SET preferred_sources = ?, categories = ?, languages = ?,
            max_articles_per_day = ?, auto_generate = ?, voice_profile = ?,
            delivery_schedule = ?, notification_settings = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);

      return stmt.run(
        JSON.stringify(preferences.preferred_sources || []),
        JSON.stringify(preferences.categories || []),
        JSON.stringify(preferences.languages || ['en']),
        preferences.max_articles_per_day || 10,
        preferences.auto_generate || false,
        JSON.stringify(preferences.voice_profile || {}),
        JSON.stringify(preferences.delivery_schedule || {}),
        JSON.stringify(preferences.notification_settings || {}),
        userId
      );
    } else {
      // Create new preferences
      const stmt = this.db.prepare(`
        INSERT INTO user_news_preferences (
          user_id, preferred_sources, categories, languages,
          max_articles_per_day, auto_generate, voice_profile,
          delivery_schedule, notification_settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      return stmt.run(
        userId,
        JSON.stringify(preferences.preferred_sources || []),
        JSON.stringify(preferences.categories || []),
        JSON.stringify(preferences.languages || ['en']),
        preferences.max_articles_per_day || 10,
        preferences.auto_generate || false,
        JSON.stringify(preferences.voice_profile || {}),
        JSON.stringify(preferences.delivery_schedule || {}),
        JSON.stringify(preferences.notification_settings || {})
      );
    }
  }

  /**
   * ANALYTICS METHODS
   */

  // Track user event
  trackEvent(articleId, userId, eventType, sessionData = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO news_article_analytics (
        article_id, user_id, event_type, session_data
      ) VALUES (?, ?, ?, ?)
    `);

    return stmt.run(
      articleId,
      userId || null,
      eventType,
      JSON.stringify(sessionData)
    );
  }

  // Get analytics data
  getAnalytics(filters = {}) {
    let query = `
      SELECT
        event_type,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM news_article_analytics
    `;

    const conditions = [];
    const params = [];

    if (filters.article_id) {
      conditions.push('article_id = ?');
      params.push(filters.article_id);
    }

    if (filters.user_id) {
      conditions.push('user_id = ?');
      params.push(filters.user_id);
    }

    if (filters.start_date) {
      conditions.push('created_at >= ?');
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push('created_at <= ?');
      params.push(filters.end_date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY event_type, DATE(created_at) ORDER BY date DESC';

    return this.db.prepare(query).all(...params);
  }

  /**
   * Cleanup and maintenance
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default NewsAudioModels;