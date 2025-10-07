import React, { useState, useEffect, useRef } from 'react';
import { X, Minimize2, TrendingUp, RefreshCw, Globe, Filter, Play, Clock, BarChart3, Zap, ChevronDown, Settings, Laptop, Briefcase, Microscope, Heart, Film, Trophy, Mic, History, Download, Share2, Volume2, Eye, Edit3, Check, Loader2, Trash2, List, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';
import { ToastContainer, useToast } from '../ui/ToastNotification';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';
import GenerationHistory from '../ui/GenerationHistory';
import VoicePreview from '../voice/VoicePreview';
import { TrendingAPI, type TrendingTopic } from '../../services/trendingApi';
import { NarrationAPI } from '../../services/narrationApi';
import { ContentDiscoveryStorage, type QueueItem } from '../../services/contentDiscoveryStorage';
import { getPodcastDownloadUrl } from '../../config/api';

interface AIContentDiscoveryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
}

interface HistoryItem {
  id: string;
  title: string;
  voiceName: string;
  duration: string;
  createdAt: Date;
  audioUrl: string;
  presetName: string;
}

interface ScriptPreviewData {
  topicId: string;
  script: string;
  wordCount: number;
  estimatedDuration: number;
}

const TopicCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg border-2 border-gray-600/50 bg-gray-800/30 min-h-[120px] animate-pulse">
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
        <div className="h-3 bg-gray-700/30 rounded w-full"></div>
        <div className="h-3 bg-gray-700/30 rounded w-5/6"></div>
      </div>
      <div className="ml-4 flex flex-col items-end gap-2">
        <div className="h-5 w-12 bg-gray-700/50 rounded"></div>
        <div className="h-5 w-16 bg-gray-700/30 rounded-full"></div>
      </div>
    </div>
    <div className="flex items-center gap-2 mb-2">
      <div className="h-5 w-16 bg-gray-700/30 rounded-full"></div>
      <div className="h-5 w-20 bg-gray-700/30 rounded-full"></div>
      <div className="h-5 w-14 bg-gray-700/30 rounded-full"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 w-20 bg-gray-700/30 rounded"></div>
      <div className="h-3 w-24 bg-gray-700/30 rounded"></div>
    </div>
  </div>
);

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
  const [selectedHostVoice, setSelectedHostVoice] = useState('829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30'); // Linda
  const [selectedGuestVoice, setSelectedGuestVoice] = useState('e07c00bc-4134-4eae-9ea4-1a55fb45746b'); // Brooke
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [showVoiceConfig, setShowVoiceConfig] = useState(false);

  // Script Preview State
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  const [scriptPreview, setScriptPreview] = useState<ScriptPreviewData | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [editedScript, setEditedScript] = useState('');

  // Podcast Generation State
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Estimation State
  const [showEstimation, setShowEstimation] = useState(false);
  const [estimationData, setEstimationData] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Queue Management
  const [generationQueue, setGenerationQueue] = useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Audio Player State
  const [currentAudio, setCurrentAudio] = useState<any>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // History State
  const [generationHistory, setGenerationHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Accessibility State
  const [srAnnouncement, setSrAnnouncement] = useState('');

  const categories = [
    { id: 'all', name: 'All Topics', icon: Globe },
    { id: 'technology', name: 'Technology', icon: Laptop },
    { id: 'business', name: 'Business', icon: Briefcase },
    { id: 'science', name: 'Science', icon: Microscope },
    { id: 'health', name: 'Health', icon: Heart },
    { id: 'entertainment', name: 'Entertainment', icon: Film },
    { id: 'sports', name: 'Sports', icon: Trophy },
  ];

  const allVoices = [
    { id: '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', name: 'Linda', desc: 'Professional & Clear', gender: 'female', accent: 'American' },
    { id: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b', name: 'Brooke', desc: 'Friendly & Approachable', gender: 'female', accent: 'American' },
    { id: 'f786b574-daa5-4673-aa0c-cbe3e8534c02', name: 'Katie', desc: 'Young & Energetic', gender: 'female', accent: 'American' },
    { id: '694f9389-aac1-45b6-b726-9d9369183238', name: 'Sarah', desc: 'Calm & Soothing', gender: 'female', accent: 'American' },
    { id: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', name: 'Jacqueline', desc: 'Elegant & Refined', gender: 'female', accent: 'British' },
    { id: 'f9836c6e-a0bd-460e-9d3c-f7299fa60f94', name: 'Caroline', desc: 'Dynamic & Confident', gender: 'female', accent: 'American' },
    { id: '5ee9feff-1265-424a-9d7f-8e4d431a12c7', name: 'Ronald', desc: 'Authoritative Thinker', gender: 'male', accent: 'British' },
    { id: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', name: 'Blake', desc: 'Helpful & Energetic', gender: 'male', accent: 'American' },
    { id: '248be419-c632-4f23-adf1-5324ed7dbf1d', name: 'Elizabeth', desc: 'Warm & Professional', gender: 'female', accent: 'American' },
    { id: '5c5ad5e7-1020-476b-8b91-fdcbe9cc313c', name: 'Daniela', desc: 'Relaxed & Friendly', gender: 'female', accent: 'Spanish' }
  ];

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

  // Load history on mount
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
      // Escape: Close modals/panels
      if (e.key === 'Escape') {
        if (showScriptPreview) {
          setShowScriptPreview(false);
        } else if (showEstimation) {
          setShowEstimation(false);
        } else if (showQueue) {
          setShowQueue(false);
        } else if (showHistory) {
          setShowHistory(false);
        } else if (showPlayer) {
          setShowPlayer(false);
        }
      }

      // Ctrl/Cmd + R: Refresh topics
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!isDiscovering) {
          discoverTrendingTopics();
        }
      }

      // Ctrl/Cmd + A: Select all topics
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !showScriptPreview) {
        e.preventDefault();
        setSelectedTopics(new Set(filteredTopics.map(t => t.id)));
      }

      // Ctrl/Cmd + D: Deselect all topics
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setSelectedTopics(new Set());
      }

      // Ctrl/Cmd + Q: Toggle queue
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        setShowQueue(!showQueue);
      }

      // Ctrl/Cmd + H: Toggle history
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowHistory(!showHistory);
      }

      // Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, showScriptPreview, showEstimation, showQueue, showHistory, showPlayer, isDiscovering, trendingTopics, selectedCategory]);

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
      } else {
        throw new Error('Failed to discover topics');
      }
    } catch (error: any) {
      console.error('Discovery error:', error);
      const userMessage = getErrorMessage(error, 'discovery');
      toast.error('Discovery failed', userMessage);
      announce(`Discovery failed. ${userMessage}`);
    } finally{
      setIsDiscovering(false);
    }
  };

  const filteredTopics = trendingTopics
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

  const toggleTopicSelection = (topicId: string) => {
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
  };

  // Generate script preview
  const handlePreviewScript = async () => {
    if (selectedTopics.size === 0) {
      toast.error('No topic selected', 'Please select one topic to preview');
      return;
    }

    if (selectedTopics.size > 1) {
      toast.info('Multiple topics', 'Previewing first selected topic');
    }

    const firstTopicId = Array.from(selectedTopics)[0];
    const topic = trendingTopics.find(t => t.id === firstTopicId);

    if (!topic || !topic.content) {
      toast.error('No content', 'Topic content not available');
      return;
    }

    setIsGeneratingScript(true);
    setShowScriptPreview(true);
    toast.info('Generating script', 'Creating podcast script...');

    try {
      const response = await NarrationAPI.generateScript(topic.content, 'podcast-summary');

      if (response.success && response.script) {
        const wordCount = response.script.split(/\s+/).length;
        const estimatedDuration = Math.ceil((wordCount / 150) * 60); // 150 words per minute

        setScriptPreview({
          topicId: topic.id,
          script: response.script,
          wordCount,
          estimatedDuration
        });
        setEditedScript(response.script);
        toast.success('Script ready', 'Review and edit before generating');
      } else {
        throw new Error('Failed to generate script');
      }
    } catch (error: any) {
      console.error('Script generation error:', error);
      const userMessage = getErrorMessage(error, 'script');
      toast.error('Script generation failed', userMessage);
      setShowScriptPreview(false);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Get cost estimation
  const handleEstimation = async () => {
    if (selectedTopics.size === 0) {
      toast.error('No topics selected', 'Please select at least one topic');
      return;
    }

    setIsEstimating(true);
    setShowEstimation(true);
    toast.info('Calculating...', 'Estimating cost and time');

    try {
      const topicsToEstimate = trendingTopics.filter(t => selectedTopics.has(t.id));
      const totalContent = topicsToEstimate.map(t => t.content || t.description).join('\n\n');

      const response = await NarrationAPI.generatePodcastEstimate(totalContent, '10min');

      if (response.success && response.estimate) {
        setEstimationData({
          ...response.estimate,
          topicCount: topicsToEstimate.length
        });
        toast.success('Estimation complete', 'Review cost and time below');
      } else {
        throw new Error('Failed to get estimation');
      }
    } catch (error: any) {
      console.error('Estimation error:', error);
      const userMessage = getErrorMessage(error, 'estimation');
      toast.error('Estimation failed', userMessage);
      setShowEstimation(false);
    } finally{
      setIsEstimating(false);
    }
  };

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

      // Check if this topic already exists in history with matching voice settings
      const existingGeneration = history.find(h =>
        h.topicId === topic.id &&
        h.hostVoice === selectedHostVoice &&
        h.guestVoice === selectedGuestVoice
      );

      if (existingGeneration) {
        // Reuse already-generated audio
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
        // Add as pending for generation
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

  // Process queue
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
        // Update status to processing
        ContentDiscoveryStorage.updateQueueItem(item.id, {
          status: 'processing',
          progress: 10
        });
        setGenerationQueue(ContentDiscoveryStorage.getQueue());

        // Generate podcast
        const response = await NarrationAPI.generatePodcast({
          documentText: item.documentContent,
          length: '10min',
          hostVoice: item.hostVoice,
          guestVoice: item.guestVoice,
          style: 'conversational',
          tone: 'professional',
          numSpeakers: 2,
          outputFormat: 'mp3',
          saveScript: true
        });

        if (response.success && response.job_id) {
          // Update with job ID
          ContentDiscoveryStorage.updateQueueItem(item.id, {
            jobId: response.job_id,
            progress: 30
          });
          setGenerationQueue(ContentDiscoveryStorage.getQueue());

          // Poll for completion with exponential backoff
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

                // Update queue item
                ContentDiscoveryStorage.updateQueueItem(item.id, {
                  status: 'completed',
                  progress: 100,
                  result: { audioUrl, filename }
                });

                // Add to history
                const topic = trendingTopics.find(t => t.id === item.topicId);
                ContentDiscoveryStorage.addToHistory({
                  id: response.job_id,
                  title: item.topicTitle,
                  category: topic?.category || 'general',
                  voiceName: `${allVoices.find(v => v.id === item.hostVoice)?.name || 'AI'} & ${allVoices.find(v => v.id === item.guestVoice)?.name || 'AI'}`,
                  hostVoice: item.hostVoice,
                  guestVoice: item.guestVoice,
                  duration: topic?.estimatedDuration || '8-10 min',
                  audioUrl: audioUrl,
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
                // Update progress
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

  // Generate podcast directly
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
        length: '10min',
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

        // Poll for completion with exponential backoff
        let completed = false;
        let attempts = 0;
        const getBackoffDelay = (attempt: number) => {
          // Exponential backoff: 2s, 3s, 5s, 7s, 10s (capped at 10s)
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

              // Add to history
              ContentDiscoveryStorage.addToHistory({
                id: response.job_id,
                title: topic.title,
                category: topic.category,
                voiceName: `${allVoices.find(v => v.id === selectedHostVoice)?.name || 'AI'} & ${allVoices.find(v => v.id === selectedGuestVoice)?.name || 'AI'}`,
                hostVoice: selectedHostVoice,
                guestVoice: selectedGuestVoice,
                duration: topic.estimatedDuration,
                audioUrl: audioUrl,
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
                  artwork: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400",
                  description: topic.description
                }
              });
              setShowPlayer(true);

              toast.success('Podcast generated!', topic.title);
            } else if (job.status === 'failed') {
              throw new Error(job.message || 'Generation failed');
            } else {
              // Update progress based on attempts
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

  // Generate with script
  const handleGenerateWithScript = async () => {
    if (!scriptPreview) return;

    const topic = trendingTopics.find(t => t.id === scriptPreview.topicId);
    if (!topic) return;

    setShowScriptPreview(false);
    toast.info('Generating podcast', 'Creating audio from script...');

    try {
      const response = await NarrationAPI.generatePodcast({
        documentText: editedScript || scriptPreview.script,
        length: '10min',
        hostVoice: selectedHostVoice,
        guestVoice: selectedGuestVoice,
        style: 'conversational',
        tone: 'professional',
        numSpeakers: 2,
        outputFormat: 'mp3',
        saveScript: true
      });

      if (response.success && response.job_id) {
        // Poll for completion with exponential backoff
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

              // Add to history
              ContentDiscoveryStorage.addToHistory({
                id: response.job_id,
                title: topic.title,
                category: topic.category,
                voiceName: `${allVoices.find(v => v.id === selectedHostVoice)?.name || 'AI'} & ${allVoices.find(v => v.id === selectedGuestVoice)?.name || 'AI'}`,
                hostVoice: selectedHostVoice,
                guestVoice: selectedGuestVoice,
                duration: topic.estimatedDuration,
                audioUrl: audioUrl,
                topicId: topic.id,
                scriptPreview: (editedScript || scriptPreview.script).slice(0, 200)
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
                  artwork: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400",
                  description: topic.description
                }
              });
              setShowPlayer(true);

              toast.success('Podcast generated!', topic.title);
            } else if (job.status === 'failed') {
              throw new Error(job.message || 'Generation failed');
            }
          }

          attempts++;
        }

        if (!completed) {
          throw new Error('Generation timed out');
        }
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      const userMessage = getErrorMessage(error, 'generation');
      toast.error('Generation failed', userMessage);
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
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {srAnnouncement}
      </div>

      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Main Panel Container */}
      <div className="w-[95%] md:w-3/4 lg:w-1/2 xl:w-2/5 backdrop-blur-3xl border-l shadow-2xl overflow-hidden flex flex-col relative bg-black border-gray-800 rounded-l-2xl md:rounded-l-none">
        {/* Top Control Bar */}
        <div className="absolute top-6 left-6 z-[100] flex items-center space-x-3">
          <button
            onClick={onMinimize || (() => console.log('Minimize clicked'))}
            className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-xl"
            title="Minimize Panel"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
          <button
            onClick={onClose}
            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xl"
            title="Close Panel"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-xl"
            title="Generation History"
          >
            <History className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`p-3 ${generationQueue.filter(i => i.status === 'pending').length > 0 ? 'bg-orange-600' : 'bg-gray-600'}/80 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-xl relative`}
            title="Generation Queue"
          >
            <List className="w-6 h-6" />
            {generationQueue.filter(i => i.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {generationQueue.filter(i => i.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 backdrop-blur-md border-b bg-[#14191a] border-gray-800 z-10">
          <h1 className="text-2xl font-bold flex items-center space-x-3 text-white">
            <div className="w-8 h-8 rounded-full bg-[#00D4E4] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,228,0.4)]">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span>AI Content Discovery</span>
          </h1>

          <button
            onClick={discoverTrendingTopics}
            disabled={isDiscovering}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D4E4] hover:bg-[#00E8FA] text-white transition-all shadow-[0_0_15px_rgba(0,212,228,0.3)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#00D4E4] focus:ring-offset-2 focus:ring-offset-black"
            aria-label="Refresh trending topics (Ctrl+R)"
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
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <Filter size={20} />
                Filter by Category
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-center min-h-[60px] flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#00D4E4] focus:ring-offset-2 focus:ring-offset-black ${
                      selectedCategory === category.id
                        ? 'border-[#00D4E4] bg-[#00D4E4]/20 shadow-[0_0_20px_rgba(0,212,228,0.2)]'
                        : 'border-gray-600 bg-transparent hover:bg-[#00D4E4]/5 hover:border-[#00D4E4]/30'
                    }`}
                    aria-label={`Filter by ${category.name}`}
                    aria-pressed={selectedCategory === category.id}
                  >
                    <IconComponent className={`w-6 h-6 mx-auto mb-1 ${
                      selectedCategory === category.id ? 'text-[#00D4E4]' : 'text-gray-400'
                    }`} />
                    <div className="text-xs font-medium text-white">
                      {category.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Search Bar */}
          <GlassCard variant="medium" className="p-6" glow>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <Search size={20} />
                Search Topics
              </h2>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-[#00D4E4] hover:text-[#00E8FA] transition-colors"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, keywords, or description... (Ctrl+F)"
                className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D4E4] focus:border-transparent transition-all"
                aria-label="Search topics"
              />
            </div>
            {debouncedSearchQuery && (
              <div className="mt-3 text-sm text-gray-400">
                {filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'} found
              </div>
            )}
          </GlassCard>

          {/* Voice Configuration */}
          <GlassCard variant="medium" className="p-6" glow>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <Mic size={20} />
                Voice Configuration
              </h2>
              <button
                onClick={() => setShowVoiceConfig(!showVoiceConfig)}
                className="text-sm text-[#00D4E4] hover:text-[#00E8FA] transition-colors"
              >
                {showVoiceConfig ? 'Hide' : 'Show'}
              </button>
            </div>

            <AnimatePresence>
              {showVoiceConfig && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6"
                >
                  {/* Host Voice */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Host Voice</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select
                        value={selectedHostVoice}
                        onChange={(e) => setSelectedHostVoice(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white focus:border-[#00D4E4] focus:outline-none transition-colors"
                      >
                        {allVoices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} - {voice.desc}
                          </option>
                        ))}
                      </select>
                      <VoicePreview
                        voiceId={selectedHostVoice}
                        voiceName={allVoices.find(v => v.id === selectedHostVoice)?.name || 'Host'}
                        voiceDescription={allVoices.find(v => v.id === selectedHostVoice)?.desc || ''}
                        speed={voiceSpeed}
                      />
                    </div>
                  </div>

                  {/* Guest Voice */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Guest Voice</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select
                        value={selectedGuestVoice}
                        onChange={(e) => setSelectedGuestVoice(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white focus:border-[#00D4E4] focus:outline-none transition-colors"
                      >
                        {allVoices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} - {voice.desc}
                          </option>
                        ))}
                      </select>
                      <VoicePreview
                        voiceId={selectedGuestVoice}
                        voiceName={allVoices.find(v => v.id === selectedGuestVoice)?.name || 'Guest'}
                        voiceDescription={allVoices.find(v => v.id === selectedGuestVoice)?.desc || ''}
                        speed={voiceSpeed}
                      />
                    </div>
                  </div>

                  {/* Voice Speed */}
                  <div>
                    <label className="text-sm font-medium block mb-2 text-white">
                      Voice Speed: {voiceSpeed.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={voiceSpeed}
                      onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00D4E4]"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Slower (0.5x)</span>
                      <span>Normal (1.0x)</span>
                      <span>Faster (2.0x)</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

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
            {!isDiscovering && filteredTopics.length > 0 && (
              <div className="mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedTopics(new Set(filteredTopics.map(t => t.id)));
                        announce(`Selected all ${filteredTopics.length} visible topics`);
                      }}
                      className="px-3 py-1.5 bg-[#00D4E4]/20 hover:bg-[#00D4E4]/30 text-[#00D4E4] rounded-md text-sm font-medium transition-colors border border-[#00D4E4]/30 focus:outline-none focus:ring-2 focus:ring-[#00D4E4] focus:ring-offset-2 focus:ring-offset-black"
                      aria-label="Select all visible topics"
                    >
                      Select All Visible
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTopics(new Set());
                        announce('Cleared all selections');
                      }}
                      disabled={selectedTopics.size === 0}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black ${
                        selectedTopics.size === 0
                          ? 'bg-gray-700/50 text-gray-500 border-gray-600 cursor-not-allowed'
                          : 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600/30 focus:ring-red-500'
                      }`}
                      aria-label="Clear all selections"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <div className="text-sm font-medium text-gray-400">
                    <span className="text-[#00D4E4]">{selectedTopics.size}</span> of {filteredTopics.length} selected
                  </div>
                </div>
              </div>
            )}

            {isDiscovering ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00D4E4]"></div>
                  <p className="text-sm text-gray-400">
                    Using AI to discover trending topics...
                  </p>
                </div>
                {[...Array(8)].map((_, index) => (
                  <TopicCardSkeleton key={index} />
                ))}
              </motion.div>
            ) : filteredTopics.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No topics found</p>
                <button
                  onClick={discoverTrendingTopics}
                  className="text-[#00D4E4] hover:text-[#00E8FA] text-sm"
                >
                  Discover Topics
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTopics.map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => toggleTopicSelection(topic.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all min-h-[120px] ${
                      selectedTopics.has(topic.id)
                        ? 'border-[#00D4E4] bg-[#00D4E4]/10 shadow-[0_0_20px_rgba(0,212,228,0.2)]'
                        : 'border-gray-600 bg-transparent hover:bg-[#00D4E4]/5 hover:border-[#00D4E4]/30'
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedTopics.has(topic.id)}
                    aria-label={`Select topic: ${topic.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleTopicSelection(topic.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm mb-1 text-white">
                          {topic.title}
                        </h3>
                        <p className="text-xs mb-2 text-gray-400">
                          {topic.description}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          <BarChart3 size={14} className="text-[#00D4E4]" />
                          <span className="text-xs font-bold text-[#00D4E4]">{topic.trendScore}</span>
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
                          className="text-xs px-2 py-1 rounded-full bg-[#00D4E4]/15 text-[#00D4E4]"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400">
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

          {/* Selection Info & Inline Estimation */}
          {selectedTopics.size > 0 && (
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
                <button
                  onClick={() => setSelectedTopics(new Set())}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear selection
                </button>
              </div>
            </GlassCard>
          )}

          {/* Generation Progress Indicator */}
          <AnimatePresence>
            {isGeneratingPodcast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GlassCard variant="medium" className="p-6" role="status" aria-busy="true" aria-live="polite">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-[#00D4E4] animate-spin" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-white">Generating Podcast...</h3>
                        <p className="text-xs text-gray-400">
                          {generationProgress < 20 ? 'Initializing...' :
                           generationProgress < 40 ? 'Generating script...' :
                           generationProgress < 70 ? 'Synthesizing voices...' :
                           generationProgress < 90 ? 'Finalizing audio...' :
                           'Almost done...'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelGeneration}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"
                      aria-label="Cancel generation"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Progress</span>
                      <span className="font-semibold text-[#00D4E4]">{generationProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="bg-gradient-to-r from-purple-600 to-[#00D4E4] h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${generationProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons - Simplified */}
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

          {/* Script Preview Modal */}
          <AnimatePresence>
            {showScriptPreview && scriptPreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Edit3 size={20} className="text-[#00D4E4]" />
                      Script Preview & Edit
                    </h3>
                    <button
                      onClick={() => setShowScriptPreview(false)}
                      className="p-3 hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Close Script Preview"
                    >
                      <X size={20} className="text-gray-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">Word Count</div>
                      <div className="text-lg font-bold text-white">{scriptPreview.wordCount}</div>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">Duration</div>
                      <div className="text-lg font-bold text-white">{Math.floor(scriptPreview.estimatedDuration / 60)}:{(scriptPreview.estimatedDuration % 60).toString().padStart(2, '0')}</div>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">Status</div>
                      <div className="text-lg font-bold text-green-400">Ready</div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto mb-4">
                    <textarea
                      value={editedScript}
                      onChange={(e) => setEditedScript(e.target.value)}
                      className="w-full h-full min-h-[300px] bg-gray-800/30 border border-gray-600 rounded-lg p-4 text-white text-sm resize-none focus:border-[#00D4E4] focus:outline-none"
                      placeholder="Edit your script here..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowScriptPreview(false)}
                      className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateWithScript}
                      className="flex-1 px-4 py-3 bg-[#00D4E4] hover:bg-[#00E8FA] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Play size={18} />
                      Generate Podcast
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Estimation Modal */}
          <AnimatePresence>
            {showEstimation && estimationData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <BarChart3 size={20} className="text-[#00D4E4]" />
                      Cost & Time Estimation
                    </h3>
                    <button
                      onClick={() => setShowEstimation(false)}
                      className="p-3 hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Close Estimation"
                    >
                      <X size={20} className="text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-4 rounded-lg border border-blue-500/30">
                        <div className="text-sm text-gray-400 mb-1">Topics Selected</div>
                        <div className="text-2xl font-bold text-white">{estimationData.topicCount}</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-4 rounded-lg border border-green-500/30">
                        <div className="text-sm text-gray-400 mb-1">Est. Duration</div>
                        <div className="text-2xl font-bold text-white">{estimationData.estimated_duration || '8-10 min'}</div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">LLM Cost (Script Generation)</span>
                        <span className="text-white font-semibold">${estimationData.llm_cost?.toFixed(4) || '0.0050'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">TTS Cost (Voice Synthesis)</span>
                        <span className="text-white font-semibold">${estimationData.tts_cost?.toFixed(4) || '0.0120'}</span>
                      </div>
                      <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                        <span className="text-white font-bold">Total Estimated Cost</span>
                        <span className="text-[#00D4E4] font-bold text-xl">${estimationData.total_cost?.toFixed(4) || '0.0170'}</span>
                      </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Zap size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-gray-300">
                          This is an estimate. Actual costs may vary based on content length and voice selection. Processing time: ~{estimationData.topicCount * 2}-{estimationData.topicCount * 3} minutes.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowEstimation(false)}
                      className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowEstimation(false);
                        handleAddToQueue();
                      }}
                      className="flex-1 px-4 py-3 bg-[#00D4E4] hover:bg-[#00E8FA] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Play size={18} />
                      Proceed to Queue
                    </button>
                  </div>
                </motion.div>
              </motion.div>
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

      {/* Queue Panel */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-[60] flex flex-col"
          >
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <List size={20} className="text-[#00D4E4]" />
                  Generation Queue
                </h3>
                <button
                  onClick={() => setShowQueue(false)}
                  className="p-3 hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close Queue"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <button
                onClick={processQueue}
                disabled={isProcessingQueue || generationQueue.filter(i => i.status === 'pending').length === 0}
                className={`w-full px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  isProcessingQueue || generationQueue.filter(i => i.status === 'pending').length === 0
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-[#00D4E4] hover:bg-[#00E8FA] text-white'
                }`}
              >
                {isProcessingQueue ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    Process Queue ({generationQueue.filter(i => i.status === 'pending').length})
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {generationQueue.length === 0 ? (
                <div className="text-center py-12">
                  <List className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500">Queue is empty</p>
                </div>
              ) : (
                generationQueue.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border ${
                      item.status === 'completed'
                        ? 'bg-green-500/10 border-green-500/30'
                        : item.status === 'failed'
                        ? 'bg-red-500/10 border-red-500/30'
                        : item.status === 'processing'
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-white mb-1">{item.topicTitle}</h4>
                        <div className="text-xs text-gray-400 capitalize">{item.status}</div>
                      </div>
                      <button
                        onClick={() => {
                          ContentDiscoveryStorage.removeFromQueue(item.id);
                          setGenerationQueue(ContentDiscoveryStorage.getQueue());
                        }}
                        className="p-2.5 hover:bg-gray-700 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Remove from queue"
                      >
                        <Trash2 size={16} className="text-gray-400" />
                      </button>
                    </div>

                    {item.status === 'processing' && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-[#00D4E4] h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{item.progress}%</div>
                      </div>
                    )}

                    {item.status === 'failed' && item.error && (
                      <div className="mt-2 text-xs text-red-400">{item.error}</div>
                    )}

                    {item.status === 'completed' && item.result && (
                      <button
                        onClick={() => {
                          setCurrentAudio({
                            id: item.id,
                            audioUrl: item.result.audioUrl,
                            trackData: {
                              title: item.topicTitle,
                              artist: 'AI Content Discovery',
                              duration: '8-10 min',
                              artwork: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400"
                            }
                          });
                          setShowPlayer(true);
                          setShowQueue(false);
                        }}
                        className="mt-2 w-full px-3 py-2 bg-[#00D4E4]/20 border border-[#00D4E4]/30 text-[#00D4E4] rounded-lg text-xs font-medium hover:bg-[#00D4E4]/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Play size={14} />
                        Play Podcast
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {generationQueue.filter(i => i.status === 'completed' || i.status === 'failed').length > 0 && (
              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={() => {
                    ContentDiscoveryStorage.clearCompletedQueue();
                    setGenerationQueue(ContentDiscoveryStorage.getQueue());
                    toast.success('Queue cleared', 'Completed items removed');
                  }}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Clear Completed
                </button>
              </div>
            )}
          </motion.div>
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
                    artwork: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400",
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
    </div>
  );
};

export default AIContentDiscoveryPanel;
