-- 004_click_tracking.sql
-- Click tracking table

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
