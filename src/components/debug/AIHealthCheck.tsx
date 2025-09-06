import React, { useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

interface AIHealthStatus {
  status: 'checking' | 'healthy' | 'unhealthy';
  services?: {
    ollama?: {
      status: string;
      models?: {
        connected: boolean;
        models: string[];
        primaryAvailable: boolean;
        fallbackAvailable: boolean;
      };
    };
    documentProcessor?: {
      status: string;
    };
  };
  error?: string;
}

const AIHealthCheck: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<AIHealthStatus>({ status: 'checking' });
  const [testSummary, setTestSummary] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const checkHealth = async () => {
    setHealthStatus({ status: 'checking' });
    
    try {
      const response = await fetch('http://localhost:3003/api/narration/health');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setHealthStatus({
        status: data.status === 'ok' ? 'healthy' : 'unhealthy',
        services: data.services
      });
    } catch (error) {
      setHealthStatus({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testSummarization = async () => {
    setIsTesting(true);
    setTestSummary('');
    
    try {
      const response = await fetch('http://localhost:3003/api/narration/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent: 'This is a test document about artificial intelligence and machine learning. AI is transforming various industries through automation, predictive analytics, and intelligent decision-making systems. Machine learning algorithms enable systems to learn from data and improve their performance over time.',
          narrationType: 'document-summary'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setTestSummary(data.script);
      } else {
        setTestSummary('Failed to generate summary');
      }
    } catch (error) {
      setTestSummary(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        {healthStatus.services && (
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Ollama: </span>
              <span className={healthStatus.services.ollama?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                {healthStatus.services.ollama?.status || 'Unknown'}
              </span>
            </div>
            
            {healthStatus.services.ollama?.models && (
              <div className="ml-4 text-xs">
                <div>Models: {healthStatus.services.ollama.models.models.join(', ')}</div>
                <div>Primary Available: {healthStatus.services.ollama.models.primaryAvailable ? '✅' : '❌'}</div>
                <div>Fallback Available: {healthStatus.services.ollama.models.fallbackAvailable ? '✅' : '❌'}</div>
              </div>
            )}
            
            <div>
              <span className="font-medium">Document Processor: </span>
              <span className={healthStatus.services.documentProcessor?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                {healthStatus.services.documentProcessor?.status || 'Unknown'}
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {healthStatus.error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {healthStatus.error}
          </div>
        )}

        {/* Test Summarization */}
        <div className="border-t pt-3">
          <button
            onClick={testSummarization}
            disabled={isTesting || healthStatus.status !== 'healthy'}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {isTesting ? 'Testing AI Summarization...' : 'Test AI Summarization'}
          </button>
          
          {testSummary && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <strong>Test Result:</strong>
              <div className="mt-1">{testSummary}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIHealthCheck;