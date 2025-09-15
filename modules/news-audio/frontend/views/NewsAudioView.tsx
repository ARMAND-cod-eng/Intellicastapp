/**
 * News Audio View - Beautiful, modern dashboard for news audio functionality
 * Inspired by Apple Music, Spotify, and modern news platforms
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import {
  Newspaper,
  Play,
  Pause,
  Download,
  Clock,
  User,
  Calendar,
  Volume2,
  Settings,
  RefreshCw,
  TrendingUp,
  Star,
  Eye,
  ArrowRight,
  Headphones
} from 'lucide-react';

interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  author?: string;
  published_at: string;
  source_name: string;
  category?: string;
  status: 'pending' | 'processed' | 'failed';
  audio_session?: {
    id: number;
    status: string;
    duration?: number;
    audio_path?: string;
  };
}

const NewsAudioView: React.FC = () => {
  const { theme } = useTheme();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playingArticle, setPlayingArticle] = useState<number | null>(null);
  const [categories, setCategories] = useState([
    { id: 'all', label: 'All News' },
    { id: 'technology', label: 'Technology' },
    { id: 'general', label: 'General' },
    { id: 'business', label: 'Business' },
    { id: 'science', label: 'Science' }
  ]);

  // Fetch real articles from API
  useEffect(() => {
    fetchArticles();
    fetchCategories();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3004/api/news/categories');
      if (response.ok) {
        const data = await response.json();
        const categoryList = data.categories.map((cat: any) => ({
          id: cat.category,
          label: cat.category === 'all' ? 'All News' :
                 cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
          count: cat.count
        }));
        setCategories(categoryList);
      }
    } catch (error) {
      console.error('❌ Failed to fetch categories:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);

      const categoryParam = selectedCategory === 'all' ? '' : `&category=${selectedCategory}`;
      const response = await fetch(`http://localhost:3004/api/news/articles?limit=50${categoryParam}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📰 Fetched articles:', data.articles.length);

      // Transform articles to match the expected interface
      const transformedArticles = data.articles.map((article: any) => ({
        ...article,
        status: article.status || 'pending'
      }));

      setArticles(transformedArticles);

    } catch (error) {
      console.error('❌ Failed to fetch articles:', error);
      // Fallback to empty array on error
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateAudio = (articleId: number) => {
    console.log('Generating audio for article:', articleId);
    // TODO: Implement audio generation API call
  };

  const handlePlayAudio = (articleId: number) => {
    if (playingArticle === articleId) {
      setPlayingArticle(null);
    } else {
      setPlayingArticle(articleId);
      // TODO: Implement audio playback
    }
  };


  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin" style={{
            color: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED'
          }} />
          <span style={{
            color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
          }}>Loading news articles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{
      backgroundColor: theme === 'professional-dark' ? '#1a1a1a' : theme === 'dark' ? '#0F0F23' : '#F8F9FA'
    }}>
      {/* Hero Header Section */}
      <div className="relative px-6 pt-8 pb-12" style={{
        background: theme === 'professional-dark'
          ? 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)'
          : theme === 'dark'
          ? 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 50%, #A78BFA 100%)'
          : 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)'
      }}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Newspaper className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">News Audio</h1>
                <p className="text-white/80 text-lg">AI-powered intelligent narration</p>
              </div>
            </div>

            <button className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-all duration-200">
              <Settings className="w-4 h-4" />
              <span className="font-medium">Manage Sources</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Total Articles</p>
                  <p className="text-white text-xl font-bold">{articles.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Audio Ready</p>
                  <p className="text-white text-xl font-bold">{articles.filter(a => a.status === 'processed').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Categories</p>
                  <p className="text-white text-xl font-bold">{categories.length - 1}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      <div className="px-6">
        {/* Category Filter Pills */}
        <div className="flex items-center space-x-3 mb-8 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: selectedCategory === category.id
                  ? (theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED')
                  : (theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF'),
                color: selectedCategory === category.id
                  ? '#FFFFFF'
                  : (theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'),
                border: selectedCategory === category.id
                  ? 'none'
                  : `1px solid ${theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`,
                boxShadow: selectedCategory === category.id
                  ? '0 8px 25px rgba(0,0,0,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Featured Articles Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{
              color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
            }}>
              {selectedCategory === 'all' ? 'All News' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
            </h2>
            <button className="flex items-center space-x-2 text-sm font-medium" style={{
              color: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED'
            }}>
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles
              .filter(article => selectedCategory === 'all' || article.category === selectedCategory)
              .slice(0, 6)
              .map((article) => (
              <div
                key={article.id}
                className="group rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
                style={{
                  backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                  border: `1px solid ${theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`
                }}
              >
                {/* Article Image/Thumbnail */}
                <div className="relative h-48 overflow-hidden" style={{
                  background: theme === 'professional-dark'
                    ? 'linear-gradient(135deg, #374151 0%, #1F2937 100%)'
                    : theme === 'dark'
                    ? 'linear-gradient(135deg, #4C1D95 0%, #312E81 100%)'
                    : 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)'
                }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Newspaper className="w-8 h-8" style={{
                        color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                      }} />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md"
                      style={{
                        backgroundColor: article.status === 'processed'
                          ? 'rgba(34, 197, 94, 0.9)'
                          : article.status === 'failed'
                          ? 'rgba(239, 68, 68, 0.9)'
                          : 'rgba(251, 191, 36, 0.9)',
                        color: '#FFFFFF'
                      }}
                    >
                      {article.status === 'processed' ? '🎧 Ready' :
                       article.status === 'failed' ? '❌ Failed' : '⏳ Processing'}
                    </span>
                  </div>

                  {/* Play Button Overlay */}
                  {article.audio_session?.status === 'completed' && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handlePlayAudio(article.id)}
                        className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform duration-200"
                      >
                        {playingArticle === article.id ? (
                          <Pause className="w-6 h-6 text-gray-900" />
                        ) : (
                          <Play className="w-6 h-6 text-gray-900 ml-1" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Article Content */}
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                      backgroundColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                      color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                    }}>
                      {article.category || 'General'}
                    </span>
                    {article.audio_session?.duration && (
                      <div className="flex items-center space-x-1 text-xs" style={{
                        color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                      }}>
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(article.audio_session.duration)}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight" style={{
                    color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                  }}>
                    {article.title}
                  </h3>

                  <p className="text-sm line-clamp-3 mb-4 leading-relaxed" style={{
                    color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                  }}>
                    {article.summary}
                  </p>

                  {/* Article Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-xs" style={{
                      color: theme === 'professional-dark' ? '#80868B' : theme === 'dark' ? '#A78BFA' : '#9CA3AF'
                    }}>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{article.author || article.source_name}</span>
                      </div>
                      <span>•</span>
                      <span>{formatDate(article.published_at).split(',')[0]}</span>
                    </div>

                    {article.audio_session?.status !== 'completed' && (
                      <button
                        onClick={() => handleGenerateAudio(article.id)}
                        disabled={article.status === 'pending'}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                        style={{
                          backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED',
                          color: '#FFFFFF'
                        }}
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Generate</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Articles List */}
        {articles.filter(article => selectedCategory === 'all' || article.category === selectedCategory).length > 6 && (
          <div>
            <h3 className="text-xl font-bold mb-6" style={{
              color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
            }}>
              More Articles
            </h3>

            <div className="space-y-4">
              {articles
                .filter(article => selectedCategory === 'all' || article.category === selectedCategory)
                .slice(6)
                .map((article) => (
                <div
                  key={article.id}
                  className="flex items-center space-x-4 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                  style={{
                    backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                    border: `1px solid ${theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`
                  }}
                >
                  {/* Article Thumbnail */}
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                    background: theme === 'professional-dark'
                      ? 'linear-gradient(135deg, #374151 0%, #1F2937 100%)'
                      : theme === 'dark'
                      ? 'linear-gradient(135deg, #4C1D95 0%, #312E81 100%)'
                      : 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)'
                  }}>
                    <Newspaper className="w-6 h-6" style={{
                      color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                    }} />
                  </div>

                  {/* Article Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold line-clamp-1 mb-1" style={{
                      color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                    }}>
                      {article.title}
                    </h4>
                    <p className="text-sm line-clamp-1 mb-2" style={{
                      color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                    }}>
                      {article.summary}
                    </p>
                    <div className="flex items-center space-x-2 text-xs" style={{
                      color: theme === 'professional-dark' ? '#80868B' : theme === 'dark' ? '#A78BFA' : '#9CA3AF'
                    }}>
                      <span>{article.source_name}</span>
                      <span>•</span>
                      <span>{formatDate(article.published_at).split(',')[0]}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center space-x-2">
                    {article.audio_session?.status === 'completed' ? (
                      <button
                        onClick={() => handlePlayAudio(article.id)}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                        style={{
                          backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED',
                          color: '#FFFFFF'
                        }}
                      >
                        {playingArticle === article.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerateAudio(article.id)}
                        disabled={article.status === 'pending'}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                        style={{
                          backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED',
                          color: '#FFFFFF'
                        }}
                      >
                        Generate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {articles.filter(article => selectedCategory === 'all' || article.category === selectedCategory).length === 0 && (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center" style={{
            background: theme === 'professional-dark'
              ? 'linear-gradient(135deg, #374151 0%, #1F2937 100%)'
              : theme === 'dark'
              ? 'linear-gradient(135deg, #4C1D95 0%, #312E81 100%)'
              : 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)'
          }}>
            <Newspaper className="w-12 h-12" style={{
              color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
            }} />
          </div>
          <h3 className="text-2xl font-bold mb-3" style={{
            color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
          }}>
            No articles found
          </h3>
          <p className="text-lg mb-6 max-w-md mx-auto" style={{
            color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
          }}>
            Try selecting a different category or check back later for fresh news articles.
          </p>
          <button
            onClick={fetchArticles}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl mx-auto transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED',
              color: '#FFFFFF'
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Articles</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsAudioView;