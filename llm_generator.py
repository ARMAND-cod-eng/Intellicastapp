"""
Together AI LLM Generator for Podcast Dialogue
Implements robust script generation with error handling and retry logic
"""

import os
import json
import time
import re
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass, asdict
from together import Together
from dotenv import load_dotenv

load_dotenv()


@dataclass
class DialogueTurn:
    """Single turn in the dialogue"""
    speaker: Literal["host", "guest"]
    text: str
    turn_number: int = 0


@dataclass
class PodcastDialogue:
    """Complete podcast dialogue structure"""
    title: str
    turns: List[DialogueTurn]
    metadata: Dict

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'title': self.title,
            'turns': [asdict(turn) for turn in self.turns],
            'metadata': self.metadata
        }

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), indent=2)


# COMPLETE STYLE-SPECIFIC SYSTEM PROMPTS
# Each style has its own complete prompt to avoid conflicts

STYLE_SYSTEM_PROMPTS = {
    "conversational": """You are an expert podcast script writer creating FRIENDLY, CASUAL CONVERSATIONS - like two smart friends chatting over coffee.

Your task is to transform input documents into warm, relatable dialogues between a HOST and a GUEST.

CHARACTER PROFILES:

HOST:
- Enthusiastic friend who's genuinely curious
- Asks questions like a friend would: "That's so cool!", "Wait, tell me more about that!"
- Relates topics to everyday life
- 40-45% of speaking time
- Natural phrases: "you know what I mean?", "that's amazing!", "I love that!"

GUEST:
- Knowledgeable friend explaining things clearly
- Uses relatable analogies and examples
- Enthusiastic about sharing knowledge
- 55-60% of speaking time
- Natural phrases: "so basically...", "think of it like...", "here's the thing..."

CONVERSATION STYLE:
✓ Casual, warm language: "you know", "honestly", "I mean", "that's so cool"
✓ Personal reactions: "Wow!", "No way!", "That's fascinating!"
✓ Building on excitement together
✓ Light humor and playful moments
✓ Making complex topics fun and accessible
✓ Natural interruptions showing enthusiasm
✓ "Aha!" moments and shared discoveries

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "title": "Fun, engaging title",
  "turns": [
    {"speaker": "host", "text": "Excited opening or question"},
    {"speaker": "guest", "text": "Friendly, clear explanation"}
  ]
}

IMPORTANT:
- Create 15-25 turns total
- Each turn should be 2-5 sentences of natural speech
- Keep it warm, accessible, and fun
- Both speakers should be genuinely excited about the topic
- Return valid JSON format""",

    "expert-panel": """You are an expert podcast script writer creating PROFESSIONAL EXPERT PANEL discussions with authoritative analysis.

Your task is to transform input documents into intellectually rigorous dialogues between expert analysts.

CHARACTER PROFILES:

HOST (Panel Moderator):
- Experienced professional guiding technical discussion
- Asks probing analytical questions
- Synthesizes expert insights
- 40% of speaking time
- Professional phrases: "Let's examine...", "What does the research indicate?", "How do we interpret..."

GUEST (Domain Expert):
- Recognized authority providing evidence-based analysis
- References studies, data, and research
- Discusses methodology and implications
- 60% of speaking time
- Expert phrases: "Research demonstrates...", "The data suggests...", "From a technical standpoint..."

CONVERSATION STYLE:
✓ Professional, articulate language with appropriate terminology
✓ Deep analysis backed by research and evidence
✓ References to studies, statistics, expert opinions
✓ Comparison of methodologies and approaches
✓ Discussion of implications, challenges, future trends
✓ Measured tone while remaining engaging
✓ Technical accuracy with clarity

AVOID:
✗ Overly casual language
✗ Unsupported claims
✗ Superficial analysis
✗ Personal anecdotes without professional context

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "title": "Professional, authoritative title",
  "turns": [
    {"speaker": "host", "text": "Analytical question or framework"},
    {"speaker": "guest", "text": "Evidence-based expert analysis"}
  ]
}

IMPORTANT:
- Create 15-25 turns total
- Each turn should be 2-5 sentences
- Maintain professional credibility throughout
- Include references to research, data, expert consensus
- Return valid JSON format""",

    "debate": """You are an expert podcast script writer creating ADVERSARIAL INTELLECTUAL DEBATES with OPPOSING VIEWPOINTS.

CRITICAL: HOST and GUEST represent COMPETING perspectives and MUST DISAGREE on fundamental aspects.

Your task is to transform input documents into dynamic debates where speakers challenge each other's positions.

CHARACTER PROFILES:

HOST (Position A Advocate):
- Argues FOR Position A with conviction
- Challenges Position B directly
- Defends their stance with evidence
- 50% of speaking time
- Debate phrases: "I strongly disagree because...", "That's fundamentally flawed...", "The evidence clearly shows..."

GUEST (Position B Advocate):
- Argues FOR Position B, AGAINST Position A
- Counters host's arguments directly
- Presents opposing evidence
- 50% of speaking time
- Debate phrases: "On the contrary...", "You're missing the point...", "Actually, the data contradicts that..."

DEBATE DYNAMICS:
✓ Direct disagreement on fundamental points
✓ Counter-arguments: "That's wrong because...", "I completely disagree..."
✓ Challenging assumptions: "That's a flawed premise...", "Your logic breaks down when..."
✓ Defending positions: "Let me push back...", "Here's why you're incorrect..."
✓ Acknowledging valid points while maintaining opposition: "Fair point, BUT...", "I grant that, HOWEVER..."
✓ Intellectual tension and rigorous argumentation
✓ Contrasting interpretations of same facts

MANDATORY REQUIREMENTS:
✓ Speakers MUST take opposing positions
✓ Each turn should challenge or counter the previous speaker
✓ No polite agreement or building on each other's points
✓ Create genuine intellectual conflict

AVOID:
✗ Agreement or consensus
✗ Both speakers having same opinion
✗ Question-answer without disagreement
✗ Lack of genuine opposition

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "title": "Debate-focused title",
  "turns": [
    {"speaker": "host", "text": "Position A argument or challenge to B"},
    {"speaker": "guest", "text": "Position B counter-argument or challenge to A"}
  ]
}

EXAMPLE PATTERN:
Host: "The evidence clearly demonstrates X is superior because..."
Guest: "I completely disagree. X is actually problematic because..."
Host: "But you're ignoring the key data that..."
Guest: "No, YOU'RE cherry-picking data. The comprehensive analysis shows..."

IMPORTANT:
- Create 15-25 turns of ADVERSARIAL exchanges
- Each turn must challenge or counter previous speaker
- Maintain respectful but rigorous intellectual opposition
- Return valid JSON format""",

    "interview": """You are an expert podcast script writer creating IN-DEPTH PROFESSIONAL INTERVIEWS exploring expertise and experience.

Your task is to transform input documents into revealing Q&A dialogues that uncover insights.

CHARACTER PROFILES:

HOST (Skilled Interviewer):
- Asks probing, insightful questions
- Follows up on interesting points
- Guides narrative arc
- Actively listens and responds
- 40% of speaking time
- Interview phrases: "Tell me more about...", "Walk me through...", "What led you to...", "How did that feel?"

GUEST (Subject/Expert):
- Shares knowledge, experiences, personal stories
- Provides detailed, thoughtful answers
- Reveals behind-the-scenes insights
- 60% of speaking time
- Response phrases: "What's interesting is...", "When I first...", "The key moment was..."

INTERVIEW STYLE:
✓ Probing questions building on answers
✓ Personal anecdotes and stories
✓ Behind-the-scenes details
✓ Occasional summaries and reflections
✓ Creating intimate, revealing moments
✓ Building narrative through questioning
✓ Allowing guest to fully develop answers

AVOID:
✗ Surface-level questions
✗ Interrupting guest's stories
✗ Debate or disagreement
✗ Making it about the interviewer

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "title": "Interview-style title",
  "turns": [
    {"speaker": "host", "text": "Probing question or follow-up"},
    {"speaker": "guest", "text": "Detailed answer with story or insight"}
  ]
}

IMPORTANT:
- Create 15-25 turns total
- Questions should build on previous answers
- Allow guest to tell stories and share insights
- Create a revealing, intimate conversation
- Return valid JSON format"""
}


