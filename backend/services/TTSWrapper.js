import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TTSWrapper {
  constructor() {
    this.pythonScript = path.join(__dirname, 'TTSService.py');  // Use Chatterbox exclusive service
    this.audioDir = path.join(__dirname, '..', 'audio');
    
    console.log('🎙️  Exclusive Chatterbox TTS Service initialized');
    console.log('🌍 Supporting 23 languages with emotion control');
    console.log('🚫 No fallback TTS - Chatterbox exclusive mode enabled');
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

      // Generate a short preview text based on language
      const previewTexts = {
        'en': 'Hello! This is a preview of this professional voice for your podcast content.',
        'es': 'Hola! Esta es una previsualización de esta voz profesional para tu contenido de podcast.',
        'fr': 'Bonjour! Ceci est un aperçu de cette voix professionnelle pour votre contenu de podcast.',
        'de': 'Hallo! Dies ist eine Vorschau dieser professionellen Stimme für Ihren Podcast-Inhalt.',
        'ar': 'مرحبا! هذه معاينة لهذا الصوت الاحترافي لمحتوى البودكاست الخاص بك.',
        'da': 'Hej! Dette er en forhåndsvisning af denne professionelle stemme til dit podcast-indhold.',
        'el': 'Γειά σου! Αυτή είναι μια προεπισκόπηση αυτής της επαγγελματικής φωνής για το περιεχόμενο του podcast σας.',
        'fi': 'Hei! Tämä on esikatselu tästä ammattimaisesta äänestä podcast-sisällöllesi.',
        'he': 'שלום! זוהי תצוגה מקדימה של הקול המקצועי הזה עבור תוכן הפודקאסט שלך.',
        'hi': 'नमस्ते! यह आपकी पॉडकास्ट सामग्री के लिए इस पेशेवर आवाज का पूर्वावलोकन है।',
        'it': 'Ciao! Questa è un\'anteprima di questa voce professionale per il contenuto del tuo podcast.',
        'ja': 'こんにちは！これはあなたのポッドキャストコンテンツのためのプロフェッショナルな声のプレビューです。',
        'ko': '안녕하세요! 이것은 귀하의 팟캐스트 콘텐츠를 위한 이 전문적인 목소리의 미리보기입니다.',
        'ms': 'Hello! Ini adalah pratonton suara profesional untuk kandungan podcast anda.',
        'nl': 'Hallo! Dit is een voorvertoning van deze professionele stem voor je podcast-inhoud.',
        'no': 'Hei! Dette er en forhåndsvisning av denne profesjonelle stemmen for podcast-innholdet ditt.',
        'pl': 'Cześć! To jest podgląd tego profesjonalnego głosu dla treści twojego podcastu.',
        'pt': 'Olá! Esta é uma prévia desta voz profissional para o conteúdo do seu podcast.',
        'ru': 'Привет! Это предварительный просмотр этого профессионального голоса для вашего подкаст-контента.',
        'sv': 'Hej! Detta är en förhandsvisning av denna professionella röst för ditt podcast-innehåll.',
        'sw': 'Hujambo! Hii ni hakiki ya sauti hii ya kitaaluma kwa maudhui ya podcast yako.',
        'tr': 'Merhaba! Bu, podcast içeriğiniz için bu profesyonel sesin önizlemesidir.',
        'zh': '你好！这是为您的播客内容提供的专业声音预览。'
      };
      
      const language = voiceId.includes('_') ? voiceId.split('_').pop() : 'en';
      const previewText = previewTexts[language] || previewTexts['en'];

      const result = await this.runPythonScript(['--text', previewText, '--voice', voiceId]);

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
          language: audioData.language,
          model: audioData.model
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
   * Generate audio from text using Chatterbox multilingual voice ID with advanced customization
   */
  async generateAudio(text, options = {}) {
    try {
      const {
        voice = 'default_en',  // Use Chatterbox default voice ID with language suffix
        speed = 1.0,
        emotion = null,
        exaggeration = null,
        temperature = 0.8,
        cfg_weight = 0.5,
        min_p = 0.05,
        top_p = 1.0,
        repetition_penalty = 1.2,
        seed = 0,
        reference_audio = null,
        outputFile = null,
        autoDetect = true
      } = options;

      console.log(`🎤 Generating TTS audio: voice=${voice}, exaggeration=${exaggeration}, temp=${temperature}, cfg=${cfg_weight}`);

      const args = [
        '--text', text,
        '--voice', voice,
        '--speed', speed.toString()
      ];

      // Advanced voice customization parameters
      if (exaggeration !== null) {
        args.push('--exaggeration', exaggeration.toString());
      } else if (emotion !== null) {
        args.push('--emotion', emotion.toString());
      }

      if (temperature !== 0.8) {
        args.push('--temperature', temperature.toString());
      }

      if (cfg_weight !== 0.5) {
        args.push('--cfg-weight', cfg_weight.toString());
      }

      if (min_p !== 0.05) {
        args.push('--min-p', min_p.toString());
      }

      if (top_p !== 1.0) {
        args.push('--top-p', top_p.toString());
      }

      if (repetition_penalty !== 1.2) {
        args.push('--repetition-penalty', repetition_penalty.toString());
      }

      if (seed !== 0) {
        args.push('--seed', seed.toString());
      }

      if (reference_audio) {
        args.push('--reference-audio', reference_audio);
      }

      if (outputFile) {
        args.push('--output', outputFile);
      }

      if (autoDetect) {
        args.push('--auto-detect');
      }

      const result = await this.runPythonScript(args);

      if (result.success) {
        // Extract JSON from output (ignore loading messages and logs)
        const output = result.output;
        
        // Find the complete JSON object by matching braces
        const jsonStartIndex = output.indexOf('{');
        if (jsonStartIndex === -1) {
          throw new Error('No JSON response found in TTS output');
        }
        
        let braceCount = 0;
        let jsonEndIndex = -1;
        
        for (let i = jsonStartIndex; i < output.length; i++) {
          if (output[i] === '{') braceCount++;
          if (output[i] === '}') braceCount--;
          if (braceCount === 0) {
            jsonEndIndex = i;
            break;
          }
        }
        
        if (jsonEndIndex === -1) {
          throw new Error('Incomplete JSON response found in TTS output');
        }
        
        const jsonString = output.substring(jsonStartIndex, jsonEndIndex + 1);
        const audioData = JSON.parse(jsonString);
        console.log(`✅ Audio generated: ${audioData.file_name} (${audioData.duration}s, ${audioData.language})`);
        
        return {
          success: true,
          audioUrl: `/audio/${audioData.file_name}`,
          filePath: audioData.file_path,
          fileName: audioData.file_name,
          duration: audioData.duration,
          fileSize: audioData.file_size,
          voice: audioData.voice,
          language: audioData.language,
          emotion: audioData.emotion,
          voiceCharacteristics: audioData.voice_characteristics,
          speed: audioData.speed,
          textLength: audioData.text_length,
          model: audioData.model
        };
      } else {
        console.error('❌ Chatterbox TTS generation failed:', result.error);
        return {
          success: false,
          error: `Chatterbox TTS failed: ${result.error}`
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
   * Validate Chatterbox voice ID format
   */
  validateChatterboxVoiceId(voiceId) {
    const validPatterns = ['_en', '_es', '_fr', '_de', '_ar', '_da', '_el', '_fi', '_he', '_hi', '_it', '_ja', '_ko', '_ms', '_nl', '_no', '_pl', '_pt', '_ru', '_sv', '_sw', '_tr', '_zh'];
    return validPatterns.some(suffix => voiceId.endsWith(suffix));
  }

  /**
   * Get default Chatterbox voice if invalid voice provided
   */
  getDefaultChatterboxVoice() {
    return 'default_en'; // Default English - professional default
  }

  /**
   * Clone voice from reference audio (5-second cloning)
   */
  async cloneVoice(referenceAudioPath, targetVoiceId = null) {
    try {
      console.log(`🎭 Cloning voice from: ${referenceAudioPath}`);

      const args = ['--clone-voice', referenceAudioPath];
      if (targetVoiceId) {
        args.push('--voice', targetVoiceId);
      }

      const result = await this.runPythonScript(args);

      if (result.success && !result.output.includes('failed')) {
        console.log(`✅ Voice cloned successfully`);
        return {
          success: true,
          clonedVoiceId: result.output.trim()
        };
      } else {
        console.error('❌ Voice cloning failed:', result.output);
        return {
          success: false,
          error: result.output || 'Voice cloning failed'
        };
      }
    } catch (error) {
      console.error('❌ Voice cloning error:', error);
      return {
        success: false,
        error: error.message
      };
    }
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
        if ((file.startsWith('narration_') || file.startsWith('chatterbox_')) && file.endsWith('.wav')) {
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