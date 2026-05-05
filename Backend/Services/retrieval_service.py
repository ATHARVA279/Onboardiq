import asyncio
import json
import logging
from typing import List, Dict, Optional
from bson.objectid import ObjectId

from Database.database import get_db
from Services.embedding_service import get_embedding
from Services.gemini_client import _call_gemini_direct
import google.generativeai as genai
from config import Config

logger = logging.getLogger(__name__)

async def embed_query(question: str) -> List[float]:
    """Embeds the query text with the query prefix (mode='query')."""
    return await get_embedding(question, mode="query")

async def vector_search(query_embedding: List[float], workspace_id: str, source_types: List[str], k: int, source_ids: Optional[List[str]] = None) -> List[Dict]:
    """Runs MongoDB Atlas vector search aggregation pipeline."""
    db = await get_db()

    logger.info("[vector_search] query_embedding length=%d, workspace_id=%s, source_types=%s, k=%d",
                len(query_embedding), workspace_id, source_types, k)

    # Step 3 fix: always use ObjectId for workspace_id and source_id
    filter_dict = {
        "workspace_id": ObjectId(workspace_id),
        "source_type": {"$in": source_types},
    }

    if source_ids:
        filter_dict["source_id"] = {"$in": [ObjectId(sid) for sid in source_ids]}

    pipeline = [
        {
            "$vectorSearch": {
                "index": Config.VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": k * 15,
                "limit": k,
                "filter": filter_dict,
            }
        },
        {
            "$project": {
                "embedding": 0,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]

    logger.info("[vector_search] pipeline filter: %s", filter_dict)

    cursor = db.chunks.aggregate(pipeline)
    raw_results = await cursor.to_list(length=k)

    logger.info("[vector_search] raw results count before threshold: %d", len(raw_results))
    if raw_results:
        logger.info("[vector_search] top result score: %s", raw_results[0].get("score"))

    return raw_results

async def parallel_retrieval(query_embedding: List[float], workspace_id: str, source_ids: Optional[List[str]] = None) -> List[Dict]:
    """Runs three vector searches simultaneously."""

    logger.info("[parallel_retrieval] starting for workspace_id=%s, source_ids=%s", workspace_id, source_ids)

    # Search 1: code
    task1 = vector_search(query_embedding, workspace_id, ["github_code"], k=6, source_ids=source_ids)

    # Search 2: docs
    task2 = vector_search(query_embedding, workspace_id, ["github_readme", "url_doc", "confluence", "notion"], k=4, source_ids=source_ids)

    # Search 3: config
    task3 = vector_search(query_embedding, workspace_id, ["github_config"], k=2, source_ids=source_ids)

    results1, results2, results3 = await asyncio.gather(task1, task2, task3)

    logger.info("[parallel_retrieval] raw counts — code=%d, docs=%d, config=%d",
                len(results1), len(results2), len(results3))

    all_results = results1 + results2 + results3

    # Remove duplicates by chunk _id
    seen_ids = set()
    unique_results = []
    for chunk in all_results:
        chunk_id = str(chunk["_id"])
        if chunk_id not in seen_ids:
            seen_ids.add(chunk_id)
            unique_results.append(chunk)

    # Sort by score descending
    unique_results.sort(key=lambda x: x.get("score", 0), reverse=True)

    logger.info("[parallel_retrieval] unique results after dedup: %d", len(unique_results))

    # Step 4: lowered primary threshold from 0.65 → 0.3
    filtered_results = [c for c in unique_results if c.get("score", 0) >= 0.3]
    logger.info("[parallel_retrieval] results after score>=0.3 filter: %d", len(filtered_results))

    # If fewer than 3 results, lower threshold to 0.1
    if len(filtered_results) < 3:
        filtered_results = [c for c in unique_results if c.get("score", 0) >= 0.1]
        logger.info("[parallel_retrieval] results after fallback score>=0.1 filter: %d", len(filtered_results))

    # Never return zero results if there are any chunks in the workspace.
    if len(filtered_results) == 0 and len(unique_results) > 0:
        filtered_results = unique_results
        logger.info("[parallel_retrieval] using all %d results (no threshold)", len(filtered_results))

    return filtered_results[:12]

async def rerank(question: str, chunks: List[Dict]) -> List[Dict]:
    """Reranks the top 12 chunks using a Gemini call."""
    if not chunks:
        return []
        
    prompt = f"""Given this question: "{question}"

Rate the relevance of each of the following passages on a scale of 1-10 where 10 means the passage directly answers the question and 1 means it is completely irrelevant.

Return ONLY a JSON array of objects with fields "index" and "score". Nothing else.

Passages:
"""
    for i, chunk in enumerate(chunks):
        content_preview = chunk.get("content", "")[:200]
        prompt += f'Index {i}: {content_preview}\n'
        
    model = genai.GenerativeModel(Config.GEMINI_MODEL)
    try:
        raw_response = await asyncio.to_thread(_call_gemini_direct, model, prompt)
        
        # Clean response in case it's wrapped in markdown block
        clean_text = raw_response.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
            
        scores_data = json.loads(clean_text)
        
        # Build mapping of index -> score
        rerank_scores = {item["index"]: item["score"] for item in scores_data if "index" in item and "score" in item}
        
        for i, chunk in enumerate(chunks):
            rerank_score = rerank_scores.get(i, 1) # default 1
            combined_score = chunk.get("score", 0) * (rerank_score / 10.0)
            chunk["combined_score"] = combined_score
            
        chunks.sort(key=lambda x: x.get("combined_score", 0), reverse=True)
        return chunks[:8]
        
    except Exception as e:
        print(f"Reranking failed: {e}")
        return chunks[:8]  # Skip reranking and return original order
