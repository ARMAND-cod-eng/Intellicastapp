import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

// Import routes
import narrationRoutes from './routes/narration.js';
import audioRoutes from './routes/audio.js';
import voicesRoutes from './routes/voices.js';
import newsRoutes from './routes/news.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179', 'http://localhost:5180', 'http://localhost:5181', 'http://localhost:5182'], // Vite dev server
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create necessary directories
const createDirectories = async () => {
  const dirs = ['uploads', 'audio', 'cache'];
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    await fs.ensureDir(dirPath);
    console.log(`✅ Directory created/verified: ${dir}`);
  }
};

// Static files
app.use('/audio', express.static(path.join(__dirname, 'audio')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/narration', narrationRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/voices', voicesRoutes);
app.use('/api/news', newsRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    // Test Ollama connection
    let ollamaStatus = 'healthy';
    let models = [];
    
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags');
      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        models = data.models?.map(m => m.name) || [];
        if (models.length === 0) {
          ollamaStatus = 'no_models';
        }
      } else {
        ollamaStatus = 'unreachable';
      }
    } catch (error) {
      ollamaStatus = 'unreachable';
    }

    res.json({ 
      status: ollamaStatus === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        server: 'running',
        ollama: ollamaStatus,
        models: models
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        server: 'running',
        ollama: 'error',
        error: error.message
      }
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Start server
const startServer = async () => {
  try {
    await createDirectories();
    
    app.listen(PORT, () => {
      console.log(`🚀 IntelliCast Backend running on port ${PORT}`);
      console.log(`📁 Server directory: ${__dirname}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();