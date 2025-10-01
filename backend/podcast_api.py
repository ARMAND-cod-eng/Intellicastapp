"""
Backend API for NotebookLM Podcast Generation
FastAPI endpoints for the Multi-Voice Conversation feature
"""

import os
import sys
import json
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import TogetherNotebookLM, PodcastOptions, PodcastResult
from usage_tracker import get_tracker

app = FastAPI(title="Together AI Podcast Generator API")

# CORS middleware - Allow all localhost ports for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5177", "http://localhost:5176", "http://localhost:5175", "http://localhost:5174", "http://localhost:5173", "http://localhost:3004", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize pipeline
podcast_pipeline = None


def get_pipeline():
    """Get or create podcast pipeline instance"""
    global podcast_pipeline
    if podcast_pipeline is None:
        podcast_pipeline = TogetherNotebookLM()
    return podcast_pipeline


class PodcastGenerationRequest(BaseModel):
    """Request model for podcast generation"""
    document_text: str
    length: str = "10min"
    host_voice: str = "host_male_friendly"
    guest_voice: str = "guest_female_expert"
    style: str = "conversational"
    tone: str = "friendly"
    num_speakers: int = 2
    output_format: str = "mp3"
    save_script: bool = True


class CostEstimateRequest(BaseModel):
    """Request model for cost estimation"""
    document_text: str
    length: str = "10min"


# Storage for generation jobs
generation_jobs: Dict[str, Dict[str, Any]] = {}


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "service": "Together AI NotebookLM Podcast Generator",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        pipeline = get_pipeline()
        return {
            "status": "healthy",
            "llm_ready": pipeline.llm_generator is not None,
            "tts_ready": pipeline.tts_generator is not None,
            "tracker_ready": pipeline.usage_tracker is not None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.post("/api/podcast/estimate-cost")
async def estimate_cost(request: CostEstimateRequest):
    """Estimate podcast generation cost"""
    try:
        pipeline = get_pipeline()

        options = PodcastOptions(length=request.length)
        estimate = pipeline.estimate_cost(request.document_text, options)

        return {
            "success": True,
            "estimate": estimate,
            "breakdown": {
                "llm_cost": f"${estimate['llm_cost']:.4f}",
                "tts_cost": f"${estimate['tts_cost']:.4f}",
                "total_cost": f"${estimate['total_cost']:.4f}"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/podcast/generate")
async def generate_podcast(request: PodcastGenerationRequest, background_tasks: BackgroundTasks):
    """Generate podcast from document text"""
    try:
        # Create unique job ID
        job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Initialize job status
        generation_jobs[job_id] = {
            "status": "processing",
            "progress": 0,
            "message": "Starting podcast generation...",
            "created_at": datetime.now().isoformat()
        }

        # Save document to temporary file
        temp_dir = Path("backend/uploads/temp")
        temp_dir.mkdir(parents=True, exist_ok=True)

        doc_file = temp_dir / f"{job_id}.txt"
        with open(doc_file, 'w', encoding='utf-8') as f:
            f.write(request.document_text)

        # Configure options
        options = PodcastOptions(
            length=request.length,
            host_voice=request.host_voice,
            guest_voice=request.guest_voice,
            style=request.style,
            output_format=request.output_format,
            add_pauses=True,
            normalize_audio=True,
            temperature=0.8,
            save_script=request.save_script,
            output_dir="backend/audio/podcasts"
        )

        # Generate podcast in background
        def generate_in_background():
            try:
                pipeline = get_pipeline()

                # Update progress
                generation_jobs[job_id]["progress"] = 20
                generation_jobs[job_id]["message"] = "Processing document..."

                # Generate
                result = pipeline.create_podcast(str(doc_file), options)

                # Update job with result
                generation_jobs[job_id]["status"] = "completed" if result.success else "failed"
                generation_jobs[job_id]["progress"] = 100
                generation_jobs[job_id]["result"] = result.to_dict()
                generation_jobs[job_id]["message"] = "Podcast generated successfully!" if result.success else result.error

            except Exception as e:
                generation_jobs[job_id]["status"] = "failed"
                generation_jobs[job_id]["error"] = str(e)
                generation_jobs[job_id]["message"] = f"Generation failed: {str(e)}"

        background_tasks.add_task(generate_in_background)

        return {
            "success": True,
            "job_id": job_id,
            "message": "Podcast generation started",
            "status_url": f"/api/podcast/status/{job_id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/podcast/generate-sync")
async def generate_podcast_sync(request: PodcastGenerationRequest):
    """Generate podcast synchronously (blocks until complete)"""
    try:
        pipeline = get_pipeline()

        # Save document to temporary file
        temp_dir = Path("backend/uploads/temp")
        temp_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        doc_file = temp_dir / f"doc_{timestamp}.txt"

        with open(doc_file, 'w', encoding='utf-8') as f:
            f.write(request.document_text)

        # Configure options
        options = PodcastOptions(
            length=request.length,
            host_voice=request.host_voice,
            guest_voice=request.guest_voice,
            style=request.style,
            output_format=request.output_format,
            add_pauses=True,
            normalize_audio=True,
            temperature=0.8,
            save_script=request.save_script,
            output_dir="backend/audio/podcasts"
        )

        # Generate podcast
        result = pipeline.create_podcast(str(doc_file), options)

        if result.success:
            return {
                "success": True,
                "audio_file": result.audio_file,
                "script_file": result.script_file,
                "duration": result.duration_seconds,
                "cost": result.total_cost,
                "metadata": result.metadata
            }
        else:
            raise HTTPException(status_code=500, detail=result.error)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/podcast/status/{job_id}")
async def get_job_status(job_id: str):
    """Get status of podcast generation job"""
    if job_id not in generation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "success": True,
        "job": generation_jobs[job_id]
    }


@app.get("/api/podcast/download/{filename}")
async def download_podcast(filename: str):
    """Download generated podcast file"""
    file_path = Path("backend/audio/podcasts") / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(file_path),
        media_type="audio/mpeg" if filename.endswith('.mp3') else "audio/wav",
        filename=filename
    )


@app.get("/api/podcast/voices")
async def get_available_voices():
    """Get list of available voice presets"""
    from tts_generator import CartesiaTTSGenerator

    tts = CartesiaTTSGenerator()
    voices = tts.get_available_voices()

    return {
        "success": True,
        "voices": voices
    }


@app.get("/api/usage/summary")
async def get_usage_summary():
    """Get usage tracking summary"""
    try:
        tracker = get_tracker()
        report = tracker.get_monthly_report()

        return {
            "success": True,
            "usage": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload/document")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process document"""
    try:
        # Save uploaded file
        upload_dir = Path("backend/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = upload_dir / file.filename

        with open(file_path, 'wb') as f:
            content = await file.read()
            f.write(content)

        # Extract text
        text_content = content.decode('utf-8') if file.filename.endswith('.txt') else ""

        return {
            "success": True,
            "filename": file.filename,
            "file_path": str(file_path),
            "size": len(content),
            "text_preview": text_content[:500] if text_content else None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    print("="*70)
    print("Together AI NotebookLM Podcast API")
    print("="*70)
    print("\nStarting server...")
    print("API will be available at: http://localhost:8000")
    print("Documentation at: http://localhost:8000/docs")
    print("="*70 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
