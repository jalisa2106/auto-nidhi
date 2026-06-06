# AutoNidhi — Thinking Solutions Reference (T1–T8)
> **Source:** Derived from full codebase analysis of AutoNidhi (FastAPI + PostgreSQL + React + Vite)
> **Purpose:** This document is the ground-truth reference for all implementation plans (01–06). Every plan file must cite the relevant T-number when using a decision from here.

---

## Codebase Ground Truth (Read Before Any Plan)

### Tech Stack (Actual)
- **Frontend:** React + Vite + TypeScript, CSS Modules via `pages.css` + `index.css`
- **Backend:** FastAPI (Python), SQLAlchemy ORM, PostgreSQL (Neon)
- **Auth:** JWT tokens (access + refresh), stored in localStorage
- **File Storage:** Not yet integrated (documents table has `s3_key` column but no actual S3 calls exist)
- **Hosting:** Vercel (frontend) + Render (backend)

### Role Names in DB (Exact)
| Role | DB `role_name` value | Frontend routes prefix |
|---|---|---|
| Admin | `Admin` | `/dashboard`, `/customers`, `/files`, etc. |
| Staff | `Data_Entry` | `/staff/*` |
| Accountant | `Accountant` | `/accountant/*` |
| Customer | `Customer` | `/portal/*` |

### What is ALREADY WORKING (Do Not Break)
- ✅ JWT auth (login/signup/forgot-password/reset with DB-backed tokens)
- ✅ File CRUD with auto-file-number (`FILE/2026/001`)
- ✅ Payment In/Out, Commission In/Out, RTO, Insurance, Expenses, Advances
- ✅ Notifications table + per-user read/unread + auto-cleanup after 3 days
- ✅ Admin Review Desk (modification_request table + approval flow)
- ✅ Customer Documents upload + Staff approve/reject
- ✅ Export PDF/Excel on most list pages (using jsPDF + XLSX)
- ✅ Brokers, Dealers, Finance Banks, Insurance Companies master pages
- ✅ Customer profile detail page (`/customers/:id`) — just added
- ✅ Staff + Accountant profile detail pages (`/settings/staff/:id`, `/settings/accountants/:id`)
- ✅ Service requests table + Staff RequestsPage
- ✅ Company Bank Accounts page (`/settings/banks`)
- ✅ Company Settings page (`/settings/company`)
- ✅ `record_dashboard_event()` writes to `audit_logs` — already used everywhere

### Known Gaps (Source of All Tasks Below)
- ❌ `customer_staff_allocation` table does not exist — only `customer.created_by` (who added them)
- ❌ `system_user` has no `is_deleted` or `deleted_at` fields
- ❌ No notification fired when `file_record.status` changes
- ❌ Customer dashboard missing: Action Required widget, Staff card, Payment Summary, Insurance Expiry
- ❌ `customer_type` is `individual/business` in DB but frontend uses `individual/company` — mismatch
- ❌ Staff pages (PaymentIn, PaymentOut, RTOPayments, InsurancePayments) are stub files (< 300 bytes)
- ❌ Accountant pages (FilesPage, PaymentInPage, PaymentOutPage) are stub files
- ❌ No Analytics page exists
- ❌ `master_company_bank` missing: `account_holder_name`, `branch_name`, `upi_id`, `is_primary`
- ❌ Broker/Dealer masters missing: `commission_rate`, `bank_account_no`, `gst_number`

---

## T1 — Staff Allocation Logic

### Decision
**Hybrid model:** System auto-assigns staff at **file creation time**. Admin can manually override at any time. Customer never picks staff.

### Why Not Signup Time?
At signup, no service has started. The relationship between customer and staff becomes meaningful only when a file is opened.

### Why Not Pure Load Balancing?
Ignores expertise. A staff member specializing in RTO transfers shouldn't be skipped just because they have 10 customers vs another's 5.

