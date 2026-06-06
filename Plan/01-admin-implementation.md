# Admin Implementation Plan

## Overview
14 tasks covering new features, bug fixes, UI improvements, and permission enforcement for the Admin role. All tasks are grounded in the actual codebase — FastAPI backend at `server/backend/routes/admin/`, React frontend at `client/src/pages/AdminPages/`, and PostgreSQL schema in `database/database/`.

**Important:** Tasks A4 and A11 are partially already done — `UsersPage.tsx` already shows `last_login` column and `first_name + last_name`. Verify what's actually broken before touching them.

## Prerequisites
- Read `00-thinking-solutions.md` (T2, T4, T7, T8)
- DB access to run migration SQLs (connect via Neon dashboard or psql)
- `jsPDF`, `jspdf-autotable`, `JSZip`, `recharts` npm packages must be installed before starting A1, A6

---

## Implementation Tasks (Ordered by Priority)

---

### TASK A1 — Analytics Page (New Page)
**Type:** New Feature  
**Complexity:** HIGH  
**Depends On:** T2 (file schema), existing dashboard API at `GET /dashboard/stats`

**What to do:**
1. Install recharts: `npm install recharts` inside `client/`
2. Create new backend endpoint `GET /api/v1/analytics/summary` in a new file `server/backend/routes/admin/analytics.py`
3. Endpoint returns:
   - Customer stats: total, individual vs business count (for pie chart), new registrations by month (last 6 months)
   - Staff stats: list of staff with their customer count and file count
   - File pipeline: count per status (draft/login/under_process/sanctioned/disbursed/completed/cancelled)
   - Payment trends: payment_in and payment_out totals grouped by month (last 6 months)
   - Accountant stats: count of modification requests submitted, resolved
4. Register endpoint in `server/backend/main.py` under admin router
5. Create frontend page `client/src/pages/AdminPages/AnalyticsPage.tsx`
6. Page layout — 3 sections:
   - Row 1: Customer pie chart (individual vs business) + Staff bar chart (customers per staff)
   - Row 2: File pipeline funnel (horizontal stacked bar by status)
   - Row 3: Payment In vs Out line chart over 6 months
7. Add route in `client/src/App.tsx`: `<Route path="/analytics" element={<AnalyticsPage />} />`
8. Add to `adminNav` in `AdminDashboard.tsx` under Overview group: `{ to: '/analytics', label: 'Analytics', icon: BarChart2 }`

**DB Changes:**
None — queries existing tables: `customer`, `file_record`, `payment_in`, `payment_out`, `system_user`, `modification_request`

**Component Changes:**
- `[NEW]` `client/src/pages/AdminPages/AnalyticsPage.tsx`
- `[NEW]` `server/backend/routes/admin/analytics.py`
- `[MODIFY]` `server/backend/main.py` — register analytics router
- `[MODIFY]` `client/src/App.tsx` — add `/analytics` route
- `[MODIFY]` `client/src/pages/Dashboard/AdminDashboard.tsx` — add nav item

**Permissions / Role Gate:**
- Backend: use `get_current_admin` dependency — only admin can access `/analytics`
- Frontend: page component itself needs no extra guard since admin routes are already protected by AdminLayout

**Edge Cases:**
- If no data exists (new install), return zeros — do not return 404 or empty arrays that crash chart components
- Recharts requires numeric values — ensure all data returned from API is `int` not `None`
- Month labels must use Indian locale format: "Jan 2026", "Feb 2026", etc.

---

### TASK A2/A7 — File Click Opens Preview (Bug Fix — All Pages)
**Type:** Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** T2 (file visibility matrix)

**Root Cause:**
In `FilesPage.tsx`, clicking file number does `navigate('/files/${r.id}')` but there is **no route `/files/:id`** registered in `App.tsx`. This causes a redirect to `/` (the wildcard fallback). The fix is to build a right-side drawer (slide-over panel) that shows full file details without navigating away.

