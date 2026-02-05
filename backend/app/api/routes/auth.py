"""Authentication routes using Supabase Auth."""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.schemas import UserCreate, UserLogin, Token
from app.services.supabase import get_supabase_client, get_supabase_admin

router = APIRouter()
security = HTTPBearer()


@router.post("/signup", response_model=Token)
async def signup(user: UserCreate):
    """Register a new user."""
    supabase = get_supabase_client()
    
    try:
        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
        })
        
        if response.user:
            return Token(
                access_token=response.session.access_token,
                user={"id": response.user.id, "email": response.user.email}
            )
        raise HTTPException(status_code=400, detail="Signup failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    """Login with email and password."""
    supabase = get_supabase_client()
    
    try:
        response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password,
        })
        
        if response.user:
            return Token(
                access_token=response.session.access_token,
                user={"id": response.user.id, "email": response.user.email}
            )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout current user."""
    supabase = get_supabase_client()
    supabase.auth.sign_out()
    return {"message": "Logged out"}


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user."""
    supabase = get_supabase_client()
    
    try:
        response = supabase.auth.get_user(credentials.credentials)
        if response.user:
            return response.user
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """Get current user info."""
    return {"id": user.id, "email": user.email}
