-- Migration: Add Click Tracking
-- Run this after 003_scheduling.sql

-- Clicks table
CREATE TABLE IF NOT EXISTS clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    impression_id UUID REFERENCES impressions(id), -- Optional link to impression
    url TEXT, -- The clicked URL
    ip_hash VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_id ON clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_clicks_variant_id ON clicks(variant_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks(created_at);

-- RLS
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

-- Users can view their own campaign clicks
CREATE POLICY "Users can view own clicks" ON clicks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = clicks.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Service role can insert clicks (for tracking)
CREATE POLICY "Service can insert clicks" ON clicks
    FOR INSERT WITH CHECK (true);

-- Add click tracking columns to impressions for linking
ALTER TABLE impressions ADD COLUMN IF NOT EXISTS click_id UUID;
