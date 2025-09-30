/**
 * Search API Routes
 * Handles audio generation for search results
 */

import express from 'express';
import TTSWrapper from '../services/TTSWrapper.js';

const router = express.Router();
const ttsService = new TTSWrapper();

/**
 * POST /api/search/generate-audio
 * Generate audio narration for search results/answers using Cartesia AI
 */
router.post('/generate-audio', async (req, res) => {
  try {
    const {
      text,
      query,
      voice = '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', // Default: Linda - Conversational Guide
      podcastStyle = 'professional',
      speed = 1.0,
      mode = 'simple' // 'simple' or 'detailed'
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    console.log(`🎙️  Generating audio for search query: "${query || 'unknown'}"`);
    console.log(`📝 Text length: ${text.length} chars, Mode: ${mode}, Style: ${podcastStyle}`);

    // Generate audio with Cartesia TTS
    const audioResult = await ttsService.generateAudio(text, {
      voice,
      podcastStyle,
      speed
    });

    if (!audioResult.success) {
      throw new Error(`Audio generation failed: ${audioResult.error}`);
    }

    console.log(`✅ Search audio generated: ${audioResult.fileName}`);

    res.json({
      success: true,
      query: query || 'Search result',
      audioUrl: audioResult.audioUrl,
      audioFile: audioResult.fileName,
      duration: audioResult.duration,
      voice: audioResult.voice,
      voiceId: audioResult.voiceId,
      podcastStyle: audioResult.podcastStyle,
      provider: audioResult.provider,
      mode: mode,
      textLength: text.length
    });

  } catch (error) {
    console.error('❌ Error generating search audio:', error.message);
    res.status(500).json({
      error: 'Failed to generate search audio',
      message: error.message
    });
  }
});

/**
 * GET /api/search/voices
 * Get available voices for search audio
 */
router.get('/voices', async (req, res) => {
  try {
    const voices = await ttsService.getAvailableVoices();
    const podcastStyles = ttsService.getPodcastStyles();

    res.json({
      success: true,
      voices,
      podcastStyles
    });

  } catch (error) {
    console.error('❌ Error fetching voices:', error.message);
    res.status(500).json({
      error: 'Failed to fetch voices',
      message: error.message
    });
  }
});

/**
 * GET /api/search/health
 * Health check for search audio service
 */
router.get('/health', async (req, res) => {
  try {
    const health = await ttsService.healthCheck();

    res.json({
      status: 'ok',
      ttsService: health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Search audio health check error:', error.message);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;