import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    MONGODB_URL = os.getenv("MONGODB_URL")
    FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH", "serviceAccountKey.json")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "luma-362fc")
    
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    DEFAULT_CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "512"))
    DEFAULT_CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))
    
    MAX_TEXT_LENGTH_CONCEPTS = int(os.getenv("MAX_TEXT_LENGTH_CONCEPTS", "50000"))
    MAX_TEXT_LENGTH_QUIZ = int(os.getenv("MAX_TEXT_LENGTH_QUIZ", "2500"))
    MAX_TEXT_LENGTH_QA = int(os.getenv("MAX_TEXT_LENGTH_QA", "3000"))
    
    MIN_QUIZ_QUESTIONS = int(os.getenv("MIN_QUIZ_QUESTIONS", "5"))
    MAX_QUIZ_QUESTIONS = int(os.getenv("MAX_QUIZ_QUESTIONS", "20"))
    DEFAULT_QUIZ_QUESTIONS = int(os.getenv("DEFAULT_QUIZ_QUESTIONS", "10"))
    
    DEFAULT_RAG_TOP_K = int(os.getenv("RAG_TOP_K", "4"))
    BM25_TOP_K = int(os.getenv("BM25_TOP_K", "10"))
    
    RATE_LIMIT_CHAT = os.getenv("RATE_LIMIT_CHAT", "20/minute")
    RATE_LIMIT_EXTRACT = os.getenv("RATE_LIMIT_EXTRACT", "10/minute")
    RATE_LIMIT_QUIZ = os.getenv("RATE_LIMIT_QUIZ", "15/minute")
    RATE_LIMIT_NOTES = os.getenv("RATE_LIMIT_NOTES", "15/minute")
    
    HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "30.0"))
    USER_AGENT = os.getenv(
        "USER_AGENT",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    
    DB_NAME = os.getenv("DB_NAME", "luma_db")
    
    CORS_ORIGINS = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://project-luma.vercel.app",
        "https://*.vercel.app",
    ]
    
    APP_TITLE = os.getenv("APP_TITLE", "Luma - AI Learning Platform")
    APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
    
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"
    
    @classmethod
    def validate(cls):
        errors = []
        
        if not cls.GEMINI_API_KEY:
            errors.append(
                "GEMINI_API_KEY not found in environment. "
                "Please set it in Backend/.env file. "
                "Get your free API key at: https://ai.google.dev/"
            )
        
        if not cls.MONGODB_URL:
            errors.append(
                "MONGODB_URL not found in environment variables. "
                "Please set it in Backend/.env file."
            )
        
        if errors:
            raise RuntimeError("\n".join(errors))
        
        return True


Config.validate()
