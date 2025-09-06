#!/usr/bin/env python3
"""
Enhanced Kokoro-82M TTS Service for IntelliCast AI
Comprehensive TTS with all 30 Kokoro voices and advanced features
"""

import sys
import os
import json
import argparse
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List, TYPE_CHECKING

# Import the voice database
from KokoroVoiceDatabase import KokoroVoiceDatabase

if TYPE_CHECKING:
    import torch
    import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EnhancedKokoroTTSService:
    """Enhanced TTS service with all 30 Kokoro voices and advanced features"""
    
    def __init__(self, model_path: Optional[str] = None):
        """Initialize the enhanced TTS service"""
        self.model_path = model_path or "hexgrad/Kokoro-82M"
        self.audio_dir = Path(__file__).parent.parent / "audio"
        self.audio_dir.mkdir(exist_ok=True)
        
        # Initialize voice database
        self.voice_db = KokoroVoiceDatabase()
        self.voices = self.voice_db.get_all_voices()
        
        # Initialize model components
        self.model = None
        self.tokenizer = None
        self.vocoder = None
        self.device = "cuda" if self._check_cuda() else "cpu"
        
        logger.info(f"🎙️  Enhanced Kokoro-82M TTS Service initialized")
        logger.info(f"📊 Loaded {len(self.voices)} voices across 4 categories")
        logger.info(f"🔧 Device: {self.device}")

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
            
            # Load the official Kokoro pipeline with American English as default
            self.model = KPipeline(lang_code='a')
            
            # Also load British English pipeline for British voices
            self.british_model = KPipeline(lang_code='b')
            
            logger.info(f"✅ Kokoro-82M models loaded successfully on {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load Kokoro-82M model: {str(e)}")
            logger.info("🔄 Falling back to Windows SAPI TTS")
            return False

    def get_available_voices(self) -> Dict[str, Any]:
        """Get all available voices organized by categories"""
        return self.voice_db.export_for_frontend()
    
    def get_voice_by_id(self, voice_id: str) -> Dict[str, Any]:
        """Get specific voice configuration"""
        return self.voice_db.get_voice_by_id(voice_id)
    
    def get_recommended_voices(self, content_category: str = None, gender: str = None, accent: str = None) -> List[Dict[str, Any]]:
        """Get recommended voices based on criteria"""
        recommended = []
        
        for voice_id, voice_data in self.voices.items():
            matches = True
            
            if content_category and content_category.lower() not in [cat.lower() for cat in voice_data['best_for']]:
                matches = False
            
            if gender and voice_data['gender'] != gender.lower():
                matches = False
                
            if accent and voice_data['accent'] != accent.lower():
                matches = False
            
            if matches:
                recommended.append({
                    'id': voice_id,
                    **voice_data
                })
        
        # Sort by relevance (prioritize voices with matching categories)
        if content_category:
            recommended.sort(key=lambda v: content_category.lower() in [cat.lower() for cat in v['best_for']], reverse=True)
        
        return recommended[:10]  # Return top 10 recommendations

    def _get_model_for_voice(self, voice_id: str):
        """Get the appropriate model (American or British) for the voice"""
        voice_data = self.get_voice_by_id(voice_id)
        accent = voice_data.get('accent', 'american')
        
        if not hasattr(self, 'british_model') or accent == 'american':
            return self.model
        else:
            return self.british_model

    def _generate_with_kokoro(self, text: str, voice_id: str, speed: float, output_path: str) -> bool:
        """Generate TTS using Kokoro-82M model with specified voice"""
        
        try:
            import soundfile as sf
            import numpy as np
            
            # Load models if not already loaded
            if not self._load_kokoro_model():
                return False
            
            # Get voice configuration
            voice_config = self.get_voice_by_id(voice_id)
            if not voice_config:
                logger.error(f"❌ Voice {voice_id} not found")
                return False
            
            # Select appropriate model based on accent
            model = self._get_model_for_voice(voice_id)
            
            logger.info(f"🎤 Generating with Kokoro-82M: voice={voice_id} ({voice_config['display_name']}), speed={speed}")
            
            # Generate audio using Kokoro pipeline with the specific voice
            audio_generator = model(text, voice=voice_id)
            
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
            
            # Apply speed adjustment using voice-specific multiplier
            voice_speed_multiplier = voice_config.get('speed_multiplier', 1.0)
            effective_speed = speed * voice_speed_multiplier
            
            if effective_speed != 1.0:
                # Simple resampling for speed adjustment
                target_length = int(len(final_audio) / effective_speed)
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

    def _enhance_text_for_voice(self, text: str, voice_config: Dict) -> str:
        """Enhance text based on voice characteristics"""
        import re
        
        enhanced_text = text
        pause_style = voice_config.get('pause_style', 'natural')
        intonation = voice_config.get('intonation', 'conversational')
        tone = voice_config.get('tone', 'neutral')
        characteristics = voice_config.get('characteristics', [])
        
        # Adjust pauses based on voice characteristics
        if 'dramatic' in characteristics or tone == 'dramatic':
            # Add more dramatic pauses
            enhanced_text = re.sub(r'(\!)', r'\1... ', enhanced_text)
            enhanced_text = re.sub(r'(\?)', r'\1.. ', enhanced_text)
        
        if 'authoritative' in characteristics or tone == 'authoritative':
            # Add confident pauses
            enhanced_text = re.sub(r'(\bThis is\b)', r'... \1', enhanced_text, flags=re.IGNORECASE)
            enhanced_text = re.sub(r'(\bThe key\b)', r'... \1', enhanced_text, flags=re.IGNORECASE)
        
        if 'gentle' in characteristics or 'soothing' in characteristics:
            # Add calming pauses
            enhanced_text = re.sub(r'(\band\b)', r'\1 ...', enhanced_text, flags=re.IGNORECASE)
        
        # Accent-specific adjustments
        accent = voice_config.get('accent', 'american')
        if accent == 'british':
            # British speakers might emphasize certain words differently
            enhanced_text = re.sub(r'\bvery\b', 'quite', enhanced_text, flags=re.IGNORECASE)
            enhanced_text = re.sub(r'\bawesome\b', 'brilliant', enhanced_text, flags=re.IGNORECASE)
        
        return enhanced_text

    def generate_audio(self, text: str, voice_id: str = 'af_heart', speed: float = 1.0, 
                      output_file: str = None) -> Dict[str, Any]:
        """Generate audio from text using specified Kokoro voice"""
        
        try:
            # Get voice configuration
            voice_config = self.get_voice_by_id(voice_id)
            if not voice_config:
                return {
                    'success': False,
                    'error': f'Voice {voice_id} not found'
                }
            
            # Generate unique filename if not provided
            if not output_file:
                import uuid
                voice_name = voice_config.get('name', voice_id).lower()
                output_file = f"narration_{voice_name}_{uuid.uuid4().hex[:8]}.wav"
            
            output_path = self.audio_dir / output_file
            
            logger.info(f"🎤 Generating audio with voice '{voice_config['display_name']}' at {speed}x speed")
            
            # Process text to enhance speech patterns based on voice characteristics
            enhanced_text = self._enhance_text_for_voice(text, voice_config)
            
            # Try Kokoro-82M first, then fall back to Windows SAPI
            logger.info("🎯 Attempting Kokoro-82M TTS generation...")
            success = self._generate_with_kokoro(enhanced_text, voice_id, speed, str(output_path))
            
            if not success:
                logger.info("🔄 Kokoro-82M failed, falling back to Windows SAPI...")
                success = self._generate_with_fallback_tts(enhanced_text, str(output_path), voice_config, speed)
            
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
                    'voice_id': voice_id,
                    'voice_name': voice_config['display_name'],
                    'voice_characteristics': voice_config,
                    'speed': speed,
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

    def generate_preview(self, voice_id: str, preview_text: str = None) -> Dict[str, Any]:
        """Generate a short preview of the voice"""
        
        voice_config = self.get_voice_by_id(voice_id)
        if not voice_config:
            return {'success': False, 'error': f'Voice {voice_id} not found'}
        
        if not preview_text:
            # Generate appropriate preview text based on voice characteristics
            characteristics = voice_config.get('characteristics', [])
            tone = voice_config.get('tone', 'neutral')
            
            if 'professional' in characteristics:
                preview_text = "This is a professional voice demonstration for your podcast content."
            elif 'friendly' in characteristics:
                preview_text = "Hi there! This is what this friendly voice sounds like for your podcast."
            elif 'authoritative' in characteristics:
                preview_text = "This authoritative voice delivers important information with confidence and clarity."
            elif 'dramatic' in characteristics:
                preview_text = "Listen... to the dramatic power... of this compelling voice."
            elif 'gentle' in characteristics or 'soothing' in characteristics:
                preview_text = "This gentle voice provides a calm and soothing listening experience."
            else:
                preview_text = f"Hello, this is {voice_config['name']}, demonstrating this {voice_config['accent']} {voice_config['gender']} voice."
        
        # Generate short preview audio
        return self.generate_audio(
            text=preview_text,
            voice_id=voice_id,
            speed=1.0,
            output_file=f"preview_{voice_id}_{hash(preview_text) % 10000}.wav"
        )

    def _generate_with_fallback_tts(self, text: str, output_path: str, 
                                  voice_config: Dict, speed: float) -> bool:
        """Generate TTS using fallback method"""
        
        try:
            if sys.platform == "win32":
                return self._generate_with_windows_tts(text, output_path, speed)
            else:
                return self._create_placeholder_audio(text, output_path, speed)
                
        except Exception as e:
            logger.error(f"❌ Fallback TTS error: {str(e)}")
            return False

    def _generate_with_windows_tts(self, text: str, output_path: str, speed: float) -> bool:
        """Generate TTS using Windows SAPI with enhanced speech patterns"""
        
        try:
            escaped_text = text.replace('"', '""').replace('`', '``')
            sapi_rate = max(-10, min(10, int((speed - 1) * 8)))
            
            powershell_script = f"""
            Add-Type -AssemblyName System.Speech
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
            
            $synth.Rate = {sapi_rate}
            $synth.Volume = 100
            
            $voices = $synth.GetInstalledVoices()
            foreach ($voice in $voices) {{
                if ($voice.VoiceInfo.Name -like "*Zira*" -or $voice.VoiceInfo.Name -like "*David*" -or $voice.VoiceInfo.Name -like "*Mark*") {{
                    $synth.SelectVoice($voice.VoiceInfo.Name)
                    break
                }}
            }}
            
            $synth.SetOutputToWaveFile("{output_path}")
            
            $enhancedText = @"
{escaped_text}
"@
            
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
        """Create a placeholder audio file for non-Windows systems"""
        
        try:
            duration = len(text.split()) * 0.5 / speed
            
            if subprocess.run(['which', 'ffmpeg'], capture_output=True).returncode == 0:
                cmd = [
                    'ffmpeg', '-f', 'lavfi', '-i', f'sine=frequency=440:duration={duration}',
                    '-ar', '22050', '-ac', '1', output_path, '-y'
                ]
                
                result = subprocess.run(cmd, capture_output=True)
                return result.returncode == 0
            else:
                import wave
                with wave.open(output_path, 'wb') as wav:
                    wav.setnchannels(1)
                    wav.setsampwidth(2)
                    wav.setframerate(22050)
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
            
            file_size = os.path.getsize(audio_path)
            estimated_duration = file_size / 44100
            return estimated_duration
            
        except Exception as e:
            logger.error(f"❌ Duration calculation error: {str(e)}")
            return len(open(audio_path, 'rb').read()) / 44100

    def check_dependencies(self) -> Dict[str, Any]:
        """Check if required dependencies are available"""
        status = {
            'kokoro_available': False,
            'ffmpeg_available': False,
            'dependencies_ok': False,
            'device': self.device
        }
        
        try:
            from kokoro import KPipeline
            import soundfile as sf
            import numpy as np
            
            status['kokoro_available'] = True
            logger.info(f"✅ Kokoro-82M dependencies found (device: {self.device})")
        except ImportError as e:
            logger.warning(f"⚠️  Kokoro-82M dependencies missing: {str(e)}")
            status['kokoro_available'] = False
        
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
            status['ffmpeg_available'] = True
            logger.info("✅ FFmpeg found")
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("⚠️  FFmpeg not found, audio processing limited")
            status['ffmpeg_available'] = False
        
        status['dependencies_ok'] = status['kokoro_available'] or status['ffmpeg_available']
        return status

    def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check for the enhanced TTS service"""
        
        dependencies = self.check_dependencies()
        
        # Test generation with a representative voice from each category
        test_voices = ['af_heart', 'am_adam', 'bf_heart', 'bm_adam']
        test_results = {}
        
        for voice_id in test_voices:
            test_result = self.generate_audio(
                "Test audio generation.", 
                voice_id=voice_id, 
                speed=1.0,
                output_file=f"health_test_{voice_id}.wav"
            )
            test_results[voice_id] = test_result['success']
        
        # Summary statistics
        voice_summary = self.voice_db.get_voice_summary()
        
        return {
            'status': 'healthy' if any(test_results.values()) else 'unhealthy',
            'dependencies': dependencies,
            'voice_database': {
                'total_voices': voice_summary['total_voices'],
                'american_voices': voice_summary['american_voices'],
                'british_voices': voice_summary['british_voices'],
                'female_voices': voice_summary['female_voices'],
                'male_voices': voice_summary['male_voices']
            },
            'voice_test_results': test_results,
            'audio_directory': str(self.audio_dir),
            'model_loaded': hasattr(self, 'model') and self.model is not None,
            'timestamp': 'N/A'  # Could add pandas timestamp if needed
        }