**What to do:**
1. Create `client/src/components/app/FileDetailDrawer.tsx` — a reusable right-side drawer component
2. Drawer accepts: `fileId: string | null`, `onClose: () => void`
3. When `fileId` is set, drawer fetches `GET /api/v1/files/{file_id}/detail` and renders full details
4. Create backend endpoint `GET /api/v1/files/{file_id}/detail` in `files.py`
5. Endpoint returns: file_record + vehicle_info + finance_info + insurance_info + rto_info + payment_in list + payment_out list
6. In each page below, replace `navigate('/files/${id}')` with `setDrawerFileId(id)`:
   - `FilesPage.tsx` — file_number `<a>` click (line 304)
   - `PaymentInPage.tsx` — any file reference
   - `PaymentOutPage.tsx` — any file reference
   - `RTOPaymentsPage.tsx` — any file reference
   - `InsurancePaymentsPage.tsx` — any file reference
   - `ExpensesPage.tsx` — any file reference
   - `AdminReviewDeskPage.tsx` — if files appear in request rows
   - `DashboardPage.tsx` — recent files table (line 493, `navigate('/files/${f.id}')`)
7. Add `<FileDetailDrawer fileId={drawerFileId} onClose={() => setDrawerFileId(null)} />` at bottom of each page

**DB Changes:**
None — read-only JOIN query

**Component Changes:**
- `[NEW]` `client/src/components/app/FileDetailDrawer.tsx`
- `[NEW]` Backend endpoint `GET /api/v1/files/{file_id}/detail` in `server/backend/routes/admin/files.py`
- `[MODIFY]` 7 pages listed above

**Permissions / Role Gate:**
- Backend endpoint: accessible by `get_current_staff` (admin + staff + accountant can view)
- Customer cannot access this endpoint — it's under `/api/v1/files/` which is admin/staff only

**Edge Cases:**
- Drawer must show a loading spinner while fetching
- If file_id returns 404, show "File not found" inside drawer — do not crash
- Drawer must trap focus (pressing Escape closes it)
- Do not open drawer when clicking Edit or Delete action buttons — use `e.stopPropagation()` on action buttons

---

### TASK A3 — Customers Page — Clickable Row Opens Profile
**Type:** New Feature (partially done)  
**Complexity:** LOW  
**Depends On:** None (CustomerDetailPage was already created in previous session)

**What to do:**
1. The route `/customers/:id` is already registered in `App.tsx` (line 129)
2. `CustomerDetailPage.tsx` already exists at `client/src/pages/AdminPages/CustomerDetailPage.tsx`
3. The backend endpoint `GET /api/v1/customers/{id}/profile` was already added to `customers.py`
4. **Check what's missing:** Open `CustomersPage.tsx` and verify the "Profile" button or row click actually calls `navigate('/customers/${row.id}')`
5. If row click doesn't trigger navigation, add `onRowClick={(row) => navigate('/customers/${row.id}')}` to the `DataTable` component OR add a "View Profile" button in the actions column
6. Verify `CustomerDetailPage.tsx` displays: full_name, email, mobile_1, mobile_2, address, city, state, customer_type badge, created_at, allocated_staff name (will be null until T1 allocation table is built), and list of linked files

**DB Changes:**
None

**Component Changes:**
- `[MODIFY]` `client/src/pages/AdminPages/CustomersPage.tsx` — ensure row click or button navigates correctly
- `[MODIFY]` `client/src/pages/AdminPages/CustomerDetailPage.tsx` — verify all fields render

**Permissions / Role Gate:**
- Admin only — route is inside AdminLayout, no extra guard needed

**Edge Cases:**
- If customer has no linked files, show empty state "No files created yet"
- If customer has no system_user account (added by staff directly), show "No login account" in profile

---

### TASK A4/A11 — Last Login Time + Last Name Display (Bug Fix)
**Type:** Bug Fix  
**Complexity:** LOW  
**Depends On:** None

**What to do:**
1. **Verify actual bug first** — `UsersPage.tsx` already has `last_login` column (line 372, 406) and shows `first_name + last_name` (line 394). Check if the backend is actually returning `last_login`.
2. Open `server/backend/routes/admin/users_settings.py` → check the `list_users` endpoint — confirm `last_login` field is returned in the serialized user dict
3. In `server/backend/models.py`, `SystemUser` model — confirm `last_login` column exists and is mapped
4. If `last_login` is not in the model: check `002_tables.sql` for the column name. The actual column may be named differently (e.g., `last_sign_in_at` or `last_login_at`)
5. Match the backend field name to what `UsersPage.tsx` expects (`last_login`)
6. For `UserDetailPage.tsx` (staff/accountant profile view) — verify `last_login` is also shown in the profile header
7. For `CustomerDetailPage.tsx` — if customer has a `system_user` record, show last login there too
8. **Last Name fix:** In any profile page where only `first_name` is shown (check `AdminProfilePage.tsx`, `DataEntryProfilePage.tsx`) — ensure `last_name` is concatenated: `${first_name} ${last_name || ''}`

