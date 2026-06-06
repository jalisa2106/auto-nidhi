# Staff (Data Entry) Implementation Plan

## Overview
Staff role is identified as `Data_Entry` in DB and `data_entry` / `staff` in localStorage.
This plan covers all 10 Staff tasks (S1–S10).

**Critical pre-read: Codebase Reality**

Before executing any task, understand these confirmed facts:

| Finding | File | Impact |
|---|---|---|
| Staff dashboard links go to `/data-entry/*` routes | `DataEntryDashboardPage.tsx` L174-176 | These routes DO NOT EXIST in App.tsx (App uses `/staff/*`) |
| Staff CustomersPage uses MOCK DATA | `DataEntryPages/CustomersPage.tsx` L7-10 | Completely disconnected — must be rewritten |
| Staff FilesPage navigates to `/data-entry/files/:id` | `DataEntryPages/FilesPage.tsx` L418 | This route doesn't exist — broken |
| StaffModificationsPage calls wrong endpoint | `StaffModificationsPage.tsx` L34 | Calls `/customer/modifications` (wrong) — falls back to localStorage |
| RequestsPage has hardcoded staff UUIDs | `RequestsPage.tsx` L75-80 | Breaking for any real staff user |
| Dashboard backend NOT role-scoped | `dashboard.py` L381-400 | Staff sees ALL files/customers (should see own only) |
| Staff FilesPage loads 200 rows client-side | `DataEntryPages/FilesPage.tsx` L127 | Should be paginated server-side |
| Dashboard uses `/data-entry/` links | `DataEntryDashboardPage.tsx` L174 | Should be `/staff/` |

**DO NOT skip these — they are breaking issues that will appear in every task.**

---

## TASK S1 — Fix All Broken Route References in Staff Dashboard
**Type:** Critical Bug Fix  
**Complexity:** LOW  
**Depends On:** Nothing — must be done FIRST

**Root Cause:**
`DataEntryDashboardPage.tsx` has Quick Actions links and navigation pointing to `/data-entry/*` (L174, L175, L181, L195, L207, L219, L278–282). These routes **do not exist** in `App.tsx`. App.tsx staff routes use `/staff/*` prefix.

**What to do:**
1. Open `client/src/pages/DataEntryPages/DataEntryDashboardPage.tsx`
2. Replace ALL occurrences of `/data-entry/` with `/staff/`:
   - L174: `to="/data-entry/files"` → `to="/staff/files"`
   - L175: `to="/data-entry/customers"` → `to="/staff/customers"`
   - L181: `onClick={() => navigate('/data-entry/files')}` → `/staff/files`
   - L195: Same → `/staff/files`
   - L207: `onClick={() => navigate('/data-entry/customers')}` → `/staff/customers`
   - L219: same → `/staff/files`
   - L237: `to="/data-entry/files"` → `to="/staff/files"`
   - L245: `onClick={() => navigate('/data-entry/files')}` → `/staff/files`
   - L278: `to: '/data-entry/files'` → `/staff/files`
   - L279: `to: '/data-entry/customers'` → `/staff/customers`
   - L280: `to: '/data-entry/payments/in'` → `/staff/payments/in`
   - L281: `to: '/data-entry/payments/out'` → `/staff/payments/out`
   - L282: `to: '/data-entry/expenses'` → `/staff/expenses`
   - L305: `to="/data-entry/files"` → `/staff/files`
   - L322: `onClick={() => navigate('/data-entry/files/${f.id}')}` → `/staff/files/${f.id}` (use file drawer from A2 instead)
3. Also fix the "Manage Files" / "Manage Customers" buttons in the welcome banner
4. Verify `DashboardPage.tsx` inside `DataEntryPages/` (currently stub — 3287 bytes) — it imports `DataEntryDashboardPage` or `DashboardPage`. Check it uses the correct paths.

**Files Changed:**
- `[MODIFY]` `client/src/pages/DataEntryPages/DataEntryDashboardPage.tsx` — replace all `/data-entry/` with `/staff/`
- `[MODIFY]` `client/src/pages/DataEntryPages/DashboardPage.tsx` — verify it renders `DataEntryDashboardPage`

**Verification:**
- Log in as staff → all Quick Actions links should work without redirecting to home page

---

## TASK S2 — Rewrite Staff CustomersPage (Scoped to Own Customers, Correct Permissions)
**Type:** Critical Bug Fix + Feature  
**Complexity:** HIGH  
**Depends On:** S1 (routes fixed)

**Root Cause:**
`DataEntryPages/CustomersPage.tsx` (53 lines total) uses **hardcoded `mockCustomers` array** — no API calls, no real data, no pagination. Additionally, the old plan had 3 confirmed errors that must be fixed per the architectural thinking doc (T1):

