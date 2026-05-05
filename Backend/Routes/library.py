from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
from Middleware.auth import get_current_user
from Database.database import get_db
from bson import ObjectId

router = APIRouter()

class UpdateStatusRequest(BaseModel):
    is_favorite: bool = None
    is_archived: bool = None

class DocumentResponse(BaseModel):
    id: str
    title: str
    url: str
    created_at: str = None
    summary: str = None
    concepts: List[str] = []
    is_favorite: bool = False
    is_archived: bool = False

@router.patch("/library/{doc_id}/status")
async def update_document_status(
    doc_id: str, 
    status_req: UpdateStatusRequest, 
    current_user: dict = Depends(get_current_user)
):
    try:
        db = await get_db()
        
        update_fields = {}
        if status_req.is_favorite is not None:
            update_fields["is_favorite"] = status_req.is_favorite
        if status_req.is_archived is not None:
            update_fields["is_archived"] = status_req.is_archived
            
        if not update_fields:
            raise HTTPException(status_code=400, detail="No status fields provided")

        result = await db.documents.update_one(
            {
                "_id": ObjectId(doc_id),
                "user_id": current_user['uid']
            },
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")
            
        return {"message": "Document status updated successfully", "updated_fields": update_fields}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")

@router.get("/library", response_model=List[DocumentResponse])
async def get_library(current_user: dict = Depends(get_current_user)):
    try:
        db = await get_db()
        cursor = db.documents.find({"user_id": current_user['uid']}).sort("created_at", -1)
        documents = []
        async for doc in cursor:
            concepts_list = doc.get("concepts", [])
            if concepts_list and isinstance(concepts_list[0], dict):
                concepts = [c.get("name", c) for c in concepts_list]
            else:
                concepts = concepts_list
            
            created_at = doc.get("created_at")
            if hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            
            documents.append({
                "id": str(doc["_id"]),
                "title": doc.get("title", "Untitled Document"),
                "url": doc.get("url", ""),
                "created_at": created_at,
                "summary": doc.get("summary", ""),
                "concepts": concepts,
                "is_favorite": doc.get("is_favorite", False),
                "is_archived": doc.get("is_archived", False)
            })
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch library: {str(e)}")

@router.get("/library/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    try:
        db = await get_db()
        doc = await db.documents.find_one({
            "_id": ObjectId(doc_id),
            "user_id": current_user['uid']
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found or access denied")
        
        concepts_list = doc.get("concepts", [])
        if concepts_list and isinstance(concepts_list[0], dict):
            concepts = [c.get("name", c) for c in concepts_list]
        else:
            concepts = concepts_list
        
        created_at = doc.get("created_at")
        if hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
            
        return {
            "id": str(doc["_id"]),
            "title": doc.get("title", "Untitled Document"),
            "url": doc.get("url", ""),
            "created_at": created_at,
            "summary": doc.get("summary", ""),
            "concepts": concepts,
            "is_favorite": doc.get("is_favorite", False),
            "is_archived": doc.get("is_archived", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch document: {str(e)}")

@router.delete("/library/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    try:
        db = await get_db()
        result = await db.documents.delete_many({
            "_id": ObjectId(doc_id),
            "user_id": current_user['uid']
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Document not found or access denied")
            
        await db.document_chunks.delete_many({
            "document_id": ObjectId(doc_id),
            "user_id": current_user['uid']
        })
        
        await db.bm25_tokens.delete_many({
            "document_id": ObjectId(doc_id),
            "user_id": current_user['uid']
        })
        
        await db.concept_notes.delete_many({
            "document_id": ObjectId(doc_id),
            "user_id": current_user['uid']
        })
        
        await db.document_quizzes.delete_many({
            "document_id": ObjectId(doc_id),
            "user_id": current_user['uid']
        })
            
        return {"message": "Document and all associated data deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")
