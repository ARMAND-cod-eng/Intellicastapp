import React from 'react';
import type { PresetConfig } from '../../types/narration';

interface PresetCardProps {
  preset: PresetConfig;
  isSelected: boolean;
  onSelect: () => void;
  showBadge?: boolean;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  isSelected,
  onSelect,
  showBadge = true
}) => {
  const Icon = preset.icon;

  return (
    <button
      onClick={onSelect}
      className={`relative group w-full p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
        isSelected
          ? 'border-[#00D4E4] shadow-[0_0_30px_rgba(0,212,228,0.3)] scale-[1.02]'
          : 'border-gray-700 hover:border-[#00D4E4]/50 hover:shadow-[0_0_20px_rgba(0,212,228,0.15)]'
      }`}
      style={{
        backgroundColor: isSelected ? 'rgba(0, 212, 228, 0.1)' : '#14191a'
      }}
    >
      {/* Background Gradient Effect */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
          isSelected ? 'opacity-50' : ''
        }`}
        style={{
          background: preset.gradient,
          filter: 'blur(40px)'
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon & Badge */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isSelected ? 'scale-110' : 'group-hover:scale-105'
            }`}
            style={{
              backgroundColor: isSelected ? preset.color : `${preset.color}40`,
              boxShadow: isSelected ? `0 0 20px ${preset.color}80` : 'none'
            }}
          >
            <Icon
              className="w-7 h-7"
              style={{ color: isSelected ? '#FFFFFF' : preset.color }}
            />
          </div>

          {showBadge && isSelected && (
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-[#00D4E4] text-white shadow-lg animate-in fade-in slide-in-from-right-2 duration-300">
              Selected
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          className={`text-lg font-bold mb-2 transition-colors duration-300 ${
            isSelected ? 'text-[#00D4E4]' : 'text-white group-hover:text-[#00D4E4]'
          }`}
        >
          {preset.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {preset.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {preset.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded-md text-xs font-medium border"
              style={{
                backgroundColor: isSelected
                  ? 'rgba(0, 212, 228, 0.15)'
                  : 'rgba(255, 255, 255, 0.05)',
                borderColor: isSelected
                  ? 'rgba(0, 212, 228, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: isSelected ? '#00D4E4' : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00D4E4] via-[#00E8FA] to-[#00D4E4] animate-in slide-in-from-bottom duration-300" />
        )}
      </div>

      {/* Hover Glow Effect */}
      <div
        className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
          isSelected ? 'opacity-20' : ''
        }`}
        style={{
          boxShadow: `inset 0 0 60px ${preset.color}30`
        }}
      />
    </button>
  );
};

export default PresetCard;
