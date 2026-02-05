from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.routes import auth, campaigns, assets, ads, analytics, pools

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Dynamic Creative Optimization API",
    version="0.1.0",
)

# CORS - allow frontend origins
import os
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    FRONTEND_URL,
]
# Also allow any vercel.app subdomain
if ".vercel.app" not in FRONTEND_URL:
    ALLOWED_ORIGINS.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel preview deploys
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(ads.router, prefix="/ad", tags=["ads"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(pools.router, prefix="/api/pools", tags=["pools"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "souts-dco"}
