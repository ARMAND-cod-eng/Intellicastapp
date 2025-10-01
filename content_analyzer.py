"""
AI-Powered Content Analyzer for Intelligent Podcast Style Selection
Analyzes document content to recommend the most suitable podcast conversation style
"""

import os
import re
from typing import Dict, List, Tuple, Any
from together import Together


class ContentAnalyzer:
    """
    Analyzes document content and intelligently recommends podcast conversation styles
    """

    def __init__(self):
        """Initialize the content analyzer with Together AI"""
        self.client = Together(api_key=os.environ.get("TOGETHER_API_KEY"))
        self.model = "meta-llama/Llama-3-70b-chat-hf"

    def analyze_content(self, document_text: str) -> Dict[str, Any]:
        """
        Comprehensive content analysis to determine document characteristics

        Args:
            document_text: The full text of the document

        Returns:
            Dictionary containing analysis results
        """
        # Extract key characteristics
        word_count = len(document_text.split())

        # Analyze content structure
        has_multiple_perspectives = self._detect_multiple_perspectives(document_text)
        has_controversial_topics = self._detect_controversial_topics(document_text)
        technical_depth = self._analyze_technical_depth(document_text)
        content_type = self._classify_content_type(document_text)
        complexity_level = self._assess_complexity(document_text)

        return {
            "word_count": word_count,
            "has_multiple_perspectives": has_multiple_perspectives,
            "has_controversial_topics": has_controversial_topics,
            "technical_depth": technical_depth,
            "content_type": content_type,
            "complexity_level": complexity_level
        }

    def _detect_multiple_perspectives(self, text: str) -> bool:
        """Detect if content presents multiple viewpoints"""
        perspective_indicators = [
            r"on the other hand", r"however", r"conversely", r"alternatively",
            r"some argue", r"others believe", r"critics claim", r"proponents suggest",
            r"different viewpoints", r"opposing views", r"debate", r"controversy"
        ]

        count = sum(1 for pattern in perspective_indicators if re.search(pattern, text, re.IGNORECASE))
        return count >= 3

    def _detect_controversial_topics(self, text: str) -> bool:
        """Detect controversial or debate-worthy topics"""
        controversial_indicators = [
            r"controversy", r"debate", r"dispute", r"disagreement", r"conflict",
            r"opposing", r"versus", r"vs\.", r"challenge", r"criticism",
            r"ethical dilemma", r"moral issue", r"contested"
        ]

        count = sum(1 for pattern in controversial_indicators if re.search(pattern, text, re.IGNORECASE))
        return count >= 2

    def _analyze_technical_depth(self, text: str) -> str:
        """Analyze the technical depth of the content"""
        # Check for technical terminology
        technical_patterns = [
            r"\b[A-Z]{2,}\b",  # Acronyms
            r"algorithm", r"framework", r"methodology", r"implementation",
            r"architecture", r"optimization", r"analysis", r"coefficient",
            r"derivative", r"integral", r"theorem", r"hypothesis"
        ]

        technical_count = sum(1 for pattern in technical_patterns if re.search(pattern, text, re.IGNORECASE))

        if technical_count >= 10:
            return "high"
        elif technical_count >= 5:
            return "medium"
        else:
            return "low"

    def _classify_content_type(self, text: str) -> str:
        """Classify the type of content"""
        # Educational content
        if re.search(r"learn|understand|explain|tutorial|guide|introduction", text, re.IGNORECASE):
            if re.search(r"research|study|findings|results|data|experiment", text, re.IGNORECASE):
                return "research"
            return "educational"

        # Opinion/argumentative
        if re.search(r"should|must|believe|think|opinion|argument|claim", text, re.IGNORECASE):
            return "argumentative"

        # Technical documentation
        if re.search(r"implementation|code|function|class|API|documentation", text, re.IGNORECASE):
            return "technical"

        # Narrative/storytelling
        if re.search(r"story|experience|journey|narrative|once|began", text, re.IGNORECASE):
            return "narrative"

        return "general"

    def _assess_complexity(self, text: str) -> str:
        """Assess the complexity level of the content"""
        sentences = text.split('.')
        avg_sentence_length = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)

        words = text.split()
        long_words = sum(1 for word in words if len(word) > 8)
        long_word_ratio = long_words / max(len(words), 1)

        if avg_sentence_length > 25 or long_word_ratio > 0.2:
            return "high"
        elif avg_sentence_length > 15 or long_word_ratio > 0.1:
            return "medium"
        else:
            return "low"

    def recommend_style(self, document_text: str) -> Dict[str, Any]:
        """
        Intelligently recommend the best podcast style based on content analysis

        Args:
            document_text: The full text of the document

        Returns:
            Dictionary with recommended style and reasoning
        """
        # Perform comprehensive analysis
        analysis = self.analyze_content(document_text)

        # Use AI to determine the best style
        ai_recommendation = self._get_ai_style_recommendation(document_text, analysis)

        # Combine rule-based and AI recommendations
        final_recommendation = self._combine_recommendations(analysis, ai_recommendation)

        return final_recommendation

    def _get_ai_style_recommendation(self, document_text: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Use Together AI to generate intelligent style recommendation"""

        # Create a focused excerpt for analysis
        excerpt = document_text[:2000] if len(document_text) > 2000 else document_text

        prompt = f"""You are an expert podcast producer analyzing content to recommend the perfect podcast conversation style.

Document Characteristics:
- Word Count: {analysis['word_count']}
- Multiple Perspectives: {'Yes' if analysis['has_multiple_perspectives'] else 'No'}
- Controversial Topics: {'Yes' if analysis['has_controversial_topics'] else 'No'}
- Technical Depth: {analysis['technical_depth']}
- Content Type: {analysis['content_type']}
- Complexity Level: {analysis['complexity_level']}

Document Excerpt:
{excerpt}

Available Podcast Styles:
1. **conversational** - Friendly, casual discussion between hosts who explore ideas together
2. **expert-panel** - Professional analysis with multiple expert perspectives and deep insights
3. **debate** - Adversarial format with opposing viewpoints and critical discussion
4. **interview** - Host interviewing an expert guest with in-depth questions

Based on this content, recommend the SINGLE BEST podcast style. Respond ONLY in this exact JSON format:
{{
  "recommended_style": "style_id",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this style fits best",
  "tone_suggestion": "friendly|professional|analytical|humorous",
  "key_themes": ["theme1", "theme2", "theme3"]
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert podcast producer. Respond only with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            ai_response = response.choices[0].message.content.strip()

            # Extract JSON from response
            import json
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # Fallback if parsing fails
                return self._fallback_recommendation(analysis)

        except Exception as e:
            print(f"AI recommendation error: {e}")
            return self._fallback_recommendation(analysis)

    def _fallback_recommendation(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback recommendation based on analysis"""

        # Rule-based logic
        if analysis['has_controversial_topics'] and analysis['has_multiple_perspectives']:
            return {
                "recommended_style": "debate",
                "confidence": 0.85,
                "reasoning": "Content presents controversial topics with multiple perspectives, perfect for debate format",
                "tone_suggestion": "analytical",
                "key_themes": ["controversy", "multiple viewpoints", "critical analysis"]
            }

        elif analysis['technical_depth'] == 'high' or analysis['content_type'] == 'research':
            return {
                "recommended_style": "expert-panel",
                "confidence": 0.88,
                "reasoning": "Technical and research-heavy content benefits from expert panel discussion",
                "tone_suggestion": "professional",
                "key_themes": ["technical analysis", "expert insights", "research findings"]
            }

        elif analysis['content_type'] == 'interview' or analysis['content_type'] == 'narrative':
            return {
                "recommended_style": "interview",
                "confidence": 0.82,
                "reasoning": "Narrative and personal content works best in interview format",
                "tone_suggestion": "friendly",
                "key_themes": ["personal experience", "storytelling", "insights"]
            }

        else:
            return {
                "recommended_style": "conversational",
                "confidence": 0.80,
                "reasoning": "General content is ideal for friendly conversational format",
                "tone_suggestion": "friendly",
                "key_themes": ["exploration", "discussion", "accessibility"]
            }

    def _combine_recommendations(self, analysis: Dict[str, Any], ai_recommendation: Dict[str, Any]) -> Dict[str, Any]:
        """Combine analysis and AI recommendation into final recommendation"""

        return {
            "recommended_style": ai_recommendation.get('recommended_style', 'conversational'),
            "confidence": ai_recommendation.get('confidence', 0.75),
            "reasoning": ai_recommendation.get('reasoning', 'AI-powered analysis of content'),
            "tone_suggestion": ai_recommendation.get('tone_suggestion', 'friendly'),
            "key_themes": ai_recommendation.get('key_themes', []),
            "analysis": {
                "content_type": analysis['content_type'],
                "technical_depth": analysis['technical_depth'],
                "complexity_level": analysis['complexity_level'],
                "has_multiple_perspectives": analysis['has_multiple_perspectives'],
                "has_controversial_topics": analysis['has_controversial_topics']
            }
        }

    def get_custom_podcast_config(self, document_text: str) -> Dict[str, Any]:
        """
        Generate a complete custom podcast configuration based on intelligent content analysis

        Args:
            document_text: The full text of the document

        Returns:
            Complete podcast configuration with style, voices, and parameters
        """
        recommendation = self.recommend_style(document_text)

        # Map style to voice configuration
        voice_configs = {
            "conversational": {
                "host_voice": "host_male_friendly",
                "guest_voice": "guest_female_expert",
                "num_speakers": 2
            },
            "expert-panel": {
                "host_voice": "host_male_casual",
                "guest_voice": "guest_female_warm",
                "num_speakers": 3
            },
            "debate": {
                "host_voice": "host_male_friendly",
                "guest_voice": "guest_female_expert",
                "num_speakers": 2
            },
            "interview": {
                "host_voice": "host_male_friendly",
                "guest_voice": "guest_female_expert",
                "num_speakers": 2
            }
        }

        style = recommendation['recommended_style']
        voice_config = voice_configs.get(style, voice_configs['conversational'])

        return {
            "style": style,
            "host_voice": voice_config['host_voice'],
            "guest_voice": voice_config['guest_voice'],
            "tone": recommendation['tone_suggestion'],
            "num_speakers": voice_config['num_speakers'],
            "confidence": recommendation['confidence'],
            "reasoning": recommendation['reasoning'],
            "key_themes": recommendation['key_themes'],
            "analysis": recommendation['analysis']
        }


# Singleton instance
_analyzer_instance = None

def get_analyzer():
    """Get or create content analyzer instance"""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = ContentAnalyzer()
    return _analyzer_instance
