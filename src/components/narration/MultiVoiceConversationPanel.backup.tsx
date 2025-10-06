import React, { useState, useCallback, useEffect } from 'react';
import { X, Users, Minimize2, ChevronDown, Settings, Sparkles, FileText, Upload, Play, Download, Mic, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import GlassCard from '../ui/GlassCard';
import { NarrationAPI } from '../../services/narrationApi';
import { useTheme } from '../../contexts/ThemeContext';
import { getPodcastDownloadUrl } from '../../config/api';
import type { DocumentContent } from '../../types/document';

interface MultiVoiceConversationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedContent?: DocumentContent[] | null;
  uploadedFiles?: File[] | null;
  onMinimize?: () => void;
  isMinimized?: boolean;
}

const MultiVoiceConversationPanel: React.FC<MultiVoiceConversationPanelProps> = ({
  isOpen,
  onClose,
  uploadedContent,
  uploadedFiles,
  onMinimize,
  isMinimized = false
}) => {
  const { theme } = useTheme();
  const [selectedStyle, setSelectedStyle] = useState('conversational');
  const [numberOfSpeakers, setNumberOfSpeakers] = useState(2);
  const [conversationTone, setConversationTone] = useState('friendly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [internalUploadedFiles, setInternalUploadedFiles] = useState<File[] | null>(null);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [backendProcessedContent, setBackendProcessedContent] = useState<string>('');
  const [documentSummary, setDocumentSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryType, setSummaryType] = useState<'quick' | 'detailed' | 'full'>('detailed');
  const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);
  const [podcastMetadata, setPodcastMetadata] = useState<any>(null);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  const [isAnalyzingContent, setIsAnalyzingContent] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const podcastStyles = [
    {
      id: 'conversational',
      name: 'Conversational Chat',
      description: 'Friendly, casual discussion between hosts',
      icon: '💬',
    },
    {
      id: 'expert-panel',
      name: 'Expert Panel',
      description: 'Professional analysis with expert perspectives',
      icon: '🎓',
    },
    {
      id: 'debate',
      name: 'Debate Style',
      description: 'Opposing viewpoints and critical discussion',
      icon: '⚖️',
    },
    {
      id: 'interview',
      name: 'Interview Format',
      description: 'Host interviewing an expert guest',
      icon: '🎙️',
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

  // Handle file drop for internal uploads
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setInternalUploadedFiles(acceptedFiles);
      processDocumentThroughBackend(acceptedFiles);
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
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  // Process document through backend API
  const processDocumentThroughBackend = async (filesToProcess?: File[]) => {
    const files = filesToProcess || uploadedFiles || internalUploadedFiles;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    setIsProcessingDocument(true);

    try {
      const response = await NarrationAPI.processDocument(file);

      if (response.success) {
        setBackendProcessedContent(response.document.text);
        return response.document.text;
      } else {
        console.error('Backend processing failed:', response);
        return null;
      }
    } catch (error) {
      console.error('Error processing document through backend:', error);
      return null;
    } finally {
      setIsProcessingDocument(false);
    }
  };

  // Generate AI summary from uploaded content
  const generateDocumentSummary = async () => {
    let content = '';

    // First try to get content from backend processing
    if (internalUploadedFiles && internalUploadedFiles.length > 0) {
      if (!backendProcessedContent) {
        content = await processDocumentThroughBackend(internalUploadedFiles) || '';
      } else {
        content = backendProcessedContent;
      }
    } else if (uploadedFiles && uploadedFiles.length > 0) {
      if (!backendProcessedContent) {
        content = await processDocumentThroughBackend() || '';
      } else {
        content = backendProcessedContent;
      }
    }
    // Fallback to frontend processed content if backend fails
    else if (uploadedContent && uploadedContent.length > 0) {
      content = uploadedContent[0].content;
    }

    if (!content) {
      setDocumentSummary('Processing your document... Please wait while we extract the content.');
      // Try processing again after a brief delay
      setTimeout(async () => {
        if (internalUploadedFiles || uploadedFiles) {
          const retryContent = await processDocumentThroughBackend();
          if (retryContent) {
            setBackendProcessedContent(retryContent);
            generateDocumentSummary();
          } else {
            setDocumentSummary('Unable to process document. Please try uploading again or use a different file format.');
          }
        }
      }, 1000);
      return;
    }

    // Handle different summary types
    if (summaryType === 'full') {
      setDocumentSummary(content);
      return;
    }

    setIsLoadingSummary(true);
    try {
      const response = await NarrationAPI.generateDocumentSummary(content, summaryType);

      if (response.success) {
        setDocumentSummary(response.summary);
      } else {
        setDocumentSummary('Failed to generate summary. Please try again.');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setDocumentSummary('Error generating summary. Please check your connection.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Get document summary for display
  const getDocumentSummary = () => {
    if ((!uploadedContent || uploadedContent.length === 0) &&
        (!uploadedFiles || uploadedFiles.length === 0) &&
        (!internalUploadedFiles || internalUploadedFiles.length === 0)) {
      return "No document uploaded. Please upload a document to see the summary.";
    }

    if (isProcessingDocument) {
      return "Processing document through backend...";
    }

    if (isLoadingSummary) {
      return "Generating AI summary...";
    }

    if (documentSummary) {
      return documentSummary;
    }

    return "Click 'Generate Summary' to see an AI-generated summary of your document.";
  };

  // Get document title
  const getDocumentTitle = () => {
    if (uploadedContent && uploadedContent.length > 0) {
      return uploadedContent[0].metadata?.fileName || uploadedContent[0].title || 'Document';
    }
    if (internalUploadedFiles && internalUploadedFiles.length > 0) {
      return internalUploadedFiles[0].name.replace(/\.[^/.]+$/, '') || 'Document';
    }
    if (uploadedFiles && uploadedFiles.length > 0) {
      return uploadedFiles[0].name.replace(/\.[^/.]+$/, '') || 'Document';
    }
    return 'Document';
  };

  // Get AI recommendation for podcast style
  const getAiStyleRecommendation = async () => {
    let content = '';

    if (backendProcessedContent) {
      content = backendProcessedContent;
    } else if (uploadedContent && uploadedContent.length > 0) {
      content = uploadedContent[0].content;
    } else if (internalUploadedFiles || uploadedFiles) {
      const processedText = await processDocumentThroughBackend();
      content = processedText || '';
    }

    if (!content) {
      alert('Please upload a document first to get AI recommendations');
      return;
    }

    setIsAnalyzingContent(true);
    try {
      const response = await NarrationAPI.recommendPodcastStyle(content);

      if (response.success) {
        setAiRecommendation(response.recommendation);
        setShowAiInsights(true);

        // Auto-apply the recommended style
        const recommendedStyle = response.recommendation.style;
        setSelectedStyle(recommendedStyle);
        setConversationTone(response.recommendation.tone_suggestion || conversationTone);
        setNumberOfSpeakers(response.recommendation.num_speakers || numberOfSpeakers);

        console.log('AI Recommendation:', response.recommendation);
      } else {
        console.error('AI recommendation failed:', response);
        alert('Failed to get AI recommendation. Using conversational style as default.');
        setSelectedStyle('conversational');
      }
    } catch (error) {
      console.error('Error getting AI recommendation:', error);
      alert('Error getting AI recommendation. Please try again or select a style manually.');
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

  // Generate summary when document is loaded
  useEffect(() => {
    const hasContent = (uploadedContent && uploadedContent.length > 0) ||
                      (uploadedFiles && uploadedFiles.length > 0) ||
                      (internalUploadedFiles && internalUploadedFiles.length > 0);
    if (hasContent && !documentSummary && !isLoadingSummary && !isProcessingDocument) {
      generateDocumentSummary();
    }
  }, [uploadedContent, uploadedFiles, internalUploadedFiles]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // Get document content
      let content = '';
      if (backendProcessedContent) {
        content = backendProcessedContent;
      } else if (uploadedContent && uploadedContent.length > 0) {
        content = uploadedContent[0].content;
      } else if (internalUploadedFiles || uploadedFiles) {
        const processedText = await processDocumentThroughBackend();
        content = processedText || '';
      }

      if (!content) {
        alert('Please upload a document first');
        setIsGenerating(false);
        return;
      }

      // Map UI options to API parameters
      const lengthMap: { [key: number]: string } = {
        2: '10min',
        3: '15min',
        4: '20min'
      };

      // Voice mapping for 2 and 3 speakers
      const voiceMap2Speakers: { [key: string]: { host: string; guest: string } } = {
        'conversational': { host: 'host_male_friendly', guest: 'guest_female_expert' },
        'expert-panel': { host: 'host_male_casual', guest: 'guest_female_warm' },
        'debate': { host: 'host_male_friendly', guest: 'guest_female_expert' },
        'interview': { host: 'host_male_friendly', guest: 'guest_female_expert' }
      };

      const voiceMap3Speakers: { [key: string]: { host: string; guest: string; cohost: string } } = {
        'conversational': { host: 'host_male_friendly', guest: 'guest_female_expert', cohost: 'cohost_male_casual' },
        'expert-panel': { host: 'host_female', guest: 'guest_male', cohost: 'cohost_female_casual' },
        'debate': { host: 'host_male_friendly', guest: 'guest_female_expert', cohost: 'cohost_male_energetic' },
        'interview': { host: 'host_male_friendly', guest: 'guest_female_expert', cohost: 'cohost_female_warm' }
      };

      const voices = numberOfSpeakers === 2
        ? voiceMap2Speakers[selectedStyle] || voiceMap2Speakers['conversational']
        : voiceMap3Speakers[selectedStyle] || voiceMap3Speakers['conversational'];

      // Start podcast generation
      console.log('🎙️ Starting podcast generation...');
      console.log('📊 Number of Speakers:', numberOfSpeakers);
      console.log('🎨 Style:', selectedStyle);
      console.log('🎵 Voices:', voices);

      const podcastParams = {
        documentText: content,
        length: lengthMap[numberOfSpeakers] || '10min',
        hostVoice: voices.host,
        guestVoice: voices.guest,
        cohostVoice: numberOfSpeakers === 3 ? (voices as any).cohost : undefined,
        style: selectedStyle,
        tone: conversationTone,
        numSpeakers: numberOfSpeakers,
        outputFormat: 'mp3',
        saveScript: true
      };

      console.log('📤 Sending to API:', podcastParams);

      const response = await NarrationAPI.generatePodcast(podcastParams);

      if (response.success) {
        // Poll for completion
        const jobId = response.job_id;
        let completed = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max

        while (!completed && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds

          const statusResponse = await NarrationAPI.getPodcastStatus(jobId);

          if (statusResponse.success) {
            const job = statusResponse.job;

            if (job.status === 'completed') {
              completed = true;

              // Extract filename from path
              const audioFile = job.result.audio_file;
              const filename = audioFile.split(/[\/\\]/).pop(); // Handle both / and \ separators

              // Set audio URL for the player using centralized config
              const audioUrl = getPodcastDownloadUrl(filename);
              setPodcastAudioUrl(audioUrl);
              setPodcastMetadata({
                duration: job.result.duration_seconds,
                cost: job.result.total_cost,
                turns: job.result.metadata?.total_turns || 0,
                voices: job.result.metadata?.voices || {},
                title: job.result.metadata?.title || 'Podcast'
              });

              console.log('Podcast generated:', { audioUrl, metadata: job.result });

            } else if (job.status === 'failed') {
              throw new Error(job.message || 'Generation failed');
            } else {
              console.log(`Generation progress: ${job.message}`);
            }
          }

          attempts++;
        }

        if (!completed) {
          throw new Error('Generation timed out. Please try again.');
        }

      } else {
        throw new Error(response.error || 'Generation failed');
      }

    } catch (error) {
      console.error('Podcast generation error:', error);
      alert(`Error generating podcast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  // Minimized panel view
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
            <div className={`w-6 h-6 rounded-full flex items-center justify-center`}
                 style={{
                   backgroundColor: '#00D4E4'
                 }}>
              <Users className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col items-center space-y-1">
              <button
                onClick={onMinimize}
                className="p-1 rounded transition-colors"
                style={{
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
                title="Expand Panel"
              >
                <ChevronDown className="w-4 h-4 transform rotate-90" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded transition-colors"
                style={{
                  color: 'rgba(255, 255, 255, 0.7)'
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

      {/* Main Panel Container - Half Screen */}
      <div className={`${isExpanded ? 'w-3/4' : 'w-1/2'} backdrop-blur-3xl border-l shadow-2xl overflow-hidden flex flex-col relative`} style={{
        backgroundColor: '#000000',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        transition: 'all 0.5s ease-in-out'
      }}>
        {/* Top Control Bar */}
        <div className="absolute top-6 left-6 z-[100] flex items-center space-x-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-3 text-white rounded-lg transition-colors shadow-xl border"
            style={{
              backgroundColor: 'rgba(0, 212, 228, 0.1)',
              borderColor: 'rgba(0, 212, 228, 0.3)',
              color: '#00D4E4'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.2)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 228, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)';
              e.currentTarget.style.boxShadow = '';
            }}
            title={isExpanded ? "Collapse Panel" : "Expand Panel"}
          >
            {isExpanded ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
          <button
            onClick={onMinimize || (() => console.log('Minimize clicked'))}
            className="p-3 text-white rounded-lg transition-colors shadow-xl border-2"
            style={{
              backgroundColor: '#00D4E4',
              borderColor: '#00D4E4'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00E8FA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00D4E4';
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
          backgroundColor: '#14191a',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}>
          <h1 className="text-2xl font-bold flex items-center space-x-3" style={{
            color: '#FFFFFF'
          }}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center`}
                 style={{
                   backgroundColor: '#00D4E4'
                 }}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <span>Multi-Voice Conversation</span>
          </h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto relative z-10 p-6 space-y-6">

          {/* Document Upload & Summary Section */}
          <GlassCard variant="medium" className="p-6" glow>
            {(uploadedContent && uploadedContent.length > 0) ||
             (uploadedFiles && uploadedFiles.length > 0) ||
             (internalUploadedFiles && internalUploadedFiles.length > 0) ? (
              <>
                <h2 className="text-xl font-bold mb-2" style={{
                  color: '#FFFFFF'
                }}>Document Summary</h2>
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <FileText className="w-5 h-5" style={{
                      color: '#00D4E4'
                    }} />
                    <span className="text-sm font-medium" style={{
                      color: '#FFFFFF'
                    }}>
                      {getDocumentTitle()}
                    </span>
                  </div>

                  {/* Summary Type Selector */}
                  <div className="mb-3">
                    <label className="text-xs block mb-2" style={{
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>Summary Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'quick', name: 'Quick', desc: 'Key points' },
                        { id: 'detailed', name: 'Detailed', desc: 'In-depth' },
                        { id: 'full', name: 'Full', desc: 'Complete' }
                      ].map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSummaryType(type.id as 'quick' | 'detailed' | 'full')}
                          className={`p-2 text-xs rounded-lg transition-all duration-200 border`}
                          style={{
                            backgroundColor: summaryType === type.id
                              ? 'rgba(0, 212, 228, 0.2)'
                              : 'transparent',
                            borderColor: summaryType === type.id
                              ? '#00D4E4'
                              : 'rgba(255, 255, 255, 0.1)',
                            color: summaryType === type.id
                              ? '#00D4E4'
                              : 'rgba(255, 255, 255, 0.7)'
                          }}
                        >
                          <div className="font-medium">{type.name}</div>
                          <div className="text-xs opacity-75 mt-0.5">{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Document Summary Content */}
                <div className="backdrop-blur-sm rounded-lg p-4 mb-4 border" style={{
                  backgroundColor: '#14191a',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm leading-relaxed flex-1" style={{
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      {getDocumentSummary()}
                    </p>
                    {!documentSummary && !isLoadingSummary && (
                      <button
                        onClick={generateDocumentSummary}
                        className="ml-3 px-3 py-1 text-white rounded-lg transition-all duration-300 text-xs whitespace-nowrap shadow-lg"
                        style={{
                          backgroundColor: '#00D4E4'
                        }}
                      >
                        Generate Summary
                      </button>
                    )}
                  </div>
                  {isLoadingSummary && (
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#00D4E4' }}></div>
                      <span className="text-xs" style={{ color: '#00D4E4' }}>AI is analyzing your document...</span>
                    </div>
                  )}
                </div>

                {/* Document Stats */}
                {uploadedContent && uploadedContent.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="backdrop-blur-sm rounded-lg p-3 border" style={{
                      backgroundColor: 'rgba(0, 212, 228, 0.1)',
                      borderColor: 'rgba(0, 212, 228, 0.3)'
                    }}>
                      <div className="font-medium" style={{
                        color: '#00D4E4'
                      }}>Word Count</div>
                      <div style={{
                        color: '#FFFFFF'
                      }}>{uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length} words</div>
                    </div>
                    <div className="backdrop-blur-sm rounded-lg p-3 border" style={{
                      backgroundColor: 'rgba(0, 212, 228, 0.1)',
                      borderColor: 'rgba(0, 212, 228, 0.3)'
                    }}>
                      <div className="font-medium" style={{
                        color: '#00D4E4'
                      }}>Est. Reading Time</div>
                      <div style={{
                        color: '#FFFFFF'
                      }}>{Math.ceil((uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length) / 250)} min</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-2" style={{
                  color: '#FFFFFF'
                }}>Upload Your Document</h2>
                <p className="text-sm mb-6" style={{
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>We support PDF, EPUB, DOCX, and TXT formats. Maximum file size is 50MB.</p>

                {/* Upload Area */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors cursor-pointer backdrop-blur-sm ${
                    isDragActive
                      ? 'bg-cyan-500/20'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                  style={{
                    borderColor: isDragActive ? '#00D4E4' : 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-10 h-10 mx-auto mb-3" style={{
                    color: 'rgba(255, 255, 255, 0.5)'
                  }} />
                  {isDragActive ? (
                    <p className="text-sm mb-3" style={{
                      color: '#00D4E4'
                    }}>Drop your file here</p>
                  ) : (
                    <>
                      <p className="text-sm mb-3" style={{
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>Drag and drop your file here or click to browse</p>
                      <div className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 inline-block shadow-lg" style={{
                        background: '#00D4E4'
                      }}>Choose File</div>
                    </>
                  )}
                </div>
              </>
            )}
          </GlassCard>

          {/* Podcast Style Selection */}
          <GlassCard variant="medium" className="p-6" glow>
            <h2 className="text-xl font-bold mb-4" style={{
              color: '#FFFFFF'
            }}>Choose Conversation Style</h2>

            <div className="grid grid-cols-2 gap-4">
              {podcastStyles.map((style: any) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelection(style.id)}
                  disabled={isAnalyzingContent && style.id === 'ai-smart'}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedStyle === style.id || (style.id === 'ai-smart' && showAiInsights)
                      ? 'border-cyan-500 bg-cyan-500/20'
                      : 'border-gray-300/30 bg-transparent hover:bg-gray-500/10'
                  } ${style.isSpecial ? 'relative overflow-hidden' : ''}`}
                  style={{
                    borderColor: (selectedStyle === style.id || (style.id === 'ai-smart' && showAiInsights))
                      ? '#00D4E4'
                      : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: (selectedStyle === style.id || (style.id === 'ai-smart' && showAiInsights))
                      ? 'rgba(0, 212, 228, 0.15)'
                      : 'transparent',
                    boxShadow: (selectedStyle === style.id || (style.id === 'ai-smart' && showAiInsights))
                      ? '0 0 20px rgba(0, 212, 228, 0.2)'
                      : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!(selectedStyle === style.id || (style.id === 'ai-smart' && showAiInsights))) {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(0, 212, 228, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(selectedStyle === style.id || (style.id === 'ai-smart' && showAiInsights))) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                >
                  {style.isSpecial && (
                    <div className="absolute top-0 right-0 px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-bl-lg">
                      AI
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{isAnalyzingContent && style.id === 'ai-smart' ? '🔄' : style.icon}</span>
                    <h3 className="font-semibold" style={{
                      color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                    }}>{style.name}</h3>
                  </div>
                  <p className="text-sm" style={{
                    color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
                  }}>
                    {isAnalyzingContent && style.id === 'ai-smart' ? 'Analyzing your content...' : style.description}
                  </p>
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
                  className="mt-4 p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(0, 212, 228, 0.1)',
                    borderColor: '#00D4E4'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 mt-0.5" style={{color: '#00D4E4'}} />
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2" style={{
                        color: '#00D4E4'
                      }}>
                        AI Analysis Results
                      </h4>
                      <p className="text-sm mb-3" style={{
                        color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                      }}>
                        {aiRecommendation.reasoning}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded" style={{
                          backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                        }}>
                          <span className="opacity-70">Recommended Style:</span>
                          <div className="font-semibold capitalize mt-1">{aiRecommendation.style.replace('-', ' ')}</div>
                        </div>
                        <div className="p-2 rounded" style={{
                          backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                        }}>
                          <span className="opacity-70">Confidence:</span>
                          <div className="font-semibold mt-1">{Math.round(aiRecommendation.confidence * 100)}%</div>
                        </div>
                      </div>
                      {aiRecommendation.key_themes && aiRecommendation.key_themes.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs opacity-70">Key Themes:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {aiRecommendation.key_themes.map((theme: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded-full text-xs"
                                style={{
                                  backgroundColor: 'rgba(0, 212, 228, 0.15)',
                                  color: '#00D4E4'
                                }}
                              >
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
          </GlassCard>

          {/* Configuration Options */}
          <GlassCard variant="medium" className="p-6" glow>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{
              color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
            }}>
              <Settings className="w-5 h-5" />
              Customize Conversation
            </h2>

            {/* Number of Speakers */}
            <div className="mb-6">
              <label className="text-sm font-medium block mb-2" style={{
                color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
              }}>Number of Speakers</label>
              <div className="flex items-center gap-4">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setNumberOfSpeakers(num)}
                    className={`px-6 py-2 rounded-lg border-2 transition-all ${
                      numberOfSpeakers === num
                        ? 'border-cyan-500 bg-cyan-500/20'
                        : 'border-gray-300/30 bg-transparent hover:bg-gray-500/10'
                    }`}
                    style={{
                      borderColor: numberOfSpeakers === num ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
                      backgroundColor: numberOfSpeakers === num ? 'rgba(0, 212, 228, 0.15)' : 'transparent',
                      color: '#FFFFFF',
                      boxShadow: numberOfSpeakers === num ? '0 0 15px rgba(0, 212, 228, 0.2)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (numberOfSpeakers !== num) {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(0, 212, 228, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (numberOfSpeakers !== num) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    {num} {num === 1 ? 'Speaker' : 'Speakers'}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Tone */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{
                color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
              }}>Conversation Tone</label>
              <div className="grid grid-cols-2 gap-3">
                {conversationTones.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setConversationTone(tone.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      conversationTone === tone.id
                        ? 'border-cyan-500 bg-cyan-500/20'
                        : 'border-gray-300/30 bg-transparent hover:bg-gray-500/10'
                    }`}
                    style={{
                      borderColor: conversationTone === tone.id ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
                      backgroundColor: conversationTone === tone.id ? 'rgba(0, 212, 228, 0.15)' : 'transparent',
                      boxShadow: conversationTone === tone.id ? '0 0 15px rgba(0, 212, 228, 0.2)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (conversationTone !== tone.id) {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(0, 212, 228, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (conversationTone !== tone.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <div className="font-medium mb-1" style={{
                      color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937'
                    }}>{tone.name}</div>
                    <div className="text-xs" style={{
                      color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280'
                    }}>{tone.description}</div>
                  </button>
                ))}
              </div>
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
                  : 'text-white shadow-lg'
              }`}
              style={{
                backgroundColor: isGenerating ? undefined : '#00D4E4',
                boxShadow: isGenerating ? 'none' : '0 0 30px rgba(0, 212, 228, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.backgroundColor = '#00E8FA';
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 212, 228, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.backgroundColor = '#00D4E4';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 212, 228, 0.4)';
                }
              }}
            >
              <Sparkles size={20} />
              {isGenerating ? 'Generating Conversation...' : 'Generate Multi-Voice Podcast'}
            </motion.button>
          </div>

          {/* Audio Visualizer */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-center"
              >
                <div className="relative w-32 h-32">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-32 h-32 rounded-full border-4"
                    style={{
                      borderColor: 'rgba(0, 212, 228, 0.3)',
                      borderTopColor: '#00D4E4'
                    }}
                  />
                  <div className="absolute inset-4 rounded-full flex items-center justify-center"
                       style={{
                         background: 'linear-gradient(135deg, #00D4E4, #00E8FA)'
                       }}>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles size={32} className="text-white" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Audio Player */}
            {podcastAudioUrl && podcastMetadata && !isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-6"
              >
                <GlassCard className="p-6">
                  <div className="space-y-4">
                    {/* Podcast Title */}
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                        <Mic size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {podcastMetadata.title || 'Your Podcast'}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {Math.floor(podcastMetadata.duration / 60)}:{String(Math.floor(podcastMetadata.duration % 60)).padStart(2, '0')} • {podcastMetadata.turns} segments
                        </p>
                      </div>
                    </div>

                    {/* Audio Player */}
                    <audio
                      controls
                      src={podcastAudioUrl}
                      className="w-full h-12 rounded-lg"
                      style={{
                        filter: theme === 'dark' ? 'invert(0.9) hue-rotate(180deg)' : 'none'
                      }}
                    />

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex gap-4">
                        <span className="text-gray-400">
                          Host: <span className="text-white">{podcastMetadata.voices.host || 'Unknown'}</span>
                        </span>
                        <span className="text-gray-400">
                          Guest: <span className="text-white">{podcastMetadata.voices.guest || 'Unknown'}</span>
                        </span>
                      </div>
                      <a
                        href={podcastAudioUrl}
                        download
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                      >
                        <Download size={16} />
                        Download
                      </a>
                    </div>

                    {/* Cost */}
                    <div className="text-xs text-gray-500 text-center">
                      Generation cost: ${podcastMetadata.cost.toFixed(4)}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MultiVoiceConversationPanel;
