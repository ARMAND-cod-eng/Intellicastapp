import React from 'react';
import { Home, Plus, Headphones } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onOpenUpload: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onOpenUpload }) => {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'new', icon: Plus, label: 'New' },
  ];

  const libraryItems: any[] = [];

  return (
    <aside className="w-64 h-full flex flex-col" style={{backgroundColor: '#1E1B4B'}}>
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-primary-600 rounded-lg flex items-center justify-center">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold" style={{color: '#C7D2FE'}}>IntelliCast</span>
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
                        ? 'font-medium'
                        : ''
                    }`}
                    style={{
                      color: currentView === item.id ? '#FFFFFF' : '#C7D2FE',
                      backgroundColor: currentView === item.id ? 'transparent' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (currentView !== item.id) {
                        e.currentTarget.style.backgroundColor = '#3730A3';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentView !== item.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
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
      <div className="p-4 border-t" style={{borderColor: '#312E81'}}>
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