**DB Changes:**
None — if column exists, just fix the field name mapping

**Component Changes:**
- `[MODIFY]` `server/backend/routes/admin/users_settings.py` — verify serializer returns `last_login`
- `[MODIFY]` `client/src/pages/AdminPages/UserDetailPage.tsx` — add last login field display
- `[MODIFY]` `client/src/pages/AdminPages/CustomerDetailPage.tsx` — add last login field if system_user exists

**Permissions / Role Gate:**
- Admin only — no change needed

**Edge Cases:**
- If `last_login` is null: display "Never logged in" — already handled by `timeLabel()` helper in `UsersPage.tsx` (line 53)
- Do not expose last_login of one staff to another staff member

---

### TASK A5 — Customer Type: Individual/Business Filter + Update
**Type:** New Feature  
**Complexity:** LOW  
**Depends On:** T2

**What to do:**
1. `customer_type` column already exists in DB as enum `individual | business` (from `003_files_documents.sql`)
2. **Fix mismatch:** Frontend currently uses `individual | company` in some places — change all frontend references from `'company'` to `'business'` to match the DB enum
3. In `CustomersPage.tsx`:
   - Add filter buttons above the table: `All | Individual | Business`
   - Pass `customer_type` filter to the existing list endpoint `GET /api/v1/customers/`
   - When filter changes, reset to page 1
4. In `CustomerDetailPage.tsx`:
   - Show `customer_type` as a badge in the profile header (blue = Individual, purple = Business)
   - Add an editable dropdown for admin to change the type: `PATCH /api/v1/customers/{id}` with `{ customer_type: 'individual' | 'business' }`
5. In `server/backend/routes/admin/customers.py`:
   - Add `customer_type: Optional[str]` query param to the list endpoint
   - Add `customer_type` field to the update payload schema

**DB Changes:**
None — column already exists. Only fix the enum mismatch in frontend code.

**Component Changes:**
- `[MODIFY]` `client/src/pages/AdminPages/CustomersPage.tsx` — filter buttons, pass customer_type param
- `[MODIFY]` `client/src/pages/AdminPages/CustomerDetailPage.tsx` — badge + editable field
- `[MODIFY]` `server/backend/routes/admin/customers.py` — add customer_type filter param + update field

**Permissions / Role Gate:**
- Admin can update customer_type
- Staff can also update customer_type (covered in staff plan S2)
- Endpoint: use `get_current_staff` so both admin and staff can update

**Edge Cases:**
- When filter is applied, pagination must reset to page 1 (`setPage(1)` on filter change)
- Handle customers with NULL customer_type (older records) — treat as `individual` in display

---

### TASK A6 — Export PDF Fix (Full Details, Not Table Row) + ZIP for Multiple
**Type:** Bug Fix + Feature  
**Complexity:** MEDIUM  
**Depends On:** T2 (file detail fields)

**What to do:**
1. Install JSZip: `npm install jszip` inside `client/` (may already be installed — check `package.json`)
2. **Root cause:** Current PDF export in `FilesPage.tsx` (line 72) exports table row data (file_number, customer, type, status, bank, assigned, created). This is correct for table export. The user wants: when selecting files via `SelectiveExportModal`, the ZIP/detail export should show ALL file fields.
3. The `SelectiveExportModal` + `exportDetailPDFsAsZip` utility already exists in `FilesPage.tsx` (lines 467–496). It IS working for detail export. The issue is the fields passed to `exportDetailPDFsAsZip` are still only the 8 table columns.
4. Fix the ZIP export to fetch full file details before generating PDF:
   - In `onExportZip` callback (line 477), for each selected file, call `GET /api/v1/files/{id}/detail` (from A2) to get full details
   - Pass all fetched fields: vehicle_model, chassis_number, engine_number, LAN number, loan amount, EMI, bank, insurance policy, RTO info, etc.
