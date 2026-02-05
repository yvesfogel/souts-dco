from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "SOUTS DCO"
    debug: bool = False
    
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    
    # Weather API (OpenWeatherMap)
    weather_api_key: str = ""
    weather_api_url: str = "https://api.openweathermap.org/data/2.5"
    
    # Geo API
    geo_api_url: str = "http://ip-api.com/json"
    
    # Storage
    storage_bucket: str = "assets"
    max_file_size_mb: int = 10
    
    # Cache TTLs (seconds)
    weather_cache_ttl: int = 300  # 5 minutes
    geo_cache_ttl: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
