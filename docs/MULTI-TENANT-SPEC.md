# Multi-Tenant Spec (Teams & Organizations)

Spec for multi-tenant support in souts-dco.

**Status:** Roadmap (Next)  
**Effort:** ~20 hours  
**Priority:** Medium-High

---

## Overview

Enable multiple users to collaborate on campaigns within organizations:
- **Organizations** (orgs): Top-level tenant, owns campaigns
- **Teams**: Groups within an org with specific permissions
- **Members**: Users with roles (owner, admin, member, viewer)
- **Invitations**: Invite users by email
- **RBAC**: Role-based access control

---

## Current State

**Single-user model:**
```sql
-- Current: campaigns belong directly to users
campaigns.user_id → auth.users.id
```

**Limitations:**
- No sharing between users
- No team collaboration
- No role-based permissions
- Each user sees only their own campaigns

---

## Proposed Schema

### Organizations

```sql
-- Organizations (top-level tenant)
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,  -- URL-friendly: "acme-inc"
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb
);

-- Index for slug lookup
CREATE UNIQUE INDEX idx_org_slug ON organizations(slug);
```

### Memberships

```sql
-- User memberships in organizations
CREATE TABLE org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_membership_user ON org_memberships(user_id);
CREATE INDEX idx_membership_org ON org_memberships(org_id);
```

### Invitations

```sql
-- Pending invitations
CREATE TABLE org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  token text UNIQUE NOT NULL,  -- For invite link
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  UNIQUE(org_id, email)
);

CREATE INDEX idx_invitation_token ON org_invitations(token);
CREATE INDEX idx_invitation_email ON org_invitations(email);
```

### Updated Campaigns

```sql
-- Campaigns now belong to orgs (with backward compat)
ALTER TABLE campaigns 
ADD COLUMN org_id uuid REFERENCES organizations(id);

-- Migrate existing: create personal orgs for each user
-- (migration script below)

-- Eventually: drop user_id, use org_id only
-- ALTER TABLE campaigns DROP COLUMN user_id;

CREATE INDEX idx_campaign_org ON campaigns(org_id);
```

---

## Roles & Permissions

| Permission | Owner | Admin | Member | Viewer |
|------------|-------|-------|--------|--------|
| View campaigns | ✅ | ✅ | ✅ | ✅ |
| Create campaigns | ✅ | ✅ | ✅ | ❌ |
| Edit campaigns | ✅ | ✅ | ✅ | ❌ |
| Delete campaigns | ✅ | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ✅ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ | ❌ |
| Manage org settings | ✅ | ❌ | ❌ | ❌ |
| Delete org | ✅ | ❌ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ | ❌ |

---

## Row-Level Security (RLS)

```sql
-- Organizations: only members can see
CREATE POLICY "org_member_access" ON organizations
FOR SELECT USING (
  id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid()
  )
);

-- Memberships: org members can see fellow members
CREATE POLICY "membership_org_access" ON org_memberships
FOR SELECT USING (
  org_id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid()
  )
);

-- Memberships: only owner/admin can insert
CREATE POLICY "membership_admin_insert" ON org_memberships
FOR INSERT WITH CHECK (
  org_id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Campaigns: org members can read
CREATE POLICY "campaign_org_read" ON campaigns
FOR SELECT USING (
  org_id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid()
  )
);

-- Campaigns: members+ can create/update
CREATE POLICY "campaign_org_write" ON campaigns
FOR INSERT WITH CHECK (
  org_id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'member')
  )
);

-- Campaigns: admins+ can delete
CREATE POLICY "campaign_org_delete" ON campaigns
FOR DELETE USING (
  org_id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);
```

---

## Backend Implementation

### Auth Middleware Update

```python
# app/core/auth.py

from functools import wraps
from fastapi import Depends, HTTPException

class OrgContext:
    """Context for org-scoped requests."""
    def __init__(self, user_id: str, org_id: str, role: str):
        self.user_id = user_id
        self.org_id = org_id
        self.role = role
    
    def can(self, permission: str) -> bool:
        permissions = {
            'owner': ['view', 'create', 'edit', 'delete', 'invite', 'remove', 'roles', 'settings', 'billing'],
            'admin': ['view', 'create', 'edit', 'delete', 'invite', 'remove'],
            'member': ['view', 'create', 'edit'],
            'viewer': ['view']
        }
        return permission in permissions.get(self.role, [])

async def get_org_context(
    org_id: str,
    user = Depends(get_current_user)
) -> OrgContext:
    """Get user's role in the specified org."""
    
    membership = await supabase.table("org_memberships") \
        .select("role") \
        .eq("org_id", org_id) \
        .eq("user_id", user.id) \
        .single() \
        .execute()
    
    if not membership.data:
        raise HTTPException(403, "Not a member of this organization")
    
    return OrgContext(
        user_id=user.id,
        org_id=org_id,
        role=membership.data["role"]
    )

def require_permission(permission: str):
    """Decorator to require a specific permission."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, org_ctx: OrgContext = Depends(get_org_context), **kwargs):
            if not org_ctx.can(permission):
                raise HTTPException(403, f"Permission denied: {permission}")
            return await func(*args, org_ctx=org_ctx, **kwargs)
        return wrapper
    return decorator
```

