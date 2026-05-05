import asyncio
from typing import Dict, List, Optional

from config import Config

_genai = None


def _get_genai():
    global _genai
    if _genai is None:
        import google.generativeai as genai

        genai.configure(api_key=Config.GOOGLE_API_KEY)
        _genai = genai
    return _genai


def _augment_text(
    text: str,
    chunk_type: Optional[str] = None,
    language: Optional[str] = None,
    chunk_name: Optional[str] = None,
) -> str:
    if chunk_type in {"function", "method", "class"}:
        safe_language = language or "code"
        safe_name = chunk_name or "anonymous"
        return f"Code {safe_language} {chunk_type} named {safe_name}: {text}"
    return text


async def get_embedding(
    text: str,
    chunk_type: Optional[str] = None,
    language: Optional[str] = None,
    chunk_name: Optional[str] = None,
) -> List[float]:
    results = await get_embeddings_batch(
        [
            {
                "text": text,
                "chunk_type": chunk_type,
                "language": language,
                "chunk_name": chunk_name,
            }
        ]
    )
    return results[0]


async def get_embeddings_batch(items: List[Dict]) -> List[List[float]]:
    if not items:
        return []
    if len(items) > 100:
        raise ValueError("get_embeddings_batch supports up to 100 items at a time")

    genai = _get_genai()
    prepared_texts = [
        _augment_text(
            item["text"],
            chunk_type=item.get("chunk_type"),
            language=item.get("language"),
            chunk_name=item.get("chunk_name"),
        )
        for item in items
    ]

    last_error = None
    for attempt in range(3):
        try:
            result = await asyncio.to_thread(
                genai.batch_embed_contents,
                model=Config.EMBEDDING_MODEL,
                requests=[{"content": text} for text in prepared_texts],
            )

            embeddings = []
            for entry in result:
                if isinstance(entry, dict):
                    vector = entry.get("embedding") or entry.get("values")
                else:
                    vector = getattr(entry, "embedding", None) or getattr(entry, "values", None)
                embeddings.append(list(vector or []))
            return embeddings
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                await asyncio.sleep(2 * (2**attempt))

    raise last_error
