import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import TTSWrapper from '../services/TTSWrapper.js';

const router = express.Router();
const ttsService = new TTSWrapper();

/**
 * GET /api/audio/health
 * Health check for audio services
 */
router.get('/health', async (req, res) => {
  try {
    const ttsHealth = await ttsService.healthCheck();
    
    res.json({
      status: ttsHealth.status === 'healthy' ? 'ok' : 'warning',
      message: ttsHealth.status === 'healthy' ? 'Audio service with TTS ready' : 'TTS service issues detected',
      tts: ttsHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to check TTS service',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/audio/:id
 * Serve audio files
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const audioPath = path.join('audio', `${id}.wav`);
    
    if (!(await fs.pathExists(audioPath))) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Stream the audio file
    const audioStream = fs.createReadStream(audioPath);
    audioStream.pipe(res);

  } catch (error) {
    console.error('❌ Audio serving error:', error);
    res.status(500).json({ 
      error: 'Failed to serve audio',
      message: error.message 
    });
  }
});

/**
 * POST /api/audio/generate
 * Generate TTS audio using Chatterbox multilingual TTS
 */
router.post('/generate', async (req, res) => {
  try {
    const { text, voice = 'emma', speed = 1.0, backgroundMusic = false } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`🎙️  Generating TTS audio: ${text.length} chars, voice: ${voice}, speed: ${speed}x`);

    // Generate audio using TTS service
    const result = await ttsService.generateAudio(text, { voice, speed });

    if (result.success) {
      // Clean up old files periodically
      if (Math.random() < 0.1) { // 10% chance
        ttsService.cleanupOldFiles().catch(console.error);
      }

      res.json({
        success: true,
        audioId: result.fileName.replace('.wav', ''),
        audioUrl: result.audioUrl,
        duration: result.duration,
        fileSize: result.fileSize,
        voice: result.voice,
        speed: result.speed,
        model: result.model,
        textLength: result.textLength,
        backgroundMusic: backgroundMusic // TODO: Implement background music mixing
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'TTS generation failed',
        message: result.error
      });
    }

  } catch (error) {
    console.error('❌ TTS generation error:', error);
    res.status(500).json({ 
      error: 'TTS generation failed',
      message: error.message 
    });
  }
});

export default router;