### Organizations API

```python
# app/api/routes/orgs.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import secrets

router = APIRouter(prefix="/orgs", tags=["organizations"])

class OrgCreate(BaseModel):
    name: str
    slug: str = None  # Auto-generate if not provided

class OrgUpdate(BaseModel):
    name: str = None
    logo_url: str = None

class InviteCreate(BaseModel):
    email: str
    role: str = "member"

@router.post("/")
async def create_org(
    payload: OrgCreate,
    user = Depends(get_current_user)
):
    """Create a new organization."""
    
    slug = payload.slug or slugify(payload.name)
    
    # Check slug availability
    existing = await supabase.table("organizations") \
        .select("id") \
        .eq("slug", slug) \
        .execute()
    
    if existing.data:
        raise HTTPException(400, "Slug already taken")
    
    # Create org
    org = await supabase.table("organizations").insert({
        "name": payload.name,
        "slug": slug
    }).execute()
    
    org_id = org.data[0]["id"]
    
    # Add creator as owner
    await supabase.table("org_memberships").insert({
        "org_id": org_id,
        "user_id": user.id,
        "role": "owner"
    }).execute()
    
    return org.data[0]

@router.get("/")
async def list_my_orgs(user = Depends(get_current_user)):
    """List orgs the current user belongs to."""
    
    result = await supabase.table("org_memberships") \
        .select("role, organizations(*)") \
        .eq("user_id", user.id) \
        .execute()
    
    return [
        {**m["organizations"], "my_role": m["role"]}
        for m in result.data
    ]

@router.get("/{org_id}")
async def get_org(org_ctx: OrgContext = Depends(get_org_context)):
    """Get org details."""
    
    org = await supabase.table("organizations") \
        .select("*") \
        .eq("id", org_ctx.org_id) \
        .single() \
        .execute()
    
    return {**org.data, "my_role": org_ctx.role}

@router.patch("/{org_id}")
@require_permission("settings")
async def update_org(
    payload: OrgUpdate,
    org_ctx: OrgContext = Depends(get_org_context)
):
    """Update org settings (owner only)."""
    
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    
    org = await supabase.table("organizations") \
        .update(updates) \
        .eq("id", org_ctx.org_id) \
        .execute()
    
    return org.data[0]

@router.get("/{org_id}/members")
async def list_members(org_ctx: OrgContext = Depends(get_org_context)):
    """List all members of the org."""
    
    result = await supabase.table("org_memberships") \
        .select("*, user:user_id(email)") \
        .eq("org_id", org_ctx.org_id) \
        .execute()
    
    return result.data

@router.post("/{org_id}/invite")
@require_permission("invite")
async def invite_member(
    payload: InviteCreate,
    org_ctx: OrgContext = Depends(get_org_context)
):
    """Invite a user by email."""
    
    # Check if already a member
    existing = await supabase.table("org_memberships") \
        .select("id") \
        .eq("org_id", org_ctx.org_id) \
        .eq("user_id", (
            await supabase.table("auth.users")
            .select("id")
            .eq("email", payload.email)
            .maybe_single()
            .execute()
        ).data.get("id") if ... else None) \
        .execute()
    
    if existing.data:
        raise HTTPException(400, "User is already a member")
    
    # Create invitation
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    invite = await supabase.table("org_invitations").insert({
        "org_id": org_ctx.org_id,
        "email": payload.email,
        "role": payload.role,
        "token": token,
        "invited_by": org_ctx.user_id,
        "expires_at": expires_at.isoformat()
    }).execute()
    
    # TODO: Send invite email
    # await send_invite_email(payload.email, token, org_name)
    
    return {"invite_url": f"/invite/{token}", "expires_at": expires_at}

@router.post("/invite/{token}/accept")
async def accept_invite(token: str, user = Depends(get_current_user)):
    """Accept an invitation."""
    
    invite = await supabase.table("org_invitations") \
        .select("*") \
        .eq("token", token) \
        .is_("accepted_at", None) \
        .gt("expires_at", datetime.utcnow().isoformat()) \
        .single() \
        .execute()
    
    if not invite.data:
        raise HTTPException(400, "Invalid or expired invitation")
    
    inv = invite.data
    
    # Add membership
    await supabase.table("org_memberships").insert({
        "org_id": inv["org_id"],
        "user_id": user.id,
        "role": inv["role"],
        "invited_by": inv["invited_by"]
    }).execute()
    
    # Mark invitation as accepted
    await supabase.table("org_invitations") \
        .update({"accepted_at": datetime.utcnow().isoformat()}) \
        .eq("id", inv["id"]) \
        .execute()
    
    return {"message": "Invitation accepted", "org_id": inv["org_id"]}

@router.delete("/{org_id}/members/{user_id}")
@require_permission("remove")
async def remove_member(
    user_id: str,
    org_ctx: OrgContext = Depends(get_org_context)
):
    """Remove a member from the org."""
    
    # Can't remove the owner
    membership = await supabase.table("org_memberships") \
        .select("role") \
        .eq("org_id", org_ctx.org_id) \
        .eq("user_id", user_id) \
        .single() \
        .execute()
    
    if membership.data["role"] == "owner":
        raise HTTPException(400, "Cannot remove the owner")
    
    await supabase.table("org_memberships") \
        .delete() \
        .eq("org_id", org_ctx.org_id) \
        .eq("user_id", user_id) \
        .execute()
    
    return {"message": "Member removed"}
```

