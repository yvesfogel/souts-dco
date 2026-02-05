"""Weather signal provider using OpenWeatherMap."""
import httpx
from cachetools import TTLCache

from app.config import get_settings

settings = get_settings()

# Cache weather lookups by lat,lon
_weather_cache = TTLCache(maxsize=500, ttl=settings.weather_cache_ttl)


async def get_weather_signals(lat: float, lon: float) -> dict:
    """Get weather signals for coordinates."""
    cache_key = f"{lat:.2f},{lon:.2f}"
    
    if cache_key in _weather_cache:
        return _weather_cache[cache_key]
    
    if not settings.weather_api_key:
        return _default_weather()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.weather_api_url}/weather",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": settings.weather_api_key,
                    "units": "metric",
                },
                timeout=2.0
            )
            data = response.json()
            
            if response.status_code == 200:
                weather = data.get("weather", [{}])[0]
                main = data.get("main", {})
                
                result = {
                    "weather_condition": weather.get("main", "Clear").lower(),
                    "weather_description": weather.get("description", ""),
                    "weather_temp": main.get("temp", 20),
                    "weather_feels_like": main.get("feels_like", 20),
                    "weather_humidity": main.get("humidity", 50),
                    "weather_is_hot": main.get("temp", 20) >= 30,
                    "weather_is_cold": main.get("temp", 20) < 15,
                    "weather_is_rainy": weather.get("main", "").lower() in ("rain", "drizzle", "thunderstorm"),
                }
                _weather_cache[cache_key] = result
                return result
    except Exception:
        pass
    
    return _default_weather()


def _default_weather() -> dict:
    return {
        "weather_condition": "clear",
        "weather_description": "",
        "weather_temp": 20,
        "weather_feels_like": 20,
        "weather_humidity": 50,
        "weather_is_hot": False,
        "weather_is_cold": False,
        "weather_is_rainy": False,
    }