> ❌ **OLD (WRONG):** Staff sees ALL customers
> ✅ **CORRECT (T1):** Staff sees only customers whose files have `assigned_to = staff.id`
>
> ❌ **OLD (WRONG):** Staff can create customers — "Add Customer" button present
> ✅ **CORRECT (T1):** Staff CANNOT create customers. Customers self-register or are created by Admin. Remove Add Customer button entirely.
>
> ❌ **OLD (WRONG):** 5 rows per page
> ✅ **CORRECT:** 10 rows per page for staff customer list (explicitly requested)

**What to do:**

**Step 1 — Backend (scope customers to staff):**
1. In `server/backend/routes/admin/customers.py`, the `GET /api/v1/customers/` endpoint currently returns ALL customers.
2. Add role-based scoping: when called by a `Data_Entry` role user, filter by customers who have at least one file with `assigned_to = current_user.id`:
```python
@router.get("/")
def list_customers(
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    customer_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff)
):
    role_name = current_user.role.role_name if current_user.role else ''
    query = db.query(Customer)

    # SCOPE: Staff only sees their own customers (via file assignment)
    if role_name == 'Data_Entry':
        staff_customer_ids = db.execute(
            text("""
            SELECT DISTINCT customer_id FROM file_record
            WHERE assigned_to = :staff_id AND is_deleted = FALSE
            """),
            {"staff_id": str(current_user.id)}
        ).scalars().all()
        query = query.filter(Customer.id.in_(staff_customer_ids))

    # Admin sees all customers (no extra filter)
    if search:
        query = query.filter(Customer.full_name.ilike(f"%{search}%"))
    if customer_type:
        query = query.filter(Customer.customer_type == customer_type)

    total = query.count()
    customers = query.offset((page - 1) * limit).limit(limit).all()
    return {"data": [serialize(c) for c in customers], "total": total, "page": page, "limit": limit}
```
3. Ensure the endpoint returns: `id`, `full_name`, `mobile_1`, `mobile_2`, `email`, `city`, `state`, `customer_type`, `created_at`, active file count

**Step 2 — Frontend rewrite:**
Replace `DataEntryPages/CustomersPage.tsx` entirely:
```tsx
// Key features needed:
// 1. Real API call: GET /api/v1/customers/?page=1&limit=10&search=
// 2. Server-side pagination — 10 rows per page (NOT 5 — staff customer page is 10)
// 3. Search box — debounced 300ms — resets to page 1
// 4. Filter tabs: All | Individual | Business
// 5. NO "Add Customer" button — staff cannot create customers
// 6. Clicking customer name/row → navigate('/staff/customers/:id')
// 7. "My Customers" heading — makes clear it's their scoped list
```

**Table columns:**
`#` | `Name (clickable)` | `Mobile` | `City/State` | `Type badge` | `Active Files` | `Member Since`

**If staff has no customers yet** (no files assigned to them):
- Show empty state: "No customers assigned to you yet. Create a file for a customer to get started."
- Link to `/staff/files` → Create New File button

**Step 3 — Customer profile route for staff:**
1. Add route in `App.tsx`: `<Route path="/staff/customers/:id" element={<CustomerDetailPage />} />`
   - `CustomerDetailPage.tsx` is in `AdminPages/` — staff can reuse it with role-based button visibility
   - In `CustomerDetailPage.tsx`: show "Edit" / "Delete" buttons only if `role === 'admin'`
2. Staff profile view of customer shows: personal details, allocated files, document status, payment summary
3. In `CustomerDetailPage.tsx`, also show the customer's uploaded documents with **Verify/Reject buttons** for staff (from document verification workflow — F5 in future plan, but document list must be visible now)

**DB Changes:**
None — scoping done at query level using existing `file_record.assigned_to` FK

**Files Changed:**
- `[MODIFY]` `client/src/pages/DataEntryPages/CustomersPage.tsx` — complete rewrite (scoped, no Add Customer, 10 rows)
- `[MODIFY]` `server/backend/routes/admin/customers.py` — add role-based scoping when role = Data_Entry
- `[MODIFY]` `client/src/App.tsx` — add `/staff/customers/:id` route
- `[MODIFY]` `client/src/pages/AdminPages/CustomerDetailPage.tsx` — hide Edit/Delete buttons for non-admin

**Permissions / Role Gate:**
- Staff CANNOT create customers — no Add Customer button, no POST to `/api/v1/customers/`
- Staff CANNOT delete customers
- Staff sees ONLY their own customers (files assigned to them)
- Admin sees ALL customers (no scoping)

