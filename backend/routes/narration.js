import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

import DocumentProcessor from '../services/DocumentProcessor.js';
import OllamaService from '../services/OllamaService.js';
import TogetherNarrationService from '../services/TogetherNarrationService.js';
import TTSWrapper from '../services/TTSWrapper.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// Initialize services
const docProcessor = new DocumentProcessor();
const ollamaService = new OllamaService(); // Keep for fallback if needed
const togetherService = new TogetherNarrationService(); // NEW: Together AI for high-quality narration
const ttsService = new TTSWrapper();

/**
 * POST /api/narration/process-document
 * Process uploaded document and extract text
 */
router.post('/process-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { path: filePath, originalname, mimetype } = req.file;
    
    console.log(`📄 Processing uploaded file: ${originalname}`);

    // Validate document
    docProcessor.validateDocument(filePath, mimetype);

    // Extract text
    const text = await docProcessor.extractText(filePath, mimetype);
    
    // Analyze content
    const analysis = await docProcessor.analyzeContent(text);

    // Generate chunks for processing
    const chunks = await docProcessor.chunkText(text);

    // Clean up uploaded file
    await fs.remove(filePath);

    res.json({
      success: true,
      document: {
        originalName: originalname,
        text,
        analysis,
        chunks: chunks.length,
        contentHash: analysis.contentHash
      }
    });

  } catch (error) {
    console.error('❌ Document processing error:', error);
    
    // Clean up file on error
    if (req.file?.path) {
      await fs.remove(req.file.path).catch(() => {});
    }

    res.status(500).json({ 
      error: 'Document processing failed',
      message: error.message 
    });
  }
});

