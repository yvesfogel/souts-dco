# AI Creative Generation Spec

**Status:** DRAFT  
**Priority:** Future Roadmap  
**Estimated Effort:** ~30-40 hours  
**Dependencies:** Multi-tenant (for usage billing), Asset Management

## Overview

Integrate AI image generation directly into the DCO platform. Users can generate ad creatives with natural language prompts, variations, and signal-based dynamic generation.

This bridges SOUTS' creative AI capabilities with the DCO product.

## Use Cases

### 1. Generate New Creative
User describes what they want → AI generates multiple options → User picks best → Becomes variant asset.

### 2. Generate Variations
User has existing creative → AI generates style/color/copy variations → A/B test them.

### 3. Signal-Based Generation (Advanced)
Define prompts per signal condition → System generates unique creatives for each context (hot weather = beach scene, cold = cozy indoor).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │  AICreativeGenerator Component                   │    │
│  │  - Prompt input                                  │    │
│  │  - Style selector                                │    │
│  │  - Aspect ratio picker                           │    │
│  │  - Generation preview grid                       │    │
│  │  - Select → Save to Assets                       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend API                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  /ai/generate                                    │    │
│  │  /ai/variations                                  │    │
│  │  /ai/status/{job_id}                            │    │
│  │  /ai/history                                     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              AI Generation Service                       │
│  ┌──────────────────┐  ┌──────────────────────────┐     │
│  │ Provider Adapters │  │ Queue & Job Management   │     │
│  │ - OpenAI DALL-E  │  │ - Redis/Celery           │     │
│  │ - Replicate      │  │ - Status tracking        │     │
│  │ - Midjourney API │  │ - Retry logic            │     │
│  │ - Stability AI   │  │ - Cost tracking          │     │
│  └──────────────────┘  └──────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Storage                            │
│  - Generated images saved to assets/generated/          │
│  - Metadata: prompt, model, cost, generation_id         │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### `ai_generations` Table

```sql
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id), -- Optional, for multi-tenant
  
  -- Generation request
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model VARCHAR(50) NOT NULL,  -- 'dall-e-3', 'stable-diffusion-xl', etc.
  style VARCHAR(50),           -- 'photorealistic', 'illustration', 'minimal', etc.
  aspect_ratio VARCHAR(20) DEFAULT '1:1',  -- '1:1', '16:9', '9:16', '4:3'
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  
  -- Results
  image_urls TEXT[],  -- Array of generated image URLs
  selected_url TEXT,  -- User's chosen image (if any)
  asset_id UUID REFERENCES assets(id),  -- Link to saved asset
  
  -- Billing
  cost_cents INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  
  -- Metadata
  source_asset_id UUID REFERENCES assets(id),  -- For variations
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_generations_user ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_org ON ai_generations(organization_id);
CREATE INDEX idx_ai_generations_status ON ai_generations(status);
CREATE INDEX idx_ai_generations_created ON ai_generations(created_at DESC);

-- RLS
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_generations_user_policy ON ai_generations
  FOR ALL USING (auth.uid() = user_id);
```

### `ai_usage` Table (Usage Tracking)

```sql
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  
  period_start DATE NOT NULL,  -- First day of month
  period_end DATE NOT NULL,
  
  generations_count INTEGER DEFAULT 0,
  images_generated INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  
  -- Limits
  monthly_limit_generations INTEGER DEFAULT 100,
  monthly_limit_cents INTEGER DEFAULT 2000,  -- $20
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, period_start)
);
```

## API Endpoints

### POST `/ai/generate`

Generate new images from prompt.

**Request:**
```json
{
  "prompt": "A refreshing cold drink on a hot summer day, minimal style, perfect for beverage ad",
  "negative_prompt": "text, watermark, blurry",
  "model": "dall-e-3",
  "style": "photorealistic",
  "aspect_ratio": "16:9",
  "count": 4
}
```

**Response (immediate):**
```json
{
  "job_id": "gen_abc123",
  "status": "pending",
  "estimated_seconds": 30,
  "poll_url": "/ai/status/gen_abc123"
}
```

### GET `/ai/status/{job_id}`

Check generation status.

**Response (in progress):**
```json
{
  "job_id": "gen_abc123",
  "status": "processing",
  "progress": 0.5,
  "message": "Generating image 2 of 4..."
}
```

