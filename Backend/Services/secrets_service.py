import base64
import hashlib
from datetime import datetime
from typing import Any, Optional

from cryptography.fernet import Fernet

from Database.database import get_db
from config import Config

DEFAULT_PREFERENCES = {
    "llm_provider": Config.DEFAULT_LLM_PROVIDER,
    "chunk_size": Config.DEFAULT_CHUNK_SIZE,
}

SECRET_KEYS = {
    "github_pat",
    "voyage_api_key",
    "groq_api_key",
    "gemini_api_key",
    "nomic_api_key",
}


def _derive_fernet() -> Fernet:
    secret = Config.SECRET_ENCRYPTION_KEY
    if not secret:
        raise RuntimeError("SECRET_ENCRYPTION_KEY is required for encrypted secrets")

    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _encrypt_value(value: str) -> str:
    return _derive_fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def _decrypt_value(value: str) -> str:
    return _derive_fernet().decrypt(value.encode("utf-8")).decode("utf-8")


async def save_secret(uid: str, key_name: str, value: str) -> None:
    if key_name not in SECRET_KEYS:
        raise ValueError(f"Unsupported secret key: {key_name}")

    db = await get_db()
    await db.users.update_one(
        {"_id": uid},
        {
            "$set": {
                f"encrypted_secrets.{key_name}": _encrypt_value(value.strip()),
                f"secret_updated_at.{key_name}": datetime.utcnow(),
            }
        },
    )


async def get_secret(uid: str, key_name: str) -> Optional[str]:
    db = await get_db()
    user = await db.users.find_one({"_id": uid}, {"encrypted_secrets": 1})
    encrypted = (user or {}).get("encrypted_secrets", {}).get(key_name)
    if not encrypted:
        return None
    return _decrypt_value(encrypted)


async def delete_secret(uid: str, key_name: str) -> None:
    db = await get_db()
    await db.users.update_one(
        {"_id": uid},
        {
            "$unset": {
                f"encrypted_secrets.{key_name}": "",
                f"secret_updated_at.{key_name}": "",
            }
        },
    )


async def get_effective_api_key(
    uid: Optional[str],
    key_name: str,
    fallback_value: Optional[str] = None,
) -> Optional[str]:
    if uid:
        secret = await get_secret(uid, key_name)
        if secret:
            return secret
    return fallback_value


def build_preferences(preferences: Optional[dict[str, Any]]) -> dict[str, Any]:
    merged = {**DEFAULT_PREFERENCES, **(preferences or {})}
    merged["llm_provider"] = (
        "gemini" if merged.get("llm_provider") == "gemini" else "groq"
    )
    try:
        chunk_size = int(merged.get("chunk_size", Config.DEFAULT_CHUNK_SIZE))
    except (TypeError, ValueError):
        chunk_size = Config.DEFAULT_CHUNK_SIZE
    merged["chunk_size"] = max(
        Config.PROFILE_CHUNK_SIZE_MIN,
        min(Config.PROFILE_CHUNK_SIZE_MAX, chunk_size),
    )
    return merged


def secret_status_map(user: Optional[dict[str, Any]]) -> dict[str, bool]:
    encrypted_secrets = (user or {}).get("encrypted_secrets", {})
    return {key: bool(encrypted_secrets.get(key)) for key in sorted(SECRET_KEYS)}
