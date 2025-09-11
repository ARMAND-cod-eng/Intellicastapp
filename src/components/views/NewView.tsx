import React, { useState } from 'react';
import { FileText, Link, Sparkles, Check } from 'lucide-react';
import type { DocumentContent } from '../../types/document';
import SingleVoiceNarrationPanel from '../narration/SingleVoiceNarrationPanel';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';

interface NewViewProps {
  currentView: string;
  onOpenUpload: () => void;
  uploadedContent?: DocumentContent[] | null;
  uploadedFiles?: File[] | null;
}

const NewView: React.FC<NewViewProps> = ({ currentView, onOpenUpload, uploadedContent, uploadedFiles }) => {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Create Your Next Podcast
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Transform any content into engaging audio experiences with AI-powered narration and conversation
        </p>
      </section>

      {/* Upload Options */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Content Source</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {uploadOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <div
                key={index}
                onClick={option.action}
                className="group relative p-6 bg-white rounded-xl border border-gray-200 hover-lift cursor-pointer transition-all duration-200"
              >
                {option.title === 'Upload Document' && uploadedContent && uploadedContent.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
                <div className={`w-12 h-12 bg-gradient-to-br ${option.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {option.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {option.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Generation Styles */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Podcast Style</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {generationStyles.map((style, index) => (
            <div
              key={index}
              onClick={style.action}
              className={`relative p-6 rounded-xl border-2 transition-all duration-200 hover-lift cursor-pointer ${
                style.recommended
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-gray-200 bg-white hover:border-accent-300'
              }`}
            >
              {style.recommended && (
                <div className="absolute -top-3 left-4">
                  <span className="px-3 py-1 bg-accent-500 text-white text-sm font-medium rounded-full">
                    Recommended
                  </span>
                </div>
              )}
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {style.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {style.description}
              </p>
              
              <ul className="space-y-2">
                {style.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 bg-accent-500 rounded-full mr-2"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Templates */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'News Summary', duration: '5 min', style: 'Single Voice' },
            { name: 'Research Discussion', duration: '15 min', style: 'Multi-Voice' },
            { name: 'Tutorial Walkthrough', duration: '10 min', style: 'Single Voice' },
            { name: 'Expert Interview', duration: '20 min', style: 'Expert Panel' },
          ].map((template, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg hover-lift cursor-pointer">
              <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{template.style}</p>
              <span className="text-xs text-accent-600 font-medium">{template.duration}</span>
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