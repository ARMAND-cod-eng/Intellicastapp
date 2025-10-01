"""
Together AI NotebookLM Podcast Pipeline
Complete end-to-end podcast generation system
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from dotenv import load_dotenv

# Import our modules
from llm_generator import TogetherLLMGenerator, PodcastDialogue
from tts_generator import TogetherTTSGenerator, CartesiaTTSGenerator
from usage_tracker import TogetherUsageTracker, get_tracker
from config import Config, init_config

load_dotenv()


@dataclass
class PodcastOptions:
    """Configuration options for podcast generation"""
    length: str = "10min"  # "5min", "10min", "15min", "20min"
    host_voice: str = "host_male_friendly"
    guest_voice: str = "guest_female_expert"
    style: str = "conversational"  # "conversational", "expert-panel", "debate", "interview"
    output_format: str = "mp3"  # "wav", "mp3", "ogg"
    add_pauses: bool = True
    normalize_audio: bool = True
    temperature: float = 0.8
    output_dir: str = "./backend/audio/podcasts"
    save_script: bool = True


@dataclass
class PodcastResult:
    """Result of podcast generation"""
    success: bool
    audio_file: Optional[str] = None
    script_file: Optional[str] = None
    duration_seconds: float = 0.0
    total_cost: float = 0.0
    metadata: Dict = None
    error: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        result = asdict(self)
        if self.metadata is None:
            result['metadata'] = {}
        return result


class TogetherNotebookLM:
    """
    Complete NotebookLM-style podcast generation pipeline
    Integrates LLM script generation, TTS synthesis, and usage tracking
    """

    def __init__(self, api_key: Optional[str] = None, cartesia_key: Optional[str] = None):
        """
        Initialize the podcast pipeline

        Args:
            api_key: Together AI API key
            cartesia_key: Cartesia API key for TTS
        """
        # Validate configuration
        if not init_config():
            raise RuntimeError("Configuration validation failed. Check your .env file.")

        self.together_api_key = api_key or os.getenv('TOGETHER_API_KEY')
        self.cartesia_api_key = cartesia_key or os.getenv('CARTESIA_API_KEY')

        # Initialize components
        print("[*] Initializing Together AI NotebookLM Pipeline...")

        self.llm_generator = TogetherLLMGenerator(api_key=self.together_api_key)
        print("  [OK] LLM Generator ready (Llama-3-70b)")

        self.tts_generator = CartesiaTTSGenerator(api_key=self.cartesia_api_key)
        print("  [OK] TTS Generator ready (Cartesia Sonic)")

        self.usage_tracker = get_tracker()
        print("  [OK] Usage Tracker ready")

        print("[SUCCESS] Pipeline initialized successfully!\n")

    def process_document(self, document_path: str) -> str:
        """
        Extract and process document text

        Args:
            document_path: Path to document file

        Returns:
            Processed document text
        """
        file_path = Path(document_path)

        if not file_path.exists():
            raise FileNotFoundError(f"Document not found: {document_path}")

        # Read file
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()

        # Basic cleaning
        text = text.strip()

        if len(text) < 100:
            raise ValueError("Document is too short (minimum 100 characters)")

        return text

    def enhance_dialogue(self, dialogue: PodcastDialogue, style: str = "conversational") -> List[Dict[str, str]]:
        """
        Enhance dialogue with natural conversation elements

        Args:
            dialogue: Generated podcast dialogue
            style: Conversation style to apply voice mapping

        Returns:
            Enhanced dialogue list
        """
        enhanced = []

        # For debate style, ensure host and guest have opposing gender voices
        # This creates clearer distinction between competing viewpoints
        for i, turn in enumerate(dialogue.turns):
            # Convert to dictionary format
            turn_dict = {
                'speaker': turn.speaker,
                'text': turn.text,
                'turn_number': turn.turn_number
            }

            # Add segment type markers
            if i == 0:
                turn_dict['segment_type'] = 'intro'
            elif i == len(dialogue.turns) - 1:
                turn_dict['segment_type'] = 'outro'
            else:
                turn_dict['segment_type'] = 'dialogue'

            enhanced.append(turn_dict)

        return enhanced

    def estimate_cost(self, document_text: str, options: PodcastOptions) -> Dict[str, float]:
        """
        Estimate cost before generation

        Args:
            document_text: Input document
            options: Podcast options

        Returns:
            Cost breakdown
        """
        # Parse length
        length_minutes = int(options.length.replace('min', ''))

        # Estimate using tracker
        estimate = self.usage_tracker.estimate_podcast_cost(
            document_length=len(document_text),
            podcast_duration=length_minutes * 60,
            num_speakers=2
        )

        return estimate

    def validate_dialogue(self, dialogue: PodcastDialogue) -> bool:
        """
        Validate generated dialogue quality

        Args:
            dialogue: Generated dialogue

        Returns:
            True if valid, raises ValueError if invalid
        """
        # Check minimum turns
        if len(dialogue.turns) < 8:
            raise ValueError(f"Dialogue too short: only {len(dialogue.turns)} turns")

        # Check speaker alternation
        speakers = [turn.speaker for turn in dialogue.turns]
        if len(set(speakers)) < 2:
            raise ValueError("Dialogue must have both host and guest speakers")

        # Check for empty text
        for turn in dialogue.turns:
            if not turn.text.strip():
                raise ValueError("Found empty dialogue turn")

        return True

    def create_podcast(
        self,
        document_path: str,
        options: Optional[PodcastOptions] = None
    ) -> PodcastResult:
        """
        Complete pipeline: Document → Script → Audio → Podcast

        Args:
            document_path: Path to input document
            options: Podcast generation options

        Returns:
            PodcastResult with file paths and metadata
        """
        if options is None:
            options = PodcastOptions()

        start_time = time.time()

        try:
            # Step 1: Process document
            print("="*70)
            print("[PODCAST]  TOGETHER AI NOTEBOOKLM PODCAST GENERATION")
            print("="*70 + "\n")

            print("[DOC] Step 1/5: Processing document...")
            document_text = self.process_document(document_path)
            print(f"   [OK] Loaded {len(document_text)} characters")

            # Estimate cost
            cost_estimate = self.estimate_cost(document_text, options)
            print(f"\n[COST] Estimated Cost:")
            print(f"   LLM: ${cost_estimate['llm_cost']:.4f}")
            print(f"   TTS: ${cost_estimate['tts_cost']:.4f}")
            print(f"   Total: ${cost_estimate['total_cost']:.4f}")

            # Step 2: Generate script
            print(f"\n[GEN]  Step 2/5: Generating conversation script...")
            print(f"   Target length: {options.length}")
            print(f"   Style: {options.style}")
            print(f"   Model: {self.llm_generator.model}")

            dialogue = self.llm_generator.generate_podcast_dialogue(
                document_text=document_text,
                length=options.length,
                temperature=options.temperature,
                style=options.style
            )

            # Validate dialogue
            self.validate_dialogue(dialogue)
            print(f"   [OK] Generated {len(dialogue.turns)} conversational turns")

            # Step 3: Enhance dialogue
            print(f"\n[ENHANCE] Step 3/5: Enhancing dialogue...")
            enhanced_dialogue = self.enhance_dialogue(dialogue, style=options.style)
            print(f"   [OK] Added natural conversation elements")

            # Save script if requested
            script_file = None
            if options.save_script:
                script_file = self._save_script(dialogue, enhanced_dialogue, options)
                print(f"   [OK] Script saved to: {script_file}")

            # Step 4: Generate audio
            print(f"\n[AUDIO] Step 4/5: Generating podcast audio...")
            print(f"   Host voice: {options.host_voice}")
            print(f"   Guest voice: {options.guest_voice}")

            # Configure TTS with selected voices
            # For debate style, ensure opposing genders for clarity
            host_voice = options.host_voice
            guest_voice = options.guest_voice

            if options.style == "debate":
                # Ensure male/female distinction for debates
                # Check if both voices are same gender, if so swap one
                from tts_generator import CartesiaTTSGenerator as TTS
                host_config = TTS.VOICE_PRESETS.get(host_voice)
                guest_config = TTS.VOICE_PRESETS.get(guest_voice)

                if host_config and guest_config:
                    if host_config.gender == guest_config.gender:
                        # Swap to opposite gender
                        if host_config.gender == "male":
                            guest_voice = "guest_female_expert"
                        else:
                            guest_voice = "guest_male"
                        print(f"   [DEBATE] Auto-adjusted voices for gender contrast")

            self.tts_generator = CartesiaTTSGenerator(
                api_key=self.cartesia_api_key,
                host_voice=host_voice,
                guest_voice=guest_voice
            )

            # Generate audio
            audio_file, audio_metadata = self.tts_generator.generate_and_save(
                dialogue=enhanced_dialogue,
                output_path=self._get_output_path(options),
                format=options.output_format,
                add_pauses=options.add_pauses,
                normalize_audio=options.normalize_audio
            )

            # Step 5: Finalize
            print(f"\n[FINAL] Step 5/5: Finalizing podcast...")

            # Get actual costs from tracker
            actual_cost = self.usage_tracker.get_daily_cost()

            # Create result
            result = PodcastResult(
                success=True,
                audio_file=audio_file,
                script_file=script_file,
                duration_seconds=audio_metadata['duration_seconds'],
                total_cost=cost_estimate['total_cost'],  # Use estimate for now
                metadata={
                    **audio_metadata,
                    'title': dialogue.title,
                    'total_turns': len(dialogue.turns),
                    'document_length': len(document_text),
                    'generation_time': time.time() - start_time,
                    'options': asdict(options)
                }
            )

            # Print summary
            self._print_summary(result)

            return result

        except Exception as e:
            error_msg = f"Podcast generation failed: {str(e)}"
            print(f"\n[ERROR] Error: {error_msg}")

            return PodcastResult(
                success=False,
                error=error_msg,
                metadata={'generation_time': time.time() - start_time}
            )

    def _get_output_path(self, options: PodcastOptions) -> str:
        """Generate output file path"""
        output_dir = Path(options.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"podcast_{timestamp}.{options.output_format}"

        return str(output_dir / filename)

    def _save_script(
        self,
        dialogue: PodcastDialogue,
        enhanced_dialogue: List[Dict],
        options: PodcastOptions
    ) -> str:
        """Save script to file"""
        output_dir = Path(options.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = time.strftime("%Y%m%d_%H%M%S")
        script_file = output_dir / f"script_{timestamp}.json"

        script_data = {
            'title': dialogue.title,
            'turns': enhanced_dialogue,
            'metadata': dialogue.metadata,
            'options': asdict(options)
        }

        with open(script_file, 'w', encoding='utf-8') as f:
            json.dump(script_data, f, indent=2, ensure_ascii=False)

        # Also save markdown version
        md_file = script_file.with_suffix('.md')
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(f"# {dialogue.title}\n\n")
            f.write(f"**Generated:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            for turn in enhanced_dialogue:
                speaker_name = "Host" if turn['speaker'] == 'host' else "Guest"
                f.write(f"**{speaker_name}:** {turn['text']}\n\n")

        return str(script_file)

    def _print_summary(self, result: PodcastResult):
        """Print generation summary"""
        print(f"\n{'='*70}")
        print("[SUCCESS] PODCAST GENERATION COMPLETE")
        print(f"{'='*70}\n")

        print(f"📁 Audio File: {result.audio_file}")
        if result.script_file:
            print(f"[DOC] Script File: {result.script_file}")

        print(f"\n[STATS] Statistics:")
        print(f"   Duration: {result.duration_seconds:.1f}s ({result.duration_seconds/60:.1f}m)")
        print(f"   Turns: {result.metadata['total_turns']}")
        print(f"   File Size: {result.metadata['file_size_bytes'] / (1024*1024):.2f} MB")
        print(f"   Generation Time: {result.metadata['generation_time']:.1f}s")

        print(f"\n[COST] Cost:")
        print(f"   Estimated: ${result.total_cost:.4f}")

        print(f"\n[AUDIO] Voices:")
        print(f"   Host: {result.metadata['voices']['host']}")
        print(f"   Guest: {result.metadata['voices']['guest']}")

        print(f"\n{'='*70}\n")

    def batch_generate(
        self,
        document_paths: List[str],
        options: Optional[PodcastOptions] = None
    ) -> List[PodcastResult]:
        """
        Generate multiple podcasts in batch

        Args:
            document_paths: List of document paths
            options: Shared podcast options

        Returns:
            List of PodcastResults
        """
        results = []

        print(f"\n🎬 Batch generating {len(document_paths)} podcasts...\n")

        for i, doc_path in enumerate(document_paths, 1):
            print(f"\n{'='*70}")
            print(f"Processing {i}/{len(document_paths)}: {Path(doc_path).name}")
            print(f"{'='*70}\n")

            result = self.create_podcast(doc_path, options)
            results.append(result)

            if not result.success:
                print(f"⚠️  Skipping due to error\n")

        # Print batch summary
        successful = sum(1 for r in results if r.success)
        total_cost = sum(r.total_cost for r in results if r.success)
        total_duration = sum(r.duration_seconds for r in results if r.success)

        print(f"\n{'='*70}")
        print("[STATS] BATCH SUMMARY")
        print(f"{'='*70}\n")
        print(f"Successful: {successful}/{len(document_paths)}")
        print(f"Total Duration: {total_duration/60:.1f} minutes")
        print(f"Total Cost: ${total_cost:.2f}")
        print(f"{'='*70}\n")

        return results


def create_test_document(content: str, filename: str = "test_document.txt") -> str:
    """Helper to create a test document"""
    test_dir = Path("backend/uploads/test")
    test_dir.mkdir(parents=True, exist_ok=True)

    file_path = test_dir / filename
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return str(file_path)


def main():
    """Main entry point for testing"""

    # Sample document
    sample_content = """
