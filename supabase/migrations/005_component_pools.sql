-- Migration: Component Pools for DCO
-- This enables the core DCO functionality: define component pools and auto-generate variants

-- Component pools table
CREATE TABLE IF NOT EXISTS component_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'headline', 'body', 'cta_text', 'cta_url', 'image'
    items JSONB NOT NULL DEFAULT '[]', -- Array of values
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pools_campaign_id ON component_pools(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pools_type ON component_pools(type);

-- RLS
ALTER TABLE component_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pools" ON component_pools
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = component_pools.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Track which variants were auto-generated
ALTER TABLE variants ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
ALTER TABLE variants ADD COLUMN IF NOT EXISTS component_combination JSONB; -- Store which components were used

-- Updated_at trigger
CREATE TRIGGER component_pools_updated_at
    BEFORE UPDATE ON component_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE component_pools IS 'Pools of creative components for DCO auto-generation';
COMMENT ON COLUMN component_pools.type IS 'Component type: headline, body, cta_text, cta_url, image';
COMMENT ON COLUMN component_pools.items IS 'JSON array of component values';
COMMENT ON COLUMN variants.auto_generated IS 'True if variant was auto-generated from pools';
COMMENT ON COLUMN variants.component_combination IS 'JSON object storing which pool items were used';
