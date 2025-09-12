#!/usr/bin/env python3
"""
Simple Chatterbox TTS Implementation using the example files
"""

import os
import sys
import subprocess
import json
import tempfile
from pathlib import Path

def generate_chatterbox_audio(text: str, language: str = "en", output_path: str = None) -> dict:
    """Generate TTS audio using Chatterbox via the example script"""
    
    try:
        chatterbox_dir = Path(__file__).parent.parent / "chatterbox"
        
        if not chatterbox_dir.exists():
            return {"success": False, "error": "Chatterbox directory not found"}
        
        # Create temporary Python script to run Chatterbox
        script_content = f"""
import sys
sys.path.insert(0, r"{chatterbox_dir / 'src'}")

try:
    import torch
    import torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    
    # Detect device
    if torch.cuda.is_available():
        device = "cuda"
    else:
        device = "cpu"
    
    print(f"Using device: {{device}}")
    
    # Load multilingual model
    model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    
    # Generate audio
    text = "{text}"
    language_id = "{language}"
    
    wav = model.generate(text, language_id=language_id)
    
    # Save audio
    output_path = r"{output_path or 'chatterbox_output.wav'}"
    ta.save(output_path, wav, model.sr)
    
    print(f"Audio saved to: {{output_path}}")
    print(f"Duration: {{wav.shape[1] / model.sr:.2f}}s")
    print("SUCCESS")
    
except Exception as e:
    print(f"ERROR: {{e}}")
    import traceback
    traceback.print_exc()
"""
        
        # Write and execute script
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(script_content)
            temp_script = f.name
        
        try:
            # Run the script
            result = subprocess.run([
                sys.executable, temp_script
            ], capture_output=True, text=True, timeout=60)
            
            if "SUCCESS" in result.stdout:
                return {
                    "success": True,
                    "output": result.stdout,
                    "file_path": output_path or "chatterbox_output.wav"
                }
            else:
                return {
                    "success": False,
                    "error": f"Generation failed: {result.stderr or result.stdout}"
                }
        
        finally:
            try:
                os.unlink(temp_script)
            except:
                pass
                
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    # Test the implementation
    result = generate_chatterbox_audio("Hello, this is a test of Chatterbox TTS!", "en")
    print(json.dumps(result, indent=2))