import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, FileText, ArrowRight, ArrowLeft, Sparkles, History, Minimize2, Maximize2, MessageCircle, List, Trash2 } from 'lucide-react';
import type { DocumentContent } from '../../types/document';
import { NarrationAPI } from '../../services/narrationApi';
import WizardNavigation from '../ui/WizardNavigation';
import PresetCard from '../ui/PresetCard';
import VoicePreview from '../voice/VoicePreview';
import EstimationPanel from '../ui/EstimationPanel';
import { ToastContainer, useToast } from '../ui/ToastNotification';
import GenerationHistory from '../ui/GenerationHistory';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';
import type { PresetConfig, HistoryItem } from '../../types/narration';
import GlassCard from '../ui/GlassCard';
import { narrationPresets, getRecommendedPreset } from '../../config/narrationPresets';
import { getAudioUrl } from '../../config/api';
import DocumentChatPanel from '../document/DocumentChatPanel';
import { PresetStorage, type CustomPreset } from '../../services/presetStorage';

interface QueueItem {
  id: string;
  documentContent: string;
  script?: string;
  preset: PresetConfig;
  voice: string;
  speed: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}

interface SingleVoiceNarrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedContent?: DocumentContent[] | null;
  uploadedFiles?: File[] | null;
  onMinimize?: () => void;
  isMinimized?: boolean;
  onAudioGenerated?: (audioData: any) => void;
}

const wizardSteps = [
  { id: 1, title: 'Upload', description: 'Add your document' },
  { id: 2, title: 'Choose Style', description: 'Pick a preset' },
  { id: 3, title: 'Customize', description: 'Fine-tune voice' },
  { id: 4, title: 'Preview Script', description: 'Review & edit' },
  { id: 5, title: 'Generate', description: 'Create audio' }
];

