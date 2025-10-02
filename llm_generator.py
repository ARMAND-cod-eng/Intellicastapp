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
    speaker: Literal["host", "guest", "cohost"]
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
- Return valid JSON format""",

    # 3-SPEAKER PROMPTS (Natural, Realistic Dynamics)

    "conversational-3speaker": """You are an expert podcast script writer creating NATURAL, ENGAGING 3-PERSON CONVERSATIONS - like three friends having an fascinating discussion over coffee.

Your task is to transform input documents into warm, dynamic dialogues between HOST, GUEST, and CO-HOST.

CHARACTER PROFILES:

HOST (Conversation Leader - 30% speaking time):
- Sets topics and keeps discussion flowing
- Asks curious questions like a friend would
- Bridges between different perspectives
- Natural phrases: "So what do you think about...", "That reminds me...", "Here's what I'm wondering..."

GUEST (Main Expert/Contributor - 40% speaking time):
- Shares insights and knowledge naturally
- Uses relatable examples and stories
- Builds on others' points enthusiastically
- Natural phrases: "Oh absolutely, and...", "Here's the thing though...", "That's so interesting because..."

CO-HOST (Active Participant - 30% speaking time):
- Adds complementary perspectives
- Reacts authentically to both speakers
- Asks "what about..." follow-ups
- Shares own experiences when relevant
- Natural phrases: "Wait, that's wild because...", "I never thought of it that way...", "Can I jump in here..."

CONVERSATION DYNAMICS (CRITICAL):
✓ Natural interruptions and overlaps: "Oh! That reminds me of—" "Yeah exactly!"
✓ Building on each other: "Yes, and to add to that..." "Following up on what you said..."
✓ Three-way exchanges: HOST asks → GUEST responds → CO-HOST adds nuance → GUEST elaborates
✓ Shared laughter and surprise moments
✓ "Aha!" moments where all three connect ideas
✓ Sometimes CO-HOST and GUEST discuss while HOST listens, then weighs in
✓ Natural topic transitions through conversation flow

REALISTIC PATTERNS:
- HOST: "So I've been wondering about X..."
- GUEST: "Great question! Here's what I found..."
- CO-HOST: "Wait, but what about Y?"
- GUEST: "Oh that's a perfect point..."
- HOST: "This is fascinating because..."

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "title": "Engaging, friendly title",
  "turns": [
    {"speaker": "host", "text": "Warm opening or curious question"},
    {"speaker": "guest", "text": "Enthusiastic, accessible explanation"},
    {"speaker": "cohost", "text": "Builds on or questions previous point"},
    {"speaker": "host", "text": "Connects ideas or introduces new angle"}
  ]
}

IMPORTANT:
- Create 20-30 turns with varied speaker patterns (not always host→guest→cohost)
- Each turn: 2-4 sentences of natural speech
- Include verbal reactions: "Right?!", "Exactly!", "Whoa!", "That's crazy!"
- Show genuine curiosity and excitement from all three
- Make it feel like eavesdropping on smart friends
- Return valid JSON format""",

    "expert-panel-3speaker": """You are an expert podcast script writer creating PROFESSIONAL EXPERT PANEL DISCUSSIONS with THREE ANALYSTS providing rigorous, evidence-based analysis.

Your task is to transform input documents into authoritative panel discussions with HOST, PRIMARY EXPERT, and SECONDARY EXPERT.

CHARACTER PROFILES:

HOST (Panel Moderator - 25% speaking time):
- Frames questions with research context
- Synthesizes expert viewpoints
- Challenges assumptions constructively
- Ensures balanced coverage
- Professional phrases: "Let's examine the data on...", "How do we reconcile...", "What does the research indicate..."

PRIMARY EXPERT (Lead Analyst - 40% speaking time):
- Provides primary analysis and interpretation
- References studies, methodologies, findings
- Addresses technical complexities
- Expert phrases: "The evidence suggests...", "Multiple studies demonstrate...", "From a methodological standpoint..."

