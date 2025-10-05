import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, FileText, ArrowRight, ArrowLeft, Sparkles, History, Minimize2, Maximize2, MessageCircle } from 'lucide-react';
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
  { id: 4, title: 'Generate', description: 'Create podcast' }
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

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [currentAudio, setCurrentAudio] = useState<any>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // History State
  const [generationHistory, setGenerationHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Document Chat State
  const [showDocumentChat, setShowDocumentChat] = useState(false);

  // Toast notifications
  const toast = useToast();

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
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    const seconds = wordCount / (wordsPerMinute / 60);
    const duration = `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    const cost = `$${(wordCount * 0.00002).toFixed(4)}`; // Rough estimate

    return { duration, cost };
  };

  // Generate podcast
  const handleGenerate = async () => {
    if (!selectedPreset || !backendProcessedContent) {
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
      const response = await NarrationAPI.generateNarration(
        backendProcessedContent,
        selectedPreset.narrationType,
        customVoice || selectedPreset.voice,
        customSpeed, // Use custom speed instead of preset speed
        false,
        'none',
        selectedPreset.podcastStyle
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
      toast.error('Generation failed', 'Please try again');
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
    return 'Podcast';
  };

  const getVoiceName = () => {
    const voices = [
      { id: '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', name: 'Linda' },
      { id: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b', name: 'Brooke' },
      { id: 'f786b574-daa5-4673-aa0c-cbe3e8534c02', name: 'Katie' },
      { id: '694f9389-aac1-45b6-b726-9d9369183238', name: 'Sarah' },
      { id: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', name: 'Blake' }
    ];
    const voiceId = customVoice || selectedPreset?.voice;
    return voices.find(v => v.id === voiceId)?.name || 'AI Voice';
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
              <h3 className="text-white font-semibold mb-4">Voice Options</h3>
              <div className="space-y-3">
                {[
                  { id: '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', name: 'Linda', desc: 'Professional & Clear' },
                  { id: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b', name: 'Brooke', desc: 'Friendly & Approachable' },
                  { id: 'f786b574-daa5-4673-aa0c-cbe3e8534c02', name: 'Katie', desc: 'Young & Energetic' },
                  { id: '694f9389-aac1-45b6-b726-9d9369183238', name: 'Sarah', desc: 'Calm & Soothing' }
                ].map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setCustomVoice(voice.id)}
                    className={`w-full p-3 rounded-lg border transition-all ${
                      (customVoice || selectedPreset?.voice) === voice.id
                        ? 'border-[#00D4E4] bg-[#00D4E4]/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-white font-medium">{voice.name}</p>
                      <p className="text-xs text-gray-400">{voice.desc}</p>
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
              </div>
            </div>
          </div>
        );

      case 4:
        const estimates = getEstimation();
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Generate</h2>
              <p className="text-gray-400">Review and create your podcast</p>
            </div>

            <EstimationPanel
              wordCount={wordCount}
              estimatedDuration={estimates.duration}
              estimatedCost={estimates.cost}
              voiceName={getVoiceName()}
              quality="premium"
              onGenerate={handleGenerate}
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
              />
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

              {currentStep < 4 && (
                <button
                  onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
                  disabled={
                    (currentStep === 1 && !backendProcessedContent) ||
                    (currentStep === 2 && !selectedPreset)
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
