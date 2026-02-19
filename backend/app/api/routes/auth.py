from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends, Request
from app.models.schemas import UserAuth
from app.services.supabase import get_supabase
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
async def signup(body: UserAuth):
    sb = get_supabase()
    try:
        resp = sb.auth.sign_up({"email": body.email, "password": body.password})
        if resp.user is None:
            raise HTTPException(status_code=400, detail="Signup failed")
        return {
            "user": {"id": resp.user.id, "email": resp.user.email},
            "session": {
                "access_token": resp.session.access_token if resp.session else None,
                "refresh_token": resp.session.refresh_token if resp.session else None,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: UserAuth):
    sb = get_supabase()
    try:
        resp = sb.auth.sign_in_with_password({"email": body.email, "password": body.password})
        return {
            "user": {"id": resp.user.id, "email": resp.user.email},
            "session": {
                "access_token": resp.session.access_token,
                "refresh_token": resp.session.refresh_token,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(request: Request):
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        sb = get_supabase()
        try:
            sb.auth.sign_out(auth_header[7:])
        except Exception:
            pass
    return {"message": "Logged out"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": user}