**Edge Cases:**
- Staff with no assigned files → empty state, not an error
- If a customer has files assigned to multiple staff, they appear in both staff members' lists (correct — different files can have different assignees)
- Search applies within scoped results only
- When filter changes → reset to page 1

---

## TASK S3 — Fix Staff Files Page: File Click Drawer + Pagination
**Type:** Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** A2 (FileDetailDrawer already created), A8 (Pagination component)

**Root Cause:**
`DataEntryPages/FilesPage.tsx` L418 navigates to `/data-entry/files/${r.id}` — route doesn't exist. Also loads 200 rows at once (L127) — should be paginated.

**What to do:**
1. Replace `navigate('/data-entry/files/${r.id}')` (L418 in FilesPage) with file drawer logic: `setDrawerFileId(r.id)` — same as admin A2
2. Add `<FileDetailDrawer fileId={drawerFileId} onClose={() => setDrawerFileId(null)} />` at bottom of component
3. Also fix dashboard recent files click (S1 — navigate to drawer not route)
4. Add server-side pagination:
   - Change `filesApi.list(1, 200, ...)` → `filesApi.list(page, 5, ...)`
   - Add `page` state + `setPage(1)` on filter changes
   - Add `<Pagination>` component at bottom of file table
5. Staff `FilesPage.tsx` already has Edit and Delete buttons — **keep Edit but REMOVE Delete button** for staff role. Staff should raise a modification request to delete (workflow reason: file deletion is irreversible, requires admin approval)
   - Remove the delete button `<Trash2>` (lines 488–499) entirely from staff view
   - Keep only Edit button

**Permissions Note:**
The backend `filesApi.remove()` calls `DELETE /api/v1/files/{id}` — check if this endpoint uses `get_current_admin` or `get_current_staff`. If it allows staff to delete, restrict it to admin-only at backend level.

**Files Changed:**
- `[MODIFY]` `client/src/pages/DataEntryPages/FilesPage.tsx`
  - Fix file click (line 418): use drawer
  - Change list call to page+limit=5
  - Add Pagination component
  - Remove delete button
- `[MODIFY]` `server/backend/routes/admin/files.py` — ensure DELETE endpoint uses `get_current_admin` not `get_current_staff`

**Verification:**
- Click file number → drawer slides in from right ✓
- Page 1 shows 5 files, Next shows next 5 ✓
- No delete button visible in staff view ✓

---

## TASK S4 — Fix StaffModificationsPage: Wrong Endpoint + localStorage Fallback
**Type:** Critical Bug Fix  
**Complexity:** LOW  
**Depends On:** Nothing

**Root Cause:**
`StaffModificationsPage.tsx` L34 calls `GET /customer/modifications` — this path is wrong. The correct endpoint based on the admin routes is `GET /api/v1/modifications/` (or similar in `modifications.py`). When this fails, it falls back to `localStorage` which is completely wrong for a production app.

**What to do:**

**Step 1 — Check actual backend endpoint:**
1. Open `server/backend/routes/admin/modifications.py` — find the actual route path
2. Identify: what is the GET endpoint to list modification requests? Is it:
   - `GET /api/v1/modifications/` — all requests (admin)
   - `GET /api/v1/modifications/my-requests` — staff's own submitted requests
3. If no "staff's own requests" endpoint exists, add one:
   ```python
   @router.get("/my-requests")
   def get_my_modification_requests(
       db: Session = Depends(get_db),
       current_user: SystemUser = Depends(get_current_staff)
   ):
       requests = db.query(ModificationRequest)\
           .filter(ModificationRequest.submitted_by == current_user.id)\
           .order_by(ModificationRequest.created_at.desc())\
           .all()
       return [serialize(r) for r in requests]
   ```

**Step 2 — Fix frontend:**
1. Replace `api.get('/customer/modifications')` with `api.get('/api/v1/modifications/my-requests')` (or the correct path)
2. **Remove ALL localStorage fallback code** (lines 38–54) — this is anti-pattern for production
3. Show a proper error state if the API call fails: "Failed to load requests. Please try again."
4. Fix the POST endpoint call (L79): `api.post('/customer/modifications', ...)` → `api.post('/api/v1/modifications/', { ... })`
5. The modal form has overly complex labels ("Administrative Justification Notes", "Modification Strategy") — simplify to plain English:
   - "Data Domain" → Select what to change (File Record / Customer Profile / Insurance)
   - "Target File" → Select from dropdown
   - "Request Type" → Update / Delete
   - "Reason" → Explain why (plain textarea)

**Files Changed:**
- `[MODIFY]` `client/src/pages/DataEntryPages/StaffModificationsPage.tsx`
  - Fix GET endpoint path
  - Fix POST endpoint path
  - Remove localStorage fallback
  - Simplify modal labels
