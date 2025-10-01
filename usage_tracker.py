"""
Together AI Usage Tracker
Monitors API calls, calculates costs, and provides usage reports
"""

import json
import csv
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import threading


@dataclass
class UsageRecord:
    """Single usage record for tracking"""
    timestamp: str
    service: str  # 'llm' or 'tts'
    model: str
    tokens_used: int = 0
    characters_generated: int = 0
    estimated_cost: float = 0.0
    actual_cost: float = 0.0
    operation: str = ""  # e.g., 'podcast_generation', 'summary', etc.
    metadata: dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class TogetherUsageTracker:
    """
    Tracks Together AI API usage and costs

    Pricing (as of 2025):
    - Llama-3-70b: ~$0.90 per 1M input tokens, ~$0.90 per 1M output tokens
    - Cartesia TTS: ~$0.025 per 1K characters
    """

    # Pricing constants (USD)
    PRICING = {
        'llm': {
            'meta-llama/Llama-3-70b-chat-hf': {
                'input': 0.90 / 1_000_000,   # per token
                'output': 0.90 / 1_000_000,  # per token
            },
            'meta-llama/Llama-3-8b-chat-hf': {
                'input': 0.20 / 1_000_000,
                'output': 0.20 / 1_000_000,
            },
            'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': {
                'input': 0.18 / 1_000_000,
                'output': 0.18 / 1_000_000,
            },
            'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': {
                'input': 0.88 / 1_000_000,
                'output': 0.88 / 1_000_000,
            },
        },
        'tts': {
            'cartesia-sonic': 0.025 / 1_000,  # per character
            'cartesia': 0.025 / 1_000,
        }
    }

    # Budget limits (USD)
    DEFAULT_DAILY_LIMIT = 10.0
    DEFAULT_MONTHLY_LIMIT = 100.0
    WARNING_THRESHOLD = 0.8  # Warn at 80% of limit

    def __init__(self, storage_path: str = "./backend/usage_logs"):
        """Initialize the usage tracker"""
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        self.usage_file = self.storage_path / "usage_records.json"
        self.budget_file = self.storage_path / "budget_config.json"

        self.records: List[UsageRecord] = []
        self.budget_limits = self._load_budget_config()
        self._load_records()

        self._lock = threading.Lock()

    def _load_budget_config(self) -> Dict:
        """Load budget configuration"""
        if self.budget_file.exists():
            with open(self.budget_file, 'r') as f:
                return json.load(f)

        default_config = {
            'daily_limit': self.DEFAULT_DAILY_LIMIT,
            'monthly_limit': self.DEFAULT_MONTHLY_LIMIT,
            'warning_threshold': self.WARNING_THRESHOLD
        }
        self._save_budget_config(default_config)
        return default_config

    def _save_budget_config(self, config: Dict):
        """Save budget configuration"""
        with open(self.budget_file, 'w') as f:
            json.dump(config, f, indent=2)

    def _load_records(self):
        """Load existing usage records"""
        if self.usage_file.exists():
            try:
                with open(self.usage_file, 'r') as f:
                    data = json.load(f)
                    self.records = [UsageRecord(**record) for record in data]
            except Exception as e:
                print(f"Warning: Could not load usage records: {e}")
                self.records = []

    def _save_records(self):
        """Save usage records to file"""
        with open(self.usage_file, 'w') as f:
            json.dump([asdict(record) for record in self.records], f, indent=2)

    def set_budget_limits(self, daily_limit: float = None, monthly_limit: float = None):
        """Set custom budget limits"""
        if daily_limit is not None:
            self.budget_limits['daily_limit'] = daily_limit
        if monthly_limit is not None:
            self.budget_limits['monthly_limit'] = monthly_limit
        self._save_budget_config(self.budget_limits)

    def estimate_llm_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        model: str = 'meta-llama/Llama-3-70b-chat-hf'
    ) -> float:
        """
        Estimate cost for LLM usage

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            model: Model name

        Returns:
            Estimated cost in USD
        """
        if model not in self.PRICING['llm']:
            # Use default pricing for unknown models
            model = 'meta-llama/Llama-3-70b-chat-hf'

        pricing = self.PRICING['llm'][model]
        input_cost = input_tokens * pricing['input']
        output_cost = output_tokens * pricing['output']

        return input_cost + output_cost

    def estimate_tts_cost(
        self,
        characters: int,
        model: str = 'cartesia-sonic'
    ) -> float:
        """
        Estimate cost for TTS usage

        Args:
            characters: Number of characters to synthesize
            model: TTS model name

        Returns:
            Estimated cost in USD
        """
        if model not in self.PRICING['tts']:
            model = 'cartesia-sonic'

        return characters * self.PRICING['tts'][model]

    def estimate_podcast_cost(
        self,
        document_length: int,
        podcast_duration: int,
        num_speakers: int = 2
    ) -> Dict[str, float]:
        """
        Estimate total cost for podcast generation

        Args:
            document_length: Length of input document in characters
            podcast_duration: Target duration in seconds
            num_speakers: Number of speakers in conversation

        Returns:
            Dict with cost breakdown
        """
        # Estimate tokens for conversation generation
        # Rule of thumb: 1 token ≈ 4 characters for English
        input_tokens = document_length // 4

        # Estimate output tokens based on duration and speakers
        # Average speaking rate: ~150 words/min = 2.5 words/sec
        # Average word length: ~5 characters
        # 1 token ≈ 0.75 words
        words_needed = podcast_duration * 2.5 * num_speakers
        output_tokens = int(words_needed / 0.75)

        # Add overhead for system prompts and conversation structure
        input_tokens = int(input_tokens * 1.2)
        output_tokens = int(output_tokens * 1.3)

        # Calculate LLM cost
        llm_cost = self.estimate_llm_cost(input_tokens, output_tokens)

        # Estimate TTS characters
        # Characters ≈ words * 5
        tts_characters = int(words_needed * 5)
        tts_cost = self.estimate_tts_cost(tts_characters)

        total_cost = llm_cost + tts_cost

        return {
            'llm_cost': round(llm_cost, 4),
            'tts_cost': round(tts_cost, 4),
            'total_cost': round(total_cost, 4),
            'estimated_input_tokens': input_tokens,
            'estimated_output_tokens': output_tokens,
            'estimated_tts_characters': tts_characters
        }

    def track_generation(
        self,
        service: str,
        model: str,
        tokens_used: int = 0,
        characters_generated: int = 0,
        operation: str = "",
        metadata: Dict = None
    ) -> UsageRecord:
        """
        Track a generation event

        Args:
            service: 'llm' or 'tts'
            model: Model name
            tokens_used: Total tokens (input + output)
            characters_generated: Characters generated (for TTS)
            operation: Operation description
            metadata: Additional metadata

        Returns:
            UsageRecord object
        """
        with self._lock:
            # Calculate cost
            if service == 'llm':
                # Assume 50/50 split between input/output if not specified
                input_tokens = tokens_used // 2
                output_tokens = tokens_used - input_tokens
                cost = self.estimate_llm_cost(input_tokens, output_tokens, model)
            elif service == 'tts':
                cost = self.estimate_tts_cost(characters_generated, model)
            else:
                cost = 0.0

            # Create record
            record = UsageRecord(
                timestamp=datetime.now().isoformat(),
                service=service,
                model=model,
                tokens_used=tokens_used,
                characters_generated=characters_generated,
                estimated_cost=cost,
                actual_cost=cost,  # Could be updated with actual billing data
                operation=operation,
                metadata=metadata or {}
            )

            self.records.append(record)
            self._save_records()

            # Check budget warnings
            self._check_budget_warnings()

            return record

    def _check_budget_warnings(self):
        """Check if usage is approaching budget limits"""
        daily_usage = self.get_daily_cost()
        monthly_usage = self.get_monthly_cost()

        daily_limit = self.budget_limits['daily_limit']
        monthly_limit = self.budget_limits['monthly_limit']
        threshold = self.budget_limits['warning_threshold']

        warnings = []

        if daily_usage >= daily_limit * threshold:
            warnings.append(
                f"⚠️  Daily usage: ${daily_usage:.2f} / ${daily_limit:.2f} "
                f"({daily_usage/daily_limit*100:.1f}%)"
            )

        if monthly_usage >= monthly_limit * threshold:
            warnings.append(
                f"⚠️  Monthly usage: ${monthly_usage:.2f} / ${monthly_limit:.2f} "
                f"({monthly_usage/monthly_limit*100:.1f}%)"
            )

        if warnings:
            print("\n" + "="*60)
            print("BUDGET WARNING")
            print("="*60)
            for warning in warnings:
                print(warning)
            print("="*60 + "\n")

    def get_daily_cost(self, date: Optional[datetime] = None) -> float:
        """Get total cost for a specific day"""
        if date is None:
            date = datetime.now()

        target_date = date.date()

        total = 0.0
        for record in self.records:
            record_date = datetime.fromisoformat(record.timestamp).date()
            if record_date == target_date:
                total += record.actual_cost

        return total

    def get_monthly_cost(self, year: int = None, month: int = None) -> float:
        """Get total cost for a specific month"""
        now = datetime.now()
        if year is None:
            year = now.year
        if month is None:
            month = now.month

        total = 0.0
        for record in self.records:
            record_date = datetime.fromisoformat(record.timestamp)
            if record_date.year == year and record_date.month == month:
                total += record.actual_cost

        return total

    def get_monthly_report(self) -> Dict:
        """
        Generate comprehensive monthly usage report

        Returns:
            Dict with usage statistics and breakdown
        """
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Filter records for current month
        monthly_records = [
            r for r in self.records
            if datetime.fromisoformat(r.timestamp) >= month_start
        ]

        # Calculate statistics
        total_cost = sum(r.actual_cost for r in monthly_records)
        total_tokens = sum(r.tokens_used for r in monthly_records if r.service == 'llm')
        total_characters = sum(r.characters_generated for r in monthly_records if r.service == 'tts')

        # Breakdown by service
        llm_records = [r for r in monthly_records if r.service == 'llm']
        tts_records = [r for r in monthly_records if r.service == 'tts']

        llm_cost = sum(r.actual_cost for r in llm_records)
        tts_cost = sum(r.actual_cost for r in tts_records)

        # Breakdown by operation
        operations = {}
        for record in monthly_records:
            op = record.operation or 'unknown'
            if op not in operations:
                operations[op] = {'count': 0, 'cost': 0.0}
            operations[op]['count'] += 1
            operations[op]['cost'] += record.actual_cost

        # Daily breakdown
        daily_costs = {}
        for record in monthly_records:
            date = datetime.fromisoformat(record.timestamp).date().isoformat()
            daily_costs[date] = daily_costs.get(date, 0.0) + record.actual_cost

        return {
            'month': now.strftime('%Y-%m'),
            'total_cost': round(total_cost, 2),
            'total_calls': len(monthly_records),
            'total_tokens': total_tokens,
            'total_characters': total_characters,
            'breakdown': {
                'llm': {
                    'calls': len(llm_records),
                    'cost': round(llm_cost, 2),
                    'tokens': total_tokens
                },
                'tts': {
                    'calls': len(tts_records),
                    'cost': round(tts_cost, 2),
                    'characters': total_characters
                }
            },
            'by_operation': operations,
            'daily_costs': daily_costs,
            'budget_status': {
                'monthly_limit': self.budget_limits['monthly_limit'],
                'used': round(total_cost, 2),
                'remaining': round(self.budget_limits['monthly_limit'] - total_cost, 2),
                'percentage': round(total_cost / self.budget_limits['monthly_limit'] * 100, 1)
            }
        }

    def export_to_csv(self, output_path: str = None, days: int = 30) -> str:
        """
        Export usage records to CSV for billing analysis

        Args:
            output_path: Output file path (default: usage_export_YYYYMMDD.csv)
            days: Number of days to export (default: 30)

        Returns:
            Path to exported CSV file
        """
        if output_path is None:
            timestamp = datetime.now().strftime('%Y%m%d')
            output_path = str(self.storage_path / f"usage_export_{timestamp}.csv")

        # Filter records
        cutoff_date = datetime.now() - timedelta(days=days)
        filtered_records = [
            r for r in self.records
            if datetime.fromisoformat(r.timestamp) >= cutoff_date
        ]

        # Write CSV
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)

            # Header
            writer.writerow([
                'Timestamp', 'Service', 'Model', 'Operation',
                'Tokens Used', 'Characters Generated', 'Cost (USD)'
            ])

            # Data
            for record in filtered_records:
                writer.writerow([
                    record.timestamp,
                    record.service,
                    record.model,
                    record.operation,
                    record.tokens_used,
                    record.characters_generated,
                    f"{record.actual_cost:.4f}"
                ])

            # Summary row
            writer.writerow([])
            writer.writerow(['TOTAL', '', '', '',
                           sum(r.tokens_used for r in filtered_records),
                           sum(r.characters_generated for r in filtered_records),
                           f"{sum(r.actual_cost for r in filtered_records):.2f}"])

        return output_path

    def print_summary(self):
        """Print a formatted usage summary"""
        report = self.get_monthly_report()

        print("\n" + "="*60)
        print(f"Together AI Usage Report - {report['month']}")
        print("="*60)
        print(f"Total Cost: ${report['total_cost']:.2f}")
        print(f"Total API Calls: {report['total_calls']}")
        print(f"\nLLM Usage:")
        print(f"  Calls: {report['breakdown']['llm']['calls']}")
        print(f"  Tokens: {report['breakdown']['llm']['tokens']:,}")
        print(f"  Cost: ${report['breakdown']['llm']['cost']:.2f}")
        print(f"\nTTS Usage:")
        print(f"  Calls: {report['breakdown']['tts']['calls']}")
        print(f"  Characters: {report['breakdown']['tts']['characters']:,}")
        print(f"  Cost: ${report['breakdown']['tts']['cost']:.2f}")
        print(f"\nBudget Status:")
        print(f"  Limit: ${report['budget_status']['monthly_limit']:.2f}")
        print(f"  Used: ${report['budget_status']['used']:.2f} ({report['budget_status']['percentage']}%)")
        print(f"  Remaining: ${report['budget_status']['remaining']:.2f}")
        print("="*60 + "\n")


# Create singleton instance
_tracker_instance = None

def get_tracker() -> TogetherUsageTracker:
    """Get or create the global usage tracker instance"""
    global _tracker_instance
    if _tracker_instance is None:
        _tracker_instance = TogetherUsageTracker()
    return _tracker_instance


if __name__ == "__main__":
    # Demo usage
    tracker = TogetherUsageTracker()

    # Estimate podcast cost
    print("Estimating podcast generation cost...")
    estimate = tracker.estimate_podcast_cost(
        document_length=5000,  # 5000 character document
        podcast_duration=300,  # 5 minute podcast
        num_speakers=2
    )

    print(f"\nEstimated Cost Breakdown:")
    print(f"  LLM: ${estimate['llm_cost']:.4f}")
    print(f"  TTS: ${estimate['tts_cost']:.4f}")
    print(f"  Total: ${estimate['total_cost']:.4f}")
    print(f"\nEstimated Usage:")
    print(f"  Input Tokens: {estimate['estimated_input_tokens']:,}")
    print(f"  Output Tokens: {estimate['estimated_output_tokens']:,}")
    print(f"  TTS Characters: {estimate['estimated_tts_characters']:,}")

    # Show current usage summary
    tracker.print_summary()
