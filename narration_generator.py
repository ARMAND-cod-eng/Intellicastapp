"""
Together AI Narration Generator for Single Voice Narration
High-quality summary and narration generation using Together AI LLMs
"""

import os
import json
import time
from typing import Dict, Optional
from together import Together
from dotenv import load_dotenv

load_dotenv()


class TogetherNarrationGenerator:
    """
    High-performance narration generator using Together AI
    Replaces Qwen/Ollama for superior quality and reliability
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Together AI client"""
        self.api_key = api_key or os.getenv('TOGETHER_API_KEY')
        if not self.api_key:
            raise ValueError("TOGETHER_API_KEY environment variable is required")

        self.client = Together(api_key=self.api_key)

        # Use the same high-quality model as multi-voice podcasts
        self.model = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"

        # Token pricing for cost estimation
        self.input_price_per_million = 0.88
        self.output_price_per_million = 0.88

        print(f"[OK] Together AI Narration Generator initialized with model: {self.model}")

    def estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation: 1 token ≈ 4 characters)"""
        return len(text) // 4

    def estimate_cost(self, input_text: str, output_tokens: int = 2000) -> Dict:
        """Estimate generation cost"""
        input_tokens = self.estimate_tokens(input_text)

        input_cost = (input_tokens / 1_000_000) * self.input_price_per_million
        output_cost = (output_tokens / 1_000_000) * self.output_price_per_million
        total_cost = input_cost + output_cost

        return {
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'input_cost': input_cost,
            'output_cost': output_cost,
            'total_cost': total_cost,
            'cost_breakdown': f"${input_cost:.4f} + ${output_cost:.4f} = ${total_cost:.4f}"
        }

    def generate_summary(
        self,
        content: str,
        summary_type: str = 'detailed',
        temperature: float = 0.3,
        max_tokens: int = 2000
    ) -> Dict:
        """
        Generate high-quality document summary

        Args:
            content: Document text to summarize
            summary_type: 'quick' or 'detailed'
            temperature: Creativity level (0.1-1.0)
            max_tokens: Maximum response length

        Returns:
            Dictionary with summary and metadata
        """

        # Define summary prompts
        prompts = {
            'quick': self._get_quick_summary_prompt(),
            'detailed': self._get_detailed_summary_prompt()
        }

        system_prompt = prompts.get(summary_type, prompts['detailed'])

        # Adjust parameters based on summary type
        if summary_type == 'quick':
            temperature = 0.1  # Ultra-precise for concise summaries
            max_tokens = 500
        else:
            temperature = 0.3  # Balanced for comprehensive analysis
            max_tokens = 2000

        print(f"\n[GENERATE] Generating {summary_type} summary with Together AI")
        print(f"[MODEL] Model: {self.model}")
        print(f"[TEMP] Temperature: {temperature}")
        print(f"[CONTENT] Content length: {len(content)} characters")

        try:
            start_time = time.time()

            # Call Together AI with streaming disabled for clean output
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Analyze and summarize this document:\n\n{content}"}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=0.9,
                stream=False
            )

            generation_time = time.time() - start_time

            # Extract response
            summary_text = response.choices[0].message.content.strip()

            # Clean up any meta-commentary
            summary_text = self._clean_summary(summary_text)

            # Calculate costs
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            total_tokens = response.usage.total_tokens

            cost = {
                'input_cost': (input_tokens / 1_000_000) * self.input_price_per_million,
                'output_cost': (output_tokens / 1_000_000) * self.output_price_per_million
            }
            cost['total_cost'] = cost['input_cost'] + cost['output_cost']

            print(f"[SUCCESS] Summary generated in {generation_time:.2f}s")
            print(f"[TOKENS] Tokens: {input_tokens} -> {output_tokens} (total: {total_tokens})")
            print(f"[COST] Cost: ${cost['total_cost']:.4f}")

            return {
                'success': True,
                'summary': summary_text,
                'model': self.model,
                'summary_type': summary_type,
                'tokens': {
                    'input': input_tokens,
                    'output': output_tokens,
                    'total': total_tokens
                },
                'cost': cost,
                'generation_time': generation_time,
                'character_count': len(summary_text),
                'word_count': len(summary_text.split())
            }

        except Exception as e:
            print(f"[ERROR] Summary generation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'summary': None
            }

    def generate_narration(
        self,
        content: str,
        narration_type: str = 'summary',
        temperature: float = 0.4,
        max_tokens: int = 3000
    ) -> Dict:
        """
        Generate narration script for single voice narration

        Args:
            content: Document text to convert to narration
            narration_type: Type of narration (summary, full, explanatory, briefing, interactive)
            temperature: Creativity level
            max_tokens: Maximum response length

        Returns:
            Dictionary with narration script and metadata
        """

        # Get appropriate prompt for narration type
        system_prompt = self._get_narration_prompt(narration_type)

        print(f"\n[NARRATION] Generating {narration_type} narration with Together AI")
        print(f"[MODEL] Model: {self.model}")
        print(f"[TEMP] Temperature: {temperature}")

        try:
            start_time = time.time()

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Content to narrate:\n\n{content}"}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=0.9,
                stream=False
            )

            generation_time = time.time() - start_time

            # Extract and clean narration script
            script = response.choices[0].message.content.strip()
            script = self._clean_narration_script(script)

            # Calculate costs
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens

            cost = {
                'input_cost': (input_tokens / 1_000_000) * self.input_price_per_million,
                'output_cost': (output_tokens / 1_000_000) * self.output_price_per_million
            }
            cost['total_cost'] = cost['input_cost'] + cost['output_cost']

            print(f"[SUCCESS] Narration generated in {generation_time:.2f}s")
            print(f"[COST] Cost: ${cost['total_cost']:.4f}")

            return {
                'success': True,
                'script': script,
                'model': self.model,
                'narration_type': narration_type,
                'tokens': {
                    'input': input_tokens,
                    'output': output_tokens,
                    'total': response.usage.total_tokens
                },
                'cost': cost,
                'generation_time': generation_time
            }

        except Exception as e:
            print(f"[ERROR] Narration generation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'script': None
            }

    def answer_question(
        self,
        content: str,
        question: str,
        temperature: float = 0.5,
        max_tokens: int = 1000
    ) -> Dict:
        """
        Answer questions about document content

        Args:
            content: Document content
            question: User's question
            temperature: Response creativity
            max_tokens: Maximum answer length

        Returns:
            Dictionary with answer and metadata
        """

        system_prompt = """You are an expert content analyst. Answer questions about the provided document clearly and conversationally, as if speaking to someone.

