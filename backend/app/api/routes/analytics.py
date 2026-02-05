"""Analytics routes for tracking and reporting."""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timedelta
from typing import Optional
import hashlib

from app.services.supabase import get_supabase_admin
from app.api.routes.auth import get_current_user

router = APIRouter()


def hash_ip(ip: str) -> str:
    """Hash IP for privacy."""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


@router.post("/impression")
async def track_impression(
    campaign_id: str,
    variant_id: str,
    request: Request,
    signals: Optional[dict] = None
):
    """Track an ad impression."""
    supabase = get_supabase_admin()
    
    # Get client IP
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
    
    data = {
        "campaign_id": campaign_id,
        "variant_id": variant_id,
        "signals": signals or {},
        "ip_hash": hash_ip(ip),
    }
    
    try:
        supabase.table("impressions").insert(data).execute()
        return {"status": "ok"}
    except Exception as e:
        # Don't fail the ad serve if tracking fails
        return {"status": "error", "detail": str(e)}


@router.get("/campaigns/{campaign_id}/stats")
async def get_campaign_stats(
    campaign_id: str,
    days: int = 7,
    user=Depends(get_current_user)
):
    """Get campaign analytics."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    campaign = supabase.table("campaigns").select("id, name").eq(
        "id", campaign_id
    ).eq("user_id", user.id).single().execute()
    
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get impressions
    impressions = supabase.table("impressions").select(
        "id, variant_id, created_at, signals"
    ).eq("campaign_id", campaign_id).gte(
        "created_at", start_date.isoformat()
    ).execute()
    
    # Get variants for names
    variants = supabase.table("variants").select("id, name").eq(
        "campaign_id", campaign_id
    ).execute()
    variant_map = {v["id"]: v["name"] for v in variants.data}
    
    # Aggregate by variant
    variant_stats = {}
    daily_stats = {}
    signal_stats = {
        "countries": {},
        "dayparts": {},
        "weather": {},
    }
    
    for imp in impressions.data:
        vid = imp["variant_id"]
        variant_stats[vid] = variant_stats.get(vid, 0) + 1
        
        # Daily breakdown
        day = imp["created_at"][:10]
        if day not in daily_stats:
            daily_stats[day] = {}
        daily_stats[day][vid] = daily_stats[day].get(vid, 0) + 1
        
        # Signal breakdown
        signals = imp.get("signals", {})
        if signals:
            country = signals.get("geo_country", "Unknown")
            signal_stats["countries"][country] = signal_stats["countries"].get(country, 0) + 1
            
            daypart = signals.get("daypart", "Unknown")
            signal_stats["dayparts"][daypart] = signal_stats["dayparts"].get(daypart, 0) + 1
            
            weather = signals.get("weather_condition", "Unknown")
            signal_stats["weather"][weather] = signal_stats["weather"].get(weather, 0) + 1
    
    # Format response
    total_impressions = len(impressions.data)
    
    variants_breakdown = [
        {
            "variant_id": vid,
            "variant_name": variant_map.get(vid, "Unknown"),
            "impressions": count,
            "percentage": round(count / total_impressions * 100, 1) if total_impressions > 0 else 0,
        }
        for vid, count in sorted(variant_stats.items(), key=lambda x: x[1], reverse=True)
    ]
    
    daily_breakdown = [
        {
            "date": day,
            "total": sum(variants.values()),
            "by_variant": {variant_map.get(vid, vid): count for vid, count in variants.items()}
        }
        for day, variants in sorted(daily_stats.items())
    ]
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.data["name"],
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": days,
        },
        "total_impressions": total_impressions,
        "variants": variants_breakdown,
        "daily": daily_breakdown,
        "signals": {
            "top_countries": sorted(signal_stats["countries"].items(), key=lambda x: x[1], reverse=True)[:10],
            "dayparts": signal_stats["dayparts"],
            "weather": signal_stats["weather"],
        },
    }


@router.get("/dashboard")
async def get_dashboard_stats(user=Depends(get_current_user)):
    """Get overview stats for all campaigns."""
    supabase = get_supabase_admin()
    
    # Get user's campaigns
    campaigns = supabase.table("campaigns").select("id, name, active").eq(
        "user_id", user.id
    ).execute()
    
    if not campaigns.data:
        return {
            "total_campaigns": 0,
            "active_campaigns": 0,
            "total_impressions_7d": 0,
            "campaigns": [],
        }
    
    campaign_ids = [c["id"] for c in campaigns.data]
    
    # Get impressions from last 7 days
    start_date = datetime.utcnow() - timedelta(days=7)
    
    impressions = supabase.table("impressions").select(
        "campaign_id"
    ).in_("campaign_id", campaign_ids).gte(
        "created_at", start_date.isoformat()
    ).execute()
    
    # Count per campaign
    impression_counts = {}
    for imp in impressions.data:
        cid = imp["campaign_id"]
        impression_counts[cid] = impression_counts.get(cid, 0) + 1
    
    campaigns_with_stats = [
        {
            "id": c["id"],
            "name": c["name"],
            "active": c["active"],
            "impressions_7d": impression_counts.get(c["id"], 0),
        }
        for c in campaigns.data
    ]
    
    return {
        "total_campaigns": len(campaigns.data),
        "active_campaigns": sum(1 for c in campaigns.data if c["active"]),
        "total_impressions_7d": len(impressions.data),
        "campaigns": sorted(campaigns_with_stats, key=lambda x: x["impressions_7d"], reverse=True),
    }