- `[MODIFY]` `server/backend/routes/admin/modifications.py` — add `/my-requests` endpoint if missing

**Verification:**
- Modification request appears in the table after submission ✓
- No localStorage read/write happens ✓

---

## TASK S5 — Fix RequestsPage: Remove Hardcoded UUIDs
**Type:** Critical Bug Fix  
**Complexity:** LOW  
**Depends On:** Nothing

**Root Cause:**
`RequestsPage.tsx` lines 75-80 have hardcoded staff UUIDs:
```js
const consultantsList = [
  { id: 'c2d88add-f8a6-49c6-a9d4-6603ea46a459', email: 'james@gmail.com' },
  { id: '4d763da5-8ee8-4074-ac8e-fe98767c4ad8', email: 'dataentry@gmail.com' }
]
```
This means only those two specific users get their data filtered correctly. Any other staff sees all requests OR wrong requests.

**What to do:**

**Step 1 — Backend:**
1. The `serviceRequestsApi.list()` endpoint in `server/backend/routes/admin/service_requests.py` — check if it already filters by `current_user.id` (assigned staff) when called by a staff role
2. If NOT: add role-based filtering in the backend:
   ```python
   @router.get("/")
   def list_service_requests(
       db: Session = Depends(get_db),
       current_user: SystemUser = Depends(get_current_staff)
   ):
       role = current_user.role.role_name  # 'Admin', 'Data_Entry', 'Accountant'
       query = db.query(ServiceRequest)
       
       if role != 'Admin':
           # Staff only sees requests assigned to them or for their customers
           query = query.filter(ServiceRequest.consultant_id == current_user.id)
       
       return query.order_by(ServiceRequest.created_at.desc()).all()
   ```

**Step 2 — Frontend:**
1. Remove the entire `consultantsList` array (lines 75-80) from `RequestsPage.tsx`
2. Remove the client-side filtering logic (L98–100) that uses it
3. Remove the `currentEmail` and `matchedConsultant` logic
4. The backend now handles filtering — frontend just shows whatever the API returns
5. Keep the `userRole` check for UI differences (admin sees all, staff sees theirs)

**Files Changed:**
- `[MODIFY]` `client/src/pages/DataEntryPages/RequestsPage.tsx`
  - Remove hardcoded UUID list (lines 75-80)
  - Remove client-side filtering using those UUIDs (lines 98-100)
  - Remove `matchedConsultant` and `currentUserId` logic
- `[MODIFY]` `server/backend/routes/admin/service_requests.py` — add role-based filtering

**Verification:**
- Log in as a new staff user (not james@gmail.com or dataentry@gmail.com) → they should see their assigned service requests, not all requests ✓

---

## TASK S6 — Dashboard: Role-Scope Stats to Staff's Own Data
**Type:** Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** S1 (routes fixed)

**Root Cause:**
`dashboard.py` `_get_stats()` (line 29) queries ALL files and ALL customers with no `WHERE created_by_user_id = :staff_id` filter. Staff should see stats only for their files/customers.

**What to do:**

**Step 1 — Backend:**
The dashboard endpoint uses `get_current_staff` dependency — it receives the `current_admin` (actually current_user) object. Pass `current_user.id` into the helper functions.

Add staff-scoped variants of the stat queries:
```python
def _get_stats_for_staff(db: Session, staff_id: str):
    return db.execute(
        text("""
        SELECT
            COUNT(*) FILTER (WHERE assigned_to = :staff_id AND status NOT IN ('completed','cancelled')) AS active_files,
            COUNT(*) FILTER (WHERE assigned_to = :staff_id AND file_type = 'new_vehicle') AS new_files,
            COUNT(*) FILTER (WHERE assigned_to = :staff_id AND file_type = 'used_vehicle') AS used_files,
            COUNT(*) FILTER (WHERE assigned_to = :staff_id AND file_type = 'renewal') AS renewal_files,
            COUNT(*) FILTER (WHERE assigned_to = :staff_id AND status = 'completed') AS completed_files,
            COUNT(*) FILTER (WHERE assigned_to = :staff_id AND status = 'cancelled') AS cancelled_files,
            COUNT(DISTINCT customer_id) FILTER (WHERE assigned_to = :staff_id) AS total_customers
        FROM file_record
        WHERE is_deleted = FALSE
        """),
        {"staff_id": staff_id}
    ).mappings().first()
```

Similarly scope `_get_recent_files()` to `WHERE assigned_to = :staff_id`.

In `_build_dashboard()`, check role and call the right variant:
```python
role_name = current_admin.role.role_name if current_admin.role else ''
if role_name == 'Data_Entry':
    stats = dict(_get_stats_for_staff(db, str(current_admin.id)))
    recent_files = _get_recent_files_for_staff(db, str(current_admin.id))
else:
    stats = dict(_get_stats(db))
    recent_files = _get_recent_files(db)
```

