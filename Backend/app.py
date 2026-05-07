import asyncio
import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Middleware.error_handlers import (
    DocumentNotFoundError,
    LLMAPIError,
    document_not_found_handler,
    general_exception_handler,
    llm_api_error_handler,
)
from Routes import auth, ingest, warmup, chat, url_ingest
from Routes import staleness as staleness_router
from config import Config

logger = logging.getLogger(__name__)


async def _scheduled_staleness_checks():
    """Run staleness checks for all workspaces every 24 hours."""
    from Database.database import get_db
    from Services.staleness_service import run_staleness_check

    # Wait 5 minutes after startup before first run
    await asyncio.sleep(300)

    while True:
        try:
            db = await get_db()
            workspaces = await db.workspaces.find(
                {"sources.indexing_status": "completed"}
            ).to_list(length=None)

            logger.info("[scheduler] Running staleness checks for %d workspaces", len(workspaces))

            for workspace in workspaces:
                try:
                    await run_staleness_check(str(workspace["_id"]))
                except Exception as exc:
                    logger.error("[scheduler] Staleness check failed for %s: %s", workspace["_id"], exc)
                await asyncio.sleep(2)  # Avoid hammering APIs

        except Exception as exc:
            logger.error("[scheduler] Scheduled staleness check failed: %s", exc)

        await asyncio.sleep(86400)  # 24 hours


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Startup
    asyncio.create_task(_scheduled_staleness_checks())
    logger.info("[app] Staleness scheduler started")
    yield
    # Shutdown (nothing to clean up)


app = FastAPI(title=Config.APP_TITLE, lifespan=lifespan)

app.add_exception_handler(DocumentNotFoundError, document_not_found_handler)
app.add_exception_handler(LLMAPIError, llm_api_error_handler)
app.add_exception_handler(Exception, general_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(warmup.router, tags=["system"])
app.include_router(auth.router, tags=["auth"], prefix="/auth")
app.include_router(ingest.router, tags=["ingest"], prefix="/api")
app.include_router(chat.router, tags=["chat"], prefix="/api")
app.include_router(url_ingest.router, tags=["url-ingest"], prefix="/api")
app.include_router(staleness_router.router, tags=["staleness"], prefix="/api")


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Onboardiq backend running with developer onboarding intelligence support",
    }
