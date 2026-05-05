from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

if not MONGODB_URL:
    print("Warning: MONGODB_URL not found in environment variables")

client = AsyncIOMotorClient(MONGODB_URL)
db = client.luma_db

_indexes_created = False

async def get_db():
    global _indexes_created
    if not _indexes_created:
        await create_indexes()
        _indexes_created = True
    return db

async def create_indexes():
    """Create indexes for all collections to optimize query performance."""
    try:
        await db.jobs.create_index("user_id")
        await db.jobs.create_index([("user_id", 1), ("type", 1)])
        await db.jobs.create_index("created_at", expireAfterSeconds=86400)  
        
        await db.chat_sessions.create_index("user_id")
        await db.chat_sessions.create_index([("user_id", 1), ("document_id", 1)])
        await db.chat_sessions.create_index("last_active")
        
        await db.documents.create_index("user_id")
        await db.documents.create_index([("user_id", 1), ("url", 1)], unique=True)
        await db.documents.create_index([("user_id", 1), ("created_at", -1)])
        
        await db.document_chunks.create_index([("document_id", 1), ("chunk_index", 1)])
        await db.document_chunks.create_index("user_id")
        
        await db.bm25_tokens.create_index([("user_id", 1), ("document_id", 1)])
        await db.bm25_tokens.create_index([("user_id", 1), ("method", 1)])
        
        await db.quiz_results.create_index("user_id")
        await db.document_quizzes.create_index([("user_id", 1), ("document_id", 1)])
        await db.document_quizzes.create_index([("user_id", 1), ("document_id", 1), ("topic_key", 1)])
        
        await db.concept_notes.create_index([("user_id", 1), ("document_id", 1)])
        await db.concept_notes.create_index([("user_id", 1), ("document_id", 1), ("concept_name", 1)])
        
        await db.users.create_index("email")
        
        print("MongoDB indexes created successfully")
    except Exception as e:
        print(f"Index creation warning (may already exist): {e}")
