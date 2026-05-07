import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

from bson.objectid import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel

from Database.database import get_db
from Middleware.auth import get_current_user
from models.requests import ChatRequest
from models.responses import ChatResponse
from Services.retrieval_service import embed_query, parallel_retrieval, rerank
from Services.answer_service import generate_answer, parse_citations, calculate_confidence, clean_llm_response
from Services.github_ingestion import connect_and_ingest_repo

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Debug / reindex models
# ---------------------------------------------------------------------------

class DebugRequest(BaseModel):
    workspace_id: str
    question: str


class ReindexRequest(BaseModel):
    pass  # no body needed; workspace_id comes from path

@router.post("/workspace/{workspace_id}/ask", response_model=ChatResponse)
async def ask_question(workspace_id: str, request: ChatRequest, current_user: dict = Depends(get_current_user)):
    user_uid = current_user.get("uid")
    db = await get_db()
    
    # Validate workspace
    workspace = await db.workspaces.find_one({"_id": ObjectId(request.workspace_id)})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if user_uid not in workspace.get("members", []) and workspace.get("owner_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
        
    session_id = request.session_id or str(uuid.uuid4())
    
    # Load last 6 messages for conversational context
    session_doc = await db.sessions.find_one({
        "session_id": session_id,
        "workspace_id": request.workspace_id
    })
    
    session_messages = []
    if session_doc and "messages" in session_doc:
        session_messages = session_doc["messages"][-6:]
        
    try:
        # Get query embedding
        query_embedding = await embed_query(request.question)
        
        # Parallel vector searches
        retrieved_chunks = await parallel_retrieval(
            query_embedding=query_embedding,
            workspace_id=request.workspace_id,
            source_ids=request.source_ids if request.source_ids else None
        )
        
        if not retrieved_chunks:
            return ChatResponse(
                answer="I could not find any relevant information in the indexed codebase. Please connect more sources or re-index existing ones.",
                sources_cited=[],
                all_retrieved_chunks=[],
                confidence_score=0.0,
                session_id=session_id
            )

        # ── Relevance gate ────────────────────────────────────────────────────
        # If the highest similarity score is below 0.55 the question is almost
        # certainly not about this codebase — skip Groq entirely.
        RELEVANCE_THRESHOLD = 0.55
        top_score = max((c.get("score", 0.0) for c in retrieved_chunks), default=0.0)
        logger.info("[chat] top_score=%.4f (threshold=%.2f)", top_score, RELEVANCE_THRESHOLD)

        if top_score < RELEVANCE_THRESHOLD:
            logger.info("[chat] Relevance gate triggered — returning refusal (top_score=%.4f)", top_score)
            return ChatResponse(
                answer="This question does not appear to be related to the indexed codebase. I can only answer questions about the specific project that has been indexed here — try asking about a feature, file, service, or architectural decision in your project.",
                sources_cited=[],
                all_retrieved_chunks=[],
                confidence_score=0.0,
                session_id=session_id
            )
            
        # Rerank
        reranked_chunks = await rerank(request.question, retrieved_chunks)
        
    except HTTPException:
        raise
    except Exception as e:
        # Check if this is a DNS/network error
        error_str = str(e).lower()
        is_dns_error = any(kw in error_str for kw in ["dns", "address lookup", "resolve", "hostname"])
        
        if is_dns_error or "servicenavailable" in str(type(e)).lower():
            logger.error(f"[chat] Network/DNS error during embedding: {e}", exc_info=True)
            raise HTTPException(
                status_code=503,
                detail="Network connectivity issue: Unable to reach the AI embedding service. This is typically a temporary DNS or network issue. Please try again in a moment."
            )
        else:
            logger.error(f"[chat] Unexpected error during vector search: {e}", exc_info=True)
            raise HTTPException(
                status_code=503,
                detail=f"Vector search failed: {type(e).__name__}"
            )
        
    try:
        # Generate Answer
        raw_answer = await generate_answer(request.question, reranked_chunks, session_messages)
    except Exception as e:
        logger.error(f"[chat] Both AI providers failed: {e}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={
                "error": "ai_unavailable",
                "message": "Both AI providers are temporarily unavailable. This is usually due to rate limits. Please wait 30 seconds and try again.",
                "retry_after_seconds": 30,
            },
        )
        
    logger.debug(f"RAW LLM RESPONSE:\n{raw_answer}")

    # Clean LLM formatting issues (single-word fenced blocks, orphaned punctuation)
    cleaned_answer = clean_llm_response(raw_answer)

    logger.debug(f"AFTER CLEAN + PARSE CITATIONS:\n{cleaned_answer}")

    # Parse Citations
    parsed_results = parse_citations(cleaned_answer, reranked_chunks)
    
    # Calculate Confidence
    confidence = calculate_confidence(
        parsed_results["answer_text_clean"],
        reranked_chunks,
        parsed_results["sources_cited"]
    )
    
    now = datetime.now(timezone.utc)
    
    # Save to questions collection
    question_doc = {
        "workspace_id": request.workspace_id,
        "session_id": session_id,
        "asked_by_uid": user_uid,
        "question_text": request.question,
        "question_embedding": query_embedding,
        "answer": parsed_results["answer_text_clean"],
        "sources_cited": parsed_results["sources_cited"],
        "confidence_score": confidence,
        "created_at": now
    }
    await db.questions.insert_one(question_doc)
    
    # Update sessions collection
    new_messages = [
        {"role": "user", "content": request.question, "created_at": now},
        {
            "role": "model",
            "content": parsed_results["answer_text_clean"],
            "sources": parsed_results["sources_cited"],
            "created_at": now
        }
    ]
    
    if session_doc:
        await db.sessions.update_one(
            {"_id": session_doc["_id"]},
            {"$push": {"messages": {"$each": new_messages}}, "$set": {"updated_at": now}}
        )
    else:
        await db.sessions.insert_one({
            "session_id": session_id,
            "workspace_id": request.workspace_id,
            "user_uid": user_uid,
            "messages": new_messages,
            "created_at": now,
            "updated_at": now
        })
        
    return ChatResponse(
        answer=parsed_results["answer_text_clean"],
        sources_cited=parsed_results["sources_cited"],
        all_retrieved_chunks=parsed_results["all_retrieved_chunks"],
        confidence_score=confidence,
        session_id=session_id
    )

