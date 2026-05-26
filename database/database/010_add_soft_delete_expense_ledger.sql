-- AutoNidhi — Add soft delete support to expense_ledger table
-- This migration adds the is_deleted column so the expenses backend can
-- safely filter out soft-deleted rows and mark records as deleted.

ALTER TABLE expense_ledger
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: Create index for soft delete queries (faster filtering)
CREATE INDEX IF NOT EXISTS idx_expense_ledger_not_deleted
ON expense_ledger(id)
WHERE is_deleted = FALSE;