### DB Design
```sql
-- Migration: 022_customer_staff_allocation.sql
CREATE TABLE customer_staff_allocation (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES customer(id),
  staff_id     UUID NOT NULL REFERENCES system_user(id),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  allocated_by UUID REFERENCES system_user(id),  -- NULL = auto, else admin UUID
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  notes        TEXT
);
-- Only ONE active allocation per customer at any time:
CREATE UNIQUE INDEX idx_csa_active ON customer_staff_allocation(customer_id) WHERE is_active = TRUE;
```

### Allocation Trigger
When `POST /api/v1/files/` creates a file, the `creating_staff_id` is inserted into `customer_staff_allocation` as active, IF no active allocation exists yet for that customer.

### Staff Change Request Flow
1. Customer → Settings → "Request Staff Change" → `service_requests` table (`request_type='staff_change'`)
2. Admin sees on Review Desk → selects new staff → updates `customer_staff_allocation`
3. Old record: `is_active = FALSE`. New record inserted.
4. Notifications: customer (staff changed), old staff (customer removed), new staff (customer assigned)

### Impact on Existing Code
- `files.py` → after creating file, check/insert `customer_staff_allocation`
- `customers.py` → profile endpoint should JOIN `customer_staff_allocation` to return `allocated_staff_name`
- Customer dashboard → fetch from `/portal/dashboard` which must now return `allocated_staff` info

---

## T2 — Customer File System

### Decision
**One file per service engagement per vehicle.** NOT one master file per customer.

### File Schema (What Exists — Correct)
```
file_record                  ← master container
├── customer_id              ← who it's for
├── created_by_user_id       ← staff who created
├── assigned_to              ← staff currently managing
├── file_number              ← auto-generated "FILE/2026/001"
├── file_type                ← new_vehicle | used_vehicle | renewal
├── status                   ← draft→login→under_process→sanctioned→disbursed→completed|cancelled
├── docket_date              ← bank submission date
└── remarks                  ← internal notes

vehicle_info    (1:1) ← vehicle model, chassis, engine, RC, owners
finance_info    (1:1) ← LAN, loan amount, EMI, bank_id, disbursement
insurance_info  (1:1) ← policy, company, type, IDV, premium, validity
rto_info        (1:1) ← RTO amount, district, transfer status, NOC, fitness
documents       (1:N) ← KYC docs, vehicle docs — all with approval lifecycle
payment_in      (1:N) ← all payments from customer
payment_out     (1:N) ← all payments to dealers/brokers
commission_in   (1:N) ← bank sourcing fees
commission_out  (1:N) ← dealer/broker commission payouts
```

### Who Creates Files, When
Staff only, via `POST /api/v1/files/`. Triggered after customer onboarding when a service begins.

### Role-Based Visibility Matrix
| Field | Customer | Staff | Accountant | Admin |
|---|---|---|---|---|
| File number, type, status | ✅ | ✅ | ✅ | ✅ |
| Bank name | ✅ | ✅ | ✅ | ✅ |
| LAN, loan amount, EMI | ✅ | ✅ | ✅ | ✅ |
| Payment received/outstanding | ✅ | ✅ | ✅ | ✅ |
| Assigned staff name | ✅ (name only) | ✅ | ✅ | ✅ |
| Customer KYC (Aadhar/PAN) | ❌ | ✅ | ✅ | ✅ |
| Commission data | ❌ NEVER | ✅ create | ✅ view | ✅ full |
| Internal remarks | ❌ | ✅ | ✅ view | ✅ full |
| Delete file | ❌ | ❌ | ❌ | ✅ only |

### File Appears In Both Views
Single `file_record` table. Staff and customer read the same row — different endpoints apply different field filters.

---

## T3 — Service Application Workflow

### Status Lifecycle (Existing — Keep)
```
draft → login → under_process → sanctioned → disbursed → completed
                                                         ↓
                                                     cancelled (from any state)
```

### Additional States to Add (Optional, Low Priority)
`rto_pending` and `insurance_pending` — for post-disbursement granular tracking. **Do NOT add to existing enum yet** — only add via a new migration after everything else is stable.

### Notification Trigger on Status Change
**This is the critical missing piece.** In `files.py` → `update_file()`, after the commit, call:
```python
send_targeted_notification(
    db=db,
    target_user_id=customer_system_user_id,
    message=f"Your file {file.file_number} status changed to {new_status}",
    notification_type="file_status_change",
    file_id=file.id
)
```
Must look up the customer's `system_user` via `customer.email = system_user.email`.