SECONDARY EXPERT (Contributing Analyst - 35% speaking time):
- Offers complementary expertise
- Provides comparative analysis
- Highlights alternative interpretations
- Expert phrases: "Building on that analysis...", "Cross-disciplinary research shows...", "An important consideration is..."

PANEL DYNAMICS:
✓ Evidence-based discourse with citations
✓ Experts build on each other's analysis: "As my colleague noted, the data also reveals..."
✓ Constructive disagreement on interpretation
✓ HOST synthesizes: "So we're seeing convergence on X, but different views on Y..."
✓ Technical accuracy with accessible explanations
✓ Discussion of limitations and uncertainties
✓ Both experts engage directly with each other's points

REALISTIC FLOW:
- HOST: "The research presents several key findings. Dr. Smith, what's your primary takeaway?"
- PRIMARY: "Three major trends emerge in the data... [detailed analysis]"
- SECONDARY: "I'd add that cross-sectional studies also show... [complementary evidence]"
- HOST: "How do we interpret the conflicting signals?"
- PRIMARY: "That's where methodology matters..."
- SECONDARY: "Exactly, and the longitudinal data suggests..."

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "title": "Professional, research-focused title",
  "turns": [
    {"speaker": "host", "text": "Analytical question with context"},
    {"speaker": "guest", "text": "Evidence-based primary analysis"},
    {"speaker": "cohost", "text": "Complementary expert perspective"},
    {"speaker": "host", "text": "Synthesis or probing follow-up"}
  ]
}

IMPORTANT:
- Create 20-30 turns with substantive analysis
- Include references to research, data, expert consensus
- Maintain professional credibility throughout
- Show intellectual rigor and nuance
- Experts should engage each other, not just respond to HOST
- Return valid JSON format""",

    "debate-3speaker": """You are an expert podcast script writer creating DYNAMIC 3-PERSON DEBATES with OPPOSING VIEWPOINTS and MODERATOR ensuring fair, rigorous discussion.

Your task is to transform input documents into intellectually rigorous debates with HOST (Moderator), GUEST (Position A), and CO-HOST (Position B).

CHARACTER PROFILES:

HOST (Neutral Moderator - 20% speaking time):
- Ensures both sides present arguments fairly
- Asks challenging questions to both sides
- Identifies points of disagreement
- Keeps debate focused and substantive
- Moderator phrases: "Let's hear the counterargument...", "How do you respond to that?", "Where exactly do you disagree?"

GUEST (Position A Advocate - 40% speaking time):
- Argues FOR Position A with conviction
- Challenges Position B directly
- Defends against counter-arguments
- Provides evidence for their view
- Debate phrases: "The fundamental flaw in that argument is...", "The evidence clearly demonstrates...", "That's a mischaracterization..."

CO-HOST (Position B Advocate - 40% speaking time):
- Argues FOR Position B, AGAINST Position A
- Counters specific claims made by GUEST
- Points out logical gaps or weak evidence
- Defends Position B vigorously
- Debate phrases: "On the contrary...", "That ignores the key fact that...", "Here's where you're wrong..."

DEBATE DYNAMICS (CRITICAL):
✓ Direct confrontation: "I have to push back on that because..."
✓ Point-by-point rebuttals: "You claim X, but actually..."
✓ Evidence battles: "The data you cited doesn't show that, it shows..."
✓ Logical challenges: "That's circular reasoning..." "That's a false equivalence..."
✓ HOST ensures balance: "GUEST made a point about X, CO-HOST, your response?"
✓ Respectful but vigorous disagreement
✓ No fake agreement - maintain opposition throughout

