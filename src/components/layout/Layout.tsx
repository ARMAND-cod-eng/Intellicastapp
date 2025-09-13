import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';
import MainContent from '../views/MainContent';
import AIHealthCheck from '../debug/AIHealthCheck';
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
    <div className="h-screen flex flex-col overflow-hidden relative" 
         style={{
           background: theme === 'dark' ? '#0F0F23' : '#F8F9FA'
         }}>
      {/* Animated Background */}
      <div className={`absolute inset-0 ${theme === 'dark' ? 'mesh-gradient opacity-30' : 'opacity-20'}`} 
           style={{
             background: theme === 'light' 
               ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
               : undefined
           }} />
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full blur-sm"
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(to right, rgba(139, 92, 246, 0.2), rgba(219, 39, 119, 0.2))'
                : 'linear-gradient(to right, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2))',
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 4 + particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: particle.delay,
            }}
          />
        ))}
      </div>
      
      {/* Top Bar */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <TopBar />
      </motion.div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar */}
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          <Sidebar 
            currentView={currentView} 
            onViewChange={setCurrentView}
            onOpenUpload={() => console.log('Upload modal would open')}
          />
        </motion.div>
        
        {/* Main Content Area */}
        <motion.main 
          className="flex-1 overflow-auto custom-scrollbar relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        >
          <div className="h-full relative">
            {/* Content background blur overlay */}
            <div className="absolute inset-0 backdrop-blur-sm" 
                 style={{
                   backgroundColor: theme === 'dark' 
                     ? 'rgba(17, 24, 39, 0.2)' 
                     : 'rgba(255, 255, 255, 0.1)'
                 }} />
            
            <div className="relative z-10">
              <MainContent currentView={currentView} />
            </div>
          </div>
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

      {/* AI Health Check - Debug Component */}
      <AIHealthCheck />
      
      {/* Loading overlay for initial render */}
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        style={{backgroundColor: theme === 'dark' ? '#0F0F23' : '#FBF5F0'}}
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
            className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <h2 className="text-xl font-bold mb-2" style={{color: theme === 'dark' ? '#FFFFFF' : '#BFC8D8'}}>IntelliCast</h2>
          <p className="text-sm" style={{color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(191,200,216,0.8)'}}>Initializing AI-powered audio experience...</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Layout;