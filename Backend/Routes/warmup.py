from fastapi import APIRouter, Request

from config import Config

router = APIRouter()


@router.get("/rate-limit/status")
def get_rate_limit_status(request: Request):
    return {
        "quotas": {
            "chat": Config.RATE_LIMIT_CHAT,
            "ingestion": Config.RATE_LIMIT_EXTRACT,
        },
        "reset_period": "Per minute/hour based on endpoint",
        "message": "Limits are applied per user.",
    }


@router.get("/warmup")
async def warmup_system():
    try:
        from Database.database import get_db

        db = await get_db()
        workspace_count = await db.workspaces.count_documents({})
        chunk_count = await db.chunks.count_documents({})

        return {
            "status": "ready",
            "message": "Onboardiq onboarding intelligence systems operational",
            "database": {
                "status": "connected",
                "workspaces": workspace_count,
                "chunks": chunk_count,
            },
            "features": {
                "ingestion": {
                    "github": "Repository ingestion and chunk storage",
                    "url_processing": "Workspace source ingestion pipeline",
                },
                "retrieval": {
                    "vector_search": "Atlas vector search over indexed chunks",
                    "citations": "Chunk-level source attribution",
                },
                "monitoring": {
                    "health_score": "Workspace health and stale knowledge tracking",
                },
            },
            "ml_models": [
                Config.EMBEDDING_MODEL,
                "MongoDB Atlas Vector Search",
                "Firebase Authentication",
            ],
            "configuration": {
                "chunk_size_words": Config.DEFAULT_CHUNK_SIZE,
                "chunk_overlap_words": Config.DEFAULT_CHUNK_OVERLAP,
            },
        }
    except Exception as exc:
        return {
            "status": "error",
            "message": f"System initialization failed: {str(exc)}",
            "details": "Check database connection and environment variables",
        }
