import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Settings, Search } from 'lucide-react';
import { TavilyClient } from '../../features/voice-search/services/tavily-client';
import { useTheme } from '../../contexts/ThemeContext';

const SimpleHealthIndicator: React.FC = () => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [tavilyStatus, setTavilyStatus] = useState<{
    configured: boolean;
    using: 'real-api' | 'mock-data';
    message: string;
  }>({ configured: false, using: 'mock-data', message: 'Checking...' });

  useEffect(() => {
    const client = new TavilyClient();
    const status = client.getApiStatus();
    setTavilyStatus(status);
  }, []);

  const getStatusIcon = () => {
    if (tavilyStatus.configured) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
  };

  const getStatusColor = () => {
    return tavilyStatus.configured ? 'text-green-600' : 'text-orange-600';
  };

  const getBackgroundColor = () => {
    if (theme === 'professional-dark') {
      return tavilyStatus.configured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
    } else {
      return tavilyStatus.configured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
    }
  };

  const getBorderColor = () => {
    return tavilyStatus.configured ? '#10B981' : '#F59E0B';
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isExpanded ? (
        // Compact indicator
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg border transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: theme === 'professional-dark' ? 'rgba(42, 42, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: getBorderColor(),
            backdropFilter: 'blur(10px)',
          }}
        >
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {tavilyStatus.configured ? 'Live' : 'Demo'}
          </span>
          <Settings className="w-4 h-4 opacity-60" style={{
            color: theme === 'professional-dark' ? '#E5E7EB' : '#6B7280'
          }} />
        </button>
      ) : (
        // Expanded panel
        <div
          className="rounded-lg shadow-lg border p-4 min-w-80"
          style={{
            backgroundColor: theme === 'professional-dark' ? 'rgba(42, 42, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{
              color: theme === 'professional-dark' ? '#F3F4F6' : '#1F2937'
            }}>
              AI Services Status
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{
                color: theme === 'professional-dark' ? '#9CA3AF' : '#6B7280'
              }}
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {/* Tavily Status */}
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: getBackgroundColor(),
                borderColor: getBorderColor(),
              }}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Search className="w-4 h-4" style={{ color: getBorderColor() }} />
                <span className="font-medium text-sm" style={{
                  color: theme === 'professional-dark' ? '#F3F4F6' : '#1F2937'
                }}>
                  Tavily AI Search
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`} style={{
                  backgroundColor: getBorderColor() + '20'
                }}>
                  {tavilyStatus.using === 'real-api' ? 'LIVE API' : 'DEMO MODE'}
                </span>
              </div>
              <p className="text-xs" style={{
                color: theme === 'professional-dark' ? '#D1D5DB' : '#6B7280'
              }}>
                {tavilyStatus.message}
              </p>
            </div>

            {/* Frontend Features */}
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: '#10B981',
              }}
            >
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-medium text-sm" style={{
                  color: theme === 'professional-dark' ? '#F3F4F6' : '#1F2937'
                }}>
                  Frontend Services
                </span>
                <span className="text-xs px-2 py-1 rounded-full text-green-600" style={{
                  backgroundColor: '#10B981' + '20'
                }}>
                  ACTIVE
                </span>
              </div>
              <div className="text-xs space-y-1" style={{
                color: theme === 'professional-dark' ? '#D1D5DB' : '#6B7280'
              }}>
                <div>• AI Search & Summaries</div>
                <div>• Document Processing</div>
                <div>• Podcast Generation UI</div>
                <div>• Voice Search Interface</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-3 py-2 text-xs rounded-lg transition-colors"
                style={{
                  backgroundColor: theme === 'professional-dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  color: '#3B82F6',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}
              >
                Refresh
              </button>
              <button
                onClick={() => {
                  // Navigate to AI demo if available
                  const event = new CustomEvent('navigate', { detail: 'ai-demo' });
                  window.dispatchEvent(event);
                }}
                className="flex-1 px-3 py-2 text-xs rounded-lg transition-colors"
                style={{
                  backgroundColor: theme === 'professional-dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                  color: '#8B5CF6',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}
              >
                Test AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleHealthIndicator;