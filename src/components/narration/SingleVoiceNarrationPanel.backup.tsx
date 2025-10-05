import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Play, Pause, Volume2, VolumeX, Music, ChevronDown, Upload, FileText, Settings, Download, Square, MessageCircle, RotateCcw, Mic2, Grid3X3, Minimize2, Maximize2 } from 'lucide-react';
import type { DocumentContent } from '../../types/document';
import { NarrationAPI } from '../../services/narrationApi';
import CartesiaVoiceSelector from '../voice/CartesiaVoiceSelector';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';
import GlassCard from '../ui/GlassCard';
import { getAudioUrl } from '../../config/api';

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
  const [selectedVoice, setSelectedVoice] = useState('829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30'); // Default: Linda - Conversational Guide
  const [selectedPodcastStyle, setSelectedPodcastStyle] = useState('conversational');
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
  const [summaryType, setSummaryType] = useState<'quick' | 'detailed' | 'full'>('detailed');
  const [showModernPlayer, setShowModernPlayer] = useState(false);
  const [currentTrackData, setCurrentTrackData] = useState<any>(null);
  const [playerMinimized, setPlayerMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Cartesia AI voices (verified from API)
  const cartesiaVoices = [
    { id: '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', name: 'Linda', description: 'Clear, confident mature female', language: 'English', gender: 'female' },
    { id: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b', name: 'Brooke', description: 'Approachable adult female', language: 'English', gender: 'female' },
    { id: 'f786b574-daa5-4673-aa0c-cbe3e8534c02', name: 'Katie', description: 'Enunciating young adult female', language: 'English', gender: 'female' },
    { id: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', name: 'Jacqueline', description: 'Confident, young adult female', language: 'English', gender: 'female' },
    { id: '694f9389-aac1-45b6-b726-9d9369183238', name: 'Sarah', description: 'Soothing female for meditations', language: 'English', gender: 'female' },
    { id: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', name: 'Blake', description: 'Energetic adult male', language: 'English', gender: 'male' },
    { id: '5ee9feff-1265-424a-9d7f-8e4d431a12c7', name: 'Ronald', description: 'Intense, deep young adult male', language: 'English', gender: 'male' },
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

    // Handle different summary types
    if (summaryType === 'full') {
      // For full document, just display the original content
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
    const voice = cartesiaVoices.find(v => v.id === selectedVoice);
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
        selectedPodcastStyle,
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
          const audio = new Audio(getAudioUrl(response.audioUrl, 'node'));
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
      link.href = getAudioUrl(audioUrl, 'node');
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
          className="w-1 h-5 rounded-full animate-pulse"
          style={{
            backgroundColor: '#00D4E4',
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

    // Amazon Music colors
    const colors = {
      primary: '0, 212, 228',      // #00D4E4 (Amazon Music cyan)
      secondary: '0, 212, 228',    // #00D4E4
      accent1: '0, 212, 228',      // #00D4E4
      accent2: '0, 212, 228',      // #00D4E4
    };

    return (
      <div className="space-y-6 relative">
        {/* Amazon Music Background Effect */}
        <div
          className="absolute inset-0 rounded-3xl opacity-40 transition-all duration-500"
          style={{
            background: `radial-gradient(ellipse at center, rgba(0, 212, 228, 0.3) 0%, rgba(0, 212, 228, 0.15) 30%, rgba(0, 212, 228, 0.08) 60%, transparent 80%)`,
            filter: 'blur(3px)',
            animation: 'pulseGlow 3s ease-in-out infinite',
            transform: `scale(${1.1 + intensity * 0.4})`
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl opacity-25"
          style={{
            background: `conic-gradient(from 0deg, rgba(0, 212, 228, 0.15), rgba(0, 212, 228, 0.05), rgba(0, 212, 228, 0.15), rgba(0, 212, 228, 0.05))`,
            filter: 'blur(1px)',
            animation: 'rotate 20s linear infinite',
            transform: `scale(${1.3 + intensity * 0.2})`
          }}
        />

        {/* Voice Animation Circle */}
        <div className="relative flex items-center justify-center z-10">
          {/* Outer wave rings */}
          {[...Array(3)].map((_, ringIndex) => (
            <div
              key={ringIndex}
              className="absolute rounded-full border-2 transition-all duration-300"
              style={{
                width: `${180 + ringIndex * 20}px`,
                height: `${180 + ringIndex * 20}px`,
                borderColor: `rgba(${colors.primary}, ${(0.3 - ringIndex * 0.1) + intensity * 0.2})`,
                transform: `scale(${1 + intensity * 0.1 + ringIndex * 0.05})`,
                animation: `pulse ${2 + ringIndex * 0.5}s ease-in-out infinite`,
                animationDelay: `${ringIndex * 0.3}s`
              }}
            />
          ))}

          {/* Dynamic gradient circle that responds to voice */}
          <div
            className="w-40 h-40 rounded-full transition-transform duration-200 ease-out relative z-10"
            style={{
              background: `conic-gradient(from 0deg,
                    rgba(${colors.primary}, ${0.8 + intensity * 0.2}) 0deg,
                    rgba(${colors.primary}, ${0.9 + intensity * 0.1}) 90deg,
                    rgba(${colors.primary}, ${0.8 + intensity * 0.2}) 180deg,
                    rgba(${colors.primary}, ${0.9 + intensity * 0.1}) 270deg,
                    rgba(${colors.primary}, ${0.8 + intensity * 0.2}) 360deg)`,
              transform: `scale(${scale})`,
              filter: `blur(${1 - intensity * 0.8}px)`,
              boxShadow: `0 0 ${20 + intensity * 30}px rgba(${colors.primary}, ${0.4 + intensity * 0.3})`
            }}
          />
          
          {/* Spectrum visualization around the circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45) * (Math.PI / 180);
              const radius = 100 + intensity * 20;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const barHeight = 15 + intensity * 25;

              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: '4px',
                    height: `${barHeight}px`,
                    backgroundColor: `rgba(${colors.accent1}, ${0.8 + intensity * 0.2})`,
                    transform: `translate(${x}px, ${y}px) rotate(${i * 45}deg)`,
                    transformOrigin: 'center',
                    animation: `spectrumBar ${0.8 + Math.random() * 0.4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              );
            })}
          </div>

          {/* Central play/pause button */}
          <div className="absolute inset-0 flex items-center justify-center z-20">
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
              className="w-16 h-16 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors shadow-lg border-2"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              }}
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
        <div className="rounded-lg p-4 border shadow-sm space-y-4 relative overflow-hidden" style={{
          backgroundColor: '#14191a',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}>
          {/* Audio Playing Background Effect */}
          {(isPodcastPlaying || isGenerating) && (
            <>
              <div
                className="absolute inset-0 opacity-50 transition-opacity duration-500 rounded-lg"
                style={{
                  background: `radial-gradient(circle at center, rgba(0, 212, 228, 0.25) 0%, rgba(0, 212, 228, 0.12) 40%, rgba(0, 212, 228, 0.06) 70%, transparent 100%)`,
                  filter: 'blur(2px)',
                  animation: 'pulseGlow 2.5s ease-in-out infinite'
                }}
              />
              <div
                className="absolute inset-0 opacity-30 rounded-lg"
                style={{
                  background: `linear-gradient(45deg, rgba(0, 212, 228, 0.1) 0%, transparent 50%, rgba(0, 212, 228, 0.08) 100%)`,
                  animation: 'pulseGlow 4s ease-in-out infinite reverse'
                }}
              />
            </>
          )}

          {/* Audio Visualization Bar */}
          {isPodcastPlaying && (
            <div className="mb-4 relative z-10">
              <div className="flex items-center justify-center space-x-1 h-12 rounded-lg p-2 backdrop-blur-sm border border-opacity-30" style={{
                backgroundColor: 'rgba(0, 212, 228, 0.15)',
                borderColor: 'rgba(0, 212, 228, 0.3)',
                boxShadow: '0 0 20px rgba(0, 212, 228, 0.1)'
              }}>
                {[...Array(20)].map((_, i) => {
                  const barHeight = Math.random() * (audioLevel + 0.3) * 40 + 5;
                  return (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-150 ease-out"
                      style={{
                        width: '3px',
                        height: `${barHeight}px`,
                        backgroundColor: '#00D4E4',
                        opacity: 0.8 + (audioLevel * 0.2),
                        animation: `audioBar ${0.8 + Math.random() * 0.6}s ease-in-out infinite`,
                        animationDelay: `${i * 0.05}s`,
                        boxShadow: '0 0 4px rgba(0, 212, 228, 0.5)'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
          {/* Primary Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleStop}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Stop"
            >
              <Square className="w-5 h-5" style={{
                color: 'rgba(255, 255, 255, 0.7)'
              }} />
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
              className="p-3 text-white rounded-lg transition-colors"
              style={{
                backgroundColor: '#00D4E4'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00E8FA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#00D4E4';
              }}
            >
              {isPodcastPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Download"
            >
              <Download className="w-5 h-5" style={{
                color: 'rgba(255, 255, 255, 0.7)'
              }} />
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{
              color: 'rgba(255, 255, 255, 0.7)'
            }}>Speed</span>
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
                  className="px-2 py-1 text-xs rounded transition-colors"
                  style={{
                    backgroundColor: playbackSpeed === speed
                      ? '#00D4E4'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: playbackSpeed === speed
                      ? '#FFFFFF'
                      : 'rgba(255, 255, 255, 0.7)'
                  }}
                  onMouseEnter={(e) => {
                    if (playbackSpeed !== speed) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (playbackSpeed !== speed) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
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
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors text-sm"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
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
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{
                    backgroundColor: '#14191a',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={!question.trim()}
                  className="px-3 py-2 text-white rounded-lg transition-colors text-sm"
                  style={{
                    backgroundColor: question.trim() ? '#00D4E4' : 'rgba(255, 255, 255, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (question.trim()) {
                      e.currentTarget.style.backgroundColor = '#00E8FA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (question.trim()) {
                      e.currentTarget.style.backgroundColor = '#00D4E4';
                    }
                  }}
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
        <div className="w-16 h-48 backdrop-blur-3xl border shadow-2xl rounded-xl overflow-hidden flex flex-col relative"
             style={{
               backgroundColor: '#14191a',
               borderColor: 'rgba(255, 255, 255, 0.1)',
               boxShadow: isPodcastPlaying ? '0 0 30px rgba(0, 212, 228, 0.3)' : undefined
             }}>
          {/* Amazon Music Playing Background Effect */}
          {isPodcastPlaying && (
            <>
              <div
                className="absolute inset-0 opacity-40 rounded-xl"
                style={{
                  background: `linear-gradient(180deg, rgba(0, 212, 228, 0.2) 0%, rgba(0, 212, 228, 0.1) 30%, transparent 60%, rgba(0, 212, 228, 0.08) 100%)`,
                  filter: 'blur(1px)',
                  animation: 'pulseGlow 2s ease-in-out infinite'
                }}
              />
              <div
                className="absolute inset-0 opacity-25 rounded-xl"
                style={{
                  background: `radial-gradient(circle at center, rgba(0, 212, 228, 0.15) 0%, transparent 70%)`,
                  animation: 'pulseGlow 3s ease-in-out infinite reverse'
                }}
              />
            </>
          )}
          {/* Minimized Header */}
          <div className="p-3 backdrop-blur-md border-b flex flex-col items-center space-y-2"
               style={{
                 backgroundColor: '#14191a',
                 borderColor: 'rgba(255, 255, 255, 0.1)'
               }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center"
                 style={{
                   backgroundColor: '#00D4E4'
                 }}>
              <Mic2 className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col items-center space-y-1">
              <button
                onClick={onMinimize}
                className="p-1 rounded transition-colors"
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
                title="Expand Panel"
              >
                <ChevronDown className="w-4 h-4 transform rotate-90" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded transition-colors"
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
                title="Close Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Minimized Audio Controls */}
          {showModernPlayer && currentTrackData && (
            <div className="flex-1 flex flex-col items-center justify-center p-2 space-y-2">
              {/* Mini Spectrum Visualization */}
              {isPodcastPlaying && (
                <div className="flex items-end justify-center space-x-0.5 h-6 mb-2">
                  {[...Array(6)].map((_, i) => {
                    const barHeight = 8 + Math.random() * (audioLevel + 0.2) * 12;
                    return (
                      <div
                        key={i}
                        className="rounded-full transition-all duration-150"
                        style={{
                          width: '2px',
                          height: `${barHeight}px`,
                          backgroundColor: '#00D4E4',
                          opacity: 0.8 + (audioLevel * 0.2),
                          animation: `audioBar ${0.6 + Math.random() * 0.4}s ease-in-out infinite`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    );
                  })}
                </div>
              )}

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
                className="w-8 h-8 text-white rounded-full flex items-center justify-center transition-colors relative"
                style={{
                  backgroundColor: '#00D4E4',
                  animation: isPodcastPlaying ? 'pulseGlow 2s ease-in-out infinite' : 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#00E8FA';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#00D4E4';
                }}
              >
                {isPodcastPlaying ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 ml-0.5 text-white" />}
              </button>

              {/* Enhanced Progress indicator with animation */}
              <div className="w-2 h-12 rounded-full overflow-hidden border" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}>
                <div
                  className="w-full rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: '#00D4E4',
                    height: isPodcastPlaying ? `${audioLevel * 100}%` : '20%',
                    transform: 'translateY(100%)',
                    animation: isPodcastPlaying ? 'none' : 'pulse 2s infinite',
                    boxShadow: isPodcastPlaying ? '0 0 6px #00D4E4' : 'none'
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

          @keyframes audioBar {
            0% {
              transform: scaleY(0.3);
              opacity: 0.6;
            }
            50% {
              transform: scaleY(1);
              opacity: 1;
            }
            100% {
              transform: scaleY(0.3);
              opacity: 0.6;
            }
          }

          @keyframes pulseGlow {
            0% {
              box-shadow: 0 0 5px currentColor;
            }
            50% {
              box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
            }
            100% {
              box-shadow: 0 0 5px currentColor;
            }
          }

          @keyframes spectrumBar {
            0% {
              height: 15px;
              opacity: 0.7;
            }
            50% {
              height: 40px;
              opacity: 1;
            }
            100% {
              height: 15px;
              opacity: 0.7;
            }
          }
        `}
      </style>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop for the left side */}
        <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      {/* Main Panel Container - Half Screen */}
      <div className={`${isExpanded ? 'w-3/4' : 'w-1/2'} backdrop-blur-3xl border-l shadow-2xl overflow-hidden flex flex-col relative`} style={{
        backgroundColor: (isPodcastPlaying || isGenerating) ? '#14191a' : '#000000',
        borderColor: (isPodcastPlaying || isGenerating) ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
        borderLeftWidth: (isPodcastPlaying || isGenerating) ? '3px' : '1px',
        boxShadow: (isPodcastPlaying || isGenerating) ? 'inset 0 0 150px rgba(0, 212, 228, 0.15), -15px 0 40px rgba(0, 212, 228, 0.3)' : undefined,
        transition: 'all 0.5s ease-in-out'
      }}>
        {/* Amazon Music Panel Background Effect */}
        {(isPodcastPlaying || isGenerating) && (
          <>
            <div
              className="absolute inset-0 opacity-30 pointer-events-none z-0"
              style={{
                background: `
                  radial-gradient(circle at 30% 30%, rgba(0, 212, 228, 0.25) 0%, rgba(0, 212, 228, 0.1) 40%, transparent 70%),
                  radial-gradient(circle at 70% 70%, rgba(0, 212, 228, 0.2) 0%, rgba(0, 212, 228, 0.05) 50%, transparent 80%),
                  linear-gradient(45deg, rgba(0, 212, 228, 0.08) 0%, transparent 30%, rgba(0, 212, 228, 0.12) 70%, transparent 100%)
                `,
                filter: 'blur(2px)',
                animation: 'pulseGlow 4s ease-in-out infinite'
              }}
            />
            <div
              className="absolute inset-0 opacity-20 pointer-events-none z-0"
              style={{
                background: `rgba(0, 212, 228, 0.05)`,
                animation: 'pulseGlow 3s ease-in-out infinite reverse'
              }}
            />
          </>
        )}
        
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
                 style={{
                   backgroundColor: '#00D4E4'
                 }}>
              <Mic2 className="w-4 h-4 text-white" />
            </div>
            <span>Single Voice Narration</span>
          </h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto relative z-10">
          {/* Top Section - Side by Side Layout */}
          <div className="flex p-6 space-x-6">
            {/* Left Side - Document Summary Section */}
            <div className="flex-1">
              <GlassCard variant="medium" className="p-6 h-full" glow>
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
                          {uploadedContent && uploadedContent.length > 0
                            ? uploadedContent[0].metadata?.fileName || uploadedContent[0].title
                            : internalUploadedFiles && internalUploadedFiles.length > 0
                              ? internalUploadedFiles[0].name
                              : uploadedFiles && uploadedFiles.length > 0
                                ? uploadedFiles[0].name
                                : 'Document'}
                        </span>
                      </div>

                      {/* Summary Type Selector */}
                      <div className="mb-3">
                        <label className="text-xs block mb-2" style={{
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>Summary Type</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'quick', name: 'Quick', desc: 'Concise key points' },
                            { id: 'detailed', name: 'Detailed', desc: 'In-depth analysis' },
                            { id: 'full', name: 'Full Document', desc: 'Complete content' }
                          ].map((type) => (
                            <button
                              key={type.id}
                              onClick={() => setSummaryType(type.id as 'quick' | 'detailed' | 'full')}
                              className={`p-2 text-xs rounded-lg transition-all duration-200 border ${
                                summaryType === type.id
                                  ? 'border-blue-400 bg-blue-500/20 shadow-sm'
                                  : 'border-gray-300/30 bg-transparent hover:bg-gray-500/10'
                              }`}
                              style={{
                                backgroundColor: summaryType === type.id
                                  ? 'rgba(0, 212, 228, 0.2)'
                                  : 'transparent',
                                borderColor: summaryType === type.id
                                  ? '#00D4E4'
                                  : 'rgba(255, 255, 255, 0.1)',
                                color: summaryType === type.id
                                  ? '#00D4E4'
                                  : 'rgba(255, 255, 255, 0.9)'
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
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#00E8FA';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#00D4E4';
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
                          borderColor: '#00D4E4'
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
                          borderColor: '#00D4E4'
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
                          ? 'border-cyan-400 bg-cyan-50/20'
                          : 'border-gray-400/30 bg-gray-500/10 hover:border-cyan-400/50'
                      }`}
                      style={{
                        borderColor: isDragActive ? '#00D4E4' : 'rgba(255, 255, 255, 0.2)',
                        backgroundColor: isDragActive ? 'rgba(0, 212, 228, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <input {...getInputProps()} />
                      <FileText className="w-10 h-10 mx-auto mb-3" style={{
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
            </div>

            {/* Right Side - Customize Options */}
            <div className="flex-1">
              <GlassCard variant="medium" className="p-6 h-full" glow>
              <h2 className="text-xl font-bold mb-2" style={{
                color: '#FFFFFF'
              }}>Customize Your Podcast</h2>
              <p className="text-sm mb-6" style={{
                color: 'rgba(255, 255, 255, 0.7)'
              }}>Personalize your audio experience with our customization options.</p>

                {/* Voice Selection */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4" style={{
                        color: '#00D4E4'
                      }} />
                      <h3 className="font-medium text-sm" style={{
                        color: '#FFFFFF'
                      }}>Voice Selection</h3>
                      <span className="text-xs px-2 py-1 rounded-full backdrop-blur-sm border"
                            style={{
                              backgroundColor: 'rgba(0, 212, 228, 0.2)',
                              color: '#00D4E4',
                              borderColor: '#00D4E4'
                            }}>
                        Cartesia AI
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAdvancedVoiceSelector(!showAdvancedVoiceSelector)}
                      className="flex items-center space-x-1 text-xs transition-colors"
                      style={{
                        color: '#00D4E4'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#00E8FA';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#00D4E4';
                      }}
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
                    <div className="border rounded-lg p-4 backdrop-blur-sm" style={{
                      backgroundColor: '#14191a',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    }}>
                      <CartesiaVoiceSelector
                        selectedVoice={selectedVoice}
                        selectedPodcastStyle={selectedPodcastStyle}
                        onVoiceChange={setSelectedVoice}
                        onPodcastStyleChange={setSelectedPodcastStyle}
                        previewText="This is how your podcast content will sound with this voice and style combination."
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs block mb-1" style={{
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>Primary Narrator</label>
                      <p className="text-xs mb-2" style={{
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}>Select from high-quality Cartesia AI voices (click "All Voices" for advanced options)</p>
                      <div className="relative">
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full px-3 py-2 text-sm backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                          style={{
                            backgroundColor: '#14191a',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF'
                          }}
                        >
                          {cartesiaVoices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} - {voice.description} ({voice.gender})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{
                          color: 'rgba(255, 255, 255, 0.5)'
                        }} />
                      </div>
                    </div>
                  )}
                </div>


                {/* Format Options */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Settings className="w-4 h-4" style={{
                      color: '#FFFFFF'
                    }} />
                    <h3 className="font-medium text-sm" style={{
                      color: '#FFFFFF'
                    }}>Format Options</h3>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs block mb-1" style={{
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>Podcast Style</label>
                    <p className="text-xs mb-2" style={{
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>Choose your preferred style</p>
                    <div className="relative">
                      <select
                        value={narrationType}
                        onChange={(e) => setNarrationType(e.target.value)}
                        className="w-full px-3 py-2 text-sm backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                        style={{
                          backgroundColor: '#14191a',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#FFFFFF'
                        }}
                      >
                        <option value="conversational">Conversational Podcast</option>
                        {narrationTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{
                        color: 'rgba(255, 255, 255, 0.5)'
                      }} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs block mb-1" style={{
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>Background Music</label>
                    <p className="text-xs mb-2" style={{
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>Add ambient background music</p>
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
                        className="w-full px-3 py-2 text-sm backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                        style={{
                          backgroundColor: '#14191a',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#FFFFFF'
                        }}
                      >
                        {musicOptions.map((music) => (
                          <option key={music.id} value={music.id}>
                            {music.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{
                        color: 'rgba(255, 255, 255, 0.5)'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Convert Button or Modern Audio Player */}
                {showModernPlayer && currentTrackData ? (
                  <div className="py-6">
                    <GlassCard variant="dark" className="p-6" glow>
                      <div className="text-center mb-4">
                        <h3 className="font-semibold mb-2" style={{
                          color: '#FFFFFF'
                        }}>🎧 Your Podcast is Ready!</h3>
                        <p className="text-sm" style={{
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>Enjoy your AI-generated audio experience</p>
                      </div>
                      <div className="bg-gradient-to-br from-primary-600/20 to-secondary-600/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                        <ModernAudioPlayer
                          audioUrl={currentNarration ? getAudioUrl(currentNarration.audioUrl, 'node') : undefined}
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
                    className="w-full px-4 py-3 text-white rounded-xl font-semibold text-sm disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                    style={{
                      backgroundColor: isGenerating ? 'rgba(255, 255, 255, 0.3)' : '#00D4E4'
                    }}
                    onMouseEnter={(e) => {
                      if (!isGenerating) {
                        e.currentTarget.style.backgroundColor = '#00E8FA';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isGenerating) {
                        e.currentTarget.style.backgroundColor = '#00D4E4';
                      }
                    }}
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