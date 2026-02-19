from __future__ import annotations
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import ALLOWED_ORIGINS
from app.api.routes import auth, campaigns, ads, analytics, assets, pools, keys

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="SOUTS DCO", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(campaigns.router)
app.include_router(ads.router)
app.include_router(analytics.router)
app.include_router(assets.router)
app.include_router(pools.router)
app.include_router(keys.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "souts-dco"}