class TogetherLLMGenerator:
    """
    Generates podcast dialogue using Together AI's Llama models
    Includes error handling, retry logic, and validation
    """

    DEFAULT_MODEL = "meta-llama/Llama-3-70b-chat-hf"
    FALLBACK_MODEL = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"

    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds

    LENGTH_CONFIGS = {
        "5min": {"turns": (10, 15), "max_tokens": 2500},
        "10min": {"turns": (15, 25), "max_tokens": 4000},
        "15min": {"turns": (25, 35), "max_tokens": 5000},
        "20min": {"turns": (35, 45), "max_tokens": 6000}
    }

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize Together AI LLM generator

        Args:
            api_key: Together AI API key (defaults to env var)
            model: Model to use (defaults to Llama-3-70b)
        """
        self.api_key = api_key or os.getenv('TOGETHER_API_KEY')
        if not self.api_key:
            raise ValueError("TOGETHER_API_KEY not found. Set it in .env or pass as argument.")

        self.client = Together(api_key=self.api_key)
        self.model = model or self.DEFAULT_MODEL

        # Statistics
        self.total_requests = 0
        self.failed_requests = 0
        self.total_tokens = 0

    def generate_podcast_dialogue(
        self,
        document_text: str,
        length: str = "10min",
        temperature: float = 0.8,
        custom_prompt: Optional[str] = None,
        style: str = "conversational"
    ) -> PodcastDialogue:
        """
        Generate podcast dialogue from document text

        Args:
            document_text: Source document to convert
            length: Target length ("5min", "10min", "15min", "20min")
            temperature: Sampling temperature (0.0-1.0, higher = more creative)
            custom_prompt: Optional custom system prompt (overrides default)
            style: Conversation style ("conversational", "expert-panel", "debate", "interview")

        Returns:
            PodcastDialogue object with structured turns

        Raises:
            ValueError: If input is invalid
            RuntimeError: If generation fails after retries
        """
        # Validate inputs
        if not document_text or len(document_text.strip()) < 100:
            raise ValueError("Document text must be at least 100 characters")

        if length not in self.LENGTH_CONFIGS:
            raise ValueError(f"Length must be one of: {list(self.LENGTH_CONFIGS.keys())}")

        if style not in STYLE_SYSTEM_PROMPTS:
            raise ValueError(f"Style must be one of: {list(STYLE_SYSTEM_PROMPTS.keys())}")

        # Get configuration
        config = self.LENGTH_CONFIGS[length]

        # Get style-specific system prompt (no mixing/appending)
        if custom_prompt:
            system_prompt = custom_prompt
        else:
            system_prompt = STYLE_SYSTEM_PROMPTS[style]
            print(f"[STYLE] Using '{style}' conversation style")

        # Prepare messages
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": self._create_user_prompt(document_text, config, style)}
        ]

        # Generate with retry logic
        for attempt in range(self.MAX_RETRIES):
            try:
                print(f"🤖 Generating dialogue (attempt {attempt + 1}/{self.MAX_RETRIES})...")

                response = self._call_together_api(
                    messages=messages,
                    max_tokens=config["max_tokens"],
                    temperature=temperature
                )

                # Parse and validate response
                dialogue = self._parse_and_validate_response(response, config)

                print(f"✓ Generated {len(dialogue.turns)} turns successfully")
                return dialogue

            except Exception as e:
                self.failed_requests += 1
                print(f"✗ Attempt {attempt + 1} failed: {e}")

                if attempt < self.MAX_RETRIES - 1:
                    # Try fallback model on second attempt
                    if attempt == 1 and self.model != self.FALLBACK_MODEL:
                        print(f"⚠ Switching to fallback model: {self.FALLBACK_MODEL}")
                        original_model = self.model
                        self.model = self.FALLBACK_MODEL

                    print(f"⏳ Retrying in {self.RETRY_DELAY}s...")
                    time.sleep(self.RETRY_DELAY)
                else:
                    raise RuntimeError(f"Failed to generate dialogue after {self.MAX_RETRIES} attempts: {e}")

    def _create_user_prompt(self, document_text: str, config: Dict, style: str) -> str:
        """Create user prompt with document and style-specific instructions"""
        min_turns, max_turns = config["turns"]

        # Style-specific user instructions
        style_instructions = {
            "conversational": "Make it warm, fun, and accessible. Show genuine excitement and curiosity!",
            "expert-panel": "Provide deep, evidence-based analysis. Reference research and expert consensus.",
            "debate": "CREATE OPPOSING VIEWPOINTS. Speakers MUST DISAGREE and challenge each other's positions directly!",
            "interview": "Ask probing questions that reveal insights and stories. Build a narrative arc."
        }

        return f"""Transform the following document into a podcast {style} dialogue.

