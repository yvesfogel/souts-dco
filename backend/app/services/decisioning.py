"""
Rules-based decisioning engine for DCO.
Evaluates campaign rules against collected signals to select creative variants.
Supports A/B testing with weighted traffic splitting.
"""
from typing import Any
import operator
import random

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


def weighted_random_choice(variants: list) -> dict | None:
    """Select a variant based on weights."""
    if not variants:
        return None
    
    # Filter variants with weight > 0
    weighted = [v for v in variants if v.get("weight", 100) > 0]
    if not weighted:
        return variants[0]  # Fallback to first
    
    total_weight = sum(v.get("weight", 100) for v in weighted)
    if total_weight == 0:
        return weighted[0]
    
    r = random.uniform(0, total_weight)
    cumulative = 0
    for variant in weighted:
        cumulative += variant.get("weight", 100)
        if r <= cumulative:
            return variant
    
    return weighted[-1]


async def select_variant(campaign_id: str, signals: dict) -> dict | None:
    """
    Select the best creative variant for a campaign based on signals and A/B testing.
    
    Modes:
    - 'rules': Use rules first, then weighted selection for fallback
    - 'weights': Pure A/B testing, ignore rules
    - 'off': Only use default variant
    """
    supabase = get_supabase_admin()
    
    # Get campaign settings
    campaign = supabase.table("campaigns").select("ab_test_mode").eq(
        "id", campaign_id
    ).single().execute()
    
    ab_mode = campaign.data.get("ab_test_mode", "rules") if campaign.data else "rules"
    
    # Get all variants
    variants_result = supabase.table("variants").select("*").eq(
        "campaign_id", campaign_id
    ).execute()
    
    variants = variants_result.data or []
    if not variants:
        return None
    
    # Mode: off - just return default
    if ab_mode == "off":
        default = next((v for v in variants if v.get("is_default")), variants[0])
        return default
    
    # Mode: weights - pure A/B, ignore rules
    if ab_mode == "weights":
        return weighted_random_choice(variants)
    
    # Mode: rules (default) - try rules first, then weighted fallback
    rules_result = supabase.table("rules").select(
        "*, variant:variants(*)"
    ).eq("campaign_id", campaign_id).eq("active", True).order("priority").execute()
    
    rules = rules_result.data or []
    
    for rule in rules:
        if evaluate_rule(rule, signals):
            return rule.get("variant")
    
    # No rules matched - use weighted selection or default
    default_variants = [v for v in variants if v.get("is_default")]
    if default_variants:
        # If there's a default, use it (traditional behavior)
        return default_variants[0]
    
    # No default set - use weighted random among all variants
    return weighted_random_choice(variants)
