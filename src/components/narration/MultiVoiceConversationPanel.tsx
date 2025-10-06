import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, FileText, ArrowRight, ArrowLeft, Sparkles, History, Minimize2, Maximize2, Users, Settings, Play, Download, Mic, Trash2, Save, Share2, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DocumentContent } from '../../types/document';
import { NarrationAPI } from '../../services/narrationApi';
import WizardNavigation from '../ui/WizardNavigation';
import VoicePreview from '../voice/VoicePreview';
import EstimationPanel from '../ui/EstimationPanel';
import { ToastContainer, useToast } from '../ui/ToastNotification';
import GenerationHistory from '../ui/GenerationHistory';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';
import GlassCard from '../ui/GlassCard';
import { getPodcastDownloadUrl } from '../../config/api';
import { PresetStorage, type CustomPreset } from '../../services/presetStorage';

interface MultiVoiceConversationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedContent?: DocumentContent[] | null;
  uploadedFiles?: File[] | null;
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

const wizardSteps = [
  { id: 1, title: 'Upload', description: 'Add your document' },
  { id: 2, title: 'Analyze', description: 'AI content analysis' },
  { id: 3, title: 'Choose Style', description: 'Select conversation type' },
  { id: 4, title: 'Configure Voices', description: 'Customize speakers' },
  { id: 5, title: 'Generate', description: 'Create podcast' }
];