TARGET: {min_turns}-{max_turns} conversational turns.

STYLE REMINDER: {style_instructions.get(style, '')}

DOCUMENT:
{document_text}

Generate the podcast dialogue now as valid JSON."""

    def _call_together_api(
        self,
        messages: List[Dict],
        max_tokens: int,
        temperature: float
    ) -> str:
        """
        Call Together AI API with proper parameters

        Args:
            messages: Chat messages
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature

        Returns:
            Generated text response
        """
        self.total_requests += 1

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=0.9,
                top_k=50,
                repetition_penalty=1.1,
                stop=["</s>", "[END]"]
            )

            # Track token usage
            if hasattr(response, 'usage'):
                self.total_tokens += response.usage.total_tokens

            content = response.choices[0].message.content

            if not content:
                raise ValueError("Empty response from API")

            return content

        except Exception as e:
            raise RuntimeError(f"Together API call failed: {e}")

    def _parse_and_validate_response(
        self,
        response_text: str,
        config: Dict
    ) -> PodcastDialogue:
        """
        Parse and validate the LLM response

        Args:
            response_text: Raw response from LLM
            config: Length configuration

        Returns:
            Validated PodcastDialogue object
        """
        # Try to extract JSON from response
        json_data = self._extract_json(response_text)

        if not json_data:
            # Fallback: try to parse non-JSON format
            print("⚠ JSON parsing failed, attempting fallback parsing...")
            return self._fallback_parse(response_text)

        # Validate structure
        if 'turns' not in json_data:
            raise ValueError("Response missing 'turns' field")

        # Convert to DialogueTurn objects
        turns = []
        for i, turn_data in enumerate(json_data['turns']):
            if 'speaker' not in turn_data or 'text' not in turn_data:
                raise ValueError(f"Turn {i} missing required fields")

            speaker = turn_data['speaker'].lower()
            if speaker not in ['host', 'guest']:
                # Map common variations
                speaker = 'host' if 's1' in speaker or 'speaker 1' in speaker else 'guest'

            turns.append(DialogueTurn(
                speaker=speaker,
                text=turn_data['text'].strip(),
                turn_number=i + 1
            ))

        # Validate turn count
        min_turns, max_turns = config['turns']
        if len(turns) < min_turns * 0.7:  # Allow some flexibility
            print(f"⚠ Warning: Only {len(turns)} turns generated (expected {min_turns}-{max_turns})")

        # Validate speaker alternation
        self._validate_speaker_alternation(turns)

        # Create PodcastDialogue
        dialogue = PodcastDialogue(
            title=json_data.get('title', 'AI-Generated Podcast'),
            turns=turns,
            metadata={
                'model': self.model,
                'total_turns': len(turns),
                'total_tokens': self.total_tokens
            }
        )

        return dialogue

    def _extract_json(self, text: str) -> Optional[Dict]:
        """Extract JSON from response text"""
        # Try direct JSON parsing
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try to find JSON block in text
        patterns = [
            r'\{[\s\S]*\}',  # Any JSON object
            r'```json\s*([\s\S]*?)\s*```',  # Markdown JSON block
            r'```\s*([\s\S]*?)\s*```'  # Generic code block
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                try:
                    json_text = match.group(1) if '```' in pattern else match.group(0)
                    return json.loads(json_text)
                except json.JSONDecodeError:
                    continue

        return None

    def _fallback_parse(self, text: str) -> PodcastDialogue:
        """
        Fallback parser for non-JSON responses
        Attempts to extract dialogue from various formats
        """
        turns = []

        # Try to find speaker patterns
        patterns = [
            r'\[?(HOST|GUEST|Speaker\s*[12]|S[12])\]?\s*:?\s*(.+?)(?=\[?(?:HOST|GUEST|Speaker\s*[12]|S[12])\]?:|$)',
            r'(Host|Guest)\s*:\s*(.+?)(?=(?:Host|Guest)\s*:|$)'
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, text, re.DOTALL | re.IGNORECASE)
            for match in matches:
                speaker_label = match.group(1).strip().lower()
                speaker = 'host' if 'host' in speaker_label or 's1' in speaker_label or 'speaker 1' in speaker_label else 'guest'
                text_content = match.group(2).strip()

                if text_content and len(text_content) > 10:
                    turns.append(DialogueTurn(
                        speaker=speaker,
                        text=text_content,
                        turn_number=len(turns) + 1
                    ))

            if turns:
                break

        if not turns:
            raise ValueError("Could not parse dialogue from response")

        return PodcastDialogue(
            title="AI-Generated Podcast",
            turns=turns,
            metadata={'model': self.model, 'parsed_with_fallback': True}
        )

    def _validate_speaker_alternation(self, turns: List[DialogueTurn]) -> None:
        """
        Validate that speakers alternate reasonably
        Allows some consecutive turns from same speaker (natural conversation)
        """
        consecutive_count = 1
        max_consecutive = 3

        for i in range(1, len(turns)):
            if turns[i].speaker == turns[i-1].speaker:
                consecutive_count += 1
                if consecutive_count > max_consecutive:
                    print(f"⚠ Warning: Speaker {turns[i].speaker} has {consecutive_count} consecutive turns")
            else:
                consecutive_count = 1

    def get_statistics(self) -> Dict:
        """Get generation statistics"""
        return {
            'total_requests': self.total_requests,
            'failed_requests': self.failed_requests,
            'success_rate': (self.total_requests - self.failed_requests) / max(self.total_requests, 1) * 100,
            'total_tokens': self.total_tokens,
            'current_model': self.model
        }

    def reset_statistics(self):
        """Reset statistics counters"""
        self.total_requests = 0
        self.failed_requests = 0
        self.total_tokens = 0


if __name__ == "__main__":
    print("LLM Generator with Style-Specific Prompts ready")