### Update Campaigns API

```python
# app/api/routes/campaigns.py (updated)

@router.get("/orgs/{org_id}/campaigns")
async def list_org_campaigns(org_ctx: OrgContext = Depends(get_org_context)):
    """List campaigns for an org."""
    
    result = await supabase.table("campaigns") \
        .select("*") \
        .eq("org_id", org_ctx.org_id) \
        .order("created_at", desc=True) \
        .execute()
    
    return result.data

@router.post("/orgs/{org_id}/campaigns")
@require_permission("create")
async def create_campaign(
    payload: CampaignCreate,
    org_ctx: OrgContext = Depends(get_org_context)
):
    """Create a campaign in an org."""
    
    campaign = await supabase.table("campaigns").insert({
        **payload.dict(),
        "org_id": org_ctx.org_id
    }).execute()
    
    return campaign.data[0]
```

---

## Frontend Implementation

### Org Context

```jsx
// contexts/OrgContext.jsx

import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const OrgContext = createContext(null)

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([])
  const [currentOrg, setCurrentOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadOrgs()
  }, [])
  
  async function loadOrgs() {
    const data = await api.listOrgs()
    setOrgs(data)
    
    // Default to first org or from localStorage
    const savedOrgId = localStorage.getItem('currentOrgId')
    const org = data.find(o => o.id === savedOrgId) || data[0]
    setCurrentOrg(org)
    setLoading(false)
  }
  
  function switchOrg(org) {
    setCurrentOrg(org)
    localStorage.setItem('currentOrgId', org.id)
  }
  
  return (
    <OrgContext.Provider value={{ orgs, currentOrg, switchOrg, loading }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)
```

### Org Switcher

```jsx
// components/OrgSwitcher.jsx

import { useOrg } from '../contexts/OrgContext'

export function OrgSwitcher() {
  const { orgs, currentOrg, switchOrg } = useOrg()
  
  if (!currentOrg) return null
  
  return (
    <div className="relative">
      <button className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
        {currentOrg.logo_url ? (
          <img src={currentOrg.logo_url} className="w-6 h-6 rounded" alt="" />
        ) : (
          <div className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center text-xs">
            {currentOrg.name[0]}
          </div>
        )}
        <span className="font-medium">{currentOrg.name}</span>
        <span className="text-xs text-gray-500 capitalize">({currentOrg.my_role})</span>
      </button>
      
      {/* Dropdown for switching */}
      <div className="dropdown hidden">
        {orgs.map(org => (
          <button key={org.id} onClick={() => switchOrg(org)}>
            {org.name}
          </button>
        ))}
        <hr />
        <button onClick={() => navigate('/orgs/new')}>
          + Create Organization
        </button>
      </div>
    </div>
  )
}
```

### Team Management Page

