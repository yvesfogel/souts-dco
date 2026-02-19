# Bulk Asset Upload Spec

Spec for bulk asset upload feature in souts-dco.

**Status:** Roadmap (Next)  
**Effort:** ~12 hours  
**Priority:** Medium

---

## Overview

Allow users to upload multiple assets (images) at once, with:
- Drag-and-drop support
- Progress tracking per file
- Auto-tagging with AI (optional)
- Folder organization
- Batch operations (delete, move, rename)

---

## Current State

**Assets table (`public.assets`):**
```sql
id uuid PRIMARY KEY
campaign_id uuid REFERENCES campaigns
file_name text
file_path text  -- Supabase Storage path
mime_type text
file_size bigint
created_at timestamptz
```

**Current upload flow:**
1. User clicks "Add Asset" in campaign detail
2. Single file picker
3. Upload to Supabase Storage
4. Insert row in `assets` table

**Limitations:**
- One file at a time
- No progress indicator
- No folder structure
- No search/filter

---

## Proposed Features

### 1. Multi-file Upload

**Frontend:**
```jsx
// components/BulkUploader.jsx
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

export function BulkUploader({ campaignId, onComplete }) {
  const [uploads, setUploads] = useState([])
  
  const onDrop = useCallback(async (files) => {
    // Initialize progress state for each file
    setUploads(files.map(f => ({
      file: f,
      progress: 0,
      status: 'pending', // pending | uploading | done | error
      error: null
    })))
    
    // Upload files in parallel (max 3 concurrent)
    await uploadBatch(files, campaignId, {
      onProgress: (fileIndex, progress) => {
        setUploads(prev => prev.map((u, i) => 
          i === fileIndex ? { ...u, progress, status: 'uploading' } : u
        ))
      },
      onComplete: (fileIndex, asset) => {
        setUploads(prev => prev.map((u, i) => 
          i === fileIndex ? { ...u, progress: 100, status: 'done', asset } : u
        ))
      },
      onError: (fileIndex, error) => {
        setUploads(prev => prev.map((u, i) => 
          i === fileIndex ? { ...u, status: 'error', error: error.message } : u
        ))
      }
    })
    
    onComplete?.()
  }, [campaignId, onComplete])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 50
  })
  
  return (
    <div>
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <p>Drag & drop images, or click to select</p>
        )}
        <p className="text-sm text-gray-500 mt-2">
          PNG, JPG, GIF, WebP, SVG • Max 10MB • Up to 50 files
        </p>
      </div>
      
      {uploads.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploads.map((u, i) => (
            <UploadRow key={i} upload={u} />
          ))}
        </div>
      )}
    </div>
  )
}

function UploadRow({ upload }) {
  const { file, progress, status, error } = upload
  
  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
      <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0">
        {status === 'done' && (
          <img 
            src={URL.createObjectURL(file)} 
            className="w-full h-full object-cover rounded"
            alt=""
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{file.name}</p>
        {status === 'uploading' && (
          <div className="w-full bg-gray-200 rounded h-1 mt-1">
            <div 
              className="bg-blue-500 h-1 rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {status === 'pending' && <span className="text-gray-400">⏳</span>}
        {status === 'uploading' && <span className="text-blue-500">↑</span>}
        {status === 'done' && <span className="text-green-500">✓</span>}
        {status === 'error' && <span className="text-red-500">✗</span>}
      </div>
    </div>
  )
}
```

**Upload utility:**
```javascript
// lib/uploadBatch.js
import { supabase } from './supabase'
import { api } from './api'

const MAX_CONCURRENT = 3

export async function uploadBatch(files, campaignId, callbacks) {
  const { onProgress, onComplete, onError } = callbacks
  
  // Process in chunks of MAX_CONCURRENT
  for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
    const chunk = files.slice(i, i + MAX_CONCURRENT)
    
    await Promise.all(chunk.map(async (file, chunkIndex) => {
      const fileIndex = i + chunkIndex
      
      try {
        // Generate unique filename
        const ext = file.name.split('.').pop()
        const fileName = `${campaignId}/${Date.now()}-${fileIndex}.${ext}`
        
        // Upload to Supabase Storage with progress
        const { data, error } = await supabase.storage
          .from('assets')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            // Note: Supabase JS doesn't support onUploadProgress
            // For real progress, use XHR or fetch with streams
          })
        
        if (error) throw error
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('assets')
          .getPublicUrl(fileName)
        
        // Create asset record via API
        const asset = await api.createAsset(campaignId, {
          file_name: file.name,
          file_path: fileName,
          mime_type: file.type,
          file_size: file.size
        })
        
        onComplete?.(fileIndex, asset)
        
      } catch (error) {
        onError?.(fileIndex, error)
      }
    }))
  }
}
```

