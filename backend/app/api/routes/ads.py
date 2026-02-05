"""Ad serving routes - the core DCO endpoint."""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse

from app.services.supabase import get_supabase_admin
from app.services.decisioning import select_variant
from app.services.signals import get_geo_signals, get_weather_signals, get_daypart_signals

router = APIRouter()


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


def render_ad_html(variant: dict, campaign: dict) -> str:
    """Render ad creative as HTML."""
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .ad-container {{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 250px;
        }}
        .ad-image {{ max-width: 100%; height: auto; margin-bottom: 15px; border-radius: 8px; }}
        .ad-headline {{ font-size: 24px; font-weight: bold; margin-bottom: 10px; }}
        .ad-body {{ font-size: 16px; margin-bottom: 15px; opacity: 0.9; }}
        .ad-cta {{
            display: inline-block;
            padding: 12px 24px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            transition: transform 0.2s;
        }}
        .ad-cta:hover {{ transform: scale(1.05); }}
    </style>
</head>
<body>
    <div class="ad-container">
        {f'<img class="ad-image" src="{variant.get("image_url")}" alt="">' if variant.get("image_url") else ''}
        <h1 class="ad-headline">{variant.get("headline", "")}</h1>
        <p class="ad-body">{variant.get("body_text", "")}</p>
        <a class="ad-cta" href="{variant.get("cta_url", "#")}" target="_blank">{variant.get("cta_text", "Learn More")}</a>
    </div>
    <script>
        // Track impression
        console.log('SOUTS DCO - Impression', {{
            campaign: '{campaign.get("id")}',
            variant: '{variant.get("id")}',
        }});
    </script>
</body>
</html>"""


@router.get("/{campaign_id}")
async def serve_ad(campaign_id: str, request: Request, format: str = "html"):
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
    
    # Collect signals
    signals = await collect_signals(request)
    
    # Select variant based on rules
    variant = await select_variant(campaign_id, signals)
    
    if not variant:
        raise HTTPException(status_code=404, detail="No matching variant found")
    
    # Return based on format
    if format == "json":
        return JSONResponse({
            "campaign": campaign,
            "variant": variant,
            "signals": signals,
        })
    
    # Default: HTML
    html = render_ad_html(variant, campaign)
    return HTMLResponse(html)


@router.get("/{campaign_id}/preview")
async def preview_variant(campaign_id: str, variant_id: str):
    """Preview a specific variant (for admin UI)."""
    supabase = get_supabase_admin()
    
    campaign_result = supabase.table("campaigns").select("*").eq("id", campaign_id).single().execute()
    if not campaign_result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    variant_result = supabase.table("variants").select("*").eq("id", variant_id).eq("campaign_id", campaign_id).single().execute()
    if not variant_result.data:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    html = render_ad_html(variant_result.data, campaign_result.data)
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
