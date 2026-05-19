import asyncio
import time
from typing import Callable

import httpx
from fastapi import HTTPException, Request

from config import Config

_local_counters: dict[str, tuple[int, int]] = {}
_local_lock = asyncio.Lock()


class RedisRateLimiter:
    def __init__(self, namespace: str, limit: int, window_seconds: int):
        self.namespace = namespace
        self.limit = limit
        self.window_seconds = window_seconds
        self.enabled = bool(
            Config.UPSTASH_REDIS_REST_URL and Config.UPSTASH_REDIS_REST_TOKEN
        )

    async def acquire(self, subject: str) -> None:
        if self.enabled:
            await self._acquire_remote(subject)
        else:
            await self._acquire_local(subject)

    async def _acquire_remote(self, subject: str) -> None:
        window_bucket = int(time.time() // self.window_seconds)
        key = f"rl:{self.namespace}:{subject}:{window_bucket}"
        base = Config.UPSTASH_REDIS_REST_URL.rstrip("/")
        headers = {"Authorization": f"Bearer {Config.UPSTASH_REDIS_REST_TOKEN}"}

        async with httpx.AsyncClient(timeout=5.0) as client:
            incr = await client.post(f"{base}/incr/{key}", headers=headers)
            incr.raise_for_status()
            count = int((incr.json().get("result") or 0))
            if count == 1:
                await client.post(
                    f"{base}/expire/{key}/{self.window_seconds + 60}",
                    headers=headers,
                )

        if count > self.limit:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for {self.namespace}. Please try again later.",
            )

    async def _acquire_local(self, subject: str) -> None:
        now = int(time.time())
        window_bucket = now // self.window_seconds
        key = f"{self.namespace}:{subject}:{window_bucket}"

        async with _local_lock:
            count, _ = _local_counters.get(key, (0, window_bucket))
            count += 1
            _local_counters[key] = (count, window_bucket)

        if count > self.limit:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for {self.namespace}. Please try again later.",
            )


def get_user_key(request: Request) -> str:
    user = getattr(request.state, "user", None)
    if user and user.get("uid"):
        return user["uid"]
    return request.client.host if request.client else "unknown"


def create_dependency(limiter: RedisRateLimiter, context_name: str) -> Callable:
    async def dependency(request: Request):
        await limiter.acquire(get_user_key(request))

    dependency.__name__ = f"limit_{context_name.lower().replace(' ', '_')}"
    return dependency


chat_limiter = RedisRateLimiter("chat", limit=50, window_seconds=3600)
extract_limiter = RedisRateLimiter("url_extract", limit=20, window_seconds=3600)
quiz_limiter = RedisRateLimiter("quiz", limit=10, window_seconds=3600)
notes_limiter = RedisRateLimiter("notes", limit=15, window_seconds=3600)

limit_quiz = create_dependency(quiz_limiter, "Quiz Generation")
limit_notes = create_dependency(notes_limiter, "Note Generation")
limit_chat = create_dependency(chat_limiter, "Chat")
limit_extract = create_dependency(extract_limiter, "URL Extraction")
