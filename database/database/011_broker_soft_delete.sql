-- Add soft delete columns to master_broker table safely
ALTER TABLE master_broker
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_master_broker_not_deleted
ON master_broker (broker_name)
WHERE is_deleted = FALSE;
