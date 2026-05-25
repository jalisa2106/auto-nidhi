-- AutoNidhi — Add soft delete support to rto_payment table
-- This migration adds the is_deleted column to enable soft delete functionality
-- matching the pattern used in other tables (e.g., documents)

ALTER TABLE rto_payment 
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: Create index for soft delete queries (faster filtering)
CREATE INDEX idx_rto_payment_not_deleted ON rto_payment(id) WHERE is_deleted = FALSE;