**Response (completed):**
```json
{
  "job_id": "gen_abc123",
  "status": "completed",
  "images": [
    {
      "url": "https://...supabase.../generated/abc123_1.png",
      "thumbnail_url": "https://...supabase.../generated/abc123_1_thumb.png"
    },
    // ... more images
  ],
  "cost_cents": 8,
  "generation_id": "uuid..."
}
```

### POST `/ai/variations`

Generate variations of existing image.

**Request:**
```json
{
  "source_asset_id": "uuid...",
  "prompt": "Same product, different color schemes",
  "variation_count": 4,
  "variation_strength": 0.7  // 0.0 = identical, 1.0 = completely different
}
```

### POST `/ai/generate/{generation_id}/save`

Save generated image to assets.

**Request:**
```json
{
  "image_index": 0,
  "asset_name": "summer-drink-hero.png",
  "folder_id": "uuid..."
}
```

**Response:**
```json
{
  "asset_id": "uuid...",
  "asset_url": "https://..."
}
```

### GET `/ai/history`

List user's generation history.

**Query params:** `?page=1&limit=20&status=completed`

### GET `/ai/usage`

Get current usage and limits.

**Response:**
```json
{
  "period": "2026-02",
  "generations_used": 45,
  "generations_limit": 100,
  "cost_used_cents": 180,
  "cost_limit_cents": 2000,
  "remaining_generations": 55,
  "remaining_budget_cents": 1820
}
```

## Backend Implementation

### Provider Adapters

```python
# app/services/ai/providers/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List

@dataclass
class GenerationResult:
    images: List[bytes]
    cost_cents: int
    tokens_used: int
    model: str
    metadata: dict

class AIProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        negative_prompt: str = None,
        style: str = None,
        aspect_ratio: str = "1:1",
        count: int = 1
    ) -> GenerationResult:
        pass
    
    @abstractmethod
    async def variation(
        self,
        source_image: bytes,
        prompt: str = None,
        strength: float = 0.7,
        count: int = 1
    ) -> GenerationResult:
        pass
```

### DALL-E 3 Adapter

```python
# app/services/ai/providers/dalle.py
import openai
from .base import AIProvider, GenerationResult

class DalleProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        
    async def generate(
        self,
        prompt: str,
        negative_prompt: str = None,
        style: str = None,
        aspect_ratio: str = "1:1",
        count: int = 1
    ) -> GenerationResult:
        # Map aspect ratio to DALL-E sizes
        size_map = {
            "1:1": "1024x1024",
            "16:9": "1792x1024",
            "9:16": "1024x1792"
        }
        size = size_map.get(aspect_ratio, "1024x1024")
        
        # Style prompt enhancement
        style_prompts = {
            "photorealistic": "photorealistic, professional photography, high quality",
            "illustration": "digital illustration, clean lines, vector art style",
            "minimal": "minimalist design, clean, simple shapes, whitespace",
            "cinematic": "cinematic lighting, dramatic, movie poster quality"
        }
        enhanced_prompt = f"{prompt}. {style_prompts.get(style, '')}"
        
        images = []
        for _ in range(count):
            response = await self.client.images.generate(
                model="dall-e-3",
                prompt=enhanced_prompt,
                size=size,
                quality="hd",
                n=1
            )
            image_url = response.data[0].url
            # Download and return bytes
            async with httpx.AsyncClient() as client:
                img_response = await client.get(image_url)
                images.append(img_response.content)
        
        # DALL-E 3 HD pricing: $0.08 per image (1024x1024)
        cost_per_image = 8  # cents
        if "1792" in size:
            cost_per_image = 12  # cents for larger sizes
            
        return GenerationResult(
            images=images,
            cost_cents=cost_per_image * count,
            tokens_used=0,
            model="dall-e-3",
            metadata={"size": size, "quality": "hd"}
        )
```

### Stability AI Adapter

```python
# app/services/ai/providers/stability.py
import stability_sdk
from .base import AIProvider, GenerationResult

class StabilityProvider(AIProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        
    async def generate(
        self,
        prompt: str,
        negative_prompt: str = None,
        style: str = None,
        aspect_ratio: str = "1:1",
        count: int = 1
    ) -> GenerationResult:
        # Use SDXL via Stability API
        # Implementation details...
        pass
```

### Generation Service

