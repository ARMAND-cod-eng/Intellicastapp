/**
 * Quote Extraction Service
 * Extracts and analyzes important quotes from article text
 */

import { Database } from 'better-sqlite3';

export interface Quote {
  text: string;
  speaker?: string;
  context: string;
  startChar: number;
  endChar: number;
  paragraphNumber: number;
  importanceScore: number;
  sentimentScore: number;
  quoteType: 'direct' | 'reported' | 'paraphrase';
  isKeyQuote: boolean;
}

export interface QuoteExtractionResult {
  quotes: Quote[];
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

export class QuoteExtractionService {
  private db: Database;

  // Patterns for identifying quotes
  private readonly quotePatterns = [
    // Direct quotes with various punctuation
    /["'"'"]([^"'"'"]*?)["'"'"](?:\s*,?\s*(?:said|says|stated|according\s+to|told|explained|added|noted|commented|remarked|observed|declared|announced|confirmed|revealed|disclosed|admitted|claimed|argued|insisted|maintained|emphasized|stressed|pointed\s+out|mentioned)\s+([^.!?]*?))?/gi,

    // Attribution patterns (Speaker says: "quote")
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|says|stated|told|explained|added|noted|commented|remarked|observed|declared|announced|confirmed|revealed|disclosed|admitted|claimed|argued|insisted|maintained|emphasized|stressed|pointed\s+out|mentioned):\s*["'"'"]([^"'"'"]*?)["'"'"]/gi,

    // According to patterns
    /according\s+to\s+([^,]+),\s*["'"'"]([^"'"'"]*?)["'"'"]/gi,

    // Reported speech patterns
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|says|stated|told|explained|added|noted)\s+(?:that\s+)?([^.!?"'"'"]*?)(?:[.!?])/gi
  ];

  // Attribution verbs and patterns
  private readonly attributionVerbs = new Set([
    'said', 'says', 'stated', 'told', 'explained', 'added', 'noted', 'commented',
    'remarked', 'observed', 'declared', 'announced', 'confirmed', 'revealed',
    'disclosed', 'admitted', 'claimed', 'argued', 'insisted', 'maintained',
    'emphasized', 'stressed', 'mentioned', 'pointed out', 'according to'
  ]);

  // Common speaker titles and indicators
  private readonly speakerTitles = new Set([
    'CEO', 'President', 'Director', 'Manager', 'Chief', 'Vice President', 'VP',
    'Chairman', 'Chairwoman', 'Chairperson', 'Secretary', 'Minister', 'Senator',
    'Representative', 'Governor', 'Mayor', 'Judge', 'Doctor', 'Dr', 'Professor',
    'Spokesperson', 'Representative', 'Officer', 'Analyst', 'Expert', 'Researcher'
  ]);

  constructor(db: Database) {
    this.db = db;
  }

  async extractQuotes(
    articleId: number,
    text: string,
    options: {
      minQuoteLength?: number;
      maxQuoteLength?: number;
      minImportanceScore?: number;
      extractKeyQuotes?: boolean;
    } = {}
  ): Promise<QuoteExtractionResult> {
    const startTime = Date.now();
    const {
      minQuoteLength = 10,
      maxQuoteLength = 500,
      minImportanceScore = 0.3,
      extractKeyQuotes = true
    } = options;

    try {
      // Split text into paragraphs for context
      const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

      // Extract quotes using multiple methods
      const allQuotes: Quote[] = [];

      // Method 1: Pattern-based extraction
      const patternQuotes = this.extractPatternQuotes(text, paragraphs);
      allQuotes.push(...patternQuotes);

      // Method 2: Dialogue detection
      const dialogueQuotes = this.extractDialogueQuotes(text, paragraphs);
      allQuotes.push(...dialogueQuotes);

      // Method 3: Attribution-based extraction
      const attributionQuotes = this.extractAttributionQuotes(text, paragraphs);
      allQuotes.push(...attributionQuotes);

      // Remove duplicates and filter
      const uniqueQuotes = this.deduplicateQuotes(allQuotes);
      const filteredQuotes = uniqueQuotes.filter(quote =>
        quote.text.length >= minQuoteLength &&
        quote.text.length <= maxQuoteLength &&
        quote.importanceScore >= minImportanceScore
      );

      // Calculate sentiment scores
      const quotesWithSentiment = await this.analyzeSentiment(filteredQuotes);

      // Identify key quotes
      const finalQuotes = extractKeyQuotes
        ? this.identifyKeyQuotes(quotesWithSentiment)
        : quotesWithSentiment;

      // Store quotes in database
      await this.storeQuotes(articleId, finalQuotes);

      const processingTimeMs = Date.now() - startTime;

      return {
        quotes: finalQuotes.sort((a, b) => b.importanceScore - a.importanceScore),
        processingTimeMs,
        success: true
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      return {
        quotes: [],
        processingTimeMs,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private extractPatternQuotes(text: string, paragraphs: string[]): Quote[] {
    const quotes: Quote[] = [];

    for (const pattern of this.quotePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const quoteText = match[1] || match[2] || match[3];
        const speaker = match[2] || match[1] || match[4];

        if (!quoteText || quoteText.length < 5) continue;

        const startChar = match.index;
        const endChar = startChar + match[0].length;
        const paragraphNumber = this.findParagraphNumber(startChar, paragraphs);
        const context = this.extractContext(text, startChar, endChar, 100);

        const quote: Quote = {
          text: this.cleanQuoteText(quoteText),
          speaker: this.cleanSpeakerName(speaker),
          context,
          startChar,
          endChar,
          paragraphNumber,
          importanceScore: this.calculateImportanceScore(quoteText, speaker, context, text),
          sentimentScore: 0, // Will be calculated later
          quoteType: this.determineQuoteType(match[0]),
          isKeyQuote: false // Will be determined later
        };

        quotes.push(quote);
      }
    }

    return quotes;
  }

  private extractDialogueQuotes(text: string, paragraphs: string[]): Quote[] {
    const quotes: Quote[] = [];

    // Look for dialogue patterns in paragraphs
    paragraphs.forEach((paragraph, index) => {
      // Find quoted text within paragraphs
      const dialogueMatches = paragraph.match(/["'"'"]([^"'"'"]+)["'"'"]/g);

      if (dialogueMatches) {
        dialogueMatches.forEach(match => {
          const quoteText = match.slice(1, -1); // Remove quotes
          if (quoteText.length < 10) return;

          const startChar = text.indexOf(paragraph) + paragraph.indexOf(match);
          const endChar = startChar + match.length;
          const context = paragraph;

          // Try to find speaker in the same paragraph
          const speaker = this.extractSpeakerFromContext(paragraph, match);

          const quote: Quote = {
            text: this.cleanQuoteText(quoteText),
            speaker: this.cleanSpeakerName(speaker),
            context,
            startChar,
            endChar,
            paragraphNumber: index + 1,
            importanceScore: this.calculateImportanceScore(quoteText, speaker, context, text),
            sentimentScore: 0,
            quoteType: 'direct',
            isKeyQuote: false
          };

          quotes.push(quote);
        });
      }
    });

    return quotes;
  }

  private extractAttributionQuotes(text: string, paragraphs: string[]): Quote[] {
    const quotes: Quote[] = [];

    // Look for attribution patterns
    const attributionPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|says|stated|explained|told|noted|commented|remarked|declared|announced|confirmed|revealed|claimed|argued|insisted|maintained)\s+(?:that\s+)?(.+?)(?:\.|$)/gi;

    let match;
    while ((match = attributionPattern.exec(text)) !== null) {
      const speaker = match[1];
      const quotedContent = match[2];

      if (!quotedContent || quotedContent.length < 20) continue;

      const startChar = match.index;
      const endChar = startChar + match[0].length;
      const paragraphNumber = this.findParagraphNumber(startChar, paragraphs);
      const context = this.extractContext(text, startChar, endChar, 150);

      const quote: Quote = {
        text: this.cleanQuoteText(quotedContent),
        speaker: this.cleanSpeakerName(speaker),
        context,
        startChar,
        endChar,
        paragraphNumber,
        importanceScore: this.calculateImportanceScore(quotedContent, speaker, context, text),
        sentimentScore: 0,
        quoteType: 'reported',
        isKeyQuote: false
      };

      quotes.push(quote);
    }

    return quotes;
  }

  private deduplicateQuotes(quotes: Quote[]): Quote[] {
    const seen = new Set<string>();
    const unique: Quote[] = [];

    for (const quote of quotes) {
      // Create a normalized version for comparison
      const normalized = quote.text.toLowerCase().replace(/\s+/g, ' ').trim();

      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(quote);
      }
    }

    return unique;
  }

  private async analyzeSentiment(quotes: Quote[]): Promise<Quote[]> {
    // Simple sentiment analysis based on keywords
    // In production, you might use a more sophisticated sentiment analysis service

    const positiveWords = new Set(['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'success', 'win', 'achieve', 'proud', 'happy', 'excited', 'optimistic', 'confident', 'pleased', 'satisfied']);
    const negativeWords = new Set(['bad', 'terrible', 'awful', 'horrible', 'negative', 'fail', 'failure', 'lose', 'sad', 'angry', 'frustrated', 'disappointed', 'concerned', 'worried', 'afraid', 'uncertain']);

    return quotes.map(quote => {
      const words = quote.text.toLowerCase().split(/\s+/);
      let positiveScore = 0;
      let negativeScore = 0;

      words.forEach(word => {
        if (positiveWords.has(word)) positiveScore++;
        if (negativeWords.has(word)) negativeScore++;
      });

      const total = positiveScore + negativeScore;
      let sentimentScore = 0;

      if (total > 0) {
        sentimentScore = (positiveScore - negativeScore) / total;
      }

      return {
        ...quote,
        sentimentScore: Math.max(-1, Math.min(1, sentimentScore))
      };
    });
  }

  private identifyKeyQuotes(quotes: Quote[]): Quote[] {
    // Sort by importance score
    const sorted = [...quotes].sort((a, b) => b.importanceScore - a.importanceScore);

    // Mark top quotes as key quotes
    const keyQuoteThreshold = 0.7;
    const maxKeyQuotes = Math.min(5, Math.ceil(quotes.length * 0.2)); // Top 20% or 5 quotes max

    return sorted.map((quote, index) => ({
      ...quote,
      isKeyQuote: quote.importanceScore >= keyQuoteThreshold || index < maxKeyQuotes
    }));
  }

  private calculateImportanceScore(
    quoteText: string,
    speaker: string | undefined,
    context: string,
    fullText: string
  ): number {
    let score = 0.5; // Base score

    // Length factor (optimal quote length gets higher score)
    const length = quoteText.length;
    if (length >= 50 && length <= 200) score += 0.15;
    else if (length >= 20 && length <= 300) score += 0.1;

    // Speaker importance
    if (speaker) {
      score += 0.2;

      // Check if speaker has title
      const speakerLower = speaker.toLowerCase();
      if (Array.from(this.speakerTitles).some(title =>
        speakerLower.includes(title.toLowerCase()))) {
        score += 0.15;
      }

      // Check if speaker is mentioned frequently
      const speakerMentions = (fullText.match(new RegExp(speaker, 'gi')) || []).length;
      if (speakerMentions > 1) score += 0.1;
    }

    // Position factor (quotes early in article might be more important)
    const position = context.length > 0 ? fullText.indexOf(context) / fullText.length : 1;
    if (position < 0.3) score += 0.1; // Early in article

    // Content importance indicators
    const importantWords = ['announce', 'reveal', 'confirm', 'declare', 'state', 'emphasize', 'stress', 'important', 'significant', 'major', 'key', 'crucial', 'critical'];
    const quoteWords = quoteText.toLowerCase();
    const contextWords = context.toLowerCase();

    importantWords.forEach(word => {
      if (quoteWords.includes(word) || contextWords.includes(word)) {
        score += 0.05;
      }
    });

    // Emotional intensity (quotes with strong language might be more important)
    const emotionalWords = ['shocking', 'amazing', 'incredible', 'unbelievable', 'devastating', 'extraordinary', 'unprecedented', 'historic', 'breakthrough', 'revolutionary'];
    emotionalWords.forEach(word => {
      if (quoteWords.includes(word)) score += 0.05;
    });

    return Math.max(0, Math.min(1, score));
  }

  private determineQuoteType(matchText: string): Quote['quoteType'] {
    if (matchText.includes('"') || matchText.includes('"') || matchText.includes('"')) {
      return 'direct';
    }
    if (matchText.toLowerCase().includes('said that') || matchText.toLowerCase().includes('stated that')) {
      return 'reported';
    }
    return 'paraphrase';
  }

  private findParagraphNumber(charIndex: number, paragraphs: string[]): number {
    let currentIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      currentIndex += paragraphs[i].length;
      if (charIndex <= currentIndex) {
        return i + 1;
      }
      currentIndex += 2; // Account for paragraph breaks
    }

    return paragraphs.length;
  }

  private extractContext(text: string, start: number, end: number, windowSize: number): string {
    const contextStart = Math.max(0, start - windowSize);
    const contextEnd = Math.min(text.length, end + windowSize);

    let context = text.slice(contextStart, contextEnd);
    context = context.replace(/\s+/g, ' ').trim();

    if (contextStart > 0) context = '...' + context;
    if (contextEnd < text.length) context = context + '...';

    return context;
  }

  private extractSpeakerFromContext(paragraph: string, quoteMatch: string): string | undefined {
    const quoteIndex = paragraph.indexOf(quoteMatch);
    const beforeQuote = paragraph.slice(0, quoteIndex);
    const afterQuote = paragraph.slice(quoteIndex + quoteMatch.length);

    // Look for attribution before or after the quote
    const attributionPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|says|stated|told|explained|added|noted|commented)/i;

    let match = beforeQuote.match(attributionPattern);
    if (!match) {
      match = afterQuote.match(attributionPattern);
    }

    return match ? match[1] : undefined;
  }

  private cleanQuoteText(text: string): string {
    return text
      .replace(/^["'"'"]+|["'"'"]+$/g, '') // Remove surrounding quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private cleanSpeakerName(speaker: string | undefined): string | undefined {
    if (!speaker) return undefined;

    return speaker
      .replace(/^(Mr|Ms|Mrs|Dr|Prof|Professor|CEO|President|Director)\.?\s+/i, '') // Remove titles
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async storeQuotes(articleId: number, quotes: Quote[]): Promise<void> {
    // First, remove existing quotes for this article
    this.db.prepare(`
      DELETE FROM article_quotes WHERE article_id = ?
    `).run(articleId);

    if (quotes.length === 0) return;

    const insertStmt = this.db.prepare(`
      INSERT INTO article_quotes (
        article_id, quote_text, speaker, context, start_char, end_char,
        paragraph_number, importance_score, sentiment_score, quote_type, is_key_quote
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const quote of quotes) {
        insertStmt.run(
          articleId,
          quote.text,
          quote.speaker || null,
          quote.context,
          quote.startChar,
          quote.endChar,
          quote.paragraphNumber,
          quote.importanceScore,
          quote.sentimentScore,
          quote.quoteType,
          quote.isKeyQuote ? 1 : 0
        );
      }
    });

    transaction();
  }

  async getArticleQuotes(
    articleId: number,
    options: {
      keyQuotesOnly?: boolean;
      minImportance?: number;
      limit?: number;
    } = {}
  ): Promise<Quote[]> {
    const { keyQuotesOnly = false, minImportance = 0, limit = 50 } = options;

    let query = `
      SELECT
        quote_text as text, speaker, context, start_char as startChar,
        end_char as endChar, paragraph_number as paragraphNumber,
        importance_score as importanceScore, sentiment_score as sentimentScore,
        quote_type as quoteType, is_key_quote as isKeyQuote
      FROM article_quotes
      WHERE article_id = ?
    `;
    const params: any[] = [articleId];

    if (keyQuotesOnly) {
      query += ` AND is_key_quote = 1`;
    }

    if (minImportance > 0) {
      query += ` AND importance_score >= ?`;
      params.push(minImportance);
    }

    query += ` ORDER BY importance_score DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(query).all(...params);
    return rows.map(row => ({
      ...row,
      isKeyQuote: Boolean(row.isKeyQuote)
    })) as Quote[];
  }

  async getQuoteSummary(articleId: number): Promise<{
    totalQuotes: number;
    keyQuotes: number;
    avgImportanceScore: number;
    avgSentimentScore: number;
    topSpeakers: Array<{ speaker: string; count: number }>;
  }> {
    const summary = this.db.prepare(`
      SELECT
        COUNT(*) as totalQuotes,
        SUM(CASE WHEN is_key_quote = 1 THEN 1 ELSE 0 END) as keyQuotes,
        AVG(importance_score) as avgImportanceScore,
        AVG(sentiment_score) as avgSentimentScore
      FROM article_quotes
      WHERE article_id = ?
    `).get(articleId) as any;

    const topSpeakers = this.db.prepare(`
      SELECT speaker, COUNT(*) as count
      FROM article_quotes
      WHERE article_id = ? AND speaker IS NOT NULL
      GROUP BY speaker
      ORDER BY count DESC
      LIMIT 5
    `).all(articleId) as Array<{ speaker: string; count: number }>;

    return {
      totalQuotes: summary.totalQuotes || 0,
      keyQuotes: summary.keyQuotes || 0,
      avgImportanceScore: summary.avgImportanceScore || 0,
      avgSentimentScore: summary.avgSentimentScore || 0,
      topSpeakers
    };
  }
}

export default QuoteExtractionService;