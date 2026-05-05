from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Middleware.error_handlers import (
    DocumentNotFoundError,
    LLMAPIError,
    document_not_found_handler,
    general_exception_handler,
    llm_api_error_handler,
)
from Routes import auth, ingest, warmup, chat
from config import Config

app = FastAPI(title=Config.APP_TITLE)

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


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Onboardiq backend running with developer onboarding intelligence support",
    }
