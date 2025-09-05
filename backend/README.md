# IntelliCast AI Backend

Backend service for Single Voice Narration using Kokoro-82M TTS and Qwen2.5:7b for text processing.

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** - Install from [ollama.com](https://ollama.com)

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up Ollama and download models
npm run ollama:setup

# Start the server
npm run dev
```

## 📁 Project Structure

```
backend/
├── services/
│   ├── DocumentProcessor.js    # Document text extraction & analysis
│   ├── OllamaService.js        # AI text generation
│   └── TTSService.py           # (Next phase: Kokoro-82M integration)
├── routes/
│   ├── narration.js            # Main narration endpoints
│   └── audio.js                # Audio serving & TTS endpoints
├── scripts/
│   └── setup-ollama.js         # Ollama setup automation
├── uploads/                    # Temporary file storage
├── audio/                      # Generated audio files
├── cache/                      # Script caching
└── server.js                   # Main server file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
PORT=3001
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_FALLBACK=llama3.2:3b
MAX_FILE_SIZE=50MB
CORS_ORIGIN=http://localhost:5173
```

### Ollama Setup

The setup script will automatically:
- Check if Ollama is installed
- Start the Ollama service
- Download required models (Qwen2.5:7b, Llama3.2:3b)
- Test model functionality

```bash
npm run ollama:setup
```

## 📡 API Endpoints

### Document Processing

#### Upload & Process Document
```http
POST /api/narration/process-document
Content-Type: multipart/form-data

Body: document (file)
```

Response:
```json
{
  "success": true,
  "document": {
    "originalName": "document.pdf",
    "text": "extracted text...",
    "analysis": {
      "wordCount": 1500,
      "readingTime": 6,
      "contentType": "academic",
      "complexity": "medium"
    }
  }
}
```

### Narration Generation

#### Generate Narration Script
```http
POST /api/narration/generate
Content-Type: application/json

{
  "documentContent": "text content...",
  "narrationType": "summary", // summary|full|explanatory|briefing|interactive
  "voice": "emma",
  "speed": 1.0,
  "backgroundMusic": false
}
```

Response:
```json
{
  "success": true,
  "narrationId": "uuid",
  "script": "generated narration script...",
  "analysis": { ... },
  "model": "qwen2.5:7b"
}
```

#### Ask Question
```http
POST /api/narration/ask-question
Content-Type: application/json

{
  "documentContent": "text content...",
  "question": "What is the main point?"
}
```

### Health Checks

#### Service Health
```http
GET /api/narration/health
```

#### Audio Service Health
```http
GET /api/audio/health
```

## 🤖 Supported Models

### Primary: Qwen2.5:7b
- **Size**: ~4GB
- **Performance**: Excellent for summarization and text generation
- **Use case**: Primary model for all narration tasks

### Fallback: Llama3.2:3b  
- **Size**: ~2GB
- **Performance**: Good, lighter alternative
- **Use case**: Backup when primary model fails

## 📊 Features Implemented

### ✅ Phase 1 - Backend Setup & Document Processing

- [x] Express server with CORS and security
- [x] File upload handling (PDF, DOCX, TXT, MD)
- [x] Document text extraction and cleaning
- [x] Content analysis (word count, complexity, type detection)
- [x] Text chunking for AI processing
- [x] Ollama integration with retry logic
- [x] Multiple narration types (summary, full, explanatory, etc.)
- [x] Question answering system
- [x] Caching for performance
- [x] Health monitoring
- [x] Error handling and logging

### 🔄 Phase 2 - TTS Integration (Next)

- [ ] Kokoro-82M TTS service integration
- [ ] Audio file generation and serving
- [ ] Voice selection implementation
- [ ] Speed control
- [ ] Background music mixing
- [ ] Real-time audio level detection

## 🧪 Testing

### Test Document Processing
```bash
curl -X POST http://localhost:3001/api/narration/process-document \
  -F "document=@test.pdf"
```

### Test Script Generation
```bash
curl -X POST http://localhost:3001/api/narration/generate \
  -H "Content-Type: application/json" \
  -d '{"documentContent":"Your test content here","narrationType":"summary"}'
```

### Test Health Check
```bash
curl http://localhost:3001/api/narration/health
```

## 🔍 Troubleshooting

### Ollama Issues

1. **Service not running**:
   ```bash
   ollama serve
   ```

2. **Model not found**:
   ```bash
   ollama pull qwen2.5:7b
   ```

3. **Port conflicts**:
   - Ollama: default port 11434
   - Backend: default port 3001

### Memory Issues

- Qwen2.5:7b requires ~8GB RAM
- Use Llama3.2:3b for lower memory (4GB)
- Monitor with `ollama ps`

## 📝 Logs

Logs include:
- Document processing steps
- AI generation requests/responses  
- Performance metrics
- Error details with stack traces

## 🚀 Next Steps

1. **Install and test current backend**
2. **Verify Ollama integration**
3. **Test with sample documents**
4. **Phase 2**: Add Kokoro-82M TTS integration
5. **Phase 3**: Frontend API integration

---

**Ready to start?** Run `npm install` and `npm run ollama:setup` to begin!