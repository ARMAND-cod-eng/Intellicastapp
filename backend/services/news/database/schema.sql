-- News Aggregation System Database Schema
-- SQLite schema with full-text search and advanced indexing

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- News Sources Configuration
CREATE TABLE news_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('newsapi', 'rss', 'custom')),
    url TEXT NOT NULL,
    api_key TEXT, -- For NewsAPI
    category TEXT DEFAULT 'general',
    country TEXT DEFAULT 'us',
    language TEXT DEFAULT 'en',
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest priority
    rate_limit_per_hour INTEGER DEFAULT 10,
    last_fetch_at DATETIME,
    fetch_count_today INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Configuration JSON for source-specific settings
    config_json TEXT DEFAULT '{}',

    -- Error tracking
    consecutive_errors INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at DATETIME
);

-- Articles table with full-text search
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Basic article info
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    summary TEXT, -- AI-generated summary
    url TEXT NOT NULL,
    url_hash TEXT UNIQUE, -- SHA-256 hash of URL for deduplication

    -- Source info
    source_id INTEGER NOT NULL,
    source_name TEXT NOT NULL,
    author TEXT,

    -- Timing
    published_at DATETIME NOT NULL,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Classification and priority
    category TEXT NOT NULL DEFAULT 'general',
    priority TEXT NOT NULL DEFAULT 'regular' CHECK (priority IN ('breaking', 'trending', 'regular')),
    confidence_score REAL DEFAULT 0.0, -- Classification confidence

    -- Content analysis
    word_count INTEGER DEFAULT 0,
    reading_time INTEGER DEFAULT 0, -- in minutes
    language TEXT DEFAULT 'en',
    sentiment_score REAL DEFAULT 0.0, -- -1 to 1

    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- Content flags
    is_duplicate BOOLEAN DEFAULT 0,
    duplicate_of INTEGER REFERENCES articles(id),
    is_processed BOOLEAN DEFAULT 0, -- AI processing complete
    has_audio BOOLEAN DEFAULT 0, -- Audio version generated

    -- Media
    image_url TEXT,
    video_url TEXT,

    -- Embeddings for similarity detection (stored as JSON array)
    embedding_vector TEXT, -- JSON array of floats
    embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',

    FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE
);

-- Full-text search index
CREATE VIRTUAL TABLE articles_fts USING fts5(
    title,
    description,
    content,
    summary,
    author,
    source_name,
    category,
    content=articles,
    content_rowid=id
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER articles_fts_insert AFTER INSERT ON articles BEGIN
    INSERT INTO articles_fts(rowid, title, description, content, summary, author, source_name, category)
    VALUES (new.id, new.title, new.description, new.content, new.summary, new.author, new.source_name, new.category);
END;

CREATE TRIGGER articles_fts_delete AFTER DELETE ON articles BEGIN
    INSERT INTO articles_fts(articles_fts, rowid, title, description, content, summary, author, source_name, category)
    VALUES ('delete', old.id, old.title, old.description, old.content, old.summary, old.author, old.source_name, old.category);
END;

CREATE TRIGGER articles_fts_update AFTER UPDATE ON articles BEGIN
    INSERT INTO articles_fts(articles_fts, rowid, title, description, content, summary, author, source_name, category)
    VALUES ('delete', old.id, old.title, old.description, old.content, old.summary, old.author, old.source_name, old.category);
    INSERT INTO articles_fts(rowid, title, description, content, summary, author, source_name, category)
    VALUES (new.id, new.title, new.description, new.content, new.summary, new.author, new.source_name, new.category);
END;

-- Article categories with AI classification
CREATE TABLE article_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0,
    classifier_model TEXT DEFAULT 'bert-base-uncased',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE(article_id, category)
);

-- Keywords and tags
CREATE TABLE article_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    relevance_score REAL DEFAULT 1.0,
    extraction_method TEXT DEFAULT 'tfidf', -- tfidf, yake, bert
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Article similarity for deduplication
CREATE TABLE article_similarities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article1_id INTEGER NOT NULL,
    article2_id INTEGER NOT NULL,
    similarity_score REAL NOT NULL,
    comparison_method TEXT DEFAULT 'cosine', -- cosine, jaccard, fuzzy
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article1_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (article2_id) REFERENCES articles(id) ON DELETE CASCADE,

    CHECK (article1_id != article2_id),
    UNIQUE(article1_id, article2_id)
);

-- Fetch job logs and rate limiting
CREATE TABLE fetch_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    job_type TEXT NOT NULL, -- 'scheduled', 'manual', 'retry'
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),

    -- Timing
    started_at DATETIME,
    completed_at DATETIME,
    duration_ms INTEGER,

    -- Results
    articles_fetched INTEGER DEFAULT 0,
    articles_new INTEGER DEFAULT 0,
    articles_duplicates INTEGER DEFAULT 0,
    articles_processed INTEGER DEFAULT 0,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Rate limiting info
    rate_limit_remaining INTEGER,
    rate_limit_reset_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE
);

-- System configuration and rate limits
CREATE TABLE system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audio generation tracking
CREATE TABLE article_audio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL UNIQUE,
    audio_path TEXT,
    audio_url TEXT,
    duration_seconds INTEGER,
    voice_model TEXT DEFAULT 'tts-1',
    speaker_voice TEXT DEFAULT 'alloy',
    generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_priority ON articles(priority);
