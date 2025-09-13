import React, { useState } from 'react';
import { FileText, Link, Sparkles, Check } from 'lucide-react';
import type { DocumentContent } from '../../types/document';
import { useTheme } from '../../contexts/ThemeContext';
import SingleVoiceNarrationPanel from '../narration/SingleVoiceNarrationPanel';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';

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
      action: () => {},
    },
    {
      title: 'Expert Panel Discussion',
      description: 'Professional analysis with multiple expert perspectives',
      features: ['In-depth analysis', 'Opposing viewpoints', 'Expert insights'],
      recommended: false,
      action: () => {},
    },
  ];

  return (
    <>
      <div className={`p-8 space-y-8 transition-all duration-300 ${
        isSingleVoicePanelOpen && !isSingleVoicePanelMinimized ? 'mr-1/2' : ''
      }`}>
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>
          Create Your Next Podcast
        </h1>
        <p className="text-xl max-w-3xl mx-auto" style={{color: theme === 'dark' ? '#C7D2FE' : '#4B5563'}}>
          Transform any content into engaging audio experiences with AI-powered narration and conversation
        </p>
      </section>

      {/* Upload Options */}
      <section>
        <h2 className="text-2xl font-bold mb-6" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>Choose Your Content Source</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {uploadOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <div
                key={index}
                onClick={option.action}
                className={`group relative p-8 rounded-2xl border-2 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                  theme === 'dark' 
                    ? 'border-gray-600/30 bg-gradient-to-br from-gray-800/20 to-gray-900/20 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10'
                    : 'border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10'
                }`}
                style={{
                  backgroundColor: theme === 'light' ? '#FFFFFF' : undefined,
                  borderColor: theme === 'light' ? '#E5E7EB' : undefined
                }}
              >
                {option.title === 'Upload Document' && uploadedContent && uploadedContent.length > 0 && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#10B981'}}>
                    <Check size={16} className="text-white" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${option.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>
                    {option.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{color: theme === 'dark' ? '#C7D2FE' : '#4B5563'}}>
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
        <h2 className="text-2xl font-bold mb-6" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>Choose Your Podcast Style</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {generationStyles.map((style, index) => (
            <div
              key={index}
              onClick={style.action}
              className={`relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                style.recommended
                  ? (theme === 'dark' 
                      ? 'border-purple-400/60 bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:border-purple-300/80 hover:shadow-purple-500/20'
                      : 'border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 hover:border-blue-400 hover:shadow-blue-500/20')
                  : (theme === 'dark'
                      ? 'border-gray-600/30 bg-gradient-to-br from-gray-800/20 to-gray-900/20 hover:border-purple-400/50 hover:shadow-purple-500/10'
                      : 'border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-blue-300 hover:shadow-blue-500/10')
              }`}
              style={{
                backgroundColor: theme === 'light' && !style.recommended ? '#FFFFFF' : undefined,
                borderColor: theme === 'light' ? 'rgba(156,163,175,0.2)' : undefined
              }}
            >
              {style.recommended && (
                <div className="absolute -top-4 left-6">
                  <span className="px-4 py-2 text-sm font-bold rounded-full text-white shadow-lg" style={{backgroundColor: '#F59E0B'}}>
                    ⭐ Recommended
                  </span>
                </div>
              )}
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>
                  {style.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{color: theme === 'dark' ? '#C7D2FE' : '#4B5563'}}>
                  {style.description}
                </p>
                
                <div className="pt-4 border-t" style={{borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(191,200,216,0.3)'}}>
                  <ul className="space-y-3">
                    {style.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm" style={{color: theme === 'dark' ? '#9CA3AF' : '#6B7280'}}>
                        <div className="w-2 h-2 rounded-full mr-3 flex-shrink-0" style={{backgroundColor: theme === 'dark' ? '#A5B4FC' : '#3B82F6'}}></div>
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

      {/* Recent Templates */}
      <section>
        <h2 className="text-2xl font-bold mb-6" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>Quick Start Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'News Summary', duration: '5 min', style: 'Single Voice', icon: '📰' },
            { name: 'Research Discussion', duration: '15 min', style: 'Multi-Voice', icon: '🔬' },
            { name: 'Tutorial Walkthrough', duration: '10 min', style: 'Single Voice', icon: '📚' },
            { name: 'Expert Interview', duration: '20 min', style: 'Expert Panel', icon: '🎙️' },
          ].map((template, index) => (
            <div 
              key={index} 
              className={`group p-6 rounded-2xl border-2 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                theme === 'dark'
                  ? 'border-gray-600/30 bg-gradient-to-br from-gray-800/20 to-gray-900/20 hover:border-purple-400/50 hover:shadow-purple-500/10'
                  : 'border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-blue-300 hover:shadow-blue-500/10'
              }`}
              style={{
                backgroundColor: theme === 'light' ? '#FFFFFF' : undefined,
                borderColor: theme === 'light' ? 'rgba(156,163,175,0.2)' : undefined
              }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                  {template.icon}
                </div>
                <h3 className="font-bold text-lg" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>{template.name}</h3>
                <p className="text-sm" style={{color: theme === 'dark' ? '#9CA3AF' : '#6B7280'}}>{template.style}</p>
                <div className="mt-2 px-3 py-1 rounded-full text-xs font-bold" style={{
                  backgroundColor: theme === 'dark' ? '#A5B4FC' : '#3B82F6', 
                  color: '#FFFFFF'
                }}>
                  {template.duration}
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
              audioUrl={`http://localhost:3004${externalAudioPlayer.audioUrl}`}
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
              audioUrl={`http://localhost:3004${persistentAudioData.audioUrl}`}
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
    </>
  );
};

export default NewView;