### Real-Time Update Strategy
**Short term (implement now):** 60-second `setInterval` polling in `notificationStore.ts`.
**Medium term (future):** FastAPI SSE endpoint.

### Status History (New Table Needed)
```sql
-- Migration: 023_file_status_history.sql
CREATE TABLE file_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id     UUID NOT NULL REFERENCES file_record(id),
  old_status  VARCHAR(50),
  new_status  VARCHAR(50) NOT NULL,
  changed_by  UUID NOT NULL REFERENCES system_user(id),
  note        TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## T4 — Company Bank Account Page

### Purpose
**Dual:** (1) Staff selects company bank when logging `payment_in` — "which account did customer pay into?" (2) Staff can reference bank details to tell customers where to transfer funds.

### Current State
`master_company_bank` table exists. `BankAccountsPage.tsx` exists at `/settings/banks`. CRUD is fully working via `bank_accounts.py`. The `payment_in` table has `company_bank_id FK` — already linked.

### Fields to Add (Missing)
```sql
-- Migration: 024_bank_account_fields.sql
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS notes TEXT;
```

### Access Control
- Admin: Full CRUD (`get_current_admin` guard — already in place)
- Staff: Read-only via list endpoint (used in payment form dropdowns)
- Customer: No direct access

---

## T5 — Broker/Dealer Pages

### Business Role
- **Dealers:** Vehicle showrooms that refer customers. Paid commission per disbursed loan via `commission_out`.
- **Brokers:** Area sub-agents that source customers from rural areas. Also paid via `commission_out`.

### Commission Flow
```
Finance Bank → Company (commission_in: DSA/sourcing fee)
Company → Dealer/Broker (commission_out: referral commission)
```

### Access Matrix (Final Decision)
| Page | Admin | Staff | Accountant |
|---|---|---|---|
| Brokers list | Full CRUD | Read-only | Read-only |
| Dealers list | Full CRUD | Read-only | Read-only |
| Commission IN | Full CRUD | Create + Update | View only |
| Commission OUT | Full CRUD | Create + Update | View only |
| Advances | Full CRUD | Create + Update | View only |

### Fields to Add to Masters
```sql
-- Migration: 025_broker_dealer_fields.sql
ALTER TABLE master_broker ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2);
ALTER TABLE master_broker ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50);
ALTER TABLE master_broker ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20);
ALTER TABLE master_broker ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20);

ALTER TABLE master_dealer ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2);
ALTER TABLE master_dealer ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50);
ALTER TABLE master_dealer ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20);
ALTER TABLE master_dealer ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20);
```

### Accountant Sidebar Addition
Add to `accountantNav` in `AdminDashboard.tsx`:
- `/accountant/commissions/in` → Commission IN (view-only)
- `/accountant/commissions/out` → Commission OUT (view-only)
- `/accountant/masters/brokers` → Brokers (view-only)
- `/accountant/masters/dealers` → Dealers (view-only)

---

## T6 — Customer Dashboard Widgets

### Current State (Keep These)
- KPI row: Active Files / Completed Services / Insurance count ✅
- Quick Services: Loan / Insurance / RTO shortcuts ✅
- Recent Files mini-table ✅

### Remove
- **File Status Pipeline** — redundant with the Recent Files table; consolidate into one widget

### Add These (Priority Order)
1. **⚠️ Action Required** (HIGHEST — amber/red, above fold)
   - Pending document uploads
   - Rejected documents needing re-upload
   - Outstanding payments
   
2. **👤 Allocated Staff Card**
   - Staff name, phone number, role
   - "Contact your account manager"
   - Source: `customer_staff_allocation` JOIN `system_user`

3. **💰 Payment Summary**
   - Total received, outstanding amount, last payment date
   - Source: `payment_in` WHERE file.customer_id = current

4. **🛡️ Insurance Expiry Alert**
   - Policies expiring within 60 days
   - Source: `insurance_info.valid_to`

5. **📋 Recent Activity** (last 5 status changes/events)

### Information Hierarchy Rule
First visible = What do I need to DO? → Then: What is my status? → Then: Who is my contact?

---

## T7 — Delete Account Flow

### Flow
1. User → Settings → "Request Account Deletion" → confirmation dialog → reason (optional)
2. Backend: verify password, create `service_requests` record (`request_type='account_deletion'`), notify all admins
3. Admin sees on Review Desk → Approve or Reject
4. On Approve: soft-delete executes

### DB Changes Needed
```sql
-- Migration: 026_user_soft_delete.sql
ALTER TABLE system_user ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE system_user ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE system_user ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
```

### Soft Delete Execution
```sql
UPDATE system_user SET
  is_active = FALSE,
  is_deleted = TRUE,
  deleted_at = NOW(),
  email = 'deleted_' || id::text || '@deleted.autonidhi',
  first_name = 'Deleted',
  last_name = 'User',
  phone_number = NULL
