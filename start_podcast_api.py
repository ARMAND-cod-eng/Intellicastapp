"""
Startup script for Together AI NotebookLM Podcast API
Validates environment and starts the FastAPI server
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv()

def check_dependencies():
    """Check if all required dependencies are installed"""
    required = [
        'fastapi',
        'uvicorn',
        'together',
        'cartesia',
        'pydantic',
        'pydub',
        'requests'
    ]

    missing = []
    for package in required:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)

    if missing:
        print("[ERROR] Missing required packages:")
        for pkg in missing:
            print(f"   - {pkg}")
        print("\nRun: python setup.py")
        print("Or:  pip install -r requirements.txt")
        return False

    return True


def check_environment():
    """Check environment variables"""
    required_vars = {
        'TOGETHER_API_KEY': 'Together AI API key',
        'CARTESIA_API_KEY': 'Cartesia API key'
    }

    missing = []
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing.append(f"{var} ({description})")

    if missing:
        print("[ERROR] Missing environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\nConfigure these in your .env file")
        return False

    return True


def check_directories():
    """Ensure required directories exist"""
    dirs = [
        'backend/audio/podcasts',
        'backend/uploads/temp',
        'backend/usage_logs'
    ]

    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)

    return True


def main():
    """Main startup routine"""
    print("="*70)
    print("Together AI NotebookLM Podcast API - Startup")
    print("="*70 + "\n")

    # Check dependencies
    print("[*] Checking dependencies...")
    if not check_dependencies():
        return 1
    print("   [OK] All dependencies installed\n")

    # Check environment
    print("[*] Checking environment...")
    if not check_environment():
        return 1
    print("   [OK] Environment configured\n")

    # Check directories
    print("[*] Checking directories...")
    check_directories()
    print("   [OK] Directories ready\n")

    # Start server
    print("="*70)
    print("[START] Starting FastAPI Server")
    print("="*70 + "\n")
    print("API URL: http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    print("Health: http://localhost:8000/health")
    print("\nPress Ctrl+C to stop\n")
    print("="*70 + "\n")

    # Import and run
    try:
        import uvicorn
        from backend.podcast_api import app

        uvicorn.run(
            "backend.podcast_api:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )

    except KeyboardInterrupt:
        print("\n\n" + "="*70)
        print("[STOP] Server stopped")
        print("="*70 + "\n")
        return 0

    except Exception as e:
        print(f"\n[ERROR] Server error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
