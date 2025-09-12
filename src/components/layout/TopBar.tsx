import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Bell, 
  Settings, 
  Search,
  X,
  Sparkles,
  Zap,
  Star
} from 'lucide-react';
import Button from '../ui/Button';
import GlassCard from '../ui/GlassCard';

const TopBar: React.FC = () => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const mockNotifications = [
    {
      id: 1,
      title: "New podcast generated",
      message: "Your Business Strategy analysis is ready",
      time: "2 min ago",
      type: "success"
    },
    {
      id: 2,
      title: "AI Enhancement Available",
      message: "Voice quality improvements detected",
      time: "5 min ago",
      type: "info"
    },
    {
      id: 3,
      title: "Weekly Report",
      message: "Your podcast analytics are ready",
      time: "1 hour ago",
      type: "report"
    }
  ];

  return (
    <motion.header 
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'h-14' : 'h-16'
      }`}
      layout
    >
      <GlassCard 
        variant="dark" 
        className="h-full border-0 rounded-none backdrop-blur-3xl"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900/95 via-dark-800/90 to-dark-900/95" />
        
        <div className="relative z-10 flex items-center justify-between px-6 h-full">
          {/* Left Section - Navigation & Search */}
          <div className="flex items-center space-x-4 flex-1">
            {/* Navigation Controls */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 rounded-full"
              >
                <ChevronLeft size={18} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 rounded-full"
              >
                <ChevronRight size={18} />
              </Button>
            </div>
            
            {/* Brand Logo */}
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg gradient-text hidden md:block">
                IntelliCast
              </span>
            </motion.div>
            
            {/* Search Bar */}
            <motion.div 
              className="relative flex-1 max-w-md"
              layout
            >
              <AnimatePresence>
                <motion.div
                  className="relative"
                  initial={false}
                  animate={{
                    scale: isSearchFocused ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                    {isSearchFocused && searchQuery ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Zap size={16} className="text-primary-400" />
                      </motion.div>
                    ) : (
                      <Search size={16} className="text-white/50" />
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Search with AI intelligence..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={`w-full pl-10 pr-10 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-200 ${
                      isSearchFocused ? 'bg-white/15 border-white/30' : ''
                    }`}
                  />
                  
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                  
                  {/* Search suggestions */}
                  <AnimatePresence>
                    {isSearchFocused && searchQuery && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2"
                      >
                        <GlassCard variant="dark" className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg cursor-pointer transition-colors">
                              <Sparkles size={14} className="text-primary-400" />
                              <span className="text-sm text-white">AI-powered search for "{searchQuery}"</span>
                            </div>
                            <div className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg cursor-pointer transition-colors">
                              <Star size={14} className="text-secondary-400" />
                              <span className="text-sm text-white">Similar episodes</span>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right Section - User Actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 p-0 rounded-full relative"
              >
                <Bell size={18} />
                {notifications > 0 && (
                  <motion.span
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-accent-500 to-accent-600 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    {notifications}
                  </motion.span>
                )}
              </Button>
              
              {/* Notification Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-80"
                  >
                    <GlassCard variant="dark" className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNotifications(0)}
                          className="text-xs px-2 py-1"
                        >
                          Mark all read
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {mockNotifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            whileHover={{ scale: 1.02 }}
                          >
                            <h4 className="text-sm font-medium text-white mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-white/70 mb-1">
                              {notification.message}
                            </p>
                            <span className="text-xs text-white/50">
                              {notification.time}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 rounded-full"
            >
              <Settings size={18} />
            </Button>
            
            {/* User Avatar */}
            <motion.div
              className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <User size={18} className="text-white" />
            </motion.div>
          </div>
        </div>
        
        {/* Progress indicator */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500"
          initial={{ width: 0 }}
          animate={{ width: scrolled ? '100%' : '0%' }}
          transition={{ duration: 0.3 }}
        />
      </GlassCard>
    </motion.header>
  );
};

export default TopBar;