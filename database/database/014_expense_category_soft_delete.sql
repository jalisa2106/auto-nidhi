ALTER TABLE master_expense_category
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_master_expense_category_not_deleted
ON master_expense_category(id)
WHERE is_deleted = FALSE;