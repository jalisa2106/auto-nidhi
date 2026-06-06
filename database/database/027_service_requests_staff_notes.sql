-- ============================================================
-- AutoNidhi — Migration 027: Service Requests — Staff Notes
-- ============================================================
-- Purpose : Allow staff to add internal notes when updating the
--           status of a service request through its lifecycle.
-- Referenced by : S12 (Staff Plan — Service Request Phase Updates).
-- Safe to re-run : YES — uses ADD COLUMN IF NOT EXISTS.
--
-- NOTE: The service_requests table (021) already has:
--   updated_at, viewed_by_consultant, consultant_id, remarks, status
-- This migration adds only the missing staff_notes column.
-- ============================================================

ALTER TABLE service_requests
    -- Internal note from staff when changing status
    -- (e.g., "Called customer, waiting for docs" when setting verification)
    ADD COLUMN IF NOT EXISTS staff_notes TEXT;

-- ── Index ─────────────────────────────────────────────────────
-- Fast filtering by status for staff dashboard badge counts
CREATE INDEX IF NOT EXISTS idx_service_requests_status
    ON service_requests(status);

-- Fast filtering by consultant + status (staff sees only their requests)
CREATE INDEX IF NOT EXISTS idx_service_requests_consultant_status
    ON service_requests(consultant_id, status);

-- ── Comments ──────────────────────────────────────────────────
COMMENT ON COLUMN service_requests.staff_notes
    IS 'Internal notes added by staff when updating the request status. Not visible to the customer.';