/**
 * POST /api/narration/generate
 * Generate narration script from processed document
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      documentContent,
      narrationType = 'summary',
      voice: requestedVoice = '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', // Default: Linda - Conversational Guide
      podcastStyle = 'conversational',
      speed = 1.0,
      backgroundMusic = false,
      musicType = 'none',
      // Audio enhancement options
      musicVolume = 0.3,
      addIntroOutro = false,
      pauseAtPunctuation = false,
      pauseDuration = 0.3
    } = req.body;

    if (!documentContent) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    console.log(`🎙️  Generating ${narrationType} narration with Together AI...`);

    // Analyze the content
    const analysis = await docProcessor.analyzeContent(documentContent);

    // Generate narration script using Together AI (replaces Qwen/Ollama)
    const scriptResult = await togetherService.generateNarrationScript(
      documentContent,
      narrationType,
      analysis
    );

    if (!scriptResult.success) {
      throw new Error('Failed to generate narration script');
    }

    console.log(`✅ Together AI generated script: ${scriptResult.response.length} chars`);

    // Generate unique ID for narration
    const narrationId = uuidv4();
    
    // Map frontend voice IDs to backend Cartesia voice IDs
    const voiceMapping = {
      // Frontend legacy voices -> Cartesia voices
      'emma_en': '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', // Linda - Conversational Guide
      'james_en': 'a167e0f3-df7e-4d52-a9c3-f949145efdab', // Blake - Helpful Agent
      'sophia_es': '5c5ad5e7-1020-476b-8b91-fdcbe9cc313c', // Daniela - Relaxed Woman
      'am_adam': '5ee9feff-1265-424a-9d7f-8e4d431a12c7', // Ronald - Thinker
      'bf_heart': '694f9389-aac1-45b6-b726-9d9369183238', // Sarah - Mindful Woman
      'am_david': 'a167e0f3-df7e-4d52-a9c3-f949145efdab', // Blake - Helpful Agent
      // Direct Cartesia voice IDs (passthrough) - updated with correct IDs
      'e07c00bc-4134-4eae-9ea4-1a55fb45746b': 'e07c00bc-4134-4eae-9ea4-1a55fb45746b', // Brooke
      'f786b574-daa5-4673-aa0c-cbe3e8534c02': 'f786b574-daa5-4673-aa0c-cbe3e8534c02', // Katie
      '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc': '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', // Jacqueline
      'f9836c6e-a0bd-460e-9d3c-f7299fa60f94': 'f9836c6e-a0bd-460e-9d3c-f7299fa60f94', // Caroline
      '5ee9feff-1265-424a-9d7f-8e4d431a12c7': '5ee9feff-1265-424a-9d7f-8e4d431a12c7', // Ronald
      '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30': '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', // Linda
      '694f9389-aac1-45b6-b726-9d9369183238': '694f9389-aac1-45b6-b726-9d9369183238', // Sarah
      '248be419-c632-4f23-adf1-5324ed7dbf1d': '248be419-c632-4f23-adf1-5324ed7dbf1d', // Elizabeth
      'a167e0f3-df7e-4d52-a9c3-f949145efdab': 'a167e0f3-df7e-4d52-a9c3-f949145efdab', // Blake
      '5c5ad5e7-1020-476b-8b91-fdcbe9cc313c': '5c5ad5e7-1020-476b-8b91-fdcbe9cc313c', // Daniela
      'default_en': '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30' // Linda - Conversational Guide
    };

    let voice = voiceMapping[requestedVoice] || voiceMapping['default_en'];
    
    if (voice !== requestedVoice) {
      console.log(`🔄 Mapped frontend voice '${requestedVoice}' -> backend voice '${voice}'`);
    }
    
    console.log(`🎙️  Using Chatterbox voice: ${voice}`);
    
    // Generate TTS audio with Chatterbox multilingual TTS
    // ALWAYS generate audio for all narration types - user expects audio output
    console.log(`🎧 Generating TTS audio with Cartesia AI TTS...`);
    console.log(`📝 Text length: ${scriptResult.response.length} chars, Voice: ${voice}, Style: ${podcastStyle}`);

    let audioResult = null;

    try {
      audioResult = await ttsService.generateAudio(scriptResult.response, {
        voice: voice,
        podcastStyle: podcastStyle,
        speed,
        // Audio enhancements
        backgroundMusic: backgroundMusic ? musicType : null,
        musicVolume,
        addIntroOutro,
        pauseAtPunctuation,
        pauseDuration
      });
    } catch (audioError) {
      console.error('❌ TTS generation failed:', audioError.message);

      // Check if it's a Cartesia credit limit error
      const isCreditLimitError = audioError.message.includes('402') || audioError.message.includes('credit limit');

      // For summary types, create a placeholder success response so text can be displayed
      if (narrationType === 'document-summary' || narrationType === 'quick-summary') {
        console.log(`🔄 ${narrationType}: Returning text without audio due to TTS issue`);
        audioResult = {
          success: true,
          fileName: 'placeholder.wav',
          audioUrl: null,
          duration: 0,
          fileSize: 0,
          model: 'placeholder',
          warning: isCreditLimitError ? 'Cartesia API credit limit reached. Please add credits at https://play.cartesia.ai/subscription' : 'Audio generation unavailable'
        };
      } else {
        // For other narration types, still throw the error
        throw new Error(`Audio generation failed: ${audioError.message}`);
      }
    }
    
    if (!audioResult || !audioResult.success) {
      console.error('❌ TTS generation failed:', audioResult ? audioResult.error : 'No result returned');
      
      // For summary types, create a placeholder success response
      if (narrationType === 'document-summary' || narrationType === 'quick-summary') {
        console.log(`🔄 ${narrationType}: Creating placeholder audio response`);
        audioResult = {
          success: true,
          fileName: 'placeholder.wav',
          audioUrl: null,
          duration: 0,
          fileSize: 0,
          model: 'placeholder'
        };
      } else {
        // Don't proceed without audio for other types - user expects audio output
        throw new Error(`Audio generation failed: ${audioResult ? audioResult.error : 'TTS service returned no result'}`);
      }
    }
    
    console.log(`✅ TTS audio generated successfully: ${audioResult.fileName} (${audioResult.duration}s)`);
    // Remove the null assignment - we should always have audio
    
    // Cache the complete narration data
    const cacheData = {
      id: narrationId,
      script: scriptResult.response,
      voice,
      speed,
      backgroundMusic,
      musicType,
      analysis,
      audio: {
        audioId: audioResult.fileName.replace('.wav', ''),
        audioUrl: audioResult.audioUrl,
        duration: audioResult.duration,
        fileSize: audioResult.fileSize,
        model: audioResult.model
      },
      createdAt: new Date().toISOString()
    };

    // Store in cache directory
    await fs.writeJson(`cache/${narrationId}.json`, cacheData);

    res.json({
      success: true,
      narrationId,
      script: scriptResult.response,
      analysis,
      model: scriptResult.model,
      tokensGenerated: scriptResult.tokensGenerated,
      // TTS integration complete - audio always generated!
      audioUrl: audioResult.audioUrl,
      duration: audioResult.duration,
      audioId: audioResult.fileName.replace('.wav', ''),
      hasAudio: true
    });

  } catch (error) {
    console.error('❌ Narration generation error:', error);
    res.status(500).json({ 
      error: 'Narration generation failed',
      message: error.message 
    });
  }
});

/**
 * POST /api/narration/generate-script
 * Generate narration script only (without TTS)
 */
