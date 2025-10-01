# Together AI Podcast Generation - Setup Instructions

## Quick Start

### 1. Install Dependencies

```bash
# Install Python packages
python setup.py
```

This will:
- ✓ Check Python version (3.8+ required)
- ✓ Install all required packages
- ✓ Verify FFmpeg installation
- ✓ Create necessary directories
- ✓ Test API connectivity

### 2. Configure API Keys

Edit `.env` file and add your API keys:

```env
TOGETHER_API_KEY=your_together_ai_api_key_here
CARTESIA_API_KEY=sk_car_your_cartesia_key_here
```

**Get your API keys:**
- Together AI: https://together.ai/ (Sign up → API Keys)
- Cartesia AI: https://cartesia.ai/ (Already configured in your .env)

### 3. Verify Setup

```bash
# Run all verification tests
python test_setup.py
```

This will test:
- ✓ Environment variables
- ✓ Together AI API connection
- ✓ Llama-3-70b model access
- ✓ Cartesia TTS generation
- ✓ Mini podcast generation
- ✓ Usage tracker

## System Requirements

### Required
- **Python**: 3.8 or higher
- **FFmpeg**: For audio processing
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg`

### Optional
- **GPU**: CUDA-compatible GPU for faster processing (not required)

## Package Overview

### Core Dependencies
- `together` - Together AI SDK for LLM access
- `cartesia` - Cartesia AI SDK for voice synthesis
- `pydantic` - Data validation
- `python-dotenv` - Environment management

### Audio Processing
- `pydub` - Audio manipulation
- `soundfile` - Audio I/O
- `ffmpeg-python` - FFmpeg interface
- `numpy` - Numerical operations

### Utilities
- `tiktoken` - Token counting
- `colorama` - Terminal colors
- `rich` - Enhanced terminal output

## Directory Structure

```
Podcast/
├── .env                      # Environment configuration
├── config.py                 # Configuration loader
├── usage_tracker.py          # Cost tracking
├── setup.py                  # Setup validator
├── test_setup.py            # Setup tests
├── requirements.txt          # Python dependencies
└── backend/
    ├── audio/
    │   ├── podcasts/        # Generated podcasts
    │   └── test/            # Test audio files
    ├── uploads/             # Document uploads
    ├── usage_logs/          # Usage tracking data
    └── cache/               # Cached data
```

## Testing Your Setup

### Test 1: Environment Variables
```bash
python -c "from config import config; config.print_config_status()"
```

### Test 2: Together AI Connection
```bash
python -c "from test_setup import SetupTester; SetupTester().test_together_api_connection()"
```

### Test 3: Cartesia TTS
```bash
python -c "from test_setup import SetupTester; SetupTester().test_cartesia_tts()"
```

### Test 4: Cost Estimation
```bash
python -c "from usage_tracker import TogetherUsageTracker; tracker = TogetherUsageTracker(); print(tracker.estimate_podcast_cost(5000, 300, 2))"
```

## Troubleshooting

### "TOGETHER_API_KEY not configured"
1. Check `.env` file exists
2. Verify API key is not set to placeholder value
3. Restart your terminal/IDE to reload environment variables

### "FFmpeg not found"
1. Install FFmpeg using instructions above
2. Add FFmpeg to system PATH
3. Restart terminal

### "Import Error: No module named 'together'"
1. Run: `python setup.py` again
2. Verify virtual environment is activated (if using one)
3. Check Python version: `python --version`

### "API Connection Failed"
1. Check internet connectivity
2. Verify API keys are correct
3. Check API status at https://status.together.ai/

### "GPU not detected"
This is optional - the system will work with CPU (just slower)

## Cost Management

### Set Budget Limits
```python
from usage_tracker import TogetherUsageTracker

tracker = TogetherUsageTracker()
tracker.set_budget_limits(daily_limit=5.0, monthly_limit=50.0)
```

### Estimate Costs Before Generation
```python
estimate = tracker.estimate_podcast_cost(
    document_length=5000,    # 5000 characters
    podcast_duration=300,     # 5 minutes
    num_speakers=2
)
print(f"Estimated cost: ${estimate['total_cost']:.4f}")
```

### Monitor Usage
```python
# View monthly report
tracker.print_summary()

# Export to CSV for billing
tracker.export_to_csv(days=30)
```

## Pricing Reference (2025)

### Together AI (LLM)
- Llama-3-70b: ~$0.90 per 1M tokens
- Llama-3-8b: ~$0.20 per 1M tokens

### Cartesia AI (TTS)
- Sonic: ~$0.025 per 1K characters

### Example Costs
- 5-minute podcast (2 speakers): ~$0.02-0.05
- 10-minute podcast: ~$0.04-0.10
- 30-minute podcast: ~$0.12-0.30

## Next Steps

After successful setup:

1. **Review Configuration**
   ```bash
   python config.py
   ```

2. **Test Usage Tracker**
   ```bash
   python test_usage_tracker.py
   ```

3. **Start Building**
   - Create podcast generator script
   - Implement conversation generation
   - Add voice synthesis
   - Test end-to-end workflow

## Support

- Together AI Docs: https://docs.together.ai/
- Cartesia AI Docs: https://docs.cartesia.ai/
- GitHub Issues: [Your repo here]

## License

[Your license here]
