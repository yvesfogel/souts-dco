from supabase import create_client, Client
from functools import lru_cache

from app.config import get_settings

settings = get_settings()


@lru_cache()
def get_supabase_client() -> Client:
    """Get Supabase client with anon key (for user-authenticated requests)"""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache()
def get_supabase_admin() -> Client:
    """Get Supabase client with service key (for admin operations)"""
    return create_client(settings.supabase_url, settings.supabase_service_key)
