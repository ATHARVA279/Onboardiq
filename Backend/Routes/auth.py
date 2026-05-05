from fastapi import APIRouter, Depends, HTTPException
from Middleware.auth import get_current_user
from Services.credit_service import CreditService
from Database.database import get_db

router = APIRouter()

@router.get("/me")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    stats = await CreditService.get_user_stats(current_user['uid'])
    if not stats:
        raise HTTPException(status_code=404, detail="User stats not found")
    
    db = await get_db()
    pipeline = [
        {"$match": {"user_id": current_user['uid']}},
        {"$group": {"_id": None, "average": {"$avg": "$percentage"}}}
    ]
    avg_result = await db.quiz_results.aggregate(pipeline).to_list(length=1)
    quiz_average = round(avg_result[0]['average']) if avg_result else 0
    
    return {
        "uid": current_user['uid'],
        "email": current_user.get('email'),
        "name": current_user.get('name'),
        "picture": current_user.get('picture'),
        "credits": stats.get("credits", 0),
        "plan": stats.get("plan", "free"),
        "usage": stats.get("total_usage", {}),
        "days_until_reset": stats.get("days_until_reset", 30),
        "quiz_average": quiz_average
    }
