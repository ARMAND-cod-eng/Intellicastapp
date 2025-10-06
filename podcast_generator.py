"""
NotebookLM-Style Podcast Generator using Together AI
Generates engaging two-host podcast conversations from documents
"""

import os
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
from together import Together
from dotenv import load_dotenv
from usage_tracker import get_tracker

load_dotenv()


@dataclass
class PodcastScript:
    """Structured podcast script output"""
    title: str
    intro: str
    dialogue: List[Dict[str, str]]  # [{'speaker': 'S1', 'text': '...'}]
    outro: str
    total_turns: int
    estimated_duration: int  # seconds
    metadata: Dict


class NotebookLMPodcastGenerator:
    """
    Generates NPR-style podcast conversations from documents
    Uses Together AI's Llama-3-70b with optimized prompting
    """

    # System prompts for different podcast formats
    SYSTEM_PROMPT_2_SPEAKERS = """You are a world-class podcast producer tasked with transforming the provided input text into an engaging and informative podcast dialogue between two hosts.

The podcast should:
- Be conversational, engaging, and accessible to a general audience
- Feature two distinct hosts with natural chemistry and personality
- Include natural speech patterns: "umm", "you know", "I mean", occasional interruptions
- Have the expert/guest (Speaker 2) speak about 60% of the time, host (Speaker 1) 40%
- Include "aha!" moments where hosts make connections or realizations
- Use analogies and metaphors to explain complex concepts
- Show enthusiasm and curiosity from both hosts
- Build on each other's points naturally
- Include moments of clarification when needed
- Reference the source material naturally without being repetitive

Speaker 1 (Host/Interviewer):
- Asks insightful questions
- Guides the conversation
- Represents the curious listener
- Makes connections to broader implications
- Occasionally shares relatable reactions

Speaker 2 (Expert/Guest):
- Provides detailed explanations and insights
- Shares expertise on the topic
- Uses examples and analogies
- Shows passion for the subject
- Responds to host's questions thoughtfully

Format your output EXACTLY as follows:
[TITLE] A catchy, descriptive title for the podcast episode

[INTRO] A brief 1-2 sentence introduction to the topic

[DIALOGUE]
[S1] Host's opening statement or question
[S2] Guest's response with insight and detail
[S1] Follow-up question or reaction
[S2] Further explanation with examples
... continue the natural conversation ...

[OUTRO] A brief 1-2 sentence conclusion wrapping up the discussion

Guidelines:
- Aim for 15-25 conversational turns
- Each turn should be 2-4 sentences (natural speaking length)
- Use contractions and casual language
- Include verbal thinking: "That's interesting because...", "What I find fascinating is..."
- Show personality: excitement, curiosity, surprise
- Make it feel like two smart friends discussing something fascinating
- Don't just summarize - analyze, question, and explore implications
"""

    SYSTEM_PROMPT_3_SPEAKERS = """You are a world-class podcast producer tasked with transforming the provided input text into an engaging and dynamic podcast dialogue between THREE hosts.

The podcast should:
- Feature three distinct personalities with great chemistry and natural banter
- Create a dynamic, multi-perspective conversation with varied viewpoints
- Include natural speech patterns, interruptions, and cross-talk between all three
- Distribute speaking time: Speaker 1 (25%), Speaker 2 (40%), Speaker 3 (35%)
- Build on each other's insights with "Yes, and..." or "But also consider..."
- Show spontaneous reactions, agreements, and respectful disagreements
- Create moments where two speakers discuss while the third listens, then contributes
- Include natural transitions between speakers
- Use humor, enthusiasm, and genuine curiosity
- Reference each other by role occasionally ("As the expert mentioned...", "Building on that...")

Speaker 1 (Host/Moderator - 25% speaking time):
- Guides the overall conversation flow
- Asks clarifying questions for the audience
- Connects different parts of the discussion
- Moderates when speakers disagree
- Keeps the conversation on track
- Introduces new angles or topics
- Summarizes key points

Speaker 2 (Primary Expert/Main Guest - 40% speaking time):
- Provides deep expertise and detailed explanations
- Shares the most technical or specialized insights
- Uses examples, case studies, and analogies
- Responds to questions from both other speakers
- Shows passion and authority on the subject
- Challenges assumptions when appropriate

Speaker 3 (Co-Host/Analyst - 35% speaking time):
- Offers alternative perspectives and analysis
- Plays devil's advocate when beneficial
- Connects topics to broader contexts
- Adds practical applications or real-world examples
- Builds bridges between Speaker 1 and Speaker 2
- Brings in complementary expertise
- Adds energy and variety to the discussion

Format your output EXACTLY as follows:
[TITLE] A catchy, descriptive title for the podcast episode

[INTRO] A brief 1-2 sentence introduction to the topic (spoken by S1)

[DIALOGUE]
[S1] Host's opening statement or question to frame the discussion
[S2] Primary expert begins with core insights
[S3] Co-host adds perspective or alternative angle
[S1] Follow-up question or connects ideas
[S2] Deeper explanation with examples
[S3] Builds on or challenges the point
[S1] Asks for clarification for listeners
[S2] Responds with analogy or case study
[S3] Adds practical application or implications
... continue the dynamic three-way conversation ...

[OUTRO] A brief 1-2 sentence conclusion (can involve all three wrapping up)

Guidelines:
- Aim for 20-30 conversational turns (more variety with 3 speakers)
- Each turn should be 2-4 sentences (natural speaking length)
- Vary the speaker order - don't always go S1->S2->S3
- Include moments where S2 and S3 discuss directly
- Show organic conversation flow with natural transitions
- Use contractions and casual language
- Include collaborative thinking: "That's exactly right, and...", "Interesting point, though I'd add..."
- Create "light bulb" moments where speakers realize connections together
- Make it feel like three smart, engaged people having a fascinating discussion
- Don't just take turns - create real dialogue with responses to each other
"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the podcast generator"""
        self.api_key = api_key or os.getenv('TOGETHER_API_KEY')
        if not self.api_key:
            raise ValueError("TOGETHER_API_KEY not found in environment")

        self.client = Together(api_key=self.api_key)
        self.model = os.getenv('TOGETHER_CONVERSATION_MODEL', 'meta-llama/Llama-3-70b-chat-hf')
        self.tracker = get_tracker()

    def process_document(self, document_text: str, max_length: int = 4000) -> str:
        """
        Process and prepare document text for podcast generation

        Args:
            document_text: Raw document text
            max_length: Maximum character length (to fit in context)

        Returns:
            Processed document text
        """
        # Clean up text
        text = document_text.strip()

        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)

        # Truncate if too long, try to break at paragraph
        if len(text) > max_length:
            text = text[:max_length]
            # Try to end at last complete paragraph
            last_para = text.rfind('\n\n')
            if last_para > max_length * 0.8:
                text = text[:last_para]
            else:
                # End at last sentence
                last_period = text.rfind('.')
                if last_period > max_length * 0.8:
                    text = text[:last_period + 1]

        return text

    def generate_podcast_script(
        self,
        document_text: str,
        num_speakers: int = 2,
        temperature: float = 0.8,
        max_tokens: int = 4000
    ) -> PodcastScript:
        """
        Generate podcast script from document

        Args:
            document_text: Input document to convert to podcast
            num_speakers: Number of speakers (2 or 3)
            temperature: Sampling temperature (higher = more creative)
            max_tokens: Maximum tokens to generate

        Returns:
            PodcastScript object with structured dialogue
        """
        # Validate num_speakers
        if num_speakers not in [2, 3]:
            raise ValueError("num_speakers must be 2 or 3")

        # Select appropriate system prompt
        system_prompt = self.SYSTEM_PROMPT_2_SPEAKERS if num_speakers == 2 else self.SYSTEM_PROMPT_3_SPEAKERS

        # Process document
        processed_text = self.process_document(document_text)

        # Create user prompt
        speaker_text = "two hosts" if num_speakers == 2 else "three hosts"
        user_prompt = f"""Transform the following text into an engaging podcast conversation with {speaker_text}:

<document>
{processed_text}
</document>

Create a natural, insightful dialogue that explores the key ideas, implications, and interesting aspects of this content. Make it conversational and engaging!"""

        # Generate with Together AI
        print(f"[GEN] Generating {num_speakers}-speaker podcast script with Llama-3-70b...")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=0.9,
                top_k=50,
                repetition_penalty=1.1
            )

            script_text = response.choices[0].message.content

            # Track usage
            if hasattr(response, 'usage'):
                self.tracker.track_generation(
                    service='llm',
                    model=self.model,
                    tokens_used=response.usage.total_tokens,
                    operation='podcast_script_generation',
                    metadata={
                        'input_length': len(processed_text),
                        'temperature': temperature,
                        'num_speakers': num_speakers
                    }
                )

            # Parse the generated script
            podcast_script = self._parse_script(script_text, num_speakers)

            print(f"[OK] Generated {podcast_script.total_turns} turns")
            print(f"[OK] Estimated duration: {podcast_script.estimated_duration}s")

            return podcast_script

        except Exception as e:
            raise Exception(f"Failed to generate podcast script: {e}")

    def _parse_script(self, script_text: str, num_speakers: int = 2) -> PodcastScript:
        """
        Parse the generated script into structured format

        Args:
            script_text: Raw script from LLM
            num_speakers: Number of speakers in the podcast

        Returns:
            PodcastScript object
        """
        # Extract sections
        title = self._extract_section(script_text, 'TITLE')
        intro = self._extract_section(script_text, 'INTRO')
        outro = self._extract_section(script_text, 'OUTRO')
        dialogue_text = self._extract_section(script_text, 'DIALOGUE')

        # Parse dialogue turns
        dialogue = self._parse_dialogue(dialogue_text, num_speakers)

        # Estimate duration (average 150 words per minute, 5 chars per word)
        total_chars = sum(len(turn['text']) for turn in dialogue)
        estimated_words = total_chars / 5
        estimated_duration = int((estimated_words / 150) * 60)

        return PodcastScript(
            title=title or "AI Podcast",
            intro=intro or "",
            dialogue=dialogue,
            outro=outro or "",
            total_turns=len(dialogue),
            estimated_duration=estimated_duration,
            metadata={
                'model': self.model,
                'total_characters': total_chars,
                'num_speakers': num_speakers
            }
        )

    def _extract_section(self, text: str, section_name: str) -> str:
        """Extract a labeled section from the script"""
        pattern = rf'\[{section_name}\]\s*(.*?)(?=\[|$)'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return ""

    def _parse_dialogue(self, dialogue_text: str, num_speakers: int = 2) -> List[Dict[str, str]]:
        """
        Parse dialogue into structured turns

        Args:
            dialogue_text: Raw dialogue text with [S1] [S2] or [S1] [S2] [S3] tags
            num_speakers: Number of speakers (2 or 3)

        Returns:
            List of dialogue turns
        """
        dialogue = []

        # Build pattern based on number of speakers
        if num_speakers == 2:
            pattern = r'\[(S[12])\]\s*(.*?)(?=\[S[12]\]|$)'
        else:  # 3 speakers
            pattern = r'\[(S[123])\]\s*(.*?)(?=\[S[123]\]|$)'

        matches = re.finditer(pattern, dialogue_text, re.DOTALL)

        for match in matches:
            speaker = match.group(1)
            text = match.group(2).strip()

            if text:
                dialogue.append({
                    'speaker': speaker,
                    'text': text
                })

        return dialogue

    def save_script(self, script: PodcastScript, output_path: str):
        """
        Save podcast script to file

        Args:
            script: PodcastScript object
            output_path: Path to save script
        """
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Determine speaker names based on number of speakers
        num_speakers = script.metadata.get('num_speakers', 2)
        speaker_names = {}
        if num_speakers == 2:
            speaker_names = {'S1': 'Host', 'S2': 'Guest'}
        else:  # 3 speakers
            speaker_names = {'S1': 'Host', 'S2': 'Expert', 'S3': 'Co-Host'}

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"# {script.title}\n\n")
            f.write(f"**Estimated Duration:** {script.estimated_duration // 60}m {script.estimated_duration % 60}s\n")
            f.write(f"**Total Turns:** {script.total_turns}\n")
            f.write(f"**Speakers:** {num_speakers}\n\n")

            if script.intro:
                f.write(f"## Introduction\n\n{script.intro}\n\n")

            f.write(f"## Dialogue\n\n")

            for i, turn in enumerate(script.dialogue, 1):
                speaker_name = speaker_names.get(turn['speaker'], turn['speaker'])
                f.write(f"**{speaker_name}:** {turn['text']}\n\n")

            if script.outro:
                f.write(f"## Conclusion\n\n{script.outro}\n")

        print(f"[OK] Script saved to: {output_file}")

    def export_for_tts(self, script: PodcastScript) -> List[Dict[str, str]]:
        """
        Export script in format ready for TTS processing

        Args:
            script: PodcastScript object

        Returns:
            List of TTS segments with speaker and text
        """
        tts_segments = []

        # Add intro if present
        if script.intro:
            tts_segments.append({
                'speaker': 'S1',
                'text': script.intro,
                'segment_type': 'intro'
            })

        # Add dialogue
        for turn in script.dialogue:
            tts_segments.append({
                'speaker': turn['speaker'],
                'text': turn['text'],
                'segment_type': 'dialogue'
            })

        # Add outro if present
        if script.outro:
            tts_segments.append({
                'speaker': 'S1',
                'text': script.outro,
                'segment_type': 'outro'
            })

        return tts_segments


