# 🎙️ IntelliCast AI

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**IntelliCast AI** is a next-generation, AI-powered podcast generation and content analysis platform that transforms documents, news, and web content into engaging, multi-voice conversational podcasts. Leveraging state-of-the-art Large Language Models (LLaMA, Qwen), advanced Text-to-Speech synthesis (Cartesia Sonic), and intelligent content processing, IntelliCast delivers professional-quality podcast content with unprecedented speed and accuracy.

---

## ✨ Core Features

### 🎭 **Multi-Voice Conversation Studio** *(NEW)*
- **NotebookLM-Style Podcasts**: Transform any document into natural, engaging two-person conversations
- **4 Conversation Styles**:
  - **Conversational Chat**: Friendly, casual discussion between hosts
  - **Expert Panel**: Professional analysis with expert perspectives
  - **Debate Style**: Adversarial exchanges with opposing viewpoints
  - **Interview Format**: Q&A style with probing questions
- **Together AI Integration**: Powered by Meta LLaMA-3-70b for intelligent script generation
- **Cartesia Sonic TTS**: Ultra-realistic voice synthesis with emotional nuance
- **Voice Customization**: Male and female voice pairings for authentic dialogue
- **Real-Time Generation**: Live progress tracking with status updates
- **High-Quality Audio**: Professional-grade MP3 output with normalized audio

### 🔍 **Enhanced AI Search & Analysis**
- **Perplexity-Style Intelligence**: Advanced web search with Tavily API integration
- **Smart Content Synthesis**: AI-powered answer generation with proper citations
- **Intent Detection**: Automatically adapts responses based on query type (news, research, how-to)
- **Quality Assurance**: Intelligent fallback system using original high-quality summaries

### 🎧 **Single Voice Narration Studio**
- **Multi-Format Support**: Process PDF, DOCX, TXT, and Markdown documents
- **AI Content Analysis**: Automatic text extraction, summarization, and categorization
- **Chatterbox TTS Integration**: Multilingual voice synthesis (23 languages)
- **Advanced Voice Control**: Customizable exaggeration, temperature, and speech parameters
- **Real-Time Processing**: Instant document-to-audio conversion with live progress tracking

### 📰 **Intelligent News Audio**
- **Real-Time News Aggregation**: Automated fetching from multiple RSS sources
- **Smart Categorization**: AI-powered content classification and tagging
- **Audio News Generation**: Convert breaking news into podcast-ready audio
- **Personalized Briefings**: Tailored news summaries based on user preferences

### 🎵 **Professional Audio Experience**
- **Modern Audio Player**: Sophisticated playback with waveform visualization
- **Speed Control**: Variable playback speeds (0.5x to 2x)
- **Audio Analytics**: Real-time spectrum analysis and level monitoring
- **Download Support**: Export generated podcasts in high-quality formats

### 🎨 **Adaptive User Interface**
- **Multi-Theme Support**: Light, Dark, and Professional Dark themes
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Glassmorphism Effects**: Modern UI with advanced visual effects
- **Accessibility First**: WCAG compliant with keyboard navigation support

---

## 🏗️ Architecture Overview

### Frontend Stack
```
React 19 + TypeScript + Vite
├── 🎨 UI Framework: Tailwind CSS + Framer Motion
├── 🔄 State Management: Redux Toolkit + React Context
├── 📊 Data Visualization: Custom audio spectrum analysis
├── 🎯 Routing: React Router DOM
└── 📱 Responsive: Mobile-first design principles
```

### Backend Infrastructure

#### Node.js Backend
```
Node.js + Express.js
├── 🤖 AI Services
│   ├── Ollama (Qwen2.5:7b) - Text Processing & Summarization
│   ├── Chatterbox TTS - Multilingual Voice Synthesis
│   └── Tavily API - Web Search & Content Retrieval
├── 💾 Data Layer
│   ├── SQLite Database - Structured data storage
│   ├── File System Cache - Audio & document caching
│   └── Session Management - User state persistence
├── 🔧 Core Services
│   ├── Document Processor - Multi-format text extraction
│   ├── News Aggregator - RSS feed management
│   ├── Audio Generator - TTS pipeline management
│   └── Content Analyzer - AI-powered content classification
└── 🌐 API Layer (Port 3004)
    ├── RESTful Endpoints - Standardized API design
    ├── File Upload Handling - Secure document processing
    ├── Real-time Updates - Live progress tracking
    └── Error Management - Comprehensive error handling
```

