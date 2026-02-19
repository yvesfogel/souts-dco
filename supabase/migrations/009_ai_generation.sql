-- 009_ai_generation.sql
-- AI image generation, prompt templates, and usage tracking

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

-- AI generations: users see their own
CREATE POLICY "ai_generations_select_own" ON ai_generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_generations_insert_own" ON ai_generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_generations_update_own" ON ai_generations FOR UPDATE USING (auth.uid() = user_id);

-- Prompt templates: org members can view, or public (null org_id)
CREATE POLICY "ai_prompt_templates_select" ON ai_prompt_templates FOR SELECT
  USING (org_id IS NULL OR org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid()));
CREATE POLICY "ai_prompt_templates_insert" ON ai_prompt_templates FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')));
CREATE POLICY "ai_prompt_templates_update" ON ai_prompt_templates FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "ai_prompt_templates_delete" ON ai_prompt_templates FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- AI usage: users see their own
CREATE POLICY "ai_usage_select_own" ON ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_usage_insert_own" ON ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_usage_update_own" ON ai_usage FOR UPDATE USING (auth.uid() = user_id);