5. Apply same fix to all pages that have export: `PaymentInPage.tsx`, `PaymentOutPage.tsx`, `RTOPaymentsPage.tsx`, `InsurancePaymentsPage.tsx`, `ExpensesPage.tsx`
6. ZIP filename format: `files-export-2026-06-05.zip`
7. Individual PDF filename inside ZIP: `FILE-2026-001_CustomerName.pdf`

**DB Changes:**
None

**Component Changes:**
- `[MODIFY]` `client/src/pages/AdminPages/FilesPage.tsx` — fix `onExportZip` to fetch full details
- `[MODIFY]` `client/src/pages/AdminPages/PaymentInPage.tsx` — apply same pattern
- `[MODIFY]` `client/src/pages/AdminPages/PaymentOutPage.tsx` — apply same pattern
- `[MODIFY]` `client/src/pages/AdminPages/RTOPaymentsPage.tsx` — apply same pattern
- `[MODIFY]` `client/src/pages/AdminPages/InsurancePaymentsPage.tsx` — apply same pattern
- `[MODIFY]` `client/src/pages/AdminPages/ExpensesPage.tsx` — apply same pattern

**Permissions / Role Gate:**
- No change — export is UI-only action, already admin/staff gated by the page

**Edge Cases:**
- If fetching file detail fails for one file during ZIP generation, skip that file and show a warning toast
- Large ZIPs (20+ files) may take time — show a loading state on the export button

---

### TASK A8 — Pagination: 5 Rows Per Page, All Pages, Fixed Layout
**Type:** Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** None

**What to do:**
1. **UsersPage.tsx already has pagination** with 5/10/20 options and server-side range — use this as the reference implementation
2. Audit every admin list page:
   - `CustomersPage.tsx` — uses `DataTable` component. Check if DataTable has built-in pagination. If yes, configure `defaultPageSize={5}`. If no, add the `Pagination` component from `UsersPage.tsx`
   - `FilesPage.tsx` — currently loads 100 rows client-side (`filesApi.list(1, 100, ...)`). Change to server-side: add `page` and `limit=5` state, reload on page change
   - `PaymentInPage.tsx`, `PaymentOutPage.tsx`, `RTOPaymentsPage.tsx`, `InsurancePaymentsPage.tsx`, `ExpensesPage.tsx`, `AdvancesPage.tsx` — check and fix each
   - `DealersPage.tsx`, `BrokersPage.tsx` — add pagination if missing
3. Copy the `Pagination` component function from `UsersPage.tsx` (lines 91–126) into `client/src/components/app/Pagination.tsx` as a shared reusable component. Then use it everywhere instead of duplicating.
4. When any filter is applied (status filter, type filter, search), reset `page` to 1: `setPage(1)` in filter onChange handlers
5. Do NOT render empty ghost rows — show only actual data rows. Table height should be natural, not fixed.

**DB Changes:**
None — backend already supports `page` and `limit` params on all endpoints

**Component Changes:**
- `[NEW]` `client/src/components/app/Pagination.tsx` — shared pagination component
- `[MODIFY]` `client/src/pages/AdminPages/FilesPage.tsx` — switch from `limit=100` to `page+limit=5` server-side
- `[MODIFY]` `client/src/pages/AdminPages/CustomersPage.tsx` — add/configure pagination
- `[MODIFY]` `client/src/pages/AdminPages/PaymentInPage.tsx` — add pagination
- `[MODIFY]` `client/src/pages/AdminPages/PaymentOutPage.tsx` — add pagination
- `[MODIFY]` `client/src/pages/AdminPages/RTOPaymentsPage.tsx` — add pagination
- `[MODIFY]` `client/src/pages/AdminPages/InsurancePaymentsPage.tsx` — add pagination
- `[MODIFY]` `client/src/pages/AdminPages/ExpensesPage.tsx` — add pagination
- `[MODIFY]` `client/src/pages/AdminPages/AdvancesPage.tsx` — add pagination
- `[MODIFY]` `client/src/pages/AdminPages/DealersPage.tsx` — add pagination
- `[MODIFY]` `client/src/pages/AdminPages/BrokersPage.tsx` — add pagination

**Permissions / Role Gate:**
- No change — pagination is purely UI/UX

**Edge Cases:**
- If total records < 5, still show pagination controls but "Previous" and "Next" are disabled
- If backend returns fewer rows than expected (e.g., last page has 2 items), render 2 rows only — no ghost rows

---