### 2. Backend: Batch Asset Creation

**New endpoint:**
```python
# app/api/routes/assets.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
import uuid

router = APIRouter(prefix="/assets", tags=["assets"])

class AssetCreate(BaseModel):
    file_name: str
    file_path: str
    mime_type: str
    file_size: int

class AssetBulkCreate(BaseModel):
    assets: List[AssetCreate]

@router.post("/campaigns/{campaign_id}/bulk")
async def create_assets_bulk(
    campaign_id: uuid.UUID,
    payload: AssetBulkCreate,
    user = Depends(get_current_user)
):
    """Create multiple asset records in one request."""
    
    # Verify campaign ownership
    campaign = await verify_campaign_access(campaign_id, user.id)
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    
    # Limit batch size
    if len(payload.assets) > 50:
        raise HTTPException(400, "Max 50 assets per batch")
    
    created = []
    errors = []
    
    for i, asset_data in enumerate(payload.assets):
        try:
            asset = await supabase.table("assets").insert({
                "id": str(uuid.uuid4()),
                "campaign_id": str(campaign_id),
                "file_name": asset_data.file_name,
                "file_path": asset_data.file_path,
                "mime_type": asset_data.mime_type,
                "file_size": asset_data.file_size
            }).execute()
            
            created.append(asset.data[0])
        except Exception as e:
            errors.append({"index": i, "error": str(e)})
    
    return {
        "created": created,
        "errors": errors,
        "total": len(payload.assets),
        "success_count": len(created),
        "error_count": len(errors)
    }
```

### 3. Asset Browser Enhancements

**New columns:**
```sql
-- migrations/006_asset_folders.sql

ALTER TABLE assets
ADD COLUMN folder text DEFAULT '',
ADD COLUMN tags text[] DEFAULT '{}';

CREATE INDEX idx_assets_folder ON assets(campaign_id, folder);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);
```

**Search/filter:**
```python
@router.get("/campaigns/{campaign_id}/assets")
async def list_assets(
    campaign_id: uuid.UUID,
    folder: str = None,
    tag: str = None,
    search: str = None,
    limit: int = 50,
    offset: int = 0,
    user = Depends(get_current_user)
):
    query = supabase.table("assets") \
        .select("*") \
        .eq("campaign_id", str(campaign_id)) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1)
    
    if folder:
        query = query.eq("folder", folder)
    
    if tag:
        query = query.contains("tags", [tag])
    
    if search:
        query = query.ilike("file_name", f"%{search}%")
    
    result = await query.execute()
    return result.data
```

