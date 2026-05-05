from fastapi import APIRouter, HTTPException, Depends
from Middleware.auth import get_current_user
from models.requests import ChatRequest

router = APIRouter()


@router.post("/chat")
async def chat_with_document(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    question = (req.question or "").strip()
    document_id = req.document_id

    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    if not document_id:
        raise HTTPException(status_code=400, detail="document_id is required for chat")

    return {
        "answer": "Chat is temporarily unavailable while the onboarding rewrite is in progress.",
        "sources_used": 0,
        "document_id": document_id,
        "query_enhanced": False
    }


@router.get("/chat/history/{document_id}")
async def get_chat_history(document_id: str, current_user: dict = Depends(get_current_user)):
    return {
        "document_id": document_id,
        "history": [],
        "summary": "Chat history placeholder response."
    }


@router.delete("/chat/session/{document_id}")
async def clear_chat_session(document_id: str, current_user: dict = Depends(get_current_user)):
    return {"message": f"Chat for document {document_id} cleared", "document_id": document_id}


@router.get("/chat/sessions")
async def list_chat_sessions(current_user: dict = Depends(get_current_user)):
    return {"sessions": [], "total": 0}