### TASK A9 — Company Settings: Verify DB Persistence
**Type:** Bug Fix (verify)  
**Complexity:** LOW  
**Depends On:** None

**What to do:**
1. `CompanySettingsPage.tsx` already has full load/save logic using `companySettingsApi.get()`, `.create()`, `.update()` (already working per the codebase analysis)
2. Backend exists at `server/backend/routes/admin/company_settings.py`
3. **What to verify:** Open the company settings page in browser. Fill in company name and mobile, click Save. Refresh the page. If data reloads — it's working. If not:
   - Check `GET /api/v1/settings/company/` in backend — ensure it returns the stored record
   - Check the `master_company_profile` table exists in DB (check `database/database/` migration files)
   - If table missing, find which migration creates it and verify it was run
4. If everything loads correctly, A9 is already done — mark as verified
5. If broken: fix the `company_settings.py` upsert logic

**DB Changes:**
None (table should exist from migrations)

**Component Changes:**
- No changes expected unless bug is confirmed during verification

**Permissions / Role Gate:**
- Admin only — `get_current_admin` already in place

**Edge Cases:**
- Only one record should exist (upsert pattern). Ensure backend uses `ON CONFLICT DO UPDATE` or checks for existing record before inserting.

---

### TASK A10 — Company Bank Account Page Enhancements (T4)
**Type:** New Feature  
**Complexity:** LOW  
**Depends On:** T4

**What to do:**
1. Run migration to add missing fields to `master_company_bank`:
   ```sql
   ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);
   ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
   ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
   ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
   ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS notes TEXT;
   ```
2. Save as `database/database/024_bank_account_fields.sql`
3. In `server/backend/routes/admin/bank_accounts.py`:
   - Add new fields to `BankAccountCreate` and `BankAccountUpdate` Pydantic schemas
   - Add new fields to `_serialize()` function
   - Update the `MasterCompanyBank` SQLAlchemy model in `models.py`
4. In `client/src/pages/AdminPages/BankAccountsPage.tsx`:
   - Add `account_holder_name`, `branch_name`, `upi_id`, `is_primary`, `notes` fields to the create/edit modal
   - Show `upi_id` prominently in the bank list card — it's the most used payment method in India
   - Show `is_primary` as a star/badge in the list
5. In payment creation forms (staff side — covered in staff plan), update bank dropdown to show `bank_name + account_number + upi_id`

**DB Changes:**
```sql
-- 024_bank_account_fields.sql
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE master_company_bank ADD COLUMN IF NOT EXISTS notes TEXT;
```

**Component Changes:**
- `[NEW]` `database/database/024_bank_account_fields.sql`
- `[MODIFY]` `server/backend/models.py` — add new columns to `MasterCompanyBank` model
- `[MODIFY]` `server/backend/routes/admin/bank_accounts.py` — update schemas + serializer
- `[MODIFY]` `client/src/pages/AdminPages/BankAccountsPage.tsx` — add new fields to modal + list display

**Permissions / Role Gate:**
- Admin: Full CRUD (already enforced with `get_current_admin`)
- Staff: read-only via `GET /api/v1/settings/banks/` (no auth guard on list endpoint — acceptable)

**Edge Cases:**
- Only one bank can have `is_primary = TRUE`. On create/update, if `is_primary = true`, set all other banks `is_primary = false` first
- `upi_id` validation: if provided, must match `[a-zA-Z0-9._-]+@[a-zA-Z]+` pattern

---

### TASK A12 — Admin Can Edit Other Users' Details
**Type:** New Feature  
**Complexity:** LOW  
**Depends On:** None

**What to do:**
1. Admin can already edit users via `UsersPage.tsx` Edit modal (first_name, last_name, phone, role, is_active)
2. This task is about adding "Edit Details" button directly from the **profile view** (UserDetailPage, CustomerDetailPage)
3. In `client/src/pages/AdminPages/UserDetailPage.tsx`:
   - Add "Edit Details" button in the page header (visible only if `role === 'admin'`)
   - Clicking opens an edit modal (reuse the same form as UsersPage Edit modal)
   - On save: call `PUT /api/v1/settings/users/{id}` (already exists in `users_settings.py`)
