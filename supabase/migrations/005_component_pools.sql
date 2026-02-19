-- 005_component_pools.sql
-- Component pools for dynamic creative assembly

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
