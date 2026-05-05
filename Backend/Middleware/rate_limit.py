from fastapi import Request, HTTPException
from pyrate_limiter import Duration, Rate, Limiter, InMemoryBucket
from typing import Callable

quiz_rate = Rate(10, Duration.HOUR)
quiz_limiter = Limiter(InMemoryBucket([quiz_rate]))

notes_rate = Rate(15, Duration.HOUR)
notes_limiter = Limiter(InMemoryBucket([notes_rate]))

chat_rate = Rate(50, Duration.HOUR)
chat_limiter = Limiter(InMemoryBucket([chat_rate]))

extract_rate = Rate(20, Duration.HOUR)
extract_limiter = Limiter(InMemoryBucket([extract_rate]))

def get_user_key(request: Request) -> str:
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.get('uid')}"
    return f"ip:{request.client.host if request.client else 'unknown'}"

def create_dependency(limiter: Limiter, context_name: str) -> Callable:
    async def dependency(request: Request):
        key = get_user_key(request)
        try:
            limiter.try_acquire(key)
        except Exception as err:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for {context_name}. Please try again later."
            )
    return dependency

limit_quiz = create_dependency(quiz_limiter, "Quiz Generation")
limit_notes = create_dependency(notes_limiter, "Note Generation")
limit_chat = create_dependency(chat_limiter, "Chat")
limit_extract = create_dependency(extract_limiter, "URL Extraction")