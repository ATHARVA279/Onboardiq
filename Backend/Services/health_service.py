from typing import Dict

from bson import ObjectId

from Database.database import get_db


async def recalculate_workspace_health_score(workspace_id: str) -> Dict:
    db = await get_db()
    workspace_object_id = ObjectId(workspace_id)

    workspace = await db.workspaces.find_one({"_id": workspace_object_id})
    if not workspace:
        raise ValueError("Workspace not found")

    stale_count = await db.chunks.count_documents(
        {"workspace_id": workspace_object_id, "is_stale": True}
    )
    total_chunks = await db.chunks.count_documents({"workspace_id": workspace_object_id})

    failed_sources = sum(
        1 for source in workspace.get("sources", []) if source.get("indexing_status") == "failed"
    )
    pending_sources = sum(
        1
        for source in workspace.get("sources", [])
        if source.get("indexing_status") in {"pending", "indexing"}
    )

    freshness_score = 100.0 if total_chunks == 0 else max(
        0.0, 100.0 - ((stale_count / max(total_chunks, 1)) * 100.0)
    )
    source_score = max(0.0, 100.0 - (failed_sources * 20.0) - (pending_sources * 5.0))
    overall_score = round((freshness_score * 0.7) + (source_score * 0.3), 2)

    await db.workspaces.update_one(
        {"_id": workspace_object_id},
        {"$set": {"health_score": overall_score}},
    )

    return {
        "workspace_id": workspace_id,
        "overall_score": overall_score,
        "breakdown": {
            "freshness": round(freshness_score, 2),
            "source_status": round(source_score, 2),
        },
        "stale_count": stale_count,
        "undocumented_file_count": 0,
    }