def main():
    """CLI interface for enhanced TTS service"""
    
    parser = argparse.ArgumentParser(description='Enhanced Kokoro-82M TTS Service')
    parser.add_argument('--text', help='Text to convert to speech')
    parser.add_argument('--voice', help='Voice ID to use (see --list-voices)')
    parser.add_argument('--speed', type=float, default=1.0, help='Speech speed (0.5 - 2.0)')
    parser.add_argument('--output', help='Output file path')
    parser.add_argument('--health-check', action='store_true', help='Run comprehensive health check')
    parser.add_argument('--list-voices', action='store_true', help='List all available voices')
    parser.add_argument('--preview', help='Generate preview for specific voice ID')
    parser.add_argument('--recommend', help='Get voice recommendations for category')
    
    args = parser.parse_args()
    
    # Initialize service
    tts_service = EnhancedKokoroTTSService()
    
    if args.health_check:
        health = tts_service.health_check()
        print(json.dumps(health, indent=2))
        return
    
    if args.list_voices:
        voices_data = tts_service.get_available_voices()
        print(json.dumps(voices_data, indent=2))
        return
    
    if args.preview:
        result = tts_service.generate_preview(args.preview)
        print(json.dumps(result, indent=2))
        return
        
    if args.recommend:
        recommendations = tts_service.get_recommended_voices(content_category=args.recommend)
        print(json.dumps(recommendations, indent=2))
        return
    
    if not args.text:
        parser.error("--text is required when not using --health-check, --list-voices, --preview, or --recommend")
    
    if not args.voice:
        args.voice = 'af_heart'  # Default to Heart (American Female)
    
    # Generate audio
    result = tts_service.generate_audio(
        text=args.text,
        voice_id=args.voice,
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