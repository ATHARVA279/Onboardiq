from fastapi import APIRouter, Request
import logging

from config import Config

logger = logging.getLogger(__name__)
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


@router.get("/health/embedding-service")
async def check_embedding_service():
    """Diagnose embedding service connectivity (Google Generative AI)."""
    try:
        import asyncio
        from Services.embedding_service import get_embedding

        # Test with a simple string
        test_text = "test"
        logger.info("[health] Testing embedding service connectivity...")
        
        result = await asyncio.wait_for(
            get_embedding(test_text, mode="query"),
            timeout=30.0
        )
        
        if result and len(result) > 0:
            return {
                "status": "healthy",
                "service": "embedding",
                "message": "Successfully connected to Google Generative AI Embedding API",
                "embedding_dim": len(result),
            }
        else:
            return {
                "status": "error",
                "service": "embedding",
                "message": "Embedding service returned empty result",
            }
            
    except asyncio.TimeoutError:
        logger.error("[health] Embedding service timeout (network/DNS issue?)")
        return {
            "status": "timeout",
            "service": "embedding",
            "message": "Timeout contacting embedding service. Check DNS, network, and firewall settings.",
            "recommendation": "Check: 1) DNS resolution 2) Network connectivity to generativelanguage.googleapis.com 3) Firewall rules 4) Google API key validity",
        }
    except Exception as e:
        error_str = str(e).lower()
        is_dns = any(kw in error_str for kw in ["dns", "address lookup", "resolve", "hostname"])
        
        logger.error(f"[health] Embedding service error: {e}", exc_info=True)
        return {
            "status": "unhealthy",
            "service": "embedding",
            "error_type": type(e).__name__,
            "error_message": str(e)[:300],
            "likely_cause": "DNS resolution failure" if is_dns else "Network or API error",
            "recommendation": (
                "For DNS errors: Check your system's DNS configuration and network connectivity. "
                "Verify you can reach generativelanguage.googleapis.com. "
                "For API errors: Verify GOOGLE_API_KEY is valid."
            ) if is_dns else "Check network connectivity and API key configuration",
        }
