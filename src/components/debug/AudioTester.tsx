import React, { useState } from 'react';
import { Play, Pause } from 'lucide-react';

const AudioTester: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const testAudio = () => {
    if (audio && isPlaying) {
      // Stop current audio
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setAudio(null);
      addLog('Audio stopped');
      return;
    }

    // Test with latest generated Chatterbox audio file
    const audioUrl = 'http://localhost:3003/audio/chatterbox_en_test.wav';
    addLog(`Creating audio element with URL: ${audioUrl}`);

    const newAudio = new Audio(audioUrl);

    newAudio.onloadstart = () => addLog('Audio loading started');
    newAudio.onloadedmetadata = () => addLog(`Audio metadata loaded - Duration: ${newAudio.duration}s`);
    newAudio.onloadeddata = () => addLog('Audio data loaded');
    newAudio.oncanplay = () => addLog('Audio can start playing');
    newAudio.oncanplaythrough = () => addLog('Audio can play through completely');
    newAudio.onplay = () => addLog('Audio play event fired');
    newAudio.onplaying = () => addLog('Audio is now playing');
    newAudio.onpause = () => addLog('Audio paused');
    newAudio.onended = () => {
      addLog('Audio finished playing');
      setIsPlaying(false);
      setAudio(null);
    };
    newAudio.onerror = (err) => {
      addLog(`Audio error: ${newAudio.error?.code} - ${newAudio.error?.message}`);
      addLog(`Network state: ${newAudio.networkState}, Ready state: ${newAudio.readyState}`);
      setIsPlaying(false);
      setAudio(null);
    };

    setAudio(newAudio);

    addLog('Starting audio playback...');
    newAudio.play()
      .then(() => {
        addLog('Audio.play() promise resolved successfully');
        setIsPlaying(true);
      })
      .catch(err => {
        addLog(`Audio.play() promise rejected: ${err.message}`);
        setIsPlaying(false);
        setAudio(null);
      });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="p-6 bg-white border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">🔧 Chatterbox Audio Tester</h3>
      
      <div className="flex space-x-4 mb-4">
        <button
          onClick={testAudio}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isPlaying 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isPlaying ? 'Stop Test Audio' : 'Test Chatterbox Audio'}</span>
        </button>

        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Clear Logs
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg max-h-64 overflow-y-auto">
        <h4 className="font-medium mb-2">Debug Logs:</h4>
        {logs.length === 0 ? (
          <p className="text-gray-500">No logs yet. Click "Test Chatterbox Audio" to start.</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Test File:</strong> chatterbox_en_test.wav</p>
        <p><strong>Purpose:</strong> Direct browser audio compatibility test</p>
        <p><strong>Expected:</strong> Audio should load and play Nova's voice saying the preview text</p>
      </div>
    </div>
  );
};

export default AudioTester;