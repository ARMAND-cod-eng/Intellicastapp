/**
 * News Audio View - Main dashboard for news audio functionality
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
  RefreshCw
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
    <div className="min-h-full p-6" style={{
      backgroundColor: theme === 'professional-dark' ? '#1a1a1a' : theme === 'dark' ? '#0F0F23' : '#F8F9FA'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
            backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED'
          }}>
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{
              color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
            }}>News Audio</h1>
            <p className="text-sm" style={{
              color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
            }}>AI-powered news narration</p>
          </div>
        </div>

        <button
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED',
            color: '#FFFFFF'
          }}
        >
          <Settings className="w-4 h-4" />
          <span>Sources</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className="px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors"
            style={{
              backgroundColor: selectedCategory === category.id
                ? (theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED')
                : 'transparent',
              color: selectedCategory === category.id
                ? '#FFFFFF'
                : (theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'),
              border: `1px solid ${selectedCategory === category.id
                ? 'transparent'
                : (theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#E5E7EB')
              }`
            }}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="grid gap-6">
        {articles
          .filter(article => selectedCategory === 'all' || article.category === selectedCategory)
          .map((article) => (
          <div
            key={article.id}
            className="rounded-lg p-6 border transition-all duration-200 hover:shadow-lg"
            style={{
              backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              borderColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB'
            }}
          >
            {/* Article Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 line-clamp-2" style={{
                  color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                }}>
                  {article.title}
                </h3>
                <p className="text-sm line-clamp-3 mb-3" style={{
                  color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                }}>
                  {article.summary}
                </p>
              </div>
            </div>

            {/* Article Meta */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4 text-xs" style={{
                color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
              }}>
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{article.author || article.source_name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(article.published_at)}</span>
                </div>
                {article.audio_session?.duration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(article.audio_session.duration)}</span>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <span
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: article.status === 'processed'
                    ? 'rgba(34, 197, 94, 0.2)'
                    : article.status === 'failed'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(251, 191, 36, 0.2)',
                  color: article.status === 'processed'
                    ? '#22C55E'
                    : article.status === 'failed'
                    ? '#EF4444'
                    : '#FBBF24'
                }}
              >
                {article.status === 'processed' ? 'Audio Ready' :
                 article.status === 'failed' ? 'Failed' : 'Processing'}
              </span>
            </div>

            {/* Article Actions */}
            <div className="flex items-center space-x-3">
              {article.audio_session?.status === 'completed' ? (
                <>
                  <button
                    onClick={() => handlePlayAudio(article.id)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED',
                      color: '#FFFFFF'
                    }}
                  >
                    {playingArticle === article.id ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{playingArticle === article.id ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors"
                    style={{
                      borderColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
                      color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
                    }}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleGenerateAudio(article.id)}
                  disabled={article.status === 'pending'}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED',
                    color: '#FFFFFF'
                  }}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Generate Audio</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {articles.filter(article => selectedCategory === 'all' || article.category === selectedCategory).length === 0 && (
        <div className="text-center py-12">
          <Newspaper className="w-12 h-12 mx-auto mb-4" style={{
            color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
          }} />
          <h3 className="text-lg font-medium mb-2" style={{
            color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
          }}>No articles found</h3>
          <p style={{
            color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#6B7280'
          }}>Try selecting a different category or check back later for new articles.</p>
        </div>
      )}
    </div>
  );
};

export default NewsAudioView;