CREATE INDEX idx_articles_source_id ON articles(source_id);
CREATE INDEX idx_articles_url_hash ON articles(url_hash);
CREATE INDEX idx_articles_is_duplicate ON articles(is_duplicate);
CREATE INDEX idx_articles_fetched_at ON articles(fetched_at);
CREATE INDEX idx_articles_priority_published ON articles(priority, published_at DESC);

CREATE INDEX idx_news_sources_type ON news_sources(type);
CREATE INDEX idx_news_sources_priority ON news_sources(priority);
CREATE INDEX idx_news_sources_active ON news_sources(is_active);
CREATE INDEX idx_news_sources_last_fetch ON news_sources(last_fetch_at);

CREATE INDEX idx_fetch_jobs_source_id ON fetch_jobs(source_id);
CREATE INDEX idx_fetch_jobs_status ON fetch_jobs(status);
CREATE INDEX idx_fetch_jobs_created_at ON fetch_jobs(created_at DESC);

CREATE INDEX idx_article_similarities_score ON article_similarities(similarity_score DESC);
CREATE INDEX idx_article_categories_category ON article_categories(category);
CREATE INDEX idx_article_keywords_keyword ON article_keywords(keyword);

-- Insert default news sources
INSERT INTO news_sources (name, type, url, category, priority, rate_limit_per_hour, config_json) VALUES
-- RSS Feeds (Higher priority, no API limits)
('BBC News', 'rss', 'https://feeds.bbci.co.uk/news/rss.xml', 'general', 1, 60, '{"timeout": 30000}'),
('BBC Technology', 'rss', 'https://feeds.bbci.co.uk/news/technology/rss.xml', 'technology', 2, 60, '{"timeout": 30000}'),
('CNN Top Stories', 'rss', 'http://rss.cnn.com/rss/edition.rss', 'general', 1, 60, '{"timeout": 30000}'),
('CNN Technology', 'rss', 'http://rss.cnn.com/rss/edition_technology.rss', 'technology', 2, 60, '{"timeout": 30000}'),
('Reuters World News', 'rss', 'https://feeds.reuters.com/reuters/worldNews', 'world', 1, 60, '{"timeout": 30000}'),
('Reuters Technology', 'rss', 'https://feeds.reuters.com/reuters/technologyNews', 'technology', 2, 60, '{"timeout": 30000}'),
('TechCrunch', 'rss', 'https://techcrunch.com/feed/', 'technology', 1, 60, '{"timeout": 30000}'),
('The Verge', 'rss', 'https://www.theverge.com/rss/index.xml', 'technology', 1, 60, '{"timeout": 30000}'),

-- NewsAPI sources (Lower priority due to rate limits)
('NewsAPI General', 'newsapi', 'https://newsapi.org/v2/top-headlines', 'general', 3, 4, '{"country": "us", "pageSize": 20}'),
('NewsAPI Technology', 'newsapi', 'https://newsapi.org/v2/top-headlines', 'technology', 3, 4, '{"country": "us", "category": "technology", "pageSize": 15}'),
('NewsAPI Business', 'newsapi', 'https://newsapi.org/v2/top-headlines', 'business', 4, 4, '{"country": "us", "category": "business", "pageSize": 15}'),
('NewsAPI Science', 'newsapi', 'https://newsapi.org/v2/top-headlines', 'science', 4, 4, '{"country": "us", "category": "science", "pageSize": 10}');

-- Insert system configuration
INSERT INTO system_config (key, value, description) VALUES
('newsapi_daily_limit', '100', 'Daily request limit for NewsAPI'),
('newsapi_requests_today', '0', 'Number of NewsAPI requests made today'),
('newsapi_last_reset', datetime('now'), 'Last time NewsAPI counter was reset'),
('embedding_model', 'all-MiniLM-L6-v2', 'Model used for article embeddings'),
('similarity_threshold', '0.85', 'Threshold for duplicate detection'),
('max_articles_per_fetch', '50', 'Maximum articles to fetch per job'),
('scheduler_interval_minutes', '30', 'Minutes between scheduled fetches'),
('enable_deduplication', '1', 'Enable article deduplication'),
('enable_categorization', '1', 'Enable AI categorization'),
('enable_audio_generation', '1', 'Enable audio generation for articles');

-- Create views for common queries
CREATE VIEW articles_with_source AS
SELECT
    a.*,
    s.name as source_name_full,
    s.type as source_type,
    s.priority as source_priority
FROM articles a
JOIN news_sources s ON a.source_id = s.id;

CREATE VIEW recent_articles AS
SELECT *
FROM articles_with_source
WHERE fetched_at > datetime('now', '-24 hours')
ORDER BY priority ASC, published_at DESC;

CREATE VIEW breaking_news AS
SELECT *
FROM articles_with_source
WHERE priority = 'breaking'
ORDER BY published_at DESC;

CREATE VIEW trending_articles AS
SELECT *
FROM articles_with_source
WHERE priority = 'trending'
ORDER BY published_at DESC;

-- Trigger to update timestamps
CREATE TRIGGER update_articles_timestamp
AFTER UPDATE ON articles
FOR EACH ROW
BEGIN
    UPDATE articles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_sources_timestamp
AFTER UPDATE ON news_sources
FOR EACH ROW
BEGIN
    UPDATE news_sources SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;