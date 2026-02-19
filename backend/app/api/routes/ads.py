from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import HTMLResponse

from app.services.supabase import get_supabase
from app.services.signals import collect_signals
from app.services.decisioning import select_variant
from app.templates.renderer import render_ad, TEMPLATE_NAMES

router = APIRouter(prefix="/ad", tags=["ads"])


def _campaign_is_servable(campaign: dict) -> bool:
    if campaign.get("status") != "active":
        return False
    now = datetime.now(timezone.utc).isoformat()
    start = campaign.get("start_date")
    end = campaign.get("end_date")
    if start and now < start:
        return False
    if end and now > end:
        return False
    return True


def _load_campaign_full(campaign_id: str) -> dict:
    sb = get_supabase()
    camp = sb.table("campaigns").select("*").eq("id", campaign_id).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    variants = sb.table("variants").select("*").eq("campaign_id", campaign_id).execute()
    rules = sb.table("rules").select("*").eq("campaign_id", campaign_id).execute()
    return {**camp.data, "variants": variants.data or [], "rules": rules.data or []}


def _track_impression_bg(campaign_id: str, variant_id: str, signals: dict, ip: str):
    try:
        sb = get_supabase()
        sb.table("impressions").insert({
            "campaign_id": campaign_id,
            "variant_id": variant_id,
            "signals": signals,
            "ip_address": ip,
        }).execute()
    except Exception:
        pass


@router.get("/templates")
async def list_templates():
    return {"templates": TEMPLATE_NAMES}


@router.get("/{campaign_id}")
async def serve_ad(
    campaign_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    format: str = "html",
    track: bool = True,
    width: int = 400,
    height: int = 300,
    template: str = "default",
):
    campaign = _load_campaign_full(campaign_id)
    if not _campaign_is_servable(campaign):
        raise HTTPException(status_code=404, detail="Campaign not available")

    signals = await collect_signals(request)
    variant = select_variant(campaign, signals)
    if not variant:
        raise HTTPException(status_code=404, detail="No variant available")

    click_url = f"/api/analytics/click/{campaign_id}/{variant['id']}?url={variant.get('cta_url', '')}"

    if track:
        background_tasks.add_task(
            _track_impression_bg, campaign_id, variant["id"], signals, signals.get("ip", "")
        )

    if format == "json":
        return {"variant": variant, "signals": signals, "click_url": click_url}

    html = render_ad(variant, template, width, height, click_url)
    return HTMLResponse(content=html)


@router.get("/{campaign_id}/preview")
async def preview_ad(
    campaign_id: str,
    variant_id: Optional[str] = None,
    template: str = "default",
    width: int = 400,
    height: int = 300,
):
    sb = get_supabase()
    if variant_id:
        vr = sb.table("variants").select("*").eq("id", variant_id).eq("campaign_id", campaign_id).maybe_single().execute()
        if not vr.data:
            raise HTTPException(status_code=404, detail="Variant not found")
        variant = vr.data
    else:
        variants = sb.table("variants").select("*").eq("campaign_id", campaign_id).execute()
        if not variants.data:
            raise HTTPException(status_code=404, detail="No variants")
        variant = variants.data[0]

    html = render_ad(variant, template, width, height)
    return HTMLResponse(content=html)


@router.get("/{campaign_id}/debug")
async def debug_ad(campaign_id: str, request: Request):
    t0 = time.time()
    campaign = _load_campaign_full(campaign_id)
    signals = await collect_signals(request)
    variant = select_variant(campaign, signals)
    elapsed = round((time.time() - t0) * 1000, 2)
    return {
        "campaign_id": campaign_id,
        "ab_test_mode": campaign.get("ab_test_mode"),
        "signals": signals,
        "selected_variant": variant,
        "total_variants": len(campaign.get("variants", [])),
        "total_rules": len(campaign.get("rules", [])),
        "timing_ms": elapsed,
    }


@router.get("/{campaign_id}/simulate")
async def simulate_ad(campaign_id: str, request: Request):
    campaign = _load_campaign_full(campaign_id)
    signals = await collect_signals(request)

    # Override signals with query params prefixed signal_
    for key, val in request.query_params.items():
        if key.startswith("signal_"):
            signal_name = key[7:]
            # Try to parse as number/bool
            if val.lower() in ("true", "false"):
                signals[signal_name] = val.lower() == "true"
            else:
                try:
                    signals[signal_name] = float(val) if "." in val else int(val)
                except ValueError:
                    signals[signal_name] = val

    variant = select_variant(campaign, signals)
    return {"signals": signals, "selected_variant": variant}
