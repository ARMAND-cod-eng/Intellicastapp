import React from 'react';
import { ChevronLeft, ChevronRight, User, Bell, Settings } from 'lucide-react';

const TopBar: React.FC = () => {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-6">
      {/* Navigation Controls */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search episodes, documents, or topics..."
            className="w-96 px-4 py-2 bg-gray-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all duration-200"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center space-x-3">
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full"></span>
        </button>
        
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-primary-600 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
};

export default TopBar;