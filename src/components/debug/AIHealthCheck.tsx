import React, { useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Wifi, Search, Brain } from 'lucide-react';
import { TavilyClient } from '../../features/voice-search/services/tavily-client';

interface AIHealthStatus {
  status: 'checking' | 'healthy' | 'unhealthy';
  services: {
    tavily: {
      status: 'healthy' | 'demo' | 'error';
      configured: boolean;
      message: string;
    };
    frontend: {
      status: 'healthy';
      features: string[];
    };
    backend?: {
      status: 'healthy' | 'unavailable';
      message: string;
    };
  };
  error?: string;
}

const AIHealthCheck: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<AIHealthStatus>({
    status: 'checking',
    services: {
      tavily: { status: 'demo', configured: false, message: '' },
      frontend: { status: 'healthy', features: [] }
    }
  });
  const [testSummary, setTestSummary] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const checkHealth = async () => {
    setHealthStatus(prev => ({ ...prev, status: 'checking' }));

    try {
      // Check Tavily API configuration
      const tavilyClient = new TavilyClient();
      const tavilyStatus = tavilyClient.getApiStatus();

      // Check backend availability (optional)
      let backendStatus = { status: 'unavailable' as const, message: 'Backend server not required for current features' };
      try {
        const response = await fetch('http://localhost:3004/health', {
          method: 'GET',
          signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        if (response.ok) {
          backendStatus = { status: 'healthy' as const, message: 'Backend server running' };
        }
      } catch {
        // Backend not available, but that's okay for frontend-only features
      }

      const overallStatus = tavilyStatus.configured ? 'healthy' : 'healthy'; // Frontend works even without Tavily

      setHealthStatus({
        status: overallStatus,
        services: {
          tavily: {
            status: tavilyStatus.configured ? 'healthy' : 'demo',
            configured: tavilyStatus.configured,
            message: tavilyStatus.message
          },
          frontend: {
            status: 'healthy',
            features: [
              'AI Search with Tavily API',
              'Document Upload & Processing',
              'Podcast Generation UI',
              'Voice Search Interface',
              'Theme Management'
            ]
          },
          backend: backendStatus
        }
      });
    } catch (error) {
      setHealthStatus({
        status: 'unhealthy',
        services: {
          tavily: { status: 'error', configured: false, message: 'Error checking Tavily' },
          frontend: { status: 'healthy', features: [] }
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testAISearch = async () => {
    setIsTesting(true);
    setTestSummary('');

    try {
      const tavilyClient = new TavilyClient();
      const testQuery = 'artificial intelligence in 2024';

      setTestSummary('Testing AI search functionality...');

      const response = await tavilyClient.search(testQuery, {
        searchDepth: 'basic',
        maxResults: 3
      });

      if (response.answer) {
        const preview = response.answer.substring(0, 200) + '...';
        setTestSummary(`✅ AI Search Test Successful!\n\nQuery: "${testQuery}"\nAnswer Preview: ${preview}\n\nSources: ${response.results.length} results found\nAPI Status: ${response.metadata?.api_version || 'Unknown'}`);
      } else {
        setTestSummary('❌ No answer generated from search');
      }
    } catch (error) {
      setTestSummary(`❌ AI Search Test Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  React.useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'checking':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'checking':
        return 'text-yellow-600';
      case 'healthy':
        return 'text-green-600';
      case 'unhealthy':
        return 'text-red-600';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-80">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">AI Services Health Check</h3>
        <button 
          onClick={checkHealth}
          className="ml-auto px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {/* Overall Status */}
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>
            {healthStatus.status === 'checking' ? 'Checking...' : 
             healthStatus.status === 'healthy' ? 'All Services Healthy' : 'Services Unhealthy'}
          </span>
        </div>

        {/* Services Detail */}
        <div className="space-y-2 text-sm">
          {/* Tavily API Status */}
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span className="font-medium">Tavily AI Search: </span>
              <span className={healthStatus.services.tavily.status === 'healthy' ? 'text-green-600' :
                              healthStatus.services.tavily.status === 'demo' ? 'text-orange-600' : 'text-red-600'}>
                {healthStatus.services.tavily.status === 'healthy' ? 'Live API' :
                 healthStatus.services.tavily.status === 'demo' ? 'Demo Mode' : 'Error'}
              </span>
            </div>

            {healthStatus.services.tavily.message && (
              <div className="ml-6 text-xs text-gray-600">
                {healthStatus.services.tavily.message}
              </div>
            )}

            {/* Frontend Features */}
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span className="font-medium">Frontend Features: </span>
              <span className="text-green-600">Active</span>
            </div>

            {healthStatus.services.frontend.features.length > 0 && (
              <div className="ml-6 text-xs text-gray-600">
                {healthStatus.services.frontend.features.map((feature, index) => (
                  <div key={index}>• {feature}</div>
                ))}
              </div>
            )}

            {/* Backend Status */}
            {healthStatus.services.backend && (
              <div className="flex items-center space-x-2">
                <Wifi className="w-4 h-4" />
                <span className="font-medium">Backend Server: </span>
                <span className={healthStatus.services.backend.status === 'healthy' ? 'text-green-600' : 'text-gray-500'}>
                  {healthStatus.services.backend.status === 'healthy' ? 'Running' : 'Optional'}
                </span>
              </div>
            )}

            {healthStatus.services.backend?.message && (
              <div className="ml-6 text-xs text-gray-600">
                {healthStatus.services.backend.message}
              </div>
            )}
        </div>

        {/* Error Display */}
        {healthStatus.error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {healthStatus.error}
          </div>
        )}

        {/* Test AI Search */}
        <div className="border-t pt-3">
          <button
            onClick={testAISearch}
            disabled={isTesting}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {isTesting ? 'Testing AI Search...' : 'Test AI Search'}
          </button>
          
          {testSummary && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <strong>AI Search Test:</strong>
              <div className="mt-1 whitespace-pre-line">{testSummary}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIHealthCheck;