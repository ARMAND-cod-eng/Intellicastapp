/**
 * Zero-shot Tag Classification Service
 * Generates relevant tags for articles using zero-shot classification
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { Database } from 'better-sqlite3';

export interface TagPrediction {
  tag: string;
  confidence: number;
  category: string;
}

export interface TagClassificationResult {
  tags: TagPrediction[];
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export interface TagCategories {
  topics: string[];
  sentiment: string[];
  genre: string[];
  urgency: string[];
  geography: string[];
  industry: string[];
}

export class TagClassificationService {
  private db: Database;
  private pythonScriptPath: string;
  private tempDir: string;
  private initialized = false;

  // Predefined tag categories and options
  private readonly tagCategories: TagCategories = {
    topics: [
      'politics', 'technology', 'business', 'science', 'health', 'sports', 'entertainment',
      'world news', 'climate change', 'economy', 'artificial intelligence', 'cybersecurity',
      'space exploration', 'medicine', 'education', 'finance', 'startup', 'cryptocurrency',
      'social media', 'privacy', 'regulation', 'innovation', 'research', 'data science',
      'renewable energy', 'transportation', 'healthcare', 'biotech', 'gaming', 'movies',
      'music', 'books', 'art', 'culture', 'travel', 'food', 'lifestyle', 'fashion',
      'real estate', 'automotive', 'aviation', 'maritime', 'agriculture', 'manufacturing'
    ],
    sentiment: [
      'positive', 'negative', 'neutral', 'optimistic', 'pessimistic', 'controversial',
      'breaking news', 'urgent', 'alarming', 'hopeful', 'concerning', 'exciting'
    ],
    genre: [
      'breaking news', 'analysis', 'opinion', 'interview', 'feature story', 'investigative',
      'press release', 'review', 'editorial', 'commentary', 'report', 'summary',
      'announcement', 'update', 'profile', 'how-to', 'explanation', 'prediction'
    ],
    urgency: [
      'breaking', 'urgent', 'developing', 'update', 'follow-up', 'ongoing',
      'concluded', 'historical', 'routine', 'scheduled', 'planned'
    ],
    geography: [
      'global', 'international', 'national', 'regional', 'local', 'urban', 'rural',
      'north america', 'europe', 'asia', 'africa', 'south america', 'oceania',
      'middle east', 'arctic', 'developing countries', 'emerging markets'
    ],
    industry: [
      'technology', 'finance', 'healthcare', 'energy', 'telecommunications', 'retail',
      'automotive', 'aerospace', 'defense', 'construction', 'agriculture', 'mining',
      'pharmaceuticals', 'biotechnology', 'media', 'entertainment', 'hospitality',
      'logistics', 'consulting', 'legal services', 'real estate', 'insurance'
    ]
  };

  constructor(
    db: Database,
    options: {
      tempDir?: string;
      pythonPath?: string;
      modelName?: string;
      customCategories?: Partial<TagCategories>;
    } = {}
  ) {
    this.db = db;
    this.tempDir = options.tempDir || path.join(process.cwd(), 'temp');
    this.pythonScriptPath = path.join(__dirname, 'scripts', 'tag_classifier.py');

    // Merge custom categories if provided
    if (options.customCategories) {
      Object.keys(options.customCategories).forEach(category => {
        const key = category as keyof TagCategories;
        if (options.customCategories![key]) {
          this.tagCategories[key] = [...this.tagCategories[key], ...options.customCategories![key]!];
        }
      });
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Create Python script directory
      const scriptsDir = path.join(__dirname, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Create the Python classification script
      await this.createPythonScript();

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize tag classification service: ${error}`);
    }
  }

  async generateTags(
    articleId: number,
    text: string,
    title?: string,
    options: {
      minConfidence?: number;
      maxTagsPerCategory?: number;
      includeCategories?: (keyof TagCategories)[];
      customHypothesisTemplate?: string;
    } = {}
  ): Promise<TagClassificationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const {
      minConfidence = 0.3,
      maxTagsPerCategory = 5,
      includeCategories = ['topics', 'sentiment', 'genre'],
      customHypothesisTemplate
    } = options;

    try {
      // Prepare input text (combine title and content)
      const inputText = title ? `${title}\n\n${text}` : text;

      // Generate tags for each category
      const allTags: TagPrediction[] = [];

      for (const category of includeCategories) {
        if (this.tagCategories[category]) {
          const categoryTags = await this.classifyCategory(
            inputText,
            category,
            this.tagCategories[category],
            { minConfidence, maxTags: maxTagsPerCategory, customHypothesisTemplate }
          );
          allTags.push(...categoryTags);
        }
      }

      // Store tags in database
      await this.storeTags(articleId, allTags);

      const processingTimeMs = Date.now() - startTime;

      return {
        tags: allTags,
        processingTimeMs,
        success: true
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      return {
        tags: [],
        processingTimeMs,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async classifyCategory(
    text: string,
    category: keyof TagCategories,
    candidates: string[],
    options: {
      minConfidence: number;
      maxTags: number;
      customHypothesisTemplate?: string;
    }
  ): Promise<TagPrediction[]> {
    return new Promise((resolve, reject) => {
      const config = {
        candidates,
        category,
        min_confidence: options.minConfidence,
        max_tags: options.maxTags,
        hypothesis_template: options.customHypothesisTemplate || this.getHypothesisTemplate(category)
      };

      const pythonProcess = spawn('python', [
        this.pythonScriptPath,
        JSON.stringify(config)
      ]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python classification process failed: ${errorData}`));
          return;
        }

        try {
          const result = JSON.parse(outputData);
          if (result.success) {
            const tags = result.predictions.map((pred: any) => ({
              tag: pred.label,
              confidence: pred.score,
              category
            }));
            resolve(tags);
          } else {
            reject(new Error(result.error || 'Classification failed'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse classification results: ${error}`));
        }
      });

      // Send text to Python process
      pythonProcess.stdin.write(text);
      pythonProcess.stdin.end();

      // Set timeout
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Classification timeout'));
      }, 30000); // 30 second timeout
    });
  }

  private getHypothesisTemplate(category: keyof TagCategories): string {
    const templates = {
      topics: "This text is about {}.",
      sentiment: "The sentiment of this text is {}.",
      genre: "This text is a {}.",
      urgency: "This news is {}.",
      geography: "This news is related to {}.",
      industry: "This news is about the {} industry."
    };

    return templates[category] || "This text is related to {}.";
  }

  private async storeTags(
    articleId: number,
    tags: TagPrediction[]
  ): Promise<void> {
    if (tags.length === 0) return;

    // Use INSERT OR REPLACE to handle duplicates
    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO article_tags (
        article_id, tag, confidence, tag_category, classifier_model
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const tag of tags) {
        insertStmt.run(
          articleId,
          tag.tag,
          tag.confidence,
          tag.category,
          'zero_shot_local'
        );
      }
    });

    transaction();
  }

  async getArticleTags(
    articleId: number,
    options: {
      categories?: string[];
      minConfidence?: number;
      limit?: number;
    } = {}
  ): Promise<TagPrediction[]> {
    const {
      categories = [],
      minConfidence = 0,
      limit = 50
    } = options;

    let query = `
      SELECT tag, confidence, tag_category as category
      FROM article_tags
      WHERE article_id = ?
    `;
    const params: any[] = [articleId];

    if (categories.length > 0) {
      query += ` AND tag_category IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    if (minConfidence > 0) {
      query += ` AND confidence >= ?`;
      params.push(minConfidence);
    }

    query += ` ORDER BY confidence DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(query).all(...params);
    return rows as TagPrediction[];
  }

  async getTagSummary(articleId: number): Promise<{
    totalTags: number;
    tagsByCategory: { category: string; tags: TagPrediction[] }[];
    topTags: TagPrediction[];
  }> {
    const totalTags = this.db.prepare(`
      SELECT COUNT(*) as count FROM article_tags WHERE article_id = ?
    `).get(articleId) as { count: number };

    const categories = this.db.prepare(`
      SELECT DISTINCT tag_category FROM article_tags WHERE article_id = ?
    `).all(articleId) as Array<{ tag_category: string }>;

    const tagsByCategory: { category: string; tags: TagPrediction[] }[] = [];

    for (const cat of categories) {
      const tags = await this.getArticleTags(articleId, {
        categories: [cat.tag_category],
        limit: 10
      });
      tagsByCategory.push({
        category: cat.tag_category,
        tags
      });
    }

    const topTags = await this.getArticleTags(articleId, { limit: 10 });

    return {
      totalTags: totalTags.count,
      tagsByCategory,
      topTags
    };
  }

  async findArticlesByTag(
    tag: string,
    options: {
      category?: string;
      minConfidence?: number;
      limit?: number;
    } = {}
  ): Promise<number[]> {
    const {
      category,
      minConfidence = 0.5,
      limit = 100
    } = options;

    let query = `
      SELECT DISTINCT article_id
      FROM article_tags
      WHERE tag = ? AND confidence >= ?
    `;
    const params: any[] = [tag, minConfidence];

    if (category) {
      query += ` AND tag_category = ?`;
      params.push(category);
    }

    query += ` ORDER BY confidence DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(query).all(...params) as Array<{ article_id: number }>;
    return rows.map(row => row.article_id);
  }

  async getPopularTags(
    options: {
      category?: string;
      minConfidence?: number;
      limit?: number;
      timeframe?: 'day' | 'week' | 'month' | 'all';
    } = {}
  ): Promise<Array<{ tag: string; count: number; avgConfidence: number; category: string }>> {
    const {
      category,
      minConfidence = 0.3,
      limit = 50,
      timeframe = 'all'
    } = options;

    let query = `
      SELECT
        t.tag,
        t.tag_category as category,
        COUNT(*) as count,
        AVG(t.confidence) as avgConfidence
      FROM article_tags t
      JOIN articles a ON t.article_id = a.id
      WHERE t.confidence >= ?
    `;
    const params: any[] = [minConfidence];

    if (category) {
      query += ` AND t.tag_category = ?`;
      params.push(category);
    }

    // Add timeframe filter
    if (timeframe !== 'all') {
      const timeMap = { day: 1, week: 7, month: 30 };
      query += ` AND a.published_at >= datetime('now', '-${timeMap[timeframe]} days')`;
    }

    query += ` GROUP BY t.tag, t.tag_category ORDER BY count DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(query).all(...params);
    return rows as Array<{ tag: string; count: number; avgConfidence: number; category: string }>;
  }

  private async createPythonScript(): Promise<void> {
    const pythonScript = `#!/usr/bin/env python3
"""
Zero-shot Text Classification for Tag Generation
Uses Hugging Face transformers for classification
"""

import sys
import json
import warnings
warnings.filterwarnings("ignore")

try:
    from transformers import pipeline
    from transformers.utils import logging
    logging.set_verbosity_error()
except ImportError:
    print(json.dumps({
        'success': False,
        'error': 'transformers library not installed. Install with: pip install transformers torch'
    }))
    sys.exit(1)

def create_classifier(model_name="facebook/bart-large-mnli"):
    """Create zero-shot classification pipeline"""
    try:
        return pipeline("zero-shot-classification", model=model_name, device=-1)  # CPU
    except Exception as e:
        # Fallback to a smaller model
        try:
            return pipeline("zero-shot-classification", model="typeform/distilbert-base-uncased-mnli", device=-1)
        except Exception as e2:
            raise Exception(f"Failed to load classification model: {e2}")

def classify_text(text, candidates, hypothesis_template, min_confidence=0.3, max_tags=5):
    """Classify text against candidate labels"""
    classifier = create_classifier()

    try:
        # Run classification
        result = classifier(text, candidates, hypothesis_template=hypothesis_template)

        # Filter and format results
        predictions = []
        for label, score in zip(result['labels'], result['scores']):
            if score >= min_confidence and len(predictions) < max_tags:
                predictions.append({
                    'label': label,
                    'score': float(score)
                })

        return {
            'success': True,
            'predictions': predictions,
            'total_candidates': len(candidates)
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'predictions': []
        }

def main():
    try:
        # Parse configuration
        if len(sys.argv) > 1:
            config = json.loads(sys.argv[1])
        else:
            config = {}

        # Read text from stdin
        text = sys.stdin.read().strip()

        if not text:
            print(json.dumps({
                'success': False,
                'error': 'No text provided',
                'predictions': []
            }))
            return

        # Extract configuration
        candidates = config.get('candidates', [])
        category = config.get('category', 'general')
        min_confidence = config.get('min_confidence', 0.3)
        max_tags = config.get('max_tags', 5)
        hypothesis_template = config.get('hypothesis_template', 'This text is about {}.')

        if not candidates:
            print(json.dumps({
                'success': False,
                'error': 'No candidate labels provided',
                'predictions': []
            }))
            return

        # Classify text
        result = classify_text(
            text,
            candidates,
            hypothesis_template,
            min_confidence,
            max_tags
        )

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'predictions': []
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
`;

    await fs.writeFile(this.pythonScriptPath, pythonScript, 'utf-8');

    // Make script executable (Unix systems)
    if (process.platform !== 'win32') {
      await fs.chmod(this.pythonScriptPath, 0o755);
    }
  }

  async cleanup(): Promise<void> {
    // Clean up temporary files if needed
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        if (file.startsWith('classification_')) {
          await fs.unlink(path.join(this.tempDir, file));
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

export default TagClassificationService;