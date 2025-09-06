import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TTSWrapper {
  constructor() {
    this.pythonScript = path.join(__dirname, 'KokoroOnlyTTSService.py');  // Use Kokoro-ONLY service
    this.audioDir = path.join(__dirname, '..', 'audio');
    
    console.log('🎙️  Kokoro-82M EXCLUSIVE TTS Service initialized');
    console.log('⚠️  NO FALLBACK MODELS - Kokoro-82M ONLY');
  }

  /**
   * Check if TTS service is healthy
   */
  async healthCheck() {
    try {
      console.log('🔍 Checking TTS service health...');
      
      const result = await this.runPythonScript(['--health-check']);
      
      if (result.success) {
        const healthData = JSON.parse(result.output);
        console.log('✅ TTS service is healthy');
        return {
          status: 'healthy',
          ...healthData
        };
      } else {
        console.error('❌ TTS service health check failed:', result.error);
        return {
          status: 'unhealthy',
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ TTS health check error:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get all available voices with their characteristics
   */
  async getAvailableVoices() {
    try {
      const result = await this.runPythonScript(['--list-voices']);
      
      if (result.success) {
        return JSON.parse(result.output);
      } else {
        console.error('❌ Failed to get voice list:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Get voices error:', error);
      return null;
    }
  }

  /**
   * Get voice recommendations based on content category
   */
  async getVoiceRecommendations(category = 'general') {
    try {
      const result = await this.runPythonScript(['--recommend', category]);
      
      if (result.success) {
        return JSON.parse(result.output);
      } else {
        console.error('❌ Failed to get voice recommendations:', result.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Get recommendations error:', error);
      return [];
    }
  }

  /**
   * Generate a voice preview
   */
  async generateVoicePreview(voiceId) {
    try {
      console.log(`🎧 Generating preview for voice: ${voiceId}`);

      const result = await this.runPythonScript(['--preview', voiceId]);

      if (result.success) {
        const audioData = JSON.parse(result.output);
        console.log(`✅ Preview generated: ${audioData.file_name}`);
        
        return {
          success: true,
          audioUrl: `/audio/${audioData.file_name}`,
          filePath: audioData.file_path,
          fileName: audioData.file_name,
          duration: audioData.duration,
          voiceId: voiceId,
          voiceName: audioData.voice_name
        };
      } else {
        console.error('❌ Preview generation failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ Preview generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate audio from text using Kokoro voice ID
   */
  async generateAudio(text, options = {}) {
    try {
      const {
        voice = 'af_heart',  // Use Kokoro voice ID instead of legacy names
        speed = 1.0,
        outputFile = null
      } = options;

      console.log(`🎤 Generating TTS audio: voice=${voice}, speed=${speed}`);

      const args = [
        '--text', text,
        '--voice', voice,
        '--speed', speed.toString()
      ];

      if (outputFile) {
        args.push('--output', outputFile);
      }

      const result = await this.runPythonScript(args);

      if (result.success) {
        const audioData = JSON.parse(result.output);
        console.log(`✅ Audio generated: ${audioData.file_name} (${audioData.duration}s)`);
        
        return {
          success: true,
          audioUrl: `/audio/${audioData.file_name}`,
          filePath: audioData.file_path,
          fileName: audioData.file_name,
          duration: audioData.duration,
          fileSize: audioData.file_size,
          voice: audioData.voice_id,
          voiceName: audioData.voice_name,
          voiceCharacteristics: audioData.voice_characteristics,
          speed: audioData.speed,
          textLength: audioData.text_length,
          model: audioData.model
        };
      } else {
        console.error('❌ TTS generation failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ TTS generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run Python TTS script with arguments
   */
  async runPythonScript(args) {
    return new Promise((resolve) => {
      const process = spawn('python', [this.pythonScript, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: output.trim(),
            error: null
          });
        } else {
          resolve({
            success: false,
            output: output.trim(),
            error: error.trim() || `Process exited with code ${code}`
          });
        }
      });

      process.on('error', (err) => {
        resolve({
          success: false,
          output: '',
          error: err.message
        });
      });
    });
  }

  /**
   * Validate Kokoro voice ID format
   */
  validateKokoroVoiceId(voiceId) {
    const validPrefixes = ['af_', 'am_', 'bf_', 'bm_'];
    return validPrefixes.some(prefix => voiceId.startsWith(prefix));
  }

  /**
   * Get default Kokoro voice if invalid voice provided
   */
  getDefaultKokoroVoice() {
    return 'af_heart'; // Heart (American Female) - professional default
  }

  /**
   * Clean up old audio files
   */
  async cleanupOldFiles(olderThanHours = 24) {
    try {
      const files = await fs.readdir(this.audioDir);
      const now = Date.now();
      const threshold = olderThanHours * 60 * 60 * 1000;

      let cleaned = 0;

      for (const file of files) {
        if (file.startsWith('narration_') && file.endsWith('.wav')) {
          const filePath = path.join(this.audioDir, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > threshold) {
            await fs.remove(filePath);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} old audio files`);
      }

      return { cleaned, total: files.length };
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      return { cleaned: 0, total: 0, error: error.message };
    }
  }
}

export default TTSWrapper;