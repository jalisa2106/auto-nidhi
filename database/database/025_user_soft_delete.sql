-- ============================================================
-- AutoNidhi — Migration 025: System User Soft Delete
-- ============================================================
-- Purpose : Enable soft-deletion of users without destroying
--           linked financial/operational data.
-- Referenced by : A13 (Admin Plan — Soft Delete Users),
--                 T7  (Thinking Doc — Delete Account Flow).
-- Safe to re-run : YES — uses ADD COLUMN IF NOT EXISTS.
-- ============================================================

-- ── New columns on system_user ───────────────────────────────

ALTER TABLE system_user
    -- Soft delete flag: TRUE = user is deleted, cannot log in
    ADD COLUMN IF NOT EXISTS is_deleted      BOOLEAN     DEFAULT FALSE,

    -- Timestamp of when the soft delete occurred
    ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ,

    -- Optional reason provided by admin at deletion time
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- ── Indexes ──────────────────────────────────────────────────

-- Speeds up "get all active users" queries (most common query)
CREATE INDEX IF NOT EXISTS idx_system_user_is_deleted
    ON system_user(is_deleted);

-- Compound index for the most common filter: active AND not deleted
CREATE INDEX IF NOT EXISTS idx_system_user_active_not_deleted
    ON system_user(is_active, is_deleted)
    WHERE is_deleted = FALSE;

-- ── Comments ─────────────────────────────────────────────────
COMMENT ON COLUMN system_user.is_deleted
    IS 'Soft delete flag. TRUE = user cannot log in but all linked records (files, payments, commissions) are preserved.';

COMMENT ON COLUMN system_user.deleted_at
    IS 'UTC timestamp when the admin executed the soft delete.';

COMMENT ON COLUMN system_user.deletion_reason
    IS 'Optional admin-entered reason for deletion. Shown in audit trail.';
