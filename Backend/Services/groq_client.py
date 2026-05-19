import asyncio
import logging
import threading
from typing import AsyncIterator, Optional

from groq import Groq

from Services.gemini_client import chat_completion as gemini_chat_completion
from Services.gemini_client import stream_chat_completion as gemini_stream_chat_completion
from Services.secrets_service import get_effective_api_key
from config import Config

logger = logging.getLogger(__name__)

GROQ_MODEL = "llama-3.3-70b-versatile"
VALID_ROLES = {"user", "assistant", "system"}
ROLE_MAPPING = {
    "human": "user",
    "bot": "assistant",
    "ai": "assistant",
    "model": "assistant",
    "system_prompt": "system",
}


async def _get_client(user_uid: Optional[str] = None) -> Groq:
    api_key = await get_effective_api_key(user_uid, "groq_api_key", Config.GROQ_API_KEY)
    if not api_key:
        raise RuntimeError("Groq API key is not configured")
    return Groq(api_key=api_key)


def sanitize_messages(messages: list) -> list:
    sanitized = []
    for msg in messages:
        role = ROLE_MAPPING.get(msg.get("role", "").lower().strip(), msg.get("role", "").lower().strip())
        content = msg.get("content", "")
        if role not in VALID_ROLES or not str(content).strip() or role == "system":
            continue
        sanitized.append({"role": role, "content": str(content)})
    return sanitized


def deduplicate_consecutive_roles(messages: list) -> list:
    if not messages:
        return messages
    result = [messages[0].copy()]
    for msg in messages[1:]:
        if msg["role"] == result[-1]["role"]:
            result[-1]["content"] += "\n\n" + msg["content"]
        else:
            result.append(msg.copy())
    return result


def build_final_messages(system_prompt: str, messages: list, context: str) -> list:
    final_messages = [{"role": "system", "content": system_prompt}]
    session_messages = list(messages)
    last_user_content = None

    if session_messages and session_messages[-1].get("role") in ("user", "human"):
        raw_last = session_messages.pop()
        last_user_content = raw_last.get("content", "")

    cleaned_history = deduplicate_consecutive_roles(sanitize_messages(session_messages))
    final_messages.extend(cleaned_history)
    final_messages.append(
        {
            "role": "user",
            "content": f"CODEBASE CONTEXT:\n{context}\n\nQUESTION:\n{last_user_content or ''}",
        }
    )
    return final_messages


async def _stream_sync_iterator(iterate_fn) -> AsyncIterator[str]:
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[tuple[str, object]] = asyncio.Queue()

    def worker():
        try:
            for item in iterate_fn():
                asyncio.run_coroutine_threadsafe(queue.put(("item", item)), loop).result()
        except Exception as exc:
            asyncio.run_coroutine_threadsafe(queue.put(("error", exc)), loop).result()
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(("done", None)), loop).result()

    threading.Thread(target=worker, daemon=True).start()

    while True:
        kind, payload = await queue.get()
        if kind == "item":
            yield str(payload)
        elif kind == "error":
            raise payload
        else:
            break


async def chat_completion(
    system_prompt: str,
    messages: list,
    context: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    user_uid: Optional[str] = None,
) -> str:
    client = await _get_client(user_uid)
    final_messages = build_final_messages(system_prompt, messages, context)

    for attempt in range(3):
        try:
            response = await asyncio.to_thread(
                client.chat.completions.create,
                model=GROQ_MODEL,
                messages=final_messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as exc:
            error_str = str(exc).lower()
            is_rate_limit = "429" in error_str or "rate" in error_str or "limit" in error_str
            if is_rate_limit and attempt < 2:
                await asyncio.sleep(5 * (attempt + 1))
                continue
            raise Exception(f"Groq API error: {exc}")

    raise Exception("Groq API error: exhausted all retries")


async def stream_chat_completion(
    system_prompt: str,
    messages: list,
    context: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    user_uid: Optional[str] = None,
) -> AsyncIterator[str]:
    client = await _get_client(user_uid)
    final_messages = build_final_messages(system_prompt, messages, context)

    def iterate_tokens():
        stream = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=final_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield delta

    async for token in _stream_sync_iterator(iterate_tokens):
        yield token


async def chat_completion_with_fallback(
    system_prompt: str,
    messages: list,
    context: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    provider_preference: str = "groq",
    user_uid: Optional[str] = None,
) -> str:
    providers = ["groq", "gemini"] if provider_preference != "gemini" else ["gemini", "groq"]
    errors = {}

    for provider in providers:
        try:
            if provider == "groq":
                return await chat_completion(
                    system_prompt,
                    messages,
                    context,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    user_uid=user_uid,
                )
            return await gemini_chat_completion(
                system_prompt,
                messages,
                context,
                temperature=temperature,
                max_tokens=max_tokens,
                user_uid=user_uid,
            )
        except Exception as exc:
            errors[provider] = str(exc)
            logger.warning("[%s] Failed: %s", provider, exc)

    raise Exception(
        f"Both providers failed. Groq: {errors.get('groq')} | Gemini: {errors.get('gemini')}"
    )


async def stream_chat_completion_with_fallback(
    system_prompt: str,
    messages: list,
    context: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    provider_preference: str = "groq",
    user_uid: Optional[str] = None,
) -> tuple[AsyncIterator[str], str]:
    providers = ["groq", "gemini"] if provider_preference != "gemini" else ["gemini", "groq"]
    errors = {}

    for provider in providers:
        try:
            if provider == "groq":
                return (
                    stream_chat_completion(
                        system_prompt,
                        messages,
                        context,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        user_uid=user_uid,
                    ),
                    "groq",
                )
            return (
                gemini_stream_chat_completion(
                    system_prompt,
                    messages,
                    context,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    user_uid=user_uid,
                ),
                "gemini",
            )
        except Exception as exc:
            errors[provider] = str(exc)
            logger.warning("[%s-stream] Failed to initialize: %s", provider, exc)

    raise Exception(
        f"Both providers failed. Groq: {errors.get('groq')} | Gemini: {errors.get('gemini')}"
    )
