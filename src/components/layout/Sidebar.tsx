import React, { useState } from 'react';
import { Home, Plus, Settings, User, Bell, MessageSquare, Compass, Newspaper, Brain, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import CalendarTodoWidget from '../calendar/CalendarTodoWidget';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onOpenUpload: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onOpenUpload }) => {
  const { theme, cycleTheme } = useTheme();
  const [showCalendar, setShowCalendar] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'new', icon: Plus, label: 'New' },
    { id: 'news', icon: Newspaper, label: 'News Audio' },
    { id: 'ai-demo', icon: Brain, label: 'Brain' },
    { id: 'library', icon: Compass, label: 'Library' },
    { id: 'discover', icon: MessageSquare, label: 'Discover' },
  ];

  const bottomItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      <aside
        className="h-full flex flex-col py-4 relative transition-all duration-500 ease-in-out"
        style={{
          backgroundColor: '#000000',
          width: isExpanded ? '240px' : '64px'
        }}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 z-50"
          style={{
            backgroundColor: '#00D4E4',
            boxShadow: '0 0 15px rgba(0, 212, 228, 0.5)',
            border: '2px solid #000000'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#00E8FA';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 228, 0.7)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#00D4E4';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 228, 0.5)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4 text-white" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white" />
          )}
        </button>

        {/* Logo/Brand */}
        <div className={`flex mb-8 transition-all duration-500 ${isExpanded ? 'justify-start px-4' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{backgroundColor: '#00D4E4'}}>
            <span className="text-white font-bold text-sm">IC</span>
          </div>
          {isExpanded && (
            <span
              className="ml-3 text-white font-bold text-lg whitespace-nowrap overflow-hidden transition-all duration-500"
              style={{
                opacity: isExpanded ? 1 : 0,
                maxWidth: isExpanded ? '200px' : '0px'
              }}
            >
              intellicast
            </span>
          )}
        </div>

        {/* Main Navigation */}
        <nav className={`flex-1 flex flex-col space-y-2 ${isExpanded ? 'px-3' : 'items-center'}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`h-10 rounded-lg flex items-center transition-all duration-200 group relative ${
                  isExpanded ? 'justify-start px-3 w-full' : 'justify-center w-10'
                }`}
                style={{
                  color: currentView === item.id ? '#00D4E4' : '#FFFFFF',
                  backgroundColor: currentView === item.id ? 'rgba(0, 212, 228, 0.15)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (currentView !== item.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== item.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <span
                    className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-500"
                    style={{
                      opacity: isExpanded ? 1 : 0,
                      maxWidth: isExpanded ? '200px' : '0px'
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className={`flex flex-col space-y-2 ${isExpanded ? 'px-3' : 'items-center'}`}>
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => item.id === 'settings' ? cycleTheme() : onViewChange(item.id)}
                className={`h-10 rounded-lg flex items-center transition-all duration-200 ${
                  isExpanded ? 'justify-start px-3 w-full' : 'justify-center w-10'
                }`}
                style={{
                  color: '#FFFFFF',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {isExpanded && (
                  <span
                    className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-500"
                    style={{
                      opacity: isExpanded ? 1 : 0,
                      maxWidth: isExpanded ? '200px' : '0px'
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </aside>

      {/* Calendar Widget Slide-out Panel */}
      <div
        className="fixed top-0 h-full flex items-start pt-20 pl-4 pointer-events-none z-20 transition-all duration-500 ease-in-out"
        style={{
          left: isExpanded ? '240px' : '64px'
        }}
      >
        <div className="pointer-events-auto">
          <CalendarTodoWidget />
        </div>
      </div>
    </>
  );
};

export default Sidebar;