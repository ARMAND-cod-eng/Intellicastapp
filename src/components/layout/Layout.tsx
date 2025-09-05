import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AudioPlayer from '../audio/AudioPlayer';
import MainContent from '../views/MainContent';

const Layout: React.FC = () => {
  const [currentView, setCurrentView] = useState('home');
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Bar */}
      <TopBar />
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          currentView={currentView} 
          onViewChange={setCurrentView}
          onOpenUpload={() => console.log('Upload modal would open')}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto custom-scrollbar">
          <div className="h-full">
            <MainContent currentView={currentView} />
          </div>
        </main>
      </div>
      
      {/* Audio Player */}
      {isPlayerVisible && (
        <AudioPlayer onClose={() => setIsPlayerVisible(false)} />
      )}
    </div>
  );
};

export default Layout;