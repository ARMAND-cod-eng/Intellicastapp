#!/usr/bin/env python3
"""
Kokoro-82M ONLY TTS Service for IntelliCast AI
EXCLUSIVE Kokoro-82M implementation - No fallbacks, no other models
"""

import sys
import os
import json
import argparse
import logging
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

class KokoroOnlyTTSService:
    """EXCLUSIVE Kokoro-82M TTS service - No fallbacks allowed"""
    
    def __init__(self, model_path: Optional[str] = None):
        """Initialize the Kokoro-ONLY TTS service"""
        self.model_path = model_path or "hexgrad/Kokoro-82M"
        self.audio_dir = Path(__file__).parent.parent / "audio"
        self.audio_dir.mkdir(exist_ok=True)
        
        # Initialize voice database
        self.voice_db = KokoroVoiceDatabase()
        self.voices = self.voice_db.get_all_voices()
        
        # Initialize model components
        self.american_model = None
        self.british_model = None
        self.device = "cuda" if self._check_cuda() else "cpu"
        
        logger.info(f"🎙️  Kokoro-82M ONLY TTS Service initialized")
        logger.info(f"📊 {len(self.voices)} Kokoro voices available")
        logger.info(f"🔧 Device: {self.device}")
        logger.info(f"⚠️  NO FALLBACK MODELS - Kokoro-82M ONLY!")

    def _check_cuda(self) -> bool:
        """Check if CUDA is available"""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    def _validate_dependencies(self):
        """Validate that ALL required Kokoro dependencies are available - NO FALLBACKS"""
        try:
            from kokoro import KPipeline
            import soundfile as sf
            import numpy as np
            logger.info("✅ All Kokoro-82M dependencies validated")
            return True
        except ImportError as e:
            logger.error(f"❌ CRITICAL: Kokoro-82M dependencies missing: {str(e)}")
            logger.error("❌ This service requires Kokoro-82M - NO FALLBACKS AVAILABLE")
            raise RuntimeError(f"Kokoro-82M dependencies missing: {str(e)}. This service requires Kokoro-82M.")

    def _load_kokoro_models(self):
        """Load BOTH American and British Kokoro-82M models - REQUIRED"""
        if self.american_model is not None and self.british_model is not None:
            return True  # Already loaded
        
        # Validate dependencies first
        self._validate_dependencies()
        
        try:
            from kokoro import KPipeline
            
            logger.info(f"📥 Loading Kokoro-82M models (REQUIRED)...")
            
            # Load American English model
            logger.info("📥 Loading American English Kokoro-82M...")
            self.american_model = KPipeline('en-us', device=self.device)
            
            # Load British English model
            logger.info("📥 Loading British English Kokoro-82M...")
            self.british_model = KPipeline('en-gb', device=self.device)
            
            logger.info(f"✅ Kokoro-82M models loaded successfully on {self.device}")
            logger.info(f"🇺🇸 American model ready with voices")
            logger.info(f"🇬🇧 British model ready with voices")
            return True
            
        except Exception as e:
            logger.error(f"❌ CRITICAL: Failed to load Kokoro-82M models: {str(e)}")
            logger.error("❌ Cannot proceed without Kokoro-82M - NO FALLBACKS")
            raise RuntimeError(f"Kokoro-82M loading failed: {str(e)}. This service requires Kokoro-82M.")

    def _get_model_for_voice(self, voice_id: str):
        """Get the appropriate Kokoro model (American or British) for the voice"""
        voice_data = self.voice_db.get_voice_by_id(voice_id)
        if not voice_data:
            raise ValueError(f"Voice {voice_id} not found in Kokoro voice database")
        
        accent = voice_data.get('accent', 'american')
        
        if accent == 'british':
            if not self.british_model:
                raise RuntimeError("British Kokoro-82M model not loaded")
            return self.british_model
        else:
            if not self.american_model:
                raise RuntimeError("American Kokoro-82M model not loaded")
            return self.american_model

    def _enhance_text_for_voice(self, text: str, voice_config: Dict) -> str:
        """Enhance text based on Kokoro voice characteristics"""
        import re
        
        enhanced_text = text
        pause_style = voice_config.get('pause_style', 'natural')
        intonation = voice_config.get('intonation', 'conversational')
        tone = voice_config.get('tone', 'neutral')
        characteristics = voice_config.get('characteristics', [])
        
        # Kokoro-specific text enhancement
        if 'dramatic' in characteristics or tone == 'dramatic':
            # Add dramatic pauses for Kokoro
            enhanced_text = re.sub(r'(\!)', r'\1... ', enhanced_text)
            enhanced_text = re.sub(r'(\?)', r'\1.. ', enhanced_text)
        
        if 'authoritative' in characteristics or tone == 'authoritative':
            # Add authoritative emphasis for Kokoro
            enhanced_text = re.sub(r'(\bThis is\b)', r'... \1', enhanced_text, flags=re.IGNORECASE)
            enhanced_text = re.sub(r'(\bImportant\b)', r'... \1 ...', enhanced_text, flags=re.IGNORECASE)
        
        if 'gentle' in characteristics or 'soothing' in characteristics:
            # Add calming pauses for gentle Kokoro voices
            enhanced_text = re.sub(r'(\band\b)', r'\1 ...', enhanced_text, flags=re.IGNORECASE)
            enhanced_text = re.sub(r'(\bso\b)', r'\1 ..', enhanced_text, flags=re.IGNORECASE)
        
        # British accent specific adjustments for British Kokoro models
        accent = voice_config.get('accent', 'american')
        if accent == 'british':
            # British pronunciation adjustments for Kokoro
            enhanced_text = re.sub(r'\bvery\b', 'quite', enhanced_text, flags=re.IGNORECASE)
            enhanced_text = re.sub(r'\bawesome\b', 'brilliant', enhanced_text, flags=re.IGNORECASE)
            enhanced_text = re.sub(r'\belevator\b', 'lift', enhanced_text, flags=re.IGNORECASE)
        
        return enhanced_text

    def _generate_kokoro_audio(self, text: str, voice_id: str, speed: float, output_path: str) -> bool:
        """Generate TTS using Kokoro-82M ONLY - NO FALLBACKS"""
        
        try:
            import soundfile as sf
            import numpy as np
            
            # Load models if not already loaded - REQUIRED
            if not self._load_kokoro_models():
                raise RuntimeError("Kokoro-82M models failed to load")
            
            # Get voice configuration
            voice_config = self.voice_db.get_voice_by_id(voice_id)
            if not voice_config:
                raise ValueError(f"Kokoro voice {voice_id} not found")
            
            # Select appropriate Kokoro model based on accent
            model = self._get_model_for_voice(voice_id)
            
            logger.info(f"🎤 Generating with Kokoro-82M ONLY: {voice_config['display_name']} at {speed}x speed")
            
            # Enhance text for this specific Kokoro voice
            enhanced_text = self._enhance_text_for_voice(text, voice_config)
            
            # Generate audio using Kokoro pipeline with the specific voice
            logger.info(f"🎯 Kokoro-82M generation with voice: {voice_id}")
            audio_generator = model(enhanced_text, voice=voice_id)
            
            # Process audio from Kokoro generator
            audio_segments = []
            sample_rate = 24000  # Kokoro's native sample rate
            
            try:
                # Collect audio segments from Kokoro generator
                # Kokoro returns Result objects with .audio as torch.Tensor
                for result in audio_generator:
                    # Extract audio tensor from Result object
                    audio_tensor = result.audio
                    
                    # Convert torch tensor to numpy array
                    audio_data = audio_tensor.cpu().numpy()
                    
                    # Ensure proper shape (flatten if needed)
                    if len(audio_data.shape) > 1:
                        audio_data = audio_data.flatten()
                    
                    audio_segments.append(audio_data)
                    logger.info(f"   Collected audio segment: shape={audio_data.shape}, length={len(audio_data)}")
                    
            except Exception as gen_error:
                logger.error(f"❌ Kokoro generation failed: {gen_error}")
                raise RuntimeError(f"Kokoro-82M generation error: {gen_error}")
            
            # Concatenate all Kokoro audio segments
            if audio_segments:
                final_audio = np.concatenate(audio_segments) if len(audio_segments) > 1 else audio_segments[0]
            else:
                raise RuntimeError("Kokoro-82M generated empty audio")
            
            # Validate audio
            if len(final_audio) == 0:
                raise RuntimeError("Kokoro-82M generated audio with zero length")
            
            # Apply Kokoro voice-specific speed adjustment
            voice_speed_multiplier = voice_config.get('speed_multiplier', 1.0)
            effective_speed = speed * voice_speed_multiplier
            
            if effective_speed != 1.0:
                target_length = int(len(final_audio) / effective_speed)
                if target_length > 0:
                    indices = np.linspace(0, len(final_audio) - 1, target_length).astype(int)
                    final_audio = final_audio[indices]
            
            # Normalize Kokoro audio to prevent clipping
            max_val = np.max(np.abs(final_audio))
            if max_val > 0:
                final_audio = final_audio / max_val * 0.95
            else:
                logger.warning("Kokoro audio has zero amplitude")
                final_audio = np.zeros_like(final_audio) + 0.001  # Add minimal signal
            
            # Save Kokoro-generated audio
            sf.write(output_path, final_audio, sample_rate)
            
            duration = len(final_audio) / sample_rate
            logger.info(f"✅ Kokoro-82M audio generated: {output_path} ({duration:.2f}s)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Kokoro-82M generation error: {str(e)}")
            logger.error("❌ NO FALLBACKS AVAILABLE - Kokoro-82M ONLY service")
            raise RuntimeError(f"Kokoro-82M generation failed: {str(e)}")

    def get_available_voices(self) -> Dict[str, Any]:
        """Get all available Kokoro voices"""
        return self.voice_db.export_for_frontend()
    
    def get_voice_by_id(self, voice_id: str) -> Dict[str, Any]:
        """Get specific Kokoro voice configuration"""
        return self.voice_db.get_voice_by_id(voice_id)
    
    def get_recommended_voices(self, content_category: str = None, gender: str = None, accent: str = None) -> List[Dict[str, Any]]:
        """Get recommended Kokoro voices based on criteria"""
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
        
        return recommended[:10]

    def generate_audio(self, text: str, voice_id: str = 'af_heart', speed: float = 1.0, 
                      output_file: str = None) -> Dict[str, Any]:
        """Generate audio from text using ONLY Kokoro-82M"""
        
        try:
            # Validate voice exists in Kokoro database
            voice_config = self.get_voice_by_id(voice_id)
            if not voice_config:
                raise ValueError(f'Kokoro voice {voice_id} not found in voice database')
            
            # Generate unique filename if not provided
            if not output_file:
                import uuid
                voice_name = voice_config.get('name', voice_id) or voice_id
                voice_name = voice_name.lower() if voice_name else voice_id.lower()
                output_file = f"kokoro_{voice_name}_{uuid.uuid4().hex[:8]}.wav"
            
            output_path = self.audio_dir / output_file
            
            logger.info(f"🎤 Generating with Kokoro-82M ONLY: {voice_config['display_name']} at {speed}x")
            
            # Generate with Kokoro-82M ONLY - NO FALLBACKS
            success = self._generate_kokoro_audio(text, voice_id, speed, str(output_path))
            
            if not success:
                raise RuntimeError("Kokoro-82M generation failed - NO FALLBACKS AVAILABLE")
            
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
                'model': 'Kokoro-82M-EXCLUSIVE',
                'kokoro_only': True
            }
                
        except Exception as e:
            logger.error(f"❌ Kokoro-82M EXCLUSIVE service error: {str(e)}")
            return {
                'success': False,
                'error': f'Kokoro-82M ONLY service failed: {str(e)}',
                'kokoro_only': True,
                'no_fallbacks': True
            }

    def generate_preview(self, voice_id: str, preview_text: str = None) -> Dict[str, Any]:
        """Generate a Kokoro voice preview"""
        
        voice_config = self.get_voice_by_id(voice_id)
        if not voice_config:
            return {'success': False, 'error': f'Kokoro voice {voice_id} not found'}
        
        if not preview_text:
            # Generate Kokoro-appropriate preview text
            characteristics = voice_config.get('characteristics', [])
            accent = voice_config.get('accent', 'american')
            gender = voice_config.get('gender', 'female')
            name = voice_config.get('name', 'Voice')
            
            if accent == 'british':
                if 'professional' in characteristics:
                    preview_text = f"Good day, I'm {name}, and this is my professional British voice for your podcast content."
                elif 'friendly' in characteristics:
                    preview_text = f"Hello there! I'm {name}, bringing you a friendly British voice for your audio experience."
                elif 'aristocratic' in characteristics:
                    preview_text = f"Good afternoon, I am {name}, presenting a distinguished British voice for your distinguished content."
                else:
                    preview_text = f"Hello, I'm {name}, demonstrating this authentic British {gender} voice."
            else:  # American
                if 'professional' in characteristics:
                    preview_text = f"Hello, I'm {name}, and I'll be your professional American voice for this podcast."
                elif 'energetic' in characteristics:
                    preview_text = f"Hey there! I'm {name}, bringing energy and enthusiasm to your audio content!"
                elif 'authoritative' in characteristics:
                    preview_text = f"Good day. I'm {name}, delivering authoritative and confident narration for your content."
                else:
                    preview_text = f"Hi, I'm {name}, your American {gender} voice for this audio experience."
        
        # Generate Kokoro preview
        return self.generate_audio(
            text=preview_text,
            voice_id=voice_id,
            speed=1.0,
            output_file=f"kokoro_preview_{voice_id}_{hash(preview_text) % 10000}.wav"
        )

    def _get_audio_duration(self, audio_path: str) -> float:
        """Get duration of Kokoro-generated audio file"""
        
        try:
            import subprocess
            import json
            
            if subprocess.run(['which', 'ffprobe'], capture_output=True).returncode == 0:
                cmd = [
                    'ffprobe', '-v', 'quiet', '-print_format', 'json', 
                    '-show_format', audio_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    data = json.loads(result.stdout)
                    return float(data['format']['duration'])
            
            # Fallback: estimate based on file size for Kokoro WAV files
            file_size = os.path.getsize(audio_path)
            # Kokoro WAV: 24kHz sample rate, 16-bit, mono
            estimated_duration = file_size / (24000 * 2)  # 2 bytes per sample
            return estimated_duration
            
        except Exception as e:
            logger.error(f"❌ Duration calculation error: {str(e)}")
            # Very rough fallback
            return len(open(audio_path, 'rb').read()) / 48000

    def health_check(self) -> Dict[str, Any]:
        """Health check for Kokoro-82M ONLY service"""
        
        try:
            # Validate dependencies
            self._validate_dependencies()
            
            # Load models
            models_loaded = self._load_kokoro_models()
            
            if not models_loaded:
                return {
                    'status': 'unhealthy',
                    'error': 'Kokoro-82M models failed to load',
                    'kokoro_only': True,
                    'no_fallbacks': True
                }
            
            # Test generation with representative voices
            test_voices = ['af_heart', 'am_adam', 'bf_heart', 'bm_adam']
            test_results = {}
            
            for voice_id in test_voices[:2]:  # Test first 2 to avoid long startup
                try:
                    test_result = self.generate_audio(
                        "Kokoro test generation.", 
                        voice_id=voice_id, 
                        speed=1.0,
                        output_file=f"kokoro_health_{voice_id}.wav"
                    )
                    test_results[voice_id] = test_result['success']
                except:
                    test_results[voice_id] = False
            
            # Summary
            voice_summary = self.voice_db.get_voice_summary()
            all_tests_passed = all(test_results.values())
            
            return {
                'status': 'healthy' if all_tests_passed else 'partial',
                'kokoro_only': True,
                'no_fallbacks': True,
                'models_loaded': {
                    'american': self.american_model is not None,
                    'british': self.british_model is not None
                },
                'voice_database': voice_summary,
                'test_results': test_results,
                'device': self.device,
                'audio_directory': str(self.audio_dir),
                'exclusive_kokoro': True
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': f'Kokoro-82M EXCLUSIVE service error: {str(e)}',
                'kokoro_only': True,
                'no_fallbacks': True
            }

def main():
    """CLI interface for Kokoro-82M ONLY TTS service"""
    
    parser = argparse.ArgumentParser(description='Kokoro-82M EXCLUSIVE TTS Service')
    parser.add_argument('--text', help='Text to convert to speech with Kokoro-82M')
    parser.add_argument('--voice', help='Kokoro voice ID to use (see --list-voices)')
    parser.add_argument('--speed', type=float, default=1.0, help='Speech speed (0.5 - 2.0)')
    parser.add_argument('--output', help='Output file path')
    parser.add_argument('--health-check', action='store_true', help='Run Kokoro health check')
    parser.add_argument('--list-voices', action='store_true', help='List all Kokoro voices')
    parser.add_argument('--preview', help='Generate Kokoro preview for specific voice ID')
    parser.add_argument('--recommend', help='Get Kokoro voice recommendations for category')
    
    args = parser.parse_args()
    
    # Initialize Kokoro-ONLY service
    tts_service = KokoroOnlyTTSService()
    
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
        args.voice = 'af_heart'  # Default Kokoro voice
    
    # Generate audio with Kokoro-82M ONLY
    result = tts_service.generate_audio(
        text=args.text,
        voice_id=args.voice,
        speed=args.speed,
        output_file=args.output
    )
    
    print(json.dumps(result, indent=2))
    
    if result['success']:
        logger.info(f"🎉 Kokoro-82M audio generated: {result['file_path']}")
        sys.exit(0)
    else:
        logger.error(f"❌ Kokoro-82M generation failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)

if __name__ == "__main__":
    main()