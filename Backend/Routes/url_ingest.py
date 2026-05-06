"""
URL ingest routes:
  POST   /api/workspace/{workspace_id}/connect/url
  GET    /api/workspace/{workspace_id}/source/{source_id}/pages
  DELETE /api/workspace/{workspace_id}/source/{source_id}
"""

import logging
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import Response

from Database.database import get_db
from Middleware.auth import get_current_user
from models.requests import ConnectUrlRequest
from models.responses import JobResponse
from Services.url_ingestion import ingest_url_source

logger = logging.getLogger(__name__)
router = APIRouter()


def _job_payload(job: dict) -> dict:
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


@router.post("/workspace/{workspace_id}/connect/url", response_model=JobResponse)
async def connect_url(
    workspace_id: str,
    request: ConnectUrlRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    db = await get_db()
    workspace_oid = ObjectId(workspace_id)

    # Auth
    workspace = await db.workspaces.find_one({"_id": workspace_oid})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace["owner_uid"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Only the workspace owner can connect sources")

    url_str = str(request.url).rstrip("/")

    # URL scheme validation
    parsed = urlparse(url_str)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=422, detail="URL must start with http:// or https://")

    # Reachability check
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=5.0, verify=False) as client:
            head = await client.head(url_str)
            if head.status_code >= 500:
                raise HTTPException(
                    status_code=422,
                    detail="URL is not reachable. Please check the URL and try again.",
                )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="URL is not reachable. Please check the URL and try again.",
        )

    # Duplicate check
    for source in workspace.get("sources", []):
        if source.get("url", "").rstrip("/") == url_str:
            raise HTTPException(
                status_code=409,
                detail="This URL is already connected to this workspace.",
            )

    # Display name fallback = domain
    display_name = (
        request.display_name.strip()
        if request.display_name
        else parsed.netloc
    )

    now = datetime.now(timezone.utc)
    source_id = ObjectId()
    source = {
        "source_id": source_id,
        "source_type": "url",
        "url": url_str,
        "display_name": display_name,
        "last_indexed_at": None,
        "last_commit_hash": None,
        "indexing_status": "pending",
        "file_count": 0,
        "chunk_count": 0,
    }

    await db.workspaces.update_one(
        {"_id": workspace_oid},
        {"$push": {"sources": source}, "$set": {"updated_at": now}},
    )

    job = {
        "_id": ObjectId(),
        "workspace_id": workspace_oid,
        "source_id": source_id,
        "job_type": "url_ingest",
        "status": "queued",
        "progress_current": 0,
        "progress_total": 0,
        "progress_message": "Queued for URL ingestion",
        "error_message": None,
        "started_at": None,
        "completed_at": None,
        "created_at": now,
    }
    await db.jobs.insert_one(job)

    background_tasks.add_task(
        ingest_url_source,
        url_str,
        workspace_id,
        str(source_id),
        str(job["_id"]),
    )

    return _job_payload(job)


@router.get("/workspace/{workspace_id}/source/{source_id}/pages")
async def get_source_pages(
    workspace_id: str,
    source_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = await get_db()
    workspace_oid = ObjectId(workspace_id)
    source_oid = ObjectId(source_id)

    workspace = await db.workspaces.find_one(
        {"_id": workspace_oid, "members": current_user["uid"]}
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Aggregate unique source_url values and chunk counts for this source
    pipeline = [
        {
            "$match": {
                "workspace_id": workspace_oid,
                "source_id": source_oid,
                "source_url": {"$exists": True, "$ne": None},
            }
        },
        {
            "$group": {
                "_id": "$source_url",
                "chunk_count": {"$sum": 1},
                "page_title": {"$first": "$page_title"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    cursor = db.chunks.aggregate(pipeline)
    pages = await cursor.to_list(length=500)

    return {
        "pages": [
            {
                "url": p["_id"],
                "page_title": p.get("page_title", ""),
                "chunk_count": p["chunk_count"],
            }
            for p in pages
        ]
    }


@router.delete("/workspace/{workspace_id}/source/{source_id}", status_code=204)
async def delete_source(
    workspace_id: str,
    source_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = await get_db()
    workspace_oid = ObjectId(workspace_id)
    source_oid = ObjectId(source_id)

    workspace = await db.workspaces.find_one({"_id": workspace_oid})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace["owner_uid"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Only the workspace owner can delete sources")

    # Delete all chunks for this source
    await db.chunks.delete_many({"workspace_id": workspace_oid, "source_id": source_oid})

    # Remove source from workspace
    await db.workspaces.update_one(
        {"_id": workspace_oid},
        {
            "$pull": {"sources": {"source_id": source_oid}},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

    # Delete associated jobs
    await db.jobs.delete_many({"workspace_id": workspace_oid, "source_id": source_oid})

    return Response(status_code=204)