**Step 2 — Frontend:**
The `DataEntryDashboardPage.tsx` already uses the same `/dashboard/stats` endpoint. Once backend scopes the data by role, the frontend will automatically show staff-scoped numbers. No frontend changes needed.

**Files Changed:**
- `[MODIFY]` `server/backend/routes/admin/dashboard.py`
  - Add `_get_stats_for_staff(db, staff_id)` function
  - Add `_get_recent_files_for_staff(db, staff_id, limit)` function
  - Update `_build_dashboard()` to branch based on `current_admin.role.role_name`

**Verification:**
- Log in as Staff A (assigned to 3 files) → dashboard shows "Active Files: 3"
- Log in as Admin → dashboard still shows all files ✓

---

## TASK S7 — Staff Cannot Delete Files — Backend Guard
**Type:** Security Fix  
**Complexity:** LOW  
**Depends On:** S3 (delete button removed from frontend)

**Why Needed:**
Even after removing the delete button from the staff UI (S3), staff could still call `DELETE /api/v1/files/{id}` directly. The backend must enforce this.

**What to do:**
1. Open `server/backend/routes/admin/files.py`
2. Find the `DELETE /{file_id}` endpoint
3. Change its dependency from `get_current_staff` to `get_current_admin`:
   ```python
   @router.delete("/{file_id}")
   def delete_file(
       file_id: UUID,
       db: Session = Depends(get_db),
       current_user: SystemUser = Depends(get_current_admin),  # ADMIN ONLY
   ):
   ```
4. Also check `PUT /{file_id}` — staff SHOULD be able to edit file status/type/remarks — keep as `get_current_staff`
5. Similarly check payment_out DELETE and commission DELETE — these should all be admin-only

**Files Changed:**
- `[MODIFY]` `server/backend/routes/admin/files.py` — change DELETE dependency to `get_current_admin`
- `[MODIFY]` `server/backend/routes/admin/payments_out.py` — verify DELETE uses `get_current_admin`
- `[MODIFY]` `server/backend/routes/admin/commissions_out.py` — verify DELETE uses `get_current_admin`

**Verification:**
- Using an API client (curl / Postman), call `DELETE /api/v1/files/{id}` with a Staff JWT token → should receive 403 Forbidden ✓

---

## TASK S8 — Staff Payment Pages: Fix Stubs
**Type:** Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** A8 (Pagination component from admin plan)

**Root Cause:**
Staff payment pages in `DataEntryPages/` are tiny stubs:
- `PaymentInPage.tsx` — 89 bytes (just a placeholder)
- `PaymentOutPage.tsx` — 90 bytes (just a placeholder)
- `RTOPaymentsPage.tsx` — 202 bytes (just a placeholder)
- `InsurancePaymentsPage.tsx` — 220 bytes (just a placeholder)
- `ExpensesPage.tsx` — 192 bytes (just a placeholder)

These should show real data. The `AdminPages/` versions of these pages are fully implemented. 

**What to do:**
For each stub file, replace the stub content with a properly functioning component. The pattern is the same:
1. Fetch data from the existing admin API endpoints (staff JWT is accepted by `get_current_staff` dependency)
2. Show table with pagination (5 per page)
3. Allow staff to Create new records (POST)
4. Staff cannot Delete — remove delete buttons
5. Use `FileDetailDrawer` for any file# click

**Specific pages and their API endpoints:**

| Staff Page | API Endpoint | Staff Can | Staff Cannot |
|---|---|---|---|
| `PaymentInPage.tsx` | `GET /api/v1/payments-in/` | Create, View | Delete |
| `PaymentOutPage.tsx` | `GET /api/v1/payments-out/` | Create, View | Delete |
| `RTOPaymentsPage.tsx` | `GET /api/v1/rto-payments/` | Create, View | Delete |
| `InsurancePaymentsPage.tsx` | `GET /api/v1/insurance-payments/` | Create, View | Delete |
| `ExpensesPage.tsx` | `GET /api/v1/expenses/` | Create, View | Delete |

**Implementation approach:** Copy the `AdminPages/` version of each page, strip out delete functionality, and update the role check (`isAdmin` → `false`). Do NOT modify the admin pages.

**Files Changed:**
- `[MODIFY]` `client/src/pages/DataEntryPages/PaymentInPage.tsx` — replace stub with full component
- `[MODIFY]` `client/src/pages/DataEntryPages/PaymentOutPage.tsx` — replace stub
- `[MODIFY]` `client/src/pages/DataEntryPages/RTOPaymentsPage.tsx` — replace stub
- `[MODIFY]` `client/src/pages/DataEntryPages/InsurancePaymentsPage.tsx` — replace stub
- `[MODIFY]` `client/src/pages/DataEntryPages/ExpensesPage.tsx` — replace stub

