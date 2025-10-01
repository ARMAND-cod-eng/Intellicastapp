import React, { useState, useCallback, useEffect } from 'react';
import { X, Users, Minimize2, ChevronDown, Settings, Sparkles, FileText, Upload, Play, Download, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import GlassCard from '../ui/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';
import { NarrationAPI } from '../../services/narrationApi';
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

      const voiceMap: { [key: string]: { host: string; guest: string } } = {
        'conversational': { host: 'host_male_friendly', guest: 'guest_female_expert' },
        'expert-panel': { host: 'host_male_casual', guest: 'guest_female_warm' },
        'debate': { host: 'host_male_friendly', guest: 'guest_female_expert' },  // Male vs Female for clear distinction in debate
        'interview': { host: 'host_male_friendly', guest: 'guest_female_expert' }
      };

      const voices = voiceMap[selectedStyle] || voiceMap['conversational'];

      // Start podcast generation
      console.log('Starting podcast generation...');

      const response = await NarrationAPI.generatePodcast({
        documentText: content,
        length: lengthMap[numberOfSpeakers] || '10min',
        hostVoice: voices.host,
        guestVoice: voices.guest,
        style: selectedStyle,
        tone: conversationTone,
        numSpeakers: numberOfSpeakers,
        outputFormat: 'mp3',
        saveScript: true
      });

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

              // Set audio URL for the player
              const audioUrl = `http://localhost:8000/api/podcast/download/${filename}`;
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
               backgroundColor: theme === 'professional-dark' ? '#252526' : theme === 'dark' ? 'rgba(15, 15, 35, 0.95)' : '#FFFFFF',
               borderColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'
             }}>
          <div className="p-3 backdrop-blur-md border-b flex flex-col items-center space-y-2"
               style={{
                 backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8F9FA',
                 borderColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'
               }}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center`}
                 style={{
                   backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#6366F1'
                 }}>
              <Users className="w-3 h-3 text-white" />
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

      {/* Main Panel Container - Half Screen */}
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
              backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#6366F1',
              borderColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#6366F1'
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center`}
                 style={{
                   backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#7C3AED'
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
                  color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                }}>Document Summary</h2>
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <FileText className="w-5 h-5" style={{
                      color: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#6366F1'
                    }} />
                    <span className="text-sm font-medium" style={{
                      color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                    }}>
                      {getDocumentTitle()}
                    </span>
                  </div>

                  {/* Summary Type Selector */}
                  <div className="mb-3">
                    <label className="text-xs block mb-2" style={{
                      color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4B5563'
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
                              ? (theme === 'professional-dark' ? 'rgba(37, 99, 235, 0.2)' : theme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(96, 165, 250, 0.1)')
                              : 'transparent',
                            borderColor: summaryType === type.id
                              ? (theme === 'professional-dark' ? '#2563EB' : theme === 'dark' ? '#6366F1' : '#60A5FA')
                              : (theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 163, 175, 0.3)'),
                            color: summaryType === type.id
                              ? (theme === 'professional-dark' ? '#2563EB' : theme === 'dark' ? '#C4B5FD' : '#60A5FA')
                              : (theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937')
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
                  backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
                  borderColor: theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 163, 175, 0.5)'
                }}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm leading-relaxed flex-1" style={{
                      color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4B5563'
                    }}>
                      {getDocumentSummary()}
                    </p>
                    {!documentSummary && !isLoadingSummary && (
                      <button
                        onClick={generateDocumentSummary}
                        className="ml-3 px-3 py-1 text-white rounded-lg transition-all duration-300 text-xs whitespace-nowrap shadow-lg"
                        style={{
                          backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#6366F1'
                        }}
                      >
                        Generate Summary
                      </button>
                    )}
                  </div>
                  {isLoadingSummary && (
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-xs text-primary-400">AI is analyzing your document...</span>
                    </div>
                  )}
                </div>

                {/* Document Stats */}
                {uploadedContent && uploadedContent.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="backdrop-blur-sm rounded-lg p-3 border" style={{
                      backgroundColor: theme === 'professional-dark' ? 'rgba(59, 130, 246, 0.1)' : theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                      borderColor: theme === 'professional-dark' ? '#2563EB' : theme === 'dark' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'
                    }}>
                      <div className="font-medium" style={{
                        color: theme === 'professional-dark' ? '#2563EB' : theme === 'dark' ? '#C4B5FD' : '#60A5FA'
                      }}>Word Count</div>
                      <div style={{
                        color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                      }}>{uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length} words</div>
                    </div>
                    <div className="backdrop-blur-sm rounded-lg p-3 border" style={{
                      backgroundColor: theme === 'professional-dark' ? 'rgba(59, 130, 246, 0.1)' : theme === 'dark' ? 'rgba(219, 39, 119, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                      borderColor: theme === 'professional-dark' ? '#2563EB' : theme === 'dark' ? 'rgba(219, 39, 119, 0.3)' : 'rgba(16, 185, 129, 0.2)'
                    }}>
                      <div className="font-medium" style={{
                        color: theme === 'professional-dark' ? '#2563EB' : theme === 'dark' ? '#F9A8D4' : '#10B981'
                      }}>Est. Reading Time</div>
                      <div style={{
                        color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                      }}>{Math.ceil((uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length) / 250)} min</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-2" style={{
                  color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                }}>Upload Your Document</h2>
                <p className="text-sm mb-6" style={{
                  color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
                }}>We support PDF, EPUB, DOCX, and TXT formats. Maximum file size is 50MB.</p>

                {/* Upload Area */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors cursor-pointer backdrop-blur-sm ${
                    isDragActive
                      ? (theme === 'professional-dark' ? 'border-blue-400 bg-blue-50/20' : theme === 'dark' ? 'border-primary-400 bg-primary-500/20' : 'border-blue-400 bg-blue-50')
                      : (theme === 'professional-dark' ? 'border-gray-400/30 bg-gray-500/10 hover:border-blue-400/50' : theme === 'dark' ? 'border-white/30 bg-white/10 hover:border-primary-400/50' : 'border-gray-300 bg-white hover:border-blue-400')
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-10 h-10 mx-auto mb-3" style={{
                    color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#9CA3AF'
                  }} />
                  {isDragActive ? (
                    <p className="text-sm mb-3" style={{
                      color: theme === 'professional-dark' ? '#2563EB' : theme === 'dark' ? '#C4B5FD' : '#60A5FA'
                    }}>Drop your file here</p>
                  ) : (
                    <>
                      <p className="text-sm mb-3" style={{
                        color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
                      }}>Drag and drop your file here or click to browse</p>
                      <div className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 inline-block shadow-lg" style={{
                        background: theme === 'professional-dark' ? '#2563EB' : theme === 'dark' ? 'linear-gradient(to right, #7C3AED, #DB2777)' : '#60A5FA'
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
              color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
            }}>Choose Conversation Style</h2>
            <div className="grid grid-cols-2 gap-4">
              {podcastStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedStyle === style.id
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-300/30 bg-transparent hover:bg-gray-500/10'
                  }`}
                  style={{
                    borderColor: selectedStyle === style.id
                      ? (theme === 'professional-dark' ? '#2563EB' : theme === 'dark' ? '#6366F1' : '#60A5FA')
                      : (theme === 'professional-dark' ? '#3C4043' : theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 163, 175, 0.3)'),
                    backgroundColor: selectedStyle === style.id
                      ? (theme === 'professional-dark' ? 'rgba(37, 99, 235, 0.2)' : theme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(96, 165, 250, 0.1)')
                      : 'transparent'
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{style.icon}</span>
                    <h3 className="font-semibold" style={{
                      color: theme === 'professional-dark' ? '#E8EAED' : theme === 'dark' ? '#FFFFFF' : '#1F2937'
                    }}>{style.name}</h3>
                  </div>
                  <p className="text-sm" style={{
                    color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
                  }}>{style.description}</p>
                </button>
              ))}
            </div>
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
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-300/30 bg-transparent hover:bg-gray-500/10'
                    }`}
                    style={{
                      borderColor: numberOfSpeakers === num
                        ? (theme === 'professional-dark' ? '#2563EB' : '#60A5FA')
                        : (theme === 'professional-dark' ? '#3C4043' : 'rgba(156, 163, 175, 0.3)'),
                      backgroundColor: numberOfSpeakers === num
                        ? (theme === 'professional-dark' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(96, 165, 250, 0.1)')
                        : 'transparent',
                      color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937'
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
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-300/30 bg-transparent hover:bg-gray-500/10'
                    }`}
                    style={{
                      borderColor: conversationTone === tone.id
                        ? (theme === 'professional-dark' ? '#2563EB' : '#60A5FA')
                        : (theme === 'professional-dark' ? '#3C4043' : 'rgba(156, 163, 175, 0.3)'),
                      backgroundColor: conversationTone === tone.id
                        ? (theme === 'professional-dark' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(96, 165, 250, 0.1)')
                        : 'transparent'
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
                backgroundColor: isGenerating ? undefined : (theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#6366F1')
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
                    className="w-32 h-32 rounded-full border-4 border-blue-500/30 border-t-blue-500"
                  />
                  <div className="absolute inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
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
