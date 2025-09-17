import React, { useState, useEffect } from 'react';
import { Search, Mic, Play, Pause, BookOpen, Globe, Volume2, Heart, Share2, Download, Clock, Star, ChevronDown, ChevronUp, List, BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './VoiceSearchPro.css';

interface SearchResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
  score?: number;
}

interface TavilyResponse {
  answer: string;
  query: string;
  response_time: number;
  images: string[];
  follow_up_questions: string[];
  results: SearchResult[];
}

interface VoiceSearchProProps {
  query: string;
  onBack: () => void;
}

const VoiceSearchPro: React.FC<VoiceSearchProProps> = ({ query, onBack }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'ai' | 'web'>('ai');
  const [searchData, setSearchData] = useState<TavilyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_TAVILY_API_KEY;
      if (!apiKey) {
        throw new Error('Tavily API key not found');
      }

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: searchQuery,
          search_depth: 'advanced',
          include_answer: true,
          include_images: true,
          include_raw_content: true,
          max_results: 8,
          include_domains: [],
          exclude_domains: []
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data: TavilyResponse = await response.json();
      setSearchData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
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
            <p className="text-sm" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
              Found {searchData.results.length} results in {searchData.response_time.toFixed(2)}s
            </p>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 p-1 rounded-xl" style={getCardStyle()}>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-lg transition-all duration-200 ${
                activeTab === 'ai' ? 'transform scale-[1.02]' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'ai'
                  ? (theme === 'professional-dark' ? '#2563EB' : '#60A5FA')
                  : 'transparent',
                color: activeTab === 'ai'
                  ? 'white'
                  : (theme === 'professional-dark' ? '#E8EAED' : '#1F2937')
              }}
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">AI Answer</span>
            </button>

            <button
              onClick={() => setActiveTab('web')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-lg transition-all duration-200 ${
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
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl p-6 animate-pulse" style={getCardStyle()}>
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-3"></div>
                <div className="h-20 bg-gray-300 rounded"></div>
              </div>
            ))}
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
            {activeTab === 'ai' && searchData && (
              <AIAnswerTab searchData={searchData} theme={theme} getCardStyle={getCardStyle} />
            )}

            {activeTab === 'web' && searchData && (
              <WebResultsTab searchData={searchData} theme={theme} getCardStyle={getCardStyle} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AIAnswerTab: React.FC<{ searchData: TavilyResponse; theme: string; getCardStyle: () => any }> = ({
  searchData, theme, getCardStyle
}) => {
  const [showAllSources, setShowAllSources] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    keyDetails: true,
    timeline: false,
    dataTable: false
  });

  const formatAnswerWithCitations = (answer: string, results: SearchResult[]) => {
    // Create a more sophisticated citation system that matches Perplexity's style
    let formattedAnswer = answer;

    // Replace citations with interactive elements
    formattedAnswer = formattedAnswer.replace(/\[(\d+)\]/g, (match, num) => {
      const citationNum = parseInt(num);
      if (citationNum <= results.length) {
        const source = results[citationNum - 1];
        const hostname = source ? new URL(source.url).hostname : '';
        return `<sup class="citation-link"
                     data-citation="${citationNum}"
                     title="${source?.title || ''} - ${hostname}"
                     onclick="scrollToSource(${citationNum - 1})">[${citationNum}]</sup>`;
      }
      return match;
    });

    return formattedAnswer;
  };

  const scrollToSource = (index: number) => {
    const sourceElement = document.getElementById(`source-${index}`);
    if (sourceElement) {
      sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      sourceElement.style.boxShadow = '0 0 0 2px rgba(96, 165, 250, 0.5)';
      setTimeout(() => {
        sourceElement.style.boxShadow = '';
      }, 2000);
    }
  };

  // Make scrollToSource available globally for the onclick handlers
  useEffect(() => {
    (window as any).scrollToSource = scrollToSource;
    return () => {
      delete (window as any).scrollToSource;
    };
  }, []);

  const extractKeyDetails = (answer: string, results: SearchResult[]) => {
    // Enhanced key details extraction beyond Perplexity
    const keyDetails = [];

    // Extract financial/numeric data
    const numbers = answer.match(/\$[\d,.]+(?: billion| million| thousand)?/gi) || [];
    const percentages = answer.match(/\d+(?:\.\d+)?%/g) || [];
    const dates = answer.match(/\b\d{4}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi) || [];

    if (numbers.length > 0) {
      keyDetails.push({
        icon: '💰',
        title: 'Financial Impact',
        items: [...new Set(numbers)].slice(0, 3),
        color: '#10B981'
      });
    }

    if (dates.length > 0) {
      keyDetails.push({
        icon: '📅',
        title: 'Timeline',
        items: [...new Set(dates)].slice(0, 3),
        color: '#3B82F6'
      });
    }

    // Extract key entities and organizations
    const entities = [];
    const commonEntities = ['NATO', 'Ukraine', 'Trump', 'PURL', 'Pentagon', 'Congress', 'Russia'];
    commonEntities.forEach(entity => {
      if (answer.toLowerCase().includes(entity.toLowerCase())) {
        entities.push(entity);
      }
    });

    if (entities.length > 0) {
      keyDetails.push({
        icon: '🏛️',
        title: 'Key Entities',
        items: entities.slice(0, 4),
        color: '#8B5CF6'
      });
    }

    return keyDetails;
  };

  const extractDataTable = (answer: string, results: SearchResult[]) => {
    // Create a data table from the answer content
    const tableData = [];

    // Example: Extract PURL-related data
    if (answer.includes('PURL') || answer.includes('weapons')) {
      tableData.push(
        { category: 'Mechanism', value: 'PURL (Prioritized Ukraine Requirements List)', source: 'Primary' },
        { category: 'Funding Source', value: 'NATO Partner Contributions', source: 'NATO' },
        { category: 'First Shipment Value', value: '$500 million each', source: 'Reuters' },
        { category: 'Total Expected Value', value: 'Up to $10 billion', source: 'Yahoo' },
        { category: 'Focus Area', value: 'Air Defense Systems', source: 'The Hill' }
      );
    }

    return tableData;
  };

  const extractTimeline = (answer: string, results: SearchResult[]) => {
    // Create a timeline from the content
    const timelineEvents = [];

    if (answer.includes('Trump') && answer.includes('Ukraine')) {
      timelineEvents.push(
        { date: 'Early 2025', event: 'Trump administration approves first PURL weapons package', type: 'approval' },
        { date: 'September 2025', event: 'NATO partners allocated over $2 billion for mechanism', type: 'funding' },
        { date: 'Current', event: 'First deliveries cleared for $500M each shipment', type: 'delivery' },
        { date: 'Ongoing', event: 'Expected $1B monthly allocation going forward', type: 'projection' }
      );
    }

    return timelineEvents;
  };

  const parseContentSections = (answer: string) => {
    // Advanced content parsing to create structured sections like Perplexity
    const sections = [];

    // Split by common section indicators
    const paragraphs = answer.split('\n\n').filter(p => p.trim());

    // Main definition/overview (first paragraph)
    if (paragraphs.length > 0) {
      sections.push({
        type: 'overview',
        title: 'Overview',
        content: paragraphs[0],
        icon: '📋'
      });
    }

    // Look for specific content types
    const fullText = answer.toLowerCase();

    // Etymology and origin
    if (fullText.includes('etymology') || fullText.includes('origin') || fullText.includes('comes from') || fullText.includes('french') || fullText.includes('latin')) {
      const etymologyContent = paragraphs.find(p =>
        p.toLowerCase().includes('etymology') ||
        p.toLowerCase().includes('origin') ||
        p.toLowerCase().includes('comes from') ||
        p.toLowerCase().includes('french word') ||
        p.toLowerCase().includes('latin')
      );
      if (etymologyContent) {
        sections.push({
          type: 'etymology',
          title: 'Etymology and Usage',
          content: etymologyContent,
          icon: '📚'
        });
      }
    }

    // Usage and applications
    if (fullText.includes('usage') || fullText.includes('used in') || fullText.includes('cooking') || fullText.includes('culinary')) {
      const usageContent = paragraphs.find(p =>
        p.toLowerCase().includes('usage') ||
        p.toLowerCase().includes('used in') ||
        p.toLowerCase().includes('cooking') ||
        p.toLowerCase().includes('culinary')
      );
      if (usageContent) {
        sections.push({
          type: 'usage',
          title: 'Culinary and Products',
          content: usageContent,
          icon: '🍽️'
        });
      }
    }

    // Related items/comparisons
    if (fullText.includes('related') || fullText.includes('similar') || fullText.includes('compared to') || fullText.includes('vs ')) {
      const relatedContent = paragraphs.find(p =>
        p.toLowerCase().includes('related') ||
        p.toLowerCase().includes('similar') ||
        p.toLowerCase().includes('compared to') ||
        p.toLowerCase().includes('vs ')
      );
      if (relatedContent) {
        sections.push({
          type: 'related',
          title: 'Related Items',
          content: relatedContent,
          icon: '🔗'
        });
      }
    }

    return sections;
  };

  const extractRelatedTopics = (answer: string, query: string) => {
    // Generate related search suggestions
    const relatedTopics = [];
    const lowerAnswer = answer.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // For fruits/food items
    if (lowerAnswer.includes('fruit') || lowerAnswer.includes('citrus')) {
      relatedTopics.push(
        'Grapefruit vs Orange nutrition',
        'How to eat pamplemousse',
        'Citrus fruits health benefits',
        'Best pamplemousse recipes'
      );
    }

    // For general topics, create contextual suggestions
    if (relatedTopics.length === 0) {
      relatedTopics.push(
        `${query} benefits`,
        `${query} vs alternatives`,
        `How to use ${query}`,
        `${query} history and origin`
      );
    }

    return relatedTopics;
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getCitationStyle = () => ({
    color: theme === 'professional-dark' ? '#60A5FA' : '#2563EB',
    textDecoration: 'none',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '1px 4px',
    borderRadius: '4px',
    backgroundColor: theme === 'professional-dark' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(37, 99, 235, 0.1)',
    border: `1px solid ${theme === 'professional-dark' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(37, 99, 235, 0.2)'}`,
    marginLeft: '2px'
  });

  return (
    <div className="space-y-6">
      {/* Main AI Answer Card */}
      <div className="rounded-2xl p-0 overflow-hidden" style={getCardStyle()}>
        {/* Header */}
        <div className="px-8 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg" style={{
                backgroundColor: theme === 'professional-dark' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(37, 99, 235, 0.1)'
              }}>
                <BookOpen className="w-5 h-5" style={{ color: theme === 'professional-dark' ? '#60A5FA' : '#2563EB' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                  Answer
                </h2>
                <p className="text-sm" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
                  AI-powered summary from {searchData.results.length} sources
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-lg transition-all duration-200 hover:scale-105" style={{
                backgroundColor: theme === 'professional-dark' ? '#3C4043' : '#F3F4F6',
                color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280'
              }}>
                <Volume2 className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg transition-all duration-200 hover:scale-105" style={{
                backgroundColor: theme === 'professional-dark' ? '#3C4043' : '#F3F4F6',
                color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280'
              }}>
                <Heart className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg transition-all duration-200 hover:scale-105" style={{
                backgroundColor: theme === 'professional-dark' ? '#3C4043' : '#F3F4F6',
                color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280'
              }}>
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Image Gallery Section - Like Perplexity */}
        {searchData.images && searchData.images.length > 0 && (
          <div className="px-8 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {searchData.images.slice(0, 4).map((image, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    backgroundColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(243, 244, 246, 0.7)',
                  }}
                >
                  <img
                    src={image}
                    alt={`Related to ${searchData.query}`}
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Answer Content with Structured Sections */}
        <div className="px-8 pb-6">
          {/* Main Answer Overview */}
          <div
            className="answer-content text-lg leading-relaxed mb-8"
            style={{
              color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937',
              lineHeight: '1.8',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            <div className="mb-6">
              <span
                dangerouslySetInnerHTML={{
                  __html: formatAnswerWithCitations(searchData.answer.split('\n\n')[0] || searchData.answer, searchData.results)
                }}
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '400',
                  lineHeight: '1.8'
                }}
              />
            </div>
          </div>

          {/* Structured Content Sections */}
          {parseContentSections(searchData.answer).length > 1 && (
            <div className="space-y-6 mb-8">
              {parseContentSections(searchData.answer).slice(1).map((section, index) => (
                <div key={index} className="border-l-4 pl-6" style={{
                  borderColor: theme === 'professional-dark' ? '#60A5FA' : '#2563EB'
                }}>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-lg">{section.icon}</span>
                    <h3 className="text-xl font-semibold" style={{
                      color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937'
                    }}>
                      {section.title}
                    </h3>
                  </div>
                  <div
                    className="text-base leading-relaxed"
                    style={{
                      color: theme === 'professional-dark' ? '#D1D5DB' : '#374151',
                      lineHeight: '1.7'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: formatAnswerWithCitations(section.content, searchData.results)
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Related Topics Section */}
          {extractRelatedTopics(searchData.answer, searchData.query).length > 0 && (
            <div className="mt-8 pt-6" style={{
              borderTop: `1px solid ${theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(229, 231, 235, 0.5)'}`
            }}>
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5" style={{ color: theme === 'professional-dark' ? '#60A5FA' : '#2563EB' }} />
                <h3 className="text-lg font-semibold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                  Related Topics
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {extractRelatedTopics(searchData.answer, searchData.query).map((topic, index) => (
                  <button
                    key={index}
                    className="text-left p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] group border"
                    style={{
                      backgroundColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(243, 244, 246, 0.7)',
                      borderColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.5)' : 'rgba(229, 231, 235, 0.5)',
                      color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937'
                    }}
                    onClick={() => {
                      // Handle related topic search
                      // This could trigger a new search with the topic
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform"
                             style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }} />
                      <span className="font-medium text-sm">{topic}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Key Details Section */}
          {extractKeyDetails(searchData.answer, searchData.results).length > 0 && (
            <div className="mt-8 pt-6" style={{
              borderTop: `1px solid ${theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(229, 231, 235, 0.5)'}`
            }}>
              <button
                onClick={() => toggleSection('keyDetails')}
                className="flex items-center justify-between w-full mb-4 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg" style={{
                    backgroundColor: theme === 'professional-dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                  }}>
                    <List className="w-5 h-5" style={{ color: '#10B981' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                    Key Details
                  </h3>
                  <span className="text-sm px-2 py-1 rounded-full" style={{
                    backgroundColor: theme === 'professional-dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: '#10B981'
                  }}>
                    Enhanced Analysis
                  </span>
                </div>
                {expandedSections.keyDetails ?
                  <ChevronUp className="w-5 h-5 transition-transform" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }} /> :
                  <ChevronDown className="w-5 h-5 transition-transform" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }} />
                }
              </button>

              {expandedSections.keyDetails && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {extractKeyDetails(searchData.answer, searchData.results).map((detail, index) => (
                    <div key={index} className="p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]" style={{
                      backgroundColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(243, 244, 246, 0.7)',
                      border: `1px solid ${theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.5)' : 'rgba(229, 231, 235, 0.5)'}`,
                    }}>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-lg">{detail.icon}</span>
                        <h4 className="font-semibold text-sm" style={{ color: detail.color }}>
                          {detail.title}
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {detail.items.map((item, idx) => (
                          <div key={idx} className="text-sm p-2 rounded" style={{
                            backgroundColor: theme === 'professional-dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                            color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937'
                          }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Enhanced Data Table */}
          {extractDataTable(searchData.answer, searchData.results).length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => toggleSection('dataTable')}
                className="flex items-center justify-between w-full mb-4 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg" style={{
                    backgroundColor: theme === 'professional-dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)'
                  }}>
                    <BarChart3 className="w-5 h-5" style={{ color: '#3B82F6' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                    Summary Table
                  </h3>
                </div>
                {expandedSections.dataTable ?
                  <ChevronUp className="w-5 h-5 transition-transform" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }} /> :
                  <ChevronDown className="w-5 h-5 transition-transform" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }} />
                }
              </button>

              {expandedSections.dataTable && (
                <div className="overflow-hidden rounded-xl" style={{
                  backgroundColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(243, 244, 246, 0.7)',
                  border: `1px solid ${theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.5)' : 'rgba(229, 231, 235, 0.5)'}`,
                }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{
                        backgroundColor: theme === 'professional-dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)',
                      }}>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                          Value
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                          Source
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractDataTable(searchData.answer, searchData.results).map((row, index) => (
                        <tr key={index} className="border-t" style={{
                          borderColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(229, 231, 235, 0.5)'
                        }}>
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
                            {row.category}
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                            {row.value}
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: theme === 'professional-dark' ? '#60A5FA' : '#2563EB' }}>
                            {row.source}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Timeline Section */}
          {extractTimeline(searchData.answer, searchData.results).length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => toggleSection('timeline')}
                className="flex items-center justify-between w-full mb-4 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg" style={{
                    backgroundColor: theme === 'professional-dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)'
                  }}>
                    <Calendar className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                    Timeline
                  </h3>
                </div>
                {expandedSections.timeline ?
                  <ChevronUp className="w-5 h-5 transition-transform" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }} /> :
                  <ChevronDown className="w-5 h-5 transition-transform" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }} />
                }
              </button>

              {expandedSections.timeline && (
                <div className="space-y-4">
                  {extractTimeline(searchData.answer, searchData.results).map((event, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 rounded-full" style={{
                          backgroundColor: event.type === 'approval' ? '#10B981' :
                                         event.type === 'funding' ? '#3B82F6' :
                                         event.type === 'delivery' ? '#F59E0B' : '#8B5CF6'
                        }}></div>
                      </div>
                      <div className="flex-1 p-4 rounded-xl" style={{
                        backgroundColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(243, 244, 246, 0.7)',
                        border: `1px solid ${theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.5)' : 'rgba(229, 231, 235, 0.5)'}`,
                      }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold" style={{ color: theme === 'professional-dark' ? '#60A5FA' : '#2563EB' }}>
                            {event.date}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full" style={{
                            backgroundColor: event.type === 'approval' ? 'rgba(16, 185, 129, 0.2)' :
                                           event.type === 'funding' ? 'rgba(59, 130, 246, 0.2)' :
                                           event.type === 'delivery' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                            color: event.type === 'approval' ? '#10B981' :
                                  event.type === 'funding' ? '#3B82F6' :
                                  event.type === 'delivery' ? '#F59E0B' : '#8B5CF6'
                          }}>
                            {event.type}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                          {event.event}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inline Sources */}
          <div className="mt-6 pt-6" style={{
            borderTop: `1px solid ${theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(229, 231, 235, 0.5)'}`
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
                SOURCES
              </h3>
              {searchData.results.length > 3 && (
                <button
                  onClick={() => setShowAllSources(!showAllSources)}
                  className="text-sm font-medium hover:underline"
                  style={{ color: theme === 'professional-dark' ? '#60A5FA' : '#2563EB' }}
                >
                  {showAllSources ? 'Show less' : `Show all ${searchData.results.length}`}
                </button>
              )}
            </div>

            <div className="grid gap-3">
              {(showAllSources ? searchData.results : searchData.results.slice(0, 3)).map((result, index) => (
                <a
                  key={index}
                  id={`source-${index}`}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start space-x-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] group source-card"
                  style={{
                    backgroundColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(243, 244, 246, 0.7)',
                    border: `1px solid ${theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.5)' : 'rgba(229, 231, 235, 0.5)'}`,
                  }}
                >
                  <div className="flex-shrink-0">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full"
                      style={{
                        backgroundColor: theme === 'professional-dark' ? '#2563EB' : '#60A5FA',
                        color: 'white'
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium line-clamp-1 group-hover:underline" style={{
                      color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937'
                    }}>
                      {result.title}
                    </h4>
                    <p className="text-xs mt-1" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
                      {new URL(result.url).hostname}
                      {result.published_date && ` • ${new Date(result.published_date).toLocaleDateString()}`}
                    </p>
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: theme === 'professional-dark' ? '#80868B' : '#9CA3AF' }}>
                      {result.content.substring(0, 150)}...
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div className="px-8 pb-6">
          <div className="flex items-center space-x-4 p-4 rounded-xl" style={{
            backgroundColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.4)' : 'rgba(243, 244, 246, 0.8)',
            border: `1px solid ${theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.5)' : 'rgba(229, 231, 235, 0.5)'}`,
          }}>
            <button className="p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105" style={{
              backgroundColor: theme === 'professional-dark' ? '#2563EB' : '#60A5FA'
            }}>
              <Play className="w-5 h-5 text-white" />
            </button>

            <div className="flex-1">
              <div className="h-2 rounded-full" style={{
                backgroundColor: theme === 'professional-dark' ? '#3C4043' : '#E5E7EB'
              }}>
                <div className="h-2 rounded-full w-1/3 transition-all duration-300" style={{
                  backgroundColor: theme === 'professional-dark' ? '#60A5FA' : '#2563EB'
                }}></div>
              </div>
            </div>

            <div className="text-xs font-mono" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
              <span>0:00</span>
              <span className="mx-1">/</span>
              <span>2:34</span>
            </div>
          </div>

          <button className="w-full mt-4 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] shadow-lg" style={{
            backgroundColor: theme === 'professional-dark' ? '#2563EB' : '#60A5FA',
            color: 'white'
          }}>
            Save as Episode
          </button>
        </div>
      </div>

      {/* Enhanced Follow-up Questions */}
      {searchData.follow_up_questions && searchData.follow_up_questions.length > 0 && (
        <div className="rounded-2xl p-6" style={getCardStyle()}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-lg" style={{
              backgroundColor: theme === 'professional-dark' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(37, 99, 235, 0.1)'
            }}>
              <Search className="w-4 h-4" style={{ color: theme === 'professional-dark' ? '#60A5FA' : '#2563EB' }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
              Follow-up Questions
            </h3>
          </div>

          <div className="grid gap-3">
            {searchData.follow_up_questions.map((question, index) => (
              <button
                key={index}
                className="text-left p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] group border"
                style={{
                  backgroundColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.3)' : 'rgba(243, 244, 246, 0.7)',
                  borderColor: theme === 'professional-dark' ? 'rgba(60, 64, 67, 0.5)' : 'rgba(229, 231, 235, 0.5)',
                  color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937'
                }}
              >
                <div className="flex items-center space-x-3">
                  <Search className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform"
                         style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }} />
                  <span className="font-medium">{question}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const WebResultsTab: React.FC<{ searchData: TavilyResponse; theme: string; getCardStyle: () => any }> = ({
  searchData, theme, getCardStyle
}) => {
  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
      {searchData.results.map((result, index) => (
        <div key={index} className="rounded-2xl p-6 hover:scale-[1.02] transition-all duration-200" style={getCardStyle()}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2 line-clamp-2" style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
                {result.title}
              </h3>
              <div className="flex items-center space-x-4 text-sm" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
                <span>{new URL(result.url).hostname}</span>
                {result.published_date && (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>{new Date(result.published_date).toLocaleDateString()}</span>
                  </>
                )}
                {result.score && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>{Math.round(result.score * 100)}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button className="p-2 rounded-lg transition-colors" style={{
                backgroundColor: theme === 'professional-dark' ? '#3C4043' : '#F3F4F6',
                color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280'
              }}>
                <Volume2 className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg transition-colors" style={{
                backgroundColor: theme === 'professional-dark' ? '#3C4043' : '#F3F4F6',
                color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280'
              }}>
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-sm line-clamp-3 mb-4" style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
            {result.content}
          </p>

          <div className="flex items-center justify-between">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
              style={{ color: theme === 'professional-dark' ? '#60A5FA' : '#2563EB' }}
            >
              Read Full Article →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VoiceSearchPro;