router.post('/generate-script', async (req, res) => {
  try {
    const {
      documentContent,
      narrationType = 'summary',
      stream = false
    } = req.body;

    if (!documentContent) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    // Handle streaming request
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      console.log(`📝 Generating ${narrationType} script (streaming)...`);

      // Simulate streaming for now (real implementation would use Together AI streaming)
      const analysis = await docProcessor.analyzeContent(documentContent);
      const scriptResult = await togetherService.generateNarrationScript(
        documentContent,
        narrationType,
        analysis
      );

      if (scriptResult.success) {
        const words = scriptResult.response.split(' ');
        const chunkSize = 5; // Send 5 words at a time

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';
          const progress = Math.min(100, Math.floor((i / words.length) * 100));

          res.write(`data: ${JSON.stringify({
            chunk,
            progress,
            stage: progress < 30 ? 'Analyzing document...' :
                   progress < 60 ? 'Generating script...' :
                   progress < 90 ? 'Refining content...' : 'Finalizing...'
          })}\n\n`);

          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        res.write(`data: ${JSON.stringify({
          done: true,
          fullScript: scriptResult.response,
          analysis,
          model: scriptResult.model,
          tokensGenerated: scriptResult.tokensGenerated
        })}\n\n`);
      }

      res.end();
      return;
    }

    // Non-streaming (original implementation)
    console.log(`📝 Generating ${narrationType} script (no audio)...`);

    // Analyze the content
    const analysis = await docProcessor.analyzeContent(documentContent);

    // Generate narration script using Together AI
    const scriptResult = await togetherService.generateNarrationScript(
      documentContent,
      narrationType,
      analysis
    );

    if (!scriptResult.success) {
      throw new Error('Failed to generate narration script');
    }

    console.log(`✅ Script generated: ${scriptResult.response.length} chars`);

    res.json({
      success: true,
      script: scriptResult.response,
      analysis,
      model: scriptResult.model,
      tokensGenerated: scriptResult.tokensGenerated,
      metadata: scriptResult.metadata
    });

  } catch (error) {
    console.error('❌ Script generation error:', error);
    res.status(500).json({
      error: 'Script generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/narration/voice-preview
 * Generate ultra-short voice preview (5-10 seconds, voice only)
 */
router.post('/voice-preview', async (req, res) => {
  try {
    const {
      text,
      voice = '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30',
      podcastStyle = 'conversational'
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Preview text is required' });
    }

    // Limit to 30 words maximum for short preview (~6-8 seconds)
    const shortText = text.split(/\s+/).slice(0, 30).join(' ');

    console.log(`🎧 Generating short voice preview (${shortText.split(/\s+/).length} words)...`);

    // Generate ONLY voice audio (no music, no enhancements)
    const audioResult = await ttsService.generateAudio(shortText, {
      voice,
      podcastStyle,
      speed: 1.0,
      outputFile: `voice_preview_${Date.now()}.wav`
    });

    if (!audioResult || !audioResult.success) {
      throw new Error('Voice preview generation failed');
    }

    console.log(`✅ Voice preview generated: ${audioResult.fileName}`);

    res.json({
      success: true,
      audioUrl: audioResult.audioUrl,
      duration: Math.ceil(shortText.split(/\s+/).length / 2.5), // Estimate: ~2.5 words/sec
      previewText: shortText
    });

  } catch (error) {
    console.error('❌ Voice preview error:', error);
    res.status(500).json({
      error: 'Voice preview failed',
      message: error.message
    });
  }
});

/**
 * POST /api/narration/transform-script
 * Transform narration script using AI (shorter, casual, formal)
 */
router.post('/transform-script', async (req, res) => {
  try {
    const {
      originalScript,
      transformationType = 'shorter', // 'shorter', 'casual', 'formal'
      stream = false
    } = req.body;

    if (!originalScript) {
      return res.status(400).json({ error: 'Original script is required' });
    }

    if (!['shorter', 'casual', 'formal'].includes(transformationType)) {
      return res.status(400).json({ error: 'Invalid transformation type. Must be: shorter, casual, or formal' });
    }

    console.log(`🔄 Transforming script: ${transformationType} (${originalScript.split(/\s+/).length} words)`);

    // If streaming is requested
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        // Send initial status
        res.write(`data: ${JSON.stringify({
          stage: `Transforming to ${transformationType}...`,
          progress: 10
        })}\n\n`);

        // Generate transformation
        const result = await togetherService.transformScript(originalScript, transformationType);

        if (!result.success) {
          throw new Error(result.error || 'Transformation failed');
        }

        // Stream the transformed script word by word
        const words = result.script.split(' ');
        const chunkSize = 5;

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';
          const progress = Math.min(100, Math.floor((i / words.length) * 100));

          res.write(`data: ${JSON.stringify({
            chunk,
            progress,
            stage: `Generating ${transformationType} version...`
          })}\n\n`);

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Send completion
        res.write(`data: ${JSON.stringify({
          done: true,
          fullScript: result.script,
          transformationType: result.transformationType,
          wordCount: result.wordCount,
          originalWordCount: result.originalWordCount,
          model: result.model,
          metadata: result.metadata
        })}\n\n`);

        res.end();

      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }

    } else {
      // Non-streaming response
      const result = await togetherService.transformScript(originalScript, transformationType);

      if (!result.success) {
        throw new Error(result.error || 'Transformation failed');
      }

      res.json({
        success: true,
        script: result.script,
        transformationType: result.transformationType,
        wordCount: result.wordCount,
        originalWordCount: result.originalWordCount,
        model: result.model,
        metadata: result.metadata
      });
    }

  } catch (error) {
    console.error('❌ Script transformation error:', error);
    res.status(500).json({
      error: 'Script transformation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/narration/generate-preview
 * Generate short audio preview with voice + music mix
 */
router.post('/generate-preview', async (req, res) => {
  try {
    const {
      documentContent,
      voice = '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30',
      speed = 1.0,
      backgroundMusic = false,
      musicType = 'none',
      musicVolume = 0.3,
      podcastStyle = 'conversational'
    } = req.body;

    if (!documentContent) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    console.log(`🎧 Generating audio mix preview...`);

    // Extract first 40 words for ~15 second preview
    const previewText = documentContent.split(/\s+/).slice(0, 40).join(' ');
    console.log(`📝 Preview text: ${previewText.split(/\s+/).length} words (~15 seconds)`);

    // Generate preview audio
    const audioResult = await ttsService.generateAudio(previewText, {
      voice,
      speed,
      podcastStyle,
      backgroundMusic: backgroundMusic ? musicType : null,
      musicVolume,
      preview: true // Flag for shorter processing
    });

    if (!audioResult || !audioResult.success) {
      throw new Error('Preview audio generation failed');
    }

    console.log(`✅ Preview generated: ${audioResult.duration}s`);

    res.json({
      success: true,
      audioUrl: audioResult.audioUrl,
      duration: audioResult.duration,
      previewText: previewText.slice(0, 200) + '...'
    });

  } catch (error) {
    console.error('❌ Preview generation error:', error);
    res.status(500).json({
      error: 'Preview generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/narration/ask-question
 * Answer questions about the document content
 */
router.post('/ask-question', async (req, res) => {
  try {
    const { documentContent, question } = req.body;

    if (!documentContent || !question) {
      return res.status(400).json({
        error: 'Document content and question are required'
      });
    }

    console.log(`❓ Answering question with Together AI: ${question.slice(0, 50)}...`);

    // Use Together AI for question answering (replaces Qwen/Ollama)
    const answerResult = await togetherService.answerQuestion(documentContent, question);

    if (!answerResult.success) {
      throw new Error('Failed to generate answer');
    }

    res.json({
      success: true,
      question,
      answer: answerResult.response,
      model: answerResult.model,
      // Placeholder for future TTS of the answer
      audioUrl: null
    });

  } catch (error) {
    console.error('❌ Question answering error:', error);
    res.status(500).json({
      error: 'Question answering failed',
      message: error.message
    });
  }
});

/**
 * POST /api/narration/chat
 * Advanced chat with citations and conversation context
 */
router.post('/chat', async (req, res) => {
  try {
    const { documentContent, question, conversationHistory = [] } = req.body;

    if (!documentContent || !question) {
      return res.status(400).json({
        error: 'Document content and question are required'
      });
    }

    console.log(`💬 Chat question with context: ${question.slice(0, 50)}...`);

    // Use Together AI with citations and conversation context
    const chatResult = await togetherService.answerQuestionWithCitations(
      documentContent,
      question,
      conversationHistory
    );

    if (!chatResult.success) {
      throw new Error('Failed to generate chat response');
    }

    res.json({
      success: true,
      question,
      answer: chatResult.answer,
      citations: chatResult.citations,
      model: chatResult.model,
      tokens: chatResult.tokens,
      cost: chatResult.cost,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Chat failed',
      message: error.message
    });
  }
});

/**
 * GET /api/narration/health
 * Health check for narration services
 */
router.get('/health', async (req, res) => {
  try {
    // Use Together AI service for health check
    const togetherHealth = await togetherService.healthCheck();

    res.json({
      status: 'ok',
      services: {
        togetherAI: togetherHealth,
        documentProcessor: { status: 'healthy' },
        tts: { status: 'healthy' }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/narration/:id
 * Retrieve cached narration data
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cachePath = `cache/${id}.json`;
    
    if (!(await fs.pathExists(cachePath))) {
      return res.status(404).json({ error: 'Narration not found' });
    }

    const narrationData = await fs.readJson(cachePath);
    res.json(narrationData);

  } catch (error) {
    console.error('❌ Narration retrieval error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve narration',
      message: error.message 
    });
  }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 50MB)' });
    }
  }
  
  console.error('❌ Router error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

export default router;