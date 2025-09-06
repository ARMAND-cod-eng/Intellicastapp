#!/usr/bin/env python3
"""Debug script to isolate Kokoro generation issues"""

import traceback
from KokoroOnlyTTSService import KokoroOnlyTTSService

def test_simple_generation():
    print("🧪 Testing simple Kokoro generation")
    
    try:
        # Initialize service
        service = KokoroOnlyTTSService()
        
        # Test simple text
        test_text = "Hello world"
        print(f"Testing with text: '{test_text}'")
        
        # Generate audio
        result = service.generate_audio_with_voice(
            text=test_text,
            voice_id='af_heart',
            speed=1.0
        )
        
        if result:
            print("✅ Generation successful!")
            print(f"File: {result.get('file_path', 'Unknown')}")
            print(f"Duration: {result.get('duration', 'Unknown')}")
        else:
            print("❌ Generation failed - no result")
        
    except Exception as e:
        print(f"❌ Generation failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_simple_generation()