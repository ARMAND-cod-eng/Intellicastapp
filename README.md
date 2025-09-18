# 🎙️ IntelliCast AI

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**IntelliCast AI** is a next-generation, AI-powered podcast generation and content analysis platform that transforms documents, news, and web content into engaging, personalized audio experiences. Leveraging state-of-the-art Large Language Models, advanced Text-to-Speech synthesis, and intelligent content processing, IntelliCast delivers professional-quality podcast content with unprecedented speed and accuracy.

## ✨ Core Features

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
└── 🌐 API Layer
    ├── RESTful Endpoints - Standardized API design
    ├── File Upload Handling - Secure document processing
    ├── Real-time Updates - Live progress tracking
    └── Error Management - Comprehensive error handling
```

### Modular Architecture
```
src/
├── components/           # Reusable UI components
│   ├── audio/           # Audio player & controls
│   ├── layout/          # App layout & navigation
│   ├── narration/       # Voice narration components
│   ├── search/          # Search interface components
│   ├── ui/              # Base UI components
│   └── views/           # Main application views
├── features/            # Feature-specific modules
│   └── voice-search/    # Enhanced AI search functionality
├── contexts/            # React contexts (Theme, etc.)
├── services/            # API & external service integrations
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
└── test/               # Test suites

modules/
└── news-audio/         # Modular news audio feature
    ├── backend/        # News-specific backend logic
    └── frontend/       # News UI components
```

## 🚀 Quick Start Guide

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (v3.8+ for TTS services)
- **Ollama** ([Download here](https://ollama.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ARMAND-cod-eng/Podcast.git
   cd Podcast
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Set up the backend**
   ```bash
   cd backend
   npm install

   # Setup Ollama models
   npm run ollama:setup

   # Populate news database
   npm run news:populate
   ```

4. **Configure environment variables**
   ```bash
   # Copy and configure environment file
   cp .env.example .env

   # Edit .env with your API keys:
   # - VITE_TAVILY_API_KEY (Get from https://tavily.com)
   # - NEWS_API_KEY (Optional, for enhanced news features)
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1: Start backend
   cd backend && npm run dev

   # Terminal 2: Start frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3004

## 🔧 Configuration

### Environment Variables

#### Frontend Configuration
```env
# Tavily API for enhanced search
VITE_TAVILY_API_KEY=your-tavily-api-key-here
```

#### Backend Configuration
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

### API Service Setup

#### Ollama Models
```bash
# Install required models
ollama pull qwen2.5:7b        # Text processing
ollama pull llama3.1:8b       # Backup model
```

#### Chatterbox TTS
Ensure Chatterbox TTS service is running on port 8080 with multilingual support enabled.

## 🎯 Feature Deep Dive

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

## 🔌 API Reference

### Document Processing
```typescript
POST /api/narration/process-document
Content-Type: multipart/form-data

// Upload and extract text from documents
FormData: {
  document: File  // PDF, DOCX, TXT, or MD file
}

Response: {
  success: boolean
  document: {
    originalName: string
    text: string
    analysis: ContentAnalysis
    chunks: number
    contentHash: string
  }
}
```

### Narration Generation
```typescript
POST /api/narration/generate
Content-Type: application/json

{
  documentContent: string
  narrationType: 'summary' | 'full' | 'explanatory' | 'briefing'
  voice: string  // Voice ID from supported voices
  speed: number  // 0.5 to 2.0
  backgroundMusic: boolean
  musicType?: string
}

Response: {
  success: boolean
  narrationId: string
  script: string
  audioUrl: string
  duration: number
  hasAudio: boolean
}
```

### News API
```typescript
GET /api/news/articles?limit=20&offset=0&category=general

Response: {
  articles: Article[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}
```

### Voice Search
```typescript
// Integrated through Tavily client service
POST /api/voice-search/query
{
  query: string
  searchDepth: 'basic' | 'advanced'
  includeNews: boolean
  maxResults: number
}
```

## 🧪 Development

### Running Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# End-to-end tests
npm run test:e2e
```

### Building for Production
```bash
# Build frontend
npm run build

# Start production backend
cd backend && npm start
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format
```

## 🔮 Technology Stack

### Core Technologies
- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Node.js, Express.js, ES Modules
- **Database**: SQLite with better-sqlite3
- **AI/ML**: Ollama (Qwen2.5:7b), Chatterbox TTS
- **Styling**: Tailwind CSS, Framer Motion
- **Build Tools**: Vite, ESLint, TypeScript Compiler

### Key Libraries
- **UI Components**: Lucide React (icons), React Dropzone
- **Audio Processing**: WaveSurfer.js, Web Audio API
- **Document Processing**: PDF.js, Mammoth (DOCX), Marked (Markdown)
- **Network**: Tavily SDK, Fetch API
- **State Management**: Redux Toolkit, React Context
- **Development**: Nodemon, React Fast Refresh

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use conventional commit messages
- Update documentation for new features
- Ensure cross-platform compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- **Ollama Team** - For providing excellent local LLM infrastructure
- **Chatterbox TTS** - For multilingual voice synthesis capabilities
- **Tavily** - For advanced web search and content retrieval
- **React Team** - For the incredible React 19 framework
- **Tailwind CSS** - For the utility-first CSS framework

## 🔗 Links

- **Documentation**: [Full Documentation](./docs/)
- **API Reference**: [API Docs](./docs/api.md)
- **Contributing Guide**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

**Built with ❤️ by the IntelliCast AI Team**

*Transform any content into engaging podcasts with the power of AI*