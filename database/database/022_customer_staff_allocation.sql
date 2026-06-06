-- ============================================================
-- AutoNidhi — Migration 022: Customer-Staff Allocation
-- ============================================================
-- Purpose : Formally tracks which staff member is the primary
--           consultant for a given customer.
-- Referenced by : C3, C9, S2, S6, A14 in implementation plans.
-- Safe to re-run : YES — all statements use IF NOT EXISTS guards.
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_staff_allocation (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

    customer_id     UUID         NOT NULL
                                 REFERENCES customer(id) ON DELETE CASCADE,

    staff_id        UUID         NOT NULL
                                 REFERENCES system_user(id) ON DELETE CASCADE,

    -- NULL = auto-allocated (first file creation); UUID = admin who manually set it
    allocated_by    UUID         REFERENCES system_user(id) ON DELETE SET NULL,

    allocated_since TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- FALSE once the allocation is replaced by a newer record (keeps history)
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,

    notes           TEXT,

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────

-- Fast lookup: which customers belong to a staff member?
CREATE INDEX IF NOT EXISTS idx_csa_staff_id
    ON customer_staff_allocation(staff_id);

-- Fast lookup: who is allocated to a specific customer?
CREATE INDEX IF NOT EXISTS idx_csa_customer_id
    ON customer_staff_allocation(customer_id);

-- Fast lookup: only active allocations
CREATE INDEX IF NOT EXISTS idx_csa_active
    ON customer_staff_allocation(is_active)
    WHERE is_active = TRUE;

-- Business rule: only ONE active allocation per customer at any time.
-- Uses a partial unique index so historical (is_active=FALSE) rows are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_csa_customer_active_unique
    ON customer_staff_allocation(customer_id)
    WHERE is_active = TRUE;

-- ── Comments ─────────────────────────────────────────────────
COMMENT ON TABLE  customer_staff_allocation
    IS 'Maps each customer to their primary staff consultant. Only one active allocation per customer at a time. Old allocations are kept with is_active=FALSE for history.';

COMMENT ON COLUMN customer_staff_allocation.allocated_by
    IS 'NULL = system auto-allocated (on first file creation); non-NULL = admin who manually assigned the staff.';

COMMENT ON COLUMN customer_staff_allocation.is_active
    IS 'Set to FALSE when the staff is changed — the old row is kept for audit history.';
