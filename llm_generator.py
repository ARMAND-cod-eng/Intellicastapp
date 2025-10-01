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


# NotebookLM-style system prompt optimized for Together AI
NOTEBOOKLM_SYSTEM_PROMPT = """You are an expert podcast script writer creating engaging, natural conversations in the style of high-quality educational podcasts like RadioLab or NPR's Hidden Brain.

Your task is to transform input documents into dynamic two-person dialogues between a HOST and a GUEST.

CHARACTER PROFILES:

HOST (Speaker 1):
- Curious, asks insightful questions
- Guides the conversation naturally
- Represents the intelligent listener
- Makes connections to broader themes
- 40% of speaking time
- Uses phrases like: "That's fascinating...", "So what you're saying is...", "Help me understand..."

GUEST (Speaker 2):
- Expert on the topic with deep knowledge
- Explains concepts clearly with examples
- Shows genuine enthusiasm for the subject
- Uses analogies and metaphors
- 60% of speaking time
- Uses phrases like: "What's interesting is...", "Think of it like...", "The key thing to understand..."

CONVERSATION STYLE:
✓ Natural speech patterns with contractions ("it's", "we're", "that's")
✓ Verbal thinking markers ("you know", "I mean", "actually", "basically")
✓ Occasional hesitations and self-corrections for authenticity
✓ Building on each other's points
✓ "Aha!" moments where understanding clicks
✓ Questions that drive deeper exploration
✓ Analogies that make complex ideas accessible
✓ Enthusiasm and genuine curiosity
✓ Natural interruptions or extensions of ideas

AVOID:
✗ Formal academic language
✗ Robotic turn-taking
✗ Simply restating document content
✗ Boring Q&A format
✗ Overly technical jargon without explanation
✗ Lack of personality or emotion

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "title": "Engaging title for the episode",
  "turns": [
    {"speaker": "host", "text": "Opening statement or question"},
    {"speaker": "guest", "text": "Insightful response with detail"},
    {"speaker": "host", "text": "Follow-up or reaction"},
    {"speaker": "guest", "text": "Further explanation with examples"}
  ]
}

IMPORTANT:
- Create 15-25 turns total
- Each turn should be 2-5 sentences (natural speaking chunks)
- Alternate between host and guest naturally
- Make it feel like two smart friends exploring a fascinating topic
- Focus on insights and implications, not just facts
- End with a satisfying conclusion that wraps up key themes"""


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
        custom_prompt: Optional[str] = None
    ) -> PodcastDialogue:
        """
        Generate podcast dialogue from document text

        Args:
            document_text: Source document to convert
            length: Target length ("5min", "10min", "15min", "20min")
            temperature: Sampling temperature (0.0-1.0, higher = more creative)
            custom_prompt: Optional custom system prompt (overrides default)

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

        # Get configuration
        config = self.LENGTH_CONFIGS[length]
        system_prompt = custom_prompt or NOTEBOOKLM_SYSTEM_PROMPT

        # Prepare messages
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": self._create_user_prompt(document_text, config)}
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

    def _create_user_prompt(self, document_text: str, config: Dict) -> str:
        """Create user prompt with document and instructions"""
        min_turns, max_turns = config["turns"]

        return f"""Transform the following document into an engaging podcast conversation.

TARGET: {min_turns}-{max_turns} conversational turns between host and guest.

DOCUMENT:
{document_text}

Remember:
- Make it conversational and natural
- Include verbal thinking and reactions
- Use analogies to explain complex ideas
- Show genuine curiosity and enthusiasm
- Build insights, don't just summarize
- Return valid JSON format as specified

Generate the podcast dialogue now:"""

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
            # Note: Together AI SDK doesn't support response_format in chat.completions
            # We'll use prompt engineering to encourage JSON output
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


def main():
    """Test the LLM generator"""

    # Sample document
    sample_doc = """
The Science of Sleep and Memory

Recent neuroscience research has revealed that sleep plays a crucial role in memory consolidation,
but the mechanisms are more sophisticated than previously thought.

During deep sleep, the brain replays experiences from the day, strengthening neural connections
associated with important memories while pruning away less relevant ones. This process, called
synaptic homeostasis, prevents the brain from becoming saturated with information.

The hippocampus, often called the brain's "save button," transfers temporary memories to the
cortex for long-term storage during specific sleep stages. REM sleep appears particularly
important for emotional memory processing and creative problem-solving.

Interestingly, studies show that targeted memory reactivation—playing sounds or scents
associated with learning during sleep—can enhance memory consolidation. This opens
possibilities for optimizing learning through sleep interventions.

The modern epidemic of sleep deprivation has serious cognitive consequences. Even moderate
sleep loss impairs memory formation, decision-making, and emotional regulation. The brain
simply cannot perform its essential maintenance functions without adequate sleep.
"""

    print("="*70)
    print("Together AI LLM Generator - Test")
    print("="*70 + "\n")

    # Initialize generator
    generator = TogetherLLMGenerator()

    # Test 1: Generate 10-minute dialogue
    print("Test 1: Generating 10-minute podcast dialogue...\n")

    try:
        dialogue = generator.generate_podcast_dialogue(
            document_text=sample_doc,
            length="10min",
            temperature=0.8
        )

        print(f"\n{'='*70}")
        print(f"GENERATED DIALOGUE")
        print(f"{'='*70}\n")
        print(f"Title: {dialogue.title}")
        print(f"Total Turns: {len(dialogue.turns)}\n")

        for turn in dialogue.turns[:5]:  # Show first 5 turns
            speaker_name = turn.speaker.upper()
            print(f"[{speaker_name}] {turn.text}\n")

        if len(dialogue.turns) > 5:
            print(f"... ({len(dialogue.turns) - 5} more turns)\n")

        # Export to JSON
        json_output = dialogue.to_json()
        output_path = "backend/audio/test/generated_dialogue.json"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(json_output)

        print(f"✓ Saved to: {output_path}")

        # Show statistics
        stats = generator.get_statistics()
        print(f"\nStatistics:")
        print(f"  Requests: {stats['total_requests']}")
        print(f"  Success Rate: {stats['success_rate']:.1f}%")
        print(f"  Total Tokens: {stats['total_tokens']}")
        print(f"  Model: {stats['current_model']}")

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

    print(f"\n{'='*70}\n")


if __name__ == "__main__":
    main()
