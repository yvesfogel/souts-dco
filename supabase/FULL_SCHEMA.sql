-- SOUTS DCO Platform - Full Database Schema
-- Consolidated from migrations 001-009
-- Generated for easy one-shot setup
--
-- Tables: campaigns, variants, rules, assets, impressions, clicks,
--         component_pools, api_keys, organizations, org_memberships,
--         org_invitations, ai_generations, ai_prompt_templates, ai_usage

-- ============================================================
-- 001_initial.sql - Base schema
-- ============================================================

-- Campaigns
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  description text,
  template text DEFAULT 'default',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Variants
CREATE TABLE variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  headline text,
  body_text text,
  image_url text,
  cta_text text,
  cta_url text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Rules
CREATE TABLE rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES variants(id) ON DELETE CASCADE NOT NULL,
  signal text NOT NULL,
  operator text NOT NULL CHECK (operator IN ('eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in')),
  value text NOT NULL,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Assets
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  url text,
  type text,
  size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

-- Impressions
CREATE TABLE impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES variants(id) ON DELETE SET NULL,
  signals jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Indexes (001)
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_variants_campaign_id ON variants(campaign_id);
CREATE INDEX idx_rules_campaign_id ON rules(campaign_id);
CREATE INDEX idx_impressions_campaign_id ON impressions(campaign_id);
CREATE INDEX idx_impressions_created_at ON impressions(created_at);
CREATE INDEX idx_assets_campaign_id ON assets(campaign_id);
CREATE INDEX idx_assets_user_id ON assets(user_id);

-- RLS (001)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_own" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "campaigns_insert_own" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns_update_own" ON campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "campaigns_delete_own" ON campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "variants_select_own" ON variants FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "variants_insert_own" ON variants FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "variants_update_own" ON variants FOR UPDATE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "variants_delete_own" ON variants FOR DELETE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

CREATE POLICY "rules_select_own" ON rules FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "rules_insert_own" ON rules FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "rules_update_own" ON rules FOR UPDATE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "rules_delete_own" ON rules FOR DELETE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

CREATE POLICY "assets_select_own" ON assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "assets_insert_own" ON assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets_update_own" ON assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "assets_delete_own" ON assets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "impressions_insert_anon" ON impressions FOR INSERT WITH CHECK (true);
CREATE POLICY "impressions_select_own" ON impressions FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

-- ============================================================
-- 002_ab_testing.sql - A/B testing support
-- ============================================================

ALTER TABLE variants ADD COLUMN weight integer DEFAULT 100;

ALTER TABLE campaigns ADD COLUMN ab_test_mode text DEFAULT 'rules'
  CHECK (ab_test_mode IN ('rules', 'weighted', 'rules_then_weighted', 'off'));

-- ============================================================
-- 003_scheduling.sql - Campaign scheduling
-- ============================================================

ALTER TABLE campaigns ADD COLUMN start_date timestamptz;
ALTER TABLE campaigns ADD COLUMN end_date timestamptz;

-- ============================================================
-- 004_click_tracking.sql - Click tracking
-- ============================================================

CREATE TABLE clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES variants(id) ON DELETE SET NULL,
  url text,
  ip_hash text,
  user_agent text,
  referer text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_clicks_campaign_id ON clicks(campaign_id);
CREATE INDEX idx_clicks_created_at ON clicks(created_at);

ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clicks_insert_anon" ON clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "clicks_select_own" ON clicks FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

-- ============================================================
-- 005_component_pools.sql - Dynamic creative assembly
-- ============================================================

CREATE TABLE component_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  component text NOT NULL CHECK (component IN ('headline', 'body', 'cta_text', 'cta_url', 'image')),
  values text[] NOT NULL,
  auto_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (campaign_id, component)
);

CREATE INDEX idx_component_pools_campaign_id ON component_pools(campaign_id);

ALTER TABLE component_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "component_pools_select_own" ON component_pools FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "component_pools_insert_own" ON component_pools FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "component_pools_update_own" ON component_pools FOR UPDATE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "component_pools_delete_own" ON component_pools FOR DELETE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

ALTER TABLE variants ADD COLUMN auto_generated boolean DEFAULT false;

-- ============================================================
-- 006_api_keys.sql - API key management
-- ============================================================

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] DEFAULT '{serve}',
  metadata jsonb DEFAULT '{}',
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_own" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "api_keys_insert_own" ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_keys_update_own" ON api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "api_keys_delete_own" ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 007_bulk_assets.sql - Asset organization
-- ============================================================

ALTER TABLE assets ADD COLUMN folder text DEFAULT '/';
ALTER TABLE assets ADD COLUMN tags text[] DEFAULT '{}';

CREATE INDEX idx_assets_tags ON assets USING GIN (tags);
CREATE INDEX idx_assets_folder ON assets(folder);

-- ============================================================
-- 008_multi_tenant.sql - Organizations and teams
-- ============================================================

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

CREATE POLICY "organizations_select_member" ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid()));
CREATE POLICY "organizations_insert_auth" ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "organizations_update_admin" ON organizations FOR UPDATE
  USING (id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "organizations_delete_owner" ON organizations FOR DELETE
  USING (id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "org_memberships_select" ON org_memberships FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid()));
CREATE POLICY "org_memberships_insert_admin" ON org_memberships FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "org_memberships_update_admin" ON org_memberships FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "org_memberships_delete_admin" ON org_memberships FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "org_invitations_select" ON org_invitations FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "org_invitations_insert" ON org_invitations FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "org_invitations_delete" ON org_invitations FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "campaigns_select_org" ON campaigns FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid()));
CREATE POLICY "campaigns_insert_org" ON campaigns FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')));
CREATE POLICY "campaigns_update_org" ON campaigns FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')));
CREATE POLICY "campaigns_delete_org" ON campaigns FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- ============================================================
-- 009_ai_generation.sql - AI image generation and usage
-- ============================================================

CREATE TABLE ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  model text DEFAULT 'dall-e-3',
  style text,
  aspect_ratio text DEFAULT '1:1',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  image_urls text[],
  selected_url text,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  error_message text,
  cost_cents integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ai_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_text text NOT NULL,
  category text,
  variables text[],
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  month_year text NOT NULL,
  generations_count integer DEFAULT 0,
  tokens_used bigint DEFAULT 0,
  cost_cents integer DEFAULT 0,
  UNIQUE (user_id, org_id, month_year)
);

CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_campaign_id ON ai_generations(campaign_id);
CREATE INDEX idx_ai_generations_status ON ai_generations(status);
CREATE INDEX idx_ai_prompt_templates_org_id ON ai_prompt_templates(org_id);
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_generations_select_own" ON ai_generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_generations_insert_own" ON ai_generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_generations_update_own" ON ai_generations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ai_prompt_templates_select" ON ai_prompt_templates FOR SELECT
  USING (org_id IS NULL OR org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid()));
CREATE POLICY "ai_prompt_templates_insert" ON ai_prompt_templates FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')));
CREATE POLICY "ai_prompt_templates_update" ON ai_prompt_templates FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "ai_prompt_templates_delete" ON ai_prompt_templates FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "ai_usage_select_own" ON ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_usage_insert_own" ON ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_usage_update_own" ON ai_usage FOR UPDATE USING (auth.uid() = user_id);
