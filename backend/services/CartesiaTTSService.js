import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

class CartesiaTTSService {
  constructor() {
    this.apiKey = process.env.CARTESIA_API_KEY;
    this.apiUrl = process.env.CARTESIA_API_URL || 'https://api.cartesia.ai';
    this.audioDir = path.join(__dirname, '..', 'audio');

    if (!this.apiKey) {
      console.warn('⚠️  Cartesia API key not found in environment variables');
    }

    console.log('🎙️  Cartesia AI TTS Service initialized');
    console.log('🌍 Supporting multiple voices with podcast style adaptation');

    this.podcastStyles = {
      'conversational': {
        name: 'Conversational',
        description: 'Friendly and engaging, like talking to a friend',
        voiceConfig: { speed: 1.0, emphasis: 0.3, pause_duration: 0.8 }
      },
      'professional': {
        name: 'Professional',
        description: 'Clear and authoritative for business content',
        voiceConfig: { speed: 0.95, emphasis: 0.2, pause_duration: 0.6 }
      },
      'educational': {
        name: 'Educational',
        description: 'Clear explanations with thoughtful pacing',
        voiceConfig: { speed: 0.9, emphasis: 0.4, pause_duration: 1.0 }
      },
      'storytelling': {
        name: 'Storytelling',
        description: 'Dramatic and engaging for narratives',
        voiceConfig: { speed: 1.1, emphasis: 0.5, pause_duration: 1.2 }
      },
      'news': {
        name: 'News',
        description: 'Authoritative and clear for news content',
        voiceConfig: { speed: 1.0, emphasis: 0.3, pause_duration: 0.5 }
      }
    };

    // Cartesia AI voices (verified from API)
    this.voices = {
      'e07c00bc-4134-4eae-9ea4-1a55fb45746b': { name: 'Brooke - Big Sister', gender: 'female', language: 'en', description: 'Approachable adult female' },
      'f786b574-daa5-4673-aa0c-cbe3e8534c02': { name: 'Katie - Friendly Fixer', gender: 'female', language: 'en', description: 'Enunciating young adult female' },
      '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc': { name: 'Jacqueline - Reassuring Agent', gender: 'female', language: 'en', description: 'Confident, young adult female' },
      'f9836c6e-a0bd-460e-9d3c-f7299fa60f94': { name: 'Caroline - Southern Guide', gender: 'female', language: 'en', description: 'Friendly, inviting' },
      '5ee9feff-1265-424a-9d7f-8e4d431a12c7': { name: 'Ronald - Thinker', gender: 'male', language: 'en', description: 'Intense, deep young adult male' },
      '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30': { name: 'Linda - Conversational Guide', gender: 'female', language: 'en', description: 'Clear, confident mature female' },
      '694f9389-aac1-45b6-b726-9d9369183238': { name: 'Sarah - Mindful Woman', gender: 'female', language: 'en', description: 'Soothing female for meditations' },
      '248be419-c632-4f23-adf1-5324ed7dbf1d': { name: 'Elizabeth - Manager', gender: 'female', language: 'en', description: 'Enunicating young female' },
      'a167e0f3-df7e-4d52-a9c3-f949145efdab': { name: 'Blake - Helpful Agent', gender: 'male', language: 'en', description: 'Energetic adult male' },
      '5c5ad5e7-1020-476b-8b91-fdcbe9cc313c': { name: 'Daniela - Relaxed Woman', gender: 'female', language: 'es', description: 'Calm Mexican accented female' }
    };
  }

