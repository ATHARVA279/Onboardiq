from datetime import datetime, timezone
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from Database.database import get_db
from Middleware.auth import get_current_user
from Services.github_ingestion import connect_and_ingest_repo
from Services.url_ingestion import ingest_url_source
from models.requests import ConnectGithubRequest, CreateWorkspaceRequest
from models.responses import JobResponse, WorkspaceResponse

router = APIRouter()


def _serialize_value(value: Any):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize_value(item) for key, item in value.items()}
    return value


def _workspace_response_payload(workspace: Dict) -> Dict:
    return {
        "_id": str(workspace["_id"]),
        "name": workspace["name"],
        "owner_uid": workspace["owner_uid"],
        "members": workspace.get("members", []),
        "sources": [
            {
                "source_id": str(source["source_id"]),
                "source_type": source["source_type"],
                "url": source["url"],
                "display_name": source["display_name"],
                "last_indexed_at": source.get("last_indexed_at"),
                "last_commit_hash": source.get("last_commit_hash"),
                "indexing_status": source["indexing_status"],
                "file_count": source.get("file_count", 0),
                "chunk_count": source.get("chunk_count", 0),
            }
            for source in workspace.get("sources", [])
        ],
        "created_at": workspace["created_at"],
        "updated_at": workspace["updated_at"],
        "health_score": workspace.get("health_score", 100.0),
    }


def _job_response_payload(job: Dict) -> Dict:
    return {
        "_id": str(job["_id"]),
        "workspace_id": str(job["workspace_id"]),
        "source_id": str(job["source_id"]),
        "job_type": job["job_type"],
        "status": job["status"],
        "progress_current": job.get("progress_current", 0),
        "progress_total": job.get("progress_total", 0),
        "progress_message": job.get("progress_message", ""),
        "error_message": job.get("error_message"),
        "started_at": job.get("started_at"),
        "completed_at": job.get("completed_at"),
        "created_at": job["created_at"],
    }


@router.post("/workspace/create", response_model=WorkspaceResponse)
async def create_workspace(
    request: CreateWorkspaceRequest,
    current_user: dict = Depends(get_current_user),
):
    db = await get_db()
    normalized_name = request.name.strip()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Workspace name cannot be empty")

    # Case-insensitive duplicate check for this user
    existing = await db.workspaces.find_one({
        "owner_uid": current_user["uid"],
        "name": {"$regex": f"^{normalized_name}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=409, detail="You already have a workspace with this name")

    now = datetime.now(timezone.utc)
    workspace = {
        "name": normalized_name,
        "owner_uid": current_user["uid"],
        "members": [current_user["uid"]],
        "sources": [],
        "created_at": now,
        "updated_at": now,
        "health_score": 100.0,
    }

    result = await db.workspaces.insert_one(workspace)
    workspace["_id"] = result.inserted_id
    return _workspace_response_payload(workspace)


@router.post("/workspace/{workspace_id}/connect/github", response_model=JobResponse)
async def connect_github_repo(
    workspace_id: str,
    request: ConnectGithubRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    if workspace_id != request.workspace_id:
        raise HTTPException(status_code=400, detail="Path workspace_id does not match request body")

    db = await get_db()
    workspace_object_id = ObjectId(workspace_id)
    workspace = await db.workspaces.find_one({"_id": workspace_object_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace["owner_uid"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Only the workspace owner can connect GitHub repositories")

    now = datetime.now(timezone.utc)
    source_id = ObjectId()
    source = {
        "source_id": source_id,
        "source_type": "github_repo",
        "url": request.repo_url,
        "display_name": request.repo_url.rstrip("/").split("/")[-1].replace(".git", ""),
        "last_indexed_at": None,
        "last_commit_hash": None,
        "indexing_status": "pending",
        "file_count": 0,
        "chunk_count": 0,
    }

    await db.workspaces.update_one(
        {"_id": workspace_object_id},
        {
            "$push": {"sources": source},
            "$set": {"updated_at": now},
        },
    )

    job = {
        "_id": ObjectId(),
        "workspace_id": workspace_object_id,
        "source_id": source_id,
        "job_type": "github_ingest",
        "status": "queued",
        "progress_current": 0,
        "progress_total": 0,
        "progress_message": "Queued for GitHub ingestion",
        "error_message": None,
        "started_at": None,
        "completed_at": None,
        "created_at": now,
    }
    await db.jobs.insert_one(job)

    background_tasks.add_task(
        connect_and_ingest_repo,
        request.repo_url,
        request.github_token,
        workspace_id,
        str(source_id),
        str(job["_id"]),
    )

    return _job_response_payload(job)


@router.post("/workspace/{workspace_id}/source/{source_id}/reindex", response_model=JobResponse)
async def reindex_source(
    workspace_id: str,
    source_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    db = await get_db()
    workspace_object_id = ObjectId(workspace_id)
    source_object_id = ObjectId(source_id)

    workspace = await db.workspaces.find_one({"_id": workspace_object_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace["owner_uid"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Only the workspace owner can reindex sources")

    # Find the source in the workspace
    source = next((s for s in workspace.get("sources", []) if s["source_id"] == source_object_id), None)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found in workspace")

    # Delete all existing chunks for this source
    await db.chunks.delete_many({
        "workspace_id": workspace_object_id,
        "source_id": source_object_id
    })

    # Update source status
    now = datetime.now(timezone.utc)
    await db.workspaces.update_one(
        {"_id": workspace_object_id, "sources.source_id": source_object_id},
        {
            "$set": {
                "sources.$.indexing_status": "pending",
                "sources.$.chunk_count": 0,
                "sources.$.file_count": 0,
                "updated_at": now
            }
        }
    )

    # Create new job
    job_type = "github_ingest" if source["source_type"] == "github_repo" else "url_ingest"
    job = {
        "_id": ObjectId(),
        "workspace_id": workspace_object_id,
        "source_id": source_object_id,
        "job_type": job_type,
        "status": "queued",
        "progress_current": 0,
        "progress_total": 0,
        "progress_message": f"Queued for {job_type.replace('_', ' ')}",
        "error_message": None,
        "started_at": None,
        "completed_at": None,
        "created_at": now,
    }
    await db.jobs.insert_one(job)

    # Spawn background task
    if source["source_type"] == "github_repo":
        background_tasks.add_task(
            connect_and_ingest_repo,
            source["url"],
            None,  # Using default token for reindex
            workspace_id,
            str(source_object_id),
            str(job["_id"]),
        )
    else:
        background_tasks.add_task(
            ingest_url_source,
            source["url"],
            workspace_id,
            str(source_object_id),
            str(job["_id"]),
        )

    return _job_response_payload(job)


@router.get("/workspace/{workspace_id}/job/{job_id}", response_model=JobResponse)
async def get_job_status(
    workspace_id: str,
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = await get_db()
    workspace = await db.workspaces.find_one(
        {"_id": ObjectId(workspace_id), "members": current_user["uid"]}
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    job = await db.jobs.find_one(
        {"_id": ObjectId(job_id), "workspace_id": ObjectId(workspace_id)}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return _job_response_payload(job)


@router.get("/workspace/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = await get_db()
    workspace = await db.workspaces.find_one(
        {"_id": ObjectId(workspace_id), "members": current_user["uid"]}
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return _workspace_response_payload(workspace)


@router.get("/workspaces", response_model=List[WorkspaceResponse])
async def list_workspaces(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    cursor = db.workspaces.find({"members": current_user["uid"]}).sort("created_at", -1)
    workspaces = await cursor.to_list(length=200)
    return [_workspace_response_payload(workspace) for workspace in workspaces]
