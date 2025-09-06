import traceback
from KokoroOnlyTTSService import KokoroOnlyTTSService

print("Testing Kokoro generation...")

try:
    service = KokoroOnlyTTSService()
    print("Service initialized")
    
    result = service.generate_audio(
        text="Hello world",
        voice_id='af_heart',
        speed=1.0
    )
    
    if result:
        print("SUCCESS!")
        print(f"File: {result.get('file_path', 'Unknown')}")
    else:
        print("FAILED - no result")
        
except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()