#### Python FastAPI Backend *(NEW)*
```
FastAPI + Uvicorn
├── 🎙️ Podcast Generation Pipeline
│   ├── Together AI (LLaMA-3-70b) - Dialogue Script Generation
│   ├── Cartesia Sonic - Neural TTS with 14 Voice Presets
│   ├── Audio Processing - WAV/MP3 conversion with normalization
│   └── Usage Tracking - Cost estimation & monitoring
├── 🎯 Style-Specific Prompts
│   ├── Conversational - Friendly chat dynamics
│   ├── Expert Panel - Professional analysis format
│   ├── Debate - Adversarial opposing viewpoints
│   └── Interview - Q&A narrative structure
├── 🔧 Core Components
│   ├── LLM Generator - Script creation with retry logic
│   ├── TTS Generator - Multi-voice audio synthesis
│   ├── Audio Mixer - Voice merging & enhancement
│   └── File Manager - Output organization
└── 🌐 REST API (Port 8000)
    ├── /api/podcast/generate - Async podcast creation
    ├── /api/podcast/estimate-cost - Cost calculation
    ├── /api/podcast/status/{job_id} - Progress tracking
    └── /api/podcast/download/{file} - Audio delivery
```

### Modular Architecture
```
src/
├── components/           # Reusable UI components
│   ├── audio/           # Audio player & controls
│   ├── layout/          # App layout & navigation
│   ├── narration/       # Voice narration & multi-voice components
│   ├── search/          # Search interface components
│   ├── ui/              # Base UI components (GlassCard, etc.)
│   └── views/           # Main application views
├── features/            # Feature-specific modules
│   └── voice-search/    # Enhanced AI search functionality
├── contexts/            # React contexts (Theme, etc.)
├── services/            # API & external service integrations
│   ├── narrationApi.ts  # Podcast generation API client
│   └── tavilyClient.ts  # Tavily search integration
├── types/               # TypeScript type definitions
└── utils/               # Utility functions

backend/
├── routes/              # API endpoint definitions
├── services/            # Core backend services
│   ├── ai/             # AI service integrations
│   ├── news/           # News processing services
│   └── DocumentProcessor.js, OllamaService.js, TTSWrapper.js
├── core/               # Core backend modules
├── scripts/            # Automation & setup scripts
└── server.js           # Express server (Port 3004)

Python Backend/
├── llm_generator.py     # Together AI LLM integration with style-specific prompts
├── tts_generator.py     # Cartesia Sonic TTS wrapper with voice presets
├── main.py              # Podcast pipeline orchestration
├── usage_tracker.py     # Cost tracking & analytics
├── config.py            # Configuration management
├── start_podcast_api.py # Startup script
└── backend/
    └── podcast_api.py   # FastAPI endpoints (Port 8000)
```

---

