/**
 * Content Analysis Service
 * Calculates reading time, complexity scores, and text metrics
 */

import { Database } from 'better-sqlite3';

export interface TextMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  avgSentencesPerParagraph: number;
  characterCount: number;
  avgWordLength: number;
}

export interface ReadabilityScores {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  complexityScore: number; // 0.0 to 1.0
}

export interface ContentAnalysis {
  textMetrics: TextMetrics;
  readabilityScores: ReadabilityScores;
  readingTimeMinutes: number;
  estimatedDifficulty: 'very_easy' | 'easy' | 'fairly_easy' | 'standard' | 'fairly_difficult' | 'difficult' | 'very_difficult';
  languageComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
}

export interface AnalysisResult {
  analysis: ContentAnalysis;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export class ContentAnalysisService {
  private db: Database;

  // Common English words for complexity analysis
  private readonly commonWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to',
    'was', 'were', 'will', 'with', 'would', 'have', 'had', 'this', 'they',
    'we', 'you', 'your', 'my', 'me', 'us', 'our', 'them', 'their', 'she',
    'her', 'him', 'his', 'can', 'could', 'should', 'may', 'might', 'must',
    'do', 'does', 'did', 'get', 'got', 'go', 'went', 'come', 'came', 'see',
    'saw', 'know', 'knew', 'think', 'thought', 'say', 'said', 'tell', 'told',
    'make', 'made', 'take', 'took', 'give', 'gave', 'find', 'found', 'work',
    'worked', 'call', 'called', 'try', 'tried', 'ask', 'asked', 'need', 'needed',
    'feel', 'felt', 'become', 'became', 'leave', 'left', 'put', 'seem', 'seemed',
    'turn', 'turned', 'start', 'started', 'show', 'showed', 'hear', 'heard',
    'play', 'played', 'run', 'ran', 'move', 'moved', 'live', 'lived', 'believe',
    'believed', 'bring', 'brought', 'happen', 'happened', 'write', 'wrote'
  ]);

  constructor(db: Database) {
    this.db = db;
  }

  async analyzeContent(
    articleId: number,
    text: string,
    options: {
      wordsPerMinute?: number;
      includeAdvancedMetrics?: boolean;
    } = {}
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const { wordsPerMinute = 200, includeAdvancedMetrics = true } = options;

    try {
      // Calculate basic text metrics
      const textMetrics = this.calculateTextMetrics(text);

      // Calculate readability scores
      const readabilityScores = this.calculateReadabilityScores(text, textMetrics);

      // Calculate reading time
      const readingTimeMinutes = this.calculateReadingTime(textMetrics.wordCount, wordsPerMinute);

      // Determine difficulty levels
      const estimatedDifficulty = this.getDifficultyLevel(readabilityScores.fleschReadingEase);
      const languageComplexity = this.getLanguageComplexity(readabilityScores.complexityScore);

      const analysis: ContentAnalysis = {
        textMetrics,
        readabilityScores,
        readingTimeMinutes,
        estimatedDifficulty,
        languageComplexity
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
        analysis: {} as ContentAnalysis,
        processingTimeMs,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private calculateTextMetrics(text: string): TextMetrics {
    // Clean and normalize text
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Character count (excluding spaces)
    const characterCount = cleanText.replace(/\s/g, '').length;

    // Word count
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // Average word length
    const totalWordLength = words.reduce((sum, word) => sum + word.replace(/[^\w]/g, '').length, 0);
    const avgWordLength = wordCount > 0 ? totalWordLength / wordCount : 0;

    // Sentence count (improved sentence detection)
    const sentences = cleanText.split(/[.!?]+/).filter(sentence => {
      return sentence.trim().length > 0 && /[a-zA-Z]/.test(sentence);
    });
    const sentenceCount = sentences.length;

    // Paragraph count
    const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);
    const paragraphCount = Math.max(1, paragraphs.length);

    // Averages
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const avgSentencesPerParagraph = paragraphCount > 0 ? sentenceCount / paragraphCount : 0;

    return {
      wordCount,
      sentenceCount,
      paragraphCount,
      avgWordsPerSentence,
      avgSentencesPerParagraph,
      characterCount,
      avgWordLength
    };
  }

  private calculateReadabilityScores(text: string, metrics: TextMetrics): ReadabilityScores {
    const { wordCount, sentenceCount, avgWordsPerSentence } = metrics;

    // Count syllables in the text
    const syllableCount = this.countSyllables(text);

    // Flesch Reading Ease Score
    // Formula: 206.835 - (1.015 × ASL) - (84.6 × ASW)
    // ASL = Average Sentence Length (words per sentence)
    // ASW = Average Syllables per Word
    const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0;
    const fleschReadingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    // Flesch-Kincaid Grade Level
    // Formula: (0.39 × ASL) + (11.8 × ASW) - 15.59
    const fleschKincaidGrade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

    // Custom complexity score (0.0 to 1.0)
    const complexityScore = this.calculateComplexityScore(text, metrics);

    return {
      fleschReadingEase: Math.max(0, Math.min(100, fleschReadingEase)),
      fleschKincaidGrade: Math.max(0, fleschKincaidGrade),
      complexityScore: Math.max(0, Math.min(1, complexityScore))
    };
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    let totalSyllables = 0;

    for (const word of words) {
      totalSyllables += this.countWordSyllables(word);
    }

    return totalSyllables;
  }

  private countWordSyllables(word: string): number {
    word = word.toLowerCase();

    // Handle common exceptions
    if (word.length <= 3) return 1;

    // Remove silent e
    word = word.replace(/e$/, '');

    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g) || [];
    let syllables = vowelGroups.length;

    // Minimum of 1 syllable per word
    return Math.max(1, syllables);
  }

  private calculateComplexityScore(text: string, metrics: TextMetrics): number {
    let complexityScore = 0;

    // Factor 1: Average word length (longer words = more complex)
    const avgWordLengthScore = Math.min(1, metrics.avgWordLength / 8); // Normalize to 0-1
    complexityScore += avgWordLengthScore * 0.3;

    // Factor 2: Average sentence length (longer sentences = more complex)
    const avgSentenceLengthScore = Math.min(1, metrics.avgWordsPerSentence / 25); // Normalize to 0-1
    complexityScore += avgSentenceLengthScore * 0.25;

    // Factor 3: Vocabulary complexity (uncommon words = more complex)
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    const uncommonWords = words.filter(word => !this.commonWords.has(word) && word.length > 4);
    const vocabularyScore = Math.min(1, uncommonWords.length / words.length * 3);
    complexityScore += vocabularyScore * 0.25;

    // Factor 4: Punctuation complexity
    const punctuationCount = (text.match(/[;:(),"'-]/g) || []).length;
    const punctuationScore = Math.min(1, punctuationCount / metrics.wordCount * 10);
    complexityScore += punctuationScore * 0.1;

    // Factor 5: Technical terms and capitalized words (excluding sentence starts)
    const technicalTerms = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [])
      .filter(term => !this.isCommonProperNoun(term));
    const technicalScore = Math.min(1, technicalTerms.length / metrics.wordCount * 5);
    complexityScore += technicalScore * 0.1;

    return complexityScore;
  }

  private isCommonProperNoun(term: string): boolean {
    const commonProperNouns = new Set([
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December', 'United States', 'America',
      'Europe', 'Asia', 'Africa', 'Australia', 'Canada', 'Britain', 'England',
      'France', 'Germany', 'China', 'Japan', 'Russia', 'India', 'Brazil'
    ]);
    return commonProperNouns.has(term);
  }

  private calculateReadingTime(wordCount: number, wordsPerMinute: number): number {
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private getDifficultyLevel(fleschScore: number): ContentAnalysis['estimatedDifficulty'] {
    if (fleschScore >= 90) return 'very_easy';
    if (fleschScore >= 80) return 'easy';
    if (fleschScore >= 70) return 'fairly_easy';
    if (fleschScore >= 60) return 'standard';
    if (fleschScore >= 50) return 'fairly_difficult';
    if (fleschScore >= 30) return 'difficult';
    return 'very_difficult';
  }

  private getLanguageComplexity(complexityScore: number): ContentAnalysis['languageComplexity'] {
    if (complexityScore <= 0.25) return 'simple';
    if (complexityScore <= 0.5) return 'moderate';
    if (complexityScore <= 0.75) return 'complex';
    return 'very_complex';
  }

  private async storeAnalysis(articleId: number, analysis: ContentAnalysis): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO article_enrichment (
        article_id, reading_time_minutes, complexity_score,
        word_count, sentence_count, paragraph_count, avg_sentence_length,
        flesch_reading_ease, flesch_kincaid_grade, enriched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      articleId,
      analysis.readingTimeMinutes,
      analysis.readabilityScores.complexityScore,
      analysis.textMetrics.wordCount,
      analysis.textMetrics.sentenceCount,
      analysis.textMetrics.paragraphCount,
      analysis.textMetrics.avgWordsPerSentence,
      analysis.readabilityScores.fleschReadingEase,
      analysis.readabilityScores.fleschKincaidGrade
    );
  }

  async getAnalysis(articleId: number): Promise<ContentAnalysis | null> {
    const row = this.db.prepare(`
      SELECT
        reading_time_minutes as readingTimeMinutes,
        complexity_score as complexityScore,
        word_count as wordCount,
        sentence_count as sentenceCount,
        paragraph_count as paragraphCount,
        avg_sentence_length as avgWordsPerSentence,
        flesch_reading_ease as fleschReadingEase,
        flesch_kincaid_grade as fleschKincaidGrade
      FROM article_enrichment
      WHERE article_id = ?
    `).get(articleId) as any;

    if (!row) return null;

    // Reconstruct the analysis object
    const textMetrics: TextMetrics = {
      wordCount: row.wordCount,
      sentenceCount: row.sentenceCount,
      paragraphCount: row.paragraphCount,
      avgWordsPerSentence: row.avgWordsPerSentence,
      avgSentencesPerParagraph: row.paragraphCount > 0 ? row.sentenceCount / row.paragraphCount : 0,
      characterCount: 0, // Not stored
      avgWordLength: 0   // Not stored
    };

    const readabilityScores: ReadabilityScores = {
      fleschReadingEase: row.fleschReadingEase,
      fleschKincaidGrade: row.fleschKincaidGrade,
      complexityScore: row.complexityScore
    };

    return {
      textMetrics,
      readabilityScores,
      readingTimeMinutes: row.readingTimeMinutes,
      estimatedDifficulty: this.getDifficultyLevel(row.fleschReadingEase),
      languageComplexity: this.getLanguageComplexity(row.complexityScore)
    };
  }

  async getArticlesByComplexity(
    complexityRange: { min: number; max: number },
    options: {
      limit?: number;
      sortBy?: 'complexity' | 'reading_time' | 'flesch_score';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<number[]> {
    const { limit = 100, sortBy = 'complexity', sortOrder = 'desc' } = options;

    const sortColumn = {
      complexity: 'complexity_score',
      reading_time: 'reading_time_minutes',
      flesch_score: 'flesch_reading_ease'
    }[sortBy];

    const query = `
      SELECT article_id
      FROM article_enrichment
      WHERE complexity_score BETWEEN ? AND ?
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT ?
    `;

    const rows = this.db.prepare(query).all(complexityRange.min, complexityRange.max, limit);
    return rows.map((row: any) => row.article_id);
  }

  async getComplexityStats(): Promise<{
    avgComplexity: number;
    avgReadingTime: number;
    avgFleschScore: number;
    complexityDistribution: { range: string; count: number }[];
  }> {
    // Get average stats
    const avgStats = this.db.prepare(`
      SELECT
        AVG(complexity_score) as avgComplexity,
        AVG(reading_time_minutes) as avgReadingTime,
        AVG(flesch_reading_ease) as avgFleschScore
      FROM article_enrichment
    `).get() as any;

    // Get complexity distribution
    const distribution = this.db.prepare(`
      SELECT
        CASE
          WHEN complexity_score <= 0.25 THEN '0.0-0.25 (Simple)'
          WHEN complexity_score <= 0.5 THEN '0.25-0.5 (Moderate)'
          WHEN complexity_score <= 0.75 THEN '0.5-0.75 (Complex)'
          ELSE '0.75-1.0 (Very Complex)'
        END as range,
        COUNT(*) as count
      FROM article_enrichment
      GROUP BY
        CASE
          WHEN complexity_score <= 0.25 THEN '0.0-0.25 (Simple)'
          WHEN complexity_score <= 0.5 THEN '0.25-0.5 (Moderate)'
          WHEN complexity_score <= 0.75 THEN '0.5-0.75 (Complex)'
          ELSE '0.75-1.0 (Very Complex)'
        END
      ORDER BY count DESC
    `).all() as Array<{ range: string; count: number }>;

    return {
      avgComplexity: avgStats.avgComplexity || 0,
      avgReadingTime: avgStats.avgReadingTime || 0,
      avgFleschScore: avgStats.avgFleschScore || 0,
      complexityDistribution: distribution
    };
  }
}

export default ContentAnalysisService;