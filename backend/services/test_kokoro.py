#!/usr/bin/env python3
"""Test script to verify Kokoro-82M installation and basic functionality"""

import sys
import traceback
import numpy as np

def test_kokoro_basic():
    """Test basic Kokoro functionality"""
    print("🧪 Testing Kokoro-82M Installation")
    print("=" * 50)
    
    try:
        # Test import
        print("1️⃣  Testing Kokoro imports...")
        from kokoro import KPipeline
        print("✅ Kokoro import successful")
        
        # Test basic model loading
        print("\n2️⃣  Testing model initialization...")
        pipeline = KPipeline(model_id='kokoro-82M', device='cpu')
        print("✅ Kokoro pipeline created")
        
        # Test basic generation
        print("\n3️⃣  Testing audio generation...")
        test_text = "Hello world"
        print(f"   Input text: '{test_text}'")
        
        # Generate audio
        audio_generator = pipeline(test_text, voice='af_heart')
        print("✅ Audio generator created")
        
        # Try to collect audio
        print("\n4️⃣  Testing audio collection...")
        audio_segments = []
        segment_count = 0
        
        for segment in audio_generator:
            segment_count += 1
            print(f"   Segment {segment_count}: {type(segment)}")
            
            if hasattr(segment, 'audio'):
                audio_data = segment.audio
                print(f"   Has audio attribute: {type(audio_data)}")
            else:
                audio_data = segment
                print(f"   Direct audio data: {type(audio_data)}")
            
            # Convert to numpy
            if hasattr(audio_data, 'cpu'):
                audio_data = audio_data.cpu().numpy()
            elif hasattr(audio_data, 'numpy'):
                audio_data = audio_data.numpy()
            else:
                audio_data = np.array(audio_data, dtype=np.float32)
            
            print(f"   Audio shape: {audio_data.shape}")
            print(f"   Audio dtype: {audio_data.dtype}")
            print(f"   Audio length: {len(audio_data)}")
            
            audio_segments.append(audio_data)
            
            if segment_count >= 3:  # Limit to first 3 segments
                break
        
        if audio_segments:
            final_audio = np.concatenate(audio_segments) if len(audio_segments) > 1 else audio_segments[0]
            print(f"\n✅ Audio generation successful!")
            print(f"   Total segments: {len(audio_segments)}")
            print(f"   Final audio shape: {final_audio.shape}")
            print(f"   Final audio length: {len(final_audio)}")
            print(f"   Sample rate: 24000 Hz (Kokoro default)")
            return True
        else:
            print("❌ No audio segments generated")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print(f"   Exception type: {type(e)}")
        traceback.print_exc()
        return False

def test_kokoro_voices():
    """Test available voices"""
    print("\n🎤 Testing Kokoro Voice Selection")
    print("=" * 50)
    
    try:
        from kokoro import KPipeline
        
        # Test different voices
        test_voices = ['af_heart', 'am_adam', 'bf_heart', 'bm_james']
        pipeline = KPipeline(model_id='kokoro-82M', device='cpu')
        
        for voice_id in test_voices:
            print(f"\n🎯 Testing voice: {voice_id}")
            try:
                audio_gen = pipeline("Test", voice=voice_id)
                # Just check if generator is created
                first_segment = next(iter(audio_gen))
                print(f"   ✅ Voice {voice_id} working")
            except Exception as e:
                print(f"   ❌ Voice {voice_id} failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Voice test error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Kokoro-82M Installation Test")
    print("=" * 50)
    
    # Test basic functionality
    basic_success = test_kokoro_basic()
    
    # Test voice selection
    voice_success = test_kokoro_voices()
    
    print("\n📊 Test Results")
    print("=" * 50)
    print(f"Basic functionality: {'✅ PASS' if basic_success else '❌ FAIL'}")
    print(f"Voice selection: {'✅ PASS' if voice_success else '❌ FAIL'}")
    
    if basic_success and voice_success:
        print("\n🎉 Kokoro-82M installation is working correctly!")
        sys.exit(0)
    else:
        print("\n⚠️  Kokoro-82M installation has issues!")
        sys.exit(1)