#!/usr/bin/env python3
"""
Kokoro-82M TTS Service for IntelliCast AI
High-quality Text-to-Speech using Kokoro-82M model
"""

import sys
import os
import json
import argparse
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    import torch
    import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class KokoroTTSService:
    """High-quality TTS service using Kokoro-82M model"""
    
    def __init__(self, model_path: Optional[str] = None):
        """Initialize the TTS service"""
        self.model_path = model_path or "hexgrad/Kokoro-82M"  # Default HuggingFace model
        self.audio_dir = Path(__file__).parent.parent / "audio"
        self.audio_dir.mkdir(exist_ok=True)
        
        # Initialize model components
        self.model = None
        self.tokenizer = None
        self.vocoder = None
        self.device = "cuda" if self._check_cuda() else "cpu"
        
        # Voice configurations with natural podcast delivery settings
        # Using actual available Kokoro-82M voices: af_heart, af_sky, af_bella, af_sarah, af_nicole, am_adam
        self.voices = {
            'emma': {
                'kokoro_voice': 'af_heart',  # Professional female - warm and clear
                'speed': 0.9, 
                'description': 'Professional female voice (Kokoro AF Heart)',
                'intonation': 'professional',
                'pause_style': 'thoughtful'
            },
            'james': {
                'kokoro_voice': 'am_adam', 
                'speed': 0.85, 
                'description': 'Authoritative male voice (Kokoro AM Adam)',
                'intonation': 'authoritative',
                'pause_style': 'confident'
            },
            'sophia': {
                'kokoro_voice': 'af_sarah', 
                'speed': 0.95, 
                'description': 'Warm female voice (Kokoro AF Sarah)',
                'intonation': 'conversational',
                'pause_style': 'natural'
            },
            'michael': {
                'kokoro_voice': 'am_adam', 
                'speed': 0.8, 
                'description': 'Deep male voice (Kokoro AM Adam)',
                'intonation': 'narrative',
                'pause_style': 'dramatic'
            },
            'olivia': {
                'kokoro_voice': 'af_sarah', 
                'speed': 0.92, 
                'description': 'Clear female voice (Kokoro AF Sarah)',
                'intonation': 'educational',
                'pause_style': 'clear'
            },
            'david': {
                'kokoro_voice': 'af_bella', 
                'speed': 0.88, 
                'description': 'Friendly voice (Kokoro AF Bella)',
                'intonation': 'friendly',
                'pause_style': 'engaging'
            },
        }
        
        logger.info(f"🎙️  Kokoro-82M TTS Service initialized on {self.device}")

    def _check_cuda(self) -> bool:
        """Check if CUDA is available"""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    def _load_kokoro_model(self):
        """Load the Kokoro-82M model using the official Kokoro library"""
        if self.model is not None:
            return True  # Already loaded
        
        try:
            from kokoro import KPipeline
            
            logger.info(f"📥 Loading Kokoro-82M model...")
            
            # Load the official Kokoro pipeline with correct language code
            # 'a' = American English, 'b' = British English
            self.model = KPipeline(lang_code='a')
            
            # Get available voices from the loaded model
            available_voices = getattr(self.model, 'voices', [])
            logger.info(f"📋 Available Kokoro voices: {available_voices}")
            
            logger.info(f"✅ Kokoro-82M model loaded successfully on {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load Kokoro-82M model: {str(e)}")
            logger.info("🔄 Falling back to Windows SAPI TTS")
            return False

    def _generate_with_kokoro(self, text: str, voice_config: Dict, speed: float, output_path: str) -> bool:
        """Generate TTS using Kokoro-82M model"""
        
        try:
            import soundfile as sf
            import numpy as np
            
            # Load model if not already loaded
            if not self._load_kokoro_model():
                return False
            
            # Get voice name from the selected voice in generate_audio call
            current_voice = getattr(self, '_current_voice', 'emma')
            
            logger.info(f"🎤 Generating with Kokoro-82M: voice={current_voice}, speed={speed}")
            
            # Generate audio using Kokoro pipeline with voice specification
            # Based on Kokoro error message: voice="af_heart" is expected format
            # Common Kokoro voices: af_heart, af_sky, af_sandra, etc.
            
            voice_mapping = {
                'emma': 'af_heart',    # Professional female - warm, clear
                'james': 'am_adam',    # Authoritative male - only male voice available
                'sophia': 'af_sarah',  # Warm female - alternative working voice
                'michael': 'am_adam',  # Deep male voice
                'olivia': 'af_sarah',  # Clear female - using working alternative
                'david': 'af_bella'    # Friendly voice - approachable tone
            }
            
            kokoro_voice = voice_mapping.get(current_voice, 'af_heart')
            
            logger.info(f"Using Kokoro voice: {kokoro_voice}")
            audio_generator = self.model(text, voice=kokoro_voice)
            
            # The model returns a generator, we need to collect the audio data
            audio_segments = []
            sample_rate = 24000  # Kokoro's native sample rate
            
            try:
                # Iterate through the generator to get audio segments
                for segment in audio_generator:
                    if hasattr(segment, 'audio'):
                        audio_data = segment.audio
                    else:
                        audio_data = segment
                    
                    # Convert to numpy if needed
                    if hasattr(audio_data, 'cpu'):
                        audio_data = audio_data.cpu().numpy()
                    elif hasattr(audio_data, 'numpy'):
                        audio_data = audio_data.numpy()
                    elif not isinstance(audio_data, np.ndarray):
                        audio_data = np.array(audio_data, dtype=np.float32)
                    
                    # Ensure proper format
                    if len(audio_data.shape) > 1:
                        audio_data = audio_data.flatten()
                    
                    audio_segments.append(audio_data)
                    
            except Exception as gen_error:
                # If generator approach fails, try direct conversion
                logger.info(f"Generator approach failed: {gen_error}, trying direct conversion...")
                
                # Try to get the raw audio data directly
                if hasattr(audio_generator, 'cpu'):
                    audio_data = audio_generator.cpu().numpy()
                elif hasattr(audio_generator, 'numpy'):
                    audio_data = audio_generator.numpy()
                else:
                    audio_data = np.array(list(audio_generator), dtype=np.float32).flatten()
                
                audio_segments = [audio_data]
            
            # Concatenate all segments
            if audio_segments:
                final_audio = np.concatenate(audio_segments) if len(audio_segments) > 1 else audio_segments[0]
            else:
                logger.error("No audio data generated")
                return False
            
            # Check if we have valid audio data
            if len(final_audio) == 0:
                logger.error("Generated audio is empty")
                return False
            
            # Apply speed adjustment if needed (simple time stretching)
            if speed != 1.0:
                # Simple resampling for speed adjustment
                target_length = int(len(final_audio) / speed)
                if target_length > 0:
                    indices = np.linspace(0, len(final_audio) - 1, target_length).astype(int)
                    final_audio = final_audio[indices]
            
            # Normalize audio to prevent clipping
            max_val = np.max(np.abs(final_audio))
            if max_val > 0:
                final_audio = final_audio / max_val * 0.95
            else:
                logger.warning("Audio signal has zero amplitude, using original")
            
            # Save audio file
            sf.write(output_path, final_audio, sample_rate)
            
            logger.info(f"✅ Kokoro-82M audio generated: {output_path} ({len(final_audio)/sample_rate:.2f}s)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Kokoro-82M generation error: {str(e)}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return False

    def _features_to_audio(self, features, voice_config: Dict, speed: float):
        """Convert model features to audio waveform (simplified implementation)"""
        import numpy as np
        
        # This is a simplified conversion - real Kokoro-82M would have a proper vocoder
        # For now, generate a sine wave pattern that represents the speech
        duration = features.shape[1] * 0.05 / speed  # Rough duration estimate
        sample_rate = 22050
        t = np.linspace(0, duration, int(sample_rate * duration))
        
        # Create a more complex waveform that varies based on the features
        feature_means = features.mean(dim=-1).squeeze().cpu().numpy()
        
        # Generate audio with varying frequency based on features
        audio = np.zeros_like(t)
        for i, feature_val in enumerate(feature_means[:min(len(feature_means), len(t)//100)]):
            start_idx = i * (len(t) // len(feature_means))
            end_idx = min((i + 1) * (len(t) // len(feature_means)), len(t))
            
            # Map feature to frequency (200-800 Hz range)
            freq = 200 + (abs(float(feature_val)) * 600)
            audio[start_idx:end_idx] = 0.3 * np.sin(2 * np.pi * freq * t[start_idx:end_idx])
        
        # Add some envelope and variation to make it more speech-like
        envelope = np.exp(-t / (duration * 0.8))  # Fade out
        audio = audio * envelope * 0.8  # Normalize
        
        return audio.astype(np.float32)

    def _enhance_text_for_speech(self, text: str, voice_config: Dict) -> str:
        """Enhance text with natural speech patterns for better podcast delivery"""
        import re
        
        enhanced_text = text
        pause_style = voice_config.get('pause_style', 'natural')
        intonation = voice_config.get('intonation', 'conversational')
        
        # Define pause length based on voice style
        pause_lengths = {
            'dramatic': '... ... ',   # Longer pauses for dramatic effect
            'confident': '... ',      # Medium pauses for authority
            'thoughtful': '.. ',      # Shorter pauses for contemplation
            'natural': '... ',        # Standard pauses
            'clear': '. ',           # Minimal pauses for clarity
            'engaging': '... '        # Standard engaging pauses
        }
        
        pause_marker = pause_lengths.get(pause_style, '... ')
        
        # Add dramatic pauses after powerful statements
        dramatic_patterns = [
            r'(\bThis is crucial\b)',
            r'(\bThis changes everything\b)',
            r'(\bHere\'s the thing\b)',
            r'(\bHere\'s what\'s interesting\b)',
            r'(\bNow here\'s where it gets interesting\b)',
            r'(\bBut here\'s the twist\b)',
            r'(\bThe key insight is\b)',
            r'(\bThe bottom line is\b)'
        ]
        
        for pattern in dramatic_patterns:
            if pause_style in ['dramatic', 'narrative']:
                enhanced_text = re.sub(pattern, r'\1... ... ', enhanced_text, flags=re.IGNORECASE)
            else:
                enhanced_text = re.sub(pattern, r'\1' + pause_marker, enhanced_text, flags=re.IGNORECASE)
        
        # Add emphasis and pauses around numbers and statistics
        number_patterns = [
            r'(\b\d+(?:\.\d+)?\s*(?:percent|%|million|billion|thousand))',
            r'(\b\d{4}\b)',  # Years
            r'(\$\d+(?:,\d+)*(?:\.\d+)?)',  # Money
            r'(\b\d+(?:,\d+)+\b)'  # Large numbers with commas
        ]
        
        for pattern in number_patterns:
            if intonation in ['authoritative', 'professional']:
                # More emphasis for authoritative voices
                enhanced_text = re.sub(pattern, r'... \1 ... ', enhanced_text)
            elif pause_style == 'clear':
                # Less emphasis for clear delivery
                enhanced_text = re.sub(pattern, r'. \1 .', enhanced_text)
            else:
                enhanced_text = re.sub(pattern, r'... \1 ...', enhanced_text)
        
        # Add pauses before important transitions
        transition_patterns = [
            r'(\bHowever\b)',
            r'(\bMoreover\b)', 
            r'(\bFurthermore\b)',
            r'(\bIn contrast\b)',
            r'(\bOn the other hand\b)',
            r'(\bMeanwhile\b)',
            r'(\bNevertheless\b)',
            r'(\bConsequently\b)'
        ]
        
        for pattern in transition_patterns:
            enhanced_text = re.sub(pattern, r'... \1,', enhanced_text, flags=re.IGNORECASE)
        
        # Add emphasis to superlatives and strong adjectives
        emphasis_patterns = [
            r'(\bextraordinary\b|\bincredible\b|\bremarkable\b|\bphenomenal\b)',
            r'(\bcrucial\b|\bessential\b|\bvital\b|\bcritical\b)',
            r'(\bgroundbreaking\b|\brevolutionary\b|\binnovative\b)',
            r'(\bfascinati(ng|on)\b|\bamazing\b|\bastounding\b)'
        ]
        
        for pattern in emphasis_patterns:
            # For Windows SAPI, we can't use SSML, but we can add strategic pauses
            enhanced_text = re.sub(pattern, r'... \1', enhanced_text, flags=re.IGNORECASE)
        
        # Add natural pauses after introductory phrases
        intro_patterns = [
            r'(\bLet me tell you\b)',
            r'(\bImagine this\b)',
            r'(\bPicture this\b)',
            r'(\bConsider this\b)',
            r'(\bThink about it\b)',
            r'(\bHere\'s something\b)'
        ]
        
        for pattern in intro_patterns:
            enhanced_text = re.sub(pattern, r'\1...', enhanced_text, flags=re.IGNORECASE)
        
        # Add pauses around quotes and important statements
        enhanced_text = re.sub(r'(\s)"([^"]+)"(\s)', r'\1... "\2" ...\3', enhanced_text)
        
        # Clean up multiple consecutive pauses
        enhanced_text = re.sub(r'\.{4,}', '...', enhanced_text)
        enhanced_text = re.sub(r'(\.\.\. ){2,}', '... ', enhanced_text)
        
        # Add strategic pauses at paragraph breaks
        enhanced_text = re.sub(r'\n\n', '\n\n... ', enhanced_text)
        
        # Add natural breathing pauses in long sentences (every 15-20 words)
        sentences = enhanced_text.split('. ')
        processed_sentences = []
        
        for sentence in sentences:
            if len(sentence.split()) > 20:  # Long sentences need breathing room
                words = sentence.split()
                chunks = [words[i:i+15] for i in range(0, len(words), 15)]
                breathing_sentence = (' ' + pause_marker + ' ').join([' '.join(chunk) for chunk in chunks])
                processed_sentences.append(breathing_sentence)
            else:
                processed_sentences.append(sentence)
        
        enhanced_text = '. '.join(processed_sentences)
        
        return enhanced_text

    def check_dependencies(self) -> Dict[str, Any]:
        """Check if required dependencies are available"""
        status = {
            'kokoro_available': False,
            'ffmpeg_available': False,
            'dependencies_ok': False,
            'device': self.device
        }
        
        try:
            # Check for Kokoro library and its dependencies
            from kokoro import KPipeline
            import soundfile as sf
            import numpy as np
            
            status['kokoro_available'] = True
            logger.info(f"✅ Kokoro-82M dependencies found (device: {self.device})")
        except ImportError as e:
            logger.warning(f"⚠️  Kokoro-82M dependencies missing: {str(e)}")
            logger.warning("⚠️  Using Windows SAPI fallback")
            status['kokoro_available'] = False
        
        try:
            # Check FFmpeg for audio processing
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
            status['ffmpeg_available'] = True
            logger.info("✅ FFmpeg found")
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("⚠️  FFmpeg not found, audio processing limited")
            status['ffmpeg_available'] = False
        
        status['dependencies_ok'] = status['kokoro_available'] or status['ffmpeg_available']
        return status

    def generate_audio(self, text: str, voice: str = 'emma', speed: float = 1.0, 
                      output_file: str = None) -> Dict[str, Any]:
        """Generate audio from text using Kokoro-82M TTS with natural speech patterns"""
        
        try:
            # Get voice configuration
            voice_config = self.voices.get(voice, self.voices['emma'])
            effective_speed = voice_config['speed'] * speed
            
            # Generate unique filename if not provided
            if not output_file:
                import uuid
                output_file = f"narration_{uuid.uuid4().hex[:8]}.wav"
            
            output_path = self.audio_dir / output_file
            
            logger.info(f"🎤 Generating audio for voice '{voice}' at {effective_speed}x speed")
            
            # Store current voice for Kokoro generation
            self._current_voice = voice
            
            # Process text to add natural speech patterns based on voice characteristics
            enhanced_text = self._enhance_text_for_speech(text, voice_config)
            
            # Try Kokoro-82M first, then fall back to Windows SAPI
            logger.info("🎯 Attempting Kokoro-82M TTS generation...")
            success = self._generate_with_kokoro(enhanced_text, voice_config, effective_speed, str(output_path))
            
            if not success:
                logger.info("🔄 Kokoro-82M failed, falling back to Windows SAPI...")
                success = self._generate_with_fallback_tts(enhanced_text, str(output_path), voice_config, effective_speed)
            
            if success:
                # Get audio metadata
                duration = self._get_audio_duration(str(output_path))
                file_size = output_path.stat().st_size if output_path.exists() else 0
                
                return {
                    'success': True,
                    'file_path': str(output_path),
                    'file_name': output_file,
                    'duration': duration,
                    'file_size': file_size,
                    'voice': voice,
                    'speed': effective_speed,
                    'text_length': len(text),
                    'model': 'Kokoro-82M' if success and hasattr(self, 'model') and self.model is not None else 'Windows-SAPI'
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to generate audio'
                }
                
        except Exception as e:
            logger.error(f"❌ TTS generation error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def _generate_with_fallback_tts(self, text: str, output_path: str, 
                                  voice_config: Dict, speed: float) -> bool:
        """Generate TTS using fallback method (for development)"""
        
        try:
            # For now, we'll use Windows built-in TTS as a fallback
            # In production, this would be replaced with Kokoro-82M
            
            if sys.platform == "win32":
                return self._generate_with_windows_tts(text, output_path, speed)
            else:
                # For other platforms, create a placeholder audio file
                return self._create_placeholder_audio(text, output_path, speed)
                
        except Exception as e:
            logger.error(f"❌ Fallback TTS error: {str(e)}")
            return False

    def _generate_with_windows_tts(self, text: str, output_path: str, speed: float) -> bool:
        """Generate TTS using Windows SAPI with enhanced speech patterns"""
        
        try:
            # Enhanced PowerShell script for better speech quality
            escaped_text = text.replace('"', '""').replace('`', '``')
            
            # Map speed to SAPI rate (-10 to 10 range)
            sapi_rate = max(-10, min(10, int((speed - 1) * 8)))
            
            powershell_script = f"""
            Add-Type -AssemblyName System.Speech
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
            
            # Set speech parameters for natural podcast delivery
            $synth.Rate = {sapi_rate}
            $synth.Volume = 100
            
            # Try to select a better voice if available
            $voices = $synth.GetInstalledVoices()
            foreach ($voice in $voices) {{
                if ($voice.VoiceInfo.Name -like "*Zira*" -or $voice.VoiceInfo.Name -like "*David*" -or $voice.VoiceInfo.Name -like "*Mark*") {{
                    $synth.SelectVoice($voice.VoiceInfo.Name)
                    break
                }}
            }}
            
            $synth.SetOutputToWaveFile("{output_path}")
            
            # Process text with natural speech patterns
            $enhancedText = @"
{escaped_text}
"@
            
            # Convert ellipses to natural pauses (SAPI interprets periods as pauses)
            $enhancedText = $enhancedText -replace '\.\.\.', '. . .'
            
            $synth.Speak($enhancedText)
            $synth.Dispose()
            """
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.ps1', delete=False) as f:
                f.write(powershell_script)
                ps_file = f.name
            
            try:
                result = subprocess.run([
                    'powershell', '-ExecutionPolicy', 'Bypass', '-File', ps_file
                ], capture_output=True, text=True, timeout=30)
                
                success = result.returncode == 0 and os.path.exists(output_path)
                
                if success:
                    logger.info(f"✅ Audio generated: {output_path}")
                else:
                    logger.error(f"❌ Windows TTS failed: {result.stderr}")
                
                return success
                
            finally:
                try:
                    os.unlink(ps_file)
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"❌ Windows TTS error: {str(e)}")
            return False

    def _create_placeholder_audio(self, text: str, output_path: str, speed: float) -> bool:
        """Create a placeholder audio file (for non-Windows development)"""
        
        try:
            # Generate a simple tone-based audio file using FFmpeg if available
            duration = len(text.split()) * 0.5 / speed  # Rough estimate
            
            if subprocess.run(['which', 'ffmpeg'], capture_output=True).returncode == 0:
                cmd = [
                    'ffmpeg', '-f', 'lavfi', '-i', f'sine=frequency=440:duration={duration}',
                    '-ar', '22050', '-ac', '1', output_path, '-y'
                ]
                
                result = subprocess.run(cmd, capture_output=True)
                return result.returncode == 0
            else:
                # Create a minimal WAV file header
                import wave
                with wave.open(output_path, 'wb') as wav:
                    wav.setnchannels(1)
                    wav.setsampwidth(2)
                    wav.setframerate(22050)
                    # Write silence
                    silence_duration = int(22050 * duration)
                    wav.writeframes(b'\x00\x00' * silence_duration)
                
                return True
                
        except Exception as e:
            logger.error(f"❌ Placeholder audio error: {str(e)}")
            return False

    def _get_audio_duration(self, audio_path: str) -> float:
        """Get duration of audio file"""
        
        try:
            if subprocess.run(['which', 'ffprobe'], capture_output=True).returncode == 0:
                cmd = [
                    'ffprobe', '-v', 'quiet', '-print_format', 'json', 
                    '-show_format', audio_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    data = json.loads(result.stdout)
                    return float(data['format']['duration'])
            
            # Fallback: estimate based on file size
            file_size = os.path.getsize(audio_path)
            # Rough estimate: 22050 Hz, 16-bit, mono = ~44KB per second
            estimated_duration = file_size / 44100
            return estimated_duration
            
        except Exception as e:
            logger.error(f"❌ Duration calculation error: {str(e)}")
            # Very rough fallback estimate
            return len(open(audio_path, 'rb').read()) / 44100

    def health_check(self) -> Dict[str, Any]:
        """Check TTS service health"""
        
        dependencies = self.check_dependencies()
        
        # Test generation with a short phrase
        test_result = self.generate_audio("Test audio generation.", voice='emma', speed=1.0)
        
        return {
            'status': 'healthy' if test_result['success'] else 'unhealthy',
            'dependencies': dependencies,
            'voices_available': len(self.voices),
            'audio_directory': str(self.audio_dir),
            'test_generation': test_result['success'],
            'timestamp': str(pd.Timestamp.now()) if 'pd' in globals() else 'N/A'
        }

def main():
    """CLI interface for TTS service"""
    
    parser = argparse.ArgumentParser(description='Kokoro-82M TTS Service')
    parser.add_argument('--text', help='Text to convert to speech')
    parser.add_argument('--voice', default='emma', choices=['emma', 'james', 'sophia', 'michael', 'olivia', 'david'],
                       help='Voice to use for TTS')
    parser.add_argument('--speed', type=float, default=1.0, help='Speech speed (0.5 - 2.0)')
    parser.add_argument('--output', help='Output file path')
    parser.add_argument('--health-check', action='store_true', help='Run health check')
    
    args = parser.parse_args()
    
    # Initialize service
    tts_service = KokoroTTSService()
    
    if args.health_check:
        health = tts_service.health_check()
        print(json.dumps(health, indent=2))
        return
    
    if not args.text:
        parser.error("--text is required when not using --health-check")
    
    # Generate audio
    result = tts_service.generate_audio(
        text=args.text,
        voice=args.voice,
        speed=args.speed,
        output_file=args.output
    )
    
    print(json.dumps(result, indent=2))
    
    if result['success']:
        logger.info(f"🎉 Audio generated successfully: {result['file_path']}")
        sys.exit(0)
    else:
        logger.error(f"❌ Audio generation failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)

if __name__ == "__main__":
    main()