"""Ad serving routes - the core DCO endpoint."""
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
from datetime import datetime, timezone
import hashlib

from app.services.supabase import get_supabase_admin
from app.services.decisioning import select_variant
from app.services.signals import get_geo_signals, get_weather_signals, get_daypart_signals
from app.templates.renderer import render_ad, list_templates

router = APIRouter()


def hash_ip(ip: str) -> str:
    """Hash IP for privacy."""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


async def track_impression(campaign_id: str, variant_id: str, signals: dict, ip: str):
    """Track impression in background."""
    try:
        supabase = get_supabase_admin()
        supabase.table("impressions").insert({
            "campaign_id": campaign_id,
            "variant_id": variant_id,
            "signals": signals,
            "ip_hash": hash_ip(ip),
        }).execute()
    except Exception:
        pass  # Don't fail ad serving if tracking fails


def is_campaign_scheduled(campaign: dict) -> bool:
    """Check if campaign is within its scheduled dates."""
    now = datetime.now(timezone.utc)
    
    start_date = campaign.get("start_date")
    end_date = campaign.get("end_date")
    
    # Parse dates if they're strings
    if start_date and isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if end_date and isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    # Check start date
    if start_date and now < start_date:
        return False
    
    # Check end date
    if end_date and now > end_date:
        return False
    
    return True


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    # Check common proxy headers
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "127.0.0.1"


async def collect_signals(request: Request) -> dict:
    """Collect all signals for ad decisioning."""
    ip = get_client_ip(request)
    
    # Get geo signals
    geo = await get_geo_signals(ip)
    
    # Get weather signals (needs coordinates from geo)
    lat = geo.get("geo_lat", 0)
    lon = geo.get("geo_lon", 0)
    weather = await get_weather_signals(lat, lon)
    
    # Get daypart signals (use timezone from geo if available)
    tz = geo.get("geo_timezone", "UTC")
    daypart = get_daypart_signals(tz)
    
    # Combine all signals
    signals = {**geo, **weather, **daypart}
    
    # Add request metadata
    signals["user_agent"] = request.headers.get("user-agent", "")
    signals["referer"] = request.headers.get("referer", "")
    
    return signals


@router.get("/templates")
async def get_templates():
    """List available ad templates."""
    return list_templates()


@router.get("/{campaign_id}")
async def serve_ad(
    campaign_id: str, 
    request: Request, 
    background_tasks: BackgroundTasks, 
    format: str = "html", 
    track: bool = True,
    width: int = None,
    height: int = None,
    template: str = None,
):
    """
    Serve a personalized ad based on signals.
    
    This is the main DCO endpoint that:
    1. Collects signals (geo, weather, daypart)
    2. Evaluates rules to select a variant
    3. Renders and returns the creative
    """
    supabase = get_supabase_admin()
    
    # Get campaign
    campaign_result = supabase.table("campaigns").select("*").eq("id", campaign_id).eq("active", True).single().execute()
    
    if not campaign_result.data:
        raise HTTPException(status_code=404, detail="Campaign not found or inactive")
    
    campaign = campaign_result.data
    
    # Check scheduling
    if not is_campaign_scheduled(campaign):
        raise HTTPException(status_code=404, detail="Campaign not currently scheduled")
    
    # Collect signals
    signals = await collect_signals(request)
    
    # Select variant based on rules
    variant = await select_variant(campaign_id, signals)
    
    if not variant:
        raise HTTPException(status_code=404, detail="No matching variant found")
    
    # Track impression in background
    if track:
        ip = get_client_ip(request)
        background_tasks.add_task(track_impression, campaign_id, variant["id"], signals, ip)
    
    # Return based on format
    if format == "json":
        return JSONResponse({
            "campaign": campaign,
            "variant": variant,
            "signals": signals,
        })
    
    # Default: HTML - use template from campaign settings or query param
    selected_template = template or campaign.get("template", "default")
    html = render_ad(variant, campaign, template=selected_template, width=width, height=height)
    return HTMLResponse(html)


@router.get("/{campaign_id}/preview")
async def preview_variant(campaign_id: str, variant_id: str, template: str = None, width: int = None, height: int = None):
    """Preview a specific variant (for admin UI)."""
    supabase = get_supabase_admin()
    
    campaign_result = supabase.table("campaigns").select("*").eq("id", campaign_id).single().execute()
    if not campaign_result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    variant_result = supabase.table("variants").select("*").eq("id", variant_id).eq("campaign_id", campaign_id).single().execute()
    if not variant_result.data:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    selected_template = template or campaign_result.data.get("template", "default")
    html = render_ad(variant_result.data, campaign_result.data, template=selected_template, width=width, height=height)
    return HTMLResponse(html)


@router.get("/{campaign_id}/debug")
async def debug_signals(campaign_id: str, request: Request):
    """Debug endpoint to see collected signals (admin only in production)."""
    signals = await collect_signals(request)
    
    supabase = get_supabase_admin()
    variant = await select_variant(campaign_id, signals)
    
    return {
        "signals": signals,
        "selected_variant": variant,
    }


@router.get("/{campaign_id}/simulate")
async def simulate_ad(campaign_id: str, request: Request):
    """
    Simulate ad serving with custom signals.
    Pass signals as query params prefixed with 'signal_', e.g.:
    ?signal_weather_temp=35&signal_daypart=morning
    """
    supabase = get_supabase_admin()
    
    # Get campaign
    campaign_result = supabase.table("campaigns").select("*").eq("id", campaign_id).single().execute()
    
    if not campaign_result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = campaign_result.data
    
    # Build signals from query params
    signals = {}
    for key, value in request.query_params.items():
        if key.startswith("signal_"):
            signal_key = key[7:]  # Remove 'signal_' prefix
            # Try to parse as number or boolean
            if value.lower() == "true":
                signals[signal_key] = True
            elif value.lower() == "false":
                signals[signal_key] = False
            else:
                try:
                    signals[signal_key] = float(value) if "." in value else int(value)
                except ValueError:
                    signals[signal_key] = value
    
    # Select variant based on simulated signals
    variant = await select_variant(campaign_id, signals)
    
    if not variant:
        # Get default variant
        default = supabase.table("variants").select("*").eq(
            "campaign_id", campaign_id
        ).eq("is_default", True).limit(1).execute()
        
        if default.data:
            variant = default.data[0]
        else:
            # Just get first variant
            first = supabase.table("variants").select("*").eq(
                "campaign_id", campaign_id
            ).limit(1).execute()
            variant = first.data[0] if first.data else None
    
    if not variant:
        raise HTTPException(status_code=404, detail="No variants found")
    
    # Find which rule matched (if any)
    matched_rule = None
    rules_result = supabase.table("rules").select("*").eq(
        "campaign_id", campaign_id
    ).eq("active", True).order("priority").execute()
    
    from app.services.decisioning import evaluate_rule
    for rule in (rules_result.data or []):
        if evaluate_rule(rule, signals):
            matched_rule = rule.get("name")
            break
    
    # Generate HTML preview
    selected_template = campaign.get("template", "default")
    html = render_ad(variant, campaign, template=selected_template)
    
    return {
        "campaign": campaign,
        "variant": variant,
        "signals": signals,
        "matched_rule": matched_rule,
        "html": html,
    }
