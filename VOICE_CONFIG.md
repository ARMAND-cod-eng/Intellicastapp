# Voice Configuration - Single Narration Setup with Multiple Summary Options

## Overview
This podcast application is configured for **single voice narration** with **three summary options** to ensure consistent, professional audio quality using the **Qwen2.5:7b** model for superior content analysis and summary generation.

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

### Summary Generation Options
The system now offers **three summary types** for maximum flexibility:

#### 1. Quick Summary
- **Engine**: Qwen2.5:7b with ultra-low temperature (0.1)
- **Length**: 75-150 words maximum
- **Style**: Rapid, precision summarization with maximum information density
- **Purpose**: 30-second read for essential insights and key takeaways
- **Optimized for**: Busy users who need core information quickly

#### 2. Detailed Summary (Default)
- **Engine**: Qwen2.5:7b with low temperature (0.2)
- **Length**: 300-500 words for substantive content
- **Style**: Academic-level analysis with deep insights and critical evaluation
- **Purpose**: Comprehensive understanding with analytical depth
- **Optimized for**: Thorough analysis and professional research

#### 3. Full Document
- **Processing**: No AI summarization - displays original content
- **Length**: Complete document with original structure and formatting
- **Style**: Verbatim presentation of source material
- **Purpose**: Complete reference access without modification
- **Optimized for**: Full context review and detailed examination

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
When users upload documents, they can choose from three summary options:

### Quick Summary Workflow
1. Upload document and select "Quick" summary type
2. Content is processed using Qwen2.5:7b with ultra-precise settings (temp 0.1)
3. Rapid 75-150 word summary is generated for immediate insights
4. Audio is synthesized using emma_en voice for consistency
5. Results are cached for performance optimization

### Detailed Summary Workflow (Default)
1. Upload document and select "Detailed" summary type
2. Content is processed using Qwen2.5:7b with analytical framework
3. Comprehensive 300-500 word summary with deep insights is generated
4. Audio is synthesized using emma_en voice for consistency
5. Results are cached for performance optimization

### Full Document Workflow
1. Upload document and select "Full Document" option
2. Original content is displayed without AI processing
3. Complete document structure and formatting preserved
4. Audio generation available for full content narration
5. No caching needed - direct content display

## User Interface
- **Toggle Selection**: Users see three clearly labeled options before generation
- **Smart Defaults**: "Detailed" is pre-selected for optimal experience
- **Visual Indicators**: Each option shows description of content type and purpose
- **Consistent Voice**: All audio uses professional emma_en voice regardless of summary type

This configuration provides flexibility while maintaining quality and consistency, ensuring every generated podcast meets professional standards regardless of chosen summary depth.