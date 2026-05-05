from fastapi import APIRouter, Request
from config import Config

router = APIRouter()

@router.get("/rate-limit/status")
def get_rate_limit_status(request: Request):
    return {
        "quotas": {
            "chat": Config.RATE_LIMIT_CHAT,
            "extraction": Config.RATE_LIMIT_EXTRACT
        },
        "reset_period": "Per minute/hour based on endpoint",
        "message": "Limits are applied per user."
    }

@router.get("/warmup")
async def warmup_system():
    try:
        from Database.database import get_db
        db = await get_db()
        
        doc_count = await db.documents.count_documents({})
        
        return {
            "status": "ready",
            "message": "Onboardiq - Onboarding intelligence systems operational",
            "database": {
                "status": "connected",
                "documents": doc_count
            },
            "features": {
                "chat": {
                    "basic": "Simple Q&A over extracted documents",
                    "advanced": "Document-scoped conversation history"
                },
                "extraction": {
                    "url_processing": "URL content extraction and cleanup",
                    "document_indexing": "Document ingestion for later chat"
                },
                "library": {
                    "documents": "Saved extracted documents",
                    "status": "Favorite and archive management"
                }
            },
            "ml_models": [
                f"Google Gemini {Config.GEMINI_MODEL} (LLM)",
                "MongoDB (document storage)",
                "Firebase Authentication"
            ],
            "configuration": {
                "chunk_size": Config.DEFAULT_CHUNK_SIZE,
                "chunk_overlap": Config.DEFAULT_CHUNK_OVERLAP
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"System initialization failed: {str(e)}",
            "details": "Check database connection and environment variables"
        }
