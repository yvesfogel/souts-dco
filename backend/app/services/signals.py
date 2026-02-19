from __future__ import annotations

import time
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import Request

# In-memory caches
_geo_cache: dict[str, tuple[dict, float]] = {}
_weather_cache: dict[str, tuple[dict, float]] = {}

GEO_TTL = 600  # 10 min
WEATHER_TTL = 300  # 5 min

# Circuit breaker state
_cb_state: dict[str, dict] = {
    "geo": {"failures": 0, "open_until": 0.0},
    "weather": {"failures": 0, "open_until": 0.0},
}
CB_THRESHOLD = 3
CB_COOLDOWN = 30  # seconds


def _cb_is_open(service: str) -> bool:
    s = _cb_state[service]
    if s["failures"] >= CB_THRESHOLD:
        if time.time() < s["open_until"]:
            return True
        # Reset after cooldown
        s["failures"] = 0
    return False


def _cb_record_failure(service: str):
    s = _cb_state[service]
    s["failures"] += 1
    if s["failures"] >= CB_THRESHOLD:
        s["open_until"] = time.time() + CB_COOLDOWN


def _cb_record_success(service: str):
    _cb_state[service]["failures"] = 0


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


async def _fetch_geo(ip: str) -> Optional[dict]:
    if _cb_is_open("geo"):
        return None

    now = time.time()
    if ip in _geo_cache:
        cached, ts = _geo_cache[ip]
        if now - ts < GEO_TTL:
            return cached

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"http://ip-api.com/json/{ip}")
            data = resp.json()
        if data.get("status") != "success":
            return None
        result = {
            "geo_country": data.get("country", ""),
            "geo_region": data.get("regionName", ""),
            "geo_city": data.get("city", ""),
            "geo_lat": data.get("lat"),
            "geo_lon": data.get("lon"),
            "geo_timezone": data.get("timezone", ""),
        }
        _geo_cache[ip] = (result, now)
        _cb_record_success("geo")
        return result
    except Exception:
        _cb_record_failure("geo")
        return None


async def _fetch_weather(lat: float, lon: float) -> Optional[dict]:
    if _cb_is_open("weather"):
        return None

    cache_key = f"{lat:.2f},{lon:.2f}"
    now = time.time()
    if cache_key in _weather_cache:
        cached, ts = _weather_cache[cache_key]
        if now - ts < WEATHER_TTL:
            return cached

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current_weather": "true",
                },
            )
            data = resp.json()
        cw = data.get("current_weather", {})
        temp = cw.get("temperature", 0)
        wmo = cw.get("weathercode", 0)

        # Map WMO codes to simple conditions
        if wmo == 0:
            condition = "clear"
        elif wmo <= 3:
            condition = "cloudy"
        elif wmo <= 49:
            condition = "foggy"
        elif wmo <= 69:
            condition = "rainy"
        elif wmo <= 79:
            condition = "snowy"
        elif wmo <= 99:
            condition = "stormy"
        else:
            condition = "unknown"

        result = {
            "weather_temp": temp,
            "weather_condition": condition,
            "weather_code": wmo,
            "weather_is_hot": temp >= 30,
            "weather_is_cold": temp <= 5,
        }
        _weather_cache[cache_key] = (result, now)
        _cb_record_success("weather")
        return result
    except Exception:
        _cb_record_failure("weather")
        return None


def _compute_daypart(tz_name: str = "") -> dict:
    now = datetime.now(timezone.utc)
    hour = now.hour

    if tz_name:
        try:
            # Simple offset parsing not needed - use UTC for simplicity
            pass
        except Exception:
            pass

    if 5 <= hour < 12:
        daypart = "morning"
    elif 12 <= hour < 17:
        daypart = "afternoon"
    elif 17 <= hour < 21:
        daypart = "evening"
    else:
        daypart = "night"

    return {
        "daypart": daypart,
        "daypart_hour": hour,
        "daypart_is_weekend": now.weekday() >= 5,
    }


async def collect_signals(request: Request) -> dict:
    """Collect all available signals from the request context."""
    signals: dict = {}

    ip = _get_client_ip(request)
    signals["ip"] = ip
    signals["user_agent"] = request.headers.get("user-agent", "")
    signals["referer"] = request.headers.get("referer", "")

    # Geo
    geo = await _fetch_geo(ip)
    if geo:
        signals.update(geo)

    # Weather (requires geo lat/lon)
    if geo and geo.get("geo_lat") and geo.get("geo_lon"):
        weather = await _fetch_weather(geo["geo_lat"], geo["geo_lon"])
        if weather:
            signals.update(weather)

    # Daypart
    tz = signals.get("geo_timezone", "")
    signals.update(_compute_daypart(tz))

    return signals