const MultiVoiceConversationPanel: React.FC<MultiVoiceConversationPanelProps> = ({
  isOpen,
  onClose,
  uploadedContent,
  uploadedFiles,
  onMinimize,
  isMinimized = false
}) => {
  const toast = useToast();

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // Document State
  const [internalUploadedFiles, setInternalUploadedFiles] = useState<File[] | null>(null);
  const [backendProcessedContent, setBackendProcessedContent] = useState<string>('');
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [documentSummary, setDocumentSummary] = useState<string>('');
  const [wordCount, setWordCount] = useState(0);
  const [contentAnalysis, setContentAnalysis] = useState<{
    tone: string;
    readingLevel: string;
    contentType: string;
    topics: string[];
    complexity: 'simple' | 'moderate' | 'complex';
  } | null>(null);

  // Style & Configuration State
  const [selectedStyle, setSelectedStyle] = useState('conversational');
  const [numberOfSpeakers, setNumberOfSpeakers] = useState(2);
  const [conversationTone, setConversationTone] = useState('friendly');
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  const [isAnalyzingContent, setIsAnalyzingContent] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);

  // Script State
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptWordCount, setScriptWordCount] = useState(0);
  const [scriptVariants, setScriptVariants] = useState<{
    original: string | null;
    shorter: string | null;
    casual: string | null;
    formal: string | null;
  }>({
    original: null,
    shorter: null,
    casual: null,
    formal: null
  });
  const [activeVariant, setActiveVariant] = useState<'original' | 'shorter' | 'casual' | 'formal'>('original');
  const [transformingVariant, setTransformingVariant] = useState<'shorter' | 'casual' | 'formal' | null>(null);

  // Voice Configuration State
  const [hostVoice, setHostVoice] = useState('829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30'); // Linda
  const [guestVoice, setGuestVoice] = useState('e07c00bc-4134-4eae-9ea4-1a55fb45746b'); // Brooke
  const [cohostVoice, setCohostVoice] = useState('a167e0f3-df7e-4d52-a9c3-f949145efdab'); // Blake
  const [moderatorVoice, setModeratorVoice] = useState('5345cf08-6f37-424d-a5d9-8ae1101b9377'); // Julia
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);

  // Advanced Audio State
  const [backgroundMusic, setBackgroundMusic] = useState<string>('none');
  const [musicVolume, setMusicVolume] = useState<number>(0.3);
  const [addIntroOutro, setAddIntroOutro] = useState<boolean>(false);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [currentAudio, setCurrentAudio] = useState<any>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // History State
  const [generationHistory, setGenerationHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Custom Presets State
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  const podcastStyles = [
    {
      id: 'conversational',
      name: 'Conversational Chat',
      description: 'Friendly, casual discussion between hosts',
      icon: '💬',
      previewSample: 'Hey there! Today we\'re diving into something really fascinating. What do you think about this topic?'
    },
    {
      id: 'expert-panel',
      name: 'Expert Panel',
      description: 'Professional analysis with expert perspectives',
      icon: '🎓',
      previewSample: 'From an industry perspective, this represents a significant shift in our understanding of the subject matter.'
    },
    {
      id: 'debate',
      name: 'Debate Style',
      description: 'Opposing viewpoints and critical discussion',
      icon: '⚖️',
      previewSample: 'While I respect that viewpoint, I fundamentally disagree. Let me explain why this alternative approach makes more sense.'
    },
    {
      id: 'interview',
      name: 'Interview Format',
      description: 'Host interviewing an expert guest',
      icon: '🎙️',
      previewSample: 'Welcome to the show! Can you tell our listeners about your experience with this and what insights you\'ve gained?'
    },
    {
      id: 'ai-smart',
      name: 'AI Smart Selection',
      description: 'Let AI analyze your content and choose the perfect style',
      icon: '✨',
      isSpecial: true
    },
  ];

  const conversationTones = [
    { id: 'friendly', name: 'Friendly & Casual', description: 'Warm and approachable' },
    { id: 'professional', name: 'Professional', description: 'Business-focused and formal' },
    { id: 'humorous', name: 'Humorous', description: 'Light-hearted with jokes' },
    { id: 'analytical', name: 'Analytical', description: 'Deep dive and thorough' },
  ];

  // All available Cartesia voices
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

  // Load custom presets
  useEffect(() => {
    const loaded = PresetStorage.getAll();
    setCustomPresets(loaded);
  }, []);

  // File drop handling
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setInternalUploadedFiles(acceptedFiles);
      await processDocument(acceptedFiles);
      toast.success('Document uploaded!', 'Processing your document...');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  // AI Content Analysis - Client-side fallback
  const analyzeContentFallback = (text: string) => {
    const words = text.toLowerCase();
    const textWordCount = text.split(/\s+/).length;

    // Determine tone
    let tone = 'Neutral';
    if (words.includes('exciting') || words.includes('amazing') || words.includes('innovative')) {
      tone = 'Enthusiastic';
    } else if (words.includes('important') || words.includes('critical') || words.includes('essential')) {
      tone = 'Serious';
    } else if (words.includes('story') || words.includes('journey') || words.includes('experience')) {
      tone = 'Narrative';
    }

    // Determine reading level
    const avgWordLength = text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / textWordCount;
    let readingLevel = 'General';
    let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
    if (avgWordLength < 5) {
      readingLevel = 'Easy';
      complexity = 'simple';
    } else if (avgWordLength > 7) {
      readingLevel = 'Advanced';
      complexity = 'complex';
    }

    // Extract topics
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const wordFreq = new Map<string, number>();
    text.toLowerCase().split(/\W+/).forEach(word => {
      if (word.length > 4 && !commonWords.includes(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    const topics = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    // Determine content type
    let contentType = 'General';
    if (words.includes('business') || words.includes('market') || words.includes('revenue')) {
      contentType = 'Business';
    } else if (words.includes('technology') || words.includes('software') || words.includes('code')) {
      contentType = 'Technical';
    } else if (words.includes('learn') || words.includes('education') || words.includes('study')) {
      contentType = 'Educational';
    } else if (words.includes('news') || words.includes('today') || words.includes('report')) {
      contentType = 'News';
    }

    return { tone, readingLevel, contentType, topics, complexity };
  };

  // AI Content Analysis - Backend-powered
  const analyzeContent = async (text: string) => {
    setIsAnalyzingContent(true);
    try {
      const response = await NarrationAPI.analyzeDocumentContent(text);

      if (response.success && response.analysis) {
        return {
          tone: response.analysis.tone || 'Neutral',
          readingLevel: response.analysis.reading_level || 'General',
          contentType: response.analysis.content_type || 'General',
          topics: response.analysis.key_topics || [],
          complexity: response.analysis.complexity_level || 'moderate'
        };
      } else {
        // Fallback to client-side analysis
        console.warn('Backend AI analysis failed, using fallback');
        return analyzeContentFallback(text);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback to client-side analysis
      return analyzeContentFallback(text);
    } finally {
      setIsAnalyzingContent(false);
    }
  };

  // Process document
  const processDocument = async (files?: File[]) => {
    const filesToProcess = files || uploadedFiles || internalUploadedFiles;
    if (!filesToProcess || filesToProcess.length === 0) return;

    setIsProcessingDocument(true);
    try {
      const response = await NarrationAPI.processDocument(filesToProcess[0]);

      if (response.success) {
        setBackendProcessedContent(response.document.text);
        setWordCount(response.document.analysis.wordCount);

        // Perform AI content analysis (now async)
        const analysis = await analyzeContent(response.document.text);
        setContentAnalysis(analysis);

        toast.success('Document processed!', `${response.document.analysis.wordCount} words analyzed`);
        setCurrentStep(2); // Auto-advance to analysis step
      }
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error('Processing failed', 'Please try uploading again');
    } finally {
      setIsProcessingDocument(false);
    }
  };

  // Get AI recommendation for podcast style
  const getAiStyleRecommendation = async () => {
    if (!backendProcessedContent) {
      toast.error('No content', 'Please upload a document first');
      return;
    }

    setIsAnalyzingContent(true);
    try {
      const response = await NarrationAPI.recommendPodcastStyle(backendProcessedContent);

      if (response.success) {
        setAiRecommendation(response.recommendation);
        setShowAiInsights(true);

        // Auto-apply the recommended style
        setSelectedStyle(response.recommendation.style);
        setConversationTone(response.recommendation.tone_suggestion || conversationTone);
        setNumberOfSpeakers(response.recommendation.num_speakers || numberOfSpeakers);

        toast.success('AI Analysis Complete!', `Recommended: ${response.recommendation.style}`);
      }
    } catch (error) {
      console.error('Error getting AI recommendation:', error);
      toast.error('AI Analysis failed', 'Please select a style manually');
    } finally {
      setIsAnalyzingContent(false);
    }
  };

  // Handle style selection
  const handleStyleSelection = async (styleId: string) => {
    if (styleId === 'ai-smart') {
      await getAiStyleRecommendation();
    } else {
      setSelectedStyle(styleId);
      setShowAiInsights(false);
    }
  };

  // Generate conversation script with streaming
  const handleGenerateScript = async () => {
    if (!backendProcessedContent || !selectedStyle) {
      toast.error('Missing information', 'Please complete previous steps');
      return;
    }

    setIsGeneratingScript(true);
    setGeneratedScript('');
    toast.info('Generating script...', 'Watch it appear in real-time!');

    try {
      const response = await fetch('http://localhost:3004/api/narration/generate-conversation-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent: backendProcessedContent,
          style: selectedStyle,
          numSpeakers: numberOfSpeakers,
          tone: conversationTone,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate script: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedScript = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.done) {
                setGeneratedScript(data.fullScript);
                setScriptWordCount(data.fullScript.split(/\s+/).length);
                setScriptVariants({
                  original: data.fullScript,
                  shorter: null,
                  casual: null,
                  formal: null
                });
                setActiveVariant('original');
                toast.success('Script generated!', 'Review and edit before generating audio');
              } else if (data.chunk) {
                accumulatedScript += data.chunk;
                setGeneratedScript(accumulatedScript);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Script generation error:', error);
      toast.error('Generation failed', error.message || 'Please try again');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Transform script variants
  const handleTransformScript = async (transformationType: 'shorter' | 'casual' | 'formal') => {
    if (!scriptVariants.original) {
      toast.error('No script to transform', 'Please generate the original script first');
      return;
    }

    setTransformingVariant(transformationType);
    toast.info(`Generating ${transformationType} version...`, 'Watch it appear in real-time!');

    try {
      const response = await fetch('http://localhost:3004/api/narration/transform-conversation-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalScript: scriptVariants.original,
          transformationType,
          numSpeakers: numberOfSpeakers,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to transform script: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.done) {
                const newWordCount = data.fullScript.split(/\s+/).length;

                setScriptVariants(prev => ({
                  ...prev,
                  [transformationType]: data.fullScript
                }));

                setActiveVariant(transformationType);
                setGeneratedScript(data.fullScript);
                setScriptWordCount(newWordCount);

                toast.success(`${transformationType} version ready!`, `${newWordCount} words`);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Script transformation error:', error);
      toast.error('Transformation failed', error.message || 'Please try again');
    } finally {
      setTransformingVariant(null);
    }
  };

  // Calculate estimates
  const getEstimation = () => {
    const wordsPerMinute = 150;
    const words = scriptWordCount > 0 ? scriptWordCount : wordCount;
    const minutes = Math.ceil(words / wordsPerMinute);
    const seconds = words / (wordsPerMinute / 60);
    const duration = `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

    // Multi-speaker costs more
    const baseCost = words * 0.00002;
    const multiSpeakerMultiplier = numberOfSpeakers;
    const cost = `$${(baseCost * multiSpeakerMultiplier).toFixed(4)}`;

    return { duration, cost, words };
  };

  // State for cancellation
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Cancel generation
  const handleCancelGeneration = () => {
    setIsCancelling(true);
    setIsGenerating(false);
    setGenerationProgress(0);
    setGenerationStage('');
    setGenerationJobId(null);
    toast.warning('Generation cancelled', 'Podcast generation was stopped');
    setIsCancelling(false);
  };

  // Generate podcast
  const handleGenerate = async () => {
    if (!backendProcessedContent) {
      toast.error('Missing document', 'Please upload a document first');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStage('Initializing...');
    toast.info('Generating podcast...', 'This may take 1-2 minutes');

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 800);

    const stageTimeout1 = setTimeout(() => setGenerationStage('Processing document...'), 1000);
    const stageTimeout2 = setTimeout(() => setGenerationStage('Generating voices...'), 5000);
    const stageTimeout3 = setTimeout(() => setGenerationStage('Mixing audio...'), 15000);
    const stageTimeout4 = setTimeout(() => setGenerationStage('Finalizing podcast...'), 25000);

    try {
      const voiceMap = numberOfSpeakers === 2
        ? { host: hostVoice, guest: guestVoice }
        : { host: hostVoice, guest: guestVoice, cohost: cohostVoice };

      const response = await NarrationAPI.generatePodcast({
        documentText: backendProcessedContent,
        length: '10min',
        hostVoice: hostVoice,
        guestVoice: guestVoice,
        cohostVoice: numberOfSpeakers === 3 ? cohostVoice : undefined,
        style: selectedStyle,
        tone: conversationTone,
        numSpeakers: numberOfSpeakers,
        outputFormat: 'mp3',
        saveScript: true
      });

      clearInterval(progressInterval);
      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
      clearTimeout(stageTimeout3);
      clearTimeout(stageTimeout4);
      setGenerationProgress(100);
      setGenerationStage('Complete!');

      if (response.success) {
        // Poll for completion
        const jobId = response.job_id;
        let completed = false;
        let attempts = 0;

        while (!completed && attempts < 60) {
          await new Promise(resolve => setTimeout(resolve, 5000));

          const statusResponse = await NarrationAPI.getPodcastStatus(jobId);

          if (statusResponse.success) {
            const job = statusResponse.job;

            if (job.status === 'completed') {
              completed = true;

              const audioFile = job.result.audio_file;
              const filename = audioFile.split(/[\/\\]/).pop();
              const audioUrl = getPodcastDownloadUrl(filename);

              const newHistoryItem: HistoryItem = {
                id: jobId,
                title: getDocumentTitle(),
                voiceName: `${numberOfSpeakers} Speakers`,
                duration: getEstimation().duration,
                createdAt: new Date(),
                audioUrl: audioUrl,
                presetName: selectedStyle
              };

              setGenerationHistory(prev => [newHistoryItem, ...prev]);
              setCurrentAudio({
                id: jobId,
                audioUrl: audioUrl,
                trackData: {
                  title: getDocumentTitle(),
                  artist: `Multi-Voice Podcast • IntelliCast AI`,
                  duration: getEstimation().duration,
                  artwork: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400",
                  description: documentSummary
                }
              });
              setShowPlayer(true);

              toast.success('Podcast generated!', 'Ready to play');
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
      clearInterval(progressInterval);
      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
      clearTimeout(stageTimeout3);
      clearTimeout(stageTimeout4);
      console.error('Generation error:', error);
      toast.error('Generation failed', error.message || 'Please try again');
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStage('');
      }, 2000);
    }
  };

  // Helper functions
  const getDocumentTitle = () => {
    if (internalUploadedFiles?.[0]) return internalUploadedFiles[0].name.replace(/\.[^/.]+$/, '');
    if (uploadedFiles?.[0]) return uploadedFiles[0].name.replace(/\.[^/.]+$/, '');
    if (uploadedContent?.[0]) return uploadedContent[0].title || 'Document';
    return 'Multi-Voice Podcast';
  };

  // Save current settings as preset
  const handleSaveAsPreset = () => {
    if (!presetName.trim()) {
      toast.error('Name required', 'Please enter a preset name');
      return;
    }

    const newPreset = PresetStorage.save({
      name: presetName.trim(),
      description: presetDescription.trim() || undefined,
      voice: hostVoice,
      speed: voiceSpeed,
      backgroundMusic,
      musicVolume,
      addIntroOutro,
      pauseAtPunctuation: false,
      pauseDuration: 0.3,
      podcastStyle: selectedStyle,
      tags: [selectedStyle, `${numberOfSpeakers}-speakers`]
    });

    setCustomPresets([...customPresets, newPreset]);
    setPresetName('');
    setPresetDescription('');
    setShowPresetManager(false);
    toast.success('Preset saved!', `"${newPreset.name}" is ready to use`);
  };

  // Auto-process uploaded content
  useEffect(() => {
    if ((uploadedFiles || uploadedContent) && !backendProcessedContent) {
      if (uploadedFiles) {
        processDocument();
      } else if (uploadedContent?.[0]) {
        setBackendProcessedContent(uploadedContent[0].content);
        setWordCount(uploadedContent[0].content.split(' ').length);
        setCurrentStep(2);
      }
    }
  }, [uploadedFiles, uploadedContent]);

  // Script generation removed - going directly to voice configuration

  if (!isOpen) return null;

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="w-16 h-48 backdrop-blur-3xl border shadow-2xl rounded-xl overflow-hidden flex flex-col relative"
             style={{
               backgroundColor: '#14191a',
               borderColor: 'rgba(255, 255, 255, 0.1)'
             }}>
          <div className="p-3 backdrop-blur-md border-b flex flex-col items-center space-y-2"
               style={{
                 backgroundColor: 'rgba(255, 255, 255, 0.05)',
                 borderColor: 'rgba(255, 255, 255, 0.1)'
               }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#00D4E4]">
              <Users className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col items-center space-y-1">
              <button onClick={onMinimize} className="p-1 rounded transition-colors text-white/70 hover:text-white">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-1 rounded transition-colors text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render wizard step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Upload Document
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Upload Your Document</h2>
              <p className="text-gray-400">Supports PDF, DOCX, TXT, and Markdown files up to 50MB</p>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? 'border-[#00D4E4] bg-[#00D4E4]/10'
                  : 'border-gray-600 hover:border-[#00D4E4]/50 bg-gray-900/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              {isDragActive ? (
                <p className="text-[#00D4E4] text-lg font-medium">Drop your file here</p>
              ) : isProcessingDocument ? (
                <div className="space-y-3">
                  <div className="w-8 h-8 border-4 border-[#00D4E4] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-white">Processing document...</p>
                </div>
              ) : (
                <>
                  <p className="text-white text-lg mb-2">Drag & drop your file here</p>
                  <p className="text-gray-400 mb-4">or</p>
                  <button className="px-6 py-3 bg-[#00D4E4] hover:bg-[#00E8FA] text-white rounded-lg font-medium transition-colors">
                    Browse Files
                  </button>
                </>
              )}
            </div>

            {backendProcessedContent && (
              <>
                <div className="p-4 rounded-xl bg-green-900/20 border border-green-500/30">
                  <p className="text-green-400 font-medium">✓ Document loaded: {wordCount} words</p>
                </div>

                {/* Document Preview */}
                <div className="p-6 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">Document Preview</h3>
                    <span className="text-xs text-gray-400">{Math.ceil(wordCount / 150)} min read</span>
                  </div>

                  <div className="relative max-h-40 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {backendProcessedContent.slice(0, 500)}
                      {backendProcessedContent.length > 500 && '...'}
                    </p>

                    {backendProcessedContent.length > 500 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-800 to-transparent pointer-events-none" />
                    )}
                  </div>

                  {/* Document Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-700">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00D4E4]">{wordCount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Words</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00D4E4]">
                        {(backendProcessedContent.match(/[.!?]+/g) || []).length}
                      </p>
                      <p className="text-xs text-gray-400">Sentences</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00D4E4]">~{Math.ceil(wordCount / 150)}</p>
                      <p className="text-xs text-gray-400">Minutes</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 2: // AI Content Analysis
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">AI Content Analysis</h2>
              <p className="text-gray-400">Understanding your document to recommend the best conversation style</p>
            </div>

            {contentAnalysis && (
              <div className="p-5 rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30">
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-semibold">AI Content Analysis</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-1">Content Type</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">📚</span>
                      <span className="text-sm font-semibold text-white">{contentAnalysis.contentType}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-1">Tone</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {contentAnalysis.tone === 'Enthusiastic' ? '🎉' :
                         contentAnalysis.tone === 'Serious' ? '📋' :
                         contentAnalysis.tone === 'Narrative' ? '📖' : '💬'}
                      </span>
                      <span className="text-sm font-semibold text-white">{contentAnalysis.tone}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-1">Reading Level</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {contentAnalysis.complexity === 'simple' ? '🟢' :
                         contentAnalysis.complexity === 'moderate' ? '🟡' : '🔴'}
                      </span>
                      <span className="text-sm font-semibold text-white">{contentAnalysis.readingLevel}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-1">Complexity</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">⚙️</span>
                      <span className="text-sm font-semibold text-white capitalize">{contentAnalysis.complexity}</span>
                    </div>
                  </div>
                </div>

                {contentAnalysis.topics.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-2">Key Topics</p>
                    <div className="flex flex-wrap gap-2">
                      {contentAnalysis.topics.map((topic, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded-md text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        >
                          #{topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 3: // Choose Style & Configure
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Conversation Style</h2>
              <p className="text-gray-400">Select the format that best fits your content</p>
            </div>

            {/* Podcast Style Selection */}
            <div className="grid grid-cols-2 gap-4">
              {podcastStyles.map((style: any) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelection(style.id)}
                  disabled={isAnalyzingContent && style.id === 'ai-smart'}
                  className={`p-4 rounded-xl border-2 transition-all text-left relative group ${
                    selectedStyle === style.id || (style.id === 'ai-smart' && showAiInsights)
                      ? 'border-[#00D4E4] bg-[#00D4E4]/20'
                      : 'border-gray-600 hover:border-[#00D4E4]/50'
                  }`}
                >
                  {style.isSpecial && (
                    <div className="absolute top-0 right-0 px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-bl-lg">
                      AI
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{isAnalyzingContent && style.id === 'ai-smart' ? '🔄' : style.icon}</span>
                    <h3 className="font-semibold text-white">{style.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    {isAnalyzingContent && style.id === 'ai-smart' ? 'Analyzing your content...' : style.description}
                  </p>

                  {/* Style Preview Sample - Shows on Hover */}
                  {style.previewSample && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="p-2 rounded-lg bg-black/40 border border-[#00D4E4]/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Play size={12} className="text-[#00D4E4]" />
                          <span className="text-xs text-[#00D4E4] font-medium">Preview Sample</span>
                        </div>
                        <p className="text-xs text-gray-300 italic line-clamp-2">
                          "{style.previewSample}"
                        </p>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* AI Insights Panel */}
            <AnimatePresence>
              {showAiInsights && aiRecommendation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-lg border bg-[#00D4E4]/10 border-[#00D4E4]"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 mt-0.5 text-[#00D4E4]" />
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2 text-[#00D4E4]">AI Analysis Results</h4>
                      <p className="text-sm mb-3 text-white/90">{aiRecommendation.reasoning}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-black/30">
                          <span className="opacity-70">Recommended Style:</span>
                          <div className="font-semibold capitalize mt-1">{aiRecommendation.style.replace('-', ' ')}</div>
                        </div>
                        <div className="p-2 rounded bg-black/30">
                          <span className="opacity-70">Confidence:</span>
                          <div className="font-semibold mt-1">{Math.round(aiRecommendation.confidence * 100)}%</div>
                        </div>
                      </div>
                      {aiRecommendation.key_themes && aiRecommendation.key_themes.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs opacity-70">Key Themes:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {aiRecommendation.key_themes.map((theme: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 rounded-full text-xs bg-[#00D4E4]/15 text-[#00D4E4]">
                                {theme}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Configuration */}
            <GlassCard variant="medium" className="p-6">
              <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Customize Conversation
              </h3>

              {/* Number of Speakers */}
              <div className="mb-6">
                <label className="text-sm font-medium block mb-2 text-white">Number of Speakers</label>
                <div className="flex items-center gap-4">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumberOfSpeakers(num)}
                      className={`px-6 py-2 rounded-lg border-2 transition-all ${
                        numberOfSpeakers === num
                          ? 'border-[#00D4E4] bg-[#00D4E4]/20 text-white'
                          : 'border-gray-600 text-gray-400 hover:border-[#00D4E4]/50'
                      }`}
                    >
                      {num} {num === 1 ? 'Speaker' : 'Speakers'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation Tone */}
              <div>
                <label className="text-sm font-medium block mb-2 text-white">Conversation Tone</label>
                <div className="grid grid-cols-2 gap-3">
                  {conversationTones.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => setConversationTone(tone.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        conversationTone === tone.id
                          ? 'border-[#00D4E4] bg-[#00D4E4]/20'
                          : 'border-gray-600 hover:border-[#00D4E4]/50'
                      }`}
                    >
                      <div className="font-medium mb-1 text-white">{tone.name}</div>
                      <div className="text-xs text-gray-400">{tone.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        );

      case 4: // Configure Voices
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Configure Voices</h2>
              <p className="text-gray-400">Choose the perfect voice for each speaker</p>
            </div>

            {/* Host Voice */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">🎙️ Host Voice</h3>

              {/* Voice Selector Dropdown */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-300 mb-2 block">Select Voice</label>
                <select
                  value={hostVoice}
                  onChange={(e) => setHostVoice(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white focus:border-[#00D4E4] focus:outline-none transition-colors"
                >
                  {allVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Preview */}
              <VoicePreview
                voiceId={hostVoice}
                voiceName={allVoices.find(v => v.id === hostVoice)?.name || 'Unknown'}
                voiceDescription={allVoices.find(v => v.id === hostVoice)?.desc || ''}
                previewText="Welcome to today's podcast. We're going to discuss some fascinating topics that I think you'll find really interesting."
                podcastStyle={selectedStyle}
                onPreviewStart={() => {}}
                onPreviewEnd={() => {}}
              />
            </GlassCard>

            {/* Guest Voice */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">👤 Guest Voice</h3>

              {/* Voice Selector Dropdown */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-300 mb-2 block">Select Voice</label>
                <select
                  value={guestVoice}
                  onChange={(e) => setGuestVoice(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white focus:border-[#00D4E4] focus:outline-none transition-colors"
                >
                  {allVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Preview */}
              <VoicePreview
                voiceId={guestVoice}
                voiceName={allVoices.find(v => v.id === guestVoice)?.name || 'Unknown'}
                voiceDescription={allVoices.find(v => v.id === guestVoice)?.desc || ''}
                previewText="Thanks for having me! I'm excited to share my insights and expertise on this subject with your audience."
                podcastStyle={selectedStyle}
                onPreviewStart={() => {}}
                onPreviewEnd={() => {}}
              />
            </GlassCard>

            {/* Co-Host Voice (if 3+ speakers) */}
            {numberOfSpeakers >= 3 && (
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">🎧 Co-Host Voice</h3>

                {/* Voice Selector Dropdown */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Select Voice</label>
                  <select
                    value={cohostVoice}
                    onChange={(e) => setCohostVoice(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white focus:border-[#00D4E4] focus:outline-none transition-colors"
                  >
                    {allVoices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} - {voice.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Voice Preview */}
                <VoicePreview
                  voiceId={cohostVoice}
                  voiceName={allVoices.find(v => v.id === cohostVoice)?.name || 'Unknown'}
                  voiceDescription={allVoices.find(v => v.id === cohostVoice)?.desc || ''}
                  previewText="That's a great point! Let me add something interesting to this discussion that I think complements what was just said."
                  podcastStyle={selectedStyle}
                  onPreviewStart={() => {}}
                  onPreviewEnd={() => {}}
                />
              </GlassCard>
            )}

            {/* Moderator/Expert Voice (if 4 speakers) */}
            {numberOfSpeakers === 4 && (
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">🎯 Moderator/Expert Voice</h3>

                {/* Voice Selector Dropdown */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Select Voice</label>
                  <select
                    value={moderatorVoice}
                    onChange={(e) => setModeratorVoice(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white focus:border-[#00D4E4] focus:outline-none transition-colors"
                  >
                    {allVoices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} - {voice.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Voice Preview */}
                <VoicePreview
                  voiceId={moderatorVoice}
                  voiceName={allVoices.find(v => v.id === moderatorVoice)?.name || 'Unknown'}
                  voiceDescription={allVoices.find(v => v.id === moderatorVoice)?.desc || ''}
                  previewText="Let me provide some expert perspective on this topic. From my experience, there are several key factors we should consider here."
                  podcastStyle={selectedStyle}
                  onPreviewStart={() => {}}
                  onPreviewEnd={() => {}}
                />
              </GlassCard>
            )}

            {/* Advanced Audio Options */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">🎵 Advanced Audio Options</h3>

              {/* Voice Speed */}
              <div className="mb-6">
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

              {/* Background Music */}
              <div className="mb-6">
                <label className="text-sm font-medium block mb-2 text-white">Background Music</label>
                <select
                  value={backgroundMusic}
                  onChange={(e) => setBackgroundMusic(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D4E4]"
                >
                  <option value="none">None</option>
                  <option value="ambient">Ambient</option>
                  <option value="upbeat">Upbeat</option>
                  <option value="calm">Calm</option>
                  <option value="professional">Professional</option>
                </select>
              </div>

              {backgroundMusic !== 'none' && (
                <div className="mb-6">
                  <label className="text-sm font-medium block mb-2 text-white">
                    Music Volume: {Math.round(musicVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00D4E4]"
                  />
                </div>
              )}

              {/* Intro/Outro */}
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Add Intro & Outro</p>
                  <p className="text-xs text-gray-400">Professional opening and closing segments</p>
                </div>
                <button
                  onClick={() => setAddIntroOutro(!addIntroOutro)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    addIntroOutro ? 'bg-[#00D4E4]' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    addIntroOutro ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </GlassCard>

            {/* Save as Preset */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">💾 Save Configuration as Preset</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D4E4]"
                />
                <input
                  type="text"
                  placeholder="Description (optional)..."
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D4E4]"
                />
                <button
                  onClick={handleSaveAsPreset}
                  className="w-full px-4 py-3 bg-[#00D4E4] hover:bg-[#00E8FA] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save as Preset
                </button>
              </div>
            </GlassCard>
          </div>
        );

      case 5: // Generate
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Generate</h2>
              <p className="text-gray-400">Review your settings and create your podcast</p>
            </div>

            {/* Estimation Panel */}
            <EstimationPanel
              wordCount={getEstimation().words}
              estimatedDuration={getEstimation().duration}
              estimatedCost={getEstimation().cost}
              voiceName={`${numberOfSpeakers} Speakers - ${selectedStyle}`}
              quality="premium"
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />

            {/* Configuration Summary */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">📋 Configuration Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Style:</span>
                  <span className="text-white font-medium capitalize">{selectedStyle.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Speakers:</span>
                  <span className="text-white font-medium">{numberOfSpeakers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tone:</span>
                  <span className="text-white font-medium capitalize">{conversationTone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Document Words:</span>
                  <span className="text-white font-medium">{wordCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Host Voice:</span>
                  <span className="text-white font-medium">{allVoices.find(v => v.id === hostVoice)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Guest Voice:</span>
                  <span className="text-white font-medium">{allVoices.find(v => v.id === guestVoice)?.name}</span>
                </div>
                {numberOfSpeakers >= 3 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Co-Host Voice:</span>
                    <span className="text-white font-medium">{allVoices.find(v => v.id === cohostVoice)?.name}</span>
                  </div>
                )}
                {numberOfSpeakers === 4 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Moderator Voice:</span>
                    <span className="text-white font-medium">{allVoices.find(v => v.id === moderatorVoice)?.name}</span>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Generate Button */}
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-3 transition-all ${
                  isGenerating
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-[#00D4E4] hover:bg-[#00E8FA] text-white shadow-lg shadow-[#00D4E4]/30'
                }`}
              >
                <Sparkles size={20} />
                {isGenerating ? 'Generating Podcast...' : 'Generate Multi-Voice Podcast'}
              </motion.button>
            </div>

            {/* Progress Indicator */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="w-32 h-32 rounded-full border-4 border-[#00D4E4]/30 border-t-[#00D4E4]"
                      />
                      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#00D4E4] to-[#00E8FA] flex items-center justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Sparkles size={32} className="text-white" />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-white font-medium mb-2">{generationStage}</div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-[#00D4E4] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-400 mt-2">{Math.round(generationProgress)}%</div>

                    {/* Cancel Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCancelGeneration}
                      disabled={isCancelling}
                      className="mt-4 px-6 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Generation'}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Audio Player */}
              {showPlayer && currentAudio && !isGenerating && (
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

                  {/* Download and Sharing Section */}
                  <GlassCard className="p-6 mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Download size={20} className="text-[#00D4E4]" />
                      Download & Share
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Download MP3 */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = currentAudio.audioUrl;
                          link.download = `podcast-${Date.now()}.mp3`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          toast.success('Download started!', 'Your podcast is downloading...');
                        }}
                        className="px-4 py-3 rounded-lg bg-[#00D4E4]/20 border border-[#00D4E4]/30 text-[#00D4E4] font-medium hover:bg-[#00D4E4]/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={18} />
                        Download MP3
                      </motion.button>

                      {/* Copy Link */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          navigator.clipboard.writeText(currentAudio.audioUrl);
                          toast.success('Link copied!', 'Audio URL copied to clipboard');
                        }}
                        className="px-4 py-3 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 font-medium hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Share2 size={18} />
                        Copy Link
                      </motion.button>

                      {/* Embed Code */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const embedCode = `<audio controls src="${currentAudio.audioUrl}"></audio>`;
                          navigator.clipboard.writeText(embedCode);
                          toast.success('Embed code copied!', 'Paste into your website HTML');
                        }}
                        className="px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-medium hover:bg-green-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Code size={18} />
                        Embed Code
                      </motion.button>

                      {/* Share to Social */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const shareText = `Check out this AI-generated podcast! 🎙️`;
                          const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentAudio.audioUrl)}`;
                          window.open(shareUrl, '_blank', 'width=600,height=400');
                        }}
                        className="px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 font-medium hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Share2 size={18} />
                        Share
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <ToastContainer toasts={toast.toasts} onRemoveToast={toast.removeToast} />

      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Main Panel */}
      <div className={`${isExpanded ? 'w-3/4' : 'w-1/2'} backdrop-blur-3xl border-l shadow-2xl overflow-hidden flex flex-col relative bg-black border-gray-800 transition-all duration-500`}>

        {/* Top Control Bar */}
        <div className="absolute top-6 left-6 z-[100] flex items-center space-x-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-3 bg-[#00D4E4]/10 border border-[#00D4E4]/30 hover:bg-[#00D4E4]/20 text-[#00D4E4] rounded-lg transition-colors shadow-xl"
          >
            {isExpanded ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
          <button
            onClick={onMinimize}
            className="p-3 bg-[#00D4E4] hover:bg-[#00E8FA] text-white rounded-lg transition-colors shadow-xl"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
          <button
            onClick={onClose}
            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xl"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-3 bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 text-purple-400 rounded-lg transition-colors shadow-xl"
          >
            <History className="w-6 h-6" />
          </button>
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 backdrop-blur-md border-b bg-[#14191a] border-gray-800 z-10">
          <h1 className="text-2xl font-bold flex items-center space-x-3 text-white">
            <div className="w-8 h-8 rounded-full bg-[#00D4E4] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span>Multi-Voice Conversation</span>
          </h1>
        </div>

        {/* Wizard Navigation */}
        <div className="px-6 pt-6 z-10">
          <WizardNavigation
            steps={wizardSteps}
            currentStep={currentStep}
            onStepClick={(step) => {
              // Only allow navigation to completed steps
              if (step < currentStep) {
                setCurrentStep(step);
              }
            }}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto relative z-10 p-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="p-6 border-t border-gray-800 bg-[#14191a] flex justify-between items-center z-10">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              currentStep === 1
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <ArrowLeft size={20} />
            Previous
          </button>

          <div className="text-sm text-gray-400">
            Step {currentStep} of {wizardSteps.length}
          </div>

          <button
            onClick={() => {
              if (currentStep < wizardSteps.length) {
                setCurrentStep(currentStep + 1);
              }
            }}
            disabled={
              currentStep === wizardSteps.length ||
              (currentStep === 1 && !backendProcessedContent) ||
              (currentStep === 3 && !selectedStyle)
            }
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              currentStep === wizardSteps.length ||
              (currentStep === 1 && !backendProcessedContent) ||
              (currentStep === 3 && !selectedStyle)
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-[#00D4E4] hover:bg-[#00E8FA] text-white'
            }`}
          >
            {currentStep === wizardSteps.length ? 'Finish' : 'Next'}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

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
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 228, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 228, 0.7);
        }
      `}</style>
    </div>
  );
};

export default MultiVoiceConversationPanel;
