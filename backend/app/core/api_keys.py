from __future__ import annotations
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional

from app.services.supabase import get_supabase


def generate_api_key() -> str:
    """Generate a new API key: dco_live_ + 36 random hex chars."""
    return "dco_live_" + secrets.token_hex(18)


def hash_key(key: str) -> str:
    """SHA-256 hash of the API key."""
    return hashlib.sha256(key.encode()).hexdigest()


def get_key_prefix(key: str) -> str:
    """First 12 chars for display."""
    return key[:12]


async def validate_api_key(key: str) -> Optional[dict]:
    """Validate API key and return user info + scopes. Returns None if invalid."""
    if not key or not key.startswith("dco_"):
        return None

    key_hash = hash_key(key)
    sb = get_supabase()

    try:
        result = (
            sb.table("api_keys")
            .select("id, user_id, scopes, expires_at, revoked_at, metadata")
            .eq("key_hash", key_hash)
            .maybe_single()
            .execute()
        )
    except Exception:
        return None

    if not result.data:
        return None

    data = result.data

    if data.get("revoked_at"):
        return None

    if data.get("expires_at"):
        exp = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
        if exp < datetime.now(timezone.utc):
            return None

    # Update last_used_at (fire and forget)
    try:
        sb.table("api_keys").update(
            {"last_used_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", data["id"]).execute()
    except Exception:
        pass

    return {
        "user_id": data["user_id"],
        "scopes": data.get("scopes", []),
        "key_id": data["id"],
        "metadata": data.get("metadata", {}),
    }