4. In `client/src/pages/AdminPages/CustomerDetailPage.tsx`:
   - Add "Edit Customer" button in header (admin only)
   - Opens edit modal: full_name, email, mobile_1, mobile_2, address, city, state, pincode, aadhar_number, pan_number, customer_type
   - On save: call `PUT /api/v1/customers/{id}` — check if this endpoint exists in `customers.py`, if not, add it
5. All changes must be logged via `record_dashboard_event()` in the backend handler

**DB Changes:**
None

**Component Changes:**
- `[MODIFY]` `client/src/pages/AdminPages/UserDetailPage.tsx` — add Edit Details button + modal
- `[MODIFY]` `client/src/pages/AdminPages/CustomerDetailPage.tsx` — add Edit Customer button + modal
- `[MODIFY]` `server/backend/routes/admin/customers.py` — verify/add `PUT /{customer_id}` endpoint

**Permissions / Role Gate:**
- Frontend: check `localStorage.getItem('user_role') === 'admin'` before showing Edit button
- Backend: `get_current_admin` dependency on update endpoints

**Edge Cases:**
- Do NOT allow admin to change another user's password from this view — password reset is separate (already in UsersPage)
- Do NOT expose Aadhar/PAN number in edit form unless admin has confirmed identity — show as masked by default, with "Show" button
- Email field in edit should be read-only (email is the login identifier)

---

### TASK A13 — Soft Delete Users + Filters + Deleted Users List
**Type:** New Feature  
**Complexity:** MEDIUM  
**Depends On:** T7

**What to do:**

**Step 1 — DB migration:**
```sql
-- 026_user_soft_delete.sql
ALTER TABLE system_user ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE system_user ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE system_user ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
```

**Step 2 — Backend:**
1. In `server/backend/routes/admin/users_settings.py`:
   - Update `list_users` endpoint to accept `filter` query param: `all | active | inactive | deleted`
   - `active` → `is_active=True AND is_deleted=False`
   - `inactive` → `is_active=False AND is_deleted=False`
   - `deleted` → `is_deleted=True`
   - Default (no filter) → `is_deleted=False` (exclude deleted from normal view)
   - Add `DELETE /api/v1/settings/users/{id}` endpoint for soft delete:
     ```python
     user.is_deleted = True
     user.deleted_at = datetime.utcnow()
     user.is_active = False
     ```
   - Add `POST /api/v1/settings/users/{id}/restore` endpoint:
     ```python
     user.is_deleted = False
     user.is_active = True
     user.deleted_at = None
     ```
2. In `server/backend/routes/login.py` → after successful login, add check:
   ```python
   if user.is_deleted:
       raise HTTPException(403, "This account has been deleted. Contact admin.")
   ```

**Step 3 — Frontend:**
1. In `UsersPage.tsx`:
   - Add filter tabs above the table: `All | Active | Inactive | Deleted`
   - Pass selected filter to `usersSettingsApi.list()` API call
   - When filter = `Deleted`, show extra column "Deleted On" and a "Restore" button instead of Edit/Deactivate
   - Add "Delete User" button in each row (admin only) — shows confirmation dialog: "This will deactivate the user. They will not be able to log in. Proceed?"
   - On confirm: call `DELETE /api/v1/settings/users/{id}`
   - When filter changes, reset `page` to 1

**DB Changes:**
```sql
-- 026_user_soft_delete.sql
ALTER TABLE system_user ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE system_user ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE system_user ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
```

**Component Changes:**
- `[NEW]` `database/database/026_user_soft_delete.sql`
- `[MODIFY]` `server/backend/models.py` — add `is_deleted`, `deleted_at`, `deletion_reason` to `SystemUser` model
- `[MODIFY]` `server/backend/routes/admin/users_settings.py` — add filter param, delete endpoint, restore endpoint
- `[MODIFY]` `server/backend/routes/login.py` — block deleted users from logging in
- `[MODIFY]` `client/src/pages/AdminPages/UsersPage.tsx` — filter tabs, delete button, restore button, confirmation dialog

**Permissions / Role Gate:**
- Delete/Restore: admin only (`get_current_admin` on both endpoints)
- Staff/Accountant cannot delete users

**Edge Cases:**
- Admin cannot delete their own account via this flow — check `current_user.id != user_id` before allowing delete
- Deleted user's `email` should be scrambled to free the unique constraint: `email = 'deleted_' || id || '@deleted.autonidhi'` — do this in the backend handler
- File records, payment records linked to a deleted user should remain intact — do NOT cascade delete