const SingleVoiceNarrationPanel: React.FC<SingleVoiceNarrationPanelProps> = ({
  isOpen,
  onClose,
  uploadedContent,
  uploadedFiles,
  onMinimize,
  isMinimized = false,
  onAudioGenerated
}) => {
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

  // Preset & Voice State
  const [selectedPreset, setSelectedPreset] = useState<PresetConfig | null>(null);
  const [customVoice, setCustomVoice] = useState<string | null>(null);
  const [customSpeed, setCustomSpeed] = useState<number>(1.0);

  // Advanced Audio State
  const [backgroundMusic, setBackgroundMusic] = useState<string>('none');
  const [musicVolume, setMusicVolume] = useState<number>(0.3);
  const [addIntroOutro, setAddIntroOutro] = useState<boolean>(false);
  const [pauseAtPunctuation, setPauseAtPunctuation] = useState<boolean>(false);
  const [pauseDuration, setPauseDuration] = useState<number>(0.3);

  // Script Preview State
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptWordCount, setScriptWordCount] = useState(0);

  // Script Variants State
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
  const [variantWordCounts, setVariantWordCounts] = useState<{
    original: number;
    shorter: number;
    casual: number;
    formal: number;
  }>({
    original: 0,
    shorter: 0,
    casual: 0,
    formal: 0
  });
  const [transformingVariant, setTransformingVariant] = useState<'shorter' | 'casual' | 'formal' | null>(null);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [currentAudio, setCurrentAudio] = useState<any>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // History State
  const [generationHistory, setGenerationHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Queue State
  const [generationQueue, setGenerationQueue] = useState<QueueItem[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Document Chat State
  const [showDocumentChat, setShowDocumentChat] = useState(false);

  // Voice Filters
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [voiceAccentFilter, setVoiceAccentFilter] = useState<'all' | 'American' | 'British' | 'Spanish'>('all');

  // Audio Preview State
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [showPreviewPlayer, setShowPreviewPlayer] = useState(false);

  // Custom Presets State
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  // Toast notifications
  const toast = useToast();

  // Load custom presets on mount
  useEffect(() => {
    const loaded = PresetStorage.getAll();
    setCustomPresets(loaded);
  }, []);

  // Auto-generate script when entering Step 4 without a script
  useEffect(() => {
    if (currentStep === 4 && !generatedScript && !isGeneratingScript && backendProcessedContent && selectedPreset) {
      // Automatically start script generation when Step 4 loads
      handleGenerateScript();
    }
  }, [currentStep]);

  // Save current settings as custom preset
  const handleSaveAsPreset = () => {
    if (!presetName.trim()) {
      toast.error('Name required', 'Please enter a preset name');
      return;
    }

    if (!selectedPreset) {
      toast.error('Settings required', 'Complete setup first');
      return;
    }

    const newPreset = PresetStorage.save({
      name: presetName.trim(),
      description: presetDescription.trim() || undefined,
      voice: customVoice || selectedPreset.voice,
      speed: customSpeed,
      backgroundMusic,
      musicVolume,
      addIntroOutro,
      pauseAtPunctuation,
      pauseDuration,
      podcastStyle: selectedPreset.podcastStyle,
      tags: [selectedPreset.name]
    });

    setCustomPresets([...customPresets, newPreset]);
    setPresetName('');
    setPresetDescription('');
    setShowPresetManager(false);
    toast.success('Preset saved!', `"${newPreset.name}" is ready to use`);
  };

  // Load a custom preset
  const handleLoadPreset = (preset: CustomPreset) => {
    setCustomVoice(preset.voice);
    setCustomSpeed(preset.speed);
    setBackgroundMusic(preset.backgroundMusic);
    setMusicVolume(preset.musicVolume);
    setAddIntroOutro(preset.addIntroOutro);
    setPauseAtPunctuation(preset.pauseAtPunctuation);
    setPauseDuration(preset.pauseDuration);
    toast.success('Preset loaded!', `Applied "${preset.name}" settings`);
  };

  // Delete a custom preset
  const handleDeletePreset = (id: string) => {
    if (PresetStorage.delete(id)) {
      setCustomPresets(customPresets.filter(p => p.id !== id));
      toast.success('Preset deleted', 'Removed from library');
    }
  };

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

  // AI Content Analysis
  const analyzeContent = (text: string) => {
    const words = text.toLowerCase();

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
    const avgWordLength = text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / wordCount;
    let readingLevel = 'General';
    let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
    if (avgWordLength < 5) {
      readingLevel = 'Easy';
      complexity = 'simple';
    } else if (avgWordLength > 7) {
      readingLevel = 'Advanced';
      complexity = 'complex';
    }

    // Extract topics (simple keyword extraction)
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

  // Process document through backend
  const processDocument = async (files?: File[]) => {
    const filesToProcess = files || uploadedFiles || internalUploadedFiles;
    if (!filesToProcess || filesToProcess.length === 0) return;

    setIsProcessingDocument(true);
    try {
      const response = await NarrationAPI.processDocument(filesToProcess[0]);

      if (response.success) {
        setBackendProcessedContent(response.document.text);
        setWordCount(response.document.analysis.wordCount);

        // Perform AI content analysis
        const analysis = analyzeContent(response.document.text);
        setContentAnalysis(analysis);

        // Auto-recommend preset based on content
        const recommended = getRecommendedPreset(
          response.document.analysis.contentType,
          response.document.analysis.wordCount
        );
        setSelectedPreset(recommended);
        setCustomSpeed(recommended.speed); // Initialize speed from preset

        toast.success('Document processed!', `${response.document.analysis.wordCount} words analyzed`);
        setShowDocumentChat(true); // Auto-open document chat
        setCurrentStep(2); // Auto-advance to preset selection
      }
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error('Processing failed', 'Please try uploading again');
    } finally {
      setIsProcessingDocument(false);
    }
  };

  // Calculate estimates
  const getEstimation = () => {
    const wordsPerMinute = 150;
    const words = scriptWordCount > 0 ? scriptWordCount : wordCount;
    const minutes = Math.ceil(words / wordsPerMinute);
    const seconds = words / (wordsPerMinute / 60);
    const duration = `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    const cost = `$${(words * 0.00002).toFixed(4)}`; // Rough estimate

    return { duration, cost };
  };

  // Generate audio preview
  const handleGeneratePreview = async () => {
    if (!backendProcessedContent || !selectedPreset) {
      toast.error('Missing information', 'Please complete previous steps');
      return;
    }

    setIsGeneratingPreview(true);
    toast.info('Generating preview...', '15-second sample with your settings');

    try {
      const response = await fetch('http://localhost:3004/api/narration/generate-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent: backendProcessedContent,
          voice: customVoice || selectedPreset.voice,
          speed: customSpeed,
          backgroundMusic: backgroundMusic !== 'none',
          musicType: backgroundMusic,
          musicVolume,
          podcastStyle: selectedPreset.podcastStyle
        }),
      });

      if (!response.ok) {
        throw new Error(`Preview failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.audioUrl) {
        setPreviewAudioUrl(`http://localhost:3004${result.audioUrl}`);
        setShowPreviewPlayer(true);
        toast.success('Preview ready!', 'Listen to your audio mix');
      } else {
        throw new Error('No preview audio URL returned');
      }
    } catch (error: any) {
      console.error('Preview generation error:', error);
      toast.error('Preview failed', error.message || 'Please try again');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Switch between script variants
  const handleSwitchVariant = (variant: 'original' | 'shorter' | 'casual' | 'formal') => {
    const script = scriptVariants[variant];
    if (!script) {
      toast.error('Variant not generated', `Please generate the ${variant} version first`);
      return;
    }

    setActiveVariant(variant);
    setGeneratedScript(script);
    setScriptWordCount(variantWordCounts[variant]);
    toast.info(`Switched to ${variant} version`, `${variantWordCounts[variant]} words`);
  };

  // Transform script using AI (shorter, casual, formal)
  const handleTransformScript = async (transformationType: 'shorter' | 'casual' | 'formal') => {
    if (!scriptVariants.original) {
      toast.error('No script to transform', 'Please generate the original script first');
      return;
    }

    setTransformingVariant(transformationType);
    toast.info(`Generating ${transformationType} version...`, 'Watch it appear in real-time!');

    try {
      const response = await fetch('http://localhost:3004/api/narration/transform-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalScript: scriptVariants.original,
          transformationType,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to transform script: ${response.statusText}`);
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
                // Final transformed script received
                const newWordCount = data.wordCount || data.fullScript.split(/\s+/).length;

                // Store the variant
                setScriptVariants(prev => ({
                  ...prev,
                  [transformationType]: data.fullScript
                }));

                setVariantWordCounts(prev => ({
                  ...prev,
                  [transformationType]: newWordCount
                }));

                // Switch to the new variant
                setActiveVariant(transformationType);
                setGeneratedScript(data.fullScript);
                setScriptWordCount(newWordCount);

                const reduction = transformationType === 'shorter'
                  ? ` (-${Math.round((1 - newWordCount / variantWordCounts.original) * 100)}%)`
                  : '';

                toast.success(`${transformationType} version ready!${reduction}`, 'Now viewing this variant');
              } else if (data.chunk) {
                // Stream chunk received (preview only, don't update main script yet)
                accumulatedScript += data.chunk;
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

  // Generate script only (without TTS) - WITH STREAMING
  const handleGenerateScript = async () => {
    if (!selectedPreset || !backendProcessedContent) {
      toast.error('Missing information', 'Please complete all steps');
      return;
    }

    setIsGeneratingScript(true);
    setGeneratedScript(''); // Clear previous script
    setGenerationStage('Initializing...');
    toast.info('Generating script...', 'Watch it appear in real-time!');

    try {
      const response = await fetch('http://localhost:3004/api/narration/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent: backendProcessedContent,
          narrationType: selectedPreset.narrationType,
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
                // Final script received - store as original variant
                setGeneratedScript(data.fullScript);
                setScriptWordCount(data.fullScript.split(/\s+/).length);

                // Store in variants
                setScriptVariants({
                  original: data.fullScript,
                  shorter: null,
                  casual: null,
                  formal: null
                });
                setActiveVariant('original');
                setVariantWordCounts({
                  original: data.fullScript.split(/\s+/).length,
                  shorter: 0,
                  casual: 0,
                  formal: 0
                });

                toast.success('Script generated!', 'Click Continue to preview and edit');
                // Don't auto-advance - let user click Next when ready
              } else if (data.chunk) {
                // Stream chunk received
                accumulatedScript += data.chunk;
                setGeneratedScript(accumulatedScript);
                setGenerationStage(data.stage || 'Generating...');
                setGenerationProgress(data.progress || 0);
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
      setGenerationProgress(0);
      setGenerationStage('');
    }
  };

  // Generate podcast with retry logic
  const handleGenerateWithRetry = async (maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await handleGenerate();
        return; // Success, exit retry loop
      } catch (error: any) {
        console.error(`❌ Generation attempt ${attempt} failed:`, error);

        // Check if it's a credit limit error (don't retry)
        if (error.message?.includes('credit limit') || error.message?.includes('402')) {
          toast.error('Credit limit reached', 'Please add credits at play.cartesia.ai');
          setIsGenerating(false);
          return;
        }

        // If this isn't the last attempt, wait and retry
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          toast.info(`Retry ${attempt}/${maxRetries}`, `Waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Last attempt failed
          toast.error('Generation failed', `Failed after ${maxRetries} attempts`);
          setIsGenerating(false);
        }
      }
    }
  };

  // Generate podcast
  const handleGenerate = async () => {
    if (!selectedPreset || (!backendProcessedContent && !generatedScript)) {
      toast.error('Missing information', 'Please complete all steps');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStage('Initializing...');
    toast.info('Generating podcast...', 'This may take 30-60 seconds');

    // Simulate progress stages
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 800);

    const stageTimeout1 = setTimeout(() => setGenerationStage('Processing document...'), 1000);
    const stageTimeout2 = setTimeout(() => setGenerationStage('Generating speech...'), 3000);
    const stageTimeout3 = setTimeout(() => setGenerationStage('Applying voice effects...'), 8000);
    const stageTimeout4 = setTimeout(() => setGenerationStage('Finalizing audio...'), 15000);

    try {
      // Use generated script if available, otherwise use document content
      const contentToNarrate = generatedScript || backendProcessedContent;

      const response = await NarrationAPI.generateNarration(
        contentToNarrate,
        selectedPreset.narrationType,
        customVoice || selectedPreset.voice,
        customSpeed,
        backgroundMusic !== 'none',
        backgroundMusic,
        selectedPreset.podcastStyle,
        {
          musicVolume,
          addIntroOutro,
          pauseAtPunctuation,
          pauseDuration
        }
      );

      clearInterval(progressInterval);
      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
      clearTimeout(stageTimeout3);
      clearTimeout(stageTimeout4);
      setGenerationProgress(100);
      setGenerationStage('Complete!');

      if (response.success && response.audioUrl) {
        const newHistoryItem: HistoryItem = {
          id: response.narrationId,
          title: getDocumentTitle(),
          voiceName: getVoiceName(),
          duration: getEstimation().duration,
          createdAt: new Date(),
          audioUrl: response.audioUrl,
          presetName: selectedPreset.name
        };

        setGenerationHistory(prev => [newHistoryItem, ...prev]);
        setCurrentAudio({
          id: response.narrationId,
          audioUrl: response.audioUrl,
          trackData: {
            title: getDocumentTitle(),
            artist: `${getVoiceName()} • IntelliCast AI`,
            duration: getEstimation().duration,
            artwork: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400",
            description: documentSummary
          }
        });
        setShowPlayer(true);

        toast.success('Podcast generated!', 'Ready to play');

        if (onAudioGenerated) {
          onAudioGenerated(newHistoryItem);
        }
      } else {
        throw new Error('Generation failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
      clearTimeout(stageTimeout3);
      clearTimeout(stageTimeout4);
      console.error('Generation error:', error);

      // Save generation state for recovery
      saveGenerationState();

      // Don't show error here - let retry logic handle it
      throw error; // Re-throw for retry logic
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStage('');
      }, 2000);
    }
  };

  // Save generation state for recovery
  const saveGenerationState = () => {
    try {
      localStorage.setItem('narration_draft', JSON.stringify({
        content: backendProcessedContent,
        script: generatedScript,
        preset: selectedPreset?.id,
        voice: customVoice,
        speed: customSpeed,
        backgroundMusic,
        musicVolume,
        addIntroOutro,
        pauseAtPunctuation,
        pauseDuration,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Failed to save state:', err);
    }
  };

  // Restore generation state
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('narration_draft');
      if (savedState) {
        const state = JSON.parse(savedState);
        // Only restore if saved within last hour
        if (Date.now() - state.timestamp < 3600000) {
          toast.info('Draft restored', 'Your previous work has been recovered');
        } else {
          localStorage.removeItem('narration_draft');
        }
      }
    } catch (err) {
      console.error('Failed to restore state:', err);
    }
  }, []);

  // Add to queue
  const addToQueue = (voiceId: string, speedValue: number) => {
    if (!selectedPreset || !backendProcessedContent) {
      toast.error('Missing information', 'Complete all steps first');
      return;
    }

    const queueItem: QueueItem = {
      id: `queue_${Date.now()}_${Math.random()}`,
      documentContent: backendProcessedContent,
      script: generatedScript,
      preset: selectedPreset,
      voice: voiceId,
      speed: speedValue,
      status: 'pending',
      timestamp: Date.now()
    };

    setGenerationQueue(prev => [...prev, queueItem]);
    toast.success('Added to queue', `${allVoices.find(v => v.id === voiceId)?.name} at ${speedValue}x speed`);
  };

  // Process queue
  const processQueue = async () => {
    if (isProcessingQueue) return;

    setIsProcessingQueue(true);
    toast.info('Processing queue', `${generationQueue.filter(i => i.status === 'pending').length} items`);

    for (const item of generationQueue.filter(i => i.status === 'pending')) {
      try {
        // Update status to processing
        setGenerationQueue(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'processing' as const } : i
        ));

        const contentToNarrate = item.script || item.documentContent;

        const response = await NarrationAPI.generateNarration(
          contentToNarrate,
          item.preset.narrationType,
          item.voice,
          item.speed,
          backgroundMusic !== 'none',
          backgroundMusic,
          item.preset.podcastStyle,
          {
            musicVolume,
            addIntroOutro,
            pauseAtPunctuation,
            pauseDuration
          }
        );

        if (response.success) {
          // Mark as completed
          setGenerationQueue(prev => prev.map(i =>
            i.id === item.id ? { ...i, status: 'completed' as const, result: response } : i
          ));

          // Add to history
          const newHistoryItem: HistoryItem = {
            id: response.narrationId,
            title: `${getDocumentTitle()} - ${allVoices.find(v => v.id === item.voice)?.name}`,
            voiceName: allVoices.find(v => v.id === item.voice)?.name || 'AI Voice',
            duration: getEstimation().duration,
            createdAt: new Date(),
            audioUrl: response.audioUrl,
            presetName: item.preset.name
          };
          setGenerationHistory(prev => [newHistoryItem, ...prev]);

          toast.success('Queue item completed', newHistoryItem.title);
        }
      } catch (error: any) {
        console.error('Queue item failed:', error);
        setGenerationQueue(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'failed' as const, error: error.message } : i
        ));
      }
    }

    setIsProcessingQueue(false);
    toast.success('Queue completed', 'All items processed');
  };

  // Helper functions
  const getDocumentTitle = () => {
    if (internalUploadedFiles?.[0]) return internalUploadedFiles[0].name.replace(/\.[^/.]+$/, '');
    if (uploadedFiles?.[0]) return uploadedFiles[0].name.replace(/\.[^/.]+$/, '');
    if (uploadedContent?.[0]) return uploadedContent[0].title || 'Document';
    return 'Podcast';
  };

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

  const getVoiceName = () => {
    const voiceId = customVoice || selectedPreset?.voice;
    return allVoices.find(v => v.id === voiceId)?.name || 'AI Voice';
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

  if (!isOpen) return null;

  // Render wizard steps
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
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

                {/* AI Content Analysis Badges */}
                {contentAnalysis && (
                  <div className="p-5 rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30">
                    <div className="flex items-center space-x-2 mb-3">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-semibold">AI Content Analysis</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Content Type Badge */}
                      <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                        <p className="text-xs text-gray-400 mb-1">Content Type</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">📚</span>
                          <span className="text-sm font-semibold text-white">{contentAnalysis.contentType}</span>
                        </div>
                      </div>

                      {/* Tone Badge */}
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

                      {/* Reading Level Badge */}
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

                      {/* Complexity Badge */}
                      <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                        <p className="text-xs text-gray-400 mb-1">Complexity</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">⚙️</span>
                          <span className="text-sm font-semibold text-white capitalize">{contentAnalysis.complexity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Key Topics */}
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

                {/* Document Preview */}
                <div className="p-6 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">Document Preview</h3>
                    <span className="text-xs text-gray-400">{Math.ceil(wordCount / 150)} min read</span>
                  </div>

                  <div id="document-text-display" className="relative max-h-40 overflow-y-auto custom-scrollbar">
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
                      <p className="text-2xl font-bold text-[#00D4E4]">{Math.ceil(wordCount / 5)}</p>
                      <p className="text-xs text-gray-400">Sentences</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00D4E4]">~{Math.ceil(wordCount / 150)}</p>
                      <p className="text-xs text-gray-400">Minutes</p>
                    </div>
                  </div>
                </div>

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
              </>
            )}
          </div>
        );

      case 2:
        // Get smart recommendation explanation
        const getRecommendationReason = (preset: PresetConfig) => {
          if (!contentAnalysis) return '';

          if (preset.id === 'news-brief' && contentAnalysis.contentType === 'News') {
            return '✨ Perfect match! Your content is news-focused and this preset delivers information quickly.';
          }
          if (preset.id === 'educational' && contentAnalysis.contentType === 'Educational') {
            return '✨ Recommended! Educational content works best with clear, patient delivery.';
          }
          if (preset.id === 'business-brief' && contentAnalysis.contentType === 'Business') {
            return '✨ Ideal choice! Business content benefits from confident, professional narration.';
          }
          if (preset.id === 'audiobook' && wordCount > 3000) {
            return '✨ Great for long content! Warm storytelling voice keeps listeners engaged.';
          }
          if (preset.id === 'podcast-conversational' && contentAnalysis.tone === 'Narrative') {
            return '✨ Perfect tone! Conversational style matches your narrative content.';
          }
          if (preset.id === 'meditation' && contentAnalysis.complexity === 'simple') {
            return '✨ Soothing match! Simple content with calming delivery creates relaxation.';
          }
          return '';
        };

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Style</h2>
              <p className="text-gray-400">AI-recommended presets based on your content</p>
            </div>

            {/* AI Recommendation Banner */}
            {selectedPreset && contentAnalysis && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-6 h-6 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-semibold mb-1">AI Recommendation</h3>
                    <p className="text-sm text-purple-200">
                      Based on your <span className="font-semibold">{contentAnalysis.contentType}</span> content with a{' '}
                      <span className="font-semibold">{contentAnalysis.tone}</span> tone, we recommend{' '}
                      <span className="font-semibold text-[#00D4E4]">{selectedPreset.name}</span>.
                    </p>
                    {getRecommendationReason(selectedPreset) && (
                      <p className="text-xs text-purple-300 mt-2">
                        {getRecommendationReason(selectedPreset)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {narrationPresets.map((preset) => {
                const reason = getRecommendationReason(preset);
                const isRecommended = reason.length > 0;

                return (
                  <div key={preset.id} className="relative">
                    {isRecommended && (
                      <div className="absolute -top-2 -right-2 z-10 px-2 py-1 rounded-full text-xs font-bold bg-purple-500 text-white shadow-lg border border-purple-300 animate-pulse">
                        ⭐ AI Pick
                      </div>
                    )}
                    <PresetCard
                      preset={preset}
                      isSelected={selectedPreset?.id === preset.id}
                      onSelect={() => setSelectedPreset(preset)}
                    />
                  </div>
                );
              })}
            </div>

            {selectedPreset && (
              <div className="flex items-center justify-center space-x-2 p-3 rounded-lg bg-[#00D4E4]/10 border border-[#00D4E4]/30">
                <Sparkles className="w-5 h-5 text-[#00D4E4]" />
                <span className="text-sm text-[#00D4E4] font-medium">
                  {selectedPreset.name} selected - Great choice!
                </span>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Customize Voice</h2>
              <p className="text-gray-400">Preview and adjust your voice settings</p>
            </div>

            {selectedPreset && (
              <>
                <VoicePreview
                  voiceId={customVoice || selectedPreset.voice}
                  voiceName={getVoiceName()}
                  voiceDescription="Neural AI Voice"
                  previewText={backendProcessedContent ?
                    backendProcessedContent.split(/\s+/).slice(0, 150).join(' ') + '...' :
                    undefined
                  }
                  podcastStyle={selectedPreset.podcastStyle}
                  speed={customSpeed}
                />

                {/* Live Preview Info */}
                <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                  <p className="text-xs text-blue-300 text-center">
                    💡 Tip: Preview updates automatically when you change voice or speed
                  </p>
                </div>
              </>
            )}

            <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Voice Options</h3>
                <span className="text-xs text-gray-400">{allVoices.filter(v =>
                  (voiceGenderFilter === 'all' || v.gender === voiceGenderFilter) &&
                  (voiceAccentFilter === 'all' || v.accent === voiceAccentFilter)
                ).length} voices</span>
              </div>

              {/* Voice Filters */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Gender Filter */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Gender</label>
                  <select
                    value={voiceGenderFilter}
                    onChange={(e) => setVoiceGenderFilter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-[#00D4E4]"
                  >
                    <option value="all">All Genders</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                {/* Accent Filter */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Accent</label>
                  <select
                    value={voiceAccentFilter}
                    onChange={(e) => setVoiceAccentFilter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-[#00D4E4]"
                  >
                    <option value="all">All Accents</option>
                    <option value="American">American</option>
                    <option value="British">British</option>
                    <option value="Spanish">Spanish</option>
                  </select>
                </div>
              </div>

              {/* Voice List */}
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {allVoices
                  .filter(v =>
                    (voiceGenderFilter === 'all' || v.gender === voiceGenderFilter) &&
                    (voiceAccentFilter === 'all' || v.accent === voiceAccentFilter)
                  )
                  .map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setCustomVoice(voice.id)}
                      className={`w-full p-3 rounded-lg border transition-all ${
                        (customVoice || selectedPreset?.voice) === voice.id
                          ? 'border-[#00D4E4] bg-[#00D4E4]/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="text-left flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-white font-medium">{voice.name}</p>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              voice.gender === 'female' ? 'bg-pink-500/20 text-pink-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {voice.gender === 'female' ? '♀' : '♂'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                              {voice.accent}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{voice.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Speed Control */}
            <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Playback Speed</h3>
                <span className="text-[#00D4E4] font-bold text-lg">{customSpeed.toFixed(1)}x</span>
              </div>

              <div className="space-y-4">
                {/* Speed Slider */}
                <div className="relative">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={customSpeed}
                    onChange={(e) => setCustomSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #00D4E4 0%, #00D4E4 ${((customSpeed - 0.5) / 1.5) * 100}%, #374151 ${((customSpeed - 0.5) / 1.5) * 100}%, #374151 100%)`
                    }}
                  />
                </div>

                {/* Speed Labels */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <button
                    onClick={() => setCustomSpeed(0.5)}
                    className={`px-3 py-1 rounded-md transition-all ${customSpeed === 0.5 ? 'bg-[#00D4E4]/20 text-[#00D4E4] border border-[#00D4E4]/30' : 'hover:text-white'}`}
                  >
                    0.5x Slow
                  </button>
                  <button
                    onClick={() => setCustomSpeed(1.0)}
                    className={`px-3 py-1 rounded-md transition-all ${customSpeed === 1.0 ? 'bg-[#00D4E4]/20 text-[#00D4E4] border border-[#00D4E4]/30' : 'hover:text-white'}`}
                  >
                    1.0x Normal
                  </button>
                  <button
                    onClick={() => setCustomSpeed(1.5)}
                    className={`px-3 py-1 rounded-md transition-all ${customSpeed === 1.5 ? 'bg-[#00D4E4]/20 text-[#00D4E4] border border-[#00D4E4]/30' : 'hover:text-white'}`}
                  >
                    1.5x Fast
                  </button>
                  <button
                    onClick={() => setCustomSpeed(2.0)}
                    className={`px-3 py-1 rounded-md transition-all ${customSpeed === 2.0 ? 'bg-[#00D4E4]/20 text-[#00D4E4] border border-[#00D4E4]/30' : 'hover:text-white'}`}
                  >
                    2.0x Very Fast
                  </button>
                </div>

                {/* Speed Info */}
                <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                  <p className="text-xs text-gray-400">
                    {customSpeed < 0.8 ? '🐢 Slower speeds are great for learning and comprehension' :
                     customSpeed > 1.3 ? '⚡ Faster speeds help you consume content quickly' :
                     '✨ Normal speed provides natural, conversational delivery'}
                  </p>
                </div>
              </div>

              <style>{`
                .slider-thumb::-webkit-slider-thumb {
                  appearance: none;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #00D4E4;
                  cursor: pointer;
                  box-shadow: 0 0 10px rgba(0, 212, 228, 0.5);
                  transition: all 0.2s;
                }
                .slider-thumb::-webkit-slider-thumb:hover {
                  transform: scale(1.2);
                  box-shadow: 0 0 15px rgba(0, 212, 228, 0.8);
                }
                .slider-thumb::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #00D4E4;
                  cursor: pointer;
                  border: none;
                  box-shadow: 0 0 10px rgba(0, 212, 228, 0.5);
                  transition: all 0.2s;
                }
                .slider-thumb::-moz-range-thumb:hover {
                  transform: scale(1.2);
                  box-shadow: 0 0 15px rgba(0, 212, 228, 0.8);
                }
              `}</style>
            </div>

            {/* Advanced Audio Controls */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border border-orange-500/30">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <h3 className="text-white font-semibold">Advanced Audio Features</h3>
              </div>

              {/* Background Music Selection */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 font-medium mb-2 block">Background Music</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'none', name: 'No Music', emoji: '🔇', desc: 'Pure voice' },
                      { id: 'ambient', name: 'Ambient', emoji: '🌊', desc: 'Calm & Peaceful' },
                      { id: 'upbeat', name: 'Upbeat', emoji: '⚡', desc: 'Energetic' },
                      { id: 'classical', name: 'Classical', emoji: '🎼', desc: 'Sophisticated' },
                      { id: 'lo-fi', name: 'Lo-Fi', emoji: '☕', desc: 'Chill Beats' },
                      { id: 'nature', name: 'Nature', emoji: '🌿', desc: 'Natural Sounds' }
                    ].map((music) => (
                      <button
                        key={music.id}
                        onClick={() => setBackgroundMusic(music.id)}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          backgroundMusic === music.id
                            ? 'border-orange-400 bg-orange-400/20'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{music.emoji}</span>
                          <span className="text-sm font-semibold text-white">{music.name}</span>
                        </div>
                        <p className="text-xs text-gray-400">{music.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Music Volume */}
                {backgroundMusic !== 'none' && (
                  <div className="p-4 rounded-lg bg-black/30 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300 font-medium">Music Volume</label>
                      <span className="text-xs text-orange-400 font-bold">{Math.round(musicVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                      style={{
                        background: `linear-gradient(to right, #FB923C 0%, #FB923C ${musicVolume * 100}%, #374151 ${musicVolume * 100}%, #374151 100%)`
                      }}
                    />
                  </div>
                )}

                {/* Intro/Outro Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-gray-700/50">
                  <div>
                    <p className="text-sm font-medium text-white">Add Intro/Outro Music</p>
                    <p className="text-xs text-gray-400">5-second musical bookends</p>
                  </div>
                  <button
                    onClick={() => setAddIntroOutro(!addIntroOutro)}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      addIntroOutro ? 'bg-orange-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                        addIntroOutro ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Pause Controls */}
                <div className="space-y-3 p-4 rounded-lg bg-black/30 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Smart Pauses</p>
                      <p className="text-xs text-gray-400">Add natural pauses at punctuation</p>
                    </div>
                    <button
                      onClick={() => setPauseAtPunctuation(!pauseAtPunctuation)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        pauseAtPunctuation ? 'bg-orange-500' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                          pauseAtPunctuation ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {pauseAtPunctuation && (
                    <div className="pt-2 border-t border-gray-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-300">Pause Duration</label>
                        <span className="text-xs text-orange-400 font-bold">{pauseDuration.toFixed(1)}s</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={pauseDuration}
                        onChange={(e) => setPauseDuration(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                        style={{
                          background: `linear-gradient(to right, #FB923C 0%, #FB923C ${(pauseDuration / 1.0) * 100}%, #374151 ${(pauseDuration / 1.0) * 100}%, #374151 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Quick</span>
                        <span>Natural</span>
                        <span>Dramatic</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio Preview Button */}
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <button
                    onClick={handleGeneratePreview}
                    disabled={isGeneratingPreview || !backendProcessedContent}
                    className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isGeneratingPreview ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Preview...</span>
                      </>
                    ) : (
                      <>
                        <span>🎧</span>
                        <span>Preview Voice + Speed (15s sample)</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Hear how your voice and speed settings sound (music mixing coming soon!)
                  </p>
                </div>

                {/* Preview Audio Player */}
                {showPreviewPlayer && previewAudioUrl && (
                  <div className="mt-4 p-4 rounded-lg bg-black/40 border border-orange-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-orange-400">🎧 Preview Audio</span>
                      <button
                        onClick={() => {
                          setShowPreviewPlayer(false);
                          setPreviewAudioUrl(null);
                        }}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Close
                      </button>
                    </div>
                    <audio
                      src={previewAudioUrl}
                      controls
                      autoPlay
                      className="w-full"
                      style={{
                        height: '40px',
                        borderRadius: '8px'
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      15-second preview of your voice + speed settings
                    </p>
                  </div>
                )}

                {/* Save as Custom Preset */}
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <button
                    onClick={() => setShowPresetManager(!showPresetManager)}
                    className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all flex items-center justify-center space-x-2"
                  >
                    <span>💾</span>
                    <span>{showPresetManager ? 'Cancel' : 'Save as Custom Preset'}</span>
                  </button>
                </div>

                {/* Preset Save Form */}
                {showPresetManager && (
                  <div className="mt-4 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30 space-y-3">
                    <div>
                      <label className="text-sm text-gray-300 mb-1 block">Preset Name *</label>
                      <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="e.g., My Business Voice"
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-300 mb-1 block">Description (optional)</label>
                      <textarea
                        value={presetDescription}
                        onChange={(e) => setPresetDescription(e.target.value)}
                        placeholder="Professional voice for corporate content"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveAsPreset}
                      disabled={!presetName.trim()}
                      className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      💾 Save Preset
                    </button>
                  </div>
                )}

                {/* Custom Presets Library */}
                {customPresets.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
                    <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center space-x-2">
                      <span>📚</span>
                      <span>My Custom Presets ({customPresets.length})</span>
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {customPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="p-3 rounded-lg bg-black/40 border border-gray-700 hover:border-purple-500/50 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="text-sm font-semibold text-white">{preset.name}</h5>
                              {preset.description && (
                                <p className="text-xs text-gray-400 mt-1">{preset.description}</p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-xs px-2 py-0.5 rounded bg-purple-600/30 text-purple-300">
                                  Speed: {preset.speed}x
                                </span>
                                {preset.backgroundMusic !== 'none' && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-orange-600/30 text-orange-300">
                                    Music: {preset.backgroundMusic}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-3">
                              <button
                                onClick={() => handleLoadPreset(preset)}
                                className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all"
                                title="Load this preset"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleDeletePreset(preset.id)}
                                className="px-2 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs transition-all"
                                title="Delete preset"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Preview & Edit Script</h2>
              <p className="text-gray-400">Review the generated script and make any edits before creating audio</p>
            </div>

            {!generatedScript && !isGeneratingScript ? (
              <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                <h3 className="text-xl font-bold text-white mb-2">Generate Your Script</h3>
                <p className="text-gray-300 mb-6">
                  Our AI will create a narration script based on your document and chosen style.
                </p>
                <button
                  onClick={handleGenerateScript}
                  className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all flex items-center space-x-2 mx-auto"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Script</span>
                </button>
              </div>
            ) : isGeneratingScript ? (
              <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Generating Script...</h3>
                  <p className="text-purple-300 text-sm">{generationStage}</p>
                </div>

                {/* Progress Bar */}
                {generationProgress > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Progress</span>
                      <span className="text-sm font-bold text-purple-400">{Math.round(generationProgress)}%</span>
                    </div>
                    <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 rounded-full"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Script Preview */}
                {generatedScript && (
                  <div className="p-4 rounded-lg bg-black/30 border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-2">Script Preview (streaming...)</p>
                    <div className="text-sm text-gray-300 font-mono leading-relaxed max-h-40 overflow-y-auto">
                      {generatedScript}
                      <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Variant Selector Tabs */}
                {(scriptVariants.original || scriptVariants.shorter || scriptVariants.casual || scriptVariants.formal) && (
                  <div className="flex items-center space-x-2 mb-4">
                    <p className="text-xs text-gray-400 mr-2">Script Variants:</p>
                    {scriptVariants.original && (
                      <button
                        onClick={() => handleSwitchVariant('original')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeVariant === 'original'
                            ? 'bg-[#00D4E4] text-black shadow-lg shadow-[#00D4E4]/30'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                        }`}
                      >
                        Original ({variantWordCounts.original}w)
                      </button>
                    )}
                    {scriptVariants.shorter && (
                      <button
                        onClick={() => handleSwitchVariant('shorter')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeVariant === 'shorter'
                            ? 'bg-[#00D4E4] text-black shadow-lg shadow-[#00D4E4]/30'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                        }`}
                      >
                        Shorter ({variantWordCounts.shorter}w, -{Math.round((1 - variantWordCounts.shorter / variantWordCounts.original) * 100)}%)
                      </button>
                    )}
                    {scriptVariants.casual && (
                      <button
                        onClick={() => handleSwitchVariant('casual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeVariant === 'casual'
                            ? 'bg-[#00D4E4] text-black shadow-lg shadow-[#00D4E4]/30'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                        }`}
                      >
                        Casual ({variantWordCounts.casual}w)
                      </button>
                    )}
                    {scriptVariants.formal && (
                      <button
                        onClick={() => handleSwitchVariant('formal')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeVariant === 'formal'
                            ? 'bg-[#00D4E4] text-black shadow-lg shadow-[#00D4E4]/30'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                        }`}
                      >
                        Formal ({variantWordCounts.formal}w)
                      </button>
                    )}
                  </div>
                )}

                {/* Script Editor */}
                <div className="p-6 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">
                      Generated Script
                      {activeVariant !== 'original' && (
                        <span className="ml-2 text-xs text-[#00D4E4]">({activeVariant})</span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-400">
                        {scriptWordCount} words • ~{Math.ceil(scriptWordCount / 150)} min
                      </span>
                      <button
                        onClick={() => {
                          setGeneratedScript('');
                          setScriptWordCount(0);
                          setScriptVariants({
                            original: null,
                            shorter: null,
                            casual: null,
                            formal: null
                          });
                          setActiveVariant('original');
                        }}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Regenerate All
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={generatedScript}
                    onChange={(e) => {
                      const newScript = e.target.value;
                      const newWordCount = newScript.split(/\s+/).length;

                      setGeneratedScript(newScript);
                      setScriptWordCount(newWordCount);

                      // Update the active variant when manually edited
                      setScriptVariants(prev => ({
                        ...prev,
                        [activeVariant]: newScript
                      }));
                      setVariantWordCounts(prev => ({
                        ...prev,
                        [activeVariant]: newWordCount
                      }));
                    }}
                    className="w-full h-96 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D4E4] transition-colors resize-none font-mono text-sm leading-relaxed"
                    placeholder="Your generated script will appear here..."
                  />

                  <div className="mt-3 p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                    <p className="text-xs text-blue-300">
                      💡 Tip: Edit the script to adjust tone, add pauses, or emphasize key points
                    </p>
                  </div>
                </div>

                {/* Script Actions - AI-Powered Transformations */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleTransformScript('shorter')}
                    disabled={transformingVariant === 'shorter' || !scriptVariants.original}
                    className={`p-3 rounded-lg border text-white transition-all relative ${
                      activeVariant === 'shorter'
                        ? 'bg-[#00D4E4]/20 border-[#00D4E4] shadow-lg shadow-[#00D4E4]/20'
                        : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                    } ${transformingVariant === 'shorter' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {scriptVariants.shorter && activeVariant === 'shorter' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2 h-2 rounded-full bg-[#00D4E4]"></div>
                      </div>
                    )}
                    <p className="font-semibold text-sm">
                      {transformingVariant === 'shorter' ? '🤖 Generating...' : scriptVariants.shorter ? '✓ Make Shorter' : 'Make Shorter'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {scriptVariants.shorter
                        ? `${variantWordCounts.shorter} words (-${Math.round((1 - variantWordCounts.shorter / variantWordCounts.original) * 100)}%)`
                        : 'AI condenses to ~70%'}
                    </p>
                  </button>
                  <button
                    onClick={() => handleTransformScript('casual')}
                    disabled={transformingVariant === 'casual' || !scriptVariants.original}
                    className={`p-3 rounded-lg border text-white transition-all relative ${
                      activeVariant === 'casual'
                        ? 'bg-[#00D4E4]/20 border-[#00D4E4] shadow-lg shadow-[#00D4E4]/20'
                        : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                    } ${transformingVariant === 'casual' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {scriptVariants.casual && activeVariant === 'casual' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2 h-2 rounded-full bg-[#00D4E4]"></div>
                      </div>
                    )}
                    <p className="font-semibold text-sm">
                      {transformingVariant === 'casual' ? '🤖 Generating...' : scriptVariants.casual ? '✓ More Casual' : 'More Casual'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {scriptVariants.casual ? `${variantWordCounts.casual} words` : 'AI rewrites conversationally'}
                    </p>
                  </button>
                  <button
                    onClick={() => handleTransformScript('formal')}
                    disabled={transformingVariant === 'formal' || !scriptVariants.original}
                    className={`p-3 rounded-lg border text-white transition-all relative ${
                      activeVariant === 'formal'
                        ? 'bg-[#00D4E4]/20 border-[#00D4E4] shadow-lg shadow-[#00D4E4]/20'
                        : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                    } ${transformingVariant === 'formal' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {scriptVariants.formal && activeVariant === 'formal' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2 h-2 rounded-full bg-[#00D4E4]"></div>
                      </div>
                    )}
                    <p className="font-semibold text-sm">
                      {transformingVariant === 'formal' ? '🤖 Generating...' : scriptVariants.formal ? '✓ More Formal' : 'More Formal'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {scriptVariants.formal ? `${variantWordCounts.formal} words` : 'AI rewrites professionally'}
                    </p>
                  </button>
                </div>
              </>
            )}
          </div>
        );

      case 5:
        const estimates = getEstimation();
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Generate</h2>
              <p className="text-gray-400">Review and create your podcast</p>
            </div>

            <EstimationPanel
              wordCount={scriptWordCount > 0 ? scriptWordCount : wordCount}
              estimatedDuration={estimates.duration}
              estimatedCost={estimates.cost}
              voiceName={getVoiceName()}
              quality="premium"
              onGenerate={() => {
                handleGenerateWithRetry().catch(err => {
                  console.error('Generation error:', err);
                });
              }}
              isGenerating={isGenerating}
            />

            {/* Audio Settings Summary */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700">
              <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#00D4E4]" />
                <span>Your Podcast Configuration</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Voice */}
                <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">Voice</p>
                  <p className="text-sm font-semibold text-white">{getVoiceName()}</p>
                </div>

                {/* Speed */}
                <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">Speed</p>
                  <p className="text-sm font-semibold text-white">{customSpeed.toFixed(1)}x</p>
                </div>

                {/* Background Music */}
                <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">Background Music</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {backgroundMusic === 'none' ? 'No Music' : backgroundMusic}
                    {backgroundMusic !== 'none' && <span className="text-xs text-gray-400 ml-1">({Math.round(musicVolume * 100)}%)</span>}
                  </p>
                </div>

                {/* Extras */}
                <div className="p-3 rounded-lg bg-black/30 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">Extras</p>
                  <div className="flex flex-wrap gap-1">
                    {addIntroOutro && (
                      <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        Intro/Outro
                      </span>
                    )}
                    {pauseAtPunctuation && (
                      <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        Smart Pauses
                      </span>
                    )}
                    {!addIntroOutro && !pauseAtPunctuation && (
                      <span className="text-xs text-gray-500">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Preset Info */}
              {selectedPreset && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedPreset.color}40` }}>
                      <selectedPreset.icon className="w-4 h-4" style={{ color: selectedPreset.color }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Using Preset</p>
                      <p className="text-sm font-semibold text-white">{selectedPreset.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPreset.tags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="px-2 py-0.5 rounded text-xs bg-[#00D4E4]/20 text-[#00D4E4] border border-[#00D4E4]/30">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Generation Progress Indicator */}
            {isGenerating && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-[#00D4E4]/30 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#00D4E4]/5 via-[#00D4E4]/10 to-[#00D4E4]/5 animate-pulse" />

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Generating Your Podcast</h3>
                    <span className="text-[#00D4E4] font-bold text-xl">{Math.round(generationProgress)}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00D4E4] to-[#00E8FA] transition-all duration-500 rounded-full"
                      style={{ width: `${generationProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>

                  {/* Current Stage */}
                  <div className="flex items-center space-x-3 p-4 rounded-xl bg-black/30 border border-[#00D4E4]/20">
                    <div className="w-8 h-8 rounded-full border-2 border-[#00D4E4] border-t-transparent animate-spin" />
                    <div>
                      <p className="text-sm font-semibold text-white">{generationStage}</p>
                      <p className="text-xs text-gray-400">Please wait while we process your content</p>
                    </div>
                  </div>
                </div>

                <style>{`
                  @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                  .animate-shimmer {
                    animation: shimmer 2s infinite;
                  }
                `}</style>
              </div>
            )}

            {showPlayer && currentAudio && (
              <GlassCard variant="dark" className="p-6">
                <ModernAudioPlayer
                  audioUrl={getAudioUrl(currentAudio.audioUrl, 'node')}
                  trackData={currentAudio.trackData}
                  isMinimized={false}
                  onToggleMinimize={() => setShowPlayer(false)}
                  onClose={() => setShowPlayer(false)}
                />
              </GlassCard>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemoveToast={toast.removeToast} />

      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

        <div className={`${isExpanded ? 'w-3/4' : 'w-1/2'} bg-black border-l border-[#00D4E4]/30 shadow-2xl flex transition-all duration-300`}>
          {/* Document Chat Panel (Left Side) */}
          {showDocumentChat && backendProcessedContent && (
            <div className="w-96 border-r border-gray-700">
              <DocumentChatPanel
                documentContent={backendProcessedContent}
                documentTitle={getDocumentTitle()}
                documentSummary={documentSummary}
                onHighlightText={(position) => {
                  // Find document viewer and scroll to highlighted text
                  const viewerElement = document.getElementById('document-text-display');
                  if (viewerElement) {
                    // Scroll to approximate position
                    const scrollPercentage = position / backendProcessedContent.length;
                    const scrollPosition = viewerElement.scrollHeight * scrollPercentage;

                    viewerElement.scrollTo({
                      top: Math.max(0, scrollPosition - 100),
                      behavior: 'smooth'
                    });

                    // Flash highlight effect
                    const highlightOverlay = document.createElement('div');
                    highlightOverlay.style.position = 'absolute';
                    highlightOverlay.style.left = '0';
                    highlightOverlay.style.right = '0';
                    highlightOverlay.style.height = '100px';
                    highlightOverlay.style.top = `${scrollPosition}px`;
                    highlightOverlay.style.background = 'linear-gradient(90deg, rgba(0,212,228,0.3), rgba(0,232,250,0.3))';
                    highlightOverlay.style.pointerEvents = 'none';
                    highlightOverlay.style.transition = 'opacity 0.5s';
                    highlightOverlay.style.zIndex = '10';

                    viewerElement.style.position = 'relative';
                    viewerElement.appendChild(highlightOverlay);

                    // Fade out and remove
                    setTimeout(() => {
                      highlightOverlay.style.opacity = '0';
                      setTimeout(() => highlightOverlay.remove(), 500);
                    }, 2000);
                  }
                }}
              />
            </div>
          )}

          {/* Queue Sidebar */}
          {showQueue && (
            <div className="w-80 border-r border-gray-700 bg-gray-900">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold flex items-center space-x-2">
                    <List className="w-5 h-5 text-purple-400" />
                    <span>Queue ({generationQueue.length})</span>
                  </h3>
                  {generationQueue.filter(i => i.status === 'pending').length > 0 && (
                    <button
                      onClick={processQueue}
                      disabled={isProcessingQueue}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium disabled:opacity-50"
                    >
                      {isProcessingQueue ? 'Processing...' : 'Process All'}
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {generationQueue.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No items in queue</p>
                    <p className="text-xs mt-1">Add voice variations to batch process</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {generationQueue.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${
                          item.status === 'completed' ? 'bg-green-900/20 border-green-500/30' :
                          item.status === 'processing' ? 'bg-blue-900/20 border-blue-500/30' :
                          item.status === 'failed' ? 'bg-red-900/20 border-red-500/30' :
                          'bg-gray-800 border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">
                              {allVoices.find(v => v.id === item.voice)?.name}
                            </p>
                            <p className="text-xs text-gray-400">{item.speed}x speed • {item.preset.name}</p>
                          </div>
                          <button
                            onClick={() => setGenerationQueue(prev => prev.filter(i => i.id !== item.id))}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded inline-block ${
                          item.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          item.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
                          item.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </div>
                        {item.error && (
                          <p className="text-xs text-red-400 mt-1">{item.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Sidebar */}
          {showHistory && (
            <div className="w-80 border-r border-gray-700 bg-gray-900">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-bold flex items-center space-x-2">
                  <History className="w-5 h-5 text-[#00D4E4]" />
                  <span>History</span>
                </h3>
              </div>
              <GenerationHistory
                history={generationHistory}
                onPlay={(item) => {
                  setCurrentAudio({
                    audioUrl: item.audioUrl,
                    trackData: {
                      title: item.title,
                      artist: item.voiceName,
                      duration: item.duration
                    }
                  });
                  setShowPlayer(true);
                }}
                onDownload={(item) => {
                  const link = document.createElement('a');
                  link.href = getAudioUrl(item.audioUrl, 'node');
                  link.download = `${item.title}.mp3`;
                  link.click();
                }}
                onDelete={(id) => {
                  setGenerationHistory(prev => prev.filter(item => item.id !== id));
                  toast.success('Deleted', 'Item removed from history');
                }}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Single Voice Narration</h1>
              <div className="flex items-center space-x-2">
                {backendProcessedContent && (
                  <button
                    onClick={() => setShowDocumentChat(!showDocumentChat)}
                    className={`p-2 rounded-lg transition-colors ${
                      showDocumentChat
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                    title="Toggle Document Chat"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`p-2 rounded-lg transition-colors relative ${
                    showQueue
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                  title="Toggle Queue"
                >
                  <List className="w-5 h-5" />
                  {generationQueue.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
                      {generationQueue.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                  title="Toggle History"
                >
                  <History className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                >
                  {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Wizard Navigation */}
            <div className="p-6 border-b border-gray-700">
              <WizardNavigation
                steps={wizardSteps}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
                allowClickNavigation={true}
              />
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="p-6 border-t border-gray-700 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="px-6 py-3 rounded-lg border border-gray-600 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>

              {currentStep < 5 && (
                <button
                  onClick={() => {
                    setCurrentStep(prev => Math.min(5, prev + 1));
                  }}
                  disabled={
                    (currentStep === 1 && !backendProcessedContent) ||
                    (currentStep === 2 && !selectedPreset) ||
                    (currentStep === 3 && isGeneratingScript) ||
                    (currentStep === 4 && !generatedScript)
                  }
                  className="px-6 py-3 rounded-lg bg-[#00D4E4] hover:bg-[#00E8FA] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SingleVoiceNarrationPanel;
