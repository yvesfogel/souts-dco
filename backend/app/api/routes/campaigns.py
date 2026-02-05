"""Campaign management routes."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from app.models.schemas import CampaignCreate, CampaignUpdate, VariantCreate, VariantUpdate, RuleCreate, RuleUpdate
from app.services.supabase import get_supabase_admin
from app.api.routes.auth import get_current_user

router = APIRouter()


# ============ CAMPAIGNS ============

@router.get("")
async def list_campaigns(user=Depends(get_current_user)):
    """List all campaigns for current user."""
    supabase = get_supabase_admin()
    result = supabase.table("campaigns").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    return result.data


@router.post("")
async def create_campaign(campaign: CampaignCreate, user=Depends(get_current_user)):
    """Create a new campaign."""
    supabase = get_supabase_admin()
    
    data = {
        "user_id": user.id,
        "name": campaign.name,
        "description": campaign.description,
        "template": campaign.template,
        "settings": campaign.settings or {},
        "active": True,
    }
    
    result = supabase.table("campaigns").insert(data).execute()
    return result.data[0]


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, user=Depends(get_current_user)):
    """Get campaign details with variants and rules."""
    supabase = get_supabase_admin()
    
    # Get campaign
    result = supabase.table("campaigns").select("*").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = result.data
    
    # Get variants
    variants = supabase.table("variants").select("*").eq("campaign_id", campaign_id).execute()
    campaign["variants"] = variants.data
    
    # Get rules
    rules = supabase.table("rules").select("*").eq("campaign_id", campaign_id).order("priority").execute()
    campaign["rules"] = rules.data
    
    return campaign


@router.patch("/{campaign_id}")
async def update_campaign(campaign_id: str, campaign: CampaignUpdate, user=Depends(get_current_user)):
    """Update a campaign."""
    supabase = get_supabase_admin()
    
    # Verify ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    data = campaign.model_dump(exclude_unset=True)
    result = supabase.table("campaigns").update(data).eq("id", campaign_id).execute()
    return result.data[0]


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, user=Depends(get_current_user)):
    """Delete a campaign."""
    supabase = get_supabase_admin()
    
    # Verify ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    supabase.table("campaigns").delete().eq("id", campaign_id).execute()
    return {"message": "Campaign deleted"}


@router.post("/{campaign_id}/duplicate")
async def duplicate_campaign(campaign_id: str, user=Depends(get_current_user)):
    """Duplicate a campaign with all variants and rules."""
    supabase = get_supabase_admin()
    
    # Get original campaign
    original = supabase.table("campaigns").select("*").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not original.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Create new campaign
    new_campaign_data = {
        "user_id": user.id,
        "name": f"{original.data['name']} (Copy)",
        "description": original.data.get("description"),
        "template": original.data.get("template", "default"),
        "settings": original.data.get("settings", {}),
        "ab_test_mode": original.data.get("ab_test_mode", "rules"),
        "active": False,  # Start as inactive
    }
    
    new_campaign = supabase.table("campaigns").insert(new_campaign_data).execute()
    new_campaign_id = new_campaign.data[0]["id"]
    
    # Get and duplicate variants
    variants = supabase.table("variants").select("*").eq("campaign_id", campaign_id).execute()
    variant_id_map = {}  # old_id -> new_id
    
    for v in variants.data:
        new_variant_data = {
            "campaign_id": new_campaign_id,
            "name": v["name"],
            "headline": v["headline"],
            "body_text": v.get("body_text"),
            "cta_text": v.get("cta_text", "Learn More"),
            "cta_url": v.get("cta_url", ""),
            "image_url": v.get("image_url"),
            "is_default": v.get("is_default", False),
            "weight": v.get("weight", 100),
            "settings": v.get("settings", {}),
        }
        new_variant = supabase.table("variants").insert(new_variant_data).execute()
        variant_id_map[v["id"]] = new_variant.data[0]["id"]
    
    # Get and duplicate rules
    rules = supabase.table("rules").select("*").eq("campaign_id", campaign_id).execute()
    
    for r in rules.data:
        old_variant_id = r["variant_id"]
        new_variant_id = variant_id_map.get(old_variant_id)
        
        if new_variant_id:
            new_rule_data = {
                "campaign_id": new_campaign_id,
                "variant_id": new_variant_id,
                "name": r["name"],
                "conditions": r.get("conditions", []),
                "logic": r.get("logic", "and"),
                "priority": r.get("priority", 0),
                "active": r.get("active", True),
            }
            supabase.table("rules").insert(new_rule_data).execute()
    
    return {
        "message": "Campaign duplicated",
        "new_campaign_id": new_campaign_id,
        "variants_copied": len(variants.data),
        "rules_copied": len(rules.data),
    }


# ============ VARIANTS ============

@router.post("/{campaign_id}/variants")
async def create_variant(campaign_id: str, variant: VariantCreate, user=Depends(get_current_user)):
    """Create a variant for a campaign."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    data = variant.model_dump()
    data["campaign_id"] = campaign_id
    
    result = supabase.table("variants").insert(data).execute()
    return result.data[0]


@router.patch("/{campaign_id}/variants/{variant_id}")
async def update_variant(campaign_id: str, variant_id: str, variant: VariantUpdate, user=Depends(get_current_user)):
    """Update a variant."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    data = variant.model_dump(exclude_unset=True)
    result = supabase.table("variants").update(data).eq("id", variant_id).eq("campaign_id", campaign_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    return result.data[0]


@router.delete("/{campaign_id}/variants/{variant_id}")
async def delete_variant(campaign_id: str, variant_id: str, user=Depends(get_current_user)):
    """Delete a variant."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    supabase.table("variants").delete().eq("id", variant_id).eq("campaign_id", campaign_id).execute()
    return {"message": "Variant deleted"}


# ============ RULES ============

@router.post("/{campaign_id}/rules")
async def create_rule(campaign_id: str, rule: RuleCreate, user=Depends(get_current_user)):
    """Create a rule for a campaign."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    data = {
        "campaign_id": campaign_id,
        "name": rule.name,
        "variant_id": rule.variant_id,
        "conditions": [c.model_dump() for c in rule.conditions],
        "logic": rule.logic,
        "priority": rule.priority,
        "active": rule.active,
    }
    
    result = supabase.table("rules").insert(data).execute()
    return result.data[0]


@router.patch("/{campaign_id}/rules/{rule_id}")
async def update_rule(campaign_id: str, rule_id: str, rule: RuleUpdate, user=Depends(get_current_user)):
    """Update a rule."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    data = rule.model_dump(exclude_unset=True)
    if "conditions" in data and data["conditions"]:
        data["conditions"] = [c.model_dump() if hasattr(c, "model_dump") else c for c in data["conditions"]]
    
    result = supabase.table("rules").update(data).eq("id", rule_id).eq("campaign_id", campaign_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return result.data[0]


@router.delete("/{campaign_id}/rules/{rule_id}")
async def delete_rule(campaign_id: str, rule_id: str, user=Depends(get_current_user)):
    """Delete a rule."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    supabase.table("rules").delete().eq("id", rule_id).eq("campaign_id", campaign_id).execute()
    return {"message": "Rule deleted"}
