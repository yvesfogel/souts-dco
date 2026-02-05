-- SOUTS DCO Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template VARCHAR(100) DEFAULT 'default',
    settings JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Variants table (creative variations)
CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    headline VARCHAR(255) NOT NULL,
    body_text TEXT,
    cta_text VARCHAR(100) DEFAULT 'Learn More',
    cta_url TEXT NOT NULL,
    image_url TEXT,
    is_default BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rules table (decisioning logic)
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]',
    logic VARCHAR(10) DEFAULT 'and', -- 'and' or 'or'
    priority INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets table (uploaded files)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    content_type VARCHAR(100),
    size_bytes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impressions table (analytics)
CREATE TABLE impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    signals JSONB DEFAULT '{}',
    ip_hash VARCHAR(64), -- Hashed for privacy
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_active ON campaigns(active);
CREATE INDEX idx_variants_campaign_id ON variants(campaign_id);
CREATE INDEX idx_rules_campaign_id ON rules(campaign_id);
CREATE INDEX idx_rules_priority ON rules(priority);
CREATE INDEX idx_assets_campaign_id ON assets(campaign_id);
CREATE INDEX idx_impressions_campaign_id ON impressions(campaign_id);
CREATE INDEX idx_impressions_created_at ON impressions(created_at);

-- Row Level Security (RLS)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE impressions ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own campaigns
CREATE POLICY "Users can view own campaigns" ON campaigns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaigns" ON campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" ON campaigns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns" ON campaigns
    FOR DELETE USING (auth.uid() = user_id);

-- Variants: Access through campaign ownership
CREATE POLICY "Users can manage variants" ON variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = variants.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Rules: Access through campaign ownership
CREATE POLICY "Users can manage rules" ON rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = rules.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Assets: Access through campaign ownership
CREATE POLICY "Users can manage assets" ON assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = assets.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Impressions: Users can view their own campaign impressions
CREATE POLICY "Users can view own impressions" ON impressions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = impressions.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Service role can insert impressions (for ad serving)
CREATE POLICY "Service can insert impressions" ON impressions
    FOR INSERT WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER variants_updated_at
    BEFORE UPDATE ON variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER rules_updated_at
    BEFORE UPDATE ON rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create storage bucket for assets (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true);