**Frontend asset browser:**
```jsx
// components/AssetBrowser.jsx

function AssetBrowser({ campaignId }) {
  const [assets, setAssets] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [folder, setFolder] = useState('')
  const [search, setSearch] = useState('')
  
  // Batch operations
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} assets?`)) return
    
    await api.deleteAssets(campaignId, [...selected])
    setSelected(new Set())
    refetch()
  }
  
  const handleBulkMove = async (targetFolder) => {
    await api.moveAssets(campaignId, [...selected], targetFolder)
    setSelected(new Set())
    refetch()
  }
  
  const handleBulkTag = async (tags) => {
    await api.tagAssets(campaignId, [...selected], tags)
    refetch()
  }
  
  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
        <FolderSelect value={folder} onChange={setFolder} />
        
        {selected.size > 0 && (
          <>
            <button onClick={handleBulkDelete} className="btn btn-danger">
              Delete ({selected.size})
            </button>
            <MoveToFolderDropdown onSelect={handleBulkMove} />
            <TagDropdown onSelect={handleBulkTag} />
          </>
        )}
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-4 gap-4">
        {assets.map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            selected={selected.has(asset.id)}
            onSelect={() => toggleSelect(asset.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

### 4. Optional: AI Auto-Tagging

Use OpenAI Vision or BLIP-2 to auto-tag images:

```python
# app/services/auto_tag.py

import openai
from typing import List

async def auto_tag_image(image_url: str) -> List[str]:
    """Generate tags for an image using vision model."""
    
    response = await openai.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """Analyze this image and return 3-5 short tags for categorization.
                        Focus on: subject, mood, colors, style, use-case.
                        Return only comma-separated tags, no explanation.
                        Example: product, minimal, white, modern, hero-banner"""
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url}
                    }
                ]
            }
        ],
        max_tokens: 100
    )
    
    tags_text = response.choices[0].message.content
    tags = [t.strip().lower() for t in tags_text.split(',')]
    return tags[:5]
```

**Usage in bulk upload:**
```python
@router.post("/campaigns/{campaign_id}/bulk")
async def create_assets_bulk(
    campaign_id: uuid.UUID,
    payload: AssetBulkCreate,
    auto_tag: bool = False,  # Query param
    user = Depends(get_current_user)
):
    # ... existing code ...
    
    if auto_tag:
        # Queue tagging jobs (don't block response)
        for asset in created:
            background_tasks.add_task(
                tag_asset,
                asset_id=asset["id"],
                image_url=get_public_url(asset["file_path"])
            )
    
    return {"created": created, "errors": errors, "tagging_queued": auto_tag}
```

---

## Database Migration

```sql
-- supabase/migrations/006_bulk_assets.sql

-- Add folder and tags columns
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS folder text DEFAULT '',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_assets_folder 
ON assets(campaign_id, folder);

CREATE INDEX IF NOT EXISTS idx_assets_tags 
ON assets USING GIN(tags);

-- Full text search on file names
CREATE INDEX IF NOT EXISTS idx_assets_filename_search
ON assets USING GIN(to_tsvector('english', file_name));
```

---

## Dependencies

**Frontend:**
```json
{
  "react-dropzone": "^14.2.3"
}
```

**Backend (optional for auto-tagging):**
```txt
openai>=1.0.0
```

---

## Implementation Plan

| Phase | Task | Hours |
|-------|------|-------|
| 1 | DB migration (folder, tags) | 0.5 |
| 2 | Backend batch endpoint | 2 |
| 3 | BulkUploader component | 3 |
| 4 | AssetBrowser with filters | 3 |
| 5 | Batch operations (delete/move/tag) | 2 |
| 6 | Auto-tagging (optional) | 2 |
| **Total** | | **~12h** |

---

## API Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/assets/campaigns/{id}/bulk` | POST | Create multiple assets |
| `/assets/campaigns/{id}` | GET | List with filters |
| `/assets/campaigns/{id}/batch-delete` | POST | Delete multiple |
| `/assets/campaigns/{id}/batch-move` | POST | Move to folder |
| `/assets/campaigns/{id}/batch-tag` | POST | Add tags |

---

## Testing

```bash
# Bulk upload
curl -X POST http://localhost:8000/assets/campaigns/$CAMPAIGN_ID/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assets": [
      {"file_name": "hero.png", "file_path": "xxx/1.png", "mime_type": "image/png", "file_size": 102400},
      {"file_name": "cta.png", "file_path": "xxx/2.png", "mime_type": "image/png", "file_size": 51200}
    ]
  }'

# List with filters
curl "http://localhost:8000/assets/campaigns/$CAMPAIGN_ID?folder=heroes&tag=minimal"

# Batch delete
curl -X POST http://localhost:8000/assets/campaigns/$CAMPAIGN_ID/batch-delete \
  -d '{"asset_ids": ["uuid1", "uuid2"]}'
```

---

## Success Criteria

- [ ] Upload 50 images in <30 seconds
- [ ] Progress indicator for each file
- [ ] Create/rename/delete folders
- [ ] Search by filename
- [ ] Filter by folder/tag
- [ ] Select multiple → delete/move/tag
- [ ] (Optional) Auto-tag with AI

---

*Created: 2026-02-06*
