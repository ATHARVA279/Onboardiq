from Database.database import get_db
from fastapi import HTTPException, status
from datetime import datetime
import uuid

class CreditService:
    DEFAULT_CREDITS = 100
    
    COSTS = {
        "extract": 5,  
        "quiz": 1,     
        "chat": 1,
        "notes": 2     
    }

    @staticmethod
    async def get_user_stats(uid: str):
        db = await get_db()
        user = await db.users.find_one({"_id": uid})
        if not user:
            return None
            
        user = await CreditService.check_monthly_reset(user, db)
        
        return {
            "credits": user.get("credits", CreditService.DEFAULT_CREDITS),
            "plan": user.get("plan", "free"),
            "total_usage": user.get("total_usage", {}),
            "days_until_reset": CreditService.get_days_until_reset(user)
        }

    @staticmethod
    async def check_monthly_reset(user: dict, db):
        now = datetime.utcnow()
        last_reset = user.get("last_reset_date", user.get("created_at", now))
        
        if isinstance(last_reset, str):
            try:
                last_reset = datetime.fromisoformat(last_reset.replace('Z', '+00:00'))
            except:
                last_reset = now

        delta = now - last_reset
        
        if delta.days >= 30:
            new_reset_date = now
            await db.users.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {
                        "credits": CreditService.DEFAULT_CREDITS,
                        "last_reset_date": new_reset_date
                    }
                }
            )
            user["credits"] = CreditService.DEFAULT_CREDITS
            user["last_reset_date"] = new_reset_date
            
        return user

    @staticmethod
    def get_days_until_reset(user: dict) -> int:
        now = datetime.utcnow()
        last_reset = user.get("last_reset_date", user.get("created_at", now))
        
        if isinstance(last_reset, str):
            try:
                last_reset = datetime.fromisoformat(last_reset.replace('Z', '+00:00'))
            except:
                last_reset = now
                
        from datetime import timedelta
        next_reset = last_reset + timedelta(days=30)
        
        days_left = (next_reset - now).days
        return max(0, days_left)

    @staticmethod
    async def check_and_deduct(uid: str, action: str) -> str:
        cost = CreditService.COSTS.get(action, 0)
        if cost == 0:
            return None

        db = await get_db()
        transaction_id = str(uuid.uuid4())
        
        result = await db.users.update_one(
            {
                "_id": uid, 
                "credits": {"$gte": cost}
            },
            {
                "$inc": {
                    "credits": -cost,
                    f"total_usage.{action}": 1
                },
                "$set": {"last_activity": datetime.utcnow()},
                "$push": {
                    "pending_transactions": {
                        "id": transaction_id,
                        "action": action,
                        "cost": cost,
                        "created_at": datetime.utcnow()
                    }
                }
            }
        )

        if result.modified_count == 0:
            user = await db.users.find_one({"_id": uid})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            current_credits = user.get("credits", 0)
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED, 
                detail=f"Insufficient credits. Required: {cost}, Available: {current_credits}"
            )
            
        return transaction_id

    @staticmethod
    async def complete_transaction(uid: str, transaction_id: str):
        if not transaction_id:
            return
            
        db = await get_db()
        await db.users.update_one(
            {"_id": uid},
            {
                "$pull": {
                    "pending_transactions": {"id": transaction_id}
                }
            }
        )

    @staticmethod
    async def refund_by_action(uid: str, action: str, transaction_id: str):
        if not transaction_id:
            return False
            
        cost = CreditService.COSTS.get(action, 0)
        if cost == 0:
            return True
            
        db = await get_db()

        result = await db.users.update_one(
            {
                "_id": uid,
                "pending_transactions.id": transaction_id
            },
            {
                "$pull": {
                    "pending_transactions": {"id": transaction_id}
                },
                "$inc": {
                    "credits": cost,
                    f"total_usage.{action}": -1
                }
            }
        )
        
        await db.users.update_one(
            {"_id": uid, f"total_usage.{action}": {"$lt": 0}},
            {"$set": {f"total_usage.{action}": 0}}
        )
        
        return result.modified_count > 0

    @staticmethod
    async def initialize_user(uid: str, email: str, name: str, picture: str):
        db = await get_db()
        await db.users.update_one(
            {"_id": uid},
            {
                "$set": {
                    "email": email,
                    "full_name": name,
                    "avatar_url": picture,
                    "last_login": datetime.utcnow()
                },
                "$setOnInsert": {
                    "credits": CreditService.DEFAULT_CREDITS,
                    "plan": "free",
                    "created_at": datetime.utcnow(),
                    "total_usage": {
                        "extract": 0,
                        "quiz": 0,
                        "chat": 0,
                        "notes": 0
                    }
                }
            },
            upsert=True
        )