---

### TASK A14 — Review Desk Phase Approvals Enhancement
**Type:** New Feature + Critical Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** T7 (account deletion flow), T1 (staff change requests)

**Confirmed State of `AdminReviewDeskPage.tsx` (159 lines, 7,375 bytes):**

| Issue | Location | Impact |
|---|---|---|
| GET calls `/admin/modifications/pipeline` | Line 27 | Wrong path — returns 404 every time |
| POST calls `/admin/modifications/pipeline/{id}/evaluate` | Line 65 | Wrong path — approve/reject never saved |
| localStorage fallback on GET failure | Lines 31–49 | Fake hardcoded tickets shown to admin |
| localStorage fallback on POST failure | Lines 69–77 | Approval only saved locally, not to DB |
| Only 2 statuses: `approve` / `reject` | Line 65 | Missing `verification`, `in_progress`, `completed` |
| Jargon column headers | Lines 95–101 | "Data Target Node", "Target Identifier Reference", "Actions Workspace" |
| No filter tabs | — | Cannot filter by role (staff vs accountant) or by status |
| No admin notes field | — | Admin cannot add context when changing status |
| No pagination | — | All tickets in one table, no limit |
| `window.confirm()` for approval | Line 60 | Poor UX — no confirmation modal |

**What to do:**

**Step 1 — Fix backend endpoint path:**
The existing `modifications.py` router uses `/api/v1/modifications/` prefix. Verify the correct routes:
1. Open `server/backend/routes/admin/modifications.py` — find `GET /` (list all) and `PATCH /{id}/status` endpoints
2. The current page calls `/admin/modifications/pipeline` (wrong) and `/admin/modifications/pipeline/{id}/evaluate` (wrong)
3. Fix the GET to call: `GET /api/v1/modifications/` (correct admin endpoint to list all)
4. Fix the POST to call: `PATCH /api/v1/modifications/{id}/status` with `{ status: 'approved' | 'rejected' | ... }`
5. Add `/my-requests` endpoint if not present (from S4) for staff/accountant to see their own

**Step 2 — Add intermediate statuses (DB migration):**
Run `026_modification_request_statuses.sql` (from DB plan):
```sql
ALTER TABLE modification_request DROP CONSTRAINT IF EXISTS modification_request_status_check;
ALTER TABLE modification_request ADD CONSTRAINT modification_request_status_check
  CHECK (status IN ('pending', 'verification', 'in_progress', 'approved', 'completed', 'rejected'));
```
Also add `admin_notes`, `reviewed_by`, `rejection_reason` columns.

**Step 3 — Update backend status endpoint:**
In `modifications.py`, update the PATCH endpoint:
```python
@router.patch("/{mod_id}/status")
def update_modification_status(
    mod_id: UUID,
    payload: StatusUpdatePayload,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_admin)
):
    req = db.query(ModificationRequest).filter(ModificationRequest.id == mod_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    req.status = payload.status
    req.admin_notes = payload.admin_notes
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.utcnow()
    if payload.status == 'rejected':
        req.rejection_reason = payload.rejection_reason
    # Send notification to submitter
    send_targeted_notification(
        db=db,
        target_user_id=req.submitted_by,
        message=f"Your modification request status changed to: {payload.status}",
        notification_type="general"
    )
    db.commit()
    return {"updated": True, "status": req.status}
```

Also add filter params to GET endpoint:
```python
@router.get("/")
def list_modifications(
    status: Optional[str] = None,
    submitted_by_role: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_admin)
):
```

**Step 4 — Full rewrite of `AdminReviewDeskPage.tsx`:**
1. **Remove ALL localStorage** fallback code (lines 31–49 and 69–77)
2. Fix GET endpoint to `api.get('/api/v1/modifications/')` with filter params
3. Fix status action to `api.patch('/api/v1/modifications/${id}/status', { status, admin_notes, rejection_reason })`
4. Add filter tabs row above the table:
   - `All | Pending | In Progress | Approved | Rejected`
   - `All Roles | Staff | Accountant | Customer`
5. Replace `window.confirm()` with an inline confirmation modal:
   - For status change: dropdown (Pending → Verification → In Progress → Approved → Completed / Rejected)
   - Admin notes textarea (optional)
   - Rejection reason textarea (required only when rejecting)
