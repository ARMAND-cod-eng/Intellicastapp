import React, { useState } from 'react';
import AIAnswerTab from './AIAnswerTab';
import type { TavilySearchResponse } from '../services/tavily-client';

const AIAnswerTabDemo: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState<'factual' | 'news' | 'howto' | 'loading'>('factual');

  // Mock data for different scenarios
  const mockData: Record<string, TavilySearchResponse> = {
    factual: {
      answer: "Quantum computing is a revolutionary computing paradigm that leverages quantum mechanical phenomena to process information. [1] Unlike classical computers that use bits (0 or 1), quantum computers use quantum bits or 'qubits' that can exist in multiple states simultaneously through superposition. [2] • This enables quantum computers to perform certain calculations exponentially faster than classical computers. [3] • Key applications include cryptography, drug discovery, financial modeling, and artificial intelligence optimization. [4] The technology is still in early stages but shows immense promise for solving complex problems that are intractable for classical computers.",
      query: "What is quantum computing and how does it work?",
      response_time: 1.2,
      images: [
        "https://picsum.photos/300/300?random=1",
        "https://picsum.photos/300/300?random=2",
        "https://picsum.photos/300/300?random=3",
        "https://picsum.photos/300/300?random=4"
      ],
      follow_up_questions: [
        "What are the main advantages of quantum computing?",
        "Which companies are leading quantum computing research?",
        "When will quantum computers be commercially available?",
        "How does quantum supremacy differ from quantum advantage?"
      ],
      results: [
        {
          title: "Introduction to Quantum Computing - Nature",
          url: "https://nature.com/articles/quantum-computing-intro",
          content: "Comprehensive overview of quantum computing principles, including superposition, entanglement, and quantum algorithms. Explores the fundamental differences between classical and quantum information processing.",
          raw_content: "Full detailed content about quantum computing fundamentals...",
          published_date: "2024-01-15T00:00:00Z",
          score: 0.95,
          snippet: "Quantum computing harnesses quantum mechanical phenomena...",
          domain: "nature.com"
        },
        {
          title: "Quantum Bits and Superposition Explained - Science Magazine",
          url: "https://science.org/quantum-bits-superposition",
          content: "Deep dive into qubits, the fundamental units of quantum information. Explains how superposition enables quantum parallelism and computational advantages.",
          published_date: "2024-02-01T00:00:00Z",
          score: 0.92,
          domain: "science.org"
        },
        {
          title: "Quantum Computing Applications in Industry - IBM Research",
          url: "https://ibm.com/research/quantum-applications",
          content: "Practical applications of quantum computing across various industries including finance, healthcare, logistics, and cybersecurity.",
          published_date: "2024-01-28T00:00:00Z",
          score: 0.89,
          domain: "ibm.com"
        },
        {
          title: "The Future of Quantum Computing - MIT Technology Review",
          url: "https://technologyreview.mit.edu/quantum-future",
          content: "Analysis of quantum computing's potential impact and timeline for practical quantum advantage in real-world applications.",
          published_date: "2024-02-10T00:00:00Z",
          score: 0.87,
          domain: "technologyreview.mit.edu"
        }
      ],
      search_parameters: {
        search_depth: 'advanced' as const,
        include_answer: true,
        include_images: true,
        include_news: false,
        max_results: 8
      },
      metadata: {
        total_results: 4,
        query_intent: 'factual' as const,
        processing_time_ms: 1200,
        api_version: '1.0.0'
      }
    },

    news: {
      answer: "Recent developments in artificial intelligence have accelerated dramatically in 2024. [1] Major breakthroughs include the release of GPT-5 by OpenAI, showing significant improvements in reasoning and multimodal capabilities. [2] • Google's Gemini Ultra has achieved new benchmarks in mathematical problem-solving and scientific research assistance. [3] • Meanwhile, regulatory frameworks are rapidly evolving, with the EU AI Act coming into effect and the US considering federal AI oversight. [4] These developments signal a pivotal year for AI adoption across industries, from healthcare to autonomous vehicles.",
      query: "Latest AI developments 2024",
      response_time: 0.8,
      images: [
        "https://picsum.photos/300/300?random=5",
        "https://picsum.photos/300/300?random=6",
        "https://picsum.photos/300/300?random=7",
        "https://picsum.photos/300/300?random=8"
      ],
      follow_up_questions: [
        "What are the key features of GPT-5?",
        "How will the EU AI Act impact tech companies?",
        "Which AI startups received major funding in 2024?",
        "What are the latest AI safety developments?"
      ],
      results: [
        {
          title: "OpenAI Releases GPT-5 with Revolutionary Capabilities - TechCrunch",
          url: "https://techcrunch.com/openai-gpt5-release",
          content: "OpenAI's latest language model GPT-5 demonstrates unprecedented reasoning abilities and multimodal integration, setting new standards for AI performance.",
          published_date: "2024-02-15T00:00:00Z",
          score: 0.97,
          domain: "techcrunch.com"
        },
        {
          title: "Google's Gemini Ultra Achieves New AI Benchmarks - Wired",
          url: "https://wired.com/google-gemini-ultra-benchmarks",
          content: "Google's most advanced AI model surpasses previous benchmarks in mathematical reasoning and scientific problem-solving capabilities.",
          published_date: "2024-02-12T00:00:00Z",
          score: 0.94,
          domain: "wired.com"
        }
      ],
      search_parameters: {
        search_depth: 'advanced' as const,
        include_answer: true,
        include_images: true,
        include_news: true,
        max_results: 8
      },
      metadata: {
        total_results: 2,
        query_intent: 'news' as const,
        processing_time_ms: 800,
        api_version: '1.0.0'
      }
    },

    howto: {
      answer: "Creating a successful podcast involves several key steps and considerations. [1] First, define your niche and target audience to ensure focused content creation. [2] • Next, invest in quality recording equipment including a good microphone, headphones, and recording software like Audacity or Adobe Audition. [3] • Plan your content structure with consistent segments, intro/outro music, and engaging topics that provide value to your listeners. [4] • Choose a reliable hosting platform such as Anchor, Spotify for Podcasters, or Libsyn to distribute your podcast across multiple platforms. [5] Finally, develop a consistent publishing schedule and promote your podcast through social media, SEO optimization, and guest appearances.",
      query: "How to start a successful podcast",
      response_time: 1.5,
      images: [
        "https://picsum.photos/300/300?random=9",
        "https://picsum.photos/300/300?random=10",
        "https://picsum.photos/300/300?random=11",
        "https://picsum.photos/300/300?random=12"
      ],
      follow_up_questions: [
        "What equipment do I need for podcast recording?",
        "How much does it cost to start a podcast?",
        "Best podcast hosting platforms comparison",
        "How to grow podcast audience quickly?"
      ],
      results: [
        {
          title: "Complete Podcast Setup Guide - Podcast Movement",
          url: "https://podcastmovement.com/setup-guide",
          content: "Comprehensive guide covering everything from equipment selection to content planning and audience growth strategies for new podcasters.",
          published_date: "2024-01-20T00:00:00Z",
          score: 0.96,
          domain: "podcastmovement.com"
        },
        {
          title: "Best Podcast Equipment for Beginners - Audio Technica",
          url: "https://audio-technica.com/podcast-equipment-guide",
          content: "Expert recommendations for microphones, headphones, and recording interfaces specifically designed for podcast creation.",
          published_date: "2024-01-25T00:00:00Z",
          score: 0.93,
          domain: "audio-technica.com"
        }
      ],
      search_parameters: {
        search_depth: 'advanced' as const,
        include_answer: true,
        include_images: true,
        include_news: false,
        max_results: 8
      },
      metadata: {
        total_results: 2,
        query_intent: 'howto' as const,
        processing_time_ms: 1500,
        api_version: '1.0.0'
      }
    }
  };

  const handleFollowUpSearch = (query: string) => {
    console.log('Follow-up search:', query);
    // In a real app, this would trigger a new search
  };

  const handleSaveEpisode = () => {
    console.log('Saving episode for query:', mockData[currentDemo].query);
    // In a real app, this would save the answer as an episode
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Demo Controls */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            AIAnswerTab Component Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Experience the beautiful, Perplexity-inspired AI Answer component with advanced features
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setCurrentDemo('factual')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentDemo === 'factual'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700'
              }`}
            >
              Factual Query
            </button>
            <button
              onClick={() => setCurrentDemo('news')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentDemo === 'news'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700'
              }`}
            >
              News Query
            </button>
            <button
              onClick={() => setCurrentDemo('howto')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentDemo === 'howto'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700'
              }`}
            >
              How-to Query
            </button>
            <button
              onClick={() => setCurrentDemo('loading')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentDemo === 'loading'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700'
              }`}
            >
              Loading State
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎨 Beautiful Design</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Gradient backgrounds, glassmorphism effects, and smooth animations
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎵 Podcast Ready</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Audio player UI, duration estimates, and episode saving functionality
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔗 Interactive</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Clickable citations, follow-up questions, and share functionality
              </p>
            </div>
          </div>
        </div>

        {/* Component Demo */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl">
          {currentDemo === 'loading' ? (
            <AIAnswerTab
              searchData={{} as TavilySearchResponse}
              isLoading={true}
              onFollowUpSearch={handleFollowUpSearch}
              onSaveEpisode={handleSaveEpisode}
            />
          ) : (
            <AIAnswerTab
              searchData={mockData[currentDemo]}
              isLoading={false}
              onFollowUpSearch={handleFollowUpSearch}
              onSaveEpisode={handleSaveEpisode}
            />
          )}
        </div>

        {/* Demo Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Demo Features
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Interactive citations that scroll to sources</li>
            <li>• Beautiful podcast-style audio player (visual only)</li>
            <li>• Confidence scoring and read/listen time estimates</li>
            <li>• Follow-up questions with smooth animations</li>
            <li>• Share functionality and copy-to-clipboard</li>
            <li>• Responsive design with glassmorphism effects</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AIAnswerTabDemo;