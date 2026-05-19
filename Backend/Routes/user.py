from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from Database.database import get_db
from Middleware.auth import get_current_user
from Services.credit_service import CreditService
from Services.secrets_service import (
    SECRET_KEYS,
    build_preferences,
    delete_secret,
    save_secret,
    secret_status_map,
)
from models.requests import UpdateUserProfileRequest

router = APIRouter()


class SaveSecretRequest(BaseModel):
    value: str = Field(..., min_length=1, max_length=5000)


@router.get("/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    uid = current_user["uid"]
    user = await db.users.find_one({"_id": uid}) or {}
    stats = await CreditService.get_user_stats(uid)
    preferences = build_preferences(user.get("preferences"))

    return {
        "uid": uid,
        "email": user.get("email") or current_user.get("email"),
        "full_name": user.get("full_name") or current_user.get("name"),
        "avatar_url": user.get("avatar_url") or current_user.get("picture"),
        "preferences": preferences,
        "secrets": secret_status_map(user),
        "credits": (stats or {}).get("credits", 0),
        "plan": (stats or {}).get("plan", "free"),
        "usage": (stats or {}).get("total_usage", {}),
        "days_until_reset": (stats or {}).get("days_until_reset", 30),
    }


@router.put("/user/profile")
async def update_user_profile(
    request: UpdateUserProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    db = await get_db()
    uid = current_user["uid"]
    user = await db.users.find_one({"_id": uid}) or {}
    preferences = build_preferences(user.get("preferences"))

    updates = {"updated_at": datetime.utcnow()}
    if request.full_name is not None:
        updates["full_name"] = request.full_name.strip()
    if request.avatar_url is not None:
        updates["avatar_url"] = request.avatar_url.strip()
    if request.llm_provider is not None:
        preferences["llm_provider"] = request.llm_provider
    if request.chunk_size is not None:
        preferences["chunk_size"] = request.chunk_size
    updates["preferences"] = build_preferences(preferences)

    await db.users.update_one({"_id": uid}, {"$set": updates})
    return await get_user_profile(current_user)


@router.post("/user/secrets/{key_name}", status_code=204)
async def create_or_update_secret(
    key_name: str,
    request: SaveSecretRequest,
    current_user: dict = Depends(get_current_user),
):
    if key_name not in SECRET_KEYS:
        raise HTTPException(status_code=404, detail="Unsupported secret name")
    await save_secret(current_user["uid"], key_name, request.value)
    return Response(status_code=204)


@router.delete("/user/secrets/{key_name}", status_code=204)
async def remove_secret(
    key_name: str,
    current_user: dict = Depends(get_current_user),
):
    if key_name not in SECRET_KEYS:
        raise HTTPException(status_code=404, detail="Unsupported secret name")
    await delete_secret(current_user["uid"], key_name)
    return Response(status_code=204)
