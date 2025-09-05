import React, { useState } from 'react';
import { FileText, Link, Sparkles, Check } from 'lucide-react';
import type { DocumentContent } from '../../types/document';
import SingleVoiceNarrationPanel from '../narration/SingleVoiceNarrationPanel';

interface NewViewProps {
  currentView: string;
  onOpenUpload: () => void;
  uploadedContent?: DocumentContent[] | null;
  uploadedFiles?: File[] | null;
}

const NewView: React.FC<NewViewProps> = ({ currentView, onOpenUpload, uploadedContent, uploadedFiles }) => {
  const [isSingleVoicePanelOpen, setIsSingleVoicePanelOpen] = useState(false);
  
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
      action: () => setIsSingleVoicePanelOpen(true),
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
        isSingleVoicePanelOpen ? 'mr-1/2' : ''
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
        onClose={() => setIsSingleVoicePanelOpen(false)}
        uploadedContent={uploadedContent}
        uploadedFiles={uploadedFiles}
      />
    </>
  );
};

export default NewView;