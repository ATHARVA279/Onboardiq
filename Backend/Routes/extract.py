from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from Middleware.auth import get_current_user
from models.requests import ExtractRequest

router = APIRouter()

@router.post("/extract")
async def extract_url(extract_req: ExtractRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    return {
        "job_id": "placeholder-extract-job",
        "status": "pending",
        "message": "Extraction is temporarily unavailable while the onboarding rewrite is in progress."
    }

@router.get("/extract/status/{job_id}")
async def get_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    return {
        "job_id": job_id,
        "status": "completed",
        "progress": 100,
        "result": {"document_id": "placeholder-document"},
        "message": "Extraction status placeholder response."
    }

@router.get("/extract/jobs")
async def list_jobs(current_user: dict = Depends(get_current_user)):
    return []

@router.delete("/clear-store")
async def clear_database(current_user: dict = Depends(get_current_user)):
    return {"message": "Extraction store placeholder response."}

