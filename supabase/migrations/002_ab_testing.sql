-- 002_ab_testing.sql
-- A/B testing support: variant weights and campaign test mode

ALTER TABLE variants ADD COLUMN weight integer DEFAULT 100;

ALTER TABLE campaigns ADD COLUMN ab_test_mode text DEFAULT 'rules'
  CHECK (ab_test_mode IN ('rules', 'weighted', 'rules_then_weighted', 'off'));
