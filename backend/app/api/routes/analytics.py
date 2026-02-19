from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse

from app.models.schemas import ClickEvent, ImpressionEvent
from app.services.supabase import get_supabase
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.get("/click/{campaign_id}/{variant_id}")
async def track_click_redirect(campaign_id: str, variant_id: str, request: Request, url: str = ""):
    sb = get_supabase()
    try:
        sb.table("clicks").insert({
            "campaign_id": campaign_id,
            "variant_id": variant_id,
            "ip_address": _get_client_ip(request),
        }).execute()
    except Exception:
        pass
    redirect_url = url or "/"
    return RedirectResponse(url=redirect_url, status_code=302)


@router.post("/click")
async def track_click_ajax(body: ClickEvent, request: Request):
    sb = get_supabase()
    sb.table("clicks").insert({
        "campaign_id": body.campaign_id,
        "variant_id": body.variant_id,
        "ip_address": _get_client_ip(request),
    }).execute()
    return {"status": "ok"}


@router.post("/impression")
async def track_impression(body: ImpressionEvent, request: Request):
    sb = get_supabase()
    sb.table("impressions").insert({
        "campaign_id": body.campaign_id,
        "variant_id": body.variant_id,
        "signals": body.signals or {},
        "ip_address": _get_client_ip(request),
    }).execute()
    return {"status": "ok"}


@router.get("/campaigns/{campaign_id}/stats")
async def campaign_stats(campaign_id: str, days: int = 7, user: dict = Depends(get_current_user)):
    sb = get_supabase()

    # Verify ownership
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    impressions = sb.table("impressions").select("id, variant_id, created_at").eq("campaign_id", campaign_id).gte("created_at", since).execute()
    clicks = sb.table("clicks").select("id, variant_id, created_at").eq("campaign_id", campaign_id).gte("created_at", since).execute()

    imp_data = impressions.data or []
    click_data = clicks.data or []
    total_imp = len(imp_data)
    total_clicks = len(click_data)
    ctr = round(total_clicks / total_imp * 100, 2) if total_imp > 0 else 0

    # Daily breakdown
    daily: dict[str, dict] = {}
    for i in imp_data:
        day = i["created_at"][:10]
        daily.setdefault(day, {"date": day, "impressions": 0, "clicks": 0})
        daily[day]["impressions"] += 1
    for c in click_data:
        day = c["created_at"][:10]
        daily.setdefault(day, {"date": day, "impressions": 0, "clicks": 0})
        daily[day]["clicks"] += 1
    daily_breakdown = sorted(daily.values(), key=lambda x: x["date"])

    # Variant breakdown
    variant_imp: dict[str, int] = {}
    variant_clicks: dict[str, int] = {}
    for i in imp_data:
        vid = i.get("variant_id", "unknown")
        variant_imp[vid] = variant_imp.get(vid, 0) + 1
    for c in click_data:
        vid = c.get("variant_id", "unknown")
        variant_clicks[vid] = variant_clicks.get(vid, 0) + 1

    all_vids = set(variant_imp.keys()) | set(variant_clicks.keys())
    variant_breakdown = []
    for vid in all_vids:
        vi = variant_imp.get(vid, 0)
        vc = variant_clicks.get(vid, 0)
        variant_breakdown.append({
            "variant_id": vid,
            "impressions": vi,
            "clicks": vc,
            "ctr": round(vc / vi * 100, 2) if vi > 0 else 0,
        })

    return {
        "campaign_id": campaign_id,
        "days": days,
        "total_impressions": total_imp,
        "total_clicks": total_clicks,
        "ctr": ctr,
        "daily_breakdown": daily_breakdown,
        "variant_breakdown": variant_breakdown,
    }


@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    campaigns = sb.table("campaigns").select("id, name, status").eq("user_id", user["id"]).execute()
    camp_ids = [c["id"] for c in (campaigns.data or [])]

    if not camp_ids:
        return {"campaigns": [], "total_impressions": 0, "total_clicks": 0, "ctr": 0}

    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    total_imp = 0
    total_clicks = 0
    campaign_stats_list = []

    for cid in camp_ids:
        imps = sb.table("impressions").select("id", count="exact").eq("campaign_id", cid).gte("created_at", since).execute()
        clks = sb.table("clicks").select("id", count="exact").eq("campaign_id", cid).gte("created_at", since).execute()
        ci = imps.count or 0
        cc = clks.count or 0
        total_imp += ci
        total_clicks += cc
        campaign_stats_list.append({
            "campaign_id": cid,
            "impressions": ci,
            "clicks": cc,
            "ctr": round(cc / ci * 100, 2) if ci > 0 else 0,
        })

    return {
        "campaigns": campaign_stats_list,
        "total_impressions": total_imp,
        "total_clicks": total_clicks,
        "ctr": round(total_clicks / total_imp * 100, 2) if total_imp > 0 else 0,
    }
