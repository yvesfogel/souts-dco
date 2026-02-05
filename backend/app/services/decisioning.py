"""
Rules-based decisioning engine for DCO.
Evaluates campaign rules against collected signals to select creative variants.
"""
from typing import Any
import operator

from app.services.supabase import get_supabase_admin


# Operators for rule evaluation
OPERATORS = {
    "eq": operator.eq,
    "ne": operator.ne,
    "gt": operator.gt,
    "gte": operator.ge,
    "lt": operator.lt,
    "lte": operator.le,
    "in": lambda a, b: a in b,
    "not_in": lambda a, b: a not in b,
    "contains": lambda a, b: b in a if isinstance(a, str) else False,
}


def evaluate_condition(condition: dict, signals: dict) -> bool:
    """Evaluate a single condition against signals."""
    field = condition.get("field")
    op = condition.get("operator", "eq")
    value = condition.get("value")
    
    signal_value = signals.get(field)
    if signal_value is None:
        return False
    
    op_func = OPERATORS.get(op)
    if not op_func:
        return False
    
    try:
        return op_func(signal_value, value)
    except (TypeError, ValueError):
        return False


def evaluate_rule(rule: dict, signals: dict) -> bool:
    """Evaluate a rule (with multiple conditions) against signals."""
    conditions = rule.get("conditions", [])
    logic = rule.get("logic", "and")  # "and" or "or"
    
    if not conditions:
        return True  # No conditions = always match (default)
    
    results = [evaluate_condition(c, signals) for c in conditions]
    
    if logic == "or":
        return any(results)
    return all(results)


async def select_variant(campaign_id: str, signals: dict) -> dict | None:
    """
    Select the best creative variant for a campaign based on signals.
    Returns the first matching variant or the default.
    """
    supabase = get_supabase_admin()
    
    # Get campaign rules ordered by priority
    result = supabase.table("rules").select(
        "*, variant:variants(*)"
    ).eq("campaign_id", campaign_id).eq("active", True).order("priority").execute()
    
    rules = result.data or []
    
    for rule in rules:
        if evaluate_rule(rule, signals):
            return rule.get("variant")
    
    # No rules matched - get default variant
    default = supabase.table("variants").select("*").eq(
        "campaign_id", campaign_id
    ).eq("is_default", True).limit(1).execute()
    
    if default.data:
        return default.data[0]
    
    return None
