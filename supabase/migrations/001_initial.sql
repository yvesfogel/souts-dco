-- 001_initial.sql
-- Base schema: campaigns, variants, rules, assets, impressions

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

-- Indexes
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_variants_campaign_id ON variants(campaign_id);
CREATE INDEX idx_rules_campaign_id ON rules(campaign_id);
CREATE INDEX idx_impressions_campaign_id ON impressions(campaign_id);
CREATE INDEX idx_impressions_created_at ON impressions(created_at);
CREATE INDEX idx_assets_campaign_id ON assets(campaign_id);
CREATE INDEX idx_assets_user_id ON assets(user_id);

-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE impressions ENABLE ROW LEVEL SECURITY;

-- Campaigns: users see only their own
CREATE POLICY "campaigns_select_own" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "campaigns_insert_own" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns_update_own" ON campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "campaigns_delete_own" ON campaigns FOR DELETE USING (auth.uid() = user_id);

-- Variants: users see only variants of their campaigns
CREATE POLICY "variants_select_own" ON variants FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "variants_insert_own" ON variants FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "variants_update_own" ON variants FOR UPDATE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "variants_delete_own" ON variants FOR DELETE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

-- Rules: users see only rules of their campaigns
CREATE POLICY "rules_select_own" ON rules FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "rules_insert_own" ON rules FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "rules_update_own" ON rules FOR UPDATE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
CREATE POLICY "rules_delete_own" ON rules FOR DELETE
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

-- Assets: users see only their own
CREATE POLICY "assets_select_own" ON assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "assets_insert_own" ON assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets_update_own" ON assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "assets_delete_own" ON assets FOR DELETE USING (auth.uid() = user_id);

-- Impressions: anyone can insert (ad serving), only campaign owner can read
CREATE POLICY "impressions_insert_anon" ON impressions FOR INSERT WITH CHECK (true);
CREATE POLICY "impressions_select_own" ON impressions FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