  /**
   * Check if TTS service is healthy
   */
  async healthCheck() {
    try {
      console.log('🔍 Checking Cartesia TTS service health...');

      if (!this.apiKey) {
        return {
          status: 'unhealthy',
          error: 'Cartesia API key not configured'
        };
      }

      const response = await fetch(`${this.apiUrl}/voices`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Cartesia-Version': '2025-04-16',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Cartesia TTS service is healthy');
        return {
          status: 'healthy',
          service: 'Cartesia AI',
          voices_available: Object.keys(this.voices).length,
          podcast_styles: Object.keys(this.podcastStyles).length
        };
      } else {
        console.error('❌ Cartesia API health check failed:', response.status);
        return {
          status: 'unhealthy',
          error: `API responded with status ${response.status}`
        };
      }
    } catch (error) {
      console.error('❌ Cartesia health check error:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get all available voices with their characteristics
   */
  async getAvailableVoices() {
    try {
      const voiceList = Object.entries(this.voices).map(([id, voice]) => ({
        id,
        name: voice.name,
        gender: voice.gender,
        language: voice.language,
        provider: 'Cartesia'
      }));

      return voiceList;
    } catch (error) {
      console.error('❌ Get voices error:', error);
      return [];
    }
  }

  /**
   * Get available podcast styles
   */
  getPodcastStyles() {
    return Object.entries(this.podcastStyles).map(([id, style]) => ({
      id,
      name: style.name,
      description: style.description
    }));
  }

  /**
   * Generate audio from text using Cartesia AI with podcast style adaptation
   */
  async generateAudio(text, options = {}) {
    try {
      const {
        voice = '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', // Default: Linda - Conversational Guide
        podcastStyle = 'conversational',
        outputFile = null
      } = options;

      if (!this.apiKey) {
        throw new Error('Cartesia API key not configured');
      }

      // Apply podcast style adaptations to text
      const adaptedText = this.adaptTextForPodcastStyle(text, podcastStyle);
      const styleConfig = this.podcastStyles[podcastStyle] || this.podcastStyles['conversational'];

      console.log(`🎤 Generating Cartesia TTS: voice='${this.voices[voice]?.name || voice}', style='${podcastStyle}'`);
      console.log(`📄 Text to synthesize (${adaptedText.length} chars): "${adaptedText.substring(0, 100)}..."`);

      // Generate unique filename
      const textHash = crypto.createHash('md5').update(adaptedText + voice + podcastStyle).digest('hex').substring(0, 8);
      const fileName = outputFile || `cartesia_${podcastStyle}_${textHash}.wav`;
      const filePath = path.join(this.audioDir, fileName);

      // Prepare request payload according to Cartesia API spec
      const payload = {
        model_id: "sonic-2",
        transcript: adaptedText,
        voice: {
          mode: "id",
          id: voice
        },
        output_format: {
          container: "wav",
          encoding: "pcm_f32le",
          sample_rate: 44100
        },
        language: "en",
        speed: styleConfig.voiceConfig.speed === 1.0 ? "normal" :
               styleConfig.voiceConfig.speed < 1.0 ? "slow" : "fast"
      };

      // Make request to Cartesia API
      const response = await fetch(`${this.apiUrl}/tts/bytes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Cartesia-Version': '2025-04-16',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cartesia API error: ${response.status} - ${errorText}`);
      }

      // Save audio file
      const audioBuffer = await response.buffer();
      await fs.writeFile(filePath, audioBuffer);

      // Get file stats
      const stats = await fs.stat(filePath);

      console.log(`✅ Audio generated: ${fileName} (${stats.size} bytes, ${podcastStyle} style)`);

      return {
        success: true,
        audioUrl: `/audio/${fileName}`,
        filePath: filePath,
        fileName: fileName,
        fileSize: stats.size,
        voice: this.voices[voice]?.name || voice,
        voiceId: voice,
        podcastStyle: podcastStyle,
        styleDescription: styleConfig.description,
        provider: 'Cartesia',
        textLength: adaptedText.length,
        speed: styleConfig.voiceConfig.speed
      };

    } catch (error) {
      console.error('❌ Cartesia TTS generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Adapt text based on podcast style
   */
  adaptTextForPodcastStyle(text, style) {
    const styleConfig = this.podcastStyles[style];
    if (!styleConfig) return text;

    let adaptedText = text;

    switch (style) {
      case 'conversational':
        // Add more natural pauses and friendly transitions
        adaptedText = text
          .replace(/\. /g, '. ... ')
          .replace(/\? /g, '? ... ')
          .replace(/! /g, '! ... ');
        break;

      case 'professional':
        // Ensure clear pronunciation of technical terms
        adaptedText = text
          .replace(/\b(AI|API|CEO|CTO|CEO|IT)\b/g, match => match.split('').join('. '))
          .replace(/\. /g, '. ');
        break;

      case 'educational':
        // Add emphasis on key points and longer pauses
        adaptedText = text
          .replace(/\. /g, '. .... ')
          .replace(/: /g, ': ... ')
          .replace(/\b(important|key|note|remember)\b/gi, match => `*${match}*`);
        break;

      case 'storytelling':
        // Add dramatic pauses and emphasis
        adaptedText = text
          .replace(/\. /g, '. ..... ')
          .replace(/\b(suddenly|however|but|then)\b/gi, match => `... ${match}`)
          .replace(/\b(amazing|incredible|shocking|surprising)\b/gi, match => `*${match}*`);
        break;

      case 'news':
        // Clear, authoritative delivery
        adaptedText = text
          .replace(/\. /g, '. .. ')
          .replace(/\b(breaking|urgent|important|update)\b/gi, match => `*${match}*`);
        break;

      default:
        break;
    }

    return adaptedText;
  }

  /**
   * Generate a voice preview with podcast style
   */
  async generateVoicePreview(voiceId, podcastStyle = 'conversational') {
    try {
      console.log(`🎧 Generating preview for voice: ${voiceId} with style: ${podcastStyle}`);

      const previewText = `Hello! This is a preview of this voice using the ${this.podcastStyles[podcastStyle]?.name || 'conversational'} podcast style. This demonstrates how your content will sound with this particular voice and presentation style.`;

      const result = await this.generateAudio(previewText, {
        voice: voiceId,
        podcastStyle: podcastStyle,
        outputFile: `preview_${voiceId}_${podcastStyle}_${Date.now()}.wav`
      });

      if (result.success) {
        console.log(`✅ Preview generated: ${result.fileName}`);
        return result;
      } else {
        console.error('❌ Preview generation failed:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Preview generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old audio files
   */
  async cleanupOldFiles(olderThanHours = 24) {
    try {
      const files = await fs.readdir(this.audioDir);
      const now = Date.now();
      const threshold = olderThanHours * 60 * 60 * 1000;

      let cleaned = 0;

      for (const file of files) {
        if ((file.startsWith('cartesia_') || file.startsWith('preview_')) && file.endsWith('.wav')) {
          const filePath = path.join(this.audioDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtime.getTime() > threshold) {
            await fs.remove(filePath);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} old audio files`);
      }

      return { cleaned, total: files.length };
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      return { cleaned: 0, total: 0, error: error.message };
    }
  }
}

export default CartesiaTTSService;