```python
# app/services/ai/generation_service.py
from .providers.dalle import DalleProvider
from .providers.stability import StabilityProvider
import asyncio
from uuid import uuid4

class GenerationService:
    def __init__(self, supabase_client, redis_client):
        self.supabase = supabase_client
        self.redis = redis_client
        self.providers = {
            "dall-e-3": DalleProvider(os.getenv("OPENAI_API_KEY")),
            "sdxl": StabilityProvider(os.getenv("STABILITY_API_KEY")),
        }
    
    async def create_generation_job(
        self,
        user_id: str,
        prompt: str,
        model: str = "dall-e-3",
        **kwargs
    ) -> str:
        # Check usage limits
        usage = await self.get_usage(user_id)
        if usage["generations_used"] >= usage["generations_limit"]:
            raise UsageLimitExceeded("Monthly generation limit reached")
        
        # Create job record
        job_id = f"gen_{uuid4().hex[:12]}"
        generation = await self.supabase.table("ai_generations").insert({
            "id": uuid4(),
            "user_id": user_id,
            "prompt": prompt,
            "model": model,
            "status": "pending",
            **kwargs
        }).execute()
        
        # Queue for async processing
        await self.redis.lpush("ai_generation_queue", json.dumps({
            "job_id": job_id,
            "generation_id": generation.data[0]["id"],
            "user_id": user_id,
            "prompt": prompt,
            "model": model,
            **kwargs
        }))
        
        return job_id
    
    async def process_generation(self, job_data: dict):
        generation_id = job_data["generation_id"]
        
        try:
            # Update status
            await self.supabase.table("ai_generations").update({
                "status": "processing",
                "started_at": datetime.utcnow().isoformat()
            }).eq("id", generation_id).execute()
            
            # Generate images
            provider = self.providers[job_data["model"]]
            result = await provider.generate(
                prompt=job_data["prompt"],
                negative_prompt=job_data.get("negative_prompt"),
                style=job_data.get("style"),
                aspect_ratio=job_data.get("aspect_ratio", "1:1"),
                count=job_data.get("count", 4)
            )
            
            # Upload to Supabase Storage
            image_urls = []
            for i, image_bytes in enumerate(result.images):
                path = f"generated/{generation_id}_{i}.png"
                await self.supabase.storage.from_("assets").upload(
                    path, image_bytes, {"content-type": "image/png"}
                )
                url = self.supabase.storage.from_("assets").get_public_url(path)
                image_urls.append(url)
            
            # Update record
            await self.supabase.table("ai_generations").update({
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat(),
                "image_urls": image_urls,
                "cost_cents": result.cost_cents
            }).eq("id", generation_id).execute()
            
            # Update usage
            await self.increment_usage(
                job_data["user_id"],
                generations=1,
                images=len(result.images),
                cost_cents=result.cost_cents
            )
            
        except Exception as e:
            await self.supabase.table("ai_generations").update({
                "status": "failed",
                "error": str(e)
            }).eq("id", generation_id).execute()
            raise
```

### API Routes

```python
# app/api/routes/ai.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/ai", tags=["AI Generation"])

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    model: str = "dall-e-3"
    style: Optional[str] = None
    aspect_ratio: str = "1:1"
    count: int = 4

class GenerateResponse(BaseModel):
    job_id: str
    status: str
    estimated_seconds: int
    poll_url: str

@router.post("/generate", response_model=GenerateResponse)
async def generate_images(
    request: GenerateRequest,
    user = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service)
):
    job_id = await service.create_generation_job(
        user_id=user.id,
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        model=request.model,
        style=request.style,
        aspect_ratio=request.aspect_ratio,
        count=request.count
    )
    
    return GenerateResponse(
        job_id=job_id,
        status="pending",
        estimated_seconds=30,
        poll_url=f"/ai/status/{job_id}"
    )

@router.get("/status/{job_id}")
async def get_generation_status(
    job_id: str,
    user = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service)
):
    generation = await service.get_generation(job_id, user.id)
    if not generation:
        raise HTTPException(404, "Generation not found")
    
    return {
        "job_id": job_id,
        "status": generation["status"],
        "images": generation.get("image_urls", []),
        "cost_cents": generation.get("cost_cents", 0),
        "error": generation.get("error")
    }

@router.get("/usage")
async def get_usage(
    user = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service)
):
    return await service.get_usage(user.id)
```

## Frontend Components

### AICreativeGenerator

