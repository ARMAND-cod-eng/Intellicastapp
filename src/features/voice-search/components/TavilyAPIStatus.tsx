import React from 'react';
import { CheckCircle, AlertTriangle, ExternalLink, Key, Settings } from 'lucide-react';
import { TavilyClient } from '../services/tavily-client';
import { useTheme } from '../../../contexts/ThemeContext';

interface TavilyAPIStatusProps {
  className?: string;
}

const TavilyAPIStatus: React.FC<TavilyAPIStatusProps> = ({ className = '' }) => {
  const { theme } = useTheme();
  const client = new TavilyClient();
  const status = client.getApiStatus();

  const getStatusColor = () => {
    if (status.configured) {
      return {
        bg: theme === 'professional-dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        border: '#10B981',
        text: '#10B981',
        icon: CheckCircle
      };
    } else {
      return {
        bg: theme === 'professional-dark' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        border: '#F59E0B',
        text: '#F59E0B',
        icon: AlertTriangle
      };
    }
  };

  const colors = getStatusColor();
  const StatusIcon = colors.icon;

  return (
    <div
      className={`p-4 rounded-xl border ${className}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      <div className="flex items-start space-x-3">
        <StatusIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.text }} />

        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-sm" style={{ color: colors.text }}>
              Tavily API Status
            </h3>
            <span className="px-2 py-1 text-xs rounded-full" style={{
              backgroundColor: colors.text + '20',
              color: colors.text
            }}>
              {status.using === 'real-api' ? 'LIVE' : 'DEMO'}
            </span>
          </div>

          <p className="text-sm mb-3" style={{
            color: theme === 'professional-dark' ? '#E5E7EB' : '#374151'
          }}>
            {status.message}
          </p>

          {!status.configured && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg" style={{
                backgroundColor: theme === 'professional-dark' ? 'rgba(55, 65, 81, 0.5)' : 'rgba(249, 250, 251, 0.8)',
                border: `1px solid ${theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
              }}>
                <div className="flex items-center space-x-2 mb-2">
                  <Key className="w-4 h-4" style={{ color: colors.text }} />
                  <span className="text-sm font-medium" style={{
                    color: theme === 'professional-dark' ? '#F3F4F6' : '#1F2937'
                  }}>
                    Setup Instructions:
                  </span>
                </div>

                <ol className="text-xs space-y-1 ml-6 list-decimal" style={{
                  color: theme === 'professional-dark' ? '#D1D5DB' : '#6B7280'
                }}>
                  <li>Get your free API key from <strong>tavily.com</strong></li>
                  <li>Add to your <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.env</code> file:</li>
                  <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">VITE_TAVILY_API_KEY=your-key-here</code></li>
                  <li>Restart the development server</li>
                </ol>
              </div>

              <a
                href="https://tavily.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
                style={{
                  backgroundColor: colors.text,
                  color: 'white'
                }}
              >
                <span>Get Tavily API Key</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {status.configured && (
            <div className="flex items-center space-x-2 text-xs" style={{
              color: theme === 'professional-dark' ? '#D1D5DB' : '#6B7280'
            }}>
              <CheckCircle className="w-4 h-4" style={{ color: colors.text }} />
              <span>Real-time search results and AI summaries enabled</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TavilyAPIStatus;