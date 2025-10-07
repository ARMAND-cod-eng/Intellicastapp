import React, { useState } from 'react';
import { FileText, Link, Sparkles, Check, Zap } from 'lucide-react';
import type { DocumentContent } from '../../types/document';
import { useTheme } from '../../contexts/ThemeContext';
import SingleVoiceNarrationPanel from '../narration/SingleVoiceNarrationPanel';
import MultiVoiceConversationPanel from '../narration/MultiVoiceConversationPanel';
import AIContentDiscoveryPanel from '../narration/content-discovery';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';
import { getAudioUrl } from '../../config/api';

interface NewViewProps {
  currentView: string;
  onOpenUpload: () => void;
  uploadedContent?: DocumentContent[] | null;
  uploadedFiles?: File[] | null;
}

const NewView: React.FC<NewViewProps> = ({ currentView, onOpenUpload, uploadedContent, uploadedFiles }) => {
  const { theme } = useTheme();
  const [isSingleVoicePanelOpen, setIsSingleVoicePanelOpen] = useState(false);
  const [isSingleVoicePanelMinimized, setIsSingleVoicePanelMinimized] = useState(false);
  const [isMultiVoicePanelOpen, setIsMultiVoicePanelOpen] = useState(false);
  const [isMultiVoicePanelMinimized, setIsMultiVoicePanelMinimized] = useState(false);
  const [isAIDiscoveryPanelOpen, setIsAIDiscoveryPanelOpen] = useState(false);
  const [isAIDiscoveryPanelMinimized, setIsAIDiscoveryPanelMinimized] = useState(false);
  const [persistentAudioData, setPersistentAudioData] = useState<{
    id: string;
    audioUrl: string;
    trackData: any;
    title: string;
  } | null>(null);
  const [showPersistentPlayer, setShowPersistentPlayer] = useState(false);
  const [externalAudioPlayer, setExternalAudioPlayer] = useState<{
    id: string;
    audioUrl: string;
    trackData: any;
    title: string;
  } | null>(null);
  const [showExternalPlayer, setShowExternalPlayer] = useState(false);
  const [externalPlayerMinimized, setExternalPlayerMinimized] = useState(false);
  
  if (currentView !== 'new') return null;

  const uploadOptions = [
    {
      icon: FileText,
      title: 'Upload Document',
      description: 'Transform PDF, DOCX, TXT, or Markdown files into engaging podcasts',
      color: 'from-blue-500 to-blue-600',
      action: onOpenUpload,
    },
    {
      icon: Link,
      title: 'Import from URL',
      description: 'Extract content from web articles and news stories',
      color: 'from-green-500 to-green-600',
      action: () => {}, // TODO: Implement URL import
    },
    {
      icon: Sparkles,
      title: 'AI Content Discovery',
      description: 'Let AI find trending topics and create podcasts automatically',
      color: 'from-purple-500 to-purple-600',
      action: () => {}, // TODO: Implement AI discovery
    },
  ];

  const generationStyles = [
    {
      title: 'Single Voice Narration',
      description: 'Professional narrator reading your content with adjustable speed',
      features: ['Natural speech patterns', 'Customizable pace', 'Clear pronunciation'],
      recommended: false,
      action: () => {
        setIsSingleVoicePanelOpen(true);
        setIsSingleVoicePanelMinimized(false);
      },
    },
    {
      title: 'Multi-Voice Conversation',
      description: 'Dynamic discussion between 2-4 AI speakers about your content',
      features: ['Natural interruptions', 'Emotional responses', 'Engaging dialogue'],
      recommended: true,
      action: () => {
        setIsMultiVoicePanelOpen(true);
        setIsMultiVoicePanelMinimized(false);
      },
    },
    {
      title: 'AI Content Discovery',
      description: 'Let AI find trending topics and create podcasts automatically',
      features: ['Trending topics discovery', 'Auto content generation', 'Smart scheduling'],
      recommended: false,
      isAiPowered: true,
      action: () => {
        setIsAIDiscoveryPanelOpen(true);
        setIsAIDiscoveryPanelMinimized(false);
      },
    },
  ];

  return (
    <>
      <div className={`p-8 space-y-8 transition-all duration-300 ${
        (isSingleVoicePanelOpen && !isSingleVoicePanelMinimized) || (isMultiVoicePanelOpen && !isMultiVoicePanelMinimized) ? 'mr-1/2' : ''
      }`}>
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4" style={{color: '#FFFFFF'}}>
          Create Your Next Podcast
        </h1>
        <p className="text-xl max-w-3xl mx-auto" style={{color: 'rgba(255, 255, 255, 0.7)'}}>
          Transform any content into engaging audio experiences with AI-powered narration and conversation
        </p>
      </section>

      {/* Upload Options */}
      <section>
        <h2 className="text-2xl font-bold mb-6" style={{color: '#FFFFFF'}}>Choose Your Content Source</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {uploadOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <div
                key={index}
                onClick={option.action}
                className="group relative p-8 rounded-2xl border-2 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: '#14191a',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00D4E4';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.05)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 228, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.backgroundColor = '#14191a';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {option.title === 'Upload Document' && uploadedContent && uploadedContent.length > 0 && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#10B981'}}>
                    <Check size={16} className="text-white" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg"
                       style={{
                         backgroundColor: '#00D4E4'
                       }}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3" style={{color: '#FFFFFF'}}>
                    {option.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{color: 'rgba(255, 255, 255, 0.7)'}}>
                    {option.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Generation Styles */}
      <section>
        <h2 className="text-2xl font-bold mb-6" style={{color: '#FFFFFF'}}>Choose Your Podcast Style</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {generationStyles.map((style, index) => (
            <div
              key={index}
              onClick={style.action}
              className="relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{
                backgroundColor: '#14191a',
                borderColor: style.recommended ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00D4E4';
                e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.05)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 212, 228, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = style.recommended ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.backgroundColor = '#14191a';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {style.recommended && (
                <div className="absolute -top-4 left-6">
                  <span className="px-4 py-2 text-sm font-bold rounded-full text-white shadow-lg" style={{backgroundColor: '#F59E0B'}}>
                    ⭐ Recommended
                  </span>
                </div>
              )}
              {style.isAiPowered && (
                <div className="absolute -top-4 left-6">
                  <span className="px-4 py-2 text-sm font-bold rounded-full text-white shadow-lg animate-pulse" style={{background: 'linear-gradient(135deg, #9333EA, #EC4899)'}}>
                    ✨ AI Powered
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2" style={{color: '#FFFFFF'}}>
                  {style.isAiPowered && <Zap className="w-5 h-5" style={{color: '#00D4E4'}} />}
                  {style.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{color: 'rgba(255, 255, 255, 0.7)'}}>
                  {style.description}
                </p>

                <div className="pt-4 border-t" style={{borderColor: 'rgba(255, 255, 255, 0.1)'}}>
                  <ul className="space-y-3">
                    {style.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm" style={{color: 'rgba(255, 255, 255, 0.6)'}}>
                        <div className="w-2 h-2 rounded-full mr-3 flex-shrink-0" style={{backgroundColor: '#00D4E4'}}></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      </div>

      {/* Single Voice Narration Panel */}
      <SingleVoiceNarrationPanel
        isOpen={isSingleVoicePanelOpen}
        isMinimized={isSingleVoicePanelMinimized}
        onClose={() => {
          setIsSingleVoicePanelOpen(false);
          setIsSingleVoicePanelMinimized(false);
          // Show persistent player if audio was generated but no external player is shown
          if (persistentAudioData && !showExternalPlayer) {
            setShowPersistentPlayer(true);
          }
        }}
        onMinimize={() => {
          const willBeMinimized = !isSingleVoicePanelMinimized;
          setIsSingleVoicePanelMinimized(willBeMinimized);
          
          // If minimizing and there's audio data but no external player shown yet, show external player
          if (willBeMinimized && persistentAudioData && !showExternalPlayer) {
            setExternalAudioPlayer(persistentAudioData);
            setShowExternalPlayer(true);
            setExternalPlayerMinimized(false);
          }
          
          // If expanding and external player is shown, hide it (audio will be in panel)
          if (!willBeMinimized && showExternalPlayer) {
            setShowExternalPlayer(false);
            setExternalAudioPlayer(null);
          }
        }}
        onAudioGenerated={(audioData) => {
          if (audioData.shouldShowExternal) {
            // Show external floating audio player
            setExternalAudioPlayer(audioData);
            setShowExternalPlayer(true);
            setExternalPlayerMinimized(false);
          } else {
            // Store for persistent player when panel closes
            setPersistentAudioData(audioData);
            setShowPersistentPlayer(false); // Hide persistent player when panel is open
            setShowExternalPlayer(false); // Hide external player when panel is open
          }
        }}
        uploadedContent={uploadedContent}
        uploadedFiles={uploadedFiles}
      />

      {/* External Floating Audio Player - Always visible when minimized from panel */}
      {showExternalPlayer && externalAudioPlayer && (
        <div className={`fixed z-50 transition-all duration-300 ${
          externalPlayerMinimized 
            ? 'bottom-4 right-4' 
            : 'top-4 left-4'
        }`}>
          <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
            externalPlayerMinimized ? 'p-2 max-w-xs' : 'p-4 w-96'
          }`}>
            <ModernAudioPlayer
              audioUrl={getAudioUrl(externalAudioPlayer.audioUrl, 'node')}
              trackData={externalAudioPlayer.trackData}
              isMinimized={externalPlayerMinimized}
              onClose={() => {
                setShowExternalPlayer(false);
                setExternalAudioPlayer(null);
              }}
              onToggleMinimize={() => {
                setExternalPlayerMinimized(!externalPlayerMinimized);
              }}
            />
          </div>
        </div>
      )}

      {/* Persistent Audio Player - Shows when panel is fully closed */}
      {showPersistentPlayer && persistentAudioData && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-sm">
            <ModernAudioPlayer
              audioUrl={getAudioUrl(persistentAudioData.audioUrl, 'node')}
              trackData={persistentAudioData.trackData}
              isMinimized={true}
              onClose={() => {
                setShowPersistentPlayer(false);
                setPersistentAudioData(null);
              }}
              onToggleMinimize={() => {
                // Reopen the main panel
                setIsSingleVoicePanelOpen(true);
                setIsSingleVoicePanelMinimized(false);
                setShowPersistentPlayer(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Multi-Voice Conversation Panel */}
      <MultiVoiceConversationPanel
        isOpen={isMultiVoicePanelOpen}
        isMinimized={isMultiVoicePanelMinimized}
        onClose={() => {
          setIsMultiVoicePanelOpen(false);
          setIsMultiVoicePanelMinimized(false);
        }}
        onMinimize={() => {
          setIsMultiVoicePanelMinimized(!isMultiVoicePanelMinimized);
        }}
        uploadedContent={uploadedContent}
        uploadedFiles={uploadedFiles}
      />

      {/* AI Content Discovery Panel */}
      <AIContentDiscoveryPanel
        isOpen={isAIDiscoveryPanelOpen}
        isMinimized={isAIDiscoveryPanelMinimized}
        onClose={() => {
          setIsAIDiscoveryPanelOpen(false);
          setIsAIDiscoveryPanelMinimized(false);
        }}
        onMinimize={() => {
          setIsAIDiscoveryPanelMinimized(!isAIDiscoveryPanelMinimized);
        }}
      />
    </>
  );
};

export default NewView;