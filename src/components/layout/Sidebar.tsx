import React from 'react';
import { Home, Plus, Radio, Library, Search, Headphones } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onOpenUpload: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onOpenUpload }) => {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'new', icon: Plus, label: 'New' },
    { id: 'radio', icon: Radio, label: 'Radio' },
  ];

  const libraryItems = [
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'episodes', icon: Headphones, label: 'Episodes' },
  ];

  return (
    <aside className="w-64 bg-white/50 backdrop-blur-xl border-r border-gray-200/50 h-full flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-primary-600 rounded-lg flex items-center justify-center">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">IntelliCast</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-8">
        {/* Main Navigation */}
        <div>
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                      currentView === item.id
                        ? 'bg-accent-100 text-accent-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Library Section */}
        <div>
          <h3 className="px-4 text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Library
          </h3>
          <ul className="space-y-2">
            {libraryItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                      currentView === item.id
                        ? 'bg-accent-100 text-accent-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200/50">
        <button 
          onClick={onOpenUpload}
          className="w-full px-4 py-2 bg-gradient-to-r from-accent-500 to-primary-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          Upload Document
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;