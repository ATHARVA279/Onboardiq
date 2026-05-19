import asyncio
import threading
from typing import AsyncIterator, List, Optional

from Services.secrets_service import get_effective_api_key
from config import Config

MODEL = "gemini-1.5-flash"


async def _get_model(
    system_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    user_uid: Optional[str] = None,
):
    import google.generativeai as genai

    api_key = await get_effective_api_key(
        user_uid,
        "gemini_api_key",
        Config.GEMINI_API_KEY,
    )
    if not api_key:
        raise RuntimeError("Gemini API key is not configured")

    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        MODEL,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )


def _truncate_text(text: str, limit: int = 50000) -> str:
    return text if len(text) <= limit else text[:limit]


def _call_gemini_direct(model, prompt: str) -> str:
    response = model.generate_content(prompt)
    return response.text if hasattr(response, "text") else str(response)


def _compose_prompt(messages: List[dict], context: str) -> str:
    history_lines = []
    for msg in messages[:-1]:
        role = "User" if msg.get("role") == "user" else "Assistant"
        history_lines.append(f"{role}: {msg.get('content', '')}")

    latest = messages[-1]["content"] if messages else ""
    history = "\n".join(history_lines)
    if history:
        history = f"Conversation history:\n{history}\n\n"

    return f"{history}{context}\n\nQuestion: {latest}"


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


def ask_question_about_text(question: str, text: str, history: List[dict] = None) -> str:
    import google.generativeai as genai

    history = history or []
    ctx = _truncate_text(text, Config.DEFAULT_CHUNK_SIZE * 125)
    convo_hint = ""
    if history:
        convo_hint += "Conversation history:\n"
        for msg in history[-6:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            convo_hint += f"{role}: {content}\n"

    prompt = f"""
You are an intelligent assistant with expertise in explaining concepts clearly.

PRIORITY: Use the document context below to answer questions when relevant information is available.

Document context:
{ctx}

{convo_hint}

INSTRUCTIONS:
1. If the question is directly answerable from the document context, use that information as your primary source.
2. If the question is related to the document's topic but asks for comparisons, alternatives, or broader context, you can use your general knowledge while noting it's not in the original material.
3. Keep answers concise (50-200 words) but informative.
4. If asked about something completely unrelated to the document, politely redirect to the document's topic.
5. Do NOT use markdown formatting in your response.

Question: {question}

Answer:
    """
    genai.configure(api_key=Config.GEMINI_API_KEY)
    model = genai.GenerativeModel(MODEL)
    raw = _call_gemini_direct(model, prompt)
    return raw.strip()


async def chat_completion(
    system_prompt: str,
    messages: List[dict],
    context: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    user_uid: Optional[str] = None,
) -> str:
    model = await _get_model(
        system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        user_uid=user_uid,
    )
    prompt = _compose_prompt(messages, context)
    response = await asyncio.to_thread(model.generate_content, prompt)
    return response.text if hasattr(response, "text") else str(response)


async def stream_chat_completion(
    system_prompt: str,
    messages: List[dict],
    context: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    user_uid: Optional[str] = None,
) -> AsyncIterator[str]:
    model = await _get_model(
        system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        user_uid=user_uid,
    )
    prompt = _compose_prompt(messages, context)

    def iterate_tokens():
        stream = model.generate_content(prompt, stream=True)
        for chunk in stream:
            text = getattr(chunk, "text", "") or ""
            if text:
                yield text

    async for token in _stream_sync_iterator(iterate_tokens):
        yield token
