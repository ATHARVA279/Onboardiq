import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

if not MONGODB_URL:
    print("Warning: MONGODB_URL not found in environment variables")

client = AsyncIOMotorClient(MONGODB_URL)
db = client.luma_db

workspaces_collection = db.workspaces
chunks_collection = db.chunks
questions_collection = db.questions
jobs_collection = db.jobs
sessions_collection = db.sessions
users_collection = db.users

_indexes_created = False
_vector_index_checked = False


async def get_db():
    global _indexes_created, _vector_index_checked
    if not _indexes_created:
        await create_indexes()
        _indexes_created = True
    if not _vector_index_checked:
        await init_vector_index()
        _vector_index_checked = True
    return db


async def init_vector_index():
    """Create the Atlas vector search index for chunks.embedding if needed."""
    index_name = "chunks_embedding_vector_index"

    try:
        try:
            existing_indexes = await chunks_collection.list_search_indexes().to_list(length=None)
        except Exception as exc:
            print(f"Vector index availability warning: {exc}")
            return

        for existing in existing_indexes:
            if existing.get("name") == index_name:
                return

        definition = {
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding",
                    "numDimensions": 768,
                    "similarity": "cosine",
                }
            ]
        }

        try:
            await chunks_collection.create_search_index(
                {
                    "name": index_name,
                    "type": "vectorSearch",
                    "definition": definition,
                }
            )
        except TypeError:
            await db.command(
                {
                    "createSearchIndexes": chunks_collection.name,
                    "indexes": [
                        {
                            "name": index_name,
                            "type": "vectorSearch",
                            "definition": definition,
                        }
                    ],
                }
            )
        print("MongoDB Atlas vector index created successfully")
    except Exception as exc:
        print(f"Vector index creation warning: {exc}")


async def create_indexes():
    """Create indexes for the OnboardIQ collections."""
    try:
        await chunks_collection.create_index("workspace_id")
        await chunks_collection.create_index("source_id")
        await chunks_collection.create_index("is_stale")
        await chunks_collection.create_index("source_type")

        await questions_collection.create_index("workspace_id")
        await questions_collection.create_index("created_at")

        await jobs_collection.create_index("workspace_id")
        await jobs_collection.create_index("status")

        print("MongoDB indexes created successfully")
    except Exception as exc:
        print(f"Index creation warning (may already exist): {exc}")
