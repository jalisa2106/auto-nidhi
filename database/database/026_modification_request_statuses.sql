-- ============================================================
-- AutoNidhi — Migration 026: Modification Request Workflow Statuses
-- ============================================================
-- Purpose : Extend the modification_request status enum from a
--           simple 3-state (pending/approved/rejected) to a full
--           6-state workflow for the Admin Review Desk.
--           Also adds admin_notes and rejection_reason columns.
-- Referenced by : A14 (Admin Plan — Review Desk Phase Approvals).
-- Safe to re-run : YES — DROP IF EXISTS + ADD COLUMN IF NOT EXISTS.
--
-- IMPORTANT: reviewed_by and reviewed_at already exist in this table
--            (added in migration 019). They are NOT re-added here.
-- ============================================================

-- ── Step 1: Drop old CHECK constraint ────────────────────────
-- The old constraint only allowed: 'pending', 'approved', 'rejected'
ALTER TABLE modification_request
    DROP CONSTRAINT IF EXISTS modification_request_status_check;

-- ── Step 2: Add new CHECK constraint with full workflow ───────
-- New statuses:
--   pending      → newly submitted, no one has looked at it
--   verification → admin has opened and is verifying the data
--   in_progress  → admin has confirmed, action is being taken
--   approved     → modification is approved and applied
--   completed    → workflow done (final state for approvals)
--   rejected     → modification was denied
ALTER TABLE modification_request
    ADD CONSTRAINT modification_request_status_check
    CHECK (status IN (
        'pending',
        'verification',
        'in_progress',
        'approved',
        'completed',
        'rejected'
    ));

-- ── Step 3: Add new columns ───────────────────────────────────

-- Admin can add context notes visible to the staff who submitted the request
ALTER TABLE modification_request
    ADD COLUMN IF NOT EXISTS admin_notes      TEXT;

-- Required when status = 'rejected' — tells staff why it was denied
ALTER TABLE modification_request
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ── Comments ─────────────────────────────────────────────────
COMMENT ON COLUMN modification_request.status
    IS 'Workflow phases: pending → verification → in_progress → approved/completed or rejected.';

COMMENT ON COLUMN modification_request.admin_notes
    IS 'Notes added by admin during review — visible to the submitting staff.';

COMMENT ON COLUMN modification_request.rejection_reason
    IS 'Required when status=rejected. Explains to the submitter why the request was denied.';
