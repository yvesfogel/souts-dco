-- 008_multi_tenant.sql
-- Multi-tenant organizations, memberships, and invitations

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE TABLE org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  token text UNIQUE NOT NULL,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX idx_org_memberships_org_id ON org_memberships(org_id);
CREATE INDEX idx_org_invitations_token ON org_invitations(token);
CREATE INDEX idx_org_invitations_email ON org_invitations(email);
CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations: members can view
CREATE POLICY "organizations_select_member" ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid()));
CREATE POLICY "organizations_insert_auth" ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "organizations_update_admin" ON organizations FOR UPDATE
  USING (id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "organizations_delete_owner" ON organizations FOR DELETE
  USING (id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role = 'owner'));

-- Memberships: members can view their org's memberships
CREATE POLICY "org_memberships_select" ON org_memberships FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid()));
CREATE POLICY "org_memberships_insert_admin" ON org_memberships FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "org_memberships_update_admin" ON org_memberships FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "org_memberships_delete_admin" ON org_memberships FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Invitations: admins/owners can manage
CREATE POLICY "org_invitations_select" ON org_invitations FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "org_invitations_insert" ON org_invitations FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "org_invitations_delete" ON org_invitations FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Extend campaigns policy: org members can also access org campaigns
CREATE POLICY "campaigns_select_org" ON campaigns FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid()));
CREATE POLICY "campaigns_insert_org" ON campaigns FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')));
CREATE POLICY "campaigns_update_org" ON campaigns FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')));
CREATE POLICY "campaigns_delete_org" ON campaigns FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