## 🚀 Quick Start Guide

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (v3.8+ for FastAPI & TTS services)
- **Ollama** ([Download here](https://ollama.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ARMAND-cod-eng/Intellicast.AI.git
   cd Intellicast.AI
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Set up the Node.js backend**
   ```bash
   cd backend
   npm install

   # Setup Ollama models
   npm run ollama:setup

   # Populate news database
   npm run news:populate
   cd ..
   ```

4. **Set up the Python backend**
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt
   ```

5. **Configure environment variables**
   ```bash
   # Copy and configure environment file
   cp .env.example .env

   # Edit .env with your API keys:
   nano .env
   ```

   Required API keys:
   ```env
   # Together AI (for LLaMA model access)
   TOGETHER_API_KEY=your-together-ai-key-here

   # Cartesia (for Sonic TTS)
   CARTESIA_API_KEY=your-cartesia-key-here

   # Tavily (for enhanced search)
   VITE_TAVILY_API_KEY=your-tavily-key-here

   # Optional: News API
   NEWS_API_KEY=your-news-api-key-here
   ```

6. **Start all development servers**
   ```bash
   # Terminal 1: Start Node.js backend (Port 3004)
   cd backend && npm start

   # Terminal 2: Start Python FastAPI backend (Port 8000)
   python start_podcast_api.py

   # Terminal 3: Start frontend (Port 5173+)
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Node.js API: http://localhost:3004
   - Python API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

---

## 🔧 Configuration

### Environment Variables

#### Frontend Configuration
```env
# Tavily API for enhanced search
VITE_TAVILY_API_KEY=your-tavily-api-key-here
```

#### Node.js Backend Configuration
```env
# Server Configuration
PORT=3004
NODE_ENV=development

# AI Services
OLLAMA_BASE_URL=http://localhost:11434
CHATTERBOX_API_URL=http://localhost:8080

# News Service
NEWS_API_KEY=your-news-api-key-here
NEWS_AUDIO_ENABLED=true

# File Processing
MAX_FILE_SIZE=50mb
UPLOAD_PATH=./backend/uploads

# Database
DATABASE_PATH=./backend/database.db
```

#### Python Backend Configuration
```env
# Together AI Configuration
TOGETHER_API_KEY=your-together-ai-key-here

# Cartesia TTS Configuration
CARTESIA_API_KEY=your-cartesia-key-here

# Output Configuration
AUDIO_OUTPUT_DIR=./backend/audio/podcasts
CACHE_DIR=./backend/cache
```

### API Service Setup

#### Ollama Models
```bash
# Install required models
ollama pull qwen2.5:7b        # Text processing
ollama pull llama3.1:8b       # Backup model
```

#### Together AI
Sign up at [Together AI](https://together.ai) and get your API key for LLaMA model access.

#### Cartesia Sonic
Register at [Cartesia](https://cartesia.ai) for high-quality TTS API access.

---

## 🎯 Feature Deep Dive

### Multi-Voice Podcast Generation

Transform any document into engaging conversations:

**Workflow:**
1. **Document Upload**: Drag-and-drop your document (PDF, DOCX, TXT, MD)
2. **Style Selection**: Choose conversation style (Conversational, Expert Panel, Debate, Interview)
3. **Voice Configuration**: Select host and guest voice presets (14 available)
4. **Script Generation**: Together AI's LLaMA-3-70b creates authentic dialogue
5. **Audio Synthesis**: Cartesia Sonic generates realistic multi-voice audio
6. **Post-Processing**: Audio normalization and MP3 conversion
7. **Download**: Professional podcast ready to share

**Conversation Styles:**

- **Conversational Chat**
  - Friendly, casual discussion
  - Natural "friends over coffee" vibe
  - Warm, approachable language
  - Perfect for: General topics, explainers, storytelling

- **Expert Panel**
  - Professional analysis format
  - Evidence-based discussion
  - Research references and data
  - Perfect for: Technical topics, research papers, industry reports

- **Debate Style**
  - Adversarial intellectual exchanges
  - Opposing viewpoints with genuine disagreement
  - Counter-arguments and rebuttals
  - Perfect for: Controversial topics, policy discussions, comparative analysis

- **Interview Format**
  - Q&A narrative structure
  - Probing questions and detailed answers
  - Behind-the-scenes insights
  - Perfect for: Profiles, case studies, expert interviews

### AI-Powered Search

The Enhanced AI Search feature provides:

- **Real-time Web Search**: Integration with Tavily API for current information
- **Intelligent Content Synthesis**: AI-powered summarization with proper citations
- **Multi-format Responses**: Structured answers adapted to query intent
- **Quality Validation**: Automatic detection of high-quality vs. template responses
- **Follow-up Intelligence**: Context-aware question suggestions

### Document-to-Podcast Pipeline

Transform any document into a professional podcast:

1. **Smart Upload**: Drag-and-drop interface with format validation
2. **Content Extraction**: Advanced text processing for PDF, DOCX, TXT, MD
3. **AI Analysis**: Content categorization and complexity assessment
4. **Script Generation**: Intelligent narrative creation with natural flow
5. **Voice Synthesis**: High-quality multilingual TTS with emotion control
6. **Audio Processing**: Professional audio output with optional background music

### News Intelligence

Stay informed with AI-curated news:

- **Multi-source Aggregation**: Automatic RSS feed monitoring
- **Content Classification**: AI-powered categorization and tagging
- **Real-time Updates**: Live news feed with smart filtering
- **Audio Summaries**: Convert news articles to audio briefings
- **Personalization**: Tailored content based on reading history

---

## 🔌 API Reference

### Multi-Voice Podcast Generation

#### Cost Estimation
```typescript
POST http://localhost:8000/api/podcast/estimate-cost
Content-Type: application/json

{
  "document_text": string,
  "length": "5min" | "10min" | "15min" | "20min"
}

Response: {
  "success": boolean,
  "estimate": {
    "llm_cost": number,
    "tts_cost": number,
    "total_cost": number,
    "estimated_tokens": number,
    "estimated_turns": number
  }
}
```

#### Generate Podcast (Async)
```typescript
POST http://localhost:8000/api/podcast/generate
Content-Type: application/json

{
  "document_text": string,
  "length": "10min",
  "host_voice": "host_male_friendly",
  "guest_voice": "guest_female_expert",
  "style": "conversational" | "expert-panel" | "debate" | "interview",
  "output_format": "mp3",
  "save_script": boolean
}

Response: {
  "success": boolean,
  "job_id": string,
  "message": string,
  "status_url": string
}
```

#### Check Generation Status
```typescript
GET http://localhost:8000/api/podcast/status/{job_id}

Response: {
  "success": boolean,
  "job": {
    "status": "processing" | "completed" | "failed",
    "progress": number,
    "message": string,
    "result": {
      "audio_file": string,
      "script_file": string,
      "duration_seconds": number,
      "total_cost": number,
      "metadata": object
    }
  }
}
```

#### Download Generated Audio
```typescript
GET http://localhost:8000/api/podcast/download/{filename}

Response: Audio file (audio/mpeg or audio/wav)
```

#### Get Available Voices
```typescript
GET http://localhost:8000/api/podcast/voices

Response: {
  "success": boolean,
  "voices": {
    "host_voices": Array<{id: string, name: string, gender: string}>,
    "guest_voices": Array<{id: string, name: string, gender: string}>
  }
}
```

### Document Processing (Node.js Backend)
```typescript
POST http://localhost:3004/api/narration/process-document
Content-Type: multipart/form-data

FormData: {
  document: File  // PDF, DOCX, TXT, or MD file
}

Response: {
  "success": boolean,
  "document": {
    "originalName": string,
    "text": string,
    "analysis": {
      "wordCount": number,
      "sentenceCount": number,
      "readingTime": number,
      "complexity": string,
      "contentType": string
    },
    "chunks": number,
    "contentHash": string
  }
}
```

### Narration Generation (Node.js Backend)
```typescript
POST http://localhost:3004/api/narration/generate
Content-Type: application/json

{
  "documentContent": string,
  "narrationType": "summary" | "full" | "explanatory" | "briefing",
  "voice": string,
  "speed": number,  // 0.5 to 2.0
  "backgroundMusic": boolean,
  "musicType": string
}

Response: {
  "success": boolean,
  "narrationId": string,
  "script": string,
  "audioUrl": string,
  "duration": number
}
```

---

## 🧪 Development

### Running Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# Python backend tests
pytest

# End-to-end tests
npm run test:e2e
```

### Building for Production
```bash
# Build frontend
npm run build

# Start production Node.js backend
cd backend && npm start

# Start production Python backend
uvicorn backend.podcast_api:app --host 0.0.0.0 --port 8000
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format

# Python linting
flake8
black .
```

---

## 🔮 Technology Stack

### Core Technologies
- **Frontend**: React 19, TypeScript, Vite
- **Node.js Backend**: Express.js, ES Modules
- **Python Backend**: FastAPI, Uvicorn, Pydantic
- **Database**: SQLite with better-sqlite3
- **AI/ML**:
  - Together AI (Meta LLaMA-3-70b)
  - Ollama (Qwen2.5:7b)
  - Cartesia Sonic TTS
  - Chatterbox TTS
- **Styling**: Tailwind CSS, Framer Motion
- **Build Tools**: Vite, ESLint, TypeScript Compiler

### Key Libraries

#### Frontend
- **UI Components**: Lucide React (icons), React Dropzone
- **Audio Processing**: WaveSurfer.js, Web Audio API
- **State Management**: Redux Toolkit, React Context
- **Development**: React Fast Refresh

#### Node.js Backend
- **Document Processing**: PDF.js, Mammoth (DOCX), Marked (Markdown)
- **Network**: Tavily SDK, Fetch API
- **Development**: Nodemon

#### Python Backend
- **AI Integration**: Together SDK, OpenAI-compatible APIs
- **Audio Processing**: PyDub, FFmpeg
- **API Framework**: FastAPI, Uvicorn
- **Data Models**: Pydantic
- **File Handling**: Python-Multipart

---

## 🎙️ Voice Presets

### Host Voices
- `host_male_friendly` - Warm, approachable male voice
- `host_male_casual` - Relaxed conversational male voice
- `host_male_professional` - Authoritative business voice
- `host_female_warm` - Friendly, engaging female voice
- `host_female_professional` - Professional broadcast voice
- `host_female_energetic` - Dynamic, enthusiastic voice
- `host_british_male` - British English male accent

### Guest Voices
- `guest_female_expert` - Professional female expert voice
- `guest_female_warm` - Approachable female voice
- `guest_male_expert` - Authoritative male expert
- `guest_male_casual` - Conversational male voice
- `guest_british_female` - British English female accent
- `guest_australian_male` - Australian English accent
- `guest_young_female` - Youthful, energetic female voice

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'feat: Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript and Python best practices
- Maintain test coverage above 80%
- Use conventional commit messages (feat, fix, docs, style, refactor, test, chore)
- Update documentation for new features
- Ensure cross-platform compatibility
- Add type hints to Python code
- Follow PEP 8 style guide for Python

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgments

- **Together AI** - For providing access to state-of-the-art LLaMA models
- **Cartesia** - For exceptional neural TTS technology
- **Ollama Team** - For excellent local LLM infrastructure
- **Chatterbox TTS** - For multilingual voice synthesis capabilities
- **Tavily** - For advanced web search and content retrieval
- **React Team** - For the incredible React 19 framework
- **FastAPI** - For the modern, high-performance Python API framework
- **Tailwind CSS** - For the utility-first CSS framework

---

## 🔗 Links

- **GitHub Repository**: [Intellicast.AI](https://github.com/ARMAND-cod-eng/Intellicast.AI.git)
- **API Documentation**: [FastAPI Docs](http://localhost:8000/docs) (when running)
- **Issue Tracker**: [GitHub Issues](https://github.com/ARMAND-cod-eng/Intellicast.AI/issues)

---

## 📊 Project Stats

- **Languages**: TypeScript, Python, JavaScript
- **Frameworks**: React, FastAPI, Express.js
- **AI Models**: LLaMA-3-70b, Qwen2.5:7b
- **TTS Engines**: Cartesia Sonic, Chatterbox
- **Lines of Code**: 50,000+
- **Active Development**: ✅

---

**Built with ❤️ by Armand Junior Dongmo Notue**

*Transform any content into engaging multi-voice podcasts with the power of AI*

---

## 🚀 What's New in v2.0

### ✨ Major Features
- 🎭 **Multi-Voice Conversation Studio** - NotebookLM-style podcast generation
- 🤖 **Together AI Integration** - LLaMA-3-70b powered dialogue creation
- 🎤 **Cartesia Sonic TTS** - Ultra-realistic voice synthesis
- 🎨 **4 Conversation Styles** - Tailored prompts for different podcast formats
- 📊 **Usage Tracking** - Real-time cost estimation and monitoring
- ⚡ **Async Processing** - Background job system for long-running tasks

### 🔧 Improvements
- Enhanced error handling and retry logic
- Improved audio quality with normalization
- Better CORS configuration for multi-port deployment
- Optimized prompt engineering for authentic conversations
- Streamlined API architecture with FastAPI

### 🐛 Bug Fixes
- Fixed debate style to produce genuine opposing viewpoints
- Resolved CORS issues with multiple frontend ports
- Corrected voice gender mapping for all conversation styles
- Improved audio encoding to eliminate scratching artifacts

---

**Ready to create amazing podcasts? Get started now!**
