-- AutoNidhi - Migration 012: Soft delete support for advances

ALTER TABLE advances
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_advances_not_deleted
ON advances(id)
WHERE is_deleted = FALSE;