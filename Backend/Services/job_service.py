import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from Database.database import get_db


class JobService:
    @staticmethod
    async def create_job(job_type: str, user_id: str, metadata: Dict = None) -> str:
        db = await get_db()
        
        job_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        job = {
            "_id": job_id,
            "type": job_type,
            "user_id": user_id,
            "status": "pending",
            "progress": 0,
            "result": None,
            "error": None,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now
        }
        
        await db.jobs.insert_one(job)
        return job_id

    @staticmethod
    async def update_job(job_id: str, status: str = None, progress: int = None, result: Dict = None, error: str = None):
        db = await get_db()
        
        update_fields = {"updated_at": datetime.utcnow()}
        
        if status is not None:
            update_fields["status"] = status
        if progress is not None:
            update_fields["progress"] = progress
        if result is not None:
            update_fields["result"] = result
        if error is not None:
            update_fields["error"] = error
            
        await db.jobs.update_one(
            {"_id": job_id},
            {"$set": update_fields}
        )

    @staticmethod
    async def get_job(job_id: str, user_id: str) -> Optional[Dict]:
        db = await get_db()
        
        job = await db.jobs.find_one({"_id": job_id, "user_id": user_id})
        
        if not job:
            return None
        
        return {
            "id": job["_id"],
            "type": job["type"],
            "user_id": job["user_id"],
            "status": job["status"],
            "progress": job["progress"],
            "result": job.get("result"),
            "error": job.get("error"),
            "metadata": job.get("metadata", {}),
            "created_at": job["created_at"].isoformat() if isinstance(job["created_at"], datetime) else job["created_at"],
            "updated_at": job["updated_at"].isoformat() if isinstance(job["updated_at"], datetime) else job["updated_at"]
        }

    @staticmethod
    async def list_user_jobs(user_id: str, job_type: str = None, limit: int = 20) -> List[Dict]:
        db = await get_db()
        
        query = {"user_id": user_id}
        if job_type:
            query["type"] = job_type
            
        cursor = db.jobs.find(query).sort("created_at", -1).limit(limit)
        jobs = await cursor.to_list(length=limit)
        
        return [
            {
                "id": job["_id"],
                "type": job["type"],
                "status": job["status"],
                "progress": job["progress"],
                "error": job.get("error"),
                "metadata": job.get("metadata", {}),
                "created_at": job["created_at"].isoformat() if isinstance(job["created_at"], datetime) else job["created_at"],
                "updated_at": job["updated_at"].isoformat() if isinstance(job["updated_at"], datetime) else job["updated_at"]
            }
            for job in jobs
        ]

    @staticmethod
    async def cleanup_old_jobs(hours: int = 24):
        db = await get_db()
        
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        result = await db.jobs.delete_many({
            "status": {"$in": ["completed", "failed"]},
            "updated_at": {"$lt": cutoff}
        })
        
        return result.deleted_count

    @staticmethod
    async def get_pending_jobs(job_type: str = None) -> List[Dict]:
        db = await get_db()
        
        query = {"status": {"$in": ["pending", "processing"]}}
        if job_type:
            query["type"] = job_type
            
        cursor = db.jobs.find(query)
        jobs = await cursor.to_list(length=100)
        
        return jobs

