from groq import Groq
import os
import asyncio
import logging
from Services.gemini_client import chat_completion as gemini_chat_completion

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

# Initialize Groq client
try:
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except Exception:
    client = None


def sanitize_messages(messages: list) -> list:
    """Normalize role names and strip empty messages."""
    sanitized = []
    for msg in messages:
        role = msg.get("role", "").lower().strip()
        content = msg.get("content", "")

        role = ROLE_MAPPING.get(role, role)

        if role not in VALID_ROLES:
            logger.debug(f"[groq] Skipping message with invalid role '{role}'")
            continue

        if not content or not str(content).strip():
            continue

        # Skip re-injecting system messages from history — we manage that ourselves
        if role == "system":
            continue

        sanitized.append({"role": role, "content": str(content)})
    return sanitized


def deduplicate_consecutive_roles(messages: list) -> list:
    """Merge adjacent messages with the same role so Groq never gets consecutive duplicates."""
    if not messages:
        return messages

    result = [messages[0].copy()]
    for msg in messages[1:]:
        if msg["role"] == result[-1]["role"]:
            result[-1]["content"] += "\n\n" + msg["content"]
        else:
            result.append(msg.copy())
    return result


async def chat_completion(
    system_prompt: str,
    messages: list,
    context: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
) -> str:
    if not client:
        raise Exception("Groq API error: Client not initialized (check GROQ_API_KEY)")

    # --- Build final messages array ---
    # 1. System prompt (always first, always only one)
    final_messages = [{"role": "system", "content": system_prompt}]

    # 2. Session history: sanitize + deduplicate, strip the last user msg so we
    #    can combine it with context below (avoiding two consecutive user messages)
    session_messages = list(messages)
    last_user_content = None

    if session_messages and session_messages[-1].get("role") in ("user", "human"):
        raw_last = session_messages.pop()
        last_user_content = raw_last.get("content", "")

    # Sanitize history (maps model→assistant, etc.) and drop system-role leftovers
    cleaned_history = sanitize_messages(session_messages)
    cleaned_history = deduplicate_consecutive_roles(cleaned_history)
    final_messages.extend(cleaned_history)

    # 3. Final user message: question embedded in context
    question = last_user_content or ""
    combined_content = f"CODEBASE CONTEXT:\n{context}\n\nQUESTION:\n{question}"
    final_messages.append({"role": "user", "content": combined_content})

    # Guard: ensure the array ends on a user message (Groq requirement)
    if final_messages[-1]["role"] != "user":
        logger.warning("[groq] Final messages array does not end with user role — this should not happen")

    # --- Call Groq with exponential backoff on rate limit ---
    for attempt in range(3):
        try:
            logger.debug(f"[groq] Attempt {attempt + 1}, {len(final_messages)} messages")
            response = await asyncio.to_thread(
                client.chat.completions.create,
                model=GROQ_MODEL,
                messages=final_messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content

        except Exception as e:
            error_str = str(e).lower()
            is_rate_limit = (
                "429" in error_str
                or "rate" in error_str
                or "limit" in error_str
                or "RateLimitError" in str(type(e))
            )
            if is_rate_limit and attempt < 2:
                wait = 5 * (attempt + 1)
                logger.warning(f"[groq] Rate limited on attempt {attempt + 1}, waiting {wait}s...")
                await asyncio.sleep(wait)
                continue
            raise Exception(f"Groq API error: {str(e)}")

    raise Exception("Groq API error: exhausted all retries")


async def _gemini_with_retry(
    system_prompt: str,
    messages: list,
    context: str,
    max_retries: int = 3,
) -> str:
    """Call Gemini fallback with exponential backoff for rate limits."""
    for attempt in range(max_retries):
        try:
            return await gemini_chat_completion(system_prompt, messages, context)
        except Exception as e:
            error_str = str(e)
            is_rate_limit = (
                "429" in error_str
                or "quota" in error_str.lower()
                or "rate" in error_str.lower()
            )
            if is_rate_limit and attempt < max_retries - 1:
                wait = 3 * (attempt + 1)
                logger.warning(f"[gemini-fallback] Rate limited on attempt {attempt + 1}, waiting {wait}s...")
                await asyncio.sleep(wait)
                continue
            raise
    raise Exception("Gemini fallback exhausted all retries")


async def chat_completion_with_fallback(
    system_prompt: str,
    messages: list,
    context: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
) -> str:
    groq_error = None
    try:
        result = await chat_completion(system_prompt, messages, context, temperature, max_tokens)
        logger.info(f"Chat completion: provider=groq model={GROQ_MODEL}")
        return result
    except Exception as e:
        groq_error = str(e)
        logger.warning(f"[groq] Failed: {groq_error} — falling back to Gemini")

    try:
        result = await _gemini_with_retry(system_prompt, messages, context)
        logger.info(f"Chat completion: provider=gemini model=gemini-1.5-flash (groq failed: {groq_error})")
        return result
    except Exception as gemini_e:
        logger.error(f"[gemini-fallback] Also failed: {gemini_e}")
        raise Exception(f"Both providers failed. Groq: {groq_error} | Gemini: {gemini_e}")
