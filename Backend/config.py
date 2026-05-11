import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    GEMINI_API_KEY = GOOGLE_API_KEY
    MONGODB_URI = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL")
    MONGODB_URL = MONGODB_URI
    GITHUB_DEFAULT_TOKEN = os.getenv("GITHUB_DEFAULT_TOKEN")

    FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH", "serviceAccountKey.json")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "luma-362fc")

    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/gemini-embedding-001")

    VECTOR_INDEX_NAME = os.getenv("VECTOR_INDEX_NAME", "vector_index")
    DEFAULT_CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "400"))
    DEFAULT_CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))

    RATE_LIMIT_CHAT = os.getenv("RATE_LIMIT_CHAT", "20/minute")
    RATE_LIMIT_EXTRACT = os.getenv("RATE_LIMIT_EXTRACT", "10/minute")

    DB_NAME = os.getenv("DB_NAME", "luma_db")

    CORS_ORIGINS = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://onboardiq-ai.vercel.app",
    ] + os.getenv("ADDITIONAL_CORS_ORIGINS", "").split(",")

    APP_TITLE = os.getenv("APP_TITLE", "Onboardiq - Developer Onboarding Intelligence")
    APP_VERSION = os.getenv("APP_VERSION", "2.0.0")
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"

    @classmethod
    def validate(cls):
        errors = []

        if not cls.GOOGLE_API_KEY:
            errors.append(
                "GOOGLE_API_KEY not found in environment. Please set it in Backend/.env."
            )

        if not cls.MONGODB_URI:
            errors.append(
                "MONGODB_URI not found in environment variables. Please set it in Backend/.env."
            )

        if errors:
            raise RuntimeError("\n".join(errors))

        return True


Config.validate()
