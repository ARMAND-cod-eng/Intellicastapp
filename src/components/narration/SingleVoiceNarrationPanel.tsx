import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Play, Pause, Volume2, VolumeX, Music, ChevronDown, Upload, FileText, Settings, Download, Square, MessageCircle, RotateCcw, Mic2, Grid3X3 } from 'lucide-react';
import type { DocumentContent } from '../../types/document';
import { NarrationAPI } from '../../services/narrationApi';
import ChatterboxVoiceSelector from '../voice/ChatterboxVoiceSelector';

// Voice settings interface
interface VoiceSettings {
  exaggeration: number;
  temperature: number;
  cfg_weight: number;
  min_p: number;
  top_p: number;
  repetition_penalty: number;
  seed: number;
  reference_audio?: File | null;
}

interface SingleVoiceNarrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedContent?: DocumentContent[] | null;
  uploadedFiles?: File[] | null; // Add original files for backend processing
}

const SingleVoiceNarrationPanel: React.FC<SingleVoiceNarrationPanelProps> = ({
  isOpen,
  onClose,
  uploadedContent,
  uploadedFiles
}) => {
  const [selectedVoice, setSelectedVoice] = useState('emma_en');
  const [narrationType, setNarrationType] = useState('summary');
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.5); // Simulated audio level for animation
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [question, setQuestion] = useState('');
  const [documentSummary, setDocumentSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [questionAnswer, setQuestionAnswer] = useState<string>('');
  const [backendProcessedContent, setBackendProcessedContent] = useState<string>('');
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [currentNarration, setCurrentNarration] = useState<{id: string, audioUrl: string, duration: number} | null>(null);
  const [internalUploadedFiles, setInternalUploadedFiles] = useState<File[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvancedVoiceSelector, setShowAdvancedVoiceSelector] = useState(true);
  const [contentCategory, setContentCategory] = useState<string>('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    exaggeration: 0.5,
    temperature: 0.8,
    cfg_weight: 0.5,
    min_p: 0.05,
    top_p: 1.0,
    repetition_penalty: 1.2,
    seed: 0,
    reference_audio: null
  });

  // Popular Chatterbox voices for simple selection mode
  const popularChatterboxVoices = [
    { id: 'emma_en', name: 'Emma', description: 'Professional English female', language: 'English' },
    { id: 'james_en', name: 'James', description: 'Authoritative English male', language: 'English' },
    { id: 'sophia_es', name: 'Sophia', description: 'Warm Spanish female', language: 'Spanish' },
    { id: 'am_adam', name: 'Adam', description: 'Confident American male', accent: 'American' },
    { id: 'bf_heart', name: 'Heart', description: 'Refined British female', accent: 'British' },
    { id: 'am_david', name: 'David', description: 'Friendly American male', accent: 'American' },
  ];

  const narrationTypes = [
    { id: 'summary', name: 'Summary', description: 'Condensed key points and main ideas' },
    { id: 'full', name: 'Full Article', description: 'Complete reading of the entire document' },
    { id: 'explanatory', name: 'Explanatory', description: 'Detailed explanations with context' },
    { id: 'briefing', name: 'Personalized Briefing', description: 'Tailored overview based on your interests' },
    { id: 'interactive', name: 'Interactive', description: 'Q&A style with key insights' },
  ];

  const musicOptions = [
    { id: 'none', name: 'No Music' },
    { id: 'ambient', name: 'Ambient Background' },
    { id: 'classical', name: 'Classical Light' },
    { id: 'nature', name: 'Nature Sounds' },
    { id: 'jazz', name: 'Soft Jazz' },
    { id: 'electronic', name: 'Electronic Minimal' },
  ];

  // Handle file drop for internal uploads
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setInternalUploadedFiles(acceptedFiles);
      setIsUploading(false);
      // Process the file immediately
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
        console.log('Backend processed content:', response.document.text.substring(0, 200) + '...');
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
      setDocumentSummary('No document content available for summary generation.');
      return;
    }
    
    setIsLoadingSummary(true);
    try {
      const response = await NarrationAPI.generateDocumentSummary(content);
      
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

  const handleGenerate = async () => {
    let content = '';

    // Try to use backend-processed content first
    if (backendProcessedContent) {
      content = backendProcessedContent;
    } else if (internalUploadedFiles && internalUploadedFiles.length > 0) {
      content = await processDocumentThroughBackend(internalUploadedFiles) || '';
    } else if (uploadedFiles && uploadedFiles.length > 0) {
      content = await processDocumentThroughBackend() || '';
    } else if (uploadedContent && uploadedContent.length > 0) {
      content = uploadedContent[0].content;
    }

    if (!content) {
      alert('No document content available. Please upload a document first.');
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await NarrationAPI.generateNarration(
        content,
        narrationType,
        selectedVoice,
        playbackSpeed,
        backgroundMusicEnabled,
        backgroundMusicEnabled ? selectedMusic : 'none',
        voiceSettings
      );
      
      if (response.success) {
        setGeneratedScript(response.script);
        
        // Handle audio if available
        if (response.audioUrl) {
          setCurrentNarration({
            id: response.audioId || 'narration',
            audioUrl: response.audioUrl,
            duration: response.duration || 0
          });
          setAudioUrl(response.audioUrl);
          
          // Create and configure audio element
          const audio = new Audio(`http://localhost:3003${response.audioUrl}`);
          audio.onloadeddata = () => {
            console.log('Audio loaded successfully');
            setAudioElement(audio);
            // Auto-play the generated narration
            audio.play().then(() => {
              setIsPodcastPlaying(true);
            }).catch(err => console.error('Auto-play failed:', err));
          };
          audio.onended = () => {
            setIsPodcastPlaying(false);
            setAudioLevel(0.5);
          };
          audio.onerror = () => {
            console.error('Failed to load audio');
          };
        } else {
          // Start animation without audio for document summaries
          setIsPodcastPlaying(true);
        }
        
        console.log('Narration generated successfully:', response);
      } else {
        alert('Failed to generate narration. Please try again.');
      }
    } catch (error) {
      console.error('Error generating narration:', error);
      alert('Error generating narration. Please check your connection.');
    } finally {
      setIsGenerating(false);
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

  // Simulate voice intonation changes or use real audio data
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPodcastPlaying) {
      if (audioElement && currentNarration) {
        // Use real audio context for better visualization (simplified version)
        interval = setInterval(() => {
          if (!audioElement.paused) {
            // Simulate audio analysis - in a real implementation, you'd use Web Audio API
            const randomLevel = Math.random() * 0.8 + 0.2;
            setAudioLevel(randomLevel);
          }
        }, 100); // Faster updates for real audio
      } else {
        // Fallback to simulated animation
        interval = setInterval(() => {
          setAudioLevel(Math.random() * 0.8 + 0.2);
        }, 200);
      }
    }
    return () => clearInterval(interval);
  }, [isPodcastPlaying, audioElement, currentNarration]);

  const handleDownload = () => {
    if (currentNarration && audioUrl) {
      const link = document.createElement('a');
      link.href = `http://localhost:3003${audioUrl}`;
      link.download = `narration_${currentNarration.id}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.log('No audio available for download');
    }
  };

  const handleStop = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setIsPodcastPlaying(false);
    setAudioLevel(0.5);
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      return;
    }

    let content = '';
    
    // Try to use backend-processed content first
    if (backendProcessedContent) {
      content = backendProcessedContent;
    } else if (internalUploadedFiles && internalUploadedFiles.length > 0) {
      content = await processDocumentThroughBackend(internalUploadedFiles) || '';
    } else if (uploadedFiles && uploadedFiles.length > 0) {
      content = await processDocumentThroughBackend() || '';
    } else if (uploadedContent && uploadedContent.length > 0) {
      content = uploadedContent[0].content;
    }

    if (!content) {
      alert('No document content available for questions.');
      return;
    }

    const currentQuestion = question;
    
    setQuestion('');
    setShowQuestionInput(false);
    
    try {
      const response = await NarrationAPI.askQuestion(content, currentQuestion);
      
      if (response.success) {
        setQuestionAnswer(response.answer);
        // Show the answer in an alert for now (could be improved with a modal)
        alert(`Q: ${currentQuestion}\n\nA: ${response.answer}`);
      } else {
        alert('Failed to get answer. Please try again.');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      alert('Error asking question. Please check your connection.');
    }
  };

  // Voice animation component (for button)
  const VoiceAnimation = () => (
    <div className="flex items-center justify-center space-x-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 h-5 bg-white rounded-full animate-pulse"
          style={{
            animation: `wave 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );

  // Dynamic voice-responsive animation component
  const VoiceResponsiveAnimation = () => {
    const intensity = audioLevel;
    const scale = 1 + (intensity * 0.3); // Scale between 1 and 1.3 based on voice level
    
    return (
      <div className="space-y-6">
        {/* Voice Animation Circle */}
        <div className="relative flex items-center justify-center">
          {/* Dynamic gradient circle that responds to voice */}
          <div 
            className="w-40 h-40 rounded-full transition-transform duration-200 ease-out"
            style={{
              background: `conic-gradient(from 0deg,
                rgba(20, 184, 166, ${0.7 + intensity * 0.3}) 0deg,
                rgba(6, 182, 212, ${0.8 + intensity * 0.2}) 45deg,
                rgba(37, 99, 235, ${0.9 + intensity * 0.1}) 90deg,
                rgba(29, 78, 216, ${0.95 + intensity * 0.05}) 135deg,
                rgba(37, 99, 235, ${0.9 + intensity * 0.1}) 180deg,
                rgba(6, 182, 212, ${0.8 + intensity * 0.2}) 225deg,
                rgba(20, 184, 166, ${0.7 + intensity * 0.3}) 270deg,
                rgba(56, 189, 248, ${0.6 + intensity * 0.4}) 315deg,
                rgba(20, 184, 166, ${0.7 + intensity * 0.3}) 360deg)`,
              transform: `scale(${scale})`,
              filter: `blur(${1 - intensity * 0.8}px)`,
            }}
          />
          
          {/* Central play/pause button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button 
              onClick={() => {
                if (audioElement && currentNarration) {
                  if (isPodcastPlaying) {
                    audioElement.pause();
                    setIsPodcastPlaying(false);
                  } else {
                    audioElement.play().then(() => {
                      setIsPodcastPlaying(true);
                    }).catch(err => console.error('Play failed:', err));
                  }
                } else {
                  // Fallback for animation-only mode
                  setIsPodcastPlaying(!isPodcastPlaying);
                }
              }}
              className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg border-2 border-white/50"
            >
              {isPodcastPlaying ? (
                <Pause className="w-6 h-6 text-gray-800" />
              ) : (
                <Play className="w-6 h-6 text-gray-800 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm space-y-4">
          {/* Primary Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleStop}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Stop"
            >
              <Square className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={() => {
                if (audioElement && currentNarration) {
                  if (isPodcastPlaying) {
                    audioElement.pause();
                    setIsPodcastPlaying(false);
                  } else {
                    audioElement.play().then(() => {
                      setIsPodcastPlaying(true);
                    }).catch(err => console.error('Play failed:', err));
                  }
                } else {
                  setIsPodcastPlaying(!isPodcastPlaying);
                }
              }}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {isPodcastPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Speed</span>
            <div className="flex items-center space-x-2">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPlaybackSpeed(speed);
                    if (audioElement) {
                      audioElement.playbackRate = speed;
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Ask Question */}
          <div className="space-y-2">
            {!showQuestionInput ? (
              <button
                onClick={() => setShowQuestionInput(true)}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Ask Question</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about the content..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={!question.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors text-sm"
                >
                  Ask
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes wave {
            0%, 40%, 100% {
              transform: scaleY(0.4);
            }
            20% {
              transform: scaleY(1);
            }
          }
          
          @keyframes rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop for the left side */}
        <div className="flex-1 bg-black/20" onClick={onClose} />
      
      {/* Main Panel Container - Half Screen */}
      <div className="w-1/2 bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Single Voice Narration</h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Top Section - Side by Side Layout */}
          <div className="flex p-6 space-x-6">
            {/* Left Side - Document Summary Section */}
            <div className="flex-1">
              <div className="bg-white rounded-xl border-2 border-blue-500/50 p-6 shadow-sm h-full">
                {(uploadedContent && uploadedContent.length > 0) || 
                 (uploadedFiles && uploadedFiles.length > 0) || 
                 (internalUploadedFiles && internalUploadedFiles.length > 0) ? (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Document Summary</h2>
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">
                          {uploadedContent && uploadedContent.length > 0 
                            ? uploadedContent[0].metadata?.fileName || uploadedContent[0].title
                            : internalUploadedFiles && internalUploadedFiles.length > 0
                              ? internalUploadedFiles[0].name
                              : uploadedFiles && uploadedFiles.length > 0 
                                ? uploadedFiles[0].name 
                                : 'Document'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Document Summary Content */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-gray-700 text-sm leading-relaxed flex-1">
                          {getDocumentSummary()}
                        </p>
                        {!documentSummary && !isLoadingSummary && (
                          <button
                            onClick={generateDocumentSummary}
                            className="ml-3 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs whitespace-nowrap"
                          >
                            Generate Summary
                          </button>
                        )}
                      </div>
                      {isLoadingSummary && (
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-xs text-blue-600">AI is analyzing your document...</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Document Stats */}
                    {uploadedContent && uploadedContent.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-blue-600 font-medium">Word Count</div>
                          <div className="text-gray-700">{uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length} words</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-green-600 font-medium">Est. Reading Time</div>
                          <div className="text-gray-700">{Math.ceil((uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length) / 250)} min</div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Your Document</h2>
                    <p className="text-gray-600 text-sm mb-6">
                      We support PDF, EPUB, DOCX, and TXT formats. Maximum file size is 50MB.
                    </p>
                    
                    {/* Upload Area */}
                    <div 
                      {...getRootProps()} 
                      className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors cursor-pointer ${
                        isDragActive 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 bg-gray-50 hover:border-blue-500/50'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      {isDragActive ? (
                        <p className="text-blue-600 text-sm mb-3">Drop your file here</p>
                      ) : (
                        <>
                          <p className="text-gray-600 text-sm mb-3">Drag and drop your file here or click to browse</p>
                          <div className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors inline-block">
                            Choose File
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Side - Customize Options */}
            <div className="flex-1">
              <div className="bg-white rounded-xl border-2 border-yellow-500/50 p-6 shadow-sm h-full">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Customize Your Podcast</h2>
              <p className="text-gray-600 text-sm mb-6">
                Personalize your audio experience with our customization options.
              </p>

                {/* Voice Selection */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-gray-700" />
                      <h3 className="text-gray-900 font-medium text-sm">Voice Selection</h3>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Chatterbox Multilingual</span>
                    </div>
                    <button
                      onClick={() => setShowAdvancedVoiceSelector(!showAdvancedVoiceSelector)}
                      className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      title={showAdvancedVoiceSelector ? 'Switch to simple selection' : 'Browse all Chatterbox multilingual voices'}
                    >
                      {showAdvancedVoiceSelector ? (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          <span>Simple</span>
                        </>
                      ) : (
                        <>
                          <Grid3X3 className="w-3 h-3" />
                          <span>All Voices</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {showAdvancedVoiceSelector ? (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <ChatterboxVoiceSelector
                        selectedVoice={selectedVoice}
                        onVoiceChange={setSelectedVoice}
                        showAdvanced={true}
                        compact={true}
                        contentCategory={contentCategory || 'general'}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Primary Narrator</label>
                      <p className="text-xs text-gray-500 mb-2">Popular Chatterbox multilingual voices (click "All Voices" for full selection)</p>
                      <div className="relative">
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        >
                          {popularChatterboxVoices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} ({voice.language}, {voice.description})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Customization */}
                <div className="mb-6">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Voice Customization (Advanced)</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Exaggeration</label>
                        <input
                          type="range"
                          min="0.25"
                          max="2"
                          step="0.05"
                          value={voiceSettings.exaggeration}
                          onChange={(e) => setVoiceSettings(prev => ({...prev, exaggeration: parseFloat(e.target.value)}))}
                          className="w-full accent-blue-600"
                        />
                        <span className="text-xs text-gray-500">{voiceSettings.exaggeration.toFixed(2)}</span>
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Temperature</label>
                        <input
                          type="range"
                          min="0.05"
                          max="2"
                          step="0.05"
                          value={voiceSettings.temperature}
                          onChange={(e) => setVoiceSettings(prev => ({...prev, temperature: parseFloat(e.target.value)}))}
                          className="w-full accent-blue-600"
                        />
                        <span className="text-xs text-gray-500">{voiceSettings.temperature.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Format Options */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Settings className="w-4 h-4 text-gray-700" />
                    <h3 className="text-gray-900 font-medium text-sm">Format Options</h3>
                  </div>
                  
                  <div className="mb-4">
                    <label className="text-xs text-gray-600 block mb-1">Podcast Style</label>
                    <p className="text-xs text-gray-500 mb-2">Choose your preferred style</p>
                    <div className="relative">
                      <select
                        value={narrationType}
                        onChange={(e) => setNarrationType(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                      >
                        <option value="conversational">Conversational Podcast</option>
                        {narrationTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Background Music</label>
                    <p className="text-xs text-gray-500 mb-2">Add ambient background music</p>
                    <div className="relative">
                      <select
                        value={backgroundMusicEnabled ? selectedMusic : 'none'}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'none') {
                            setBackgroundMusicEnabled(false);
                          } else {
                            setBackgroundMusicEnabled(true);
                            setSelectedMusic(value);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                      >
                        {musicOptions.map((music) => (
                          <option key={music.id} value={music.id}>
                            {music.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Convert Button or Voice Animation */}
                {isPodcastPlaying ? (
                  <div className="py-6">
                    <VoiceResponsiveAnimation />
                  </div>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={((!uploadedContent || uploadedContent.length === 0) && 
                              (!uploadedFiles || uploadedFiles.length === 0) && 
                              (!internalUploadedFiles || internalUploadedFiles.length === 0)) || 
                              isGenerating}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center space-x-3">
                        <span>Generating...</span>
                        <VoiceAnimation />
                      </div>
                    ) : (
                      'Convert to Podcast'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - How It Works */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-3 mx-auto">
                1
              </div>
              <h3 className="text-gray-900 font-medium mb-2">Upload Document</h3>
              <p className="text-gray-600 text-sm">
                Upload your PDF, DOCX, or text file. Our AI analyzes and processes the content for optimal podcast conversion.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-3 mx-auto">
                2
              </div>
              <h3 className="text-gray-900 font-medium mb-2">Customize Settings</h3>
              <p className="text-gray-600 text-sm">
                Choose your preferred voice, narration style, and background music to create the perfect audio experience.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-3 mx-auto">
                3
              </div>
              <h3 className="text-gray-900 font-medium mb-2">Generate & Listen</h3>
              <p className="text-gray-600 text-sm">
                Our AI generates your personalized podcast in minutes. Download or stream your content immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SingleVoiceNarrationPanel;