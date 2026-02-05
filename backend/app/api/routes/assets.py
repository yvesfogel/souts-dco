"""Asset management routes using Supabase Storage."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from PIL import Image
import io
import uuid

from app.config import get_settings
from app.services.supabase import get_supabase_admin
from app.api.routes.auth import get_current_user

router = APIRouter()
settings = get_settings()

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png", 
    "image/gif": ".gif",
    "image/webp": ".webp",
}


@router.post("/upload")
async def upload_asset(
    campaign_id: str = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """Upload an asset to Supabase Storage."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Validate file type
    content_type = file.content_type
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {content_type} not allowed")
    
    # Read file
    content = await file.read()
    
    # Check size
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large (max {settings.max_file_size_mb}MB)")
    
    # Generate unique filename
    ext = ALLOWED_TYPES[content_type]
    filename = f"{campaign_id}/{uuid.uuid4()}{ext}"
    
    # Upload to Supabase Storage
    try:
        result = supabase.storage.from_(settings.storage_bucket).upload(
            filename,
            content,
            {"content-type": content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(settings.storage_bucket).get_public_url(filename)
        
        # Save asset record
        asset_data = {
            "campaign_id": campaign_id,
            "name": name,
            "filename": filename,
            "url": public_url,
            "content_type": content_type,
            "size_bytes": len(content),
        }
        
        asset_result = supabase.table("assets").insert(asset_data).execute()
        
        return asset_result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{campaign_id}")
async def list_assets(campaign_id: str, user=Depends(get_current_user)):
    """List all assets for a campaign."""
    supabase = get_supabase_admin()
    
    # Verify campaign ownership
    existing = supabase.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user.id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    result = supabase.table("assets").select("*").eq("campaign_id", campaign_id).execute()
    return result.data


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, user=Depends(get_current_user)):
    """Delete an asset."""
    supabase = get_supabase_admin()
    
    # Get asset and verify ownership through campaign
    asset = supabase.table("assets").select("*, campaign:campaigns(user_id)").eq("id", asset_id).single().execute()
    
    if not asset.data:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset.data.get("campaign", {}).get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete from storage
    try:
        supabase.storage.from_(settings.storage_bucket).remove([asset.data["filename"]])
    except Exception:
        pass  # Continue even if storage delete fails
    
    # Delete record
    supabase.table("assets").delete().eq("id", asset_id).execute()
    
    return {"message": "Asset deleted"}
