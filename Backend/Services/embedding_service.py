import asyncio
import logging
import socket
from typing import Dict, List, Optional

from config import Config
import google.api_core.exceptions

_genai = None
logger = logging.getLogger(__name__)

# Retry configuration for different error types
MAX_RETRIES_DNS = 5  # More retries for transient DNS issues
MAX_RETRIES_SERVICE = 3  # Standard retries for service errors
INITIAL_BACKOFF = 1.0  # seconds
MAX_BACKOFF = 30.0  # seconds
API_TIMEOUT_SECONDS = 120  # Increased timeout for API calls


def _get_genai():
    global _genai
    if _genai is None:
        import os
        # Force the pure-Python protobuf implementation to avoid
        # C-extension incompatibilities on certain Python versions.
        os.environ.setdefault("PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION", "python")

        try:
            import google.generativeai as genai
        except Exception as exc:
            raise RuntimeError(
                "Failed to import google.generativeai. Likely cause: incompatible protobuf C-extension "
                "for this Python version. Fix options: set environment variable "
                "PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python before startup, or pin protobuf to a "
                "compatible version (e.g. protobuf==4.23.4), or run the app with Python 3.11/3.12. "
                f"Original error: {exc}"
            )

        genai.configure(api_key=Config.GOOGLE_API_KEY)
        _genai = genai
    return _genai


def _is_dns_error(exc: Exception) -> bool:
    """Check if exception is caused by DNS resolution failure."""
    error_str = str(exc).lower()
    dns_keywords = ["dns", "address lookup", "resolve", "hostname", "could not contact dns"]
    return any(keyword in error_str for keyword in dns_keywords)


def _is_retryable_error(exc: Exception) -> bool:
    """Determine if an error is transient and should trigger a retry."""
    if _is_dns_error(exc):
        return True
    if isinstance(exc, (OSError, socket.gaierror, socket.timeout)):
        return True
    if isinstance(exc, google.api_core.exceptions.ServiceUnavailable):
        return True
    if isinstance(exc, google.api_core.exceptions.DeadlineExceeded):
        return True
    if isinstance(exc, google.api_core.exceptions.RetryError):
        return True
    error_str = str(exc).lower()
    transient_keywords = ["timeout", "unavailable", "temporarily", "connection reset", "broken pipe"]
    return any(keyword in error_str for keyword in transient_keywords)


def _augment_text(
    text: str,
    chunk_type: Optional[str] = None,
    language: Optional[str] = None,
    chunk_name: Optional[str] = None,
    prefix: Optional[str] = "passage: "
) -> str:
    augmented = text
    if chunk_type in {"function", "method", "class"}:
        safe_language = language or "code"
        safe_name = chunk_name or "anonymous"
        augmented = f"Code {safe_language} {chunk_type} named {safe_name}: {text}"
    
    if prefix:
        return f"{prefix}{augmented}"
    return augmented


async def get_embedding(
    text: str,
    chunk_type: Optional[str] = None,
    language: Optional[str] = None,
    chunk_name: Optional[str] = None,
    prefix: Optional[str] = "passage: ",
    mode: Optional[str] = None,
) -> List[float]:
    # mode overrides prefix: 'passage' -> 'passage: ', 'query' -> 'query: '
    if mode == "query":
        prefix = "query: "
    elif mode == "passage":
        prefix = "passage: "

    results = await get_embeddings_batch(
        [
            {
                "text": text,
                "chunk_type": chunk_type,
                "language": language,
                "chunk_name": chunk_name,
                "prefix": prefix,
            }
        ]
    )
    return results[0]


async def get_embeddings_batch(items: List[Dict]) -> List[List[float]]:
    """Batch embed items with intelligent retry logic for transient failures."""
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
            prefix=(
                "query: " if item.get("mode") == "query"
                else "passage: " if item.get("mode") == "passage"
                else item.get("prefix", "passage: ")
            ),
        )
        for item in items
    ]

    last_error = None
    max_retries = MAX_RETRIES_DNS  # Default to higher retries for DNS issues
    attempt = 0

    while attempt < max_retries:
        try:
            logger.debug(f"[embedding] Attempt {attempt + 1}/{max_retries} for {len(prepared_texts)} texts")
            
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
            
            logger.debug(f"[embedding] Successfully embedded {len(embeddings)} vectors")
            return embeddings

        except Exception as exc:
            last_error = exc
            is_retryable = _is_retryable_error(exc)
            is_dns = _is_dns_error(exc)
            
            # Log the error with appropriate level
            log_level = logging.WARNING if is_retryable else logging.ERROR
            logger.log(
                log_level,
                f"[embedding] Error on attempt {attempt + 1}/{max_retries} "
                f"(retryable={is_retryable}, dns={is_dns}): {type(exc).__name__}: {str(exc)[:200]}"
            )
            
            # If not retryable, fail immediately
            if not is_retryable:
                logger.error(f"[embedding] Non-retryable error, failing immediately: {exc}")
                raise
            
            attempt += 1
            if attempt < max_retries:
                # Exponential backoff with jitter
                backoff = min(INITIAL_BACKOFF * (2 ** (attempt - 1)), MAX_BACKOFF)
                logger.info(f"[embedding] Retrying after {backoff:.1f}s...")
                await asyncio.sleep(backoff)
            else:
                logger.error(f"[embedding] Max retries ({max_retries}) exceeded after {attempt} attempts")

    # All retries exhausted
    error_msg = (
        f"Failed to get embeddings after {max_retries} attempts. "
        f"Last error: {type(last_error).__name__}: {str(last_error)[:300]}"
    )
    logger.error(f"[embedding] {error_msg}")
    raise RuntimeError(error_msg) from last_error
