-- Content Enrichment Database Schema Extension
-- Additional tables for enriched article content and analysis

PRAGMA foreign_keys = ON;

-- Article enrichment data
CREATE TABLE IF NOT EXISTS article_enrichment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL UNIQUE,

    -- Full text extraction
    full_text TEXT,
    extracted_at DATETIME,
    extraction_method TEXT DEFAULT 'readability',
    extraction_success BOOLEAN DEFAULT 0,

    -- Content analysis
    reading_time_minutes REAL,
    complexity_score REAL, -- 0.0 to 1.0, higher = more complex
    word_count INTEGER,
    sentence_count INTEGER,
    paragraph_count INTEGER,
    avg_sentence_length REAL,
    flesch_reading_ease REAL,
    flesch_kincaid_grade REAL,

    -- Stance and bias analysis
    stance TEXT, -- 'positive', 'negative', 'neutral'
    stance_confidence REAL,
    bias_score REAL, -- -1.0 to 1.0, negative = left, positive = right
    bias_confidence REAL,
    subjectivity_score REAL, -- 0.0 to 1.0, higher = more subjective

    -- Processing metadata
    enriched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processing_duration_ms INTEGER,
    processing_version TEXT DEFAULT '1.0',

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Named entities extracted from articles
CREATE TABLE IF NOT EXISTS article_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,

    -- Entity information
    entity_text TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- PERSON, ORG, GPE, EVENT, etc.
    start_char INTEGER,
    end_char INTEGER,

    -- Confidence and context
    confidence REAL DEFAULT 1.0,
    context TEXT, -- Surrounding text for context

    -- Entity linking (future enhancement)
    canonical_name TEXT,
    entity_id TEXT, -- External entity ID (Wikidata, etc.)

    -- Frequency and importance
    mention_count INTEGER DEFAULT 1,
    importance_score REAL DEFAULT 0.5, -- 0.0 to 1.0

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Article tags generated through zero-shot classification
CREATE TABLE IF NOT EXISTS article_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,

    -- Tag information
    tag TEXT NOT NULL,
    confidence REAL NOT NULL,
    tag_category TEXT, -- 'topic', 'sentiment', 'genre', etc.

    -- Generation metadata
    classifier_model TEXT DEFAULT 'zero_shot_local',
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE(article_id, tag, tag_category)
);

-- Important quotes extracted from articles
CREATE TABLE IF NOT EXISTS article_quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,

    -- Quote content
    quote_text TEXT NOT NULL,
    speaker TEXT, -- Who said it (if identifiable)
    context TEXT, -- Surrounding context

    -- Position in article
    start_char INTEGER,
    end_char INTEGER,
    paragraph_number INTEGER,

    -- Importance scoring
    importance_score REAL DEFAULT 0.5,
    sentiment_score REAL, -- -1.0 to 1.0

    -- Quote characteristics
    quote_type TEXT, -- 'direct', 'reported', 'paraphrase'
    is_key_quote BOOLEAN DEFAULT 0,

    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Article relationships and similarities
CREATE TABLE IF NOT EXISTS article_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    related_article_id INTEGER NOT NULL,

    -- Relationship details
    relationship_type TEXT NOT NULL, -- 'similar', 'followup', 'contradiction', 'update'
    similarity_score REAL NOT NULL,
    relationship_strength TEXT, -- 'weak', 'moderate', 'strong'

    -- What makes them related
    shared_entities TEXT, -- JSON array of shared entities
    shared_tags TEXT,     -- JSON array of shared tags
    content_overlap REAL, -- Percentage of content overlap

    -- Detection metadata
    detection_method TEXT DEFAULT 'entity_overlap',
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence REAL DEFAULT 0.5,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (related_article_id) REFERENCES articles(id) ON DELETE CASCADE,

    -- Prevent duplicate relationships
    UNIQUE(article_id, related_article_id, relationship_type),

    -- Prevent self-references
    CHECK (article_id != related_article_id)
);

-- Topic modeling and clustering results
CREATE TABLE IF NOT EXISTS article_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,

    -- Topic information
    topic_id INTEGER NOT NULL,
    topic_name TEXT,
    topic_keywords TEXT, -- JSON array of keywords
    probability REAL NOT NULL, -- Probability of article belonging to topic

    -- Topic modeling metadata
    model_type TEXT DEFAULT 'lda',
    model_version TEXT,
    num_topics INTEGER,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Content quality and credibility scores
