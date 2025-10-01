# Together AI NotebookLM Podcast Generator

Complete end-to-end podcast generation system using Together AI's Llama-3-70b and Cartesia Sonic TTS.

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Install Python dependencies
python setup.py

# Install backend API dependencies
pip install fastapi uvicorn pydantic

# Verify setup
python test_setup.py
```

### 2. Start Backend API

```bash
# Start the podcast API server
python backend/podcast_api.py

# Server will run on http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 3. Use the System

**Command Line:**
```bash
# Generate podcast from document
python main.py
```

**Web Interface:**
- Open Multi-Voice Conversation panel in the UI
- Upload your document (PDF, DOCX, TXT, MD)
- Configure options (style, tone, speakers)
- Click "Generate Multi-Voice Podcast"

## 📁 Project Structure

```
Podcast/
├── main.py                      # Complete pipeline orchestrator
├── llm_generator.py             # Together AI LLM (script generation)
├── tts_generator.py             # Cartesia TTS (audio synthesis)
├── usage_tracker.py             # Cost tracking & monitoring
├── config.py                    # Configuration management
├── podcast_generator.py         # NotebookLM-style generator
├── setup.py                     # Setup & validation
├── test_setup.py               # Comprehensive tests
│
├── backend/
│   ├── podcast_api.py          # FastAPI endpoints
│   ├── audio/
│   │   └── podcasts/          # Generated podcasts
│   └── uploads/               # Document uploads
│
└── src/
    └── components/narration/
        └── MultiVoiceConversationPanel.tsx  # Frontend UI
```

## 🎯 Components

### 1. TogetherNotebookLM (main.py)

**Complete pipeline class:**
```python
from main import TogetherNotebookLM, PodcastOptions

# Initialize
pipeline = TogetherNotebookLM()

# Configure
options = PodcastOptions(
    length="10min",
    host_voice="host_male_friendly",
    guest_voice="guest_female_expert",
    output_format="mp3"
)

# Generate podcast
result = pipeline.create_podcast("document.txt", options)
```

**Pipeline Steps:**
1. **Document Processing** - Extract & clean text
2. **Script Generation** - LLM creates dialogue (Llama-3-70b)
3. **Dialogue Enhancement** - Add natural elements
4. **Audio Synthesis** - TTS with voice switching (Cartesia Sonic)
5. **Post-Processing** - Normalize & combine audio
6. **Usage Tracking** - Monitor costs

### 2. TogetherLLMGenerator (llm_generator.py)

**Generates podcast scripts:**
```python
from llm_generator import TogetherLLMGenerator

generator = TogetherLLMGenerator()

dialogue = generator.generate_podcast_dialogue(
    document_text="...",
    length="10min",
    temperature=0.8
)

# Output: PodcastDialogue with structured turns
```

**Features:**
- NotebookLM-style system prompt
- 60/40 guest/host speaking ratio
- Natural conversation elements
- Retry logic & error handling
- JSON output format

### 3. CartesiaTTSGenerator (tts_generator.py)

**Converts script to audio:**
```python
from tts_generator import CartesiaTTSGenerator

tts = CartesiaTTSGenerator(
    host_voice="host_male_friendly",
    guest_voice="guest_female_expert"
)

audio_file, metadata = tts.generate_and_save(
    dialogue=dialogue,
    output_path="podcast.mp3",
    format="mp3"
)
```

**Features:**
- 6 voice presets (male/female combinations)
- Smart pause insertion
- Audio normalization
- Multi-format export (WAV/MP3/OGG)
- Speaker-specific speeds

### 4. TogetherUsageTracker (usage_tracker.py)

**Monitors costs:**
```python
from usage_tracker import get_tracker

tracker = get_tracker()

# Estimate before generation
estimate = tracker.estimate_podcast_cost(
    document_length=5000,
    podcast_duration=300,
    num_speakers=2
)

# View monthly report
tracker.print_summary()

# Export billing data
tracker.export_to_csv(days=30)
```

## 🎨 Voice Presets

| Preset | Voice | Description |
|--------|-------|-------------|
| `host_male_friendly` | Confident Male | Warm, friendly host |
| `host_male_casual` | Casual Male | Relaxed, conversational |
| `host_female` | Female Host | Warm female host |
| `guest_female_expert` | Professional Female | Clear, authoritative |
| `guest_female_warm` | Warm Female | Friendly, engaging |
| `guest_male` | Male Guest | Knowledgeable expert |

## 🔧 API Endpoints

### Podcast Generation

**Estimate Cost:**
```bash
POST /api/podcast/estimate-cost
{
  "document_text": "...",
  "length": "10min"
}
```

