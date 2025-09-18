# Voice Configuration - Single Narration Setup

## Overview
This podcast application is configured for **single voice narration** to ensure consistent, professional audio quality using the **Qwen2.5:7b** model for superior content analysis and summary generation.

## Configuration Details

### AI Model Configuration
- **Primary Model**: `qwen2.5:7b`
- **Purpose**: Superior analytical and summarization capabilities
- **Temperature**: 0.2 for maximum precision and consistency
- **Token Allocation**: 1600 tokens for comprehensive summaries

### Voice Settings
- **Default Voice**: `emma_en` (Professional English Female)
- **Voice Type**: Chatterbox Multilingual TTS
- **Configuration**: Single voice setup for consistency
- **Speed**: 1.0x (default)
- **Quality**: Professional grade for clear narration

### Summary Generation
- **Engine**: Qwen2.5:7b (forced, no fallback)
- **Style**: Academic-level analysis with deep insights
- **Length**: 300-500 words for substantive content
- **Quality**: Publication-quality summaries with analytical depth

### Technical Implementation
1. **OllamaService**: Configured to force Qwen model usage
2. **NarrationAPI**: Defaults to emma_en voice for consistency
3. **Frontend**: SingleVoiceNarrationPanel optimized for single voice workflow
4. **AI Config**: System-wide Qwen prioritization

## Benefits
- **Consistency**: Single voice ensures uniform listening experience
- **Quality**: Qwen model provides superior analytical capabilities
- **Efficiency**: Optimized prompts for high-quality output
- **Professional**: Academic-level summary generation

## Usage
When users upload documents:
1. Content is processed using Qwen2.5:7b model
2. High-quality summaries are generated with analytical depth
3. Audio is synthesized using emma_en voice for consistency
4. Results are cached for performance optimization

This configuration prioritizes quality and consistency over variety, ensuring every generated podcast maintains professional standards.