def main():
    """Test the podcast generator"""

    # Sample document about AI
    sample_document = """
Artificial Intelligence and the Future of Work

The rise of artificial intelligence is transforming how we work, but not in the way many people fear.
Rather than simply replacing human workers, AI is creating new opportunities for human-AI collaboration
that amplifies human creativity and decision-making.

Recent studies show that workers who use AI tools are 40% more productive than those who don't. The key
is understanding that AI excels at pattern recognition and data processing, while humans bring creativity,
emotional intelligence, and strategic thinking to the table.

Take healthcare as an example. AI can analyze thousands of medical images in seconds, identifying potential
issues that might take human doctors hours to find. But the doctor still makes the final diagnosis,
considering the patient's full context, medical history, and individual circumstances that AI might miss.

The challenge isn't whether AI will replace jobs - it's ensuring workers have the skills to work alongside
AI systems. Companies that invest in training their employees to use AI tools effectively are seeing
remarkable results: higher job satisfaction, better work-life balance, and improved business outcomes.

The future of work isn't human versus machine. It's human plus machine, each doing what they do best.
"""

    # Initialize generator
    generator = NotebookLMPodcastGenerator()

    # Generate podcast script
    print("="*70)
    print("Testing NotebookLM Podcast Generator")
    print("="*70)

    script = generator.generate_podcast_script(
        document_text=sample_document,
        temperature=0.8,
        max_tokens=3000
    )

    # Display results
    print(f"\n{'='*70}")
    print(f"GENERATED PODCAST SCRIPT")
    print(f"{'='*70}\n")

    print(f"Title: {script.title}")
    print(f"Duration: ~{script.estimated_duration // 60}m {script.estimated_duration % 60}s")
    print(f"Turns: {script.total_turns}\n")

    if script.intro:
        print(f"INTRO:\n{script.intro}\n")

    print("DIALOGUE:")
    for i, turn in enumerate(script.dialogue, 1):
        speaker_name = "HOST" if turn['speaker'] == 'S1' else "GUEST"
        print(f"\n[{speaker_name}] {turn['text']}")

    if script.outro:
        print(f"\nOUTRO:\n{script.outro}")

    # Save script
    output_path = Path(__file__).parent / 'backend/audio/test/test_script.md'
    generator.save_script(script, str(output_path))

    # Export for TTS
    tts_segments = generator.export_for_tts(script)
    print(f"\n[OK] Ready for TTS: {len(tts_segments)} segments")

    print(f"\n{'='*70}\n")


if __name__ == "__main__":
    main()
