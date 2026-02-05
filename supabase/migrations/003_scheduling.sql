-- Migration: Add Campaign Scheduling
-- Run this after 002_ab_testing.sql

-- Add scheduling fields to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Comment for clarity
COMMENT ON COLUMN campaigns.start_date IS 'Campaign starts showing ads at this date/time (null = immediately)';
COMMENT ON COLUMN campaigns.end_date IS 'Campaign stops showing ads at this date/time (null = no end)';

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