**Verification:**
- Log in as staff → navigate to `/staff/payments/in` → real payment data shows, 5 per page ✓
- No delete button visible ✓
- Create new payment → appears in list ✓

---

## TASK S11 — Staff Commission IN/OUT Pages: Create Missing Pages
**Type:** Critical Bug Fix (Missing Pages)  
**Complexity:** MEDIUM  
**Depends On:** A8 (Pagination component), S8 (payment stubs done)

**Root Cause (Confirmed by file inspection):**
The staff sidebar in `DataEntryLayout.tsx` has nav items for Commission IN (`/staff/commission/in`) and Commission OUT (`/staff/commission/out`). However:
- **No `CommissionInPage.tsx` exists** in `DataEntryPages/` folder — clicking the nav item leads to a blank/broken page
- **No `CommissionOutPage.tsx` exists** in `DataEntryPages/` folder — same issue
- `App.tsx` has NO routes registered for `/staff/commission/in` or `/staff/commission/out`

The `AdminPages/CommissionInPage.tsx` and `AdminPages/CommissionOutPage.tsx` ARE fully implemented and connected to real APIs (`commissionsInApi`, `commissionsOutApi`).

**What to do:**

**Step 1 — Create staff CommissionInPage:**
1. Create `client/src/pages/DataEntryPages/CommissionInPage.tsx`
2. Base it on `AdminPages/CommissionInPage.tsx` with these changes:
   - **Remove** the Delete button and `commissionsInApi.remove()` calls
   - **Keep** View and Create (staff can record commissions received)
   - **Keep** Export to PDF/Excel
   - **Keep** the file detail drawer on file# click
   - Set pagination to 5 per page (admin version loads 5000 — fix this)

**Step 2 — Create staff CommissionOutPage:**
1. Create `client/src/pages/DataEntryPages/CommissionOutPage.tsx`
2. Base it on `AdminPages/CommissionOutPage.tsx` with same changes:
   - Remove Delete, keep View + Create
   - Fix pagination to 5 per page

**Step 3 — Register routes in App.tsx:**
```tsx
// Add inside the staff route group:
<Route path="/staff/commission/in"  element={<DataEntryCommissionInPage />} />
<Route path="/staff/commission/out" element={<DataEntryCommissionOutPage />} />
```

**Step 4 — Verify DataEntryLayout.tsx nav links match the routes:**
- `/staff/commission/in` nav item label: "Commission IN"
- `/staff/commission/out` nav item label: "Commission OUT"

**Staff Permissions on Commission:**

| Action | Staff Can | Staff Cannot |
|---|---|---|
| View all commission records | ✅ | — |
| Create new Commission IN/OUT | ✅ | — |
| Edit existing records | ✅ | — |
| Delete records | ❌ | Must raise modification request |
| Export PDF/Excel | ✅ | — |

**Files Changed:**
- `[NEW]` `client/src/pages/DataEntryPages/CommissionInPage.tsx` — created from admin version, delete removed, pagination fixed to 5
- `[NEW]` `client/src/pages/DataEntryPages/CommissionOutPage.tsx` — same
- `[MODIFY]` `client/src/App.tsx` — add 2 new routes for `/staff/commission/in` and `/staff/commission/out`

**Verification:**
- Log in as staff → click "Commission IN" in sidebar → page loads with real data, 5 per page ✓
- Click "Commission OUT" in sidebar → page loads with real data ✓
- No delete button visible in either page ✓
- Create a Commission IN entry → appears in list ✓

---

## TASK S9 — Staff Dashboard: Add Quick Stats + Pending Actions
**Type:** Enhancement  
**Complexity:** LOW  
**Depends On:** S1 (routes fixed), S6 (stats scoped)

**Current State:**
`DataEntryDashboardPage.tsx` shows: KPI cards, File Pipeline, Quick Actions, Recent Files, Recent Activity.

**What to Add:**
1. **Pending Service Requests badge** on Quick Actions link — show count of unseen requests:
   ```tsx
   <Link to="/staff/requests">
     Service Requests
     {metrics.unseen > 0 && <span className="badge">{metrics.unseen}</span>}
   </Link>
   ```
2. **Pending Modification Requests count** — fetch from `/api/v1/modifications/my-requests` and show how many are still pending
3. **Overdue Requests Warning Banner** — already exists in `RequestsPage.tsx` but should also appear on the dashboard
4. **Insurance Expiring (staff-scoped)** — add a small card showing policies expiring in 30 days for the staff's assigned files

