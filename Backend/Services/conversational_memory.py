from typing import List, Dict, Optional
from datetime import datetime
from Database.database import get_db


class ChatSessionService:
    MEMORY_WINDOW = 10
    def _build_session_id(user_id: str, document_id: str) -> str:
        return f"{user_id}_{document_id}"
    
    @staticmethod
    async def get_or_create_session(user_id: str, document_id: str) -> Dict:
        db = await get_db()
        
        session_id = ChatSessionService._build_session_id(user_id, document_id)
        
        session = await db.chat_sessions.find_one({
            "_id": session_id,
            "user_id": user_id,
            "document_id": document_id
        })
        
        if session:
            return session
        
        new_session = {
            "_id": session_id,
            "user_id": user_id,
            "document_id": document_id,
            "messages": [],
            "message_count": 0,
            "created_at": datetime.utcnow(),
            "last_active": datetime.utcnow()
        }
        
        await db.chat_sessions.insert_one(new_session)
        return new_session
    
    @staticmethod
    async def add_message(user_id: str, document_id: str, role: str, content: str):
        db = await get_db()
        
        session_id = ChatSessionService._build_session_id(user_id, document_id)
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow()
        }
        
        await db.chat_sessions.update_one(
            {"_id": session_id, "user_id": user_id, "document_id": document_id},
            {
                "$push": {"messages": message},
                "$inc": {"message_count": 1},
                "$set": {"last_active": datetime.utcnow()}
            },
            upsert=True
        )
    
    @staticmethod
    async def add_exchange(user_id: str, document_id: str, user_message: str, ai_response: str):
        db = await get_db()
        
        session_id = ChatSessionService._build_session_id(user_id, document_id)
        
        now = datetime.utcnow()
        messages = [
            {"role": "user", "content": user_message, "timestamp": now},
            {"role": "assistant", "content": ai_response, "timestamp": now}
        ]
        
        await db.chat_sessions.update_one(
            {"_id": session_id, "user_id": user_id, "document_id": document_id},
            {
                "$push": {"messages": {"$each": messages}},
                "$inc": {"message_count": 2},
                "$set": {"last_active": now},
                "$setOnInsert": {"created_at": now, "document_id": document_id}
            },
            upsert=True
        )
    
    @staticmethod
    async def get_history(user_id: str, document_id: str, limit: int = None) -> List[Dict]:
        db = await get_db()
        
        session_id = ChatSessionService._build_session_id(user_id, document_id)
        
        session = await db.chat_sessions.find_one(
            {"_id": session_id, "user_id": user_id, "document_id": document_id},
            {"messages": 1}
        )
        
        if not session or "messages" not in session:
            return []
        
        messages = session["messages"]
        
        if limit:
            messages = messages[-limit:]
        
        return [{"role": m["role"], "content": m["content"]} for m in messages]
    
    @staticmethod
    async def get_context_string(user_id: str, document_id: str) -> str:
        history = await ChatSessionService.get_history(
            user_id, document_id, 
            limit=ChatSessionService.MEMORY_WINDOW
        )
        
        if not history:
            return "No previous conversation."
        
        context_parts = ["Previous conversation:"]
        for msg in history:
            role = "User" if msg["role"] == "user" else "Assistant"
            context_parts.append(f"{role}: {msg['content']}")
        
        return "\n".join(context_parts)
    
    @staticmethod
    async def enhance_query(query: str, user_id: str, document_id: str) -> str:
        history = await ChatSessionService.get_history(user_id, document_id, limit=4)
        
        if not history:
            return query
        
        is_followup = (
            len(query.split()) < 5 or
            any(word in query.lower() for word in ['it', 'this', 'that', 'they', 'them', 'its', 'more', 'explain'])
        )
        
        if is_followup and len(history) >= 2:
            recent = history[-2:]
            context = " ".join([msg["content"] for msg in recent])
            return f"{context} {query}"
        
        return query
    
    @staticmethod
    async def clear_session(user_id: str, document_id: str):
        db = await get_db()
        
        session_id = ChatSessionService._build_session_id(user_id, document_id)
        
        await db.chat_sessions.update_one(
            {"_id": session_id, "user_id": user_id, "document_id": document_id},
            {
                "$set": {
                    "messages": [],
                    "message_count": 0,
                    "last_active": datetime.utcnow()
                }
            }
        )
    
    @staticmethod
    async def delete_session(user_id: str, document_id: str):
        db = await get_db()
        session_id = ChatSessionService._build_session_id(user_id, document_id)
        await db.chat_sessions.delete_one({"_id": session_id, "user_id": user_id, "document_id": document_id})
    
    @staticmethod
    async def get_user_sessions(user_id: str, limit: int = 10) -> List[Dict]:
        db = await get_db()
        
        cursor = db.chat_sessions.find(
            {"user_id": user_id},
            {"_id": 1, "document_id": 1, "message_count": 1, "last_active": 1, "created_at": 1}
        ).sort("last_active", -1).limit(limit)
        
        sessions = await cursor.to_list(length=limit)
        
        return [
            {
                "session_id": s["_id"],
                "document_id": s.get("document_id"),
                "message_count": s.get("message_count", 0),
                "last_active": s.get("last_active").isoformat() if s.get("last_active") else None,
                "created_at": s.get("created_at").isoformat() if s.get("created_at") else None
            }
            for s in sessions
        ]
    
    @staticmethod
    async def get_session_summary(user_id: str, document_id: str) -> Optional[Dict]:
        """Get summary info for a session."""
        db = await get_db()
        
        session_id = ChatSessionService._build_session_id(user_id, document_id)
        
        session = await db.chat_sessions.find_one(
            {"_id": session_id, "user_id": user_id, "document_id": document_id},
            {"messages": 0}  # Exclude messages for performance
        )
        
        if not session:
            return None
        
        return {
            "session_id": session["_id"],
            "user_id": session["user_id"],
            "document_id": session.get("document_id"),
            "message_count": session.get("message_count", 0),
            "last_active": session.get("last_active").isoformat() if session.get("last_active") else None,
            "created_at": session.get("created_at").isoformat() if session.get("created_at") else None
        }