WHERE id = :user_id;
```

### Data Retention Rules
| Table | Action |
|---|---|
| `file_record` | RETAIN — legal/financial record |
| `payment_in/out` | RETAIN — accounting record |
| `commission_in/out` | RETAIN — business record |
| `customer_documents` | Soft-delete (`is_deleted = TRUE`) |
| `notifications` | Hard delete |

### Restore
Admin only. Sets `is_active = TRUE`, `is_deleted = FALSE`, generates temp password, emails user.

---

## T8 — Notifications & Activity History

### Notification Events → Trigger Points
| Event | Where to Add Code | Target | Type |
|---|---|---|---|
| File created | `files.py POST /` | Customer | `general` |
| File status changed | `files.py PUT /{id}` | Customer | `file_status_change` |
| Document approved | `files.py PATCH /documents/{id}/status` | Customer | `document_approved` ✅ |
| Document rejected | Same | Customer | `document_rejected` ✅ |
| Payment IN recorded | `payments_in.py POST /` | Customer | `payment_recorded` |
| Commission credited | `commissions_in.py POST /` | Admin | `commission_credited` |
| Staff change complete | Admin action | Customer + old staff + new staff | `general` |
| Modification request status update | `modifications.py` | Staff/Accountant | `general` |
| Account deletion approved/rejected | Admin action | User | `general` |

### Storage
DB-backed (`notifications` table) — **already implemented correctly**. Auto-cleanup: read notifications older than 3 days are deleted on each `GET /notifications` call — **already implemented**.

### Polling Interval (Fix Now)
Add `setInterval(() => fetchNotifications(), 60_000)` in `notificationStore.ts` to auto-refresh every 60 seconds.

### Read/Unread Tracking
Already correct: `is_read BOOLEAN`, `read_at TIMESTAMPTZ`. Bell shows unread count via `unreadCount()` in store.

### Admin Recent Activity
Already implemented via `audit_logs` + `record_dashboard_event()`. Admin `DashboardPage.tsx` shows live feed. **No changes needed here.**

---

## Summary Priority Matrix

| Priority | Task | Migrations | Affects |
|---|---|---|---|
| 🔴 Critical | Staff allocation table | 022 | Admin, Staff, Customer |
| 🔴 Critical | Fix customer_type mismatch (company→business) | none | Admin, Staff |
| 🔴 Critical | Notification on file status change | none | files.py |
| 🔴 Critical | Customer dashboard Action Required widget | none | Customer |
| 🟠 High | system_user soft-delete fields | 026 | Admin, Auth |
| 🟠 High | Bank account missing fields | 024 | Admin, Staff |
| 🟠 High | Broker/Dealer extra fields | 025 | Admin |
| 🟠 High | 60-sec notification polling | none | All roles |
| 🟡 Medium | File status history table | 023 | Staff, Customer |
| 🟡 Medium | Allocated Staff widget on customer dashboard | none | Customer |
| 🟡 Medium | Accountant broker/dealer/commission pages | none | Accountant |
| 🟢 Future | SSE real-time notifications | none | All roles |
| 🟢 Future | Insurance expiry scheduled job | none | Customer |
