-- Add title and caption to event_images to support image metadata
-- Note: SQLite does not support IF NOT EXISTS on ADD COLUMN in older versions.
-- If columns already exist, this migration will error; the runner should treat as skipped/failed and continue.

ALTER TABLE event_images ADD COLUMN title TEXT;
ALTER TABLE event_images ADD COLUMN caption TEXT;
