from fastapi import APIRouter, Depends, HTTPException

from Database.database import get_db
from Middleware.auth import get_current_user
from Services.credit_service import CreditService
from Services.secrets_service import build_preferences, secret_status_map

router = APIRouter()


@router.get("/me")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    user = await db.users.find_one({"_id": current_user["uid"]}) or {}
    stats = await CreditService.get_user_stats(current_user["uid"])
    if not stats:
        raise HTTPException(status_code=404, detail="User stats not found")

    return {
        "uid": current_user["uid"],
        "email": user.get("email") or current_user.get("email"),
        "name": user.get("full_name") or current_user.get("name"),
        "picture": user.get("avatar_url") or current_user.get("picture"),
        "preferences": build_preferences(user.get("preferences")),
        "secrets": secret_status_map(user),
        "credits": stats.get("credits", 0),
        "plan": stats.get("plan", "free"),
        "usage": stats.get("total_usage", {}),
        "days_until_reset": stats.get("days_until_reset", 30),
    }