```jsx
// pages/OrgSettings.jsx

function OrgSettings() {
  const { currentOrg } = useOrg()
  const [members, setMembers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  
  useEffect(() => {
    loadMembers()
  }, [currentOrg])
  
  async function loadMembers() {
    const data = await api.listOrgMembers(currentOrg.id)
    setMembers(data)
  }
  
  async function handleInvite(e) {
    e.preventDefault()
    await api.inviteMember(currentOrg.id, { email: inviteEmail, role: inviteRole })
    toast.success('Invitation sent!')
    setInviteEmail('')
  }
  
  async function handleRemove(userId) {
    if (!confirm('Remove this member?')) return
    await api.removeMember(currentOrg.id, userId)
    loadMembers()
  }
  
  const canManage = ['owner', 'admin'].includes(currentOrg.my_role)
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{currentOrg.name} Settings</h1>
      
      {/* Invite form */}
      {canManage && (
        <form onSubmit={handleInvite} className="flex gap-2 mb-6">
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="input flex-1"
            required
          />
          <select 
            value={inviteRole} 
            onChange={(e) => setInviteRole(e.target.value)}
            className="input w-32"
          >
            <option value="viewer">Viewer</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn btn-primary">
            Invite
          </button>
        </form>
      )}
      
      {/* Members list */}
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">{m.user?.email}</span>
              <span className="ml-2 text-sm text-gray-500 capitalize">{m.role}</span>
            </div>
            {canManage && m.role !== 'owner' && (
              <button 
                onClick={() => handleRemove(m.user_id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Migration Strategy

### Phase 1: Add Tables (Non-breaking)

```sql
-- 007_multi_tenant_tables.sql

-- Create new tables (doesn't affect existing data)
CREATE TABLE organizations (...);
CREATE TABLE org_memberships (...);
CREATE TABLE org_invitations (...);

-- Add org_id to campaigns (nullable for now)
ALTER TABLE campaigns ADD COLUMN org_id uuid REFERENCES organizations(id);
```

### Phase 2: Create Personal Orgs

```python
# scripts/migrate_to_orgs.py

async def create_personal_orgs():
    """Create a personal org for each existing user."""
    
    # Get all users with campaigns
    users = await supabase.table("campaigns") \
        .select("user_id") \
        .execute()
    
    unique_users = set(u["user_id"] for u in users.data)
    
    for user_id in unique_users:
        # Get user email for org name
        user = await supabase.auth.admin.get_user_by_id(user_id)
        
        # Create personal org
        org = await supabase.table("organizations").insert({
            "name": f"{user.email}'s Organization",
            "slug": f"user-{user_id[:8]}"
        }).execute()
        
        org_id = org.data[0]["id"]
        
        # Add user as owner
        await supabase.table("org_memberships").insert({
            "org_id": org_id,
            "user_id": user_id,
            "role": "owner"
        }).execute()
        
        # Migrate their campaigns
        await supabase.table("campaigns") \
            .update({"org_id": org_id}) \
            .eq("user_id", user_id) \
            .execute()
```

### Phase 3: Make org_id Required

```sql
-- 008_finalize_multi_tenant.sql

-- After migration, make org_id required
ALTER TABLE campaigns ALTER COLUMN org_id SET NOT NULL;

-- Update RLS policies to use org_id
DROP POLICY IF EXISTS "campaign_user_read" ON campaigns;
CREATE POLICY "campaign_org_read" ON campaigns ...;

-- Optionally drop user_id column
-- ALTER TABLE campaigns DROP COLUMN user_id;
```

---

## Implementation Plan

| Phase | Task | Hours |
|-------|------|-------|
| 1 | DB schema + migrations | 2 |
| 2 | Backend: org CRUD + memberships | 4 |
| 3 | Backend: invitations flow | 2 |
| 4 | Backend: update campaigns API | 2 |
| 5 | Frontend: OrgContext + switcher | 3 |
| 6 | Frontend: Team settings page | 3 |
| 7 | Migration script for existing users | 2 |
| 8 | Testing + RLS policies | 2 |
| **Total** | | **~20h** |

---

## API Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/orgs` | POST | Create organization |
| `/orgs` | GET | List my organizations |
| `/orgs/{id}` | GET | Get org details |
| `/orgs/{id}` | PATCH | Update org (owner) |
| `/orgs/{id}/members` | GET | List members |
| `/orgs/{id}/invite` | POST | Send invitation |
| `/orgs/{id}/members/{uid}` | DELETE | Remove member |
| `/invite/{token}/accept` | POST | Accept invitation |
| `/orgs/{id}/campaigns` | GET | List org campaigns |

---

## Future Considerations

- **Billing per org**: Stripe integration with org as customer
- **SSO/SAML**: For enterprise clients
- **Audit logs**: Track who did what
- **Custom roles**: Define custom permission sets
- **Teams within orgs**: Sub-groups for large orgs

---

*Created: 2026-02-06*
