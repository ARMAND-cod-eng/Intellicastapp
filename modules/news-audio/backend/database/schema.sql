-- News Audio Module Database Schema
-- Modular database structure that integrates with existing app

-- News Sources Table
-- Stores different news sources (RSS feeds, APIs, etc.)
CREATE TABLE IF NOT EXISTS news_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    type ENUM('rss', 'api', 'scraper') NOT NULL,
    url TEXT NOT NULL,
    config JSON, -- Source-specific configuration
    enabled BOOLEAN DEFAULT true,
    last_fetched TIMESTAMP NULL,
    fetch_interval INTEGER DEFAULT 3600, -- in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_source (name, url)
);

-- News Articles Table
-- Stores fetched news articles before audio conversion
CREATE TABLE IF NOT EXISTS news_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    external_id VARCHAR(255), -- ID from the source
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    author VARCHAR(255),
    published_at TIMESTAMP,
    url TEXT,
    image_url TEXT,
    category VARCHAR(100),
    tags JSON,
    language VARCHAR(10) DEFAULT 'en',
    word_count INTEGER,
    reading_time INTEGER, -- estimated reading time in minutes
    status ENUM('pending', 'processed', 'failed', 'archived') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_published (published_at),
    INDEX idx_source_external (source_id, external_id)
);

-- News Audio Sessions Table
-- Stores audio generation sessions and results
CREATE TABLE IF NOT EXISTS news_audio_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- References main app's user system
    article_id INTEGER,
    session_name VARCHAR(255),
    voice_settings JSON, -- Voice configuration used
    audio_format VARCHAR(20) DEFAULT 'mp3',
    audio_quality VARCHAR(20) DEFAULT 'standard',
    duration INTEGER, -- in seconds
    file_size INTEGER, -- in bytes
    audio_path TEXT, -- relative path to audio file
    status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
    progress INTEGER DEFAULT 0, -- 0-100
    error_message TEXT,
    processing_time INTEGER, -- in seconds
    metadata JSON, -- Additional processing metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_created (created_at),
    INDEX idx_status (status)
);

-- User News Preferences Table
-- Stores per-user settings for news audio preferences
CREATE TABLE IF NOT EXISTS user_news_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, -- References main app's user system
    preferred_sources JSON, -- Array of source IDs
    categories JSON, -- Preferred categories
    languages JSON, -- Preferred languages
    max_articles_per_day INTEGER DEFAULT 10,
    auto_generate BOOLEAN DEFAULT false,
    voice_profile JSON, -- Default voice settings
    delivery_schedule JSON, -- When to generate/deliver content
    notification_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_prefs (user_id)
);

-- News Audio Playlists Table
-- User-created collections of news audio
CREATE TABLE IF NOT EXISTS news_audio_playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    auto_update BOOLEAN DEFAULT false,
    update_criteria JSON, -- Criteria for auto-updating
    total_duration INTEGER DEFAULT 0, -- Total playlist duration in seconds
    article_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_playlists (user_id)
);

-- Playlist Items Table
-- Links between playlists and audio sessions
CREATE TABLE IF NOT EXISTS news_audio_playlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (playlist_id) REFERENCES news_audio_playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES news_audio_sessions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_playlist_item (playlist_id, session_id),
    INDEX idx_playlist_position (playlist_id, position)
);

-- News Article Analytics Table
-- Track usage and popularity of articles
CREATE TABLE IF NOT EXISTS news_article_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER,
    event_type ENUM('view', 'generate', 'play', 'complete', 'share', 'favorite') NOT NULL,
    session_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    INDEX idx_article_analytics (article_id, event_type),
    INDEX idx_user_analytics (user_id, event_type),
    INDEX idx_created_analytics (created_at)
);

-- Insert default news sources
INSERT OR IGNORE INTO news_sources (name, type, url, config) VALUES
('BBC News RSS', 'rss', 'http://feeds.bbci.co.uk/news/rss.xml', '{"category": "general", "language": "en"}'),
('Reuters Top News', 'rss', 'http://feeds.reuters.com/reuters/topNews', '{"category": "general", "language": "en"}'),
('TechCrunch', 'rss', 'http://feeds.feedburner.com/TechCrunch/', '{"category": "technology", "language": "en"}'),
('CNN RSS', 'rss', 'http://rss.cnn.com/rss/edition.rss', '{"category": "general", "language": "en"}');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON news_articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON news_audio_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_enabled_type ON news_sources(enabled, type);