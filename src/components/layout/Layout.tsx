import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';
import MainContent from '../views/MainContent';
import SimpleHealthIndicator from '../debug/SimpleHealthIndicator';
import { useTheme } from '../../contexts/ThemeContext';

const Layout: React.FC = () => {
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState('home');
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  // Generate floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  // Demo: Show player after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPlayerVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleTogglePlayerMinimize = () => {
    setIsPlayerMinimized(!isPlayerMinimized);
  };

  return (
    <div className="h-screen flex relative"
         style={{
           background: 'linear-gradient(to bottom, #000000, #14191a)'
         }}>
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="relative z-10"
      >
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onOpenUpload={() => console.log('Upload modal would open')}
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <motion.main
          className="flex-1 w-full overflow-y-auto custom-scrollbar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        >
          <MainContent currentView={currentView} />
        </motion.main>
      </div>
      
      {/* Spectacular Audio Player */}
      <AnimatePresence>
        {isPlayerVisible && (
          <ModernAudioPlayer 
            onClose={() => setIsPlayerVisible(false)}
            isMinimized={isPlayerMinimized}
            onToggleMinimize={handleTogglePlayerMinimize}
            trackData={{
              title: "AI-Generated Business Strategy Deep Dive",
              artist: "IntelliCast AI • Premium",
              duration: "4:07",
              artwork: "https://images.unsplash.com/photo-1551651184-2d90139c8475?w=400&h=400&fit=crop&crop=center",
              description: "An comprehensive analysis of cutting-edge business strategies powered by artificial intelligence, featuring insights on market trends, competitive analysis, and strategic decision-making frameworks."
            }}
          />
        )}
      </AnimatePresence>

      {/* AI Services Health Indicator */}
      <SimpleHealthIndicator />
      
      {/* Loading overlay for initial render */}
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        style={{backgroundColor: '#000000'}}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <motion.div
          className="text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-[#00D4E4]/30 border-t-[#00D4E4] rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <h2 className="text-xl font-bold mb-2" style={{color: '#FFFFFF'}}>IntelliCast</h2>
          <p className="text-sm" style={{color: 'rgba(255,255,255,0.7)'}}>Initializing AI-powered audio experience...</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Layout;