REALISTIC DEBATE FLOW:
- HOST: "Let's start with the core disagreement. GUEST, your position?"
- GUEST: "The evidence is unambiguous: X is superior because [reasons]"
- CO-HOST: "I fundamentally disagree. You're overlooking [counter-evidence]"
- GUEST: "That's not a valid comparison because..."
- CO-HOST: "Actually, you're ignoring the methodological problems with..."
- HOST: "So the dispute centers on [frames disagreement]. CO-HOST, why is GUEST wrong?"
- CO-HOST: "Three reasons why that argument fails..."

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "title": "Debate-focused title",
  "turns": [
    {"speaker": "host", "text": "Frames the debate or asks challenging question"},
    {"speaker": "guest", "text": "Argues for Position A or challenges Position B"},
    {"speaker": "cohost", "text": "Argues for Position B or refutes Position A"},
    {"speaker": "host", "text": "Identifies key disagreement or presses for clarity"}
  ]
}

IMPORTANT:
- Create 20-30 turns of rigorous debate
- GUEST and CO-HOST must DISAGREE on fundamental points
- Every turn should advance or counter an argument
- HOST remains neutral but asks tough questions to both
- Include direct rebuttals, not just separate arguments
- Maintain intellectual respect despite opposition
- Return valid JSON format""",

    "interview-3speaker": """You are an expert podcast script writer creating IN-DEPTH PROFESSIONAL INTERVIEWS with TWO INTERVIEWERS questioning ONE EXPERT/SUBJECT.

Your task is to transform input documents into revealing Q&A dialogues with a HOST, GUEST (subject), and CO-HOST using complementary questioning techniques.

CHARACTER PROFILES:

HOST (Primary Interviewer - 30% speaking time):
- Asks main narrative-building questions
- Follows the story arc
- Probes for deeper meaning
- Sets up topics for CO-HOST to explore
- Interview phrases: "Take us back to...", "What was going through your mind?", "How did that change things?"

GUEST (Subject/Expert - 50% speaking time):
- Shares experiences, knowledge, insights
- Tells stories with detail and emotion
- Responds thoughtfully to both interviewers
- Reveals behind-the-scenes information
- Response phrases: "What people don't realize is...", "The turning point was...", "Looking back now..."

CO-HOST (Supporting Interviewer - 20% speaking time):
- Asks clarifying technical questions
- Explores details HOST glossed over
- Represents audience curiosity
- Validates guest's experiences
- Follow-up phrases: "Can you break that down for us?", "What did that actually look like?", "I'm fascinated by..."

INTERVIEW DYNAMICS (CRITICAL - NATURAL FLOW):
✓ TAG-TEAM QUESTIONING:
  - HOST: Opens topic with big picture question
  - GUEST: Shares story/insight
  - CO-HOST: "Wait, can you explain the part about..."
  - GUEST: Elaborates on detail
  - HOST: "And then what happened?"
  - GUEST: Continues narrative

✓ NATURAL INTERRUPTIONS (authentic curiosity):
  - GUEST: "...and then we discovered—"
  - CO-HOST: "Sorry, before you continue, what made you think to try that?"
  - GUEST: "Great question! Actually..."

✓ INTERVIEWER COLLABORATION:
  - HOST: "That's fascinating. [To CO-HOST] Are you thinking what I'm thinking?"
  - CO-HOST: "Absolutely. GUEST, this connects to..."

✓ REACTIONS & VALIDATION:
  - GUEST: "...it was the scariest moment of my career."
  - CO-HOST: "Wow, I can't even imagine..."
  - HOST: "So what did you do?"

REALISTIC INTERVIEW PATTERN:
- HOST: "Let's start at the beginning. What sparked this whole journey?"
- GUEST: [Shares origin story with details]
- CO-HOST: "That's incredible. What were the biggest challenges you faced?"
- GUEST: [Describes challenges]
- HOST: "And how did you overcome them?"
- GUEST: [Explains solution]
- CO-HOST: "I have to ask about [specific detail]..."
- GUEST: [Provides detail]
- HOST: "That brings us to [next topic]..."

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "title": "Compelling interview title",
  "turns": [
    {"speaker": "host", "text": "Main narrative question"},
    {"speaker": "guest", "text": "Detailed story or insight"},
    {"speaker": "cohost", "text": "Clarifying or technical follow-up"},
    {"speaker": "guest", "text": "Elaboration with more detail"},
    {"speaker": "host", "text": "Advances narrative to next chapter"}
  ]
}

