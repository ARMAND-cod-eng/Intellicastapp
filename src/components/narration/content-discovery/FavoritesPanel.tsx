/**
 * Favorites Panel - Favorites management sidebar panel
 */

import React from 'react';
import { X, Star, Trash2, Download, Upload, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FavoriteItem } from '../../../services/contentDiscoveryStorage';
import { BarChart3, Globe } from 'lucide-react';
import EmptyState from '../../ui/EmptyState';

interface FavoritesPanelProps {
  favorites: FavoriteItem[];
  onClose: () => void;
  onSelectFavorite: (favoriteItem: FavoriteItem) => void;
  onRemoveFavorite: (topicId: string) => void;
  onClearAllFavorites: () => void;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  favorites,
  onClose,
  onSelectFavorite,
  onRemoveFavorite,
  onClearAllFavorites
}) => {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-[60] flex flex-col"
    >
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Star size={20} className="text-yellow-400" fill="currentColor" />
            Favorites
          </h3>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close Favorites"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="text-sm text-gray-400">
          {favorites.length} favorite{favorites.length !== 1 ? 's' : ''} saved
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {favorites.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No favorites saved yet"
            description="Click the ★ icon on any topic to save it here for quick access later. Build your collection of interesting topics!"
            iconColor="text-yellow-400"
            actionButton={{
              label: "Browse Topics",
              onClick: onClose
            }}
          />
        ) : (
          favorites.map((favorite) => (
            <div
              key={favorite.topicId}
              className="p-4 rounded-lg border border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    {favorite.topicData.title}
                    <Star size={12} className="text-yellow-400" fill="currentColor" />
                  </h4>
                  <p className="text-xs text-gray-400 mb-2">
                    {favorite.topicData.description}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveFavorite(favorite.topicId)}
                  className="p-2 hover:bg-gray-700 rounded transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Remove from favorites"
                >
                  <Trash2 size={14} className="text-gray-400" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-2">
                {favorite.topicData.keywords.slice(0, 3).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded-full bg-[#00D4E4]/15 text-[#00D4E4]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <BarChart3 size={12} className="text-[#00D4E4]" />
                    <span>{favorite.topicData.trendScore}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe size={12} />
                    <span className="capitalize">{favorite.topicData.category}</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectFavorite(favorite)}
                  className="px-3 py-1.5 bg-[#00D4E4]/20 border border-[#00D4E4]/30 text-[#00D4E4] rounded-lg text-xs font-medium hover:bg-[#00D4E4]/30 transition-all flex items-center gap-1"
                >
                  <Play size={12} />
                  Select
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Saved {new Date(favorite.savedAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {favorites.length > 0 && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClearAllFavorites}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Clear All Favorites
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default FavoritesPanel;
