from fastapi import APIRouter, Depends, HTTPException

from Middleware.auth import get_current_user
from Services.credit_service import CreditService

router = APIRouter()


@router.get("/me")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    stats = await CreditService.get_user_stats(current_user["uid"])
    if not stats:
        raise HTTPException(status_code=404, detail="User stats not found")

    return {
        "uid": current_user["uid"],
        "email": current_user.get("email"),
        "name": current_user.get("name"),
        "picture": current_user.get("picture"),
        "credits": stats.get("credits", 0),
        "plan": stats.get("plan", "free"),
        "usage": stats.get("total_usage", {}),
        "days_until_reset": stats.get("days_until_reset", 30),
    }
