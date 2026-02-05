"""Component Pools API for DCO auto-generation."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from itertools import product

from app.services.supabase import get_supabase_admin
from app.api.routes.auth import get_current_user

router = APIRouter()


class PoolCreate(BaseModel):
    type: str  # headline, body, cta_text, cta_url, image
    items: list[str]


class PoolUpdate(BaseModel):
    items: Optional[list[str]] = None


class GenerateRequest(BaseModel):
    max_variants: int = 100  # Safety limit
    name_template: str = "Variant {n}"  # Template for naming


POOL_TYPES = ["headline", "body", "cta_text", "cta_url", "image"]


@router.get("/{campaign_id}")
async def get_pools(campaign_id: str, user=Depends(get_current_user)):
    """Get all component pools for a campaign."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    campaign = supabase.table("campaigns").select("id").eq(
        "id", campaign_id
    ).eq("user_id", user.id).single().execute()
    
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get pools
    pools = supabase.table("component_pools").select("*").eq(
        "campaign_id", campaign_id
    ).execute()
    
    # Organize by type
    result = {t: [] for t in POOL_TYPES}
    for pool in pools.data:
        if pool["type"] in result:
            result[pool["type"]] = pool["items"]
    
    # Calculate potential combinations
    non_empty = [len(result[t]) for t in POOL_TYPES if result[t]]
    total_combinations = 1
    for count in non_empty:
        total_combinations *= count
    
    return {
        "pools": result,
        "total_combinations": total_combinations if non_empty else 0,
        "pool_types": POOL_TYPES,
    }


@router.put("/{campaign_id}/{pool_type}")
async def update_pool(
    campaign_id: str, 
    pool_type: str, 
    pool: PoolCreate,
    user=Depends(get_current_user)
):
    """Update a component pool (create if doesn't exist)."""
    supabase = get_supabase_admin()
    
    if pool_type not in POOL_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid pool type. Must be one of: {POOL_TYPES}")
    
    # Verify campaign ownership
    campaign = supabase.table("campaigns").select("id").eq(
        "id", campaign_id
    ).eq("user_id", user.id).single().execute()
    
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Check if pool exists
    existing = supabase.table("component_pools").select("id").eq(
        "campaign_id", campaign_id
    ).eq("type", pool_type).single().execute()
    
    if existing.data:
        # Update
        result = supabase.table("component_pools").update({
            "items": pool.items
        }).eq("id", existing.data["id"]).execute()
    else:
        # Create
        result = supabase.table("component_pools").insert({
            "campaign_id": campaign_id,
            "type": pool_type,
            "items": pool.items,
        }).execute()
    
    return result.data[0]


@router.delete("/{campaign_id}/{pool_type}")
async def delete_pool(campaign_id: str, pool_type: str, user=Depends(get_current_user)):
    """Delete a component pool."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    campaign = supabase.table("campaigns").select("id").eq(
        "id", campaign_id
    ).eq("user_id", user.id).single().execute()
    
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    supabase.table("component_pools").delete().eq(
        "campaign_id", campaign_id
    ).eq("type", pool_type).execute()
    
    return {"message": "Pool deleted"}


@router.post("/{campaign_id}/generate")
async def generate_variants(
    campaign_id: str,
    request: GenerateRequest,
    user=Depends(get_current_user)
):
    """Generate all variant combinations from pools."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    campaign = supabase.table("campaigns").select("id").eq(
        "id", campaign_id
    ).eq("user_id", user.id).single().execute()
    
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get pools
    pools_result = supabase.table("component_pools").select("*").eq(
        "campaign_id", campaign_id
    ).execute()
    
    pools = {p["type"]: p["items"] for p in pools_result.data}
    
    # Need at least headline to generate
    if not pools.get("headline"):
        raise HTTPException(status_code=400, detail="At least headline pool is required")
    
    # Prepare pool values with defaults
    headlines = pools.get("headline", ["Default Headline"])
    bodies = pools.get("body", [""])
    cta_texts = pools.get("cta_text", ["Learn More"])
    cta_urls = pools.get("cta_url", ["#"])
    images = pools.get("image", [""])
    
    # Generate all combinations
    combinations = list(product(headlines, bodies, cta_texts, cta_urls, images))
    
    # Limit to max_variants
    if len(combinations) > request.max_variants:
        combinations = combinations[:request.max_variants]
    
    # Delete existing auto-generated variants
    supabase.table("variants").delete().eq(
        "campaign_id", campaign_id
    ).eq("auto_generated", True).execute()
    
    # Create new variants
    created = []
    for i, (headline, body, cta_text, cta_url, image) in enumerate(combinations):
        variant_data = {
            "campaign_id": campaign_id,
            "name": request.name_template.format(n=i+1),
            "headline": headline,
            "body_text": body if body else None,
            "cta_text": cta_text,
            "cta_url": cta_url,
            "image_url": image if image else None,
            "is_default": i == 0,  # First one is default
            "auto_generated": True,
            "component_combination": {
                "headline": headline,
                "body": body,
                "cta_text": cta_text,
                "cta_url": cta_url,
                "image": image,
            },
        }
        
        result = supabase.table("variants").insert(variant_data).execute()
        created.append(result.data[0])
    
    return {
        "message": f"Generated {len(created)} variants",
        "total_possible": len(list(product(headlines, bodies, cta_texts, cta_urls, images))),
        "generated": len(created),
        "limited": len(combinations) < len(list(product(headlines, bodies, cta_texts, cta_urls, images))),
        "variants": created,
    }


@router.get("/{campaign_id}/preview")
async def preview_combinations(campaign_id: str, user=Depends(get_current_user)):
    """Preview what combinations would be generated without creating them."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    campaign = supabase.table("campaigns").select("id").eq(
        "id", campaign_id
    ).eq("user_id", user.id).single().execute()
    
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get pools
    pools_result = supabase.table("component_pools").select("*").eq(
        "campaign_id", campaign_id
    ).execute()
    
    pools = {p["type"]: p["items"] for p in pools_result.data}
    
    headlines = pools.get("headline", [])
    bodies = pools.get("body", [])
    cta_texts = pools.get("cta_text", [])
    cta_urls = pools.get("cta_url", [])
    images = pools.get("image", [])
    
    # Calculate totals
    counts = {
        "headlines": len(headlines),
        "bodies": len(bodies) or 1,
        "cta_texts": len(cta_texts) or 1,
        "cta_urls": len(cta_urls) or 1,
        "images": len(images) or 1,
    }
    
    total = 1
    for c in counts.values():
        total *= c
    
    # Sample combinations (first 5)
    sample = []
    all_combos = list(product(
        headlines or [""],
        bodies or [""],
        cta_texts or ["Learn More"],
        cta_urls or ["#"],
        images or [""]
    ))[:5]
    
    for headline, body, cta_text, cta_url, image in all_combos:
        sample.append({
            "headline": headline,
            "body": body,
            "cta_text": cta_text,
            "cta_url": cta_url,
            "image": image,
        })
    
    return {
        "counts": counts,
        "total_combinations": total,
        "sample": sample,
    }
