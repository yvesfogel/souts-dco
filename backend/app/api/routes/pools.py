from __future__ import annotations
import itertools
from fastapi import APIRouter, HTTPException, Depends

from app.models.schemas import PoolUpsert
from app.services.supabase import get_supabase
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/pools", tags=["pools"])

POOL_TYPES = ["headline", "body", "cta_text", "cta_url", "image"]


def _verify_campaign(sb, campaign_id: str, user_id: str):
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user_id).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")


@router.get("/{campaign_id}")
async def list_pools(campaign_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    _verify_campaign(sb, campaign_id, user["id"])
    result = sb.table("component_pools").select("*").eq("campaign_id", campaign_id).execute()
    pools = result.data or []

    # Calculate total combinations
    counts = [len(p.get("values", [])) for p in pools if p.get("values")]
    total = 1
    for c in counts:
        total *= c
    if not counts:
        total = 0

    return {"pools": pools, "total_combinations": total}


@router.put("/{campaign_id}/{pool_type}")
async def upsert_pool(campaign_id: str, pool_type: str, body: PoolUpsert, user: dict = Depends(get_current_user)):
    if pool_type not in POOL_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid pool type. Allowed: {', '.join(POOL_TYPES)}")

    sb = get_supabase()
    _verify_campaign(sb, campaign_id, user["id"])

    existing = sb.table("component_pools").select("id").eq("campaign_id", campaign_id).eq("component", pool_type).maybe_single().execute()

    if existing.data:
        result = sb.table("component_pools").update({"values": body.values}).eq("id", existing.data["id"]).execute()
    else:
        result = sb.table("component_pools").insert({
            "campaign_id": campaign_id,
            "component": pool_type,
            "values": body.values,
        }).execute()

    return result.data[0] if result.data else {"status": "ok"}


@router.delete("/{campaign_id}/{pool_type}")
async def delete_pool(campaign_id: str, pool_type: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    _verify_campaign(sb, campaign_id, user["id"])
    sb.table("component_pools").delete().eq("campaign_id", campaign_id).eq("component", pool_type).execute()
    return {"message": "Deleted"}


@router.post("/{campaign_id}/generate")
async def generate_variants(campaign_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    _verify_campaign(sb, campaign_id, user["id"])

    pools_result = sb.table("component_pools").select("*").eq("campaign_id", campaign_id).execute()
    pools = {p["component"]: p.get("values", []) for p in (pools_result.data or [])}

    if not pools:
        raise HTTPException(status_code=400, detail="No pools defined")

    # Build combinations
    pool_keys = sorted(pools.keys())
    pool_values = [pools[k] for k in pool_keys]
    combos = list(itertools.product(*pool_values))

    field_map = {"headline": "headline", "body": "body_text", "cta_text": "cta_text", "cta_url": "cta_url", "image": "image_url"}

    created = []
    for i, combo in enumerate(combos):
        variant_data = {"campaign_id": campaign_id, "name": f"Generated #{i+1}", "auto_generated": True, "weight": 1.0}
        for key, val in zip(pool_keys, combo):
            field = field_map.get(key, key)
            variant_data[field] = val
        result = sb.table("variants").insert(variant_data).execute()
        if result.data:
            created.append(result.data[0])

    return {"generated": len(created), "variants": created}


@router.get("/{campaign_id}/preview")
async def preview_combinations(campaign_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    _verify_campaign(sb, campaign_id, user["id"])

    pools_result = sb.table("component_pools").select("*").eq("campaign_id", campaign_id).execute()
    pools = {p["component"]: p.get("values", []) for p in (pools_result.data or [])}

    pool_keys = sorted(pools.keys())
    pool_values = [pools[k] for k in pool_keys]
    combos = list(itertools.product(*pool_values))

    field_map = {"headline": "headline", "body": "body_text", "cta_text": "cta_text", "cta_url": "cta_url", "image": "image_url"}

    preview = []
    for combo in combos[:50]:  # Limit preview to 50
        item = {}
        for key, val in zip(pool_keys, combo):
            field = field_map.get(key, key)
            item[field] = val
        preview.append(item)

    return {"total_combinations": len(combos), "preview": preview, "showing": len(preview)}
