-- Migration: Add A/B Testing support
-- Run this after 001_initial.sql

-- Add weight column to variants for traffic splitting
ALTER TABLE variants ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 100;

-- Add ab_test_mode to campaigns
-- 'rules' = use rules first, then weights for default
-- 'weights' = ignore rules, only use weights
-- 'off' = no A/B testing, use default variant
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ab_test_mode VARCHAR(20) DEFAULT 'rules';

-- Comment for clarity
COMMENT ON COLUMN variants.weight IS 'Traffic weight for A/B testing (0-100). Higher = more traffic.';
COMMENT ON COLUMN campaigns.ab_test_mode IS 'A/B test mode: rules (default), weights (pure A/B), off';