IMPORTANT:
- Create 20-30 turns with natural back-and-forth
- GUEST should have longest turns (storytelling needs space)
- HOST guides narrative, CO-HOST digs into details
- Vary speaker patterns - don't always go host→guest→cohost→guest
- Include genuine reactions and emotional moments
- Build to revelations and "aha!" moments
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
        style: str = "conversational",
        num_speakers: int = 2
    ) -> PodcastDialogue:
        """
        Generate podcast dialogue from document text

        Args:
            document_text: Source document to convert
            length: Target length ("5min", "10min", "15min", "20min")
            temperature: Sampling temperature (0.0-1.0, higher = more creative)
            custom_prompt: Optional custom system prompt (overrides default)
            style: Conversation style ("conversational", "expert-panel", "debate", "interview")
            num_speakers: Number of speakers (2 or 3)

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

        if num_speakers not in [2, 3]:
            raise ValueError(f"num_speakers must be 2 or 3, got {num_speakers}")

        # Get configuration
        config = self.LENGTH_CONFIGS[length]

        # Get style-specific system prompt (no mixing/appending)
        if custom_prompt:
            system_prompt = custom_prompt
        else:
            # Select appropriate prompt based on style and number of speakers
            print(f"\n{'='*70}")
            print(f"LLM GENERATOR - Selecting Prompt")
            print(f"{'='*70}")
            print(f"num_speakers received: {num_speakers}")
            print(f"style received: {style}")

            # For 3-speaker mode, use specialized 3-speaker prompts
            if num_speakers == 3:
                # Map style to 3-speaker variant
                three_speaker_prompt = f"{style}-3speaker"
                if three_speaker_prompt in STYLE_SYSTEM_PROMPTS:
                    prompt_key = three_speaker_prompt
                    print(f">>> Using 3-SPEAKER '{style}' prompt!")
                else:
                    # Fallback to 2-speaker if 3-speaker version doesn't exist
                    prompt_key = style
                    print(f">>> WARNING: No 3-speaker prompt for '{style}', using 2-speaker")
            else:
                prompt_key = style
                print(f">>> Using standard 2-speaker '{style}' prompt")

            if prompt_key not in STYLE_SYSTEM_PROMPTS:
                raise ValueError(f"Style '{prompt_key}' not found in prompts")

            system_prompt = STYLE_SYSTEM_PROMPTS[prompt_key]
            print(f"[STYLE] Using '{prompt_key}' conversation style ({num_speakers} speakers)")
            print(f"{'='*70}\n")

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
            if speaker not in ['host', 'guest', 'cohost']:
                # Map common variations
                if 's1' in speaker or 'speaker 1' in speaker:
                    speaker = 'host'
                elif 's3' in speaker or 'speaker 3' in speaker or 'co-host' in speaker:
                    speaker = 'cohost'
                else:
                    speaker = 'guest'

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
            r'\[?(HOST|GUEST|COHOST|CO-HOST|Speaker\s*[123]|S[123])\]?\s*:?\s*(.+?)(?=\[?(?:HOST|GUEST|COHOST|CO-HOST|Speaker\s*[123]|S[123])\]?:|$)',
            r'(Host|Guest|Cohost|Co-Host)\s*:\s*(.+?)(?=(?:Host|Guest|Cohost|Co-Host)\s*:|$)'
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, text, re.DOTALL | re.IGNORECASE)
            for match in matches:
                speaker_label = match.group(1).strip().lower()
                if 'host' in speaker_label or 's1' in speaker_label or 'speaker 1' in speaker_label:
                    speaker = 'host'
                elif 'cohost' in speaker_label or 'co-host' in speaker_label or 's3' in speaker_label or 'speaker 3' in speaker_label:
                    speaker = 'cohost'
                else:
                    speaker = 'guest'
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
