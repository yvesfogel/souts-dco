-- 003_scheduling.sql
-- Campaign scheduling support

ALTER TABLE campaigns ADD COLUMN start_date timestamptz;
ALTER TABLE campaigns ADD COLUMN end_date timestamptz;
