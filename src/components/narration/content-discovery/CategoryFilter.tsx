/**
 * Category Filter - Category selection grid
 */

import React from 'react';
import { Filter } from 'lucide-react';
import GlassCard from '../../ui/GlassCard';
import type { CategoryOption } from './types';

interface CategoryFilterProps {
  categories: CategoryOption[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange
}) => {
  return (
    <GlassCard variant="medium" className="p-6" glow>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-white">
          <Filter size={20} />
          Filter by Category
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`p-3 rounded-lg border-2 transition-all text-center min-h-[60px] flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#00D4E4] focus:ring-offset-2 focus:ring-offset-black ${
                selectedCategory === category.id
                  ? 'border-[#00D4E4] bg-[#00D4E4]/20 shadow-[0_0_20px_rgba(0,212,228,0.2)]'
                  : 'border-gray-600 bg-transparent hover:bg-[#00D4E4]/5 hover:border-[#00D4E4]/30'
              }`}
              aria-label={`Filter by ${category.name}`}
              aria-pressed={selectedCategory === category.id}
            >
              <IconComponent className={`w-6 h-6 mx-auto mb-1 ${
                selectedCategory === category.id ? 'text-[#00D4E4]' : 'text-gray-400'
              }`} />
              <div className="text-xs font-medium text-white">
                {category.name}
              </div>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default CategoryFilter;