```jsx
// src/components/AICreativeGenerator.jsx
import { useState } from 'react'
import { Sparkles, Loader2, Download, Check } from 'lucide-react'

const STYLES = [
  { id: 'photorealistic', label: 'Photo', icon: '📷' },
  { id: 'illustration', label: 'Illustration', icon: '🎨' },
  { id: 'minimal', label: 'Minimal', icon: '⬜' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎬' }
]

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', width: 100, height: 100 },
  { id: '16:9', label: 'Wide', width: 160, height: 90 },
  { id: '9:16', label: 'Tall', width: 90, height: 160 }
]

export default function AICreativeGenerator({ onSave }) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('photorealistic')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [jobId, setJobId] = useState(null)
  
  const generate = async () => {
    setGenerating(true)
    setImages([])
    setSelectedIndex(null)
    
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, aspect_ratio: aspectRatio, count: 4 })
      })
      const { job_id, poll_url } = await res.json()
      setJobId(job_id)
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(poll_url)
        const status = await statusRes.json()
        
        if (status.status === 'completed') {
          clearInterval(pollInterval)
          setImages(status.images)
          setGenerating(false)
        } else if (status.status === 'failed') {
          clearInterval(pollInterval)
          setGenerating(false)
          alert('Generation failed: ' + status.error)
        }
      }, 2000)
    } catch (err) {
      setGenerating(false)
      alert('Error: ' + err.message)
    }
  }
  
  const saveSelected = async () => {
    if (selectedIndex === null) return
    
    const res = await fetch(`/api/ai/generate/${jobId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_index: selectedIndex })
    })
    const { asset_id, asset_url } = await res.json()
    onSave?.({ asset_id, asset_url })
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        AI Creative Generator
      </h3>
      
      {/* Prompt */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the ad creative you want to generate..."
        className="w-full h-24 p-3 border rounded-lg mb-4"
      />
      
      {/* Style selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Style</label>
        <div className="flex gap-2">
          {STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`px-3 py-2 rounded-lg border ${
                style === s.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Aspect ratio */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Aspect Ratio</label>
        <div className="flex gap-2">
          {ASPECT_RATIOS.map(ar => (
            <button
              key={ar.id}
              onClick={() => setAspectRatio(ar.id)}
              className={`p-2 rounded-lg border ${
                aspectRatio === ar.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
              }`}
            >
              <div 
                className="bg-gray-300 rounded"
                style={{ width: ar.width / 4, height: ar.height / 4 }}
              />
              <span className="text-xs mt-1">{ar.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Generate button */}
      <button
        onClick={generate}
        disabled={generating || !prompt.trim()}
        className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Creatives
          </>
        )}
      </button>
      
      {/* Results grid */}
      {images.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Select your favorite:
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                  selectedIndex === idx ? 'border-purple-500' : 'border-transparent'
                }`}
              >
                <img src={img} alt={`Generated ${idx + 1}`} className="w-full" />
                {selectedIndex === idx && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {selectedIndex !== null && (
            <button
              onClick={saveSelected}
              className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Save to Assets
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

### UsageIndicator

```jsx
// src/components/UsageIndicator.jsx
export default function UsageIndicator({ usage }) {
  const pct = (usage.generations_used / usage.generations_limit) * 100
  
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">AI Generations</span>
        <span className="font-medium">
          {usage.generations_used} / {usage.generations_limit}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${
            pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        ${(usage.cost_used_cents / 100).toFixed(2)} spent this month
      </p>
    </div>
  )
}
```

## Signal-Based Generation (Advanced Feature)

### Concept

Instead of static variants, define generation prompts per signal condition:

```json
{
  "campaign_id": "...",
  "signal_prompts": [
    {
      "condition": { "weather_is_hot": true },
      "prompt": "Refreshing iced beverage, beach setting, summer vibes",
      "cache_hours": 24
    },
    {
      "condition": { "weather_is_cold": true },
      "prompt": "Warm cozy drink, indoor setting, winter comfort",
      "cache_hours": 24
    },
    {
      "condition": { "daypart": "morning" },
      "prompt": "Energizing morning coffee, sunrise, fresh start",
      "cache_hours": 24
    }
  ],
  "default_prompt": "Delicious beverage product shot, clean background"
}
```

### Pre-generation Strategy

Don't generate on-demand (too slow). Instead:

1. **Scheduled pre-generation**: Generate images for all conditions during off-peak
2. **Cache aggressively**: Store in CDN, refresh periodically
3. **Fallback chain**: Generated → Uploaded variant → Default

### Implementation

```python
# Cron job: pre-generate signal-based creatives
async def pre_generate_signal_creatives():
    campaigns = await get_campaigns_with_signal_prompts()
    
    for campaign in campaigns:
        for signal_prompt in campaign["signal_prompts"]:
            # Check if we need fresh generation
            cached = await get_cached_creative(campaign.id, signal_prompt.condition)
            if cached and cached.age_hours < signal_prompt.cache_hours:
                continue
            
            # Generate new
            result = await generation_service.generate(
                prompt=signal_prompt.prompt,
                count=1
            )
            
            # Cache
            await cache_creative(
                campaign.id,
                signal_prompt.condition,
                result.images[0],
                ttl_hours=signal_prompt.cache_hours
            )
```

## Cost Estimation

### Per-Image Costs (Feb 2026)

| Provider | Model | Cost per image | Quality |
|----------|-------|----------------|---------|
| OpenAI | DALL-E 3 HD | $0.08-0.12 | High |
| Stability | SDXL | $0.03-0.05 | High |
| Replicate | Various | $0.01-0.10 | Varies |

### Monthly Budget Examples

| Tier | Generations/mo | Est. Cost | Target User |
|------|---------------|-----------|-------------|
| Free | 10 | $0 (subsidized) | Trial |
| Starter | 100 | ~$8 | Small business |
| Pro | 500 | ~$40 | Agency |
| Enterprise | Unlimited | Custom | Large org |

### Cost Control

1. **Hard limits**: Enforce monthly caps
2. **Soft warnings**: Alert at 80% usage
3. **Quality tiers**: Offer standard vs HD
4. **Batch discounts**: Lower cost for bulk generation

## Security Considerations

1. **Content moderation**: Filter inappropriate prompts/outputs
2. **Rate limiting**: Prevent abuse (already implemented in backend)
3. **API key protection**: Never expose AI provider keys to frontend
4. **Cost isolation**: Track per-user/org to prevent runaway costs
5. **Image ownership**: Clear ToS on generated content rights

## Prompt Templates

Pre-built prompt templates for common ad types:

```javascript
const PROMPT_TEMPLATES = [
  {
    id: 'product-hero',
    name: 'Product Hero Shot',
    template: 'Professional product photography of [PRODUCT], clean white background, studio lighting, high detail'
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle Scene',
    template: '[PRODUCT] in a lifestyle setting, natural lighting, authentic moment, relatable scene'
  },
  {
    id: 'seasonal',
    name: 'Seasonal Theme',
    template: '[PRODUCT] with [SEASON] theme, festive elements, seasonal colors, celebratory mood'
  },
  {
    id: 'minimal-ad',
    name: 'Minimal Ad',
    template: 'Minimalist advertisement for [PRODUCT], clean design, lots of whitespace, modern typography space'
  }
]
```

## Testing Strategy

### Unit Tests
- Provider adapters with mocked API responses
- Usage tracking logic
- Cost calculation

### Integration Tests
- Full generation flow with test API keys
- Storage upload/retrieval
- Status polling

### E2E Tests
- Generate → Select → Save to Assets flow
- Usage limits enforcement
- Error handling (failed generation)

## Implementation Phases

### Phase 1: Basic Generation (8h)
- DALL-E adapter
- Simple generate endpoint
- Results display in frontend

### Phase 2: Full UX (10h)
- Style selector, aspect ratios
- Progress polling
- Save to assets

### Phase 3: Usage & Billing (8h)
- Usage tracking
- Limits enforcement
- Usage UI

### Phase 4: Advanced Features (14h)
- Variations from existing
- Prompt templates
- Signal-based generation (experimental)

## Dependencies

- **Python**: openai, httpx, redis
- **Frontend**: None new (uses existing fetch/React patterns)
- **Infrastructure**: Redis for job queue (or use Supabase Edge Functions)
- **API Keys**: OpenAI, Stability AI (optional)

---

## Appendix: Prompt Engineering Tips

### For Ad Creatives

**DO:**
- Specify product clearly
- Mention desired mood/emotion
- Include composition hints ("centered", "rule of thirds")
- Add quality modifiers ("professional", "high resolution")

**DON'T:**
- Include text in images (AI text is unreliable)
- Request brand logos (use overlays instead)
- Over-specify (let AI interpret)

### Example Prompts

```
✅ Good:
"Professional product photo of energy drink can, dynamic splash effect, 
vibrant colors, studio lighting, centered composition, clean background"

❌ Bad:
"Energy drink ad with text saying ENERGY NOW and our logo"
```

---

*Last updated: 2026-02-06*
