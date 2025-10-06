"""
Together AI Development Environment Setup
Checks Python version, installs dependencies, and verifies API connectivity
"""

import sys
import os
import subprocess
import importlib
from pathlib import Path
from typing import Tuple, List, Optional


class SetupValidator:
    """Validates and sets up the Together AI development environment"""

    MIN_PYTHON_VERSION = (3, 8)
    REQUIRED_PACKAGES = [
        'python-dotenv',
        'requests',
        'together',
        'cartesia',
        'pydantic',
        'tiktoken',
        'pydub',
        'soundfile',
        'numpy',
        'ffmpeg-python',
        'colorama',
        'rich'
    ]

    def __init__(self):
        self.errors = []
        self.warnings = []
        self.success_messages = []

    def print_header(self, text: str):
        """Print formatted header"""
        print("\n" + "=" * 70)
        print(f"  {text}")
        print("=" * 70)

    def print_status(self, status: str, message: str):
        """Print status message with icon"""
        icons = {
            'success': '[OK]',
            'error': '[X]',
            'warning': '[!]',
            'info': '[i]'
        }
        icon = icons.get(status, '•')
        print(f"{icon} {message}")

    def check_python_version(self) -> bool:
        """Check if Python version meets minimum requirements"""
        self.print_header("Checking Python Version")

        current_version = sys.version_info[:2]
        required = self.MIN_PYTHON_VERSION

        print(f"Current Python version: {sys.version}")

        if current_version >= required:
            self.print_status('success',
                            f"Python {current_version[0]}.{current_version[1]} meets minimum requirement ({required[0]}.{required[1]}+)")
            return True
        else:
            self.print_status('error',
                            f"Python {required[0]}.{required[1]}+ required, found {current_version[0]}.{current_version[1]}")
            self.errors.append(f"Python version too old: {current_version[0]}.{current_version[1]}")
            return False

    def check_gpu_availability(self) -> bool:
        """Check if GPU is available (optional)"""
        self.print_header("Checking GPU Availability (Optional)")

        try:
            import torch
            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name(0)
                self.print_status('success', f"GPU detected: {gpu_name}")
                return True
            else:
                self.print_status('warning', "No GPU detected - will use CPU (slower)")
                self.warnings.append("No GPU available")
                return False
        except ImportError:
            self.print_status('info', "PyTorch not installed - GPU check skipped")
            return False

    def install_requirements(self) -> bool:
        """Install required packages from requirements.txt"""
        self.print_header("Installing Required Packages")

        requirements_file = Path(__file__).parent / 'requirements.txt'

        if not requirements_file.exists():
            self.print_status('error', f"requirements.txt not found at {requirements_file}")
            self.errors.append("requirements.txt missing")
            return False

        print(f"Installing from: {requirements_file}")
        print("This may take a few minutes...\n")

        try:
            result = subprocess.run(
                [sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode == 0:
                self.print_status('success', "All packages installed successfully")
                return True
            else:
                self.print_status('error', "Package installation failed")
                print(f"\nError output:\n{result.stderr}")
                self.errors.append("pip install failed")
                return False

        except subprocess.TimeoutExpired:
            self.print_status('error', "Installation timed out after 5 minutes")
            self.errors.append("Installation timeout")
            return False
        except Exception as e:
            self.print_status('error', f"Installation error: {e}")
            self.errors.append(f"Installation exception: {e}")
            return False

    def verify_package_imports(self) -> bool:
        """Verify that all required packages can be imported"""
        self.print_header("Verifying Package Imports")

        all_success = True
        for package in self.REQUIRED_PACKAGES:
            # Handle package name vs import name differences
            import_name = package.replace('-', '_')
            if package == 'python-dotenv':
                import_name = 'dotenv'
            elif package == 'ffmpeg-python':
                import_name = 'ffmpeg'

            try:
                importlib.import_module(import_name)
                self.print_status('success', f"{package}")
            except ImportError as e:
                self.print_status('error', f"{package} - Import failed: {e}")
                self.errors.append(f"Cannot import {package}")
                all_success = False

        return all_success

    def check_ffmpeg(self) -> bool:
        """Check if ffmpeg is installed (required for audio processing)"""
        self.print_header("Checking FFmpeg Installation")

        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                version_line = result.stdout.split('\n')[0]
                self.print_status('success', f"FFmpeg installed: {version_line}")
                return True
            else:
                self.print_status('error', "FFmpeg not found")
                self.errors.append("FFmpeg not installed")
                return False

        except FileNotFoundError:
            self.print_status('error', "FFmpeg not found in system PATH")
            print("\nTo install FFmpeg:")
            print("  Windows: Download from https://ffmpeg.org/download.html")
            print("  macOS: brew install ffmpeg")
            print("  Linux: sudo apt-get install ffmpeg")
            self.errors.append("FFmpeg not installed")
            return False
        except Exception as e:
            self.print_status('warning', f"Could not verify FFmpeg: {e}")
            self.warnings.append("FFmpeg verification failed")
            return False

    def check_env_file(self) -> bool:
        """Check if .env file exists and has required keys"""
        self.print_header("Checking Environment Configuration")

        env_file = Path(__file__).parent / '.env'

        if not env_file.exists():
            self.print_status('error', ".env file not found")
            self.errors.append(".env file missing")
            return False

        # Load and check for required keys
        required_keys = ['TOGETHER_API_KEY', 'CARTESIA_API_KEY']
        missing_keys = []

        with open(env_file, 'r') as f:
            env_content = f.read()

        for key in required_keys:
            if key not in env_content:
                missing_keys.append(key)
            elif f'{key}=your_' in env_content or f'{key}=' in env_content.replace(f'{key}=\n', ''):
                # Key exists but has placeholder value
                self.print_status('warning', f"{key} is set to placeholder value")
                self.warnings.append(f"{key} needs to be configured")

        if missing_keys:
            for key in missing_keys:
                self.print_status('error', f"Missing required key: {key}")
            self.errors.append("Missing API keys in .env")
            return False

        self.print_status('success', ".env file configured")
        return True

    def create_required_directories(self) -> bool:
        """Create required directories for the application"""
        self.print_header("Creating Required Directories")

        directories = [
            'backend/audio/podcasts',
            'backend/uploads',
            'backend/usage_logs',
            'backend/cache',
            'logs'
        ]

        base_path = Path(__file__).parent
        all_success = True

        for dir_path in directories:
            full_path = base_path / dir_path
            try:
                full_path.mkdir(parents=True, exist_ok=True)
                self.print_status('success', f"Created/verified: {dir_path}")
            except Exception as e:
                self.print_status('error', f"Failed to create {dir_path}: {e}")
                self.errors.append(f"Cannot create directory: {dir_path}")
                all_success = False

        return all_success

    def test_api_connectivity(self) -> bool:
        """Test basic API connectivity"""
        self.print_header("Testing API Connectivity")

        try:
            from dotenv import load_dotenv
            load_dotenv()

            # Test Together AI
            together_key = os.getenv('TOGETHER_API_KEY')
            if together_key and together_key != 'your_together_ai_api_key_here':
                try:
                    import requests
                    response = requests.get(
                        'https://api.together.xyz/v1/models',
                        headers={'Authorization': f'Bearer {together_key}'},
                        timeout=10
                    )
                    if response.status_code == 200:
                        self.print_status('success', "Together AI API accessible")
                    else:
                        self.print_status('error', f"Together AI API error: {response.status_code}")
                        self.errors.append(f"Together API returned {response.status_code}")
                except Exception as e:
                    self.print_status('error', f"Together AI connection failed: {e}")
                    self.errors.append(f"Together AI connectivity error")
            else:
                self.print_status('warning', "Together API key not configured - skipping test")

            # Test Cartesia AI
            cartesia_key = os.getenv('CARTESIA_API_KEY')
            if cartesia_key and cartesia_key.startswith('sk_car_'):
                try:
                    import requests
                    response = requests.get(
                        'https://api.cartesia.ai/voices',
                        headers={'X-API-Key': cartesia_key},
                        timeout=10
                    )
                    if response.status_code == 200:
                        self.print_status('success', "Cartesia AI API accessible")
                    else:
                        self.print_status('error', f"Cartesia AI API error: {response.status_code}")
                        self.errors.append(f"Cartesia API returned {response.status_code}")
                except Exception as e:
                    self.print_status('error', f"Cartesia AI connection failed: {e}")
                    self.errors.append(f"Cartesia AI connectivity error")
            else:
                self.print_status('warning', "Cartesia API key not configured - skipping test")

            return len(self.errors) == 0

        except Exception as e:
            self.print_status('error', f"API connectivity test failed: {e}")
            self.errors.append("API test exception")
            return False

    def print_summary(self):
        """Print setup summary"""
        self.print_header("Setup Summary")

        if not self.errors and not self.warnings:
            print("\n[OK] Setup completed successfully! All systems ready.\n")
            print("Next steps:")
            print("  1. Run: python test_setup.py")
            print("  2. Generate your first podcast!")
        elif not self.errors:
            print(f"\n[OK] Setup completed with {len(self.warnings)} warning(s)\n")
            print("Warnings:")
            for warning in self.warnings:
                print(f"  [!] {warning}")
            print("\nYou can proceed, but some features may not work optimally.")
        else:
            print(f"\n[X] Setup failed with {len(self.errors)} error(s)\n")
            print("Errors:")
            for error in self.errors:
                print(f"  [X] {error}")
            print("\nPlease fix these errors before proceeding.")

        print("\n" + "=" * 70 + "\n")

    def run_full_setup(self) -> bool:
        """Run complete setup process"""
        print("\n" + "=" * 70)
        print("  Together AI Podcast Generation - Setup")
        print("=" * 70)

        steps = [
            ("Python Version", self.check_python_version),
            ("Environment File", self.check_env_file),
            ("Package Installation", self.install_requirements),
            ("Package Verification", self.verify_package_imports),
            ("FFmpeg", self.check_ffmpeg),
            ("Directories", self.create_required_directories),
            ("GPU Availability", self.check_gpu_availability),
            ("API Connectivity", self.test_api_connectivity),
        ]

        for step_name, step_func in steps:
            try:
                step_func()
            except Exception as e:
                self.print_status('error', f"{step_name} failed: {e}")
                self.errors.append(f"{step_name} exception: {e}")

        self.print_summary()
        return len(self.errors) == 0


def main():
    """Main setup entry point"""
    validator = SetupValidator()
    success = validator.run_full_setup()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
