import asyncio
import logging
from typing import Dict, List, Optional, Union

import requests
import voyageai

from Services.secrets_service import get_effective_api_key
from config import Config

logger = logging.getLogger(__name__)

embedding_semaphore = asyncio.Semaphore(3)
EMBEDDING_DIMENSION = 1024


def _augment_text(item: Dict) -> str:
    text = item.get("text", "")
    chunk_type = item.get("chunk_type")
    language = item.get("language")
    chunk_name = item.get("chunk_name")
    mode = item.get("mode")

    prefix = "query: " if mode == "query" else "passage: "
    augmented = text
    if chunk_type in {"function", "method", "class"}:
        safe_language = language or "code"
        safe_name = chunk_name or "anonymous"
        augmented = f"Code {safe_language} {chunk_type} named {safe_name}: {text}"

    return f"{prefix}{augmented}"


async def get_voyage_embeddings(
    texts: list[str],
    input_type: str,
    user_uid: Optional[str] = None,
) -> list[list[float]]:
    async with embedding_semaphore:
        api_key = await get_effective_api_key(
            user_uid,
            "voyage_api_key",
            Config.VOYAGE_API_KEY,
        )
        if not api_key:
            raise RuntimeError("Voyage API key is not configured")

        client = voyageai.Client(api_key=api_key)
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: client.embed(texts, model="voyage-4-lite", input_type=input_type),
        )
        return result.embeddings


async def get_nomic_embeddings(
    texts: list[str],
    input_type: str,
    user_uid: Optional[str] = None,
) -> list[list[float]]:
    async with embedding_semaphore:
        api_key = await get_effective_api_key(
            user_uid,
            "nomic_api_key",
            Config.NOMIC_API_KEY,
        )
        if not api_key:
            raise RuntimeError("Nomic API key is not configured")

        response = await asyncio.to_thread(
            requests.post,
            "https://api-atlas.nomic.ai/v1/embedding/text",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "texts": texts,
                "model": "nomic-embed-text-v1.5",
                "task_type": input_type,
                "dimensionality": 768,
            },
            timeout=30,
        )
        response.raise_for_status()
        embeddings = response.json()["embeddings"]
        return [emb + [0.0] * 256 for emb in embeddings]


async def get_gemini_embeddings(
    items: List[Dict],
    user_uid: Optional[str] = None,
) -> list[list[float]]:
    async with embedding_semaphore:
        import google.generativeai as genai

        api_key = await get_effective_api_key(
            user_uid,
            "gemini_api_key",
            Config.GEMINI_API_KEY,
        )
        if not api_key:
            raise RuntimeError("Gemini API key is not configured")

        genai.configure(api_key=api_key)
        prepared_texts = [_augment_text(item) for item in items]

        result = await asyncio.to_thread(
            genai.embed_content,
            model=Config.EMBEDDING_MODEL,
            content=prepared_texts,
            output_dimensionality=768,
        )

        embeddings = []
        if isinstance(result, dict) and "embedding" in result:
            vectors = result["embedding"]
            if vectors and isinstance(vectors[0], list):
                embeddings = vectors
            else:
                embeddings = [vectors]

        return [emb + [0.0] * 256 for emb in embeddings]


async def get_embeddings_batch(
    items: Union[List[Dict], List[str]],
    mode: str = "document",
    user_uid: Optional[str] = None,
) -> list[list[float]]:
    if not items:
        return []

    if isinstance(items[0], dict):
        texts = [item.get("text", "") for item in items]
        item_mode = items[0].get("mode", mode)
        mode = "document" if item_mode == "passage" else item_mode
    else:
        texts = items
        items = [{"text": text, "mode": mode} for text in texts]

    voyage_input_type = "document" if mode == "document" else "query"
    nomic_input_type = "search_document" if mode == "document" else "search_query"

    all_embeddings = []
    batch_size = 128

    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        batch_items = items[i : i + batch_size]

        try:
            embeddings = await get_voyage_embeddings(
                batch_texts,
                voyage_input_type,
                user_uid=user_uid,
            )
            all_embeddings.extend(embeddings)
            logger.info("Embeddings: voyage batch %d success", i // batch_size + 1)
            continue
        except Exception as exc:
            logger.warning("Voyage embedding failed: %s, trying Nomic", exc)

        try:
            embeddings = await get_nomic_embeddings(
                batch_texts,
                nomic_input_type,
                user_uid=user_uid,
            )
            all_embeddings.extend(embeddings)
            logger.info("Embeddings: nomic batch %d success", i // batch_size + 1)
            continue
        except Exception as exc:
            logger.warning("Nomic embedding failed: %s, trying Gemini", exc)

        try:
            embeddings = await get_gemini_embeddings(batch_items, user_uid=user_uid)
            all_embeddings.extend(embeddings)
            logger.info("Embeddings: gemini batch %d success", i // batch_size + 1)
            continue
        except Exception as exc:
            logger.error("All embedding providers failed for batch %d: %s", i // batch_size + 1, exc)
            raise Exception(f"All embedding providers failed: {exc}")

        if i + batch_size < len(texts):
            await asyncio.sleep(0.5)

    return all_embeddings


async def get_embedding(
    text: str,
    mode: str = "document",
    user_uid: Optional[str] = None,
) -> list[float]:
    results = await get_embeddings_batch([text], mode=mode, user_uid=user_uid)
    return results[0]
