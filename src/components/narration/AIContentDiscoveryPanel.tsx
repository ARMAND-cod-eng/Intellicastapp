import React, { useState, useEffect } from 'react';
import { X, Minimize2, TrendingUp, Calendar, Sparkles, RefreshCw, Globe, Filter, Play, Clock, BarChart3, Zap, ChevronDown, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';

interface AIContentDiscoveryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
}

interface TrendingTopic {
  id: string;
  title: string;
  category: string;
  trendScore: number;
  sources: number;
  description: string;
  keywords: string[];
  estimatedDuration: string;
}

const AIContentDiscoveryPanel: React.FC<AIContentDiscoveryPanelProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isMinimized = false
}) => {
  const { theme } = useTheme();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');

  const categories = [
    { id: 'all', name: 'All Topics', icon: '🌐' },
    { id: 'technology', name: 'Technology', icon: '💻' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'health', name: 'Health', icon: '🏥' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
  ];

  const scheduleOptions = [
    { id: 'hourly', name: 'Every Hour', description: 'Generate podcasts hourly' },
    { id: 'daily', name: 'Daily', description: 'Generate once per day' },
    { id: 'weekly', name: 'Weekly', description: 'Generate once per week' },
    { id: 'custom', name: 'Custom', description: 'Set your own schedule' },
  ];

  // Mock trending topics (in real app, this would fetch from API)
  const mockTrendingTopics: TrendingTopic[] = [
    {
      id: '1',
      title: 'AI Breakthrough in Climate Research',
      category: 'science',
      trendScore: 95,
      sources: 247,
      description: 'New AI models predict climate patterns with unprecedented accuracy',
      keywords: ['AI', 'Climate', 'Machine Learning', 'Environment'],
      estimatedDuration: '8-10 min'
    },
    {
      id: '2',
      title: 'Tech Giants Announce Quantum Computing Partnership',
      category: 'technology',
      trendScore: 92,
      sources: 189,
      description: 'Major tech companies collaborate on quantum computing breakthrough',
      keywords: ['Quantum', 'Computing', 'Technology', 'Partnership'],
      estimatedDuration: '6-8 min'
    },
    {
      id: '3',
      title: 'Revolutionary Cancer Treatment Shows Promise',
      category: 'health',
      trendScore: 88,
      sources: 156,
      description: 'Clinical trials reveal new immunotherapy approach with high success rate',
      keywords: ['Cancer', 'Medicine', 'Immunotherapy', 'Research'],
      estimatedDuration: '10-12 min'
    },
    {
      id: '4',
      title: 'Global Economy Shifts Toward Renewable Energy',
      category: 'business',
      trendScore: 85,
      sources: 203,
      description: 'Major economies invest trillions in green energy transition',
      keywords: ['Economy', 'Renewable', 'Energy', 'Investment'],
      estimatedDuration: '7-9 min'
    },
    {
      id: '5',
      title: 'Space Tourism Takes Off with Historic Launch',
      category: 'science',
      trendScore: 82,
      sources: 178,
      description: 'First commercial space station welcomes tourists',
      keywords: ['Space', 'Tourism', 'Technology', 'Innovation'],
      estimatedDuration: '5-7 min'
    }
  ];

  useEffect(() => {
    if (isOpen && trendingTopics.length === 0) {
      discoverTrendingTopics();
    }
  }, [isOpen]);

  const discoverTrendingTopics = async () => {
    setIsDiscovering(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTrendingTopics(mockTrendingTopics);
    setIsDiscovering(false);
  };

  const filteredTopics = selectedCategory === 'all'
    ? trendingTopics
    : trendingTopics.filter(topic => topic.category === selectedCategory);

  const toggleTopicSelection = (topicId: string) => {
    const newSelection = new Set(selectedTopics);
    if (newSelection.has(topicId)) {
      newSelection.delete(topicId);
    } else {
      newSelection.add(topicId);
    }
    setSelectedTopics(newSelection);
  };

  const handleGeneratePodcasts = () => {
    if (selectedTopics.size === 0) {
      alert('Please select at least one topic to generate podcasts');
      return;
    }
    alert(`Generating ${selectedTopics.size} podcast(s) from trending topics...`);
  };

  if (!isOpen) return null;

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="w-16 h-48 backdrop-blur-3xl border shadow-2xl rounded-xl overflow-hidden flex flex-col relative"
             style={{
               backgroundColor: theme === 'professional-dark' ? '#252526' : theme === 'dark' ? 'rgba(15, 15, 35, 0.95)' : '#FFFFFF',
               borderColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'
             }}>
          <div className="p-3 backdrop-blur-md border-b flex flex-col items-center space-y-2"
               style={{
                 backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8F9FA',
                 borderColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'
               }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col items-center space-y-1">
              <button
                onClick={onMinimize}
                className="p-1 rounded transition-colors"
                style={{
                  color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#6B7280'
                }}
                title="Expand Panel"
              >
                <ChevronDown className="w-4 h-4 transform rotate-90" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded transition-colors"
                style={{
                  color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#6B7280'
                }}
                title="Close Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Main Panel Container */}
      <div className="w-1/2 backdrop-blur-3xl border-l shadow-2xl overflow-hidden flex flex-col relative" style={{
        backgroundColor: theme === 'professional-dark' ? '#202020' : theme === 'dark' ? 'rgba(15, 15, 35, 0.95)' : '#FFFFFF',
        borderColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'
      }}>
        {/* Top Control Bar */}
        <div className="absolute top-6 left-6 z-[100] flex items-center space-x-3">
          <button
            onClick={onMinimize || (() => console.log('Minimize clicked'))}
            className="p-3 text-white rounded-lg transition-colors shadow-xl border-2"
            style={{
              backgroundColor: theme === 'light' ? '#A855F7' : theme === 'professional-dark' ? '#9333EA' : '#A855F7',
              borderColor: theme === 'light' ? '#A855F7' : theme === 'professional-dark' ? '#9333EA' : '#A855F7'
            }}
            title="Minimize Panel"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
          <button
            onClick={onClose}
            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xl border-2 border-red-500"
            title="Close Panel"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 backdrop-blur-md border-b z-10" style={{
          backgroundColor: theme === 'professional-dark' ? '#252526' : theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
          borderColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'
        }}>
          <h1 className="text-2xl font-bold flex items-center space-x-3" style={{
            color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
          }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span>AI Content Discovery</span>
          </h1>

          <button
            onClick={discoverTrendingTopics}
            disabled={isDiscovering}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all"
            style={{
              backgroundColor: theme === 'light' ? '#A855F7' : '#9333EA'
            }}
          >
            <RefreshCw className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
            {isDiscovering ? 'Discovering...' : 'Refresh Topics'}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto relative z-10 p-6 space-y-6">

          {/* Category Filter */}
          <GlassCard variant="medium" className="p-6" glow>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{
                color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
              }}>
                <Filter size={20} />
                Filter by Category
              </h2>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedCategory === category.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-300/30 bg-transparent hover:bg-gray-500/10'
                  }`}
                  style={{
                    borderColor: selectedCategory === category.id
                      ? (theme === 'professional-dark' ? '#9333EA' : '#A855F7')
                      : (theme === 'professional-dark' ? '#3C4043' : 'rgba(156, 163, 175, 0.3)'),
                    backgroundColor: selectedCategory === category.id
                      ? (theme === 'professional-dark' ? 'rgba(147, 51, 234, 0.2)' : 'rgba(168, 85, 247, 0.1)')
                      : 'transparent'
                  }}
                >
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-xs font-medium" style={{
                    color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                  }}>
                    {category.name}
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Trending Topics */}
          <GlassCard variant="medium" className="p-6" glow>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{
                color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
              }}>
                <TrendingUp size={20} />
                Trending Topics
                <span className="text-sm font-normal px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                  {filteredTopics.length} topics
                </span>
              </h2>
            </div>

            {isDiscovering ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-sm" style={{
                    color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#6B7280'
                  }}>
                    Discovering trending topics from thousands of sources...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTopics.map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => toggleTopicSelection(topic.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTopics.has(topic.id)
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-300/30 bg-transparent hover:bg-gray-500/5'
                    }`}
                    style={{
                      borderColor: selectedTopics.has(topic.id)
                        ? (theme === 'professional-dark' ? '#9333EA' : '#A855F7')
                        : (theme === 'professional-dark' ? '#3C4043' : 'rgba(156, 163, 175, 0.3)')
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm mb-1" style={{
                          color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                        }}>
                          {topic.title}
                        </h3>
                        <p className="text-xs mb-2" style={{
                          color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#6B7280'
                        }}>
                          {topic.description}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          <BarChart3 size={14} className="text-purple-500" />
                          <span className="text-xs font-bold text-purple-500">{topic.trendScore}</span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                          {topic.sources} sources
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {topic.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)',
                            color: '#A855F7'
                          }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs" style={{
                      color: theme === 'professional-dark' ? '#80868B' : theme === 'dark' ? '#9CA3AF' : '#6B7280'
                    }}>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{topic.estimatedDuration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe size={12} />
                        <span className="capitalize">{topic.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Auto-Generation Settings */}
          <GlassCard variant="medium" className="p-6" glow>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{
                color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
              }}>
                <Settings size={20} />
                Auto-Generation Settings
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerateEnabled}
                  onChange={(e) => setAutoGenerateEnabled(e.target.checked)}
                  className="w-5 h-5 accent-purple-500"
                />
                <span className="text-sm font-medium" style={{
                  color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                }}>
                  Enable Auto-Generation
                </span>
              </label>
            </div>

            <AnimatePresence>
              {autoGenerateEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-medium block mb-2" style={{
                      color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                    }}>
                      Schedule Frequency
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {scheduleOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setScheduleFrequency(option.id)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            scheduleFrequency === option.id
                              ? 'border-purple-500 bg-purple-500/20'
                              : 'border-gray-300/30 bg-transparent hover:bg-gray-500/10'
                          }`}
                          style={{
                            borderColor: scheduleFrequency === option.id
                              ? (theme === 'professional-dark' ? '#9333EA' : '#A855F7')
                              : (theme === 'professional-dark' ? '#3C4043' : 'rgba(156, 163, 175, 0.3)')
                          }}
                        >
                          <div className="font-medium text-sm mb-1" style={{
                            color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                          }}>
                            {option.name}
                          </div>
                          <div className="text-xs" style={{
                            color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#6B7280'
                          }}>
                            {option.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{
                    backgroundColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)',
                    border: '1px solid rgba(168, 85, 247, 0.3)'
                  }}>
                    <div className="flex items-start gap-2">
                      <Zap size={16} className="text-purple-500 mt-0.5" />
                      <div className="text-xs" style={{
                        color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#6B7280'
                      }}>
                        AI will automatically discover trending topics and generate podcasts based on your selected categories and schedule.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Generate Button */}
          <div className="flex justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGeneratePodcasts}
              disabled={selectedTopics.size === 0}
              className={`px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-3 transition-all ${
                selectedTopics.size === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'text-white shadow-lg bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
            >
              <Play size={20} />
              Generate {selectedTopics.size > 0 ? `${selectedTopics.size} ` : ''}Podcast{selectedTopics.size !== 1 ? 's' : ''}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIContentDiscoveryPanel;
