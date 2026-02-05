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
