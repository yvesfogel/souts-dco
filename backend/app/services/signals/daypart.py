"""Daypart signal provider based on local time."""
from datetime import datetime
import pytz


def get_daypart_signals(timezone: str = "UTC") -> dict:
    """Get daypart signals based on local time in timezone."""
    try:
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
    except Exception:
        now = datetime.utcnow()
    
    hour = now.hour
    
    # Determine daypart
    if 5 <= hour < 12:
        daypart = "morning"
    elif 12 <= hour < 17:
        daypart = "afternoon"
    elif 17 <= hour < 21:
        daypart = "evening"
    else:
        daypart = "night"
    
    # Day of week (0=Monday, 6=Sunday)
    dow = now.weekday()
    
    return {
        "daypart": daypart,
        "daypart_hour": hour,
        "daypart_dow": dow,
        "daypart_is_weekend": dow >= 5,
        "daypart_is_morning": daypart == "morning",
        "daypart_is_afternoon": daypart == "afternoon",
        "daypart_is_evening": daypart == "evening",
        "daypart_is_night": daypart == "night",
    }