CREATE TABLE IF NOT EXISTS article_quality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL UNIQUE,

    -- Quality metrics
    credibility_score REAL, -- 0.0 to 1.0
    fact_density REAL, -- Ratio of factual statements
    source_diversity INTEGER, -- Number of different sources cited
    citation_count INTEGER, -- Number of citations/references

    -- Content quality indicators
    grammar_score REAL, -- Grammar and language quality
    coherence_score REAL, -- Logical flow and coherence
    completeness_score REAL, -- How complete the coverage is

    -- Bias and objectivity
    objectivity_score REAL, -- 0.0 to 1.0, higher = more objective
    emotional_intensity REAL, -- 0.0 to 1.0, emotional language usage

    -- Source reliability (if available)
    source_credibility REAL,
    author_credibility REAL,

    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Processing job tracking for enrichment pipeline
CREATE TABLE IF NOT EXISTS enrichment_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,

    -- Job information
    job_type TEXT NOT NULL, -- 'full_enrichment', 'entity_extraction', etc.
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'

    -- Timing
    started_at DATETIME,
    completed_at DATETIME,
    duration_ms INTEGER,

    -- Results
    steps_completed TEXT, -- JSON array of completed steps
    steps_failed TEXT,    -- JSON array of failed steps

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Configuration
    pipeline_config TEXT, -- JSON configuration used

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_article_enrichment_article_id ON article_enrichment(article_id);
CREATE INDEX IF NOT EXISTS idx_article_enrichment_enriched_at ON article_enrichment(enriched_at);

CREATE INDEX IF NOT EXISTS idx_article_entities_article_id ON article_entities(article_id);
CREATE INDEX IF NOT EXISTS idx_article_entities_type ON article_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_article_entities_text ON article_entities(entity_text);
CREATE INDEX IF NOT EXISTS idx_article_entities_importance ON article_entities(importance_score DESC);

CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags(tag);
CREATE INDEX IF NOT EXISTS idx_article_tags_confidence ON article_tags(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_article_tags_category ON article_tags(tag_category);

CREATE INDEX IF NOT EXISTS idx_article_quotes_article_id ON article_quotes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_quotes_importance ON article_quotes(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_article_quotes_key ON article_quotes(is_key_quote);

CREATE INDEX IF NOT EXISTS idx_article_relationships_article_id ON article_relationships(article_id);
CREATE INDEX IF NOT EXISTS idx_article_relationships_related ON article_relationships(related_article_id);
CREATE INDEX IF NOT EXISTS idx_article_relationships_type ON article_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_article_relationships_score ON article_relationships(similarity_score DESC);

CREATE INDEX IF NOT EXISTS idx_article_topics_article_id ON article_topics(article_id);
CREATE INDEX IF NOT EXISTS idx_article_topics_topic_id ON article_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_article_topics_probability ON article_topics(probability DESC);

CREATE INDEX IF NOT EXISTS idx_article_quality_article_id ON article_quality(article_id);
CREATE INDEX IF NOT EXISTS idx_article_quality_credibility ON article_quality(credibility_score DESC);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_article_id ON enrichment_jobs(article_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_created_at ON enrichment_jobs(created_at DESC);

-- Views for common queries
CREATE VIEW IF NOT EXISTS enriched_articles AS
SELECT
    a.*,
    e.full_text,
    e.reading_time_minutes,
    e.complexity_score,
    e.stance,
    e.bias_score,
    e.subjectivity_score,
    q.credibility_score,
    q.objectivity_score
FROM articles a
LEFT JOIN article_enrichment e ON a.id = e.article_id
LEFT JOIN article_quality q ON a.id = q.article_id;

CREATE VIEW IF NOT EXISTS article_entity_summary AS
SELECT
    article_id,
    entity_type,
    COUNT(*) as entity_count,
    GROUP_CONCAT(entity_text, ', ') as entities,
    AVG(importance_score) as avg_importance
FROM article_entities
GROUP BY article_id, entity_type;

CREATE VIEW IF NOT EXISTS article_tag_summary AS
SELECT
    article_id,
    tag_category,
    COUNT(*) as tag_count,
    GROUP_CONCAT(tag, ', ') as tags,
    AVG(confidence) as avg_confidence
FROM article_tags
GROUP BY article_id, tag_category;

-- Triggers to update article processing status
CREATE TRIGGER IF NOT EXISTS update_article_processed
AFTER INSERT ON article_enrichment
FOR EACH ROW
BEGIN
    UPDATE articles SET is_processed = 1 WHERE id = NEW.article_id;
END;

-- Function to calculate article similarity based on shared entities and tags
-- (This would be implemented in the application layer)