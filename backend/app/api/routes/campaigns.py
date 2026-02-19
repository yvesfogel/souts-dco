from __future__ import annotations
import uuid
from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import (
    CampaignCreate, CampaignUpdate,
    VariantCreate, VariantUpdate,
    RuleCreate, RuleUpdate,
)
from app.services.supabase import get_supabase
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


@router.get("/")
async def list_campaigns(user: dict = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("campaigns").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    return result.data


@router.post("/")
async def create_campaign(body: CampaignCreate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    data = body.model_dump(exclude_none=True)
    data["user_id"] = user["id"]
    result = sb.table("campaigns").insert(data).execute()
    return result.data[0] if result.data else result.data


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    camp = sb.table("campaigns").select("*").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    variants = sb.table("variants").select("*").eq("campaign_id", campaign_id).order("created_at").execute()
    rules = sb.table("rules").select("*").eq("campaign_id", campaign_id).order("priority", desc=True).execute()
    return {**camp.data, "variants": variants.data, "rules": rules.data}


@router.patch("/{campaign_id}")
async def update_campaign(campaign_id: str, body: CampaignUpdate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = sb.table("campaigns").update(data).eq("id", campaign_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return result.data[0]


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("campaigns").delete().eq("id", campaign_id).eq("user_id", user["id"]).execute()
    return {"message": "Deleted"}


@router.post("/{campaign_id}/duplicate")
async def duplicate_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    camp = sb.table("campaigns").select("*").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Clone campaign
    new_camp = {k: v for k, v in camp.data.items() if k not in ("id", "created_at", "updated_at")}
    new_camp["name"] = f"{new_camp.get('name', '')} (Copy)"
    new_camp_result = sb.table("campaigns").insert(new_camp).execute()
    new_campaign_id = new_camp_result.data[0]["id"]

    # Clone variants
    variants = sb.table("variants").select("*").eq("campaign_id", campaign_id).execute()
    variant_id_map = {}
    for v in variants.data or []:
        old_id = v["id"]
        new_v = {k: val for k, val in v.items() if k not in ("id", "created_at", "updated_at")}
        new_v["campaign_id"] = new_campaign_id
        vr = sb.table("variants").insert(new_v).execute()
        variant_id_map[old_id] = vr.data[0]["id"]

    # Clone rules
    rules = sb.table("rules").select("*").eq("campaign_id", campaign_id).execute()
    for r in rules.data or []:
        new_r = {k: val for k, val in r.items() if k not in ("id", "created_at", "updated_at")}
        new_r["campaign_id"] = new_campaign_id
        if new_r.get("variant_id") in variant_id_map:
            new_r["variant_id"] = variant_id_map[new_r["variant_id"]]
        sb.table("rules").insert(new_r).execute()

    return new_camp_result.data[0]


# --- Variants ---
@router.post("/{campaign_id}/variants")
async def create_variant(campaign_id: str, body: VariantCreate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    # Verify ownership
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    data = body.model_dump(exclude_none=True)
    data["campaign_id"] = campaign_id
    result = sb.table("variants").insert(data).execute()
    return result.data[0] if result.data else result.data


@router.patch("/{campaign_id}/variants/{variant_id}")
async def update_variant(campaign_id: str, variant_id: str, body: VariantUpdate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = sb.table("variants").update(data).eq("id", variant_id).eq("campaign_id", campaign_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Variant not found")
    return result.data[0]


@router.delete("/{campaign_id}/variants/{variant_id}")
async def delete_variant(campaign_id: str, variant_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    sb.table("variants").delete().eq("id", variant_id).eq("campaign_id", campaign_id).execute()
    return {"message": "Deleted"}


# --- Rules ---
@router.post("/{campaign_id}/rules")
async def create_rule(campaign_id: str, body: RuleCreate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    data = body.model_dump(exclude_none=True)
    data["campaign_id"] = campaign_id
    result = sb.table("rules").insert(data).execute()
    return result.data[0] if result.data else result.data


@router.patch("/{campaign_id}/rules/{rule_id}")
async def update_rule(campaign_id: str, rule_id: str, body: RuleUpdate, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = sb.table("rules").update(data).eq("id", rule_id).eq("campaign_id", campaign_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Rule not found")
    return result.data[0]


@router.delete("/{campaign_id}/rules/{rule_id}")
async def delete_rule(campaign_id: str, rule_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    sb.table("rules").delete().eq("id", rule_id).eq("campaign_id", campaign_id).execute()
    return {"message": "Deleted"}
