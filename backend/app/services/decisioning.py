from __future__ import annotations

import random
from typing import Optional


def _evaluate_rule(rule: dict, signals: dict) -> bool:
    """Evaluate a single rule against collected signals."""
    signal_key = rule.get("signal", "")
    operator = rule.get("operator", "")
    rule_value = rule.get("value", "")
    actual = signals.get(signal_key)

    if actual is None:
        return False

    actual_str = str(actual).lower()
    rule_str = str(rule_value).lower()

    actual_num: float = 0.0
    rule_num: float = 0.0
    is_numeric = False
    try:
        actual_num = float(actual)
        rule_num = float(rule_value)
        is_numeric = True
    except (ValueError, TypeError):
        pass

    if operator in ("eq", "equals"):
        return actual_str == rule_str
    elif operator in ("ne", "not_equals"):
        return actual_str != rule_str
    elif operator == "contains":
        return rule_str in actual_str
    elif operator in ("gt", "greater_than") and is_numeric:
        return actual_num > rule_num
    elif operator in ("lt", "less_than") and is_numeric:
        return actual_num < rule_num
    elif operator in ("gte", "greater_equal") and is_numeric:
        return actual_num >= rule_num
    elif operator in ("lte", "less_equal") and is_numeric:
        return actual_num <= rule_num
    elif operator == "in":
        options = [v.strip().lower() for v in rule_str.split(",")]
        return actual_str in options

    return False


def _get_default_variant(variants: list[dict]) -> Optional[dict]:
    """Get variant marked as default, or first variant."""
    for v in variants:
        if v.get("is_default"):
            return v
    return variants[0] if variants else None


def _select_by_rules(variants: list[dict], rules: list[dict], signals: dict) -> Optional[dict]:
    """Evaluate rules by priority (highest first), return first matching variant."""
    sorted_rules = sorted(rules, key=lambda r: r.get("priority", 0), reverse=True)
    variant_map = {v["id"]: v for v in variants}

    for rule in sorted_rules:
        if _evaluate_rule(rule, signals):
            vid = rule.get("variant_id")
            if vid in variant_map:
                return variant_map[vid]
    return None


def _select_by_weight(variants: list[dict]) -> Optional[dict]:
    """Weighted random selection based on variant weights."""
    if not variants:
        return None
    weights = [v.get("weight", 1.0) for v in variants]
    total = sum(weights)
    if total <= 0:
        return variants[0]
    return random.choices(variants, weights=weights, k=1)[0]


def select_variant(campaign: dict, signals: dict) -> Optional[dict]:
    """Select a variant based on campaign mode, rules, and signals."""
    variants = campaign.get("variants", [])
    rules = campaign.get("rules", [])

    if not variants:
        return None

    mode = campaign.get("ab_test_mode", "off")

    if mode == "off":
        return _get_default_variant(variants)

    if mode == "rules":
        result = _select_by_rules(variants, rules, signals)
        return result or _get_default_variant(variants)

    if mode == "weighted":
        return _select_by_weight(variants)

    if mode == "rules_then_weighted":
        result = _select_by_rules(variants, rules, signals)
        if result:
            return result
        return _select_by_weight(variants)

    # Fallback
    return _get_default_variant(variants)
