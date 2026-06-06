# Database Schema Changes

## Overview
All DB migrations required by the implementation plans (Admin, Staff, Customer, Accountant).
These must be run **in order** before executing any role's implementation plan.
Last existing migration: `021_servise_requests.sql` → new migrations start at `022`.

> [!IMPORTANT]
> Run these migrations on the production Neon DB via the Neon SQL editor or psql **before deploying any code changes**.
> Each file uses `IF NOT EXISTS` / `IF EXISTS` guards so re-running is safe.

---

## Migration Files (Create in `/database/database/`)

---

### `022_customer_staff_allocation.sql`
**Referenced by:** C3 (Customer Plan), S6 (Staff Plan), A14 (Admin Plan)  
**Purpose:** Allocate a staff member to a customer for personalized service

```sql
-- 022_customer_staff_allocation.sql
-- Tracks which staff member is allocated to which customer

CREATE TABLE IF NOT EXISTS customer_staff_allocation (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES system_user(id) ON DELETE CASCADE,
    allocated_by    UUID REFERENCES system_user(id),        -- admin who made the allocation
    allocated_since TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (customer_id, staff_id)
);

-- Index for fast lookups by customer
CREATE INDEX IF NOT EXISTS idx_csa_customer_id ON customer_staff_allocation(customer_id);
-- Index for fast lookups by staff (how many customers does this staff have)
CREATE INDEX IF NOT EXISTS idx_csa_staff_id ON customer_staff_allocation(staff_id);
-- Index for active allocations only
CREATE INDEX IF NOT EXISTS idx_csa_is_active ON customer_staff_allocation(is_active);

COMMENT ON TABLE customer_staff_allocation IS 'Tracks which staff member is the primary consultant for a customer';
COMMENT ON COLUMN customer_staff_allocation.is_active IS 'Set to FALSE when staff is changed — keep history';
```

---

### `023_bank_account_fields.sql`
**Referenced by:** A10 (Admin Plan)  
**Purpose:** Add missing fields to master_company_bank for UPI, branch, and primary designation

```sql
-- 023_bank_account_fields.sql
-- Adds UPI, branch, account holder, primary flag and notes to company bank accounts

ALTER TABLE master_company_bank
    ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS branch_name          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS upi_id               VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_primary           BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notes                TEXT;

-- Ensure only one bank can be primary at a time (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_bank_primary
    ON master_company_bank(is_primary)
    WHERE is_primary = TRUE;

COMMENT ON COLUMN master_company_bank.upi_id IS 'UPI VPA, e.g. autonidhi@hdfc';
COMMENT ON COLUMN master_company_bank.is_primary IS 'Only one bank can be primary — used as default in payment forms';
```

---

### `024_customer_notification_preferences.sql`
**Referenced by:** C6 (Customer Plan)  
**Purpose:** Persist customer notification preferences in DB instead of localStorage

```sql
-- 024_customer_notification_preferences.sql
-- Stores per-customer notification preference toggles

CREATE TABLE IF NOT EXISTS customer_notification_preferences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    pref_key    VARCHAR(50) NOT NULL,   -- 'file_update', 'payment', 'insurance', 'document', 'general'
    is_enabled  BOOLEAN DEFAULT TRUE,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (customer_id, pref_key)
);

CREATE INDEX IF NOT EXISTS idx_cnp_customer_id ON customer_notification_preferences(customer_id);

COMMENT ON TABLE customer_notification_preferences IS 'Stores per-customer notification type preferences. Replaces localStorage.';
COMMENT ON COLUMN customer_notification_preferences.pref_key IS 'Matches frontend keys: file_update, payment, insurance, document, general';
```

---

### `025_user_soft_delete.sql`
**Referenced by:** A13 (Admin Plan)  
**Purpose:** Allow soft-deleting system users without removing their records or linked data

```sql
-- 025_user_soft_delete.sql
-- Adds soft delete support to system_user table

ALTER TABLE system_user
    ADD COLUMN IF NOT EXISTS is_deleted      BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Index for fast filtering of active (non-deleted) users
CREATE INDEX IF NOT EXISTS idx_system_user_is_deleted ON system_user(is_deleted);

-- Partial index: active users (not deleted, is_active = true)
CREATE INDEX IF NOT EXISTS idx_system_user_active
    ON system_user(is_active, is_deleted)
    WHERE is_deleted = FALSE;

COMMENT ON COLUMN system_user.is_deleted IS 'Soft delete flag — deleted users cannot log in but all linked records remain';
COMMENT ON COLUMN system_user.deleted_at IS 'Timestamp when the user was soft-deleted';
COMMENT ON COLUMN system_user.deletion_reason IS 'Optional admin-provided reason for deletion';
```