@router.get("/workspace/{workspace_id}/sessions/{session_id}")
async def get_chat_history(workspace_id: str, session_id: str, current_user: dict = Depends(get_current_user)):
    user_uid = current_user.get("uid")
    db = await get_db()
    
    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if user_uid not in workspace.get("members", []) and workspace.get("owner_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
        
    session_doc = await db.sessions.find_one({
        "session_id": session_id,
        "workspace_id": workspace_id
    })
    
    if not session_doc:
        return {"messages": []}
        
    messages = []
    for msg in session_doc.get("messages", []):
        messages.append({
            "role": msg.get("role"),
            "content": msg.get("content"),
            "sources": msg.get("sources", []),
            "created_at": msg.get("created_at")
        })
        
    return {"messages": messages}

@router.delete("/workspace/{workspace_id}/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(workspace_id: str, session_id: str, current_user: dict = Depends(get_current_user)):
    user_uid = current_user.get("uid")
    db = await get_db()
    
    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if user_uid not in workspace.get("members", []) and workspace.get("owner_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
        
    await db.sessions.delete_one({
        "session_id": session_id,
        "workspace_id": workspace_id
    })

@router.get("/workspace/{workspace_id}/questions")
async def get_recent_questions(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_uid = current_user.get("uid")
    db = await get_db()
    
    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if user_uid not in workspace.get("members", []) and workspace.get("owner_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
        
    cursor = db.questions.find(
        {"workspace_id": workspace_id},
        {"question_text": 1, "asked_by_uid": 1, "confidence_score": 1, "created_at": 1, "_id": 0}
    ).sort("created_at", -1).limit(20)
    
    questions = await cursor.to_list(length=20)
    return {"questions": questions}


# ---------------------------------------------------------------------------
# Step 1: Debug endpoint — traces the full vector search pipeline
# ---------------------------------------------------------------------------

@router.post("/chat/debug")
async def debug_vector_search(request: DebugRequest):
    """
    Diagnostic endpoint. No auth required so it can be called easily during debugging.
    Returns intermediate results at every stage of the retrieval pipeline.
    """
    from bson import ObjectId as BsonObjectId

    db = await get_db()
    workspace_id = request.workspace_id
    question = request.question
    result = {}

    # ------------------------------------------------------------------
    # Step 1: Embedding
    # ------------------------------------------------------------------
    try:
        embedding = await embed_query(question)
        result["step1_embedding"] = {
            "ok": True,
            "length": len(embedding),
            "first_5_values": embedding[:5],
        }
    except Exception as exc:
        result["step1_embedding"] = {"ok": False, "error": str(exc)}
        return result

    # ------------------------------------------------------------------
    # Step 2: Raw find — confirm chunks exist with embeddings
    # ------------------------------------------------------------------
    try:
        raw_cursor = db.chunks.find({"workspace_id": BsonObjectId(workspace_id)}).limit(1)
        raw_docs = await raw_cursor.to_list(length=1)
        count = await db.chunks.count_documents({"workspace_id": BsonObjectId(workspace_id)})

        if raw_docs:
            doc = raw_docs[0]
            emb = doc.get("embedding") or []
            result["step2_raw_find"] = {
                "ok": True,
                "count": count,
                "sample_doc": {
                    "_id": str(doc["_id"]),
                    "source_type": doc.get("source_type"),
                    "chunk_type": doc.get("chunk_type"),
                    "embedding_first_5": emb[:5] if emb else [],
                    "embedding_length": len(emb),
                },
            }
        else:
            result["step2_raw_find"] = {"ok": True, "count": 0, "sample_doc": None}
    except Exception as exc:
        result["step2_raw_find"] = {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Step 3: $vectorSearch WITHOUT source_type filter, score threshold 0.0
    # ------------------------------------------------------------------
    try:
        pipeline_no_filter = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": embedding,
                    "numCandidates": 150,
                    "limit": 10,
                    "filter": {"workspace_id": BsonObjectId(workspace_id)},
                }
            },
            {
                "$project": {
                    "embedding": 0,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]
        cursor3 = db.chunks.aggregate(pipeline_no_filter)
        docs3 = await cursor3.to_list(length=10)
        result["step3_vector_no_source_filter"] = {
            "ok": True,
            "count": len(docs3),
            "top_score": docs3[0].get("score") if docs3 else None,
        }
    except Exception as exc:
        result["step3_vector_no_source_filter"] = {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Step 4: $vectorSearch WITH source_type filter
    # ------------------------------------------------------------------
    try:
        pipeline_with_filter = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": embedding,
                    "numCandidates": 150,
                    "limit": 10,
                    "filter": {
                        "workspace_id": BsonObjectId(workspace_id),
                        "source_type": {"$in": ["github_code", "github_readme", "github_config"]},
                    },
                }
            },
            {
                "$project": {
                    "embedding": 0,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]
        cursor4 = db.chunks.aggregate(pipeline_with_filter)
        docs4 = await cursor4.to_list(length=10)
        result["step4_vector_with_source_filter"] = {
            "ok": True,
            "count": len(docs4),
            "top_score": docs4[0].get("score") if docs4 else None,
        }
    except Exception as exc:
        result["step4_vector_with_source_filter"] = {"ok": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Step 5: Check vector search index existence via aggregation pipeline
    # ------------------------------------------------------------------
    try:
        cursor5 = db.chunks.aggregate([{"$listSearchIndexes": {}}])
        indexes = await cursor5.to_list(length=20)
        # Serialize ObjectIds / non-JSON-safe types
        safe_indexes = [
            {k: str(v) if not isinstance(v, (str, int, float, bool, list, dict, type(None))) else v
             for k, v in idx.items()}
            for idx in indexes
        ]
        result["step5_search_indexes"] = {
            "ok": True,
            "count": len(safe_indexes),
            "indexes": safe_indexes,
        }
    except Exception as exc:
        result["step5_search_indexes"] = {"ok": False, "error": str(exc)}

    return result


# ---------------------------------------------------------------------------
# Step 2 (reindex): Delete all chunks for workspace and re-run ingestion
# ---------------------------------------------------------------------------

@router.post("/workspace/{workspace_id}/reindex")
async def reindex_workspace(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Deletes all chunks for the workspace and re-triggers ingestion for every
    GitHub source so they are re-embedded with the correct passage: prefix.
    """

    user_uid = current_user.get("uid")
    db = await get_db()

    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if workspace.get("owner_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Only the workspace owner can reindex")

    # Delete all existing chunks for this workspace
    delete_result = await db.chunks.delete_many({"workspace_id": ObjectId(workspace_id)})
    deleted_count = delete_result.deleted_count

    # Re-queue ingestion for every github source
    queued = []
    for source in workspace.get("sources", []):
        if source.get("source_type") != "github_repo":
            continue

        now = datetime.now(timezone.utc)
        job = {
            "_id": ObjectId(),
            "workspace_id": ObjectId(workspace_id),
            "source_id": source["source_id"],
            "job_type": "github_ingest",
            "status": "queued",
            "progress_current": 0,
            "progress_total": 0,
            "progress_message": "Queued for re-indexing",
            "error_message": None,
            "started_at": None,
            "completed_at": None,
            "created_at": now,
        }
        await db.jobs.insert_one(job)

        background_tasks.add_task(
            connect_and_ingest_repo,
            source["url"],
            None,  # use default token from config
            workspace_id,
            str(source["source_id"]),
            str(job["_id"]),
        )
        queued.append(str(source["source_id"]))

    return {
        "deleted_chunks": deleted_count,
        "reindex_queued_for_sources": queued,
    }

# ---------------------------------------------------------------------------
# Chat session management endpoints
# ---------------------------------------------------------------------------

@router.get("/chat/sessions/{workspace_id}")
async def list_chat_sessions(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Return all non-empty sessions for this workspace + user, sorted by updated_at desc."""
    user_uid = current_user.get("uid")
    db = await get_db()

    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if user_uid not in workspace.get("members", []) and workspace.get("owner_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    cursor = db.sessions.find(
        {"workspace_id": workspace_id, "user_uid": user_uid}
    ).sort("updated_at", -1)
    sessions = await cursor.to_list(length=200)

    result = []
    for s in sessions:
        msgs = s.get("messages", [])
        if not msgs:
            continue
        # Find first user message for preview
        first_user_msg = next((m for m in msgs if m.get("role") == "user"), None)
        preview = (first_user_msg.get("content", "") if first_user_msg else "")[:60]
        result.append({
            "session_id": s["session_id"],
            "preview": preview or "New Chat",
            "message_count": len(msgs),
            "created_at": s.get("created_at"),
            "updated_at": s.get("updated_at"),
        })

    return {"sessions": result}


@router.post("/chat/session/{workspace_id}/new")
async def create_new_session(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Create an empty session doc and return its session_id."""
    user_uid = current_user.get("uid")
    db = await get_db()

    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if user_uid not in workspace.get("members", []) and workspace.get("owner_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    import uuid as _uuid
    session_id = str(_uuid.uuid4())
    now = datetime.now(timezone.utc)
    await db.sessions.insert_one({
        "session_id": session_id,
        "workspace_id": workspace_id,
        "user_uid": user_uid,
        "messages": [],
        "created_at": now,
        "updated_at": now,
    })
    return {"session_id": session_id}


# ---------------------------------------------------------------------------
# Step 3: Provider status endpoint
# ---------------------------------------------------------------------------

from Services.groq_client import chat_completion as groq_chat
from Services.embedding_service import get_embedding

@router.get("/chat/providers")
async def check_providers():
    groq_status = "ok"
    groq_error = None
    try:
        # Minimal API call for Groq
        await groq_chat("Reply with one word: ok", [{"role": "user", "content": "Test"}], "", temperature=0.1, max_tokens=10)
    except Exception as e:
        groq_status = "error"
        groq_error = str(e)
        
    gemini_status = "ok"
    gemini_error = None
    try:
        # Minimal embedding call for Gemini
        await get_embedding("test")
    except Exception as e:
        gemini_status = "error"
        gemini_error = str(e)
        
    response = {
        "groq": {
            "status": groq_status,
            "model": "llama-3.3-70b-versatile",
            "used_for": "chat completions"
        },
        "gemini": {
            "status": gemini_status,
            "model": "text-embedding-004",
            "used_for": "embeddings"
        }
    }
    
    if groq_error:
        response["groq"]["error"] = groq_error
    if gemini_error:
        response["gemini"]["error"] = gemini_error
        
    return response
