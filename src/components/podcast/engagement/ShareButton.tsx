import React, { useState } from 'react';
import { Share2, Twitter, Facebook, Linkedin, Mail, Link as LinkIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../ui/GlassCard';
import { ShareService } from '../../../services/engagementService';

interface ShareButtonProps {
  episodeId: string;
  episodeTitle: string;
  showName: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
}

const ShareButton: React.FC<ShareButtonProps> = ({
  episodeId,
  episodeTitle,
  showName,
  size = 'md',
  variant = 'icon',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const buttonSizes = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'email' | 'copy') => {
    ShareService.shareEpisode(episodeId, episodeTitle, showName, platform);

    if (platform === 'copy') {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    } else {
      setShowMenu(false);
    }
  };

  const shareOptions = [
    { id: 'twitter', label: 'Twitter', icon: Twitter, color: '#1DA1F2' },
    { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#4267B2' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0077B5' },
    { id: 'email', label: 'Email', icon: Mail, color: '#EA4335' },
    { id: 'copy', label: copied ? 'Copied!' : 'Copy Link', icon: copied ? Check : LinkIcon, color: '#00D4E4' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`${buttonSizes[size]} rounded-full transition-all ${
          variant === 'button' ? 'px-4 flex items-center gap-2' : ''
        }`}
        style={{
          backgroundColor: showMenu ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.1)',
          color: showMenu ? '#00D4E4' : 'rgba(255, 255, 255, 0.7)',
        }}
      >
        <Share2 className={sizes[size]} />
        {variant === 'button' && <span className="text-sm font-medium">Share</span>}
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Share Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 z-50"
              style={{ minWidth: '200px' }}
            >
              <GlassCard className="p-2">
                <div className="space-y-1">
                  {shareOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <motion.button
                        key={option.id}
                        onClick={() => handleShare(option.id as any)}
                        className="w-full px-3 py-2 rounded-lg text-left flex items-center gap-3 transition-all"
                        style={{ backgroundColor: 'transparent' }}
                        whileHover={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: option.color }}
                        />
                        <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                          {option.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShareButton;
