from __future__ import annotations
from fastapi import Request, HTTPException
from typing import Optional

from app.services.supabase import get_supabase
from app.core.api_keys import validate_api_key


async def get_current_user(request: Request) -> dict:
    """Extract Bearer token and validate with Supabase auth. Raises 401 if invalid."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header[7:]

    # Check if it's an API key
    if token.startswith("dco_"):
        key_auth = await validate_api_key(token)
        if not key_auth:
            raise HTTPException(status_code=401, detail="Invalid API key")
        return {"id": key_auth["user_id"], "scopes": key_auth["scopes"], "via": "api_key"}

    # Otherwise validate as Supabase JWT
    sb = get_supabase()
    try:
        user_resp = sb.auth.get_user(token)
        user = user_resp.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user.id, "email": user.email, "via": "session"}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_optional_user(request: Request) -> Optional[dict]:
    """Same as get_current_user but returns None instead of raising."""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
