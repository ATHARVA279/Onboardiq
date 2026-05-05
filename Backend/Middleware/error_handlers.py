from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

class DocumentNotFoundError(HTTPException):
    def __init__(self, detail: str = "Document not found"):
        super().__init__(status_code=404, detail=detail)

class LLMAPIError(HTTPException):
    def __init__(self, detail: str = "AI service temporarily unavailable"):
        super().__init__(status_code=503, detail=detail)

class InvalidContentError(HTTPException):
    def __init__(self, detail: str = "Invalid content provided"):
        super().__init__(status_code=400, detail=detail)

class ScrapingFailedError(HTTPException):
    def __init__(self, detail: str = "Failed to scrape URL"):
        super().__init__(status_code=502, detail=detail)

async def document_not_found_handler(request: Request, exc: DocumentNotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "error": "DocumentNotFound",
            "message": exc.detail
        }
    )

async def llm_api_error_handler(request: Request, exc: LLMAPIError):
    return JSONResponse(
        status_code=503,
        content={
            "error": "LLMAPIError",
            "message": exc.detail
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled Exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred. Please try again later."
        }
    )