The Future of Artificial Intelligence in Healthcare

Artificial intelligence is revolutionizing healthcare in ways we never imagined. From diagnosing
diseases to discovering new drugs, AI systems are becoming invaluable partners to medical
professionals.

Machine learning algorithms can now analyze medical images with accuracy matching or exceeding
human radiologists. They can detect subtle patterns in X-rays, MRIs, and CT scans that might
escape human notice, leading to earlier detection of conditions like cancer.

But it's not just about diagnosis. AI is also transforming drug discovery. Traditional drug
development can take 10-15 years and cost billions of dollars. AI can screen millions of
molecular compounds in silico, identifying promising candidates in a fraction of the time.

Perhaps most exciting is AI's potential for personalized medicine. By analyzing a patient's
genetic makeup, lifestyle, and medical history, AI systems can recommend treatments tailored
to the individual, moving us away from one-size-fits-all approaches.

However, challenges remain. Privacy concerns, algorithmic bias, and the need for human
oversight are critical issues we must address. The goal isn't to replace doctors, but to
augment their capabilities, giving them powerful tools to provide better care.

The future of healthcare is a collaboration between human expertise and artificial intelligence,
each bringing their unique strengths to improve patient outcomes.
"""

    # Create test document
    print("Creating test document...")
    doc_path = create_test_document(sample_content, "ai_healthcare.txt")
    print(f"[OK] Test document created: {doc_path}\n")

    # Initialize pipeline
    pipeline = TogetherNotebookLM()

    # Configure options
    options = PodcastOptions(
        length="10min",
        host_voice="host_male_friendly",
        guest_voice="guest_female_expert",
        output_format="mp3",
        add_pauses=True,
        normalize_audio=True,
        temperature=0.8,
        save_script=True
    )

    # Generate podcast
    result = pipeline.create_podcast(doc_path, options)

    # Export result
    if result.success:
        result_file = Path("backend/audio/podcasts/latest_result.json")
        result_file.parent.mkdir(parents=True, exist_ok=True)

        with open(result_file, 'w') as f:
            json.dump(result.to_dict(), f, indent=2)

        print(f"[DOC] Result saved to: {result_file}")

        # Print usage summary
        print("\n")
        pipeline.usage_tracker.print_summary()

        return 0
    else:
        print(f"\n[ERROR] Generation failed: {result.error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
