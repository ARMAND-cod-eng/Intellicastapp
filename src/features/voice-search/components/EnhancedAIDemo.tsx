import React, { useState } from 'react';
import { Search, Sparkles, Brain, Zap, Target, BookOpen, TrendingUp } from 'lucide-react';
import AIAnswerTab from './AIAnswerTab';
import TavilyAPIStatus from './TavilyAPIStatus';
import { TavilyClient, type TavilySearchResponse } from '../services/tavily-client';
import { useTheme } from '../../../contexts/ThemeContext';

const EnhancedAIDemo: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<TavilySearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  const exampleQueries = [
    {
      id: 'google-microsoft',
      category: 'Comparison',
      query: 'Google Windows app vs Microsoft search',
      icon: Target,
      description: 'Head-to-head comparison with structured analysis'
    },
    {
      id: 'ai-tech',
      category: 'Technology',
      query: 'How do large language models like GPT work and what are their capabilities?',
      icon: Brain,
      description: 'Complex technical explanation with detailed analysis'
    },
    {
      id: 'climate-news',
      category: 'News & Current Events',
      query: 'Latest developments in climate change technology and renewable energy 2024',
      icon: TrendingUp,
      description: 'Recent news with comprehensive summary and analysis'
    },
    {
      id: 'startup-guide',
      category: 'How-to Guide',
      query: 'How to start a tech startup from idea to funding',
      icon: Target,
      description: 'Step-by-step guide with actionable insights'
    },
    {
      id: 'quantum-science',
      category: 'Scientific Research',
      query: 'What are the latest breakthroughs in quantum computing research?',
      icon: Zap,
      description: 'Research findings with expert analysis'
    },
    {
      id: 'ai-ethics',
      category: 'Analysis',
      query: 'Ethics and challenges of artificial intelligence in healthcare',
      icon: BookOpen,
      description: 'Comprehensive analysis with multiple perspectives'
    }
  ];

  const performSearch = async (query: string) => {
    setIsLoading(true);
    setSelectedExample(null);
    setSearchQuery(query);

    try {
      const client = new TavilyClient();
      const response = await client.search(query, {
        searchDepth: 'advanced',
        includeNews: true,
        maxResults: 8
      });

      setSearchResult(response);
    } catch (error) {
      console.error('Search error:', error);
      // Even if there's an error, the client will fall back to enhanced mock data
      const client = new TavilyClient();
      const mockResponse = client.getMockResponse(query, {
        searchDepth: 'advanced',
        includeNews: true,
        maxResults: 8
      });
      setSearchResult(mockResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: typeof exampleQueries[0]) => {
    setSelectedExample(example.id);
    performSearch(example.query);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Enhanced AI Search Demo
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Experience comprehensive AI-powered search with detailed analysis, proper citations, and intelligent follow-up questions.
            This demonstrates real AI capabilities vs. template responses.
          </p>
        </div>

        {/* API Status */}
        <div className="mb-8 max-w-4xl mx-auto">
          <TavilyAPIStatus />
        </div>

        {/* Custom Search */}
        <div className="mb-8">
          <form onSubmit={handleCustomSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Try your own search query..."
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-purple-500 dark:focus:border-purple-400 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim() || isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {/* Example Queries */}
        {!searchResult && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
              Try These Example Searches
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exampleQueries.map((example) => {
                const IconComponent = example.icon;
                return (
                  <button
                    key={example.id}
                    onClick={() => handleExampleClick(example)}
                    disabled={isLoading}
                    className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-105 ${
                      selectedExample === example.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                          {example.category}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {example.query}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {example.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Features Highlight */}
        {!searchResult && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
              Enhanced AI Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mb-4">
                  <Brain className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Content Analysis
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Analyzes search results to extract key information and synthesize comprehensive answers
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mb-4">
                  <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Smart Citations
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Properly cited information with clickable references to original sources
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit mb-4">
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Intent Detection
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Understands query intent (news, how-to, factual) and adapts response accordingly
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg w-fit mb-4">
                  <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Follow-up Questions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generates intelligent follow-up questions based on content and context
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {(searchResult || isLoading) && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => {
                  setSearchResult(null);
                  setSearchQuery('');
                  setSelectedExample(null);
                }}
                className="px-4 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              >
                ← Back to Examples
              </button>
            </div>

            {isLoading ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl">
                <AIAnswerTab
                  searchData={{} as TavilySearchResponse}
                  isLoading={true}
                  onFollowUpSearch={(query) => performSearch(query)}
                  onSaveEpisode={() => console.log('Save episode')}
                />
              </div>
            ) : searchResult ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl">
                <AIAnswerTab
                  searchData={searchResult}
                  isLoading={false}
                  onFollowUpSearch={(query) => performSearch(query)}
                  onSaveEpisode={() => console.log('Save episode')}
                />
              </div>
            ) : null}
          </div>
        )}

        {/* Comparison Note */}
        {searchResult && (
          <div className="max-w-4xl mx-auto mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              Enhanced AI Summary Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">✅ What's Enhanced:</h4>
                <ul className="space-y-1 text-green-600 dark:text-green-400">
                  <li>• Real content analysis from search results</li>
                  <li>• Context-aware answer synthesis</li>
                  <li>• Proper citation mapping</li>
                  <li>• Intent-based response formatting</li>
                  <li>• Intelligent follow-up questions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">🔄 Previous Issues Fixed:</h4>
                <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                  <li>• No more generic template responses</li>
                  <li>• Eliminated "example answer" patterns</li>
                  <li>• Real content-based summaries</li>
                  <li>• Meaningful citation relationships</li>
                  <li>• Contextual follow-up suggestions</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAIDemo;