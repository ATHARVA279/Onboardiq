"""Routes/staleness.py — Staleness detection API endpoints."""

import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from Database.database import get_db
from Middleware.auth import get_current_user
from Services.staleness_service import (
    calculate_health_score,
    detect_mode,
    run_staleness_check,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_alert(alert: dict) -> dict:
    out = dict(alert)
    for key in ("_id", "workspace_id", "source_id", "doc_chunk_id"):
        if key in out and isinstance(out[key], ObjectId):
            out[key] = str(out[key])
    return out


async def _require_workspace_access(workspace_id: str, user_uid: str, db) -> dict:
    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if user_uid not in workspace.get("members", []) and workspace.get("owner_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    return workspace


SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}


# ---------------------------------------------------------------------------
# POST /workspace/{workspace_id}/staleness/check
# ---------------------------------------------------------------------------

@router.post("/workspace/{workspace_id}/staleness/check")
async def trigger_staleness_check(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Manually trigger a staleness check. Returns job immediately."""
    user_uid = current_user.get("uid")
    db = await get_db()
    await _require_workspace_access(workspace_id, user_uid, db)

    now = datetime.now(timezone.utc)
    job_doc = {
        "workspace_id": ObjectId(workspace_id),
        "source_id": ObjectId(workspace_id),   # workspace-level job
        "job_type": "staleness_check",
        "status": "queued",
        "progress_current": 0,
        "progress_total": 0,
        "progress_message": "Staleness check queued",
        "error_message": None,
        "started_at": None,
        "completed_at": None,
        "created_at": now,
    }
    result = await db.jobs.insert_one(job_doc)
    job_id = str(result.inserted_id)

    background_tasks.add_task(run_staleness_check, workspace_id, job_id)

    return {
        "_id": job_id,
        "workspace_id": workspace_id,
        "source_id": workspace_id,
        "job_type": "staleness_check",
        "status": "queued",
        "progress_current": 0,
        "progress_total": 0,
        "progress_message": "Staleness check queued",
        "error_message": None,
        "started_at": None,
        "completed_at": None,
        "created_at": now,
    }


# ---------------------------------------------------------------------------
# GET /workspace/{workspace_id}/staleness/alerts
# ---------------------------------------------------------------------------

@router.get("/workspace/{workspace_id}/staleness/alerts")
async def get_staleness_alerts(
    workspace_id: str,
    resolved: bool = Query(default=False),
    severity: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    current_user: dict = Depends(get_current_user),
):
    """Return staleness alerts for the workspace."""
    user_uid = current_user.get("uid")
    db = await get_db()
    await _require_workspace_access(workspace_id, user_uid, db)

    query: dict = {
        "workspace_id": ObjectId(workspace_id),
        "resolved": resolved,
    }
    if severity and severity in ("high", "medium", "low"):
        query["severity"] = severity

    cursor = db.staleness_alerts.find(query).sort("created_at", -1).limit(limit)
    alerts = await cursor.to_list(length=limit)

    # Sort: severity (high first) then created_at desc
    alerts.sort(
        key=lambda a: (SEVERITY_ORDER.get(a.get("severity", "low"), 2), -a["created_at"].timestamp()),
    )

    return [_serialize_alert(a) for a in alerts]


# ---------------------------------------------------------------------------
# PATCH /workspace/{workspace_id}/staleness/alerts/{alert_id}/resolve
# ---------------------------------------------------------------------------

@router.patch("/workspace/{workspace_id}/staleness/alerts/{alert_id}/resolve")
async def resolve_alert(
    workspace_id: str,
    alert_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark an alert as resolved and recalculate health score."""
    user_uid = current_user.get("uid")
    db = await get_db()
    await _require_workspace_access(workspace_id, user_uid, db)

    now = datetime.now(timezone.utc)
    result = await db.staleness_alerts.find_one_and_update(
        {"_id": ObjectId(alert_id), "workspace_id": ObjectId(workspace_id)},
        {"$set": {
            "resolved": True,
            "resolved_at": now,
            "resolved_by_uid": user_uid,
        }},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")

    await calculate_health_score(workspace_id)
    return _serialize_alert(result)


# ---------------------------------------------------------------------------
# DELETE /workspace/{workspace_id}/staleness/alerts/{alert_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/workspace/{workspace_id}/staleness/alerts/{alert_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def dismiss_alert(
    workspace_id: str,
    alert_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a staleness alert (dismiss false positive) and recalculate health score."""
    user_uid = current_user.get("uid")
    db = await get_db()
    await _require_workspace_access(workspace_id, user_uid, db)

    result = await db.staleness_alerts.delete_one(
        {"_id": ObjectId(alert_id), "workspace_id": ObjectId(workspace_id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")

    await calculate_health_score(workspace_id)


# ---------------------------------------------------------------------------
# GET /workspace/{workspace_id}/staleness/summary
# ---------------------------------------------------------------------------

@router.get("/workspace/{workspace_id}/staleness/summary")
async def get_staleness_summary(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Return summary statistics for the dashboard."""
    user_uid = current_user.get("uid")
    db = await get_db()
    workspace = await _require_workspace_access(workspace_id, user_uid, db)

    # Count unresolved alerts by severity
    pipeline = [
        {"$match": {"workspace_id": ObjectId(workspace_id), "resolved": False}},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
    ]
    cursor = db.staleness_alerts.aggregate(pipeline)
    severity_counts = {doc["_id"]: doc["count"] for doc in await cursor.to_list(length=None)}

    total = sum(severity_counts.values())

    # Most recent completed staleness_check job
    last_job = await db.jobs.find_one(
        {"workspace_id": ObjectId(workspace_id), "job_type": "staleness_check", "status": "completed"},
        sort=[("completed_at", -1)],
    )
    last_checked_at = last_job.get("completed_at") if last_job else None

    # Detect current mode
    mode = await detect_mode(workspace_id)

    return {
        "total_alerts": total,
        "high_severity": severity_counts.get("high", 0),
        "medium_severity": severity_counts.get("medium", 0),
        "low_severity": severity_counts.get("low", 0),
        "health_score": workspace.get("health_score", 100.0),
        "last_checked_at": last_checked_at,
        "mode": mode,
    }
