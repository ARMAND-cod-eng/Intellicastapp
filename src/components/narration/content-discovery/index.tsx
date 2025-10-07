/**
 * AI Content Discovery Panel - Main orchestrator component
 * Refactored to use smaller, focused sub-components
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { X, Minimize2, TrendingUp, RefreshCw, ChevronDown, History, List, Play, Loader2, Star, Search, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../contexts/ThemeContext';
import { ToastContainer, useToast } from '../../ui/ToastNotification';
import ModernAudioPlayer from '../../audio/ModernAudioPlayer';
import GenerationHistory from '../../ui/GenerationHistory';
import GlassCard from '../../ui/GlassCard';
import { TrendingAPI } from '../../../services/trendingApi';
import { NarrationAPI } from '../../../services/narrationApi';
import { ContentDiscoveryStorage } from '../../../services/contentDiscoveryStorage';
import { getPodcastDownloadUrl } from '../../../config/api';
import AnalyticsService from '../../../services/analyticsService';
import {
  exportQueue,
  exportPendingQueue,
  exportCompletedQueue,
  importQueue,
  regenerateQueueIds
} from '../../../utils/queueExportImport';
import type { FavoriteItem } from '../../../services/contentDiscoveryStorage';

// Import sub-components
import TopicCard from './TopicCard';
import TopicCardSkeleton from './TopicCardSkeleton';
import BulkSelectionToolbar from './BulkSelectionToolbar';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import VoiceConfiguration from './VoiceConfiguration';
import GenerationProgressIndicator from './GenerationProgressIndicator';
import EmptyState from '../../ui/EmptyState';

// Lazy load heavy components
const ScriptPreviewModal = lazy(() => import('./ScriptPreviewModal'));
const EstimationModal = lazy(() => import('./EstimationModal'));
const QueuePanel = lazy(() => import('./QueuePanel'));
const FavoritesPanel = lazy(() => import('./FavoritesPanel'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

// Import types and constants
import type {
  AIContentDiscoveryPanelProps,
  HistoryItem,
  ScriptPreviewData,
  EstimationData,
  CurrentAudio,
  TrendingTopic
} from './types';
import {
  ALL_VOICES,
  CATEGORIES,
  DEFAULT_HOST_VOICE,
  DEFAULT_GUEST_VOICE,
  DEFAULT_VOICE_SPEED,
  DEFAULT_PODCAST_LENGTH,
  DEFAULT_ARTWORK_URL
} from './constants';

const AIContentDiscoveryPanel: React.FC<AIContentDiscoveryPanelProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isMinimized = false
}) => {
  const { theme } = useTheme();
  const toast = useToast();

  // Discovery State
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Voice Configuration
  const [selectedHostVoice, setSelectedHostVoice] = useState(DEFAULT_HOST_VOICE);
  const [selectedGuestVoice, setSelectedGuestVoice] = useState(DEFAULT_GUEST_VOICE);
  const [voiceSpeed, setVoiceSpeed] = useState(DEFAULT_VOICE_SPEED);
  const [showVoiceConfig, setShowVoiceConfig] = useState(false);

  // Script Preview State
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  const [scriptPreview, setScriptPreview] = useState<ScriptPreviewData | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Podcast Generation State
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Estimation State
  const [showEstimation, setShowEstimation] = useState(false);
  const [estimationData, setEstimationData] = useState<EstimationData | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Queue Management
  const [generationQueue, setGenerationQueue] = useState<any[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Audio Player State
  const [currentAudio, setCurrentAudio] = useState<CurrentAudio | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // History State
  const [generationHistory, setGenerationHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Favorites State
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  // Analytics State
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Accessibility State
  const [srAnnouncement, setSrAnnouncement] = useState('');

  // Helper function to get user-friendly error messages
  const getErrorMessage = (error: any, context: string): string => {
    if (!error) return 'An unexpected error occurred. Please try again.';

    const errorMessage = error.message || error.toString();
    const errorStatus = error.response?.status || error.status;

    if (!navigator.onLine || errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
      return 'Connection failed. Please check your internet and try again.';
    }

    if (errorStatus === 429 || errorMessage.includes('rate limit')) {
      return 'Too many requests. Please wait a minute and try again.';
    }

    if (errorStatus === 500 || errorStatus === 503) {
      return 'Server error. Please try again in a moment.';
    }

    if (errorStatus === 404) {
      return 'Resource not found. Please try a different request.';
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      if (context === 'generation') {
        return 'Generation took too long. Try a simpler topic or retry.';
      }
      return 'Request timed out. Please try again.';
    }

    if (errorMessage.includes('empty') || errorMessage.includes('no topics')) {
      return 'No topics found. Try a different category or refresh.';
    }

    return errorMessage || 'An error occurred. Please try again.';
  };

  // Helper function to announce to screen readers
  const announce = (message: string) => {
    setSrAnnouncement(message);
    setTimeout(() => setSrAnnouncement(''), 100);
  };

  // Load history and favorites on mount
  useEffect(() => {
    const history = ContentDiscoveryStorage.getHistory();
    setGenerationHistory(history.map(item => ({
      id: item.id,
      title: item.title,
      voiceName: item.voiceName,
      duration: item.duration,
      createdAt: new Date(item.createdAt),
      audioUrl: item.audioUrl,
      presetName: `${item.category} Topic`
    })));

    const queue = ContentDiscoveryStorage.getQueue();
    setGenerationQueue(queue);

    const storedFavorites = ContentDiscoveryStorage.getFavorites();
    setFavorites(storedFavorites);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showScriptPreview) setShowScriptPreview(false);
        else if (showEstimation) setShowEstimation(false);
        else if (showQueue) setShowQueue(false);
        else if (showHistory) setShowHistory(false);
        else if (showFavorites) setShowFavorites(false);
        else if (showPlayer) setShowPlayer(false);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!isDiscovering) discoverTrendingTopics();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !showScriptPreview) {
        e.preventDefault();
        setSelectedTopics(new Set(filteredTopics.map(t => t.id)));
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setSelectedTopics(new Set());
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        setShowQueue(!showQueue);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowHistory(!showHistory);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowFavorites(!showFavorites);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setShowAnalytics(!showAnalytics);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, showScriptPreview, showEstimation, showQueue, showHistory, showFavorites, showPlayer, isDiscovering, trendingTopics, selectedCategory]);

  // Auto-discover on open
  useEffect(() => {
    if (isOpen && trendingTopics.length === 0) {
      discoverTrendingTopics();
    }
  }, [isOpen]);

  const discoverTrendingTopics = async () => {
    setIsDiscovering(true);
    toast.info('Discovering trends', 'Using AI to find compelling topics...');
    announce('Discovering trending topics');

    try {
      const response = await TrendingAPI.discoverTopics(selectedCategory, 10);

      if (response.success && response.topics) {
        setTrendingTopics(response.topics);
        toast.success('Discovery complete', `Found ${response.topics.length} trending topics`);
        announce(`Found ${response.topics.length} trending topics`);

        // Track analytics
        AnalyticsService.trackMetric('topic_discovered', {
          category: selectedCategory,
          count: response.topics.length
        });
      } else {
        throw new Error('Failed to discover topics');
      }
    } catch (error: any) {
      console.error('Discovery error:', error);
      const userMessage = getErrorMessage(error, 'discovery');
      toast.error('Discovery failed', userMessage);
      announce(`Discovery failed. ${userMessage}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Memoize filtered topics to prevent recalculation on every render
  const filteredTopics = useMemo(() => {
    return trendingTopics
      .filter(topic => selectedCategory === 'all' || topic.category === selectedCategory)
      .filter(topic => {
        if (!debouncedSearchQuery.trim()) return true;
        const query = debouncedSearchQuery.toLowerCase();
        return (
          topic.title.toLowerCase().includes(query) ||
          topic.description.toLowerCase().includes(query) ||
          topic.keywords.some(keyword => keyword.toLowerCase().includes(query))
        );
      });
  }, [trendingTopics, selectedCategory, debouncedSearchQuery]);

  // Memoize event handlers to prevent child re-renders
  const toggleTopicSelection = useCallback((topicId: string) => {
    const newSelection = new Set(selectedTopics);
    const topic = trendingTopics.find(t => t.id === topicId);
    const topicTitle = topic?.title || 'topic';

    if (newSelection.has(topicId)) {
      newSelection.delete(topicId);
      announce(`Deselected topic: ${topicTitle}`);
    } else {
      newSelection.add(topicId);
      announce(`Selected topic: ${topicTitle}`);
    }
    setSelectedTopics(newSelection);
  }, [selectedTopics, trendingTopics]);

  const handleSelectAll = useCallback(() => {
    setSelectedTopics(new Set(filteredTopics.map(t => t.id)));
    announce(`Selected all ${filteredTopics.length} visible topics`);
  }, [filteredTopics]);

  const handleClearSelection = useCallback(() => {
    setSelectedTopics(new Set());
    announce('Cleared all selections');
  }, []);

  // Add to queue
  const handleAddToQueue = async () => {
    if (selectedTopics.size === 0) {
      toast.error('No topics selected', 'Please select at least one topic');
      return;
    }

    const topicsToQueue = trendingTopics.filter(t => selectedTopics.has(t.id));
    const history = ContentDiscoveryStorage.getHistory();

    let reusedCount = 0;
    let newCount = 0;

    for (const topic of topicsToQueue) {
      if (!topic.content) continue;

      const existingGeneration = history.find(h =>
        h.topicId === topic.id &&
        h.hostVoice === selectedHostVoice &&
        h.guestVoice === selectedGuestVoice
      );

      if (existingGeneration) {
        const queueItem = ContentDiscoveryStorage.addToQueue({
          id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          topicId: topic.id,
          topicTitle: topic.title,
          documentContent: topic.content,
          hostVoice: selectedHostVoice,
          guestVoice: selectedGuestVoice,
          status: 'completed',
          progress: 100,
          result: {
            audioUrl: existingGeneration.audioUrl,
            filename: existingGeneration.audioUrl.split('/').pop()
          }
        });

        setGenerationQueue(prev => [...prev, queueItem]);
        reusedCount++;
      } else {
        const queueItem = ContentDiscoveryStorage.addToQueue({
          id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          topicId: topic.id,
          topicTitle: topic.title,
          documentContent: topic.content,
          hostVoice: selectedHostVoice,
          guestVoice: selectedGuestVoice,
          status: 'pending',
          progress: 0
        });

        setGenerationQueue(prev => [...prev, queueItem]);
        newCount++;
      }
    }

    const message = reusedCount > 0 && newCount > 0
      ? `${reusedCount} reused, ${newCount} pending`
      : reusedCount > 0
      ? `${reusedCount} audio(s) reused`
      : `${newCount} topic(s) queued`;

    toast.success('Added to queue', message);
    setSelectedTopics(new Set());
    setShowQueue(true);
  };

  // Process queue (implementation omitted for brevity - same as original)
  const processQueue = async () => {
    if (generationQueue.filter(i => i.status === 'pending').length === 0) {
      toast.info('Queue empty', 'No pending items to process');
      return;
    }

    setIsProcessingQueue(true);
    toast.info('Processing queue', 'Generating podcasts...');

    const pendingItems = generationQueue.filter(i => i.status === 'pending');

    for (const item of pendingItems) {
      try {
        ContentDiscoveryStorage.updateQueueItem(item.id, {
          status: 'processing',
          progress: 10
        });
        setGenerationQueue(ContentDiscoveryStorage.getQueue());

        const response = await NarrationAPI.generatePodcast({
          documentText: item.documentContent,
          length: DEFAULT_PODCAST_LENGTH,
          hostVoice: item.hostVoice,
          guestVoice: item.guestVoice,
          style: 'conversational',
          tone: 'professional',
          numSpeakers: 2,
          outputFormat: 'mp3',
          saveScript: true
        });

        if (response.success && response.job_id) {
          ContentDiscoveryStorage.updateQueueItem(item.id, {
            jobId: response.job_id,
            progress: 30
          });
          setGenerationQueue(ContentDiscoveryStorage.getQueue());

          let completed = false;
          let attempts = 0;
          const getBackoffDelay = (attempt: number) => {
            const delays = [2000, 3000, 5000, 7000, 10000];
            return delays[Math.min(attempt, delays.length - 1)];
          };

          while (!completed && attempts < 60) {
            const delay = getBackoffDelay(attempts);
            await new Promise(resolve => setTimeout(resolve, delay));

            const statusResponse = await NarrationAPI.getPodcastStatus(response.job_id);

            if (statusResponse.success && statusResponse.job) {
              const job = statusResponse.job;

              if (job.status === 'completed') {
                completed = true;

                const audioFile = job.result.audio_file;
                const filename = audioFile.split(/[\/\\]/).pop();
                const audioUrl = getPodcastDownloadUrl(filename);

                ContentDiscoveryStorage.updateQueueItem(item.id, {
                  status: 'completed',
                  progress: 100,
                  result: { audioUrl, filename }
                });

                const topic = trendingTopics.find(t => t.id === item.topicId);
                ContentDiscoveryStorage.addToHistory({
                  id: response.job_id,
                  title: item.topicTitle,
                  category: topic?.category || 'general',
                  voiceName: `${ALL_VOICES.find(v => v.id === item.hostVoice)?.name || 'AI'} & ${ALL_VOICES.find(v => v.id === item.guestVoice)?.name || 'AI'}`,
                  hostVoice: item.hostVoice,
                  guestVoice: item.guestVoice,
                  duration: topic?.estimatedDuration || '8-10 min',
                  audioUrl: audioUrl,
                  topicId: item.topicId
                });

                // Track analytics for podcast generation
                AnalyticsService.trackMetric('podcast_generated', {
                  category: topic?.category || 'general',
                  topicId: item.topicId
                });

                setGenerationQueue(ContentDiscoveryStorage.getQueue());
                setGenerationHistory(ContentDiscoveryStorage.getHistory().map(h => ({
                  ...h,
                  createdAt: new Date(h.createdAt)
                })));

                toast.success('Podcast ready!', item.topicTitle);
              } else if (job.status === 'failed') {
                throw new Error(job.message || 'Generation failed');
              } else {
                ContentDiscoveryStorage.updateQueueItem(item.id, {
                  progress: Math.min(90, 30 + attempts * 2)
                });
                setGenerationQueue(ContentDiscoveryStorage.getQueue());
              }
            }

            attempts++;
          }

          if (!completed) {
            throw new Error('Generation timed out');
          }
        } else {
          throw new Error('Failed to start generation');
        }
      } catch (error: any) {
        console.error('Queue processing error:', error);
        const userMessage = getErrorMessage(error, 'generation');
        ContentDiscoveryStorage.updateQueueItem(item.id, {
          status: 'failed',
          error: userMessage
        });
        setGenerationQueue(ContentDiscoveryStorage.getQueue());
        toast.error('Generation failed', `${item.topicTitle}: ${userMessage}`);
      }
    }

    setIsProcessingQueue(false);
    toast.success('Queue processed', 'All podcasts generated');
  };

  // Cancel generation
  const handleCancelGeneration = () => {
    setIsCancelling(true);
    setIsGeneratingPodcast(false);
    setGenerationProgress(0);
    setGenerationJobId(null);
    setIsCancelling(false);
    toast.info('Generation cancelled', 'Podcast generation has been stopped');
  };

  // Export queue handler
  const handleExportQueue = useCallback((filter?: 'all' | 'pending' | 'completed') => {
    try {
      if (filter === 'pending') {
        exportPendingQueue(generationQueue);
        toast.success('Queue exported', 'Pending items exported successfully');
      } else if (filter === 'completed') {
        exportCompletedQueue(generationQueue);
        toast.success('Queue exported', 'Completed items exported successfully');
      } else {
        exportQueue(generationQueue);
        toast.success('Queue exported', 'All queue items exported successfully');
      }
      announce('Queue exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', 'Failed to export queue');
    }
  }, [generationQueue]);

  // Import queue handler
  const handleImportQueue = useCallback(async (file: File) => {
    try {
      const result = await importQueue(file);

      if (!result.success) {
        toast.error('Import failed', result.message);
        return;
      }

      if (result.queue && result.queue.length > 0) {
        const queueWithNewIds = regenerateQueueIds(result.queue);

        for (const item of queueWithNewIds) {
          ContentDiscoveryStorage.addToQueue(item);
        }

        setGenerationQueue(ContentDiscoveryStorage.getQueue());

        if (result.errors && result.errors.length > 0) {
          toast.warning('Import completed with warnings', result.message);
        } else {
          toast.success('Import successful', result.message);
        }
        announce(`Imported ${result.queue.length} queue items`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.message || 'Failed to import queue file';
      toast.error('Import failed', errorMessage);
    }
  }, []);

  // Favorite handlers
  const handleToggleFavorite = useCallback((topicId: string) => {
    const topic = trendingTopics.find(t => t.id === topicId);
    if (!topic) return;

    const isFavorited = ContentDiscoveryStorage.isFavorite(topicId);

    if (isFavorited) {
      ContentDiscoveryStorage.removeFavorite(topicId);
      setFavorites(ContentDiscoveryStorage.getFavorites());
      toast.info('Removed from favorites', topic.title);
      announce(`Removed ${topic.title} from favorites`);
    } else {
      ContentDiscoveryStorage.addFavorite(topic);
      setFavorites(ContentDiscoveryStorage.getFavorites());
      toast.success('Added to favorites', topic.title);
      announce(`Added ${topic.title} to favorites`);

      // Track analytics
      AnalyticsService.trackMetric('favorite_added', {
        category: topic.category,
        topicId: topic.id
      });
    }
  }, [trendingTopics]);

  const handleSelectFavorite = useCallback((favoriteItem: FavoriteItem) => {
    // Select the topic
    setSelectedTopics(new Set([favoriteItem.topicId]));
    setShowFavorites(false);
    toast.info('Topic selected', favoriteItem.topicData.title);
    announce(`Selected topic: ${favoriteItem.topicData.title}`);
  }, []);

  const handleRemoveFavorite = useCallback((topicId: string) => {
    ContentDiscoveryStorage.removeFavorite(topicId);
    setFavorites(ContentDiscoveryStorage.getFavorites());
    toast.info('Removed from favorites', 'Topic removed');
  }, []);

  const handleClearAllFavorites = useCallback(() => {
    ContentDiscoveryStorage.clearFavorites();
    setFavorites([]);
    toast.success('Favorites cleared', 'All favorites have been removed');
    announce('All favorites cleared');
  }, []);

  // Generate podcast directly (implementation similar to original - omitted for brevity)
  const handleGeneratePodcast = async () => {
    if (selectedTopics.size === 0) {
      toast.error('No topic selected', 'Please select one topic to generate');
      return;
    }

    if (selectedTopics.size > 1) {
      toast.info('Multiple topics', 'Generating first selected topic');
    }

    const firstTopicId = Array.from(selectedTopics)[0];
    const topic = trendingTopics.find(t => t.id === firstTopicId);

    if (!topic || !topic.content) {
      toast.error('No content', 'Topic content not available');
      return;
    }

    setIsGeneratingPodcast(true);
    setGenerationProgress(0);
    toast.info('Generating podcast', 'Creating audio from topic...');

    try {
      const response = await NarrationAPI.generatePodcast({
        documentText: topic.content,
        length: DEFAULT_PODCAST_LENGTH,
        hostVoice: selectedHostVoice,
        guestVoice: selectedGuestVoice,
        style: 'conversational',
        tone: 'professional',
        numSpeakers: 2,
        outputFormat: 'mp3',
        saveScript: true
      });

      if (response.success && response.job_id) {
        setGenerationJobId(response.job_id);
        setGenerationProgress(10);

        let completed = false;
        let attempts = 0;
        const getBackoffDelay = (attempt: number) => {
          const delays = [2000, 3000, 5000, 7000, 10000];
          return delays[Math.min(attempt, delays.length - 1)];
        };

        while (!completed && attempts < 60 && !isCancelling) {
          const delay = getBackoffDelay(attempts);
          await new Promise(resolve => setTimeout(resolve, delay));

          const statusResponse = await NarrationAPI.getPodcastStatus(response.job_id);

          if (statusResponse.success && statusResponse.job) {
            const job = statusResponse.job;

            if (job.status === 'completed') {
              completed = true;
              setGenerationProgress(100);

              const audioFile = job.result.audio_file;
              const filename = audioFile.split(/[\/\\]/).pop();
              const audioUrl = getPodcastDownloadUrl(filename);

              ContentDiscoveryStorage.addToHistory({
                id: response.job_id,
                title: topic.title,
                category: topic.category,
                voiceName: `${ALL_VOICES.find(v => v.id === selectedHostVoice)?.name || 'AI'} & ${ALL_VOICES.find(v => v.id === selectedGuestVoice)?.name || 'AI'}`,
                hostVoice: selectedHostVoice,
                guestVoice: selectedGuestVoice,
                duration: topic.estimatedDuration,
                audioUrl: audioUrl,
                topicId: topic.id
              });

              // Track analytics for podcast generation
              AnalyticsService.trackMetric('podcast_generated', {
                category: topic.category,
                topicId: topic.id
              });

              setGenerationHistory(ContentDiscoveryStorage.getHistory().map(h => ({
                ...h,
                createdAt: new Date(h.createdAt)
              })));

              setCurrentAudio({
                id: response.job_id,
                audioUrl: audioUrl,
                trackData: {
                  title: topic.title,
                  artist: `AI Content Discovery - IntelliCast AI`,
                  duration: topic.estimatedDuration,
                  artwork: DEFAULT_ARTWORK_URL,
                  description: topic.description
                }
              });
              setShowPlayer(true);

              toast.success('Podcast generated!', topic.title);
            } else if (job.status === 'failed') {
              throw new Error(job.message || 'Generation failed');
            } else {
              const progress = Math.min(90, 10 + (attempts * 3));
              setGenerationProgress(progress);
            }
          }

          attempts++;
        }

        if (!completed && !isCancelling) {
          throw new Error('Generation timed out');
        }
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      const userMessage = getErrorMessage(error, 'generation');
      toast.error('Generation failed', userMessage);
    } finally {
      setIsGeneratingPodcast(false);
      setGenerationProgress(0);
      setGenerationJobId(null);
    }
  };

  if (!isOpen) return null;

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="w-16 h-48 backdrop-blur-3xl border shadow-2xl rounded-xl overflow-hidden flex flex-col relative bg-[#14191a] border-gray-800">
          <div className="p-3 backdrop-blur-md border-b flex flex-col items-center space-y-2 bg-gray-800/50 border-gray-700">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col items-center space-y-1">
              <button
                onClick={onMinimize}
                className="p-2.5 rounded transition-colors text-white/70 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Expand Panel"
                aria-label="Expand Panel"
              >
                <ChevronDown className="w-5 h-5 transform rotate-90" />
              </button>
              <button
                onClick={onClose}
                className="p-2.5 rounded transition-colors text-white/70 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Close Panel"
                aria-label="Close Panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <ToastContainer toasts={toast.toasts} onRemoveToast={toast.removeToast} />

      {/* ARIA Live Region for Screen Readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {srAnnouncement}
      </div>

      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Main Panel Container */}
      <div className="w-[95%] md:w-3/4 lg:w-1/2 xl:w-2/5 backdrop-blur-3xl border-l shadow-2xl overflow-hidden flex flex-col relative bg-black border-gray-800 rounded-l-2xl md:rounded-l-none">
        {/* Window Controls - Top Right */}
        <div className="absolute top-6 right-6 z-[100] flex items-center gap-2">
          <motion.button
            onClick={onMinimize || (() => console.log('Minimize clicked'))}
            className="p-2.5 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg transition-all shadow-lg backdrop-blur-sm border border-gray-600/50"
            title="Minimize Panel"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Minimize2 className="w-5 h-5" />
          </motion.button>
          <motion.button
            onClick={onClose}
            className="p-2.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all shadow-lg backdrop-blur-sm border border-red-500/50"
            title="Close Panel"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Feature Buttons - Top Left */}
        <div className="absolute top-6 left-6 z-[100] flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-900/60 backdrop-blur-md rounded-xl p-2 border border-gray-700/50 shadow-xl">
            <motion.button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                showHistory
                  ? 'bg-[#00D4E4] text-white shadow-[0_0_12px_rgba(0,212,228,0.4)]'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/80'
              }`}
              title="Generation History (Ctrl+H)"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <History className="w-4 h-4" />
              <span className="text-sm font-medium hidden md:inline">History</span>
            </motion.button>

            <motion.button
              onClick={() => setShowQueue(!showQueue)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all relative ${
                showQueue
                  ? 'bg-[#00D4E4] text-white shadow-[0_0_12px_rgba(0,212,228,0.4)]'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/80'
              }`}
              title="Generation Queue (Ctrl+Q)"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium hidden md:inline">Queue</span>
              {generationQueue.filter(i => i.status === 'pending').length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-lg"
                >
                  {generationQueue.filter(i => i.status === 'pending').length}
                </motion.span>
              )}
            </motion.button>

            <motion.button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all relative ${
                showFavorites
                  ? 'bg-[#00D4E4] text-white shadow-[0_0_12px_rgba(0,212,228,0.4)]'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/80'
              }`}
              title="Favorites (Ctrl+B)"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Star className="w-4 h-4" fill={favorites.length > 0 ? 'currentColor' : 'none'} />
              <span className="text-sm font-medium hidden md:inline">Favorites</span>
              {favorites.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-lg"
                >
                  {favorites.length}
                </motion.span>
              )}
            </motion.button>

            <motion.button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                showAnalytics
                  ? 'bg-[#00D4E4] text-white shadow-[0_0_12px_rgba(0,212,228,0.4)]'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/80'
              }`}
              title="Analytics (Ctrl+T)"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium hidden md:inline">Analytics</span>
            </motion.button>
          </div>
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 backdrop-blur-md border-b bg-[#14191a] border-gray-800 z-10">
          <h1 className="text-2xl font-bold flex items-center space-x-3 text-white">
            <div className="w-8 h-8 rounded-full bg-[#00D4E4] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,228,0.4)]">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span>AI Content Discovery</span>
          </h1>

          <motion.button
            onClick={discoverTrendingTopics}
            disabled={isDiscovering}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D4E4] hover:bg-[#00E8FA] text-white shadow-[0_0_15px_rgba(0,212,228,0.3)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#00D4E4] focus:ring-offset-2 focus:ring-offset-black"
            aria-label="Refresh trending topics (Ctrl+R)"
            whileHover={!isDiscovering ? { scale: 1.05 } : {}}
            whileTap={!isDiscovering ? { scale: 0.95 } : {}}
            transition={{ duration: 0.15 }}
          >
            <RefreshCw className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
            {isDiscovering ? 'Discovering...' : 'Refresh Topics'}
          </motion.button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto relative z-10 p-6 space-y-6">
          {/* Category Filter */}
          <CategoryFilter
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          {/* Search Bar */}
          <SearchBar
            ref={searchInputRef}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={filteredTopics.length}
            showResults={!!debouncedSearchQuery}
          />

          {/* Voice Configuration */}
          <VoiceConfiguration
            voices={ALL_VOICES}
            selectedHostVoice={selectedHostVoice}
            selectedGuestVoice={selectedGuestVoice}
            voiceSpeed={voiceSpeed}
            showConfig={showVoiceConfig}
            onHostVoiceChange={setSelectedHostVoice}
            onGuestVoiceChange={setSelectedGuestVoice}
            onVoiceSpeedChange={setVoiceSpeed}
            onToggleConfig={() => setShowVoiceConfig(!showVoiceConfig)}
          />

          {/* Trending Topics */}
          <GlassCard variant="medium" className="p-6" glow>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <TrendingUp size={20} />
                Trending Topics
                <span className="text-sm font-normal px-2 py-1 rounded-full bg-[#00D4E4]/20 text-[#00D4E4]">
                  {filteredTopics.length} topics
                </span>
              </h2>
            </div>

            {/* Bulk Selection Toolbar */}
            {!isDiscovering && (
              <BulkSelectionToolbar
                selectedCount={selectedTopics.size}
                totalCount={filteredTopics.length}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
              />
            )}

            {isDiscovering ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00D4E4]"></div>
                  <p className="text-sm text-gray-400">Using AI to discover trending topics...</p>
                </div>
                {[...Array(8)].map((_, index) => (
                  <TopicCardSkeleton key={index} />
                ))}
              </motion.div>
            ) : filteredTopics.length === 0 ? (
              debouncedSearchQuery || selectedCategory !== 'all' ? (
                <EmptyState
                  icon={Search}
                  title="No topics match your search"
                  description={debouncedSearchQuery ? `No results found for "${debouncedSearchQuery}". Try different keywords or clear your search.` : `No ${selectedCategory} topics available right now. Try a different category.`}
                  iconColor="text-[#00D4E4]"
                  actionButton={{
                    label: debouncedSearchQuery ? "Clear Search" : "View All Topics",
                    onClick: () => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }
                  }}
                />
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No topics discovered yet"
                  description="Click 'Refresh Topics' to discover trending topics powered by AI. We'll find the most interesting content for you!"
                  iconColor="text-[#00D4E4]"
                  actionButton={{
                    label: "Discover Topics",
                    onClick: discoverTrendingTopics
                  }}
                />
              )
            ) : (
              <div className="space-y-3">
                {filteredTopics.map((topic, index) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.05,
                      ease: 'easeOut'
                    }}
                  >
                    <TopicCard
                      topic={topic}
                      isSelected={selectedTopics.has(topic.id)}
                      isFavorite={ContentDiscoveryStorage.isFavorite(topic.id)}
                      onToggleSelection={toggleTopicSelection}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Selection Info & Inline Estimation */}
          <AnimatePresence>
            {selectedTopics.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <GlassCard variant="medium" className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-300">
                        <span className="font-semibold text-white">{selectedTopics.size}</span> topic{selectedTopics.size > 1 ? 's' : ''} selected
                      </div>
                      <div className="h-4 w-px bg-gray-600" />
                      <div className="text-sm text-gray-400">
                        Est. time: <span className="text-[#00D4E4] font-medium">{selectedTopics.size * 3}-{selectedTopics.size * 4} min</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Est. cost: <span className="text-[#00D4E4] font-medium">$0.0{(selectedTopics.size * 17).toString().padStart(3, '0')}</span>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setSelectedTopics(new Set())}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Clear selection
                    </motion.button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generation Progress Indicator */}
          <AnimatePresence>
            {isGeneratingPodcast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GenerationProgressIndicator
                  progress={generationProgress}
                  onCancel={handleCancelGeneration}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGeneratePodcast}
              disabled={selectedTopics.size !== 1 || isGeneratingPodcast}
              className={`px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black ${
                selectedTopics.size !== 1 || isGeneratingPodcast
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl shadow-purple-600/40'
              }`}
              aria-label="Generate podcast now (requires 1 selected topic)"
            >
              {isGeneratingPodcast ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
              <span>Generate Now</span>
              {selectedTopics.size !== 1 && <span className="text-sm font-normal opacity-70">(select 1 topic)</span>}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddToQueue}
              disabled={selectedTopics.size === 0}
              className={`px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-[#00D4E4] focus:ring-offset-2 focus:ring-offset-black ${
                selectedTopics.size === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-[#00D4E4] hover:bg-[#00E8FA] text-black shadow-xl shadow-[#00D4E4]/40'
              }`}
              aria-label={`Add ${selectedTopics.size} topic(s) to queue`}
            >
              <List size={20} />
              <span>Add to Queue</span>
              {selectedTopics.size > 0 && <span className="bg-black/30 px-2 py-0.5 rounded-full text-sm">{selectedTopics.size}</span>}
            </motion.button>
          </div>

          {/* Script Preview Modal - Lazy Loaded */}
          <AnimatePresence>
            {showScriptPreview && scriptPreview && (
              <Suspense fallback={null}>
                <ScriptPreviewModal
                  scriptPreview={scriptPreview}
                  onClose={() => setShowScriptPreview(false)}
                  onGenerate={(editedScript) => {
                    console.log('Generate with script:', editedScript);
                    setShowScriptPreview(false);
                  }}
                />
              </Suspense>
            )}
          </AnimatePresence>

          {/* Estimation Modal - Lazy Loaded */}
          <AnimatePresence>
            {showEstimation && estimationData && (
              <Suspense fallback={null}>
                <EstimationModal
                  estimationData={estimationData}
                  onClose={() => setShowEstimation(false)}
                  onProceed={() => {
                    setShowEstimation(false);
                    handleAddToQueue();
                  }}
                />
              </Suspense>
            )}
          </AnimatePresence>

          {/* Audio Player */}
          <AnimatePresence>
            {showPlayer && currentAudio && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <ModernAudioPlayer
                  audioUrl={currentAudio.audioUrl}
                  trackData={currentAudio.trackData}
                  onClose={() => setShowPlayer(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Queue Panel - Lazy Loaded */}
      <AnimatePresence>
        {showQueue && (
          <Suspense fallback={null}>
            <QueuePanel
              queue={generationQueue}
              isProcessing={isProcessingQueue}
              onClose={() => setShowQueue(false)}
              onProcessQueue={processQueue}
              onRemoveItem={(id) => {
                ContentDiscoveryStorage.removeFromQueue(id);
                setGenerationQueue(ContentDiscoveryStorage.getQueue());
              }}
              onPlayItem={(item) => {
                setCurrentAudio({
                  id: item.id,
                  audioUrl: item.result.audioUrl,
                  trackData: {
                    title: item.topicTitle,
                    artist: 'AI Content Discovery',
                    duration: '8-10 min',
                    artwork: DEFAULT_ARTWORK_URL
                  }
                });
                setShowPlayer(true);
                setShowQueue(false);
              }}
              onClearCompleted={() => {
                ContentDiscoveryStorage.clearCompletedQueue();
                setGenerationQueue(ContentDiscoveryStorage.getQueue());
                toast.success('Queue cleared', 'Completed items removed');
              }}
              onExportQueue={handleExportQueue}
              onImportQueue={handleImportQueue}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-[60]"
          >
            <GenerationHistory
              history={generationHistory}
              onClose={() => setShowHistory(false)}
              onPlayItem={(item) => {
                setCurrentAudio({
                  id: item.id,
                  audioUrl: item.audioUrl,
                  trackData: {
                    title: item.title,
                    artist: `${item.voiceName} • IntelliCast AI`,
                    duration: item.duration,
                    artwork: DEFAULT_ARTWORK_URL,
                    description: ''
                  }
                });
                setShowPlayer(true);
                setShowHistory(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favorites Panel - Lazy Loaded */}
      <AnimatePresence>
        {showFavorites && (
          <Suspense fallback={null}>
            <FavoritesPanel
              favorites={favorites}
              onClose={() => setShowFavorites(false)}
              onSelectFavorite={handleSelectFavorite}
              onRemoveFavorite={handleRemoveFavorite}
              onClearAllFavorites={handleClearAllFavorites}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Analytics Dashboard - Lazy Loaded */}
      <AnimatePresence>
        {showAnalytics && (
          <Suspense fallback={null}>
            <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIContentDiscoveryPanel;
