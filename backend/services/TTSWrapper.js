import CartesiaTTSService from './CartesiaTTSService.js';

class TTSWrapper {
  constructor() {
    this.ttsService = new CartesiaTTSService();

    console.log('🎙️  Cartesia AI TTS Service initialized');
    console.log('🌍 Supporting multiple voices with podcast style adaptation');
    console.log('✨ Enhanced with 5 podcast presentation styles');
  }

  /**
   * Check if TTS service is healthy
   */
  async healthCheck() {
    return await this.ttsService.healthCheck();
  }

  /**
   * Get all available voices with their characteristics
   */
  async getAvailableVoices() {
    return await this.ttsService.getAvailableVoices();
  }

  /**
   * Get available podcast styles
   */
  getPodcastStyles() {
    return this.ttsService.getPodcastStyles();
  }

  /**
   * Get voice recommendations based on content category and podcast style
   */
  async getVoiceRecommendations(category = 'general', podcastStyle = 'conversational') {
    try {
      const voices = await this.getAvailableVoices();

      // Filter voices based on category and style preferences
      const recommendations = voices.filter(voice => {
        switch (category) {
          case 'news':
            return voice.name.toLowerCase().includes('news') ||
                   voice.name.toLowerCase().includes('professional');
          case 'educational':
            return voice.gender === 'female' ||
                   voice.name.toLowerCase().includes('calm');
          case 'business':
            return voice.name.toLowerCase().includes('professional') ||
                   voice.name.toLowerCase().includes('british');
          case 'storytelling':
            return voice.name.toLowerCase().includes('dramatic') ||
                   voice.name.toLowerCase().includes('mischief');
          default:
            return true;
        }
      });

      return recommendations.slice(0, 3); // Return top 3 recommendations
    } catch (error) {
      console.error('❌ Get recommendations error:', error);
      return [];
    }
  }

  /**
   * Generate a voice preview with podcast style
   */
  async generateVoicePreview(voiceId, podcastStyle = 'conversational') {
    return await this.ttsService.generateVoicePreview(voiceId, podcastStyle);
  }

  /**
   * Generate audio from text using Cartesia AI with podcast style adaptation
   */
  async generateAudio(text, options = {}) {
    try {
      const {
        voice = '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', // Default: Linda - Conversational Guide
        podcastStyle = 'conversational',
        speed = 1.0,
        outputFile = null
      } = options;

      console.log(`🎤 Generating TTS audio: voice='${voice}', style='${podcastStyle}', speed=${speed}`);
      console.log(`📄 Text to synthesize (${text.length} chars): "${text.substring(0, 100)}..."`);

      const result = await this.ttsService.generateAudio(text, {
        voice,
        podcastStyle,
        outputFile
      });

      if (result.success) {
        console.log(`✅ Audio generated: ${result.fileName} (${result.fileSize} bytes, ${result.podcastStyle} style)`);

        return {
          success: true,
          audioUrl: result.audioUrl,
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.fileSize,
          voice: result.voice,
          voiceId: result.voiceId,
          podcastStyle: result.podcastStyle,
          styleDescription: result.styleDescription,
          provider: result.provider,
          textLength: result.textLength,
          speed: result.speed
        };
      } else {
        console.error('❌ Cartesia TTS generation failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ TTS generation error:', error);
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
    return await this.ttsService.cleanupOldFiles(olderThanHours);
  }
}

export default TTSWrapper;