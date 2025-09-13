import React, { useState } from 'react';
import { Home, Plus, Settings, User, Bell, MessageSquare, Compass } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onOpenUpload: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onOpenUpload }) => {
  const { theme, cycleTheme } = useTheme();

  const menuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'new', icon: Plus, label: 'New' },
    { id: 'library', icon: Compass, label: 'Library' },
    { id: 'discover', icon: MessageSquare, label: 'Discover' },
  ];

  const bottomItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <aside className="w-16 h-full flex flex-col py-4" style={{backgroundColor: theme === 'professional-dark' ? '#202020' : theme === 'dark' ? '#1a1b3a' : '#F8F9FA'}}>

      {/* Logo/Brand */}
      <div className="flex justify-center mb-8">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{backgroundColor: theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#6366F1'}}>
          <span className="text-white font-bold text-sm">IC</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col items-center space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative"
              style={{
                color: currentView === item.id
                  ? (theme === 'light' ? '#60A5FA' : theme === 'professional-dark' ? '#2563EB' : '#6366F1')
                  : (theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#374151'),
                backgroundColor: currentView === item.id
                  ? (theme === 'light' ? 'rgba(96, 165, 250, 0.1)' : theme === 'professional-dark' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(99, 102, 241, 0.1)')
                  : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.backgroundColor = theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? '#3730A3' : 'rgba(59,130,246,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center space-y-2">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => item.id === 'settings' ? cycleTheme() : onViewChange(item.id)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                color: theme === 'professional-dark' ? '#9AA0A6' : theme === 'dark' ? '#C7D2FE' : '#374151',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'professional-dark' ? '#2A2A2A' : theme === 'dark' ? '#3730A3' : 'rgba(59,130,246,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={item.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

    </aside>
  );
};

export default Sidebar;