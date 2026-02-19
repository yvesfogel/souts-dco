# API Keys Feature Specification

**Status:** Design  
**Priority:** Medium  
**Author:** Dico  
**Date:** 2026-02-06

---

## Overview

Add API key authentication for external integrations (adservers, DSPs, SSPs, CDPs). This enables programmatic campaign management and ad serving without user session auth.

## Use Cases

1. **Adserver Integration**: SSP calls our API to serve ads programmatically
2. **DSP Sync**: External DSP fetches campaign data for bidding
3. **Automation**: Scripts that create/update campaigns via API
4. **Analytics Export**: Third-party tools pulling analytics data

---

## Database Schema

### New Table: `api_keys`

```sql
-- Migration: 006_api_keys.sql

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the key
  key_prefix TEXT NOT NULL,       -- First 8 chars for identification (e.g., "dco_live_")
  scopes TEXT[] DEFAULT '{}',     -- Permissions: ["read", "write", "serve", "analytics"]
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,         -- NULL = never expires
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,         -- NULL = active
  metadata JSONB DEFAULT '{}'     -- IP allowlist, rate limit overrides, etc.
);

-- Indexes
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id);
```

---

## API Key Format

```
dco_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
dco_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
│   │    │
│   │    └── 32 random alphanumeric chars
│   └── Environment (live/test)
└── Prefix
```

**Example:** `dco_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

- **Total length:** 44 characters
- **Prefix:** `dco_live_` or `dco_test_` (9 chars)
- **Secret:** 32 cryptographically random chars
- **Only shown once** at creation time

---

## Scopes

| Scope | Description |
|-------|-------------|
| `serve` | Serve ads (GET /ad/*) - most common |
| `read` | Read campaigns, variants, rules, assets |
| `write` | Create/update/delete campaigns |
| `analytics` | Access analytics data |
| `admin` | All permissions + key management |

**Default scope for new keys:** `["serve", "read"]`

---

## API Endpoints

### Key Management

```
POST   /api/keys              # Create new key
GET    /api/keys              # List user's keys (masked)
GET    /api/keys/{key_id}     # Get key details (masked)
DELETE /api/keys/{key_id}     # Revoke key
PATCH  /api/keys/{key_id}     # Update name/scopes/expiry
```

### Create Key Request

```json
POST /api/keys
{
  "name": "Production Adserver",
  "scopes": ["serve", "read"],
  "expires_in_days": 365,  // optional, null = never
  "metadata": {
    "ip_allowlist": ["203.0.113.0/24"],  // optional
    "rate_limit_per_minute": 1000        // optional override
  }
}
```

### Create Key Response (ONLY TIME key is visible)

```json
{
  "id": "uuid",
  "name": "Production Adserver",
  "key": "dco_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",  // ONLY SHOWN ONCE
  "key_prefix": "dco_live_a1b2c3d4",
  "scopes": ["serve", "read"],
  "expires_at": "2027-02-06T00:00:00Z",
  "created_at": "2026-02-06T02:20:00Z"
}
```

### List Keys Response

```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "Production Adserver",
      "key_prefix": "dco_live_a1b2c3d4",
      "scopes": ["serve", "read"],
      "last_used_at": "2026-02-05T15:30:00Z",
      "expires_at": "2027-02-06T00:00:00Z",
      "created_at": "2026-02-06T02:20:00Z"
    }
  ]
}
```

---

## Authentication Flow

### Using API Key

Include in header:
```
Authorization: Bearer dco_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

Or query param (for ad serving):
```
GET /ad/{campaign_id}?api_key=dco_live_...
```

### Backend Validation

```python
# app/core/api_keys.py

import hashlib
from datetime import datetime
from typing import Optional
from app.services.supabase import supabase

def hash_key(key: str) -> str:
    """SHA-256 hash of the API key."""
    return hashlib.sha256(key.encode()).hexdigest()

async def validate_api_key(key: str) -> Optional[dict]:
    """
    Validate API key and return user info + scopes.
    Returns None if invalid.
    """
    if not key or not key.startswith("dco_"):
        return None
    
    key_hash = hash_key(key)
    
    result = supabase.table("api_keys").select(
        "id, user_id, scopes, expires_at, revoked_at, metadata"
    ).eq("key_hash", key_hash).single().execute()
    
    if not result.data:
        return None
    
    key_data = result.data
    
    # Check if revoked
    if key_data.get("revoked_at"):
        return None
    
    # Check expiry
    if key_data.get("expires_at"):
        if datetime.fromisoformat(key_data["expires_at"]) < datetime.utcnow():
            return None
    
    # Update last_used_at
    supabase.table("api_keys").update({
        "last_used_at": datetime.utcnow().isoformat()
    }).eq("id", key_data["id"]).execute()
    
    return {
        "user_id": key_data["user_id"],
        "scopes": key_data["scopes"],
        "key_id": key_data["id"],
        "metadata": key_data.get("metadata", {})
    }
```