---

### `026_modification_request_statuses.sql`
**Referenced by:** A14 (Admin Plan)  
**Purpose:** Add intermediate workflow statuses to modification_request table

```sql
-- 026_modification_request_statuses.sql
-- Extends modification_request status enum for multi-phase review workflow

-- Step 1: Drop the old constraint
ALTER TABLE modification_request
    DROP CONSTRAINT IF EXISTS modification_request_status_check;

-- Step 2: Add the new constraint with all 6 statuses
ALTER TABLE modification_request
    ADD CONSTRAINT modification_request_status_check
    CHECK (status IN ('pending', 'verification', 'in_progress', 'approved', 'completed', 'rejected'));

-- Step 3: Add admin_notes column for admin to add context when changing status
ALTER TABLE modification_request
    ADD COLUMN IF NOT EXISTS admin_notes       TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by       UUID REFERENCES system_user(id),
    ADD COLUMN IF NOT EXISTS reviewed_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT;

COMMENT ON COLUMN modification_request.admin_notes IS 'Notes added by admin when reviewing the request';
COMMENT ON COLUMN modification_request.reviewed_by IS 'Admin user ID who last updated the status';
COMMENT ON COLUMN modification_request.rejection_reason IS 'Required when status = rejected';
```

---

## Migration Execution Order

Run in this exact order:

```sql
-- Run via Neon SQL editor or psql:
\i 022_customer_staff_allocation.sql
\i 023_bank_account_fields.sql
\i 024_customer_notification_preferences.sql
\i 025_user_soft_delete.sql
\i 026_modification_request_statuses.sql
```

Or use the existing `run_migrations.ps1` PowerShell script if it handles sequential execution.

---

## SQLAlchemy Model Updates Required

After running migrations, update `server/backend/models.py` for each new table/column:

### 1. New Model: `CustomerStaffAllocation`
```python
class CustomerStaffAllocation(Base):
    __tablename__ = 'customer_staff_allocation'

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id     = Column(UUID(as_uuid=True), ForeignKey('customer.id'), nullable=False)
    staff_id        = Column(UUID(as_uuid=True), ForeignKey('system_user.id'), nullable=False)
    allocated_by    = Column(UUID(as_uuid=True), ForeignKey('system_user.id'))
    allocated_since = Column(DateTime(timezone=True), server_default=func.now())
    is_active       = Column(Boolean, default=True)
    notes           = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customer = relationship('Customer', back_populates='staff_allocations')
    staff    = relationship('SystemUser', foreign_keys=[staff_id])
```

### 2. Update Model: `MasterCompanyBank`
```python
# Add to existing MasterCompanyBank model:
account_holder_name = Column(String(255))
branch_name         = Column(String(255))
upi_id              = Column(String(100))
is_primary          = Column(Boolean, default=False)
notes               = Column(Text)
```

### 3. New Model: `CustomerNotificationPreferences`
```python
class CustomerNotificationPreferences(Base):
    __tablename__ = 'customer_notification_preferences'

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey('customer.id'), nullable=False)
    pref_key    = Column(String(50), nullable=False)
    is_enabled  = Column(Boolean, default=True)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### 4. Update Model: `SystemUser`
```python
# Add to existing SystemUser model:
is_deleted      = Column(Boolean, default=False)
deleted_at      = Column(DateTime(timezone=True))
deletion_reason = Column(Text)
```

### 5. Update Model: `ModificationRequest`
```python
# Add to existing ModificationRequest model:
admin_notes      = Column(Text)
reviewed_by      = Column(UUID(as_uuid=True), ForeignKey('system_user.id'))
reviewed_at      = Column(DateTime(timezone=True))
rejection_reason = Column(Text)
```

---

## Verification SQL (Run After Each Migration)

```sql
-- Verify 022: customer_staff_allocation table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_staff_allocation'
ORDER BY ordinal_position;

-- Verify 023: bank account new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'master_company_bank'
AND column_name IN ('upi_id', 'is_primary', 'branch_name', 'account_holder_name');

-- Verify 024: notification preferences table
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'customer_notification_preferences';

-- Verify 025: soft delete columns on system_user
SELECT column_name FROM information_schema.columns
WHERE table_name = 'system_user'
AND column_name IN ('is_deleted', 'deleted_at', 'deletion_reason');

-- Verify 026: modification_request new statuses and columns
SELECT conname, consrc FROM pg_constraint
WHERE conname = 'modification_request_status_check';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'modification_request'
AND column_name IN ('admin_notes', 'reviewed_by', 'rejection_reason');
```