6. Replace jargon column headers with plain English:
   - "Data Target Node" → "Category"
   - "Target Identifier Reference" → "Reference"
   - "Modification Type" → "Type"
   - "Operational Justification Reason" → "Reason"
   - "Actions Workspace" → "Actions"
7. Add status stepper chips in each row showing current phase:
   `Pending` → `Verification` → `In Progress` → `Approved/Completed`
8. Add pagination (10 per page) — modification requests can accumulate fast
9. Add date submitted + submitter name + role badge in "Escalated By" column

**DB Changes:**
```sql
-- 026_modification_request_statuses.sql (in DB plan)
ALTER TABLE modification_request DROP CONSTRAINT IF EXISTS modification_request_status_check;
ALTER TABLE modification_request ADD CONSTRAINT modification_request_status_check
  CHECK (status IN ('pending', 'verification', 'in_progress', 'approved', 'completed', 'rejected'));
ALTER TABLE modification_request ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE modification_request ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES system_user(id);
ALTER TABLE modification_request ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE modification_request ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
```

**Component Changes:**
- `[NEW]` `database/database/027_modification_request_statuses.sql`
- `[MODIFY]` `server/backend/routes/admin/modifications.py`
  - Fix GET list endpoint (add filter params, pagination)
  - Add/fix PATCH status endpoint (new statuses, admin_notes, notification send)
  - Add GET `/my-requests` for staff/accountant
- `[MODIFY]` `client/src/pages/AdminPages/AdminReviewDeskPage.tsx`
  - Fix API endpoints (remove wrong paths)
  - Remove all localStorage fallback
  - Add filter tabs (status + role)
  - Replace `window.confirm()` with inline status change modal
  - Simplify all column headers
  - Add status stepper chips
  - Add pagination

**Permissions / Role Gate:**
- Only admin can change request status (`get_current_admin` on PATCH endpoint)
- Staff/Accountant can only VIEW their own submitted requests via `/my-requests`

**Edge Cases:**
- Cannot move status backward (e.g., from `approved` back to `pending`) — enforce in frontend and backend
- Rejection reason is mandatory when status = `rejected` — block form submit if empty
- If `request_type = 'account_deletion'` and admin approves, trigger soft delete inline
- Show "No pending requests" empty state when queue is clear

---

## Execution Order (Recommended)

| Order | Task | Why First |
|---|---|---|
| 1 | A8 — Pagination shared component | Needed by A1, A3, A5. Creates reusable `Pagination.tsx` |
| 2 | A10 — Bank account DB fields | DB migration, no frontend dependencies |
| 3 | A13 — User soft delete DB fields | DB migration needed by A14 |
| 4 | A14 — Review Desk DB migration | DB migration, do before frontend |
| 5 | A2/A7 — File click drawer | Backend endpoint needed by A6 |
| 6 | A6 — PDF export fix | Depends on A2 detail endpoint |
| 7 | A5 — Customer type filter | Low-risk, self-contained |
| 8 | A3 — Customer profile row click | Verify existing implementation |
| 9 | A4/A11 — Last login verify | Verify then fix if needed |
| 10 | A9 — Company settings verify | Verify, likely no changes |
| 11 | A12 — Edit users from profile | Depends on A3 |
| 12 | A13 — Soft delete frontend | DB done in step 3 |
| 13 | A14 — Review desk frontend | DB done in step 4 |
| 14 | A1 — Analytics page | Highest complexity, do last |

## Verification Plan

### Automated
- After each backend endpoint change: test with `curl` or FastAPI `/docs` swagger UI
- Verify DB migrations with `SELECT column_name FROM information_schema.columns WHERE table_name = 'master_company_bank'`

### Manual
1. A2: Click a file number in FilesPage — drawer should slide in from right. Click Escape — drawer closes.
2. A5: Set customer type filter to "Business" — only business customers appear. Pagination shows "Page 1 of X".
3. A8: On any page with 7+ records — page 1 shows exactly 5, clicking Next shows remaining.
4. A13: Create a test user, click Delete, confirm — user disappears from Active list, appears in Deleted list. Verify that user cannot log in.
5. A14: Submit a modification request as Staff, log in as Admin, change status to "In Progress" — staff account should see notification.
6. A1: Open `/analytics` — charts render with real data (not zeros unless DB is empty).