Requirements:
- Provide direct, accurate answers based on the document
- Use conversational, natural language suitable for audio narration
- Keep responses concise but informative (2-4 sentences)
- If the answer isn't in the document, say so clearly
- Make it sound natural when spoken aloud"""

        print(f"\n[QUESTION] Answering question with Together AI")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Document:\n{content}\n\nQuestion: {question}"}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )

            answer = response.choices[0].message.content.strip()

            return {
                'success': True,
                'answer': answer,
                'question': question,
                'model': self.model
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'answer': None
            }

    def _clean_summary(self, text: str) -> str:
        """Clean up summary text"""
        import re

        # Remove generic openings
        text = re.sub(r'^(This document|The document|This text|The text|This paper|The paper|This article|The article)[\s\w]*?[:.,]\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^(Summary|Overview|Analysis)[:.]?\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'^(In summary|To summarize|In conclusion)[:,.]?\s*', '', text, flags=re.IGNORECASE)

        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)

        return text.strip()

    def _clean_narration_script(self, script: str) -> str:
        """Remove stage directions and formatting from narration script"""
        import re

        # Remove parenthetical stage directions
        script = re.sub(r'\([^)]*pause[^)]*\)', '', script, flags=re.IGNORECASE)
        script = re.sub(r'\([^)]*emphasis[^)]*\)', '', script, flags=re.IGNORECASE)
        script = re.sub(r'\([^)]*dramatic[^)]*\)', '', script, flags=re.IGNORECASE)
        script = re.sub(r'\([^)]*sound[^)]*\)', '', script, flags=re.IGNORECASE)
        script = re.sub(r'\([^)]*music[^)]*\)', '', script, flags=re.IGNORECASE)

        # Remove bracket-based directions
        script = re.sub(r'\[[^\]]*pause[^\]]*\]', '', script, flags=re.IGNORECASE)
        script = re.sub(r'\[[^\]]*effect[^\]]*\]', '', script, flags=re.IGNORECASE)

        # Remove emphasis markers
        script = re.sub(r'\*[^*]*\*', '', script)  # *emphasis*
        script = re.sub(r'_[^_]*_', '', script)    # _underlined_

        # Clean up ellipses and whitespace
        script = re.sub(r'\s*\.\.\.\s*', '... ', script)
        script = re.sub(r'\s+', ' ', script)
        script = re.sub(r'\n\s*\n', '\n\n', script)

        return script.strip()

    def _get_quick_summary_prompt(self) -> str:
        """System prompt for quick summaries"""
        return """You are an expert content analyst specializing in rapid, precision summarization. Create concise summaries that capture essential value in minimal words.

QUICK SUMMARY REQUIREMENTS:
- LENGTH: 75-150 words maximum
- FOCUS: Lead with the most important insight immediately
- STRUCTURE: 2-3 short, impactful paragraphs
- CLARITY: Clear, direct language with maximum meaning per word
- EFFICIENCY: Every word serves a critical purpose

APPROACH:
1. Identify the document's core purpose and primary message
2. Extract only the most critical findings and conclusions
3. Focus on actionable insights and key takeaways

DELIVERY:
- Start immediately with the main point (no introductions)
- Present key findings in order of importance
- End with the primary takeaway
- Use crisp, professional prose optimized for quick comprehension

