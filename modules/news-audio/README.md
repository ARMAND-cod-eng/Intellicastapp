# News Audio Module

## Overview
The News Audio module is a modular feature for the IntelliCast AI application that enables AI-powered conversion of news articles into high-quality audio narrations.

## Features
- **Multi-source News Fetching**: RSS feeds, APIs, and web scraping
- **AI-powered Audio Generation**: Integration with existing TTS services
- **User Personalization**: Custom preferences and voice profiles
- **Playlist Management**: Create and manage news audio collections
- **Analytics**: Track usage and popular content
- **Modular Architecture**: Can be enabled/disabled via feature flags

## Architecture

### Backend Structure
```
modules/news-audio/backend/
├── routes/           # API endpoints
├── services/         # Business logic
├── models/           # Database access layer
├── database/         # Schema and migrations
├── hooks.js          # Module lifecycle hooks
└── README.md         # This file
```

### Frontend Structure
```
modules/news-audio/frontend/
├── components/       # React components
├── views/           # Page-level components
├── hooks/           # Custom React hooks
└── services/        # API integration
```

### Shared Structure
```
modules/news-audio/shared/
├── types/           # TypeScript definitions
├── utils/           # Shared utilities
└── constants/       # Module constants
```

## Installation & Setup

### 1. Environment Configuration
Copy `.env.example` to `.env` and configure:
```bash
# Enable the module
NEWS_AUDIO_ENABLED=true

# Configure news fetching
NEWS_AUDIO_FETCH_INTERVAL=3600
NEWS_AUDIO_MAX_ARTICLES_PER_SOURCE=50
```

### 2. Database Setup
The module will automatically create its database tables when initialized. Tables include:
- `news_sources` - News source configurations
- `news_articles` - Fetched articles
- `news_audio_sessions` - Audio generation sessions
- `user_news_preferences` - User settings
- `news_audio_playlists` - User playlists

### 3. Module Registration
The module is automatically discovered and registered by the Module Manager when enabled.

## API Endpoints

### News Sources
- `GET /api/news-audio/sources` - List news sources
- `POST /api/news-audio/sources` - Add news source
- `PUT /api/news-audio/sources/:id` - Update news source
- `DELETE /api/news-audio/sources/:id` - Delete news source

### Articles
- `GET /api/news-audio/articles` - List articles
- `GET /api/news-audio/articles/:id` - Get specific article
- `POST /api/news-audio/articles/:id/generate` - Generate audio for article

### Audio Sessions
- `GET /api/news-audio/sessions` - List user's audio sessions
- `POST /api/news-audio/sessions` - Create new audio session
- `GET /api/news-audio/sessions/:id/status` - Get session status
- `GET /api/news-audio/sessions/:id/download` - Download generated audio

### User Preferences
- `GET /api/news-audio/preferences` - Get user preferences
- `POST /api/news-audio/preferences` - Save user preferences

## Frontend Routes

### Main Pages
- `/news-audio` - News Audio dashboard
- `/news-audio/library` - Audio library and playlists
- `/news-audio/settings` - User preferences and source management

## Module Lifecycle

### Initialization
1. Database tables are created
2. Default news sources are added
3. Necessary directories are created

### Enablement
1. Background services start (if configured)
2. Event listeners are registered
3. Module becomes available to users

### Disablement
1. Background services stop
2. Resources are cleaned up
3. Module becomes unavailable

## Integration with Main App

### Authentication
- Shares authentication with main app
- Uses existing user system
- Respects user permissions

### Database
- Uses same database connection
- Module-specific tables with foreign key relationships
- Maintains data integrity

### TTS Integration
- Leverages existing Chatterbox TTS service
- Shares voice configurations
- Consistent audio quality

## Development

### Adding New Features
1. Create components in appropriate module directories
2. Add API endpoints to module routes
3. Update module configuration if needed
4. Test module enable/disable functionality

### Testing
```bash
# Run module-specific tests
npm test -- modules/news-audio

# Test module lifecycle
npm run test:modules
```

### Debugging
Set environment variable for detailed logging:
```bash
DEBUG=news-audio:* npm run dev
```

## Feature Flags

Control module behavior with environment variables:

```bash
# Enable/disable module
NEWS_AUDIO_ENABLED=true

# Auto-fetch news articles
NEWS_AUDIO_AUTO_FETCH=true

# Background processing
NEWS_AUDIO_BACKGROUND_PROCESSING=true

# Beta features
NEWS_AUDIO_BETA_FEATURES=false
```

## Security Considerations

- All API endpoints require authentication
- User data is isolated by user_id
- File uploads are validated and sanitized
- Rate limiting on resource-intensive operations

## Performance

- Background processing for audio generation
- Caching of frequently accessed articles
- Pagination for large datasets
- Optimized database queries with proper indexing

## Troubleshooting

### Module Not Loading
1. Check `NEWS_AUDIO_ENABLED=true` in environment
2. Verify module configuration file exists
3. Check server logs for initialization errors

### Database Issues
1. Ensure database file is writable
2. Check schema.sql for syntax errors
3. Verify foreign key constraints

### TTS Integration Issues
1. Confirm Chatterbox service is running
2. Check TTS service configuration
3. Verify audio output directory permissions

## Contributing

When contributing to this module:
1. Follow the existing code structure
2. Add appropriate tests
3. Update documentation
4. Test module enable/disable scenarios
5. Ensure backward compatibility