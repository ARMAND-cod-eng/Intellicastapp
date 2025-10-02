/**
 * Centralized API Configuration
 * All backend endpoints in one place for easy management
 */

// Environment-based configuration
const ENV = import.meta.env.MODE || 'development';

// Backend Ports Configuration
export const PORTS = {
  FRONTEND: 5175,
  NODE_BACKEND: 3004,  // Node.js backend for narration and document processing
  PYTHON_BACKEND: 8000, // Python backend for podcast generation (NotebookLM API)
  OLLAMA: 11434,        // Ollama local LLM
};

// Base URLs
export const API_URLS = {
  // Node.js Backend (Narration, Document Processing, AI Services)
  NODE_BASE: `http://localhost:${PORTS.NODE_BACKEND}`,
  NODE_API: `http://localhost:${PORTS.NODE_BACKEND}/api`,

  // Python Backend (Podcast Generation - NotebookLM Style)
  PYTHON_BASE: `http://localhost:${PORTS.PYTHON_BACKEND}`,
  PYTHON_API: `http://localhost:${PORTS.PYTHON_BACKEND}/api`,

  // Ollama (Local LLM)
  OLLAMA: `http://localhost:${PORTS.OLLAMA}`,
};

// API Endpoints Configuration
export const ENDPOINTS = {
  // Node.js Backend Endpoints
  NARRATION: {
    BASE: `${API_URLS.NODE_API}/narration`,
    PROCESS_DOCUMENT: `${API_URLS.NODE_API}/narration/process-document`,
    GENERATE: `${API_URLS.NODE_API}/narration/generate`,
    ASK_QUESTION: `${API_URLS.NODE_API}/narration/ask-question`,
    HEALTH: `${API_URLS.NODE_API}/narration/health`,
  },

  SEARCH: {
    GENERATE_AUDIO: `${API_URLS.NODE_API}/search/generate-audio`,
  },

  NEWS: {
    CATEGORIES: `${API_URLS.NODE_API}/news/categories`,
    ARTICLES: `${API_URLS.NODE_API}/news/articles`,
  },

  // Python Backend Endpoints (Podcast API)
  PODCAST: {
    ESTIMATE_COST: `${API_URLS.PYTHON_API}/podcast/estimate-cost`,
    GENERATE: `${API_URLS.PYTHON_API}/podcast/generate`,
    STATUS: `${API_URLS.PYTHON_API}/podcast/status`,
    DOWNLOAD: `${API_URLS.PYTHON_API}/podcast/download`,
    VOICES: `${API_URLS.PYTHON_API}/podcast/voices`,
    RECOMMEND_STYLE: `${API_URLS.PYTHON_API}/podcast/recommend-style`,
    ANALYZE_CONTENT: `${API_URLS.PYTHON_API}/podcast/analyze-content`,
  },

  // Health Check Endpoints
  HEALTH: {
    NODE: `${API_URLS.NODE_BASE}/health`,
    PYTHON: `${API_URLS.PYTHON_BASE}/health`,
  },
};

/**
 * Helper function to build audio URL
 */
export function getAudioUrl(path: string, backend: 'node' | 'python' = 'node'): string {
  const base = backend === 'node' ? API_URLS.NODE_BASE : API_URLS.PYTHON_BASE;
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Helper function to get download URL for podcast
 */
export function getPodcastDownloadUrl(filename: string): string {
  return `${ENDPOINTS.PODCAST.DOWNLOAD}/${filename}`;
}

/**
 * Helper function to get podcast status URL
 */
export function getPodcastStatusUrl(jobId: string): string {
  return `${ENDPOINTS.PODCAST.STATUS}/${jobId}`;
}

/**
 * Server Status Helper
 */
export const SERVER_INFO = {
  NODE_BACKEND: {
    name: 'Node.js Backend',
    port: PORTS.NODE_BACKEND,
    url: API_URLS.NODE_BASE,
    healthEndpoint: ENDPOINTS.HEALTH.NODE,
    services: ['Document Processing', 'Narration', 'AI Services', 'Search'],
  },
  PYTHON_BACKEND: {
    name: 'Python Podcast API',
    port: PORTS.PYTHON_BACKEND,
    url: API_URLS.PYTHON_BASE,
    healthEndpoint: ENDPOINTS.HEALTH.PYTHON,
    services: ['Podcast Generation', 'Multi-Voice Conversations', 'NotebookLM Style'],
  },
};

export default {
  PORTS,
  API_URLS,
  ENDPOINTS,
  getAudioUrl,
  getPodcastDownloadUrl,
  getPodcastStatusUrl,
  SERVER_INFO,
};
