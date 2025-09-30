import express from 'express';
import TTSWrapper from '../services/TTSWrapper.js';

const router = express.Router();

// Initialize Cartesia AI TTS service
const ttsService = new TTSWrapper();

/**
 * GET /api/voices
 * Get all available Cartesia AI voices with their characteristics
 */
router.get('/', async (req, res) => {
  try {
    console.log('📋 Fetching all available Cartesia AI voices...');
    
    let voicesData;
    try {
      voicesData = await ttsService.getAvailableVoices();
    } catch (voiceError) {
      console.error('❌ Voice service error:', voiceError.message);
      
      // Provide fallback voice data so UI doesn't completely break
      console.log('🔄 Providing fallback voice data...');
      voicesData = [
        {
          id: 'bf991597-6c13-4d2c-8d3d-2f4f2a4c9e4e',
          name: 'Newslady',
          gender: 'female',
          language: 'en',
          provider: 'Cartesia'
        }
      ];
    }
    
    if (!voicesData) {
      // Final fallback
      voicesData = {
        success: true,
        voices_by_language: {
          'en': [
            {
              id: 'default_en',
              name: 'Emma',
              description: 'Default English voice',
              language: 'en',
              characteristics: ['clear', 'professional'],
              best_for: ['general', 'business', 'educational'],
              exaggeration: 0.3,
              emotion: 0.5
            }
          ]
        },
        total_voices: 1,
        supported_languages: ['en'],
        features: ['Multilingual TTS', 'Voice Cloning', 'Emotion Control']
      };
    }
    
    res.json({
      success: true,
      ...voicesData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Voice listing error:', error);
    
    // Final emergency fallback
    res.json({
      success: true,
      voices_by_language: {
        'en': [
          {
            id: 'default_en',
            name: 'Emma',
            description: 'Default English voice',
            language: 'en',
            characteristics: ['clear', 'professional'],
            best_for: ['general', 'business', 'educational'],
            exaggeration: 0.3,
            emotion: 0.5
          }
        ]
      },
      total_voices: 1,
      supported_languages: ['en'],
      features: ['Multilingual TTS', 'Voice Cloning', 'Emotion Control'],
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

/**
 * GET /api/voices/recommendations
 * Get voice recommendations based on content category
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { category, gender, accent } = req.query;
    
    console.log(`🎯 Getting voice recommendations for category: ${category || 'general'}`);
    
    const recommendations = await ttsService.getVoiceRecommendations(category || 'general');
    
    // Filter by additional criteria if provided
    let filteredRecommendations = recommendations;
    
    if (gender) {
      filteredRecommendations = filteredRecommendations.filter(voice => 
        voice.gender === gender.toLowerCase()
      );
    }
    
    if (accent) {
      filteredRecommendations = filteredRecommendations.filter(voice => 
        voice.accent === accent.toLowerCase()
      );
    }
    
    res.json({
      success: true,
      recommendations: filteredRecommendations,
      criteria: {
        category: category || 'general',
        gender: gender || 'any',
        accent: accent || 'any'
      },
      total: filteredRecommendations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Voice recommendations error:', error);
    res.status(500).json({
      error: 'Failed to get voice recommendations',
      message: error.message
    });
  }
});

/**
 * POST /api/voices/:voiceId/preview
 * Generate a preview audio for a specific voice with podcast style
 */
router.post('/:voiceId/preview', async (req, res) => {
  try {
    const { voiceId } = req.params;
    const { text, podcastStyle } = req.body;

    console.log(`🎧 Generating preview for voice: ${voiceId} with style: ${podcastStyle || 'conversational'}`);

    if (!voiceId) {
      return res.status(400).json({
        error: 'Voice ID is required'
      });
    }

    // Generate preview with optional custom text and podcast style
    let previewResult;
    if (text) {
      previewResult = await ttsService.generateAudio(text, {
        voice: voiceId,
        podcastStyle: podcastStyle || 'conversational',
        outputFile: `preview_${voiceId}_${podcastStyle || 'conversational'}_${Date.now()}.wav`
      });
    } else {
      previewResult = await ttsService.generateVoicePreview(voiceId, podcastStyle || 'conversational');
    }
    
    if (!previewResult.success) {
      return res.status(500).json({
        error: 'Preview generation failed',
        message: previewResult.error
      });
    }
    
    res.json({
      success: true,
      preview: {
        voiceId,
        audioUrl: previewResult.audioUrl,
        fileName: previewResult.fileName,
        duration: previewResult.duration,
        voiceName: previewResult.voiceName,
        customText: !!text
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Voice preview error:', error);
    res.status(500).json({
      error: 'Preview generation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/voices/groups
 * Get voices organized by categories for UI display
 */
router.get('/groups', async (req, res) => {
  try {
    console.log('📂 Fetching voice groups...');
    
    const voicesData = await ttsService.getAvailableVoices();
    
    if (!voicesData) {
      return res.status(500).json({
        error: 'Failed to fetch voice data'
      });
    }
    
    res.json({
      success: true,
      groups: voicesData.groups,
      summary: voicesData.summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Voice groups error:', error);
    res.status(500).json({
      error: 'Failed to fetch voice groups',
      message: error.message
    });
  }
});

/**
 * GET /api/voices/podcast-styles
 * Get all available podcast styles
 */
router.get('/podcast-styles', async (req, res) => {
  try {
    console.log('🎭 Fetching podcast styles...');

    const podcastStyles = ttsService.getPodcastStyles();

    res.json({
      success: true,
      podcastStyles,
      total: podcastStyles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Podcast styles error:', error);
    res.status(500).json({
      error: 'Failed to fetch podcast styles',
      message: error.message
    });
  }
});

/**
 * GET /api/voices/:voiceId
 * Get detailed information about a specific voice
 */
router.get('/:voiceId', async (req, res) => {
  try {
    const { voiceId } = req.params;
    
    console.log(`🔍 Fetching details for voice: ${voiceId}`);
    
    const voicesData = await ttsService.getAvailableVoices();
    
    // Look for voice in voices_by_language structure
    let voiceDetails = null;
    if (voicesData && voicesData.voices_by_language) {
      for (const [lang, voices] of Object.entries(voicesData.voices_by_language)) {
        const voice = voices.find(v => v.id === voiceId);
        if (voice) {
          voiceDetails = voice;
          break;
        }
      }
    }
    
    if (!voiceDetails) {
      return res.status(404).json({
        error: 'Voice not found',
        voiceId
      });
    }
    
    res.json({
      success: true,
      voice: voiceDetails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Voice details error:', error);
    res.status(500).json({
      error: 'Failed to fetch voice details',
      message: error.message
    });
  }
});

/**
 * GET /api/voices/categories
 * Get all available content categories
 */
router.get('/categories', async (req, res) => {
  try {
    console.log('📋 Fetching voice categories...');
    
    const voicesData = await ttsService.getAvailableVoices();
    
    if (!voicesData) {
      return res.status(500).json({
        error: 'Failed to fetch voice data'
      });
    }
    
    res.json({
      success: true,
      categories: voicesData.categories,
      total: voicesData.categories.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Voice categories error:', error);
    res.status(500).json({
      error: 'Failed to fetch voice categories',
      message: error.message
    });
  }
});

/**
 * POST /api/voices/compare
 * Generate preview audios for multiple voices with the same text for comparison
 */
router.post('/compare', async (req, res) => {
  try {
    const { voiceIds, text } = req.body;
    
    if (!voiceIds || !Array.isArray(voiceIds) || voiceIds.length === 0) {
      return res.status(400).json({
        error: 'Voice IDs array is required'
      });
    }
    
    if (!text) {
      return res.status(400).json({
        error: 'Text is required for comparison'
      });
    }
    
    console.log(`🔄 Generating comparison previews for ${voiceIds.length} voices...`);
    
    const comparisons = [];
    const timestamp = Date.now();
    
    // Generate previews for each voice with the same text
    for (const voiceId of voiceIds) {
      try {
        const previewResult = await ttsService.generateAudio(text, {
          voice: voiceId,
          speed: 1.0,
          outputFile: `compare_${voiceId}_${timestamp}.wav`
        });
        
        if (previewResult.success) {
          comparisons.push({
            voiceId,
            language: previewResult.language,
            audioUrl: previewResult.audioUrl,
            duration: previewResult.duration,
            characteristics: previewResult.voiceCharacteristics,
            emotion: previewResult.emotion,
            model: previewResult.model,
            success: true
          });
        } else {
          comparisons.push({
            voiceId,
            success: false,
            error: previewResult.error
          });
        }
      } catch (error) {
        comparisons.push({
          voiceId,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = comparisons.filter(c => c.success).length;
    
    res.json({
      success: successCount > 0,
      comparisons,
      text,
      voicesRequested: voiceIds.length,
      voicesGenerated: successCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Voice comparison error:', error);
    res.status(500).json({
      error: 'Voice comparison failed',
      message: error.message
    });
  }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('❌ Voice router error:', error);
  res.status(500).json({
    error: 'Voice service error',
    message: error.message
  });
});

export default router;