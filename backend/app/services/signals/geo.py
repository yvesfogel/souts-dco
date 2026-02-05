"""Geo signal provider using IP geolocation."""
import httpx
from cachetools import TTLCache

from app.config import get_settings

settings = get_settings()

# Cache geo lookups
_geo_cache = TTLCache(maxsize=1000, ttl=settings.geo_cache_ttl)


async def get_geo_signals(ip: str) -> dict:
    """Get geo signals from IP address."""
    if ip in _geo_cache:
        return _geo_cache[ip]
    
    # Skip local IPs
    if ip in ("127.0.0.1", "localhost", "::1") or ip.startswith("192.168."):
        return {
            "geo_country": "unknown",
            "geo_city": "unknown",
            "geo_region": "unknown",
            "geo_lat": 0,
            "geo_lon": 0,
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.geo_api_url}/{ip}",
                timeout=2.0
            )
            data = response.json()
            
            if data.get("status") == "success":
                result = {
                    "geo_country": data.get("country", "unknown"),
                    "geo_country_code": data.get("countryCode", ""),
                    "geo_city": data.get("city", "unknown"),
                    "geo_region": data.get("regionName", "unknown"),
                    "geo_lat": data.get("lat", 0),
                    "geo_lon": data.get("lon", 0),
                    "geo_timezone": data.get("timezone", "UTC"),
                }
                _geo_cache[ip] = result
                return result
    except Exception:
        pass
    
    return {
        "geo_country": "unknown",
        "geo_city": "unknown",
        "geo_region": "unknown",
        "geo_lat": 0,
        "geo_lon": 0,
    }
