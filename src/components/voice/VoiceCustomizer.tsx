import React, { useState } from 'react';
import { Settings, Volume2, Mic, RefreshCw, HelpCircle } from 'lucide-react';

interface VoiceCustomizerProps {
  onSettingsChange: (settings: VoiceSettings) => void;
  initialSettings?: Partial<VoiceSettings>;
  compact?: boolean;
}

export interface VoiceSettings {
  exaggeration: number;
  temperature: number;
  cfg_weight: number;
  min_p: number;
  top_p: number;
  repetition_penalty: number;
  seed: number;
  reference_audio?: File | null;
}

const VoiceCustomizer: React.FC<VoiceCustomizerProps> = ({
  onSettingsChange,
  initialSettings = {},
  compact = false
}) => {
  const [settings, setSettings] = useState<VoiceSettings>({
    exaggeration: 0.5,
    temperature: 0.8,
    cfg_weight: 0.5,
    min_p: 0.05,
    top_p: 1.0,
    repetition_penalty: 1.2,
    seed: 0,
    reference_audio: null,
    ...initialSettings
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [referenceAudioFile, setReferenceAudioFile] = useState<File | null>(null);

  const updateSetting = (key: keyof VoiceSettings, value: number | File | null) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const resetToDefaults = () => {
    const defaults: VoiceSettings = {
      exaggeration: 0.5,
      temperature: 0.8,
      cfg_weight: 0.5,
      min_p: 0.05,
      top_p: 1.0,
      repetition_penalty: 1.2,
      seed: 0,
      reference_audio: null
    };
    setSettings(defaults);
    setReferenceAudioFile(null);
    onSettingsChange(defaults);
  };

  const handleReferenceAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setReferenceAudioFile(file);
    updateSetting('reference_audio', file);
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Essential Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1 flex items-center space-x-1">
              <Volume2 className="w-3 h-3" />
              <span>Exaggeration</span>
            </label>
            <input
              type="range"
              min="0.25"
              max="2"
              step="0.05"
              value={settings.exaggeration}
              onChange={(e) => updateSetting('exaggeration', parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <span className="text-xs text-gray-500">{settings.exaggeration.toFixed(2)}</span>
          </div>
          
          <div>
            <label className="text-xs text-gray-600 block mb-1">Temperature</label>
            <input
              type="range"
              min="0.05"
              max="2"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <span className="text-xs text-gray-500">{settings.temperature.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center space-x-1"
        >
          <Settings className="w-3 h-3" />
          <span>{showAdvanced ? 'Hide' : 'Show'} Advanced</span>
        </button>

        {showAdvanced && (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">CFG Weight</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.cfg_weight}
                  onChange={(e) => updateSetting('cfg_weight', parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-xs text-gray-500">{settings.cfg_weight.toFixed(2)}</span>
              </div>
              
              <div>
                <label className="text-xs text-gray-600 block mb-1">Min-P</label>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={settings.min_p}
                  onChange={(e) => updateSetting('min_p', parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="text-xs text-gray-500">{settings.min_p.toFixed(3)}</span>
              </div>
            </div>
            
            <button
              onClick={resetToDefaults}
              className="w-full text-xs text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center space-x-1 mt-2"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Voice Customization</span>
        </h3>
        <button
          onClick={resetToDefaults}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Voice Cloning */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Mic className="w-4 h-4 text-blue-600" />
          <label className="text-sm font-medium text-gray-700">Voice Cloning</label>
        </div>
        <p className="text-xs text-gray-600 mb-2">Upload a reference audio (5+ seconds) to clone a voice</p>
        <input
          type="file"
          accept="audio/*"
          onChange={handleReferenceAudioUpload}
          className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
        />
        {referenceAudioFile && (
          <p className="text-xs text-green-600 mt-1">✓ {referenceAudioFile.name}</p>
        )}
      </div>

      {/* Essential Parameters */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-sm font-medium text-gray-700">Exaggeration</label>
            <HelpCircle className="w-3 h-3 text-gray-400" title="Controls emotional intensity (0.5 = neutral, higher = more dramatic)" />
          </div>
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            value={settings.exaggeration}
            onChange={(e) => updateSetting('exaggeration', parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Subtle (0.25)</span>
            <span className="font-medium">{settings.exaggeration.toFixed(2)}</span>
            <span>Dramatic (2.0)</span>
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-sm font-medium text-gray-700">Temperature</label>
            <HelpCircle className="w-3 h-3 text-gray-400" title="Controls voice variation (lower = more consistent, higher = more varied)" />
          </div>
          <input
            type="range"
            min="0.05"
            max="2"
            step="0.05"
            value={settings.temperature}
            onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Consistent (0.05)</span>
            <span className="font-medium">{settings.temperature.toFixed(2)}</span>
            <span>Varied (2.0)</span>
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-sm font-medium text-gray-700">CFG Weight / Pace</label>
            <HelpCircle className="w-3 h-3 text-gray-400" title="Controls guidance strength and pacing" />
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.cfg_weight}
            onChange={(e) => updateSetting('cfg_weight', parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Free (0.0)</span>
            <span className="font-medium">{settings.cfg_weight.toFixed(2)}</span>
            <span>Guided (1.0)</span>
          </div>
        </div>
      </div>

      {/* Advanced Parameters */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center space-x-2">
          <span>Advanced Parameters</span>
          <Settings className="w-4 h-4 group-open:rotate-180 transition-transform" />
        </summary>
        
        <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <span>Min-P</span>
                <HelpCircle className="w-3 h-3 text-gray-400" title="Newer sampling method, better for high temperatures" />
              </label>
              <input
                type="range"
                min="0"
                max="0.2"
                step="0.01"
                value={settings.min_p}
                onChange={(e) => updateSetting('min_p', parseFloat(e.target.value))}
                className="w-full accent-blue-600 mt-1"
              />
              <span className="text-xs text-gray-500">{settings.min_p.toFixed(3)}</span>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <span>Top-P</span>
                <HelpCircle className="w-3 h-3 text-gray-400" title="Original sampling method (1.0 = disabled)" />
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.top_p}
                onChange={(e) => updateSetting('top_p', parseFloat(e.target.value))}
                className="w-full accent-blue-600 mt-1"
              />
              <span className="text-xs text-gray-500">{settings.top_p.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <span>Repetition Penalty</span>
              <HelpCircle className="w-3 h-3 text-gray-400" title="Reduces repetitive patterns in speech" />
            </label>
            <input
              type="range"
              min="1"
              max="2"
              step="0.1"
              value={settings.repetition_penalty}
              onChange={(e) => updateSetting('repetition_penalty', parseFloat(e.target.value))}
              className="w-full accent-blue-600 mt-1"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Natural (1.0)</span>
              <span className="font-medium">{settings.repetition_penalty.toFixed(1)}</span>
              <span>Varied (2.0)</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Random Seed</label>
            <input
              type="number"
              min="0"
              max="999999"
              value={settings.seed}
              onChange={(e) => updateSetting('seed', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-1"
              placeholder="0 for random"
            />
            <p className="text-xs text-gray-500 mt-1">Use same seed for reproducible results</p>
          </div>
        </div>
      </details>
    </div>
  );
};

export default VoiceCustomizer;