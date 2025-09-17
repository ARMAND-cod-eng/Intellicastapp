import React, { useState } from 'react';
import HomeView from './HomeView';
import NewView from './NewView';
import DocumentUpload from '../upload/DocumentUpload';
import { PodcastGenerationView } from '../../views/PodcastGenerationView';
import NewsAudioView from '../../../modules/news-audio/frontend/views/NewsAudioView';
import EnhancedAIDemo from '../../features/voice-search/components/EnhancedAIDemo';
import type { DocumentContent } from '../../types/document';

interface MainContentProps {
  currentView: string;
}

const MainContent: React.FC<MainContentProps> = ({ currentView }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedContent, setUploadedContent] = useState<DocumentContent[] | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[] | null>(null);
  const [showPodcastGeneration, setShowPodcastGeneration] = useState(false);

  const handleFilesUploaded = (files: File[]) => {
    console.log('Files uploaded:', files);
    setUploadedFiles(files); // Store the original files
  };

  const handleDocumentsProcessed = (documents: DocumentContent[]) => {
    console.log('Documents processed:', documents);
    setUploadedContent(documents);
    setIsUploadModalOpen(false);
    // Don't navigate to podcast generation view, just store the content
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView currentView={currentView} onOpenUpload={() => setIsUploadModalOpen(true)} uploadedContent={uploadedContent} />;
      case 'new':
        return <NewView currentView={currentView} onOpenUpload={() => setIsUploadModalOpen(true)} uploadedContent={uploadedContent} uploadedFiles={uploadedFiles} />;
      case 'news':
        return <NewsAudioView />;
      case 'ai-demo':
        return <EnhancedAIDemo />;
      default:
        return <HomeView currentView="home" onOpenUpload={() => setIsUploadModalOpen(true)} uploadedContent={uploadedContent} />;
    }
  };

  return (
    <>
      {renderView()}
      
      {/* Upload Modal */}
      {isUploadModalOpen && (
        <DocumentUpload
          onFilesUploaded={handleFilesUploaded}
          onDocumentsProcessed={handleDocumentsProcessed}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}
    </>
  );
};

export default MainContent;