**Generate Podcast:**
```bash
POST /api/podcast/generate
{
  "document_text": "...",
  "length": "10min",
  "host_voice": "host_male_friendly",
  "guest_voice": "guest_female_expert",
  "style": "conversational",
  "tone": "friendly",
  "num_speakers": 2,
  "output_format": "mp3",
  "save_script": true
}
```

**Check Status:**
```bash
GET /api/podcast/status/{job_id}
```

**Available Voices:**
```bash
GET /api/podcast/voices
```

## 💰 Pricing

### Together AI (LLM)
- Llama-3-70b: $0.90 per 1M tokens
- Average 10min podcast: ~3000 tokens

### Cartesia (TTS)
- Sonic: $0.025 per 1K characters
- Average 10min podcast: ~2500 characters

### Example Costs
- 5-minute podcast: ~$0.02-0.05
- 10-minute podcast: ~$0.04-0.10
- 20-minute podcast: ~$0.08-0.20

## 🧪 Testing

**Run all tests:**
```bash
# Setup validation
python test_setup.py

# LLM generator
python test_llm_generator.py

# TTS generator
python test_tts_generator.py

# Full pipeline
python main.py
```

## 🎛️ Configuration Options

### Length Presets
- `5min` - 10-15 turns
- `10min` - 15-25 turns (default)
- `15min` - 25-35 turns
- `20min` - 35-45 turns

### Podcast Styles
- `conversational` - Friendly, casual discussion
- `expert-panel` - Professional analysis
- `debate` - Opposing viewpoints
- `interview` - Host interviewing expert

### Conversation Tones
- `friendly` - Warm and approachable
- `professional` - Business-focused
- `humorous` - Light-hearted with jokes
- `analytical` - Deep dive and thorough

## 📊 Output

**Generated Files:**
- `podcast_YYYYMMDD_HHMMSS.mp3` - Audio file
- `script_YYYYMMDD_HHMMSS.json` - Structured dialogue
- `script_YYYYMMDD_HHMMSS.md` - Human-readable script

**Metadata:**
```json
{
  "duration_seconds": 305.4,
  "total_turns": 18,
  "file_size_bytes": 4891234,
  "voices": {
    "host": "Confident Male",
    "guest": "Professional Female"
  },
  "generation_time": 45.2,
  "total_cost": 0.0523
}
```

## 🚨 Troubleshooting

### "TOGETHER_API_KEY not configured"
- Check `.env` file has valid API key
- Restart terminal to reload env vars

### "CARTESIA_API_KEY not configured"
- Verify Cartesia key in `.env`
- Key should start with `sk_car_`

### "Generation failed: 500"
- Check backend API is running (`python backend/podcast_api.py`)
- Verify both APIs are accessible
- Check logs for detailed errors

### "Audio file not generated"
- Ensure FFmpeg is installed
- Check output directory permissions
- Verify TTS API connectivity

## 🔗 Integration

### Frontend (React/TypeScript)

```typescript
import { NarrationAPI } from '../../services/narrationApi';

// Generate podcast
const response = await NarrationAPI.generatePodcast({
  documentText: content,
  length: '10min',
  hostVoice: 'host_male_friendly',
  guestVoice: 'guest_female_expert',
  style: 'conversational',
  tone: 'friendly'
});

// Poll for completion
const status = await NarrationAPI.getPodcastStatus(response.job_id);
```

### Backend (Python)

```python
from main import TogetherNotebookLM

pipeline = TogetherNotebookLM()
result = pipeline.create_podcast("doc.txt")

if result.success:
    print(f"Generated: {result.audio_file}")
    print(f"Cost: ${result.total_cost:.4f}")
```

## 📈 Performance

- **Script Generation**: 15-30 seconds
- **Audio Synthesis**: 30-60 seconds
- **Total Time**: ~1-2 minutes for 10min podcast
- **Success Rate**: >95% with retry logic

## 🎓 Best Practices

1. **Document Length**: 500-5000 words optimal
2. **Cost Control**: Use estimate before generation
3. **Voice Selection**: Match style to content
4. **Error Handling**: Implement retries for API calls
5. **Monitoring**: Track usage with built-in tracker

## 📚 References

- Together AI Docs: https://docs.together.ai/
- Cartesia AI Docs: https://docs.cartesia.ai/
- NotebookLM: Inspired by Google's podcast generator

## 🆘 Support

- Check `/docs` endpoint for API documentation
- Run health check: `GET /health`
- View logs in console output
- Test individual components separately

---

**Built with:** Together AI (Llama-3-70b) + Cartesia (Sonic) + FastAPI + React
