-- ============================================================
-- AutoNidhi — Migration 028: Customer Document Review Tracking
-- ============================================================
-- Purpose : Track WHICH staff member reviewed a document and WHEN,
--           enabling the Verify/Reject workflow in the customer
--           profile view (admin and staff sides).
-- Referenced by : C10 (Customer Plan — Document Upload + Staff Approval).
-- Safe to re-run : YES — uses ADD COLUMN IF NOT EXISTS.
--
-- NOTE: customer_document (migration 016) already has:
--   rejection_reason, status (pending_review/verified/rejected/missing)
-- This migration adds only the missing reviewed_by + reviewed_at columns.
-- ============================================================

ALTER TABLE customer_document
    -- Who verified or rejected this document (staff or admin user ID)
    ADD COLUMN IF NOT EXISTS reviewed_by  UUID        REFERENCES system_user(id) ON DELETE SET NULL,

    -- When the review action happened
    ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ;

-- ── Index ─────────────────────────────────────────────────────
-- Fast query: "show me all documents pending review for my customers"
CREATE INDEX IF NOT EXISTS idx_customer_document_reviewed_by
    ON customer_document(reviewed_by);

-- Already exists from 016, but add composite for staff review dashboard
CREATE INDEX IF NOT EXISTS idx_customer_document_customer_status
    ON customer_document(customer_id, status);

-- ── Comments ──────────────────────────────────────────────────
COMMENT ON COLUMN customer_document.reviewed_by
    IS 'FK to system_user — the staff or admin who last changed the document status (verify/reject).';

COMMENT ON COLUMN customer_document.reviewed_at
    IS 'UTC timestamp when the review action was performed.';
