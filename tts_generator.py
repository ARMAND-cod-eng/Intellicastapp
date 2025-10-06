"""
Cartesia Sonic TTS Generator for Podcast Audio
Generates high-quality podcast audio with voice switching and natural pacing
"""

import os
import io
import wave
import struct
import requests
from pathlib import Path
from typing import List, Dict, Optional, Literal, Tuple
from dataclasses import dataclass
from pydub import AudioSegment
from pydub.effects import normalize
from dotenv import load_dotenv
from usage_tracker import get_tracker

load_dotenv()


@dataclass
class VoiceConfig:
    """Voice configuration for a speaker"""
    id: str
    name: str
    gender: str
    description: str
    speed: float = 1.0
    emotion: List[str] = None


class CartesiaTTSGenerator:
    """
    Generates podcast audio using Cartesia Sonic TTS
    Handles voice switching, pauses, and audio combination
    """

    # Verified Cartesia voice IDs (from your working implementation)
    VOICE_PRESETS = {
        # Male voices (good for host)
        "host_male_friendly": VoiceConfig(
            id="694f9389-aac1-45b6-b726-9d9369183238",
            name="Confident Male",
            gender="male",
            description="Warm, friendly male host voice",
            speed=1.0
        ),
        "host_male_casual": VoiceConfig(
            id="a167e0f3-df7e-4d94-8583-1647c5dcf15a",
            name="Casual Male",
            gender="male",
            description="Relaxed, conversational male voice",
            speed=0.95
        ),

        # Female voices (good for guest/expert)
        "guest_female_expert": VoiceConfig(
            id="a0e99841-438c-4a64-b679-ae501e7d6091",
            name="Professional Female",
            gender="female",
            description="Clear, authoritative female voice",
            speed=1.0
        ),
        "guest_female_warm": VoiceConfig(
            id="79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e",
            name="Warm Female",
            gender="female",
            description="Friendly, engaging female voice",
            speed=1.0
        ),

        # Alternative combinations
        "host_female": VoiceConfig(
            id="79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e",
            name="Female Host",
            gender="female",
            description="Warm female host",
            speed=1.0
        ),
        "guest_male": VoiceConfig(
            id="694f9389-aac1-45b6-b726-9d9369183238",
            name="Male Guest",
            gender="male",
            description="Knowledgeable male expert",
            speed=1.0
        ),

        # Co-Host voices (distinct from host/guest)
        "cohost_male_casual": VoiceConfig(
            id="b7d50908-b17c-442d-ad8d-810c63997ed9",
            name="Casual Male Co-Host",
            gender="male",
            description="Relaxed, friendly male co-host",
            speed=0.98
        ),
        "cohost_female_casual": VoiceConfig(
            id="63ff761f-c1e8-414b-b969-d1833d1c870c",
            name="Casual Female Co-Host",
            gender="female",
            description="Warm, engaging female co-host",
            speed=0.98
        ),
        "cohost_male_energetic": VoiceConfig(
            id="41534e16-2966-4c6b-9670-111411def906",
            name="Energetic Male Co-Host",
            gender="male",
            description="Dynamic, enthusiastic male voice",
            speed=1.05
        ),
        "cohost_female_warm": VoiceConfig(
            id="2ee87190-8f84-4925-97da-e52547f9462c",
            name="Warm Female Co-Host",
            gender="female",
            description="Gentle, warm female voice",
            speed=0.95
        )
    }

    # Audio settings
    SAMPLE_RATE = 44100
    CHANNELS = 1
    SAMPLE_WIDTH = 2

    # Pause durations (milliseconds)
    PAUSE_BETWEEN_TURNS = 800  # Pause between different speakers
    PAUSE_SAME_SPEAKER = 400   # Pause when same speaker continues
    PAUSE_AFTER_QUESTION = 500  # Additional pause after questions
    PAUSE_INTRO_OUTRO = 1200   # Longer pause for intro/outro

    def _resolve_voice(self, voice_input: str, role: str = "Speaker") -> VoiceConfig:
        """
        Resolve voice input to VoiceConfig - supports both Cartesia IDs and preset names

        Args:
            voice_input: Either a Cartesia voice ID (UUID format) or preset name
            role: Speaker role for display (Host, Guest, Co-Host)

        Returns:
            VoiceConfig object
        """
        # Check if it's a Cartesia UUID (format: 8-4-4-4-12 hex characters)
        import re
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

        if re.match(uuid_pattern, voice_input, re.IGNORECASE):
            # It's a raw Cartesia ID - create dynamic VoiceConfig
            print(f"[VOICE] Using Cartesia ID for {role}: {voice_input}")
            return VoiceConfig(
                id=voice_input,
                name=f"Custom {role} Voice",
                gender="neutral",
                description=f"Custom Cartesia voice for {role}",
                speed=1.0
            )
        else:
            # It's a preset name - look up in VOICE_PRESETS
            preset_config = self.VOICE_PRESETS.get(voice_input)
            if preset_config:
                print(f"[VOICE] Using preset for {role}: {preset_config.name}")
                return preset_config
            else:
                # Fallback to default based on role
                print(f"[VOICE] Warning: Unknown voice '{voice_input}', using default for {role}")
                if role.lower() == "host":
                    return self.VOICE_PRESETS["host_male_friendly"]
                elif role.lower() == "guest":
                    return self.VOICE_PRESETS["guest_female_expert"]
                else:
                    return self.VOICE_PRESETS["cohost_male_casual"]

    def __init__(
        self,
        api_key: Optional[str] = None,
        host_voice: str = "host_male_friendly",
        guest_voice: str = "guest_female_expert",
        cohost_voice: Optional[str] = None,
        moderator_voice: Optional[str] = None
    ):
        """
        Initialize Cartesia TTS generator

        Args:
            api_key: Cartesia API key (defaults to env var)
            host_voice: Voice preset name OR Cartesia voice ID (UUID)
            guest_voice: Voice preset name OR Cartesia voice ID (UUID)
            cohost_voice: Optional voice preset name OR Cartesia voice ID (UUID) for 3rd speaker
            moderator_voice: Optional voice preset name OR Cartesia voice ID (UUID) for 4th speaker
        """
        self.api_key = api_key or os.getenv('CARTESIA_API_KEY')
        if not self.api_key:
            raise ValueError("CARTESIA_API_KEY not found in environment")

        self.api_url = os.getenv('CARTESIA_API_URL', 'https://api.cartesia.ai')
        self.tracker = get_tracker()

        # Set voice configuration - now supports both preset names and Cartesia IDs
        self.voices = {
            "host": self._resolve_voice(host_voice, "Host"),
            "guest": self._resolve_voice(guest_voice, "Guest")
        }

        # Add cohost if provided
        if cohost_voice:
            self.voices["cohost"] = self._resolve_voice(cohost_voice, "Co-Host")

        # Add moderator if provided (4-speaker mode)
        if moderator_voice:
            self.voices["moderator"] = self._resolve_voice(moderator_voice, "Moderator")

        print(f"[VOICE] Configured voices:")
        print(f"   Host: {self.voices['host'].name} (ID: {self.voices['host'].id})")
        print(f"   Guest: {self.voices['guest'].name} (ID: {self.voices['guest'].id})")
        if cohost_voice:
            print(f"   Co-Host: {self.voices['cohost'].name} (ID: {self.voices['cohost'].id})")
        if moderator_voice:
            print(f"   Moderator: {self.voices['moderator'].name} (ID: {self.voices['moderator'].id})")

    def generate_speech(
        self,
        text: str,
        voice_config: VoiceConfig,
        speed: Optional[float] = None,
        emotion: Optional[List[str]] = None
    ) -> bytes:
        """
        Generate speech for a single text segment using Cartesia API

        Args:
            text: Text to synthesize
            voice_config: Voice configuration to use
            speed: Optional speed override (0.5 to 2.0)
            emotion: Optional emotion tags

        Returns:
            Audio bytes in WAV format
        """
        # Prepare request
        url = f"{self.api_url}/tts/bytes"

        # Determine speed string
        speed_value = speed if speed is not None else voice_config.speed
        if speed_value >= 1.1:
            speed_str = "fast"
        elif speed_value <= 0.9:
            speed_str = "slow"
        else:
            speed_str = "normal"

        # Debug: Log voice ID being sent to Cartesia
        print(f"[TTS DEBUG] Sending to Cartesia API:")
        print(f"   Voice ID: {voice_config.id}")
        print(f"   Voice Name: {voice_config.name}")

        payload = {
            "model_id": "sonic-2",
            "transcript": text,
            "voice": {
                "mode": "id",
                "id": voice_config.id
            },
            "output_format": {
                "container": "wav",
                "encoding": "pcm_s16le",
                "sample_rate": self.SAMPLE_RATE
            },
            "language": "en",
            "speed": speed_str
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Cartesia-Version": "2025-04-16",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)

            if not response.ok:
                error_text = response.text
                raise RuntimeError(f"Cartesia API error {response.status_code}: {error_text}")

            # Track usage
            char_count = len(text)
            self.tracker.track_generation(
                service='tts',
                model='cartesia-sonic',
                characters_generated=char_count,
                operation='podcast_tts_generation',
                metadata={
                    'voice_id': voice_config.id,
                    'voice_name': voice_config.name
                }
            )

            return response.content

        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Cartesia TTS API error: {e}")

    def create_pause(self, duration_ms: int) -> AudioSegment:
        """
        Create a silent pause of specified duration

        Args:
            duration_ms: Duration in milliseconds

        Returns:
            Silent AudioSegment
        """
        # Create silence with matching sample width and channels
        silence = AudioSegment.silent(
            duration=duration_ms,
            frame_rate=self.SAMPLE_RATE
        )
        # Ensure it matches our audio format
        silence = silence.set_channels(self.CHANNELS)
        silence = silence.set_sample_width(self.SAMPLE_WIDTH)
        return silence

    def generate_podcast_audio(
        self,
        dialogue: List[Dict[str, str]],
        add_pauses: bool = True,
        normalize_audio: bool = True,
        speed_adjustments: Optional[Dict[str, float]] = None
    ) -> AudioSegment:
        """
        Generate complete podcast audio from dialogue

        Args:
            dialogue: List of dialogue turns with 'speaker' and 'text' keys
            add_pauses: Whether to add pauses between turns
            normalize_audio: Whether to normalize audio levels
            speed_adjustments: Optional speed overrides per speaker

        Returns:
            Complete podcast as AudioSegment
        """
        print(f"\n[AUDIO] Generating podcast audio with {len(dialogue)} segments...")

        audio_segments = []
        previous_speaker = None

        for i, turn in enumerate(dialogue, 1):
            speaker = turn.get('speaker', 'host')
            text = turn.get('text', '')
            segment_type = turn.get('segment_type', 'dialogue')

            if not text.strip():
                continue

            print(f"  [{i}/{len(dialogue)}] {speaker.upper()}: {text[:60]}...")

            # Get voice configuration
            voice_config = self.voices.get(speaker, self.voices['host'])
            print(f"     -> Using voice: {voice_config.name} (ID: {voice_config.id})")

            # Get speed (with optional override)
            speed = None
            if speed_adjustments and speaker in speed_adjustments:
                speed = speed_adjustments[speaker]

            # Generate speech
            try:
                audio_bytes = self.generate_speech(text, voice_config, speed=speed)
                audio_segment = AudioSegment.from_wav(io.BytesIO(audio_bytes))

                # Ensure consistent format
                audio_segment = audio_segment.set_frame_rate(self.SAMPLE_RATE)
                audio_segment = audio_segment.set_channels(self.CHANNELS)
                audio_segment = audio_segment.set_sample_width(self.SAMPLE_WIDTH)

                # Add pause before this segment (if enabled)
                if add_pauses and i > 1:
                    if segment_type == 'intro':
                        pause = self.create_pause(self.PAUSE_INTRO_OUTRO)
                    elif segment_type == 'outro':
                        pause = self.create_pause(self.PAUSE_INTRO_OUTRO)
                    elif speaker != previous_speaker:
                        pause = self.create_pause(self.PAUSE_BETWEEN_TURNS)
                    elif text.rstrip().endswith('?'):
                        pause = self.create_pause(self.PAUSE_AFTER_QUESTION)
                    else:
                        pause = self.create_pause(self.PAUSE_SAME_SPEAKER)

                    audio_segments.append(pause)

                audio_segments.append(audio_segment)
                previous_speaker = speaker

            except Exception as e:
                print(f"  [ERROR] Failed to generate segment {i}: {e}")
                continue

        if not audio_segments:
            raise RuntimeError("No audio segments were generated successfully")

        # Combine all segments
        print(f"\n[COMBINE] Combining {len(audio_segments)} audio segments...")

        # Start with first segment
        combined_audio = audio_segments[0]

        # Append remaining segments one by one
        for segment in audio_segments[1:]:
            combined_audio = combined_audio + segment

        # Ensure final audio has correct format
        combined_audio = combined_audio.set_frame_rate(self.SAMPLE_RATE)
        combined_audio = combined_audio.set_channels(self.CHANNELS)
        combined_audio = combined_audio.set_sample_width(self.SAMPLE_WIDTH)

        # Normalize if requested (with headroom to prevent clipping)
        if normalize_audio:
            print("[NORMALIZE] Normalizing audio levels...")
            # Apply gentle volume boost if audio is too quiet
            # Only boost if peak is below -6dB
            if combined_audio.max_dBFS < -6:
                target_dBFS = -3.0
                gain_needed = target_dBFS - combined_audio.max_dBFS
                combined_audio = combined_audio.apply_gain(gain_needed)

        duration_seconds = len(combined_audio) / 1000
        print(f"[OK] Generated {duration_seconds:.1f}s of podcast audio")

        return combined_audio

    def save_audio(
        self,
        audio: AudioSegment,
        output_path: str,
        format: Literal["wav", "mp3", "ogg"] = "wav",
        bitrate: str = "192k"
    ) -> str:
        """
        Save audio to file in specified format

        Args:
            audio: AudioSegment to save
            output_path: Output file path
            format: Audio format (wav, mp3, ogg)
            bitrate: Bitrate for compressed formats

        Returns:
            Path to saved file
        """
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Ensure correct extension
        output_file = output_file.with_suffix(f".{format}")

        print(f"\n[SAVE] Saving audio to {output_file}...")

        if format == "mp3":
            audio.export(output_file, format="mp3", bitrate=bitrate)
        elif format == "ogg":
            audio.export(output_file, format="ogg", bitrate=bitrate)
        else:
            audio.export(output_file, format="wav")

        file_size_mb = output_file.stat().st_size / (1024 * 1024)
        print(f"[OK] Saved {file_size_mb:.2f} MB to {output_file}")

        return str(output_file)

    def generate_and_save(
        self,
        dialogue: List[Dict[str, str]],
        output_path: str,
        format: Literal["wav", "mp3", "ogg"] = "wav",
        **kwargs
    ) -> Tuple[str, Dict]:
        """
        Generate podcast audio and save to file (convenience method)

        Args:
            dialogue: Dialogue turns
            output_path: Output file path
            format: Output format
            **kwargs: Additional arguments for generate_podcast_audio

        Returns:
            Tuple of (file_path, metadata)
        """
        # Generate audio
        audio = self.generate_podcast_audio(dialogue, **kwargs)

        # Save to file
        file_path = self.save_audio(audio, output_path, format=format)

        # Create metadata
        metadata = {
            'duration_seconds': len(audio) / 1000,
            'format': format,
            'sample_rate': audio.frame_rate,
            'channels': audio.channels,
            'file_size_bytes': Path(file_path).stat().st_size,
            'num_segments': len(dialogue),
            'voices': {
                'host': self.voices['host'].name,
                'guest': self.voices['guest'].name
            }
        }

        return file_path, metadata

    def get_available_voices(self) -> List[Dict]:
        """
        Get list of available voice presets

        Returns:
            List of voice preset information
        """
        voices = []
        for key, config in self.VOICE_PRESETS.items():
            voices.append({
                'preset_name': key,
                'display_name': config.name,
                'gender': config.gender,
                'description': config.description,
                'voice_id': config.id
            })
        return voices


class TogetherTTSGenerator:
    """
    Wrapper class for compatibility with Together AI naming
    Uses Cartesia under the hood (the actual TTS provider)
    """

    def __init__(self, api_key: Optional[str] = None, **kwargs):
        """Initialize using Cartesia (Together doesn't have native TTS)"""
        # Use Cartesia API key
        cartesia_key = api_key or os.getenv('CARTESIA_API_KEY')
        self.generator = CartesiaTTSGenerator(api_key=cartesia_key, **kwargs)

    def generate_podcast_audio(self, dialogue: List[Dict[str, str]], **kwargs) -> AudioSegment:
        """Generate podcast audio"""
        return self.generator.generate_podcast_audio(dialogue, **kwargs)

    def save_audio(self, audio: AudioSegment, output_path: str, **kwargs) -> str:
        """Save audio to file"""
        return self.generator.save_audio(audio, output_path, **kwargs)

    def generate_and_save(self, dialogue: List[Dict[str, str]], output_path: str, **kwargs) -> Tuple[str, Dict]:
        """Generate and save in one step"""
        return self.generator.generate_and_save(dialogue, output_path, **kwargs)


def main():
    """Test the TTS generator"""

    # Sample dialogue
    sample_dialogue = [
        {
            "speaker": "host",
            "text": "Welcome to today's episode! We're diving into something really fascinating - the science of sleep and how it affects our memory.",
            "segment_type": "intro"
        },
        {
            "speaker": "guest",
            "text": "Thanks for having me! You know, I've spent years researching this, and I have to say, what we've learned about sleep and memory in the last decade is just mind-blowing."
        },
        {
            "speaker": "host",
            "text": "So what's happening in our brains when we sleep? I mean, it's not just rest, right?"
        },
        {
            "speaker": "guest",
            "text": "Exactly! Think of sleep as your brain's maintenance mode. During deep sleep, your brain is actually replaying the day's experiences, strengthening the important memories and pruning away the less relevant ones. It's like a gardener tending to a garden."
        },
        {
            "speaker": "host",
            "text": "That's such a great analogy! So it's not just storing memories, it's actively curating them?"
        },
        {
            "speaker": "guest",
            "text": "Precisely. And here's where it gets really interesting - the hippocampus, which is like your brain's save button, is transferring these temporary memories to the cortex for long-term storage. This happens during specific sleep stages."
        },
        {
            "speaker": "host",
            "text": "Wow. So what happens when we don't get enough sleep?"
        },
        {
            "speaker": "guest",
            "text": "Well, even moderate sleep loss can seriously impair memory formation, decision-making, and emotional regulation. Your brain simply can't do its maintenance work without adequate sleep. It's like trying to run a computer that never gets to defragment its hard drive."
        },
        {
            "speaker": "host",
            "text": "That really puts those all-nighters in perspective! Thanks for breaking this down so clearly.",
            "segment_type": "outro"
        }
    ]

    print("="*70)
    print("Cartesia TTS Generator - Test")
    print("="*70)

    # Initialize generator
    tts = CartesiaTTSGenerator(
        host_voice="host_male_friendly",
        guest_voice="guest_female_expert"
    )

    # Show available voices
    print("\nAvailable voice presets:")
    for voice in tts.get_available_voices():
        print(f"  - {voice['preset_name']}: {voice['display_name']} ({voice['description']})")

    # Generate podcast
    try:
        output_dir = Path(__file__).parent / "backend/audio/test"
        output_path = output_dir / "test_podcast.wav"

        file_path, metadata = tts.generate_and_save(
            dialogue=sample_dialogue,
            output_path=str(output_path),
            format="wav",
            add_pauses=True,
            normalize_audio=True
        )

        print(f"\n{'='*70}")
        print("PODCAST GENERATION COMPLETE")
        print(f"{'='*70}\n")
        print(f"File: {file_path}")
        print(f"Duration: {metadata['duration_seconds']:.1f}s")
        print(f"Size: {metadata['file_size_bytes'] / (1024*1024):.2f} MB")
        print(f"Segments: {metadata['num_segments']}")
        print(f"Voices: Host={metadata['voices']['host']}, Guest={metadata['voices']['guest']}")

        # Also save as MP3
        mp3_path = output_dir / "test_podcast.mp3"
        audio = tts.generate_podcast_audio(sample_dialogue, add_pauses=True)
        tts.save_audio(audio, str(mp3_path), format="mp3", bitrate="192k")

        print(f"\n[OK] Also saved MP3 version: {mp3_path}")

    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()

    print(f"\n{'='*70}\n")


if __name__ == "__main__":
    main()
