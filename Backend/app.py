from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Middleware.error_handlers import (
    DocumentNotFoundError, LLMAPIError,
    document_not_found_handler, llm_api_error_handler, general_exception_handler
)

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

from Routes import extract, chat, warmup, library, auth

from Middleware.auth import get_current_user
from fastapi import Depends

app.include_router(warmup.router, tags=["system"])
app.include_router(extract.router, tags=["extract"], dependencies=[Depends(get_current_user)])
app.include_router(library.router, tags=["library"], dependencies=[Depends(get_current_user)])
app.include_router(chat.router, tags=["chat"], dependencies=[Depends(get_current_user)])
app.include_router(auth.router, tags=["auth"], prefix="/auth")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Onboardiq backend running with onboarding intelligence support"}
