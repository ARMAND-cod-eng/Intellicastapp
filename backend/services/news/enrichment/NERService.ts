/**
 * Named Entity Recognition Service using spaCy
 * Extracts and processes named entities from article text
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { Database } from 'better-sqlite3';

export interface EntityMatch {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence: number;
}

export interface ProcessedEntity {
  text: string;
  type: string;
  startChar: number;
  endChar: number;
  confidence: number;
  context: string;
  canonicalName?: string;
  entityId?: string;
  mentionCount: number;
  importanceScore: number;
}

export interface EntityExtractionResult {
  entities: ProcessedEntity[];
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export class NERService {
  private db: Database;
  private pythonScriptPath: string;
  private tempDir: string;
  private initialized = false;

  // Entity type mappings from spaCy to our schema
  private readonly entityTypeMap = new Map([
    ['PERSON', 'PERSON'],
    ['PER', 'PERSON'],
    ['ORG', 'ORG'],
    ['ORGANIZATION', 'ORG'],
    ['GPE', 'GPE'],
    ['LOC', 'LOCATION'],
    ['LOCATION', 'LOCATION'],
    ['EVENT', 'EVENT'],
    ['WORK_OF_ART', 'WORK_OF_ART'],
    ['LAW', 'LAW'],
    ['LANGUAGE', 'LANGUAGE'],
    ['DATE', 'DATE'],
    ['TIME', 'TIME'],
    ['PERCENT', 'PERCENT'],
    ['MONEY', 'MONEY'],
    ['QUANTITY', 'QUANTITY'],
    ['ORDINAL', 'ORDINAL'],
    ['CARDINAL', 'CARDINAL'],
    ['PRODUCT', 'PRODUCT'],
    ['NORP', 'NORP'], // Nationalities or religious/political groups
    ['FAC', 'FACILITY'],
    ['FACILITY', 'FACILITY']
  ]);

  constructor(
    db: Database,
    options: {
      tempDir?: string;
      pythonPath?: string;
      spacyModel?: string;
    } = {}
  ) {
    this.db = db;
    this.tempDir = options.tempDir || path.join(process.cwd(), 'temp');
    this.pythonScriptPath = path.join(__dirname, 'scripts', 'ner_extractor.py');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Create Python script directory
      const scriptsDir = path.join(__dirname, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Create the Python NER script
      await this.createPythonScript();

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize NER service: ${error}`);
    }
  }

  async extractEntities(
    articleId: number,
    text: string,
    options: {
      minConfidence?: number;
      contextWindow?: number;
      filterTypes?: string[];
      enableEntityLinking?: boolean;
    } = {}
  ): Promise<EntityExtractionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const {
      minConfidence = 0.7,
      contextWindow = 50,
      filterTypes = [],
      enableEntityLinking = false
    } = options;

    try {
      // Run spaCy NER extraction
      const entities = await this.runSpacyExtraction(text, {
        minConfidence,
        filterTypes
      });

      // Process and enrich entities
      const processedEntities = await this.processEntities(
        text,
        entities,
        { contextWindow, enableEntityLinking }
      );

      // Store entities in database
      await this.storeEntities(articleId, processedEntities);

      const processingTimeMs = Date.now() - startTime;

      return {
        entities: processedEntities,
        processingTimeMs,
        success: true
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      return {
        entities: [],
        processingTimeMs,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async runSpacyExtraction(
    text: string,
    options: {
      minConfidence: number;
      filterTypes: string[];
    }
  ): Promise<EntityMatch[]> {
    return new Promise((resolve, reject) => {
      const config = {
        min_confidence: options.minConfidence,
        filter_types: options.filterTypes,
        model: 'en_core_web_sm' // Default spaCy model
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
          reject(new Error(`Python NER process failed: ${errorData}`));
          return;
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result.entities || []);
        } catch (error) {
          reject(new Error(`Failed to parse NER results: ${error}`));
        }
      });

      // Send text to Python process
      pythonProcess.stdin.write(text);
      pythonProcess.stdin.end();

      // Set timeout
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('NER extraction timeout'));
      }, 30000); // 30 second timeout
    });
  }

  private async processEntities(
    text: string,
    entities: EntityMatch[],
    options: {
      contextWindow: number;
      enableEntityLinking: boolean;
    }
  ): Promise<ProcessedEntity[]> {
    const processed: ProcessedEntity[] = [];
    const entityFrequency = new Map<string, number>();

    // Count entity mentions for importance scoring
    entities.forEach(entity => {
      const normalizedText = entity.text.toLowerCase().trim();
      entityFrequency.set(normalizedText, (entityFrequency.get(normalizedText) || 0) + 1);
    });

    for (const entity of entities) {
      const normalizedText = entity.text.toLowerCase().trim();
      const mentionCount = entityFrequency.get(normalizedText) || 1;

      // Extract context around entity
      const context = this.extractContext(text, entity.start, entity.end, options.contextWindow);

      // Map entity type
      const mappedType = this.entityTypeMap.get(entity.label) || entity.label;

      // Calculate importance score
      const importanceScore = this.calculateImportanceScore(
        entity,
        mentionCount,
        context,
        text.length
      );

      // Entity linking (basic implementation)
      let canonicalName: string | undefined;
      let entityId: string | undefined;

      if (options.enableEntityLinking) {
        const linking = await this.performEntityLinking(entity, context);
        canonicalName = linking.canonicalName;
        entityId = linking.entityId;
      }

      processed.push({
        text: entity.text,
        type: mappedType,
        startChar: entity.start,
        endChar: entity.end,
        confidence: entity.confidence,
        context,
        canonicalName,
        entityId,
        mentionCount,
        importanceScore
      });
    }

    // Sort by importance score (descending)
    return processed.sort((a, b) => b.importanceScore - a.importanceScore);
  }

  private extractContext(
    text: string,
    start: number,
    end: number,
    windowSize: number
  ): string {
    const contextStart = Math.max(0, start - windowSize);
    const contextEnd = Math.min(text.length, end + windowSize);

    let context = text.slice(contextStart, contextEnd);

    // Clean up context
    context = context.replace(/\s+/g, ' ').trim();

    // Add ellipsis if truncated
    if (contextStart > 0) context = '...' + context;
    if (contextEnd < text.length) context = context + '...';

    return context;
  }

  private calculateImportanceScore(
    entity: EntityMatch,
    mentionCount: number,
    context: string,
    textLength: number
  ): number {
    let score = 0.5; // Base score

    // Frequency boost (more mentions = more important)
    score += Math.min(0.3, mentionCount * 0.05);

    // Confidence boost
    score += (entity.confidence - 0.5) * 0.2;

    // Position boost (earlier mentions might be more important)
    const relativePosition = entity.start / textLength;
    if (relativePosition < 0.2) score += 0.1; // Early in article

    // Entity type importance
    const typeImportance = new Map([
      ['PERSON', 0.9],
      ['ORG', 0.8],
      ['GPE', 0.7],
      ['EVENT', 0.8],
      ['LOCATION', 0.6],
      ['PRODUCT', 0.7]
    ]);

    const typeMultiplier = typeImportance.get(entity.label) || 0.5;
    score *= typeMultiplier;

    // Context importance (titles, quotes might indicate importance)
    if (context.includes('"') || context.includes("'")) score += 0.05; // In quotes
    if (/\b(CEO|President|Director|Minister|Senator)\b/i.test(context)) score += 0.1; // Titles

    return Math.min(1.0, Math.max(0.0, score));
  }

  private async performEntityLinking(
    entity: EntityMatch,
    context: string
  ): Promise<{ canonicalName?: string; entityId?: string }> {
    // Basic entity linking implementation
    // In a production system, this would connect to knowledge bases like Wikidata

    const canonicalName = this.normalizeEntityName(entity.text);

    // Simple entity ID generation (would be actual KB IDs in production)
    const entityId = `local_${entity.label.toLowerCase()}_${canonicalName.replace(/\s+/g, '_')}`;

    return { canonicalName, entityId };
  }

  private normalizeEntityName(text: string): string {
    // Basic name normalization
    return text
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  private async storeEntities(
    articleId: number,
    entities: ProcessedEntity[]
  ): Promise<void> {
    // First, remove existing entities for this article
    this.db.prepare(`
      DELETE FROM article_entities WHERE article_id = ?
    `).run(articleId);

    if (entities.length === 0) return;

    // Insert new entities
    const insertStmt = this.db.prepare(`
      INSERT INTO article_entities (
        article_id, entity_text, entity_type, start_char, end_char,
        confidence, context, canonical_name, entity_id, mention_count, importance_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const entity of entities) {
        insertStmt.run(
          articleId,
          entity.text,
          entity.type,
          entity.startChar,
          entity.endChar,
          entity.confidence,
          entity.context,
          entity.canonicalName || null,
          entity.entityId || null,
          entity.mentionCount,
          entity.importanceScore
        );
      }
    });

    transaction();
  }

  async getArticleEntities(
    articleId: number,
    options: {
      entityTypes?: string[];
      minImportance?: number;
      limit?: number;
    } = {}
  ): Promise<ProcessedEntity[]> {
    const {
      entityTypes = [],
      minImportance = 0,
      limit = 100
    } = options;

    let query = `
      SELECT
        entity_text as text, entity_type as type, start_char as startChar,
        end_char as endChar, confidence, context, canonical_name as canonicalName,
        entity_id as entityId, mention_count as mentionCount, importance_score as importanceScore
      FROM article_entities
      WHERE article_id = ?
    `;
    const params: any[] = [articleId];

    if (entityTypes.length > 0) {
      query += ` AND entity_type IN (${entityTypes.map(() => '?').join(',')})`;
      params.push(...entityTypes);
    }

    if (minImportance > 0) {
      query += ` AND importance_score >= ?`;
      params.push(minImportance);
    }

    query += ` ORDER BY importance_score DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(query).all(...params);
    return rows as ProcessedEntity[];
  }

  async getEntitySummary(articleId: number): Promise<{
    totalEntities: number;
    entityTypes: { type: string; count: number; topEntities: string[] }[];
    topEntities: ProcessedEntity[];
  }> {
    const totalEntities = this.db.prepare(`
      SELECT COUNT(*) as count FROM article_entities WHERE article_id = ?
    `).get(articleId) as { count: number };

    const entityTypes = this.db.prepare(`
      SELECT
        entity_type as type,
        COUNT(*) as count,
        GROUP_CONCAT(entity_text, ', ') as entities
      FROM article_entities
      WHERE article_id = ?
      GROUP BY entity_type
      ORDER BY count DESC
    `).all(articleId) as Array<{ type: string; count: number; entities: string }>;

    const topEntities = await this.getArticleEntities(articleId, { limit: 10 });

    return {
      totalEntities: totalEntities.count,
      entityTypes: entityTypes.map(et => ({
        type: et.type,
        count: et.count,
        topEntities: et.entities.split(', ').slice(0, 5)
      })),
      topEntities
    };
  }

  private async createPythonScript(): Promise<void> {
    const pythonScript = `#!/usr/bin/env python3
"""
spaCy NER Extraction Script
Extracts named entities from text using spaCy
"""

import sys
import json
import spacy
from spacy import displacy
import warnings
warnings.filterwarnings("ignore")

def load_model(model_name="en_core_web_sm"):
    """Load spaCy model with error handling"""
    try:
        return spacy.load(model_name)
    except OSError:
        # Fallback to download if model not found
        print(f"Model {model_name} not found. Please install with: python -m spacy download {model_name}", file=sys.stderr)
        sys.exit(1)

def extract_entities(text, config):
    """Extract entities using spaCy NER"""
    nlp = load_model(config.get('model', 'en_core_web_sm'))

    # Process text
    doc = nlp(text)

    entities = []
    for ent in doc.ents:
        # Filter by confidence if available
        confidence = 1.0  # spaCy doesn't provide confidence by default
        if confidence >= config.get('min_confidence', 0.7):

            # Filter by entity type if specified
            filter_types = config.get('filter_types', [])
            if not filter_types or ent.label_ in filter_types:
                entities.append({
                    'text': ent.text,
                    'label': ent.label_,
                    'start': ent.start_char,
                    'end': ent.end_char,
                    'confidence': confidence
                })

    return entities

def main():
    try:
        # Parse configuration
        if len(sys.argv) > 1:
            config = json.loads(sys.argv[1])
        else:
            config = {}

        # Read text from stdin
        text = sys.stdin.read()

        if not text.strip():
            print(json.dumps({'entities': [], 'error': 'No text provided'}))
            return

        # Extract entities
        entities = extract_entities(text, config)

        # Output results
        result = {
            'entities': entities,
            'entity_count': len(entities),
            'success': True
        }

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        error_result = {
            'entities': [],
            'error': str(e),
            'success': False
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
        if (file.startsWith('ner_')) {
          await fs.unlink(path.join(this.tempDir, file));
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

export default NERService;