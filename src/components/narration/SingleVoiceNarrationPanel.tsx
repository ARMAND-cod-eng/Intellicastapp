import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Play, Pause, Volume2, VolumeX, Music, ChevronDown, Upload, FileText, Settings, Download, Square, MessageCircle, RotateCcw, Mic2, Grid3X3, Minimize2 } from 'lucide-react';
import type { DocumentContent } from '../../types/document';
import { NarrationAPI } from '../../services/narrationApi';
import ChatterboxVoiceSelector from '../voice/ChatterboxVoiceSelector';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';
import GlassCard from '../ui/GlassCard';

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
  onMinimize?: () => void;
  isMinimized?: boolean;
  onAudioGenerated?: (audioData: {
    id: string;
    audioUrl: string;
    trackData: any;
    title: string;
    shouldShowExternal?: boolean;
  }) => void;
}

const SingleVoiceNarrationPanel: React.FC<SingleVoiceNarrationPanelProps> = ({
  isOpen,
  onClose,
  uploadedContent,
  uploadedFiles,
  onMinimize,
  isMinimized = false,
  onAudioGenerated
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
  const [showModernPlayer, setShowModernPlayer] = useState(false);
  const [currentTrackData, setCurrentTrackData] = useState<any>(null);
  const [playerMinimized, setPlayerMinimized] = useState(false);

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

  // Get document title for player
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
    return 'AI Generated Podcast';
  };

  // Get voice name for display
  const getSelectedVoiceName = () => {
    const voice = popularChatterboxVoices.find(v => v.id === selectedVoice);
    return voice ? voice.name : 'AI Voice';
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
          
          // Create track data for the modern audio player
          const trackData = {
            title: getDocumentTitle(),
            artist: `${getSelectedVoiceName()} • IntelliCast AI`,
            duration: response.duration ? `${Math.floor(response.duration / 60)}:${Math.floor(response.duration % 60).toString().padStart(2, '0')}` : "Unknown",
            artwork: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=400&fit=crop&crop=center",
            description: documentSummary || `AI-generated ${narrationType} narration of your document using advanced voice synthesis.`
          };
          
          setCurrentTrackData(trackData);
          setShowModernPlayer(true);
          setIsPodcastPlaying(false); // Let the player control playback
          
          // Notify parent component about audio generation
          if (onAudioGenerated) {
            onAudioGenerated({
              id: response.audioId || 'narration',
              audioUrl: response.audioUrl,
              trackData: trackData,
              title: getDocumentTitle()
            });
          }
          
          // Create and configure audio element for fallback
          const audio = new Audio(`http://localhost:3004${response.audioUrl}`);
          audio.onloadeddata = () => {
            console.log('Audio loaded successfully');
            setAudioElement(audio);
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
      link.href = `http://localhost:3004${audioUrl}`;
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

  // Minimized panel view
  if (isMinimized) {
    return (
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="w-16 h-48 bg-dark-900/95 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-xl overflow-hidden flex flex-col">
          {/* Minimized Header */}
          <div className="p-3 bg-white/5 backdrop-blur-md border-b border-white/10 flex flex-col items-center space-y-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <Mic2 className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col items-center space-y-1">
              <button
                onClick={onMinimize}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
                title="Expand Panel"
              >
                <ChevronDown className="w-4 h-4 transform rotate-90" />
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
                title="Close Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Minimized Audio Controls */}
          {showModernPlayer && currentTrackData && (
            <div className="flex-1 flex flex-col items-center justify-center p-2 space-y-2">
              {/* Play/Pause Button */}
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
                  }
                }}
                className="w-8 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center transition-colors"
              >
                {isPodcastPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
              </button>
              
              {/* Progress indicator */}
              <div className="w-1 h-16 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="w-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ 
                    height: isPodcastPlaying ? `${audioLevel * 100}%` : '20%',
                    transform: 'translateY(100%)',
                    animation: isPodcastPlaying ? 'none' : 'pulse 2s infinite'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      {/* Main Panel Container - Half Screen */}
      <div className="w-1/2 bg-dark-900/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
        {/* Animated Background */}
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 to-secondary-900/20" />
        
        {/* Top Control Bar */}
        <div className="absolute top-6 left-6 z-[100] flex items-center space-x-3">
          <button
            onClick={onMinimize || (() => console.log('Minimize clicked'))}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xl border-2 border-blue-500"
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
        <div className="relative flex items-center justify-between p-6 bg-white/5 backdrop-blur-md border-b border-white/10">
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-white" />
            </div>
            <span>Single Voice Narration</span>
          </h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Top Section - Side by Side Layout */}
          <div className="flex p-6 space-x-6">
            {/* Left Side - Document Summary Section */}
            <div className="flex-1">
              <GlassCard variant="medium" className="p-6 h-full" glow>
                {(uploadedContent && uploadedContent.length > 0) || 
                 (uploadedFiles && uploadedFiles.length > 0) || 
                 (internalUploadedFiles && internalUploadedFiles.length > 0) ? (
                  <>
                    <h2 className="text-xl font-bold text-white mb-2">Document Summary</h2>
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <FileText className="w-5 h-5 text-primary-400" />
                        <span className="text-sm font-medium text-white/90">
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
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-white/80 text-sm leading-relaxed flex-1">
                          {getDocumentSummary()}
                        </p>
                        {!documentSummary && !isLoadingSummary && (
                          <button
                            onClick={generateDocumentSummary}
                            className="ml-3 px-3 py-1 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-500 hover:to-secondary-500 transition-all duration-300 text-xs whitespace-nowrap shadow-lg hover:shadow-primary-500/25"
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
                        <div className="bg-primary-500/20 backdrop-blur-sm rounded-lg p-3 border border-primary-500/30">
                          <div className="text-primary-300 font-medium">Word Count</div>
                          <div className="text-white/90">{uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length} words</div>
                        </div>
                        <div className="bg-secondary-500/20 backdrop-blur-sm rounded-lg p-3 border border-secondary-500/30">
                          <div className="text-secondary-300 font-medium">Est. Reading Time</div>
                          <div className="text-white/90">{Math.ceil((uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length) / 250)} min</div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-white mb-2">Upload Your Document</h2>
                    <p className="text-white/70 text-sm mb-6">
                      We support PDF, EPUB, DOCX, and TXT formats. Maximum file size is 50MB.
                    </p>
                    
                    {/* Upload Area */}
                    <div 
                      {...getRootProps()} 
                      className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors cursor-pointer ${
                        isDragActive 
                          ? 'border-primary-400 bg-primary-500/20 backdrop-blur-sm' 
                          : 'border-white/30 bg-white/10 backdrop-blur-sm hover:border-primary-400/50'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <FileText className="w-10 h-10 text-white/60 mx-auto mb-3" />
                      {isDragActive ? (
                        <p className="text-primary-300 text-sm mb-3">Drop your file here</p>
                      ) : (
                        <>
                          <p className="text-white/70 text-sm mb-3">Drag and drop your file here or click to browse</p>
                          <div className="px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg text-sm font-medium hover:from-primary-500 hover:to-secondary-500 transition-all duration-300 inline-block shadow-lg hover:shadow-primary-500/25">
                            Choose File
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </GlassCard>
            </div>

            {/* Right Side - Customize Options */}
            <div className="flex-1">
              <GlassCard variant="medium" className="p-6 h-full" glow>
              <h2 className="text-xl font-bold text-white mb-2">Customize Your Podcast</h2>
              <p className="text-white/70 text-sm mb-6">
                Personalize your audio experience with our customization options.
              </p>

                {/* Voice Selection */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-white/90" />
                      <h3 className="text-white font-medium text-sm">Voice Selection</h3>
                      <span className="text-xs bg-secondary-500/30 text-secondary-200 px-2 py-1 rounded-full backdrop-blur-sm border border-secondary-400/30">Chatterbox Multilingual</span>
                    </div>
                    <button
                      onClick={() => setShowAdvancedVoiceSelector(!showAdvancedVoiceSelector)}
                      className="flex items-center space-x-1 text-xs text-primary-300 hover:text-primary-200 transition-colors"
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
                    <div className="border border-white/20 rounded-lg p-4 bg-white/10 backdrop-blur-sm">
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
                      <label className="text-xs text-white/80 block mb-1">Primary Narrator</label>
                      <p className="text-xs text-white/60 mb-2">Popular Chatterbox multilingual voices (click "All Voices" for full selection)</p>
                      <div className="relative">
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                        >
                          {popularChatterboxVoices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} ({voice.language}, {voice.description})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Customization */}
                <div className="mb-6">
                  <div className="p-3 bg-primary-500/20 backdrop-blur-sm rounded-lg border border-primary-500/30">
                    <h4 className="text-sm font-medium text-white/90 mb-2">Voice Customization (Advanced)</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-white/80 block mb-1">Exaggeration</label>
                        <input
                          type="range"
                          min="0.25"
                          max="2"
                          step="0.05"
                          value={voiceSettings.exaggeration}
                          onChange={(e) => setVoiceSettings(prev => ({...prev, exaggeration: parseFloat(e.target.value)}))}
                          className="w-full accent-primary-500"
                        />
                        <span className="text-xs text-white/60">{voiceSettings.exaggeration.toFixed(2)}</span>
                      </div>
                      
                      <div>
                        <label className="text-xs text-white/80 block mb-1">Temperature</label>
                        <input
                          type="range"
                          min="0.05"
                          max="2"
                          step="0.05"
                          value={voiceSettings.temperature}
                          onChange={(e) => setVoiceSettings(prev => ({...prev, temperature: parseFloat(e.target.value)}))}
                          className="w-full accent-primary-500"
                        />
                        <span className="text-xs text-white/60">{voiceSettings.temperature.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Format Options */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Settings className="w-4 h-4 text-white/90" />
                    <h3 className="text-white font-medium text-sm">Format Options</h3>
                  </div>
                  
                  <div className="mb-4">
                    <label className="text-xs text-white/80 block mb-1">Podcast Style</label>
                    <p className="text-xs text-white/60 mb-2">Choose your preferred style</p>
                    <div className="relative">
                      <select
                        value={narrationType}
                        onChange={(e) => setNarrationType(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                      >
                        <option value="conversational">Conversational Podcast</option>
                        {narrationTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-white/80 block mb-1">Background Music</label>
                    <p className="text-xs text-white/60 mb-2">Add ambient background music</p>
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
                        className="w-full px-3 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                      >
                        {musicOptions.map((music) => (
                          <option key={music.id} value={music.id}>
                            {music.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Convert Button or Modern Audio Player */}
                {showModernPlayer && currentTrackData ? (
                  <div className="py-6">
                    <GlassCard variant="dark" className="p-6" glow>
                      <div className="text-center mb-4">
                        <h3 className="text-white font-semibold mb-2">🎧 Your Podcast is Ready!</h3>
                        <p className="text-white/70 text-sm">Enjoy your AI-generated audio experience</p>
                      </div>
                      <div className="bg-gradient-to-br from-primary-600/20 to-secondary-600/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                        <ModernAudioPlayer
                          audioUrl={currentNarration ? `http://localhost:3004${currentNarration.audioUrl}` : undefined}
                          trackData={currentTrackData}
                          isMinimized={false}
                          onToggleMinimize={() => {
                            // Notify parent to show external audio player
                            if (onAudioGenerated) {
                              onAudioGenerated({
                                id: currentNarration?.id || 'narration',
                                audioUrl: currentNarration?.audioUrl || '',
                                trackData: currentTrackData,
                                title: getDocumentTitle(),
                                shouldShowExternal: true
                              });
                            }
                            setShowModernPlayer(false);
                          }}
                          onClose={() => {
                            setShowModernPlayer(false);
                            setCurrentTrackData(null);
                            if (audioElement) {
                              audioElement.pause();
                              audioElement.currentTime = 0;
                            }
                            setIsPodcastPlaying(false);
                          }}
                        />
                      </div>
                    </GlassCard>
                  </div>
                ) : isPodcastPlaying ? (
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
                    className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-semibold text-sm hover:from-primary-500 hover:to-secondary-500 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-primary-500/25"
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center space-x-3">
                        <span>Generating...</span>
                        <VoiceAnimation />
                      </div>
                    ) : (
                      '🎙️ Convert to Podcast'
                    )}
                  </button>
                )}
              </GlassCard>
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default SingleVoiceNarrationPanel;