### FastAPI Dependency

```python
# app/api/deps.py

from fastapi import Depends, HTTPException, Header, Query
from typing import Optional
from app.core.api_keys import validate_api_key

async def get_api_auth(
    authorization: Optional[str] = Header(None),
    api_key: Optional[str] = Query(None)
) -> Optional[dict]:
    """
    Extract and validate API key from header or query param.
    Returns None if no key provided (falls back to session auth).
    """
    key = None
    
    # Try header first
    if authorization and authorization.startswith("Bearer "):
        key = authorization[7:]
    # Then query param
    elif api_key:
        key = api_key
    
    if not key:
        return None
    
    auth = await validate_api_key(key)
    if not auth:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return auth

def require_scope(scope: str):
    """Dependency that requires a specific scope."""
    async def check_scope(auth: dict = Depends(get_api_auth)):
        if not auth:
            raise HTTPException(status_code=401, detail="API key required")
        if scope not in auth["scopes"] and "admin" not in auth["scopes"]:
            raise HTTPException(status_code=403, detail=f"Missing scope: {scope}")
        return auth
    return check_scope
```

### Usage in Routes

```python
# Existing endpoint - add optional API key auth
@router.get("/ad/{campaign_id}")
async def serve_ad(
    campaign_id: str,
    api_auth: Optional[dict] = Depends(get_api_auth)  # Optional
):
    # If api_auth exists, use API key context
    # Otherwise, serve publicly (no auth required for ad serving)
    ...

# Protected endpoint - require specific scope
@router.get("/api/campaigns")
async def list_campaigns(
    auth: dict = Depends(require_scope("read"))
):
    # Only accessible with valid API key with "read" scope
    ...
```

---

## Rate Limiting with API Keys

Extend existing rate limiter to support per-key limits:

```python
# app/core/rate_limit.py

def get_rate_limit_key(request: Request) -> str:
    """Get rate limit key - use API key if present, otherwise IP."""
    api_key = request.headers.get("authorization", "")
    if api_key.startswith("Bearer dco_"):
        # Use first 20 chars of key as identifier
        return f"api:{api_key[7:27]}"
    return f"ip:{request.client.host}"

# Different limits for API keys vs anonymous
API_KEY_LIMITS = {
    "serve": "1000/minute",    # Ad serving
    "read": "100/minute",      # Read operations
    "write": "30/minute",      # Write operations
}

ANONYMOUS_LIMITS = {
    "serve": "100/minute",     # Public ad serving
}
```

---

## Frontend: API Keys Management UI

### Location
`/settings/api-keys` or modal in Dashboard

### Components

```
src/components/
├── ApiKeys/
│   ├── ApiKeyList.jsx       # Table of keys with actions
│   ├── CreateKeyModal.jsx   # Form to create new key
│   ├── KeyCreatedModal.jsx  # Shows key ONCE after creation
│   └── KeyDetails.jsx       # View/edit key details
```

### UI Flow

1. User navigates to API Keys section
2. Sees table with existing keys (masked)
3. Clicks "Create API Key"
4. Modal: Enter name, select scopes, optional expiry
5. On create: **Shows full key ONCE** with copy button and warning
6. Key is stored hashed - never retrievable again

---

## Security Considerations

1. **Key Storage**: Only hash stored in DB, never plaintext
2. **One-time Display**: Full key shown only at creation
3. **Prefix for Identification**: Can identify key without revealing secret
4. **IP Allowlist**: Optional restriction by source IP
5. **Expiry**: Optional automatic expiration
6. **Revocation**: Immediate invalidation capability
7. **Scope Limiting**: Minimum necessary permissions
8. **Audit Log**: Track key usage (could add audit_logs table)

---

## Migration Plan

1. Create `api_keys` table (migration 006)
2. Add backend validation module
3. Add key management API endpoints
4. Update existing endpoints with optional API auth
5. Add frontend UI for key management
6. Documentation update

---

## Testing

```bash
# Create key
curl -X POST http://localhost:8000/api/keys \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "scopes": ["serve", "read"]}'

# Use key for ad serving
curl http://localhost:8000/ad/{campaign_id}?api_key=dco_live_...

# Or with header
curl http://localhost:8000/ad/{campaign_id} \
  -H "Authorization: Bearer dco_live_..."

# List keys
curl http://localhost:8000/api/keys \
  -H "Authorization: Bearer {session_token}"
```

---

## Estimated Effort

| Task | Time |
|------|------|
| DB migration | 30 min |
| Backend auth module | 2 hours |
| Key management endpoints | 2 hours |
| Update existing routes | 1 hour |
| Frontend UI | 3 hours |
| Testing | 1 hour |
| Docs | 30 min |
| **Total** | **~10 hours** |

---

*Spec by Dico - Ready for implementation when prioritized.*
