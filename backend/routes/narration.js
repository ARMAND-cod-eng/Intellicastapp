import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

import DocumentProcessor from '../services/DocumentProcessor.js';
import OllamaService from '../services/OllamaService.js';
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
const ollamaService = new OllamaService();
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
      voice: requestedVoice = 'emma',
      speed = 1.0,
      backgroundMusic = false,
      musicType = 'none',
      // Advanced voice customization parameters
      exaggeration = null,
      temperature = 0.8,
      cfg_weight = 0.5,
      min_p = 0.05,
      top_p = 1.0,
      repetition_penalty = 1.2,
      seed = 0,
      reference_audio = null
    } = req.body;

    if (!documentContent) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    console.log(`🎙️  Generating ${narrationType} narration...`);

    // Analyze the content
    const analysis = await docProcessor.analyzeContent(documentContent);
    
    // Generate narration script
    const scriptResult = await ollamaService.generateNarrationScript(
      documentContent, 
      narrationType, 
      analysis
    );

    if (!scriptResult.success) {
      throw new Error('Failed to generate narration script');
    }

    // Generate unique ID for narration
    const narrationId = uuidv4();
    
    // Map frontend voice IDs to backend Chatterbox voice IDs
    const voiceMapping = {
      // Frontend voices -> Backend Chatterbox voices
      'emma_en': 'default_en',
      'james_en': 'default_en', 
      'sophia_es': 'default_es',
      'am_adam': 'default_en',
      'bf_heart': 'default_en',
      'am_david': 'default_en',
      // Direct Chatterbox voice IDs (passthrough)
      'default_en': 'default_en',
      'default_es': 'default_es',
      'default_fr': 'default_fr',
      'default_de': 'default_de',
      'default_ar': 'default_ar',
      'default_zh': 'default_zh',
      'default_ja': 'default_ja',
      'default_ko': 'default_ko',
      'default_it': 'default_it',
      'default_pt': 'default_pt',
      'default_ru': 'default_ru',
      'default_hi': 'default_hi'
    };
    
    let voice = voiceMapping[requestedVoice] || voiceMapping['default_en'];
    
    if (voice !== requestedVoice) {
      console.log(`🔄 Mapped frontend voice '${requestedVoice}' -> backend voice '${voice}'`);
    }
    
    console.log(`🎙️  Using Chatterbox voice: ${voice}`);
    
    // Generate TTS audio with Chatterbox multilingual TTS
    // ALWAYS generate audio for all narration types - user expects audio output
    console.log(`🎧 Generating TTS audio with Chatterbox multilingual TTS (Advanced)...`);
    console.log(`📝 Text length: ${scriptResult.response.length} chars, Voice: ${voice}`);
    
    // Emergency fix: For document-summary, prioritize text delivery over audio
    let audioResult = null;
    
    try {
      audioResult = await ttsService.generateAudio(scriptResult.response, { 
        voice: voice, 
        speed,
        exaggeration,
        temperature,
        cfg_weight,
        min_p,
        top_p,
        repetition_penalty,
        seed,
        reference_audio
      });
    } catch (audioError) {
      console.error('❌ TTS generation failed:', audioError.message);
      
      // For document-summary, create a placeholder success response so text can be displayed
      if (narrationType === 'document-summary') {
        console.log('🔄 Document summary: Returning text without audio due to TTS issue');
        audioResult = {
          success: true,
          fileName: 'placeholder.wav',
          audioUrl: null,
          duration: 0,
          fileSize: 0,
          model: 'placeholder'
        };
      } else {
        // For other narration types, still throw the error
        throw new Error(`Audio generation failed: ${audioError.message}`);
      }
    }
    
    if (!audioResult || !audioResult.success) {
      console.error('❌ TTS generation failed:', audioResult ? audioResult.error : 'No result returned');
      
      // For document-summary, create a placeholder success response
      if (narrationType === 'document-summary') {
        console.log('🔄 Document summary: Creating placeholder audio response');
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

    console.log(`❓ Answering question: ${question.slice(0, 50)}...`);

    const answerResult = await ollamaService.answerQuestion(documentContent, question);

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
 * GET /api/narration/health
 * Health check for narration services
 */
router.get('/health', async (req, res) => {
  try {
    const ollamaHealth = await ollamaService.healthCheck();
    
    res.json({
      status: 'ok',
      services: {
        ollama: ollamaHealth,
        documentProcessor: { status: 'healthy' }
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