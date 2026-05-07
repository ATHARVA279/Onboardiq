import os
import asyncio
import logging
from typing import List, Dict, Union

import voyageai
import requests

from config import Config

logger = logging.getLogger(__name__)

# Initialize clients
voyage_client = voyageai.Client(api_key=os.environ.get('VOYAGE_API_KEY'))

NOMIC_API_KEY = os.environ.get('NOMIC_API_KEY')
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')

# Semaphore to limit concurrent embedding requests
embedding_semaphore = asyncio.Semaphore(3)

EMBEDDING_DIMENSION = 1024

_genai = None

def _get_genai():
    global _genai
    if _genai is None:
        import os as _os
        _os.environ.setdefault("PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION", "python")
        try:
            import google.generativeai as genai
        except Exception as exc:
            raise RuntimeError(f"Failed to import google.generativeai: {exc}")
        genai.configure(api_key=GOOGLE_API_KEY or Config.GOOGLE_API_KEY)
        _genai = genai
    return _genai

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

async def get_voyage_embeddings(texts: list[str], input_type: str) -> list[list[float]]:
    async with embedding_semaphore:
        loop = asyncio.get_running_loop()
        
        # Voyage client is sync, run in thread pool
        result = await loop.run_in_executor(
            None,
            lambda: voyage_client.embed(
                texts,
                model='voyage-4-lite',
                input_type=input_type
            )
        )
        return result.embeddings

async def get_nomic_embeddings(texts: list[str], input_type: str) -> list[list[float]]:
    async with embedding_semaphore:
        # Nomic produces 768 dimensions, pad to 1024 for compatibility
        headers = {
            'Authorization': f'Bearer {NOMIC_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        response = await asyncio.to_thread(
            requests.post,
            'https://api-atlas.nomic.ai/v1/embedding/text',
            headers=headers,
            json={
                'texts': texts,
                'model': 'nomic-embed-text-v1.5',
                'task_type': input_type,
                'dimensionality': 768
            }
        )
        response.raise_for_status()
        embeddings = response.json()['embeddings']
        
        # Pad from 768 to 1024 with zeros for schema compatibility
        padded = [emb + [0.0] * 256 for emb in embeddings]
        return padded

async def get_gemini_embeddings(items: List[Dict]) -> list[list[float]]:
    async with embedding_semaphore:
        genai = _get_genai()
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
            if isinstance(vectors, list) and len(vectors) > 0 and isinstance(vectors[0], list):
                embeddings = vectors
            else:
                embeddings = [vectors]
                
        # Pad 768 to 1024
        return [emb + [0.0] * 256 for emb in embeddings]

async def get_embeddings_batch(items: Union[List[Dict], List[str]], mode: str = 'document') -> list[list[float]]:
    if not items:
        return []
    
    # Normalize inputs to support both list[str] and list[dict]
    if isinstance(items[0], dict):
        texts = [item.get("text", "") for item in items]
        # determine mode from the first item if not explicitly passed
        # passage implies document for Voyage/Nomic
        item_mode = items[0].get("mode", mode)
        mode = "document" if item_mode == "passage" else item_mode
    else:
        texts = items
        # If passed as strings, we need to create dummy items for gemini fallback
        items = [{"text": text, "mode": mode} for text in texts]

    # Map generic mode to provider-specific input types
    voyage_input_type = 'document' if mode == 'document' else 'query'
    nomic_input_type = 'search_document' if mode == 'document' else 'search_query'
    
    # Process in batches of 128 for Voyage
    all_embeddings = []
    batch_size = 128
    
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        batch_items = items[i:i + batch_size]
        
        # Try Voyage first
        try:
            embeddings = await get_voyage_embeddings(batch_texts, voyage_input_type)
            all_embeddings.extend(embeddings)
            logger.info(f'Embeddings: voyage-code-2 batch {i//batch_size + 1} success ({len(batch_texts)} texts)')
            continue
        except Exception as e:
            logger.warning(f'Voyage embedding failed: {e}, trying Nomic')
        
        # Try Nomic second
        try:
            embeddings = await get_nomic_embeddings(batch_texts, nomic_input_type)
            all_embeddings.extend(embeddings)
            logger.info(f'Embeddings: nomic-embed fallback batch {i//batch_size + 1} success')
            continue
        except Exception as e:
            logger.warning(f'Nomic embedding failed: {e}, trying Gemini')
        
        # Try Gemini last
        try:
            embeddings = await get_gemini_embeddings(batch_items)
            all_embeddings.extend(embeddings)
            logger.info(f'Embeddings: gemini fallback batch {i//batch_size + 1} success')
            continue
        except Exception as e:
            logger.error(f'All embedding providers failed for batch {i//batch_size + 1}: {e}')
            raise Exception(f'All embedding providers failed: {e}')
        
        # Rate limit protection between batches
        if i + batch_size < len(texts):
            await asyncio.sleep(0.5)
    
    return all_embeddings

async def get_embedding(text: str, mode: str = 'document') -> list[float]:
    results = await get_embeddings_batch([text], mode=mode)
    return results[0]
