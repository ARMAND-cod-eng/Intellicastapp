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
  Headphones,
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Thermometer,
  DollarSign,
  BarChart3,
  Building2,
  ChevronDown
} from 'lucide-react';
import { ENDPOINTS } from '../../../../src/config/api';

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
  const [showTopNews, setShowTopNews] = useState(false);
  const [categories, setCategories] = useState([
    { id: 'all', label: 'All News' },
    { id: 'technology', label: 'Technology' },
    { id: 'general', label: 'General' },
    { id: 'business', label: 'Business' },
    { id: 'science', label: 'Science' }
  ]);

  // Mock data for sidebar
  const weatherData = {
    temperature: 92,
    condition: 'Sunny',
    location: 'Arlington',
    forecast: [
      { day: 'Wed', temp: 94, icon: 'sun' },
      { day: 'Thu', temp: 96, icon: 'sun' },
      { day: 'Fri', temp: 96, icon: 'cloud' },
      { day: 'Sat', temp: 96, icon: 'cloud' },
      { day: 'Sun', temp: 95, icon: 'sun' }
    ]
  };

  const marketData = [
    { symbol: 'S&P Futu...', price: '6,537.25', change: '+15.5', percentage: '+0.24%', trend: 'up' },
    { symbol: 'NASDAQ ...', price: '23,872', change: '-2', percentage: '-0.01%', trend: 'down' },
    { symbol: 'Bitcoin', price: '$113,771.59', change: '+$2,232.53', percentage: '+2%', trend: 'up' },
    { symbol: 'VIX', price: '15.4', change: '+0.36', percentage: '+2.39%', trend: 'up' }
  ];

  const trendingCompanies = [
    { name: 'Apple Inc.', price: '$225.99', change: '+2.45%', trend: 'up' },
    { name: 'Microsoft Corp.', price: '$441.23', change: '+1.89%', trend: 'up' },
    { name: 'NVIDIA Corp.', price: '$138.07', change: '-0.87%', trend: 'down' },
    { name: 'Tesla Inc.', price: '$248.98', change: '+3.21%', trend: 'up' },
    { name: 'Amazon.com Inc.', price: '$186.45', change: '+1.56%', trend: 'up' }
  ];

  // Fetch real articles from API
  useEffect(() => {
    fetchArticles();
    fetchCategories();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(ENDPOINTS.NEWS.CATEGORIES);
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
      const response = await fetch(`${ENDPOINTS.NEWS.ARTICLES}?limit=50${categoryParam}`);

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
            color: '#00D4E4'
          }} />
          <span style={{
            color: '#FFFFFF'
          }}>Loading news articles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex" style={{
      backgroundColor: '#14191a'
    }}>
      {/* Main Content Area */}
      <div className="flex-1">
        {/* Top News Card Only */}
        <div className="p-6">
          <div className="relative rounded-3xl overflow-hidden p-8" style={{
            background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
            boxShadow: '0 0 40px rgba(0, 212, 228, 0.3)'
          }}>
            <div className="relative z-10">
              <p className="text-white/80 text-sm mb-2">News Article</p>
              <h3 className="text-white text-3xl font-bold mb-4 leading-tight">
                Top News<br />
                Of The<br />
                Week
              </h3>
              <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-2 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full text-white hover:bg-white/30 transition-all duration-200">
                  <Play className="w-5 h-5 ml-1" />
                  <span className="font-medium">Play</span>
                </button>

                {/* Dropdown Button for View Article */}
                <div className="relative">
                  <button
                    onClick={() => setShowTopNews(!showTopNews)}
                    className="flex items-center space-x-2 text-white/80 hover:text-white font-medium transition-colors"
                  >
                    <span>View Article</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showTopNews ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Content */}
                  {showTopNews && (
                    <div className="absolute top-full left-0 mt-2 w-96 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 z-20">
                      <h3 className="text-white text-lg font-semibold mb-4">Global Top 5</h3>
                      <div className="space-y-3">
                        {articles.slice(0, 5).map((article, index) => (
                          <div key={article.id} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 bg-white/10 text-sm font-medium">
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                              <Newspaper className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium line-clamp-1">{article.title}</p>
                              <p className="text-white/70 text-sm">{article.source_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white/70 text-sm">{formatDate(article.published_at).split(',')[0]}</p>
                            </div>
                            <button className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                              {article.status === 'processed' ? (
                                <Play className="w-4 h-4 text-white ml-0.5" />
                              ) : (
                                <Volume2 className="w-4 h-4 text-white" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          </div>
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
                backgroundColor: selectedCategory === category.id ? '#00D4E4' : '#14191a',
                color: selectedCategory === category.id ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                border: selectedCategory === category.id ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: selectedCategory === category.id ? '0 0 20px rgba(0, 212, 228, 0.3)' : ''
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
              color: '#FFFFFF'
            }}>
              {selectedCategory === 'all' ? 'All News' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
            </h2>
            <button className="flex items-center space-x-2 text-sm font-medium transition-colors" style={{
              color: '#00D4E4'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#00E8FA'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#00D4E4'}
            >
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
                  backgroundColor: '#14191a',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00D4E4';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 212, 228, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Article Image/Thumbnail */}
                <div className="relative h-48 overflow-hidden" style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.1) 0%, rgba(0, 232, 250, 0.05) 100%)'
                }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{
                      backgroundColor: 'rgba(0, 212, 228, 0.2)',
                      border: '1px solid rgba(0, 212, 228, 0.3)'
                    }}>
                      <Newspaper className="w-8 h-8" style={{
                        color: '#00D4E4'
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
                      backgroundColor: 'rgba(0, 212, 228, 0.2)',
                      color: '#00D4E4',
                      border: '1px solid rgba(0, 212, 228, 0.3)'
                    }}>
                      {article.category || 'General'}
                    </span>
                    {article.audio_session?.duration && (
                      <div className="flex items-center space-x-1 text-xs" style={{
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(article.audio_session.duration)}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight" style={{
                    color: '#FFFFFF'
                  }}>
                    {article.title}
                  </h3>

                  <p className="text-sm line-clamp-3 mb-4 leading-relaxed" style={{
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    {article.summary}
                  </p>

                  {/* Article Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-xs" style={{
                      color: 'rgba(255, 255, 255, 0.5)'
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
                          background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
                          color: '#FFFFFF',
                          boxShadow: '0 0 15px rgba(0, 212, 228, 0.3)'
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
              color: '#FFFFFF'
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
                    backgroundColor: '#14191a',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
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
                  {/* Article Thumbnail */}
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                    background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.1) 0%, rgba(0, 232, 250, 0.05) 100%)',
                    border: '1px solid rgba(0, 212, 228, 0.2)'
                  }}>
                    <Newspaper className="w-6 h-6" style={{
                      color: '#00D4E4'
                    }} />
                  </div>

                  {/* Article Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold line-clamp-1 mb-1" style={{
                      color: '#FFFFFF'
                    }}>
                      {article.title}
                    </h4>
                    <p className="text-sm line-clamp-1 mb-2" style={{
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      {article.summary}
                    </p>
                    <div className="flex items-center space-x-2 text-xs" style={{
                      color: 'rgba(255, 255, 255, 0.5)'
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
                          background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
                          color: '#FFFFFF',
                          boxShadow: '0 0 15px rgba(0, 212, 228, 0.3)'
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
                          background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
                          color: '#FFFFFF',
                          boxShadow: '0 0 15px rgba(0, 212, 228, 0.3)'
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
            background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.2) 0%, rgba(0, 232, 250, 0.1) 100%)',
            border: '2px solid rgba(0, 212, 228, 0.3)'
          }}>
            <Newspaper className="w-12 h-12" style={{
              color: '#00D4E4'
            }} />
          </div>
          <h3 className="text-2xl font-bold mb-3" style={{
            color: '#FFFFFF'
          }}>
            No articles found
          </h3>
          <p className="text-lg mb-6 max-w-md mx-auto" style={{
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            Try selecting a different category or check back later for fresh news articles.
          </p>
          <button
            onClick={fetchArticles}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl mx-auto transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
              color: '#FFFFFF',
              boxShadow: '0 0 20px rgba(0, 212, 228, 0.3)'
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Articles</span>
          </button>
        </div>
      )}
      </div>

      {/* Sidebar */}
      <div className="w-80 p-6 border-l" style={{
        backgroundColor: '#000000',
        borderColor: 'rgba(0, 212, 228, 0.2)'
      }}>
        {/* Weather Widget */}
        <div className="mb-6 p-4 rounded-2xl" style={{
          backgroundColor: '#14191a',
          border: '1px solid rgba(0, 212, 228, 0.3)'
        }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sun className="w-5 h-5" style={{
                color: theme === 'light' ? '#F59E0B' : '#FCD34D'
              }} />
              <span className="text-lg font-bold" style={{
                color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
              }}>
                {weatherData.temperature}°
              </span>
              <span className="text-sm" style={{
                color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
              }}>
                F/C
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium" style={{
                color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
              }}>
                {weatherData.condition}
              </p>
              <p className="text-xs" style={{
                color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
              }}>
                {weatherData.location}
              </p>
            </div>
          </div>

          {/* 5-day forecast */}
          <div className="grid grid-cols-5 gap-2">
            {weatherData.forecast.map((day, index) => (
              <div key={index} className="text-center">
                <p className="text-xs mb-1" style={{
                  color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                }}>
                  {day.day}
                </p>
                {day.icon === 'sun' ? (
                  <Sun className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                ) : day.icon === 'cloud' ? (
                  <Cloud className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                ) : (
                  <CloudRain className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                )}
                <p className="text-xs font-medium" style={{
                  color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                }}>
                  {day.temp}°
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Market Outlook */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4" style={{
            color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
          }}>
            Market Outlook
          </h3>
          <div className="space-y-3">
            {marketData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl" style={{
                backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                border: `1px solid ${theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`
              }}>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{
                    color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                  }}>
                    {item.symbol}
                  </p>
                  <p className="text-xs" style={{
                    color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                  }}>
                    {item.price}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{
                    color: item.trend === 'up' ? '#22C55E' : '#EF4444'
                  }}>
                    {item.percentage}
                  </p>
                  <p className="text-xs" style={{
                    color: item.trend === 'up' ? '#22C55E' : '#EF4444'
                  }}>
                    {item.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Companies */}
        <div>
          <h3 className="text-lg font-bold mb-4" style={{
            color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
          }}>
            Trending Companies
          </h3>
          <div className="space-y-3">
            {trendingCompanies.map((company, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-xl hover:scale-[1.02] transition-transform duration-200" style={{
                backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                border: `1px solid ${theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`
              }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                  backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED'
                }}>
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{
                    color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                  }}>
                    {company.name}
                  </p>
                  <p className="text-xs" style={{
                    color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                  }}>
                    {company.price}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium" style={{
                    color: company.trend === 'up' ? '#22C55E' : '#EF4444'
                  }}>
                    {company.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsAudioView;