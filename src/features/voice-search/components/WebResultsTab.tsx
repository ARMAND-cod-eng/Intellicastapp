import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Clock,
  Star,
  Eye,
  Grid,
  List,
  Filter,
  ArrowUpDown,
  Play,
  Volume2,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
  Globe,
  TrendingUp,
  BookOpen,
  Headphones
} from 'lucide-react';
import type { TavilySearchResponse, TavilyResult } from '../services/tavily-client';

interface WebResultsTabProps {
  searchData: TavilySearchResponse;
  isLoading?: boolean;
  onPlayAudio?: (result: TavilyResult) => void;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'news' | 'articles' | 'recent';
type SortType = 'relevance' | 'date' | 'readtime';

const WebResultsTab: React.FC<WebResultsTabProps> = ({
  searchData,
  isLoading = false,
  onPlayAudio
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('relevance');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Calculate read time based on content length
  const calculateReadTime = (content: string): number => {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    return Math.max(1, Math.round(wordCount / wordsPerMinute));
  };

  // Get estimated audio duration
  const getAudioDuration = (content: string): string => {
    const readTime = calculateReadTime(content);
    const audioTime = Math.round(readTime * 0.7); // Audio is typically faster
    return `${audioTime}m`;
  };

  // Check if result is news
  const isNewsResult = (result: TavilyResult): boolean => {
    const newsKeywords = ['news', 'breaking', 'today', 'latest'];
    const domain = new URL(result.url).hostname.toLowerCase();
    return newsKeywords.some(keyword =>
      result.title.toLowerCase().includes(keyword) ||
      domain.includes(keyword) ||
      (result.published_date && new Date(result.published_date) > new Date(Date.now() - 24 * 60 * 60 * 1000))
    );
  };

  // Check if result is recent (last 7 days)
  const isRecentResult = (result: TavilyResult): boolean => {
    if (!result.published_date) return false;
    const publishedDate = new Date(result.published_date);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return publishedDate > sevenDaysAgo;
  };

  // Filter results
  const filteredResults = useMemo(() => {
    if (!searchData?.results) return [];

    let results = [...searchData.results];

    // Apply filter
    switch (filter) {
      case 'news':
        results = results.filter(isNewsResult);
        break;
      case 'articles':
        results = results.filter(result => !isNewsResult(result));
        break;
      case 'recent':
        results = results.filter(isRecentResult);
        break;
      default:
        break;
    }

    // Apply sort
    switch (sort) {
      case 'date':
        results.sort((a, b) => {
          const dateA = a.published_date ? new Date(a.published_date).getTime() : 0;
          const dateB = b.published_date ? new Date(b.published_date).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'readtime':
        results.sort((a, b) => calculateReadTime(a.content || '') - calculateReadTime(b.content || ''));
        break;
      default:
        // relevance (score)
        results.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
    }

    return results;
  }, [searchData?.results, filter, sort]);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getDomainFavicon = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!searchData?.results || searchData.results.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No results found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Try adjusting your search query or filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
            Web Results
          </h2>
          <span className="text-sm px-3 py-1 rounded-full" style={{
            backgroundColor: 'rgba(0, 212, 228, 0.2)',
            color: '#00D4E4',
            border: '1px solid rgba(0, 212, 228, 0.3)'
          }}>
            {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg p-1" style={{
            backgroundColor: '#14191a',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded-md transition-all"
              style={{
                backgroundColor: viewMode === 'grid' ? '#00D4E4' : 'transparent',
                color: viewMode === 'grid' ? 'white' : 'rgba(255, 255, 255, 0.5)',
                boxShadow: viewMode === 'grid' ? '0 0 10px rgba(0, 212, 228, 0.3)' : ''
              }}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-md transition-all"
              style={{
                backgroundColor: viewMode === 'list' ? '#00D4E4' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'rgba(255, 255, 255, 0.5)',
                boxShadow: viewMode === 'list' ? '0 0 10px rgba(0, 212, 228, 0.3)' : ''
              }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: '#14191a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.7)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00D4E4';
              e.currentTarget.style.color = '#00D4E4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-2xl p-6 shadow-lg" style={{
          backgroundColor: '#14191a',
          border: '1px solid rgba(0, 212, 228, 0.3)',
          boxShadow: '0 0 20px rgba(0, 212, 228, 0.15)'
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Filter by Type */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: '#FFFFFF' }}>
                Filter by Type
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all' as FilterType, label: 'All Results', icon: Globe },
                  { key: 'news' as FilterType, label: 'News', icon: Zap },
                  { key: 'articles' as FilterType, label: 'Articles', icon: BookOpen },
                  { key: 'recent' as FilterType, label: 'Recent', icon: Calendar }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: filter === key ? '#00D4E4' : 'rgba(255, 255, 255, 0.05)',
                      color: filter === key ? 'white' : 'rgba(255, 255, 255, 0.7)',
                      border: filter === key ? '1px solid #00D4E4' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: filter === key ? '0 0 15px rgba(0, 212, 228, 0.3)' : ''
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort by */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: '#FFFFFF' }}>
                Sort by
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'relevance' as SortType, label: 'Relevance', icon: Star },
                  { key: 'date' as SortType, label: 'Date', icon: Clock },
                  { key: 'readtime' as SortType, label: 'Read Time', icon: BookOpen }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSort(key)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: sort === key ? '#00D4E4' : 'rgba(255, 255, 255, 0.05)',
                      color: sort === key ? 'white' : 'rgba(255, 255, 255, 0.7)',
                      border: sort === key ? '1px solid #00D4E4' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: sort === key ? '0 0 15px rgba(0, 212, 228, 0.3)' : ''
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid/List */}
      <div className={
        viewMode === 'grid'
          ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
          : 'space-y-4'
      }>
        {filteredResults.map((result, index) => {
          const isExpanded = expandedCards.has(index);
          const isNews = isNewsResult(result);
          const isRecent = isRecentResult(result);
          const readTime = calculateReadTime(result.content || '');
          const audioDuration = getAudioDuration(result.content || '');
          const favicon = getDomainFavicon(result.url);

          return (
            <div
              key={index}
              className={`rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                viewMode === 'list' ? 'p-6' : 'p-5'
              }`}
              style={{
                backgroundColor: '#14191a',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00D4E4';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 228, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Favicon */}
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                    {favicon ? (
                      <img
                        src={favicon}
                        alt=""
                        className="w-5 h-5 rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Title and URL */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {isNews && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          <Zap className="w-3 h-3 mr-1" />
                          {isRecent ? 'BREAKING' : 'NEWS'}
                        </span>
                      )}
                      {isRecent && !isNews && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          NEW
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold mb-2 line-clamp-2 leading-tight" style={{ color: '#FFFFFF' }}>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors"
                        style={{ color: '#FFFFFF' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#00D4E4';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#FFFFFF';
                        }}
                      >
                        {result.title}
                      </a>
                    </h3>

                    <div className="flex items-center space-x-1 text-sm mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      <span className="truncate">{new URL(result.url).hostname}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Audio Button */}
                <div className="flex items-center space-x-2 ml-3">
                  <button
                    onClick={() => onPlayAudio?.(result)}
                    className="group relative p-3 rounded-xl transition-all hover:scale-105"
                    style={{
                      backgroundColor: 'rgba(0, 212, 228, 0.2)',
                      border: '1px solid rgba(0, 212, 228, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.3)';
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 228, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.2)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                    title="Audio narration coming soon"
                  >
                    <Headphones className="w-5 h-5 group-hover:animate-pulse" style={{ color: '#00D4E4' }} />
                    <span className="absolute -top-1 -right-1 text-white text-xs px-1.5 py-0.5 rounded-full" style={{
                      background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
                      boxShadow: '0 0 10px rgba(0, 212, 228, 0.5)'
                    }}>
                      {audioDuration}
                    </span>
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {result.published_date && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{getRelativeTime(result.published_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{readTime} min read</span>
                  </div>
                  {result.score && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4" style={{ color: '#00D4E4' }} />
                      <span>{Math.round(result.score * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Preview */}
              <div className="text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {isExpanded ? (
                  <div className="whitespace-pre-line">
                    {result.content || result.snippet || 'No content preview available.'}
                  </div>
                ) : (
                  <div>
                    {(result.content || result.snippet || 'No content preview available.').slice(0, 200)}
                    {(result.content || result.snippet || '').length > 200 && '...'}
                  </div>
                )}
              </div>

              {/* Expand/Collapse Button */}
              {(result.content || result.snippet || '').length > 200 && (
                <button
                  onClick={() => toggleExpanded(index)}
                  className="flex items-center space-x-1 mt-3 text-sm font-medium transition-all duration-200"
                  style={{ color: '#00D4E4' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#00E8FA';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#00D4E4';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State for Filtered Results */}
      {filteredResults.length === 0 && searchData?.results && searchData.results.length > 0 && (
        <div className="text-center py-12">
          <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No results match your filters
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your filter settings to see more results
          </p>
          <button
            onClick={() => {
              setFilter('all');
              setSort('relevance');
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default WebResultsTab;