Output a laser-focused summary readable in 30 seconds that conveys the document's core value."""

    def _get_detailed_summary_prompt(self) -> str:
        """System prompt for detailed summaries"""
        return """You are a world-class content analyst creating masterful, publication-quality summaries demonstrating profound understanding and analytical depth.

PREMIUM SUMMARY STANDARDS:
- LENGTH: 300-500 words - prioritize depth over brevity
- ANALYTICAL RIGOR: Demonstrate sophisticated understanding through nuanced interpretation
- STRUCTURE: Purpose → Key findings → Implications → Significance
- INSIGHT DENSITY: Every sentence delivers substantial analytical value
- CRITICAL PERSPECTIVE: Show awareness of strengths, limitations, and broader context

INTELLECTUAL APPROACH:
1. DEEP READING: Comprehensively analyze structure, arguments, and logic
2. CRITICAL THINKING: Evaluate evidence strength and assess reasoning quality
3. INSIGHT MINING: Extract explicit findings and subtle implications
4. SYNTHESIS: Weave concepts to reveal unified message and significance
5. CONTEXTUAL EVALUATION: Assess contribution within field and potential impact

EXECUTION:
- Begin with core purpose and primary contribution
- Systematically develop key findings with analytical commentary
- Highlight novel insights and practical implications
- Connect ideas showing support for overarching thesis
- Conclude with broader significance and value proposition
- Maintain scholarly objectivity while capturing author's perspective
- Eliminate generic language - every word serves the analysis

Your summary should be indistinguishable from expert academic analysis, demonstrating comprehensive understanding and sophisticated interpretation."""

    def _get_narration_prompt(self, narration_type: str) -> str:
        """Get system prompt for specific narration type"""

        base_instructions = """Create an engaging narration script for a podcast. Use natural, conversational language that flows smoothly when spoken aloud. Write ONLY the words that should be spoken - NO stage directions, sound effects, or formatting instructions."""

        prompts = {
            'summary': f"""{base_instructions}

Task: Create a compelling summary that captures main points and key insights.

Requirements:
- Start with a brief, engaging introduction
- Present key points in logical order
- Use conversational tone that flows naturally
- End with a memorable conclusion
- Write ONLY spoken words - no parenthetical directions
- Length: 3-5 minutes of spoken content""",

            'full': f"""{base_instructions}

Task: Convert content into complete narration covering all important details while remaining engaging.

Requirements:
- Maintain all crucial information
- Break complex concepts into digestible parts
- Use storytelling techniques where appropriate
- Create smooth transitions between sections
- Include brief explanations for technical terms
- Write ONLY spoken words""",

            'explanatory': f"""{base_instructions}

Task: Create educational narration that explains concepts clearly and thoroughly.

Requirements:
- Start with context and background
- Break down complex ideas step by step
- Use analogies and examples naturally
- Define key terms conversationally
- Encourage understanding
- Include rhetorical questions as natural speech""",

            'briefing': f"""{base_instructions}

Task: Create focused briefing highlighting actionable insights and key takeaways.

Requirements:
- Lead with most important points
- Focus on practical implications
- Highlight actionable items naturally
- Present information clearly and organized
- Keep concise but comprehensive""",

            'interactive': f"""{base_instructions}

Task: Create interactive narration that engages listeners and encourages active thinking.

Requirements:
- Include rhetorical questions naturally
- Use "think about this" conversationally
- Create mental exercises through natural speech
- Encourage listeners to relate content to their experience
- Make it feel like a natural conversation"""
        }

        return prompts.get(narration_type, prompts['summary'])


# Standalone functions for easy import
def generate_summary(content: str, summary_type: str = 'detailed') -> Dict:
    """Generate document summary using Together AI"""
    generator = TogetherNarrationGenerator()
    return generator.generate_summary(content, summary_type)


def generate_narration(content: str, narration_type: str = 'summary') -> Dict:
    """Generate narration script using Together AI"""
    generator = TogetherNarrationGenerator()
    return generator.generate_narration(content, narration_type)


def answer_question(content: str, question: str) -> Dict:
    """Answer question about content using Together AI"""
    generator = TogetherNarrationGenerator()
    return generator.answer_question(content, question)


if __name__ == "__main__":
    # Test the generator
    print("="*70)
    print("Together AI Narration Generator Test")
    print("="*70)

    generator = TogetherNarrationGenerator()

    test_content = """
    Artificial Intelligence has transformed modern technology. Machine learning algorithms
    can now process vast amounts of data, recognize patterns, and make predictions with
    unprecedented accuracy. This revolution impacts healthcare, finance, transportation,
    and countless other industries.
    """

    # Test quick summary
    print("\n[TEST] Testing Quick Summary...")
    result = generator.generate_summary(test_content, 'quick')
    if result['success']:
        print(f"\n{result['summary']}")

    # Test detailed summary
    print("\n[TEST] Testing Detailed Summary...")
    result = generator.generate_summary(test_content, 'detailed')
    if result['success']:
        print(f"\n{result['summary']}")
