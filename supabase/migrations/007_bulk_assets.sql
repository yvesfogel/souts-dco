-- 007_bulk_assets.sql
-- Asset organization: folders and tags

ALTER TABLE assets ADD COLUMN folder text DEFAULT '/';
ALTER TABLE assets ADD COLUMN tags text[] DEFAULT '{}';

CREATE INDEX idx_assets_tags ON assets USING GIN (tags);
CREATE INDEX idx_assets_folder ON assets(folder);
