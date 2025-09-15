/**
 * Stance and Bias Detection Service
 * Analyzes article stance, bias, and subjectivity using local NLP techniques
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { Database } from 'better-sqlite3';

export interface StanceAnalysis {
  stance: 'positive' | 'negative' | 'neutral';
  stanceConfidence: number;
  biasScore: number; // -1.0 (left) to 1.0 (right)
  biasConfidence: number;
  subjectivityScore: number; // 0.0 (objective) to 1.0 (subjective)
}

export interface StanceDetectionResult {
  analysis: StanceAnalysis;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export interface BiasIndicators {
  emotionalLanguage: string[];
  strongOpinions: string[];
  loadedTerms: string[];
  factualStatements: number;
  opinionStatements: number;
}

export class StanceBiasDetectionService {
  private db: Database;
  private pythonScriptPath: string;
  private tempDir: string;
  private initialized = false;

  // Bias indicator word lists
  private readonly emotionalWords = new Set([
    'shocking', 'outrageous', 'devastating', 'incredible', 'amazing', 'terrible',
    'wonderful', 'fantastic', 'awful', 'brilliant', 'stupid', 'genius', 'idiotic',
    'unbelievable', 'extraordinary', 'ridiculous', 'absurd', 'pathetic', 'magnificent',
    'disgraceful', 'shameful', 'inspiring', 'horrific', 'miraculous', 'catastrophic'
  ]);

  private readonly strongOpinionWords = new Set([
    'clearly', 'obviously', 'undoubtedly', 'certainly', 'definitely', 'absolutely',
    'completely', 'totally', 'entirely', 'perfectly', 'utterly', 'thoroughly',
    'extremely', 'incredibly', 'remarkably', 'surprisingly', 'shockingly',
    'unfortunately', 'thankfully', 'hopefully', 'regrettably', 'sadly'
  ]);

  private readonly loadedTerms = new Set([
    'radical', 'extremist', 'militant', 'activist', 'leftist', 'rightist',
    'liberal', 'conservative', 'progressive', 'reactionary', 'establishment',
    'elite', 'mainstream', 'alternative', 'conspiracy', 'scandal', 'controversy',
    'crisis', 'emergency', 'urgent', 'critical', 'dangerous', 'threat'
  ]);

  private readonly factualIndicators = new Set([
    'according to', 'data shows', 'statistics indicate', 'research suggests',
    'study finds', 'report states', 'survey reveals', 'evidence suggests',
    'analysis shows', 'figures indicate', 'documented', 'verified', 'confirmed'
  ]);

  private readonly subjectiveIndicators = new Set([
    'i think', 'i believe', 'in my opinion', 'it seems', 'appears to be',
    'might be', 'could be', 'probably', 'likely', 'unlikely', 'seems like',
    'feels like', 'looks like', 'sounds like', 'appears that', 'suggests that'
  ]);

  constructor(
    db: Database,
    options: {
      tempDir?: string;
      pythonPath?: string;
      modelName?: string;
    } = {}
  ) {
    this.db = db;
    this.tempDir = options.tempDir || path.join(process.cwd(), 'temp');
    this.pythonScriptPath = path.join(__dirname, 'scripts', 'stance_bias_detector.py');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Create Python script directory
      const scriptsDir = path.join(__dirname, 'scripts');
      await fs.mkdir(scriptsDir, { recursive: true });

      // Create the Python analysis script
      await this.createPythonScript();

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize stance/bias detection service: ${error}`);
    }
  }

  async analyzeStanceAndBias(
    articleId: number,
    text: string,
    title?: string,
    options: {
      includeAdvancedAnalysis?: boolean;
      customBiasTerms?: string[];
    } = {}
  ): Promise<StanceDetectionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const { includeAdvancedAnalysis = true, customBiasTerms = [] } = options;

    try {
      // Combine title and text for analysis
      const fullText = title ? `${title}\n\n${text}` : text;

      // Perform basic bias analysis
      const biasIndicators = this.analyzeBiasIndicators(fullText, customBiasTerms);

      // Perform stance detection using local NLP
      const stanceAnalysis = await this.detectStance(fullText);

      // Calculate subjectivity score
      const subjectivityScore = this.calculateSubjectivity(fullText, biasIndicators);

      // Combine all analysis
      const analysis: StanceAnalysis = {
        stance: stanceAnalysis.stance,
        stanceConfidence: stanceAnalysis.confidence,
        biasScore: stanceAnalysis.biasScore,
        biasConfidence: stanceAnalysis.biasConfidence,
        subjectivityScore
      };

      // Store analysis in database
      await this.storeAnalysis(articleId, analysis);

      const processingTimeMs = Date.now() - startTime;

      return {
        analysis,
        processingTimeMs,
        success: true
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      return {
        analysis: {} as StanceAnalysis,
        processingTimeMs,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private analyzeBiasIndicators(text: string, customTerms: string[]): BiasIndicators {
    const words = text.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Find emotional language
    const emotionalLanguage = words.filter(word =>
      this.emotionalWords.has(word) || customTerms.includes(word)
    );

    // Find strong opinion indicators
    const strongOpinions = words.filter(word => this.strongOpinionWords.has(word));

    // Find loaded terms
    const loadedTerms = words.filter(word => this.loadedTerms.has(word));

    // Count factual vs opinion statements
    let factualStatements = 0;
    let opinionStatements = 0;

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();

      // Check for factual indicators
      if (Array.from(this.factualIndicators).some(indicator =>
        lowerSentence.includes(indicator))) {
        factualStatements++;
      }

      // Check for subjective indicators
      if (Array.from(this.subjectiveIndicators).some(indicator =>
        lowerSentence.includes(indicator))) {
        opinionStatements++;
      }
    });

    return {
      emotionalLanguage,
      strongOpinions,
      loadedTerms,
      factualStatements,
      opinionStatements
    };
  }

  private async detectStance(text: string): Promise<{
    stance: 'positive' | 'negative' | 'neutral';
    confidence: number;
    biasScore: number;
    biasConfidence: number;
  }> {
    return new Promise((resolve, reject) => {
      const config = {
        text: text.substring(0, 2000), // Limit text size for processing
        analyze_sentiment: true,
        analyze_bias: true
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
          // Fallback to rule-based analysis if Python fails
          const fallback = this.performRuleBasedAnalysis(text);
          resolve(fallback);
          return;
        }

        try {
          const result = JSON.parse(outputData);
          if (result.success) {
            resolve({
              stance: result.stance || 'neutral',
              confidence: result.stance_confidence || 0.5,
              biasScore: result.bias_score || 0,
              biasConfidence: result.bias_confidence || 0.5
            });
          } else {
            const fallback = this.performRuleBasedAnalysis(text);
            resolve(fallback);
          }
        } catch (error) {
          const fallback = this.performRuleBasedAnalysis(text);
          resolve(fallback);
        }
      });

      // Send text to Python process
      pythonProcess.stdin.write(text);
      pythonProcess.stdin.end();

      // Set timeout
      setTimeout(() => {
        pythonProcess.kill();
        const fallback = this.performRuleBasedAnalysis(text);
        resolve(fallback);
      }, 20000); // 20 second timeout
    });
  }

  private performRuleBasedAnalysis(text: string): {
    stance: 'positive' | 'negative' | 'neutral';
    confidence: number;
    biasScore: number;
    biasConfidence: number;
  } {
    const words = text.toLowerCase().split(/\s+/);

    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'win', 'achieve', 'improve', 'benefit', 'advantage', 'progress', 'growth', 'strong', 'effective'];
    const negativeWords = ['bad', 'terrible', 'awful', 'negative', 'fail', 'lose', 'problem', 'issue', 'concern', 'risk', 'danger', 'threat', 'weak', 'decline'];

    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });

    const total = positiveScore + negativeScore;
    let stance: 'positive' | 'negative' | 'neutral' = 'neutral';
    let stanceConfidence = 0.5;

    if (total > 0) {
      const sentimentScore = (positiveScore - negativeScore) / total;
      if (sentimentScore > 0.2) {
        stance = 'positive';
        stanceConfidence = 0.6 + Math.min(0.3, Math.abs(sentimentScore));
      } else if (sentimentScore < -0.2) {
        stance = 'negative';
        stanceConfidence = 0.6 + Math.min(0.3, Math.abs(sentimentScore));
      }
    }

    // Simple bias detection based on loaded terms
    const leftTerms = ['progressive', 'reform', 'social justice', 'equality', 'regulation'];
    const rightTerms = ['conservative', 'traditional', 'free market', 'deregulation', 'security'];

    let leftScore = 0;
    let rightScore = 0;

    words.forEach(word => {
      if (leftTerms.some(term => word.includes(term))) leftScore++;
      if (rightTerms.some(term => word.includes(term))) rightScore++;
    });

    const biasTotal = leftScore + rightScore;
    let biasScore = 0;
    let biasConfidence = 0.5;

    if (biasTotal > 0) {
      biasScore = (rightScore - leftScore) / biasTotal;
      biasConfidence = 0.5 + Math.min(0.3, biasTotal / words.length * 100);
    }

    return {
      stance,
      confidence: stanceConfidence,
      biasScore,
      biasConfidence
    };
  }

  private calculateSubjectivity(text: string, indicators: BiasIndicators): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.toLowerCase().split(/\s+/);

    let subjectivityScore = 0;

    // Factor 1: Emotional language (0-0.3)
    const emotionalRatio = indicators.emotionalLanguage.length / words.length;
    subjectivityScore += Math.min(0.3, emotionalRatio * 20);

    // Factor 2: Opinion vs factual statements (0-0.3)
    const totalStatements = indicators.factualStatements + indicators.opinionStatements;
    if (totalStatements > 0) {
      const opinionRatio = indicators.opinionStatements / totalStatements;
      subjectivityScore += opinionRatio * 0.3;
    }

    // Factor 3: Strong opinion words (0-0.2)
    const strongOpinionRatio = indicators.strongOpinions.length / words.length;
    subjectivityScore += Math.min(0.2, strongOpinionRatio * 15);

    // Factor 4: Loaded terms (0-0.2)
    const loadedTermRatio = indicators.loadedTerms.length / words.length;
    subjectivityScore += Math.min(0.2, loadedTermRatio * 25);

    // Base subjectivity (all text has some subjectivity)
    subjectivityScore += 0.1;

    return Math.max(0, Math.min(1, subjectivityScore));
  }

  private async storeAnalysis(articleId: number, analysis: StanceAnalysis): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO article_enrichment (
        article_id, stance, stance_confidence, bias_score, bias_confidence,
        subjectivity_score, enriched_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(article_id) DO UPDATE SET
        stance = excluded.stance,
        stance_confidence = excluded.stance_confidence,
        bias_score = excluded.bias_score,
        bias_confidence = excluded.bias_confidence,
        subjectivity_score = excluded.subjectivity_score,
        enriched_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      articleId,
      analysis.stance,
      analysis.stanceConfidence,
      analysis.biasScore,
      analysis.biasConfidence,
      analysis.subjectivityScore
    );
  }

  async getStanceAnalysis(articleId: number): Promise<StanceAnalysis | null> {
    const row = this.db.prepare(`
      SELECT stance, stance_confidence, bias_score, bias_confidence, subjectivity_score
      FROM article_enrichment
      WHERE article_id = ?
    `).get(articleId) as any;

    if (!row) return null;

    return {
      stance: row.stance as 'positive' | 'negative' | 'neutral',
      stanceConfidence: row.stance_confidence,
      biasScore: row.bias_score,
      biasConfidence: row.bias_confidence,
      subjectivityScore: row.subjectivity_score
    };
  }

  async getArticlesByStance(
    stance: 'positive' | 'negative' | 'neutral',
    options: {
      minConfidence?: number;
      limit?: number;
    } = {}
  ): Promise<number[]> {
    const { minConfidence = 0.6, limit = 100 } = options;

    const query = `
      SELECT article_id
      FROM article_enrichment
      WHERE stance = ? AND stance_confidence >= ?
      ORDER BY stance_confidence DESC
      LIMIT ?
    `;

    const rows = this.db.prepare(query).all(stance, minConfidence, limit);
    return rows.map((row: any) => row.article_id);
  }

  async getBiasDistribution(): Promise<{
    leftBias: number;
    rightBias: number;
    neutral: number;
    avgBiasScore: number;
    avgSubjectivityScore: number;
  }> {
    const stats = this.db.prepare(`
      SELECT
        AVG(bias_score) as avgBiasScore,
        AVG(subjectivity_score) as avgSubjectivityScore,
        SUM(CASE WHEN bias_score < -0.2 THEN 1 ELSE 0 END) as leftBias,
        SUM(CASE WHEN bias_score > 0.2 THEN 1 ELSE 0 END) as rightBias,
        SUM(CASE WHEN bias_score BETWEEN -0.2 AND 0.2 THEN 1 ELSE 0 END) as neutral
      FROM article_enrichment
      WHERE bias_score IS NOT NULL
    `).get() as any;

    return {
      leftBias: stats.leftBias || 0,
      rightBias: stats.rightBias || 0,
      neutral: stats.neutral || 0,
      avgBiasScore: stats.avgBiasScore || 0,
      avgSubjectivityScore: stats.avgSubjectivityScore || 0
    };
  }

  private async createPythonScript(): Promise<void> {
    const pythonScript = `#!/usr/bin/env python3
"""
Stance and Bias Detection using TextBlob and VADER
Analyzes text for sentiment, stance, and political bias indicators
"""

import sys
import json
import warnings
warnings.filterwarnings("ignore")

try:
    from textblob import TextBlob
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
except ImportError:
    print(json.dumps({
        'success': False,
        'error': 'Required libraries not installed. Install with: pip install textblob vaderSentiment'
    }))
    sys.exit(1)

def analyze_stance_and_bias(text, config):
    """Analyze text for stance and bias"""
    try:
        # Initialize analyzers
        blob = TextBlob(text)
        vader_analyzer = SentimentIntensityAnalyzer()

        # Get sentiment scores
        textblob_polarity = blob.sentiment.polarity
        textblob_subjectivity = blob.sentiment.subjectivity

        vader_scores = vader_analyzer.polarity_scores(text)
        compound_score = vader_scores['compound']

        # Determine stance based on combined sentiment
        if compound_score > 0.1 and textblob_polarity > 0.1:
            stance = 'positive'
            stance_confidence = min(0.9, 0.6 + abs(compound_score))
        elif compound_score < -0.1 and textblob_polarity < -0.1:
            stance = 'negative'
            stance_confidence = min(0.9, 0.6 + abs(compound_score))
        else:
            stance = 'neutral'
            stance_confidence = 0.5 + abs(compound_score) * 0.2

        # Simple bias detection based on word patterns
        text_lower = text.lower()

        # Left-leaning terms
        left_terms = ['progressive', 'reform', 'social justice', 'equality',
                     'regulation', 'government intervention', 'welfare',
                     'climate change', 'diversity', 'inclusion']

        # Right-leaning terms
        right_terms = ['conservative', 'traditional', 'free market',
                      'deregulation', 'private sector', 'security',
                      'law and order', 'fiscal responsibility', 'individual rights']

        left_count = sum(1 for term in left_terms if term in text_lower)
        right_count = sum(1 for term in right_terms if term in text_lower)

        total_bias_terms = left_count + right_count
        if total_bias_terms > 0:
            bias_score = (right_count - left_count) / total_bias_terms
            bias_confidence = min(0.8, 0.4 + (total_bias_terms / 20))
        else:
            bias_score = 0
            bias_confidence = 0.5

        return {
            'success': True,
            'stance': stance,
            'stance_confidence': stance_confidence,
            'bias_score': bias_score,
            'bias_confidence': bias_confidence,
            'sentiment_details': {
                'textblob_polarity': textblob_polarity,
                'textblob_subjectivity': textblob_subjectivity,
                'vader_compound': compound_score,
                'vader_positive': vader_scores['pos'],
                'vader_negative': vader_scores['neg'],
                'vader_neutral': vader_scores['neu']
            }
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'stance': 'neutral',
            'stance_confidence': 0.5,
            'bias_score': 0,
            'bias_confidence': 0.5
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
                'stance': 'neutral',
                'stance_confidence': 0.5,
                'bias_score': 0,
                'bias_confidence': 0.5
            }))
            return

        # Analyze stance and bias
        result = analyze_stance_and_bias(text, config)
        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'stance': 'neutral',
            'stance_confidence': 0.5,
            'bias_score': 0,
            'bias_confidence': 0.5
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
        if (file.startsWith('stance_')) {
          await fs.unlink(path.join(this.tempDir, file));
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

export default StanceBiasDetectionService;