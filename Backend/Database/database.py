from motor.motor_asyncio import AsyncIOMotorClient

from config import Config

if not Config.MONGODB_URI:
    print("Warning: MONGODB_URI not found in environment variables")

client = None
db = None

workspaces_collection = None
chunks_collection = None
questions_collection = None
jobs_collection = None
sessions_collection = None
users_collection = None
staleness_alerts_collection = None

_indexes_created = False
_vector_index_checked = False


async def get_db():
    global client, db
    global workspaces_collection, chunks_collection, questions_collection
    global jobs_collection, sessions_collection, users_collection, staleness_alerts_collection
    if client is None:
        client = AsyncIOMotorClient(
            Config.MONGODB_URI,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000
        )
        db = client[Config.DB_NAME]
        workspaces_collection = db.workspaces
        chunks_collection = db.chunks
        questions_collection = db.questions
        jobs_collection = db.jobs
        sessions_collection = db.sessions
        users_collection = db.users
        staleness_alerts_collection = db.staleness_alerts

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
    index_name = Config.VECTOR_INDEX_NAME

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
            "mappings": {
                "dynamic": False,
                "fields": {
                    "embedding": {
                        "type": "knnVector",
                        "dimensions": 1024,
                        "similarity": "cosine"
                    },
                    "workspace_id": {
                        "type": "filter"
                    },
                    "source_type": {
                        "type": "filter"
                    },
                    "source_id": {
                        "type": "filter"
                    }
                }
            }
        }

        # IMPORTANT MIGRATION NOTE:
        # Existing 768-dimensional embeddings are incompatible with this 1024-dimensional index.
        # You must delete all existing chunks from the MongoDB chunks collection before re-indexing.
        # Also, delete the existing vector search index in Atlas UI and let the app recreate it or recreate it manually.

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

        # staleness_alerts indexes
        await staleness_alerts_collection.create_index("workspace_id")
        await staleness_alerts_collection.create_index("resolved")
        await staleness_alerts_collection.create_index("severity")
        await staleness_alerts_collection.create_index("created_at")

        print("MongoDB indexes created successfully")
    except Exception as exc:
        print(f"Index creation warning (may already exist): {exc}")
