import React, { useState, useEffect } from 'react';
import { Search, Mic, Play, Pause, BookOpen, Globe, Volume2, Heart, Share2, Download, Clock, Star, ChevronDown, ChevronUp, List, BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { TavilyClient, type TavilySearchResponse, TavilyError, shouldIncludeNews } from '../../features/voice-search/services/tavily-client';
import AIAnswerTab from '../../features/voice-search/components/AIAnswerTab';
import WebResultsTab from '../../features/voice-search/components/WebResultsTab';
import './VoiceSearchPro.css';

// Remove old interfaces as they're now provided by the Tavily client

interface VoiceSearchProProps {
  query: string;
  onBack: () => void;
}

const VoiceSearchPro: React.FC<VoiceSearchProProps> = ({ query, onBack }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'simple' | 'detailed' | 'web'>('simple');
  const [searchData, setSearchData] = useState<TavilySearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tavilyClient] = useState(() => new TavilyClient());

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      // Use enhanced search with comprehensive AI summaries
      const response = await tavilyClient.search(searchQuery, {
        searchDepth: 'advanced',
        includeNews: shouldIncludeNews(searchQuery),
        maxResults: 8
      });

      setSearchData(response);
    } catch (err) {
      let errorMessage = 'Search failed';

      if (err instanceof TavilyError) {
        switch (err.code) {
          case 'INVALID_API_KEY':
            errorMessage = 'Invalid API key. Using demo data.';
            break;
          case 'RATE_LIMIT_EXCEEDED':
            errorMessage = 'Rate limit exceeded. Please try again later.';
            break;
          case 'TIMEOUT':
            errorMessage = 'Search timeout. Please try again.';
            break;
          case 'NETWORK_ERROR':
            errorMessage = 'Network error. Check your connection.';
            break;
          default:
            errorMessage = err.message;
        }
      } else {
        errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatAnswer = (answer: string) => {
    return answer.replace(/\[(\d+)\]/g, '<sup class="citation">[$1]</sup>');
  };

  const getGradientStyle = () => {
    if (theme === 'professional-dark') {
      return 'bg-gradient-to-br from-gray-900/80 via-slate-800/80 to-gray-900/80';
    }
    return 'bg-gradient-to-br from-white/80 via-gray-50/80 to-white/80';
  };

  const getCardStyle = () => {
    return {
      backgroundColor: theme === 'professional-dark' ? 'rgba(42, 42, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      border: theme === 'professional-dark' ? '1px solid rgba(60, 64, 67, 0.3)' : '1px solid rgba(229, 231, 235, 0.3)',
    };
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: theme === 'professional-dark' ? '#3C4043' : '#F3F4F6',
              color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937'
            }}
          >
            ← Back to Search
          </button>

          <div className="flex items-center space-x-3 mb-4">
            <Search className="w-6 h-6" style={{ color: theme === 'professional-dark' ? '#60A5FA' : '#2563EB' }} />
            <h1 className="text-2xl font-bold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
              "{query}"
            </h1>
          </div>

          {searchData && (
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
                Found {searchData.results.length} results in {searchData.response_time.toFixed(2)}s
              </p>
              {searchData.metadata && (
                <div className="text-xs px-3 py-1 rounded-full" style={{
                  backgroundColor: theme === 'professional-dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                  color: '#8B5CF6'
                }}>
                  {searchData.metadata.query_intent} • AI Enhanced
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation - 3 Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 p-1 rounded-xl" style={getCardStyle()}>
            <button
              onClick={() => setActiveTab('simple')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-200 ${
                activeTab === 'simple' ? 'transform scale-[1.02]' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'simple'
                  ? (theme === 'professional-dark' ? '#2563EB' : '#60A5FA')
                  : 'transparent',
                color: activeTab === 'simple'
                  ? 'white'
                  : (theme === 'professional-dark' ? '#E8EAED' : '#1F2937')
              }}
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">Simple Summary</span>
            </button>

            <button
              onClick={() => setActiveTab('detailed')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-200 ${
                activeTab === 'detailed' ? 'transform scale-[1.02]' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'detailed'
                  ? (theme === 'professional-dark' ? '#2563EB' : '#60A5FA')
                  : 'transparent',
                color: activeTab === 'detailed'
                  ? 'white'
                  : (theme === 'professional-dark' ? '#E8EAED' : '#1F2937')
              }}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="font-medium">Detailed Summary</span>
            </button>

            <button
              onClick={() => setActiveTab('web')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-200 ${
                activeTab === 'web' ? 'transform scale-[1.02]' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'web'
                  ? (theme === 'professional-dark' ? '#2563EB' : '#60A5FA')
                  : 'transparent',
                color: activeTab === 'web'
                  ? 'white'
                  : (theme === 'professional-dark' ? '#E8EAED' : '#1F2937')
              }}
            >
              <Globe className="w-4 h-4" />
              <span className="font-medium">Web Results</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            {(activeTab === 'simple' || activeTab === 'detailed') ? (
              <AIAnswerTab searchData={{} as TavilySearchResponse} isLoading={true} />
            ) : (
              [...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl p-6 animate-pulse" style={getCardStyle()}>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2 mb-3"></div>
                  <div className="h-20 bg-gray-300 rounded"></div>
                </div>
              ))
            )}
          </div>
        ) : error ? (
          <div className="rounded-2xl p-8 text-center" style={getCardStyle()}>
            <p className="text-red-500 mb-4">Error: {error}</p>
            <button
              onClick={() => performSearch(query)}
              className="px-6 py-2 rounded-lg text-white"
              style={{ backgroundColor: '#EF4444' }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div>
            {activeTab === 'simple' && searchData && (
              <AIAnswerTab
                searchData={searchData}
                onFollowUpSearch={(newQuery) => performSearch(newQuery)}
                onSaveEpisode={() => console.log('Save episode functionality')}
                mode="simple"
              />
            )}

            {activeTab === 'detailed' && searchData && (
              <AIAnswerTab
                searchData={searchData}
                onFollowUpSearch={(newQuery) => performSearch(newQuery)}
                onSaveEpisode={() => console.log('Save episode functionality')}
                mode="detailed"
              />
            )}

            {activeTab === 'web' && searchData && (
              <WebResultsTab searchData={searchData} isLoading={loading} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};


export default VoiceSearchPro;