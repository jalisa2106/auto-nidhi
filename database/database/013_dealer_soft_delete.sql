ALTER TABLE master_dealer
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_master_dealer_not_deleted
ON master_dealer(id)
WHERE is_deleted = FALSE;