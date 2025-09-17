# Tavily API Setup Guide

## 🚀 Quick Setup

To enable real Tavily API search results and AI summaries in your application:

### Step 1: Get Your API Key
1. Visit [tavily.com](https://tavily.com/)
2. Sign up for a free account
3. Copy your API key from the dashboard

### Step 2: Configure Environment
1. Open your `.env` file in the project root
2. Replace `your-tavily-api-key-here` with your actual API key:
   ```env
   VITE_TAVILY_API_KEY=tvly-abc123...your-actual-key
   ```

### Step 3: Restart Development Server
```bash
npm run dev
```

## ✅ Verification

Once configured, you'll see:
- ✅ Green "LIVE" status in the AI Search Demo
- Real search results from Tavily API
- Comprehensive AI summaries with proper citations
- Enhanced follow-up questions based on actual content

## 🆚 Mock vs Real API

| Feature | Mock Data | Real Tavily API |
|---------|-----------|-----------------|
| Search Results | Template-based | Real web results |
| AI Summaries | Generic responses | Content-analyzed summaries |
| Citations | Placeholder | Actual source references |
| Follow-ups | Template questions | Context-aware suggestions |
| Performance | Instant | ~1-3 seconds |

## 🔧 Troubleshooting

**API Status shows "DEMO":**
- Check that your API key is correctly set in `.env`
- Restart the development server
- Ensure the key starts with `tvly-`

**Search errors:**
- Verify your API key is valid
- Check your internet connection
- Ensure you haven't exceeded rate limits

## 📚 Features Enabled with Real API

1. **Real-time Search**: Live web search results
2. **AI Content Analysis**: Actual content processing and synthesis
3. **Smart Citations**: Proper source attribution
4. **Intent Detection**: Query type recognition and optimization
5. **Context-aware Follow-ups**: Intelligent next questions
6. **News Integration**: Recent news when relevant
7. **Domain Filtering**: Include/exclude specific sources

## 🎯 Testing Your Setup

Try these search queries to verify functionality:
- "Latest developments in artificial intelligence 2024"
- "How to start a successful podcast"
- "What is quantum computing and how does it work"
- "Climate change technology innovations"

You should see detailed, well-cited responses with real source material when the API is properly configured.