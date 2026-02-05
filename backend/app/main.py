from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.routes import auth, campaigns, assets, ads

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Dynamic Creative Optimization API",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite dev + prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(ads.router, prefix="/ad", tags=["ads"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "souts-dco"}
