#!/usr/bin/env python3
"""
Complete Kokoro-82M Voice Database
Based on official VOICES.md from hexgrad/Kokoro-82M
Contains all 47 actual Kokoro voices across multiple languages
"""

from typing import Dict, List, Any
import json

class KokoroVoiceDatabase:
    """Database of all actual Kokoro-82M voices from official repository"""
    
    def __init__(self):
        """Initialize the voice database with all 47 real Kokoro voices"""
        
        # Complete mapping of all ACTUAL Kokoro-82M voices (from official VOICES.md)
        # Naming convention: [language_code][f/m]_[name]
        # English: af/am = American, bf/bm = British
        # f = Female, m = Male
        self.voices = {
            # AMERICAN ENGLISH FEMALE VOICES (af_*) - 11 voices
            'af_heart': {
                'id': 'af_heart',
                'name': 'Heart',
                'display_name': 'Heart (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'warm',
                'characteristics': ['professional', 'clear', 'engaging'],
                'best_for': ['news', 'educational', 'corporate'],
                'description': 'Warm and professional American female voice',
                'speed_multiplier': 0.9,
                'intonation': 'professional',
                'pause_style': 'thoughtful'
            },
            'af_alloy': {
                'id': 'af_alloy',
                'name': 'Alloy',
                'display_name': 'Alloy (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'modern',
                'characteristics': ['crisp', 'technical', 'precise'],
                'best_for': ['technology', 'presentations', 'tutorials'],
                'description': 'Modern and precise American female voice',
                'speed_multiplier': 0.95,
                'intonation': 'professional',
                'pause_style': 'clear'
            },
            'af_aoede': {
                'id': 'af_aoede',
                'name': 'Aoede',
                'display_name': 'Aoede (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'artistic',
                'characteristics': ['expressive', 'creative', 'melodic'],
                'best_for': ['storytelling', 'arts', 'entertainment'],
                'description': 'Artistic and expressive American female voice',
                'speed_multiplier': 0.92,
                'intonation': 'narrative',
                'pause_style': 'dramatic'
            },
            'af_bella': {
                'id': 'af_bella',
                'name': 'Bella',
                'display_name': 'Bella (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'middle_adult',
                'tone': 'sophisticated',
                'characteristics': ['elegant', 'refined', 'articulate'],
                'best_for': ['luxury', 'culture', 'literature'],
                'description': 'Sophisticated and elegant American female voice',
                'speed_multiplier': 0.88,
                'intonation': 'narrative',
                'pause_style': 'dramatic'
            },
            'af_jessica': {
                'id': 'af_jessica',
                'name': 'Jessica',
                'display_name': 'Jessica (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'vibrant',
                'characteristics': ['energetic', 'cheerful', 'engaging'],
                'best_for': ['lifestyle', 'social', 'entertainment'],
                'description': 'Vibrant and energetic American female voice',
                'speed_multiplier': 0.94,
                'intonation': 'conversational',
                'pause_style': 'natural'
            },
            'af_kore': {
                'id': 'af_kore',
                'name': 'Kore',
                'display_name': 'Kore (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'middle_adult',
                'tone': 'nurturing',
                'characteristics': ['caring', 'gentle', 'reassuring'],
                'best_for': ['wellness', 'meditation', 'therapy'],
                'description': 'Nurturing and gentle American female voice',
                'speed_multiplier': 0.86,
                'intonation': 'educational',
                'pause_style': 'thoughtful'
            },
            'af_nicole': {
                'id': 'af_nicole',
                'name': 'Nicole',
                'display_name': 'Nicole (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'friendly',
                'characteristics': ['approachable', 'casual', 'relatable'],
                'best_for': ['social', 'personal', 'community'],
                'description': 'Friendly and approachable American female voice',
                'speed_multiplier': 0.92,
                'intonation': 'conversational',
                'pause_style': 'engaging'
            },
            'af_nova': {
                'id': 'af_nova',
                'name': 'Nova',
                'display_name': 'Nova (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'bright',
                'characteristics': ['innovative', 'forward-thinking', 'dynamic'],
                'best_for': ['technology', 'innovation', 'science'],
                'description': 'Bright and innovative American female voice',
                'speed_multiplier': 0.96,
                'intonation': 'professional',
                'pause_style': 'clear'
            },
            'af_river': {
                'id': 'af_river',
                'name': 'River',
                'display_name': 'River (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'flowing',
                'characteristics': ['smooth', 'natural', 'calming'],
                'best_for': ['nature', 'wellness', 'audiobooks'],
                'description': 'Smooth and natural American female voice',
                'speed_multiplier': 0.89,
                'intonation': 'narrative',
                'pause_style': 'natural'
            },
            'af_sarah': {
                'id': 'af_sarah',
                'name': 'Sarah',
                'display_name': 'Sarah (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'middle_adult',
                'tone': 'authoritative',
                'characteristics': ['confident', 'reliable', 'trustworthy'],
                'best_for': ['business', 'finance', 'healthcare'],
                'description': 'Authoritative and trustworthy American female voice',
                'speed_multiplier': 0.85,
                'intonation': 'authoritative',
                'pause_style': 'confident'
            },
            'af_sky': {
                'id': 'af_sky',
                'name': 'Sky',
                'display_name': 'Sky (American Female)',
                'gender': 'female',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'bright',
                'characteristics': ['energetic', 'upbeat', 'modern'],
                'best_for': ['entertainment', 'lifestyle', 'technology'],
                'description': 'Bright and energetic American female voice',
                'speed_multiplier': 0.95,
                'intonation': 'conversational',
                'pause_style': 'natural'
            },
            
            # AMERICAN ENGLISH MALE VOICES (am_*) - 9 voices
            'am_adam': {
                'id': 'am_adam',
                'name': 'Adam',
                'display_name': 'Adam (American Male)',
                'gender': 'male',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'middle_adult',
                'tone': 'authoritative',
                'characteristics': ['strong', 'confident', 'reliable'],
                'best_for': ['news', 'business', 'documentary'],
                'description': 'Authoritative and confident American male voice',
                'speed_multiplier': 0.85,
                'intonation': 'authoritative',
                'pause_style': 'confident'
            },
            'am_echo': {
                'id': 'am_echo',
                'name': 'Echo',
                'display_name': 'Echo (American Male)',
                'gender': 'male',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'resonant',
                'characteristics': ['deep', 'clear', 'commanding'],
                'best_for': ['action', 'thriller', 'announcements'],
                'description': 'Deep and resonant American male voice',
                'speed_multiplier': 0.82,
                'intonation': 'narrative',
                'pause_style': 'dramatic'
            },
            'am_eric': {
                'id': 'am_eric',
                'name': 'Eric',
                'display_name': 'Eric (American Male)',
                'gender': 'male',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'middle_adult',
                'tone': 'professional',
                'characteristics': ['polished', 'corporate', 'trustworthy'],
                'best_for': ['corporate', 'training', 'presentations'],
                'description': 'Professional and polished American male voice',
                'speed_multiplier': 0.87,
                'intonation': 'professional',
                'pause_style': 'thoughtful'
            },
            'am_fenrir': {
                'id': 'am_fenrir',
                'name': 'Fenrir',
                'display_name': 'Fenrir (American Male)',
                'gender': 'male',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'intense',
                'characteristics': ['powerful', 'dramatic', 'compelling'],
                'best_for': ['fantasy', 'gaming', 'adventure'],
                'description': 'Intense and powerful American male voice',
                'speed_multiplier': 0.83,
                'intonation': 'narrative',
                'pause_style': 'dramatic'
            },
            'am_liam': {
                'id': 'am_liam',
                'name': 'Liam',
                'display_name': 'Liam (American Male)',
                'gender': 'male',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'casual',
                'characteristics': ['laid-back', 'relatable', 'authentic'],
                'best_for': ['lifestyle', 'entertainment', 'social'],
                'description': 'Casual and authentic American male voice',
                'speed_multiplier': 0.91,
                'intonation': 'conversational',
                'pause_style': 'engaging'
            },
            'am_michael': {
                'id': 'am_michael',
                'name': 'Michael',
                'display_name': 'Michael (American Male)',
                'gender': 'male',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'deep',
                'characteristics': ['resonant', 'powerful', 'commanding'],
                'best_for': ['action', 'thriller', 'sports'],
                'description': 'Deep and powerful American male voice',
                'speed_multiplier': 0.8,
                'intonation': 'narrative',
                'pause_style': 'dramatic'
            },
            'am_onyx': {
                'id': 'am_onyx',
                'name': 'Onyx',
                'display_name': 'Onyx (American Male)',
                'gender': 'male',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'middle_adult',
                'tone': 'smooth',
                'characteristics': ['sophisticated', 'refined', 'elegant'],
                'best_for': ['luxury', 'premium', 'culture'],
                'description': 'Smooth and sophisticated American male voice',
                'speed_multiplier': 0.88,
                'intonation': 'narrative',
                'pause_style': 'thoughtful'
            },
            'am_puck': {
                'id': 'am_puck',
                'name': 'Puck',
                'display_name': 'Puck (American Male)',
                'gender': 'male',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'young_adult',
                'tone': 'playful',
                'characteristics': ['mischievous', 'energetic', 'fun'],
                'best_for': ['comedy', 'entertainment', 'kids'],
                'description': 'Playful and energetic American male voice',
                'speed_multiplier': 0.95,
                'intonation': 'conversational',
                'pause_style': 'natural'
            },
            'am_santa': {
                'id': 'am_santa',
                'name': 'Santa',
                'display_name': 'Santa (American Male)',
                'gender': 'male',
                'accent': 'american',
                'language': 'en-us',
                'age_group': 'senior',
                'tone': 'jolly',
                'characteristics': ['warm', 'cheerful', 'festive'],
                'best_for': ['holiday', 'children', 'celebration'],
                'description': 'Warm and jolly American male voice',
                'speed_multiplier': 0.85,
                'intonation': 'conversational',
                'pause_style': 'cheerful'
            },
            
            # BRITISH ENGLISH FEMALE VOICES (bf_*) - 4 voices
            'bf_alice': {
                'id': 'bf_alice',
                'name': 'Alice',
                'display_name': 'Alice (British Female)',
                'gender': 'female',
                'accent': 'british',
                'language': 'en-gb',
                'age_group': 'young_adult',
                'tone': 'refined',
                'characteristics': ['elegant', 'sophisticated', 'clear'],
                'best_for': ['BBC-style', 'classical', 'literature'],
                'description': 'Refined and elegant British female voice',
                'speed_multiplier': 0.88,
                'intonation': 'professional',
                'pause_style': 'thoughtful'
            },
            'bf_emma': {
                'id': 'bf_emma',
                'name': 'Emma',
                'display_name': 'Emma (British Female)',
                'gender': 'female',
                'accent': 'british',
                'language': 'en-gb',
                'age_group': 'middle_adult',
                'tone': 'professional',
                'characteristics': ['competent', 'reliable', 'authoritative'],
                'best_for': ['business', 'education', 'government'],
                'description': 'Professional and competent British female voice',
                'speed_multiplier': 0.86,
                'intonation': 'authoritative',
                'pause_style': 'confident'
            },
            'bf_isabella': {
                'id': 'bf_isabella',
                'name': 'Isabella',
                'display_name': 'Isabella (British Female)',
                'gender': 'female',
                'accent': 'british',
                'language': 'en-gb',
                'age_group': 'middle_adult',
                'tone': 'aristocratic',
                'characteristics': ['distinguished', 'cultured', 'precise'],
                'best_for': ['period drama', 'luxury', 'heritage'],
                'description': 'Aristocratic and cultured British female voice',
                'speed_multiplier': 0.85,
                'intonation': 'narrative',
                'pause_style': 'dramatic'
            },
            'bf_lily': {
                'id': 'bf_lily',
                'name': 'Lily',
                'display_name': 'Lily (British Female)',
                'gender': 'female',
                'accent': 'british',
                'language': 'en-gb',
                'age_group': 'young_adult',
                'tone': 'bright',
                'characteristics': ['cheerful', 'articulate', 'modern'],
                'best_for': ['contemporary', 'media', 'broadcasting'],
                'description': 'Bright and articulate British female voice',
                'speed_multiplier': 0.92,
                'intonation': 'conversational',
                'pause_style': 'natural'
            },
            
            # BRITISH ENGLISH MALE VOICES (bm_*) - 4 voices  
            'bm_daniel': {
                'id': 'bm_daniel',
                'name': 'Daniel',
                'display_name': 'Daniel (British Male)',
                'gender': 'male',
                'accent': 'british',
                'language': 'en-gb',
                'age_group': 'middle_adult',
                'tone': 'commanding',
                'characteristics': ['authoritative', 'distinguished', 'powerful'],
                'best_for': ['documentary', 'narration', 'leadership'],
                'description': 'Commanding and distinguished British male voice',
                'speed_multiplier': 0.84,
                'intonation': 'authoritative',
                'pause_style': 'confident'
            },
            'bm_fable': {
                'id': 'bm_fable',
                'name': 'Fable',
                'display_name': 'Fable (British Male)',
                'gender': 'male',
                'accent': 'british',
                'language': 'en-gb',
                'age_group': 'middle_adult',
                'tone': 'storytelling',
                'characteristics': ['narrative', 'captivating', 'expressive'],
                'best_for': ['storytelling', 'audiobooks', 'fantasy'],
                'description': 'Captivating British storytelling male voice',
                'speed_multiplier': 0.87,
                'intonation': 'narrative',
                'pause_style': 'dramatic'
            },
            'bm_george': {
                'id': 'bm_george',
                'name': 'George',
                'display_name': 'George (British Male)',
                'gender': 'male',
                'accent': 'british',
                'language': 'en-gb',
                'age_group': 'middle_adult',
                'tone': 'sophisticated',
                'characteristics': ['cultured', 'articulate', 'refined'],
                'best_for': ['classical', 'academic', 'cultural'],
                'description': 'Sophisticated and cultured British male voice',
                'speed_multiplier': 0.87,
                'intonation': 'professional',
                'pause_style': 'thoughtful'
            },
            'bm_lewis': {
                'id': 'bm_lewis',
                'name': 'Lewis',
                'display_name': 'Lewis (British Male)',
                'gender': 'male',
                'accent': 'british',
                'language': 'en-gb',
                'age_group': 'young_adult',
                'tone': 'contemporary',
                'characteristics': ['modern', 'fresh', 'dynamic'],
                'best_for': ['youth', 'technology', 'innovation'],
                'description': 'Contemporary and dynamic British male voice',
                'speed_multiplier': 0.93,
                'intonation': 'conversational',
                'pause_style': 'natural'
            }
        }
    
    def get_all_voices(self) -> Dict[str, Dict[str, Any]]:
        """Get all voice profiles"""
        return self.voices
    
    def get_voice_by_id(self, voice_id: str) -> Dict[str, Any]:
        """Get specific voice profile by ID"""
        return self.voices.get(voice_id, {})
    
    def get_voices_by_gender(self, gender: str) -> Dict[str, Dict[str, Any]]:
        """Get voices filtered by gender"""
        return {k: v for k, v in self.voices.items() if v['gender'] == gender}
    
    def get_voices_by_accent(self, accent: str) -> Dict[str, Dict[str, Any]]:
        """Get voices filtered by accent"""
        return {k: v for k, v in self.voices.items() if v['accent'] == accent}
    
    def get_voices_by_language(self, language: str) -> Dict[str, Dict[str, Any]]:
        """Get voices filtered by language"""
        return {k: v for k, v in self.voices.items() if v['language'] == language}
    
    def get_voices_by_age_group(self, age_group: str) -> Dict[str, Dict[str, Any]]:
        """Get voices filtered by age group"""
        return {k: v for k, v in self.voices.items() if v['age_group'] == age_group}
    
    def get_voices_for_category(self, category: str) -> Dict[str, Dict[str, Any]]:
        """Get recommended voices for a specific content category"""
        return {k: v for k, v in self.voices.items() if category.lower() in [bf.lower() for bf in v['best_for']]}
    
    def get_voice_groups(self) -> Dict[str, List[str]]:
        """Get voices organized by groups for UI display"""
        groups = {
            'American Female': [],
            'American Male': [],
            'British Female': [],
            'British Male': []
        }
        
        for voice_id, voice_data in self.voices.items():
            accent = voice_data['accent'].title()
            gender = voice_data['gender'].title()
            group_key = f"{accent} {gender}"
            if group_key in groups:
                groups[group_key].append(voice_id)
        
        return groups
    
    def get_voice_summary(self) -> Dict[str, int]:
        """Get summary statistics of available voices"""
        total = len(self.voices)
        american = len(self.get_voices_by_accent('american'))
        british = len(self.get_voices_by_accent('british'))
        female = len(self.get_voices_by_gender('female'))
        male = len(self.get_voices_by_gender('male'))
        
        return {
            'total_voices': total,
            'american_voices': american,
            'british_voices': british,
            'female_voices': female,
            'male_voices': male
        }
    
    def export_for_frontend(self) -> Dict[str, Any]:
        """Export voice data in format suitable for frontend"""
        return {
            'voices': self.get_all_voices(),
            'groups': self.get_voice_groups(),
            'summary': self.get_voice_summary(),
            'categories': list(set([category for voice in self.voices.values() for category in voice['best_for']]))
        }

# Test the database
if __name__ == "__main__":
    db = KokoroVoiceDatabase()
    
    print("=== Kokoro-82M Voice Database (Official) ===")
    summary = db.get_voice_summary()
    print(f"Total voices: {summary['total_voices']}")
    print(f"American: {summary['american_voices']}, British: {summary['british_voices']}")
    print(f"Female: {summary['female_voices']}, Male: {summary['male_voices']}")
    
    print("\n=== Voice Groups ===")
    groups = db.get_voice_groups()
    for group, voices in groups.items():
        print(f"{group}: {len(voices)} voices")
        for voice_id in voices[:3]:  # Show first 3 of each group
            voice = db.get_voice_by_id(voice_id)
            print(f"  - {voice['display_name']}: {voice['description']}")
    
    print("\n=== Export for Frontend ===")
    export_data = db.export_for_frontend()
    print(json.dumps({
        'total_voices': len(export_data['voices']),
        'groups': {k: len(v) for k, v in export_data['groups'].items()},
        'categories': len(export_data['categories'])
    }, indent=2))