from __future__ import annotations
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from app.services.supabase import get_supabase
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/assets", tags=["assets"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


@router.post("/upload")
async def upload_asset(
    campaign_id: str = Form(...),
    name: str = Form(""),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    sb = get_supabase()

    # Verify campaign ownership
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_TYPES)}")

    file_ext = file.filename.split(".")[-1] if file.filename else "bin"
    storage_path = f"{campaign_id}/{uuid.uuid4().hex}.{file_ext}"
    content = await file.read()

    try:
        sb.storage.from_("assets").upload(storage_path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    public_url = sb.storage.from_("assets").get_public_url(storage_path)

    asset_name = name or file.filename or "Untitled"
    result = sb.table("assets").insert({
        "campaign_id": campaign_id,
        "name": asset_name,
        "url": public_url,
        "type": file.content_type,
        "folder": storage_path,
    }).execute()

    return result.data[0] if result.data else {"url": public_url}


@router.get("/{campaign_id}")
async def list_assets(campaign_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    camp = sb.table("campaigns").select("id").eq("id", campaign_id).eq("user_id", user["id"]).maybe_single().execute()
    if not camp.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    result = sb.table("assets").select("*").eq("campaign_id", campaign_id).order("created_at", desc=True).execute()
    return result.data


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    asset = sb.table("assets").select("*, campaigns!inner(user_id)").eq("id", asset_id).maybe_single().execute()
    if not asset.data:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Delete from storage
    folder = asset.data.get("folder")
    if folder:
        try:
            sb.storage.from_("assets").remove([folder])
        except Exception:
            pass

    sb.table("assets").delete().eq("id", asset_id).execute()
    return {"message": "Deleted"}
