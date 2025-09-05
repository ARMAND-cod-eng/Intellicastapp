import React, { useState } from 'react';
import HomeView from './HomeView';
import LibraryView from './LibraryView';
import NewView from './NewView';
import DocumentUpload from '../upload/DocumentUpload';
import type { DocumentContent } from '../../types/document';

interface MainContentProps {
  currentView: string;
}

const MainContent: React.FC<MainContentProps> = ({ currentView }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleFilesUploaded = (files: File[]) => {
    console.log('Files uploaded:', files);
    // Handle file upload logic here
  };

  const handleDocumentsProcessed = (documents: DocumentContent[]) => {
    console.log('Documents processed:', documents);
    // TODO: Store processed documents in state/store
    // TODO: Navigate to podcast generation view
    setIsUploadModalOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView currentView={currentView} onOpenUpload={() => setIsUploadModalOpen(true)} />;
      case 'new':
        return <NewView currentView={currentView} onOpenUpload={() => setIsUploadModalOpen(true)} />;
      case 'library':
      case 'episodes':
        return <LibraryView currentView={currentView} />;
      default:
        return <HomeView currentView="home" onOpenUpload={() => setIsUploadModalOpen(true)} />;
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