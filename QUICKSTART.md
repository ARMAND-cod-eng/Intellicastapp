# NotebookLM Podcast Generator - Quick Start

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (2 min)

```bash
# Install all required packages
python setup.py

# This will:
# ✓ Check Python version
# ✓ Install Together AI, Cartesia, FastAPI, etc.
# ✓ Verify FFmpeg
# ✓ Test API connectivity
```

### Step 2: Configure API Keys (1 min)

Edit `.env` file:
```env
TOGETHER_API_KEY=your_together_ai_key_here
CARTESIA_API_KEY=sk_car_your_cartesia_key_here
```

**Get your keys:**
- Together AI: https://together.ai/ → Sign up → API Keys
- Cartesia AI: (Already in your .env!)

### Step 3: Start Backend API (30 seconds)

```bash
# Start the podcast generation API
python start_podcast_api.py

# Server runs on http://localhost:8000
```

### Step 4: Start Frontend (30 seconds)

```bash
# In another terminal
npm run dev

# Frontend runs on http://localhost:3004
```

### Step 5: Generate Your First Podcast! (1 min)

**Option A: Web UI**
1. Open http://localhost:3004
2. Click "Multi-Voice Conversation" button
3. Upload a document (PDF, TXT, DOCX, MD)
4. Choose style & options
5. Click "Generate Multi-Voice Podcast"
6. Wait 1-2 minutes
7. Download your podcast!

**Option B: Command Line**
```bash
python main.py
# Generates test podcast from sample document
```

## 🎯 What You Get

**Input:** Any document (article, paper, blog post)

**Output:**
- 🎙️ MP3 podcast file
- 📄 Conversation script (JSON + Markdown)
- 💰 Cost report (~$0.02-0.10 per 10min)
- 📊 Usage statistics

## ⚙️ Customization

### Voice Combinations

```python
# Male host + Female expert (default)
host_voice="host_male_friendly"
guest_voice="guest_female_expert"

# Female host + Male expert
host_voice="host_female"
guest_voice="guest_male"

# Two males
host_voice="host_male_friendly"
guest_voice="guest_male"
```

### Podcast Styles

- **Conversational** (default) - Friendly chat
- **Expert Panel** - Professional analysis
- **Debate** - Opposing viewpoints
- **Interview** - Host interviews guest

### Length Options

- **5min** - Quick overview (10-15 turns)
- **10min** - Standard depth (15-25 turns) ⭐
- **15min** - Detailed discussion (25-35 turns)
- **20min** - Deep dive (35-45 turns)

## 🧪 Test Everything

```bash
# Test full setup
python test_setup.py

# Test LLM generation
python test_llm_generator.py

# Test TTS generation
python test_tts_generator.py

# Test complete pipeline
python main.py
```

## 💡 Quick Examples

### Example 1: Tech Article → Podcast

```python
from main import TogetherNotebookLM, PodcastOptions

pipeline = TogetherNotebookLM()

options = PodcastOptions(
    length="10min",
    host_voice="host_male_friendly",
    guest_voice="guest_female_expert",
    output_format="mp3"
)

result = pipeline.create_podcast("tech_article.txt", options)
print(f"Generated: {result.audio_file}")
```

### Example 2: Research Paper → Expert Discussion

```python
options = PodcastOptions(
    length="15min",
    host_voice="host_female",
    guest_voice="guest_male",
    output_format="mp3"
)

result = pipeline.create_podcast("research_paper.pdf", options)
```

### Example 3: Estimate Cost First

```python
# Estimate before generating
doc_text = open("article.txt").read()

estimate = pipeline.estimate_cost(doc_text, options)
print(f"Estimated cost: ${estimate['total_cost']:.4f}")

# If OK, generate
if estimate['total_cost'] < 0.10:
    result = pipeline.create_podcast("article.txt", options)
```

## 📊 Check Your Usage

```python
from usage_tracker import get_tracker

tracker = get_tracker()

# Monthly summary
tracker.print_summary()

# Export to CSV
tracker.export_to_csv(days=30)
```

## 🎚️ API Endpoints

Once backend is running, try:

```bash
# Health check
curl http://localhost:8000/health

# Get available voices
curl http://localhost:8000/api/podcast/voices

# Estimate cost
curl -X POST http://localhost:8000/api/podcast/estimate-cost \
  -H "Content-Type: application/json" \
  -d '{"document_text": "Your text here", "length": "10min"}'
```

## 🐛 Troubleshooting

### "Module not found"
```bash
python setup.py
# Or manually: pip install -r requirements.txt
```

### "API key not configured"
- Check `.env` file exists
- Verify keys are not placeholder values
- Restart terminal

### "Backend not responding"
- Ensure `python start_podcast_api.py` is running
- Check it's on port 8000
- Try http://localhost:8000/health

### "FFmpeg not found"
- Windows: Download from ffmpeg.org
- macOS: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`

## 📈 Performance Tips

1. **Optimal document length:** 500-5000 words
2. **Best quality:** Use 10-15 min length
3. **Faster generation:** Use 5min length
4. **Cost control:** Estimate first, set budget limits

## 🎓 Next Steps

1. **Customize voices** - Try different combinations
2. **Adjust styles** - Test conversational vs expert
3. **Batch process** - Generate multiple podcasts
4. **Integrate** - Add to your workflow

## 📚 Full Documentation

- [Complete README](README_NOTEBOOKLM.md)
- [Setup Guide](SETUP_INSTRUCTIONS.md)
- API Docs: http://localhost:8000/docs

## 💬 Support

**Check logs:**
- Backend: Console where `start_podcast_api.py` runs
- Frontend: Browser console (F12)

**Test individual components:**
```bash
python -c "from llm_generator import TogetherLLMGenerator; print('LLM OK')"
python -c "from tts_generator import CartesiaTTSGenerator; print('TTS OK')"
```

**Verify configuration:**
```bash
python config.py
```

---

**That's it!** You now have a complete NotebookLM-style podcast generator. 🎉

Generate your first podcast in under 5 minutes!