**Files Changed:**
- `[MODIFY]` `client/src/pages/DataEntryPages/DataEntryDashboardPage.tsx`
  - Add pending modification requests count (fetch from `/modifications/my-requests`, count pending)
  - Add pending service requests count (fetch from `/service-requests/`, count unseen)
  - Add overdue requests warning banner if any pending > 3 days old
  - Add "Pending Modifications: X" row in Quick Actions panel

**Verification:**
- Log in as staff → if there are 3 unseen service requests, Quick Actions shows badge "3" on Service Requests link ✓

---

## TASK S12 — Service Request Phase Updates by Staff
**Type:** New Feature  
**Complexity:** MEDIUM  
**Depends On:** S5 (hardcoded UUIDs removed), S1 (routes fixed)

**Root Cause (Gap Identified in Verification):**
The current `RequestsPage.tsx` shows service requests but staff can only VIEW them — there is no way for staff to update the status of a request through its lifecycle phases. Per the architectural thinking doc (T3) and user requirements, the workflow should be:

```
Pending → Verification → In Progress → Completed
                                ↓
                           Cancelled (at any point)
```

Currently: Only admin can change modification request statuses (A14). Service requests from customers have no phase workflow on the staff side at all.

**What to do:**

**Step 1 — Check existing backend endpoint:**
1. Open `server/backend/routes/admin/service_requests.py`
2. Check if a `PATCH /{id}/status` endpoint exists
3. If NOT, add one:
```python
@router.patch("/{req_id}/status")
def update_service_request_status(
    req_id: UUID,
    payload: dict,  # { "status": str, "staff_notes": str }
    db: Session = Depends(get_db),
    current_user: SystemUser = Depends(get_current_staff)
):
    req = db.query(ServiceRequest).filter(ServiceRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Service request not found")

    # Ensure staff can only update their own assigned requests
    role_name = current_user.role.role_name if current_user.role else ''
    if role_name == 'Data_Entry' and str(req.consultant_id) != str(current_user.id):
        raise HTTPException(403, "You can only update your own assigned requests")

    req.status = payload.get("status", req.status)
    req.staff_notes = payload.get("staff_notes", req.staff_notes)
    req.updated_at = datetime.utcnow()
    db.commit()

    # Notify the customer about status change
    send_targeted_notification(
        db=db,
        target_user_id=req.customer_user_id,
        message=f"Your service request has been updated to: {req.status}",
        notification_type="general"
    )
    return {"updated": True, "status": req.status}
```

4. Also add `staff_notes` column to `service_requests` table if not present:
```sql
-- Add to migration or run directly:
ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS staff_notes TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

**Step 2 — Frontend in `RequestsPage.tsx`:**
1. For each request row, add a status dropdown (only visible to the assigned staff):
   - Options: `Pending | Verification | In Progress | Completed | Cancelled`
   - Current status shown as a colored badge
2. Add a "Update Status" button next to each request that opens a small modal:
   - Status dropdown
   - Staff notes textarea (optional)
   - Save button → calls PATCH endpoint
3. On success: reload requests list + show toast "Status updated"
4. Customer is automatically notified (from backend send_targeted_notification)

**Status Badge Colors:**
- `pending` → amber
- `verification` → blue
- `in_progress` → indigo
- `completed` → green
- `cancelled` → red/gray

**Files Changed:**
- `[MODIFY]` `server/backend/routes/admin/service_requests.py` — add PATCH status endpoint
- `[MODIFY]` `client/src/pages/DataEntryPages/RequestsPage.tsx` — add status update dropdown + modal per request
- (Optional) Add `staff_notes` + `updated_at` columns to `service_requests` table via migration

**Verification:**
- Log in as staff → open a service request → change status to "In Progress" → customer receives notification ✓
- Log in as staff B → try to update a request assigned to staff A → 403 Forbidden ✓
- Customer portal shows updated status on their service request history ✓

---

## TASK S10 — Staff Profile: Update + Own Settings
**Type:** Bug Fix / Enhancement  
**Complexity:** LOW  
**Depends On:** Nothing

**Current State:**
`DataEntryPages/DataEntryProfilePage.tsx` (18,061 bytes) exists. `DataEntryPages/DataEntrySettingsPage.tsx` (14,294 bytes) also exists. Both need to be verified.

**What to do:**
1. Open `DataEntryProfilePage.tsx` — verify it:
   - Shows staff's own profile (first_name, last_name, email, phone, role)
   - Has an "Edit Profile" button that updates `first_name`, `last_name`, `phone_number`
   - Backend endpoint: `PUT /api/v1/profile/` (check `profile.py`)
   - Shows `last_login` (see A4 in admin plan)
2. Open `DataEntrySettingsPage.tsx` — verify it:
   - Has "Change Password" section
   - Calls `PUT /api/v1/auth/change-password` or `POST /api/v1/profile/change-password`
   - Does NOT expose any admin settings
3. Route `/staff/profile` and `/staff/settings` are already in `App.tsx` (lines 102-103) — both map to `AdminProfilePage` and `AdminSettingsPage` (wrong!) — they should map to `DataEntryProfilePage` and `DataEntrySettingsPage`

**Fix routing in App.tsx:**
```tsx
// CURRENT (wrong):
<Route path="/staff/profile"  element={<AdminProfilePage />} />
<Route path="/staff/settings" element={<AdminSettingsPage />} />

