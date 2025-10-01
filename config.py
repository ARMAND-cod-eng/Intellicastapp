"""
Configuration management for IntelliCast AI Podcast Generation
Loads environment variables and provides safe defaults
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional
import sys

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)


class Config:
    """Central configuration class for podcast generation"""

    # Together AI Configuration
    TOGETHER_API_KEY: Optional[str] = os.getenv('TOGETHER_API_KEY')
    TOGETHER_API_URL: str = os.getenv('TOGETHER_API_URL', 'https://api.together.xyz/v1')
    TOGETHER_TEXT_MODEL: str = os.getenv('TOGETHER_TEXT_MODEL', 'meta-llama/Llama-3-70b-chat-hf')
    TOGETHER_CONVERSATION_MODEL: str = os.getenv('TOGETHER_CONVERSATION_MODEL', 'meta-llama/Llama-3-70b-chat-hf')
    TOGETHER_TIMEOUT: int = int(os.getenv('TOGETHER_TIMEOUT', '120'))
    TOGETHER_MAX_TOKENS: int = int(os.getenv('TOGETHER_MAX_TOKENS', '4096'))
    TOGETHER_TEMPERATURE: float = float(os.getenv('TOGETHER_TEMPERATURE', '0.7'))

    # Cartesia AI Voice Configuration
    CARTESIA_API_KEY: Optional[str] = os.getenv('CARTESIA_API_KEY')
    CARTESIA_API_URL: str = os.getenv('CARTESIA_API_URL', 'https://api.cartesia.ai')

    # Voice Model Settings
    PODCAST_VOICE_MODEL: str = os.getenv('PODCAST_VOICE_MODEL', 'cartesia-sonic')
    PODCAST_VOICE_ENGINE: str = os.getenv('PODCAST_VOICE_ENGINE', 'cartesia')

    # Podcast Generation Settings
    PODCAST_DEFAULT_SPEAKERS: int = int(os.getenv('PODCAST_DEFAULT_SPEAKERS', '2'))
    PODCAST_DEFAULT_STYLE: str = os.getenv('PODCAST_DEFAULT_STYLE', 'conversational')
    PODCAST_DEFAULT_TONE: str = os.getenv('PODCAST_DEFAULT_TONE', 'friendly')
    PODCAST_MAX_DURATION: int = int(os.getenv('PODCAST_MAX_DURATION', '600'))
    PODCAST_ENABLE_INTERRUPTIONS: bool = os.getenv('PODCAST_ENABLE_INTERRUPTIONS', 'true').lower() == 'true'
    PODCAST_ENABLE_EMOTIONS: bool = os.getenv('PODCAST_ENABLE_EMOTIONS', 'true').lower() == 'true'

    # Conversation Turn Settings
    PODCAST_TURNS_PER_SPEAKER: int = int(os.getenv('PODCAST_TURNS_PER_SPEAKER', '5'))
    PODCAST_MIN_WORDS_PER_TURN: int = int(os.getenv('PODCAST_MIN_WORDS_PER_TURN', '30'))
    PODCAST_MAX_WORDS_PER_TURN: int = int(os.getenv('PODCAST_MAX_WORDS_PER_TURN', '100'))

    # File Paths
    UPLOAD_PATH: Path = Path(os.getenv('UPLOAD_PATH', './backend/uploads'))
    AUDIO_STORAGE_PATH: Path = Path(os.getenv('NEWS_AUDIO_STORAGE_PATH', './backend/audio/news'))
    PODCAST_AUDIO_PATH: Path = Path('./backend/audio/podcasts')

    # Database
    DATABASE_PATH: str = os.getenv('DATABASE_PATH', './backend/database.db')

    # Server Settings
    PORT: int = int(os.getenv('PORT', '3004'))
    NODE_ENV: str = os.getenv('NODE_ENV', 'development')

    @classmethod
    def validate_credentials(cls) -> dict:
        """
        Validate that required API credentials are present
        Returns dict with status and missing credentials
        """
        missing = []
        warnings = []

        if not cls.TOGETHER_API_KEY or cls.TOGETHER_API_KEY == 'your_together_ai_api_key_here':
            missing.append('TOGETHER_API_KEY')

        if not cls.CARTESIA_API_KEY:
            warnings.append('CARTESIA_API_KEY (voice generation will not work)')

        return {
            'valid': len(missing) == 0,
            'missing': missing,
            'warnings': warnings
        }

    @classmethod
    def get_together_headers(cls) -> dict:
        """Get headers for Together AI API requests"""
        if not cls.TOGETHER_API_KEY:
            raise ValueError("TOGETHER_API_KEY not configured. Please set it in .env file")

        return {
            'Authorization': f'Bearer {cls.TOGETHER_API_KEY}',
            'Content-Type': 'application/json'
        }

    @classmethod
    def get_cartesia_headers(cls) -> dict:
        """Get headers for Cartesia AI API requests"""
        if not cls.CARTESIA_API_KEY:
            raise ValueError("CARTESIA_API_KEY not configured. Please set it in .env file")

        return {
            'X-API-Key': cls.CARTESIA_API_KEY,
            'Content-Type': 'application/json'
        }

    @classmethod
    def ensure_directories(cls):
        """Create required directories if they don't exist"""
        cls.UPLOAD_PATH.mkdir(parents=True, exist_ok=True)
        cls.AUDIO_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
        cls.PODCAST_AUDIO_PATH.mkdir(parents=True, exist_ok=True)

    @classmethod
    def print_config_status(cls):
        """Print configuration status for debugging"""
        validation = cls.validate_credentials()

        print("=" * 60)
        print("IntelliCast AI - Configuration Status")
        print("=" * 60)

        if validation['valid']:
            print("✓ All required credentials configured")
        else:
            print("✗ Missing required credentials:")
            for cred in validation['missing']:
                print(f"  - {cred}")

        if validation['warnings']:
            print("\n⚠ Warnings:")
            for warning in validation['warnings']:
                print(f"  - {warning}")

        print(f"\nText Model: {cls.TOGETHER_TEXT_MODEL}")
        print(f"Voice Model: {cls.PODCAST_VOICE_MODEL}")
        print(f"Default Speakers: {cls.PODCAST_DEFAULT_SPEAKERS}")
        print(f"Max Duration: {cls.PODCAST_MAX_DURATION}s")
        print("=" * 60)


# Create an instance for easy importing
config = Config()


def init_config():
    """Initialize configuration and validate setup"""
    config.ensure_directories()
    validation = config.validate_credentials()

    if not validation['valid']:
        print("\n" + "=" * 60, file=sys.stderr)
        print("ERROR: Missing required configuration", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print("\nPlease configure the following in your .env file:", file=sys.stderr)
        for cred in validation['missing']:
            print(f"  - {cred}", file=sys.stderr)
        print("\nSee .env for configuration template", file=sys.stderr)
        print("=" * 60 + "\n", file=sys.stderr)
        return False

    return True


if __name__ == "__main__":
    # When run directly, print config status
    config.print_config_status()
