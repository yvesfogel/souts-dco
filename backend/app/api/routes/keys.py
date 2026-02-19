from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends

from app.models.schemas import APIKeyCreate, APIKeyUpdate
from app.services.supabase import get_supabase
from app.core.api_keys import generate_api_key, hash_key, get_key_prefix
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/keys", tags=["api-keys"])


@router.post("/")
async def create_key(body: APIKeyCreate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    raw_key = generate_api_key()
    key_hash = hash_key(raw_key)
    prefix = get_key_prefix(raw_key)

    data = {
        "user_id": user["id"],
        "name": body.name,
        "key_hash": key_hash,
        "key_prefix": prefix,
        "scopes": body.scopes,
    }
    if body.expires_at:
        data["expires_at"] = body.expires_at

    result = sb.table("api_keys").insert(data).execute()
    row = result.data[0] if result.data else {}

    return {
        "id": row.get("id"),
        "name": body.name,
        "key": raw_key,  # Only shown once
        "key_prefix": prefix,
        "scopes": body.scopes,
        "expires_at": row.get("expires_at"),
        "created_at": row.get("created_at"),
    }


@router.get("/")
async def list_keys(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("api_keys")
        .select("id, name, key_prefix, scopes, last_used_at, expires_at, created_at, revoked_at")
        .eq("user_id", user["id"])
        .is_("revoked_at", "null")
        .order("created_at", desc=True)
        .execute()
    )
    return {"keys": result.data or []}


@router.get("/{key_id}")
async def get_key(key_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("api_keys")
        .select("id, name, key_prefix, scopes, last_used_at, expires_at, created_at, revoked_at")
        .eq("id", key_id)
        .eq("user_id", user["id"])
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="API key not found")
    return result.data


@router.patch("/{key_id}")
async def update_key(key_id: str, body: APIKeyUpdate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = sb.table("api_keys").update(data).eq("id", key_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="API key not found")
    return result.data[0]


@router.delete("/{key_id}")
async def revoke_key(key_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    from datetime import datetime, timezone
    result = (
        sb.table("api_keys")
        .update({"revoked_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", key_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"message": "Key revoked"}