// CORRECT:
<Route path="/staff/profile"  element={<DataEntryProfilePage />} />
<Route path="/staff/settings" element={<DataEntrySettingsPage />} />
```

**Files Changed:**
- `[MODIFY]` `client/src/App.tsx` — fix `/staff/profile` and `/staff/settings` routes
- `[MODIFY]` `client/src/pages/DataEntryPages/DataEntryProfilePage.tsx` — verify/fix edit + last_login display
- `[MODIFY]` `client/src/pages/DataEntryPages/DataEntrySettingsPage.tsx` — verify change password works

**Verification:**
- Log in as staff, click Profile → DataEntryProfilePage shows (not AdminProfilePage) ✓
- Edit first_name and save → name updates in sidebar too ✓
- Change password → works without error ✓

---

## Execution Order (Recommended)

| Order | Task | Why |
|---|---|---|
| 1 | **S1** — Fix broken route references | Enables all navigation to work — zero code changes needed elsewhere |
| 2 | **S7** — Backend delete guard | Security fix — must be done before testing |
| 3 | **S5** — Remove hardcoded UUIDs from RequestsPage | Self-contained, easy win |
| 4 | **S4** — Fix StaffModificationsPage endpoint | Self-contained, removes localStorage anti-pattern |
| 5 | **S10** — Fix profile/settings routes in App.tsx | Easy, self-contained routing fix |
| 6 | **S2** — Rewrite Staff CustomersPage (scoped, no Add Customer, 10 rows) | Biggest rewrite — depends on S1 routes being fixed |
| 7 | **S3** — Fix Files Page: drawer + pagination + remove delete | Depends on A2 (drawer) and A8 (pagination) from admin plan |
| 8 | **S8** — Fix payment page stubs | Depends on A8 (pagination), benefits from S3 being done first |
| 9 | **S11** — Create Commission IN/OUT pages | Do after S8 — same pattern, missing files |
| 10 | **S12** — Service request phase updates by staff | Depends on S5 (UUIDs removed) |
| 11 | **S6** — Scope dashboard stats to staff | Depends on S1 |
| 12 | **S9** — Dashboard enhancements | Depends on S1, S5, S6 |

## Verification Plan

### Backend (run after each backend change)
```bash
# Test file delete as staff (should 403)
curl -X DELETE http://localhost:8000/api/v1/files/{file_id} \
  -H "Authorization: Bearer {staff_jwt}"

# Test dashboard stats scoping
curl http://localhost:8000/api/v1/dashboard/stats \
  -H "Authorization: Bearer {staff_jwt}"
# Should return only staff's file counts, not all files
```

### Manual Verification Checklist
1. S1: Log in as staff → click "All Files" → goes to `/staff/files` ✓
2. S2: Staff Customers page shows ONLY customers whose files are assigned to that staff ✓
3. S2: Staff sees 10 rows per page (not 5) ✓
4. S2: NO "Add Customer" button visible anywhere on staff customer page ✓
5. S2: Click customer name → opens `/staff/customers/:id` profile page ✓
6. S3: Click file number → drawer opens (not 404) ✓
7. S3: Files list shows 5 rows, has pagination controls ✓
8. S3: No delete button visible ✓
9. S4: Submit modification request → appears in table (from real API, not localStorage) ✓
10. S5: Log in as any staff user → service requests page shows their requests only ✓
11. S7: Try DELETE via API client with staff token → 403 Forbidden ✓
12. S8: `/staff/payments/in` → shows real payment data with pagination ✓
13. S10: `/staff/profile` → shows DataEntryProfilePage (not AdminProfilePage) ✓
14. S11: `/staff/commission/in` → Commission IN page loads with real data ✓
15. S11: `/staff/commission/out` → Commission OUT page loads with real data ✓
16. S11: No delete button on either commission page ✓
17. S12: Staff changes service request status → customer receives notification ✓
18. S12: Staff B cannot update Staff A's service request → 403 ✓
