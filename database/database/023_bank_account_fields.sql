-- ============================================================
-- AutoNidhi — Migration 023: Company Bank Account Enhancements
-- ============================================================
-- Purpose : Add UPI ID, branch name, account holder name,
--           primary flag, and notes to master_company_bank.
-- Referenced by : A10 (Admin Plan — Bank Accounts page).
-- Safe to re-run : YES — all ALTER TABLE use ADD COLUMN IF NOT EXISTS.
-- ============================================================

-- ── New columns ──────────────────────────────────────────────

ALTER TABLE master_company_bank
    ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS branch_name          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS upi_id               VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_primary           BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notes                TEXT;

-- ── Primary bank constraint ──────────────────────────────────
-- Only ONE bank account can be marked as primary at a time.
-- Partial unique index: only applies when is_primary = TRUE.
-- This means multiple rows with is_primary = FALSE are allowed (history).
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_bank_one_primary
    ON master_company_bank(is_primary)
    WHERE is_primary = TRUE AND is_deleted = FALSE;

-- ── Comments ─────────────────────────────────────────────────
COMMENT ON COLUMN master_company_bank.account_holder_name
    IS 'Name as printed on the bank account (for NEFT/RTGS details)';

COMMENT ON COLUMN master_company_bank.branch_name
    IS 'Bank branch name, e.g. "HDFC Bank, Rajkot Main Branch"';

COMMENT ON COLUMN master_company_bank.upi_id
    IS 'UPI VPA used for receiving payments via PhonePe/GPay, e.g. autonidhi@hdfc';

COMMENT ON COLUMN master_company_bank.is_primary
    IS 'Only one active bank can be primary — pre-selected in payment entry forms';

COMMENT ON COLUMN master_company_bank.notes
    IS 'Internal notes about this bank account (purpose, restrictions, etc.)';
