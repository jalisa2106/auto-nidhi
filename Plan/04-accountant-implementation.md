# Accountant Implementation Plan

## Overview
8 tasks covering page rewrites, backend connections, permission enforcement, and UX improvements for the Accountant role.

**Pre-read: Codebase Reality**

| File | Status | Notes |
|---|---|---|
| `AccountantLayout.tsx` | ⚠️ Missing notifications | `BellRing` icon is static, no real notification panel or unread count |
| `DashboardPage.tsx` | 🔴 MOCK DATA | Uses hardcoded `mockFiles` + hardcoded stat values like `₹84.5L` |
| `FilesPage.tsx` | 🔴 MOCK DATA | Hardcoded 2 files, navigates to `/accountant/files/:id` (no route exists) |
| `PaymentInPage.tsx` | 🔴 MOCK DATA | Hardcoded 2 rows, local state only, creates nothing in DB |
| `PaymentOutPage.tsx` | 🔴 MOCK DATA | Same as PaymentIn — local state, no API |
| `RTOPaymentsPage.tsx` | ✅ Real (37KB) | Connected to actual API — verify only |
| `InsurancePaymentsPage.tsx` | ✅ Real (48KB) | Connected to actual API — verify only |
| `ExpensesPage.tsx` | ✅ Real (39KB) | Connected to actual API — verify only |
| `AdvancesPage.tsx` | ✅ Real (39KB) | Connected to actual API — verify only |
| `AccountantModificationsPage.tsx` | 🔴 Wrong endpoint | Calls `/customer/modifications` (wrong) + localStorage fallback |
| **No accountant backend routes folder** | 🔴 MISSING | Accountant uses admin routes directly (via `get_current_staff` dependency) |

**Key Finding:** No `/server/backend/routes/accountant/` folder exists. Accountant calls the same endpoints as admin/staff — the `get_current_staff` dependency allows all three roles. This is correct behavior — no separate accountant backend needed. We only need frontend fixes.

**Critical Finding in AccountantLayout.tsx:**
The `BellRing` icon (line 104) is purely decorative — it's not connected to the `NotificationPanel` or `notificationStore`. Accountant users receive no real notifications.

---

## TASK AC1 — Dashboard: Replace Mock Data with Real API
**Type:** Critical Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** Nothing — do FIRST

**Root Cause:**
`AccountantPages/DashboardPage.tsx` (76 lines) uses hardcoded:
- `mockFiles` array (3 items) → fake pipeline
- `₹84.5L` disbursed → fake financial total
- `₹6.2L` commission receivable → fake
- `18` insurance expiring → fake
- `mockNotifications` → fake

**What to do:**
Rewrite `DashboardPage.tsx` to use the same `/api/v1/dashboard/stats` endpoint the admin dashboard uses (already accessible via `get_current_staff`):

```tsx
export default function AccountantDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [financials, setFinancials] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('Accountant')

  useEffect(() => {
    // Read name from localStorage
    try {
      const u = JSON.parse(localStorage.getItem('an_current_user') || '{}')
      setUserName(u.first_name || 'Accountant')
    } catch {}

    // Fetch dashboard data
    api.get('/api/v1/dashboard/stats')
      .then(res => {
        setStats(res.data.stats || {})
        setFinancials(res.data.financials || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
```

**Dashboard layout — 4 real KPI cards:**
1. **Active Files** → `stats.active_files`
2. **Payment IN (MTD)** → `financials.payment_in` (formatted as ₹X.XL)
3. **Payment OUT (MTD)** → `financials.payment_out`
4. **Net Position (MTD)** → `financials.net_position` (green if +, red if -)

**Below KPI cards — 2 columns:**
- Left: Pipeline by status (real data from `/dashboard/stats` → `pipeline` array)
- Right: Insurance expiring soon (from `extended.insurance_payments_mtd` or fetch `/dashboard/insurance-expiring`)

**Files Changed:**
- `[MODIFY]` `client/src/pages/AccountantPages/DashboardPage.tsx` — complete rewrite with real API

**Verification:**
- Log in as accountant → dashboard shows real file counts and real ₹ amounts ✓

---

## TASK AC2 — FilesPage: Replace Mock Data + File Click Drawer
**Type:** Critical Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** A2 (FileDetailDrawer from admin plan), A8 (Pagination component)

**Root Cause:**
`AccountantPages/FilesPage.tsx` uses `mockFiles` (2 hardcoded rows). Accountants need read-only access to all files. Also navigates to `/accountant/files/:id` — route doesn't exist.

**What to do:**
Rewrite `FilesPage.tsx` to mirror the staff files page but with:
- **No Edit button** — accountant is read-only on files
- **No Delete button** — accountant cannot delete
- **No Create button** — accountant cannot create files
- File click → opens `FileDetailDrawer` (same as A2 in admin plan)

**Implementation:**
```tsx
export default function AccountantFilesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [typeF, setTypeF] = useState('')
  const [statusF, setStatusF] = useState('')
  const [drawerFileId, setDrawerFileId] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await filesApi.list(page, 5, statusF || undefined, typeF || undefined)
      setRows(Array.isArray(res.data) ? res.data : res.data?.data ?? [])
      setTotal(res.total || 0)
    } catch (e: any) {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [page, statusF, typeF])

  useEffect(() => { loadFiles() }, [loadFiles])
```

**Table columns:** File # (clickable → drawer) | Customer | Type | Status badge | Bank | Assigned | Created
**No Actions column** — accountant is read-only

**Files Changed:**
- `[MODIFY]` `client/src/pages/AccountantPages/FilesPage.tsx` — complete rewrite (real API, drawer, pagination, no CRUD buttons)

**Permissions Note:**
The backend `filesApi.list()` uses `get_current_staff` — accountant JWT is accepted. No backend change needed.

**Verification:**
- Log in as accountant → Files page shows real files, 5 per page ✓
- Click file number → drawer opens with full details ✓
- No Edit / Delete / Create buttons visible ✓

---

## TASK AC3 — Payment IN Page: Replace Mock Data with Real API
**Type:** Critical Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** A8 (Pagination component)

**Root Cause:**
`AccountantPages/PaymentInPage.tsx` uses `mockPaymentsIn` (2 hardcoded rows) and creates nothing in the DB.

**Accountant Permission on Payments:**
Accountant CAN:
- View all payment_in records
- Create new payment_in records (they are the ones who record receipts)
- Export PDF / CSV

Accountant CANNOT:
- Delete payment_in records — must raise a modification request (AC7)

**What to do:**
Replace the entire component. The `AdminPages/PaymentInPage.tsx` is fully implemented (11,164 bytes). Copy it and:
1. Remove the Delete button/action from the actions column
2. Keep Create (Record Payment IN) button — accountant CAN create
3. Keep Export functionality
4. Keep pagination (5 per page)
5. Keep file click → FileDetailDrawer (from A2)

**Files Changed:**
- `[MODIFY]` `client/src/pages/AccountantPages/PaymentInPage.tsx` — replace with working component (based on admin version, minus delete)

**Verification:**
- Payment IN page shows real records from DB, 5 per page ✓
- Create new payment → appears in list ✓
- No delete button ✓

---

## TASK AC4 — Payment OUT Page: Replace Mock Data with Real API
**Type:** Critical Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** A8 (Pagination component)

**Same approach as AC3** but for Payment OUT.

**Accountant Permission on Payment OUT:**
Accountant CAN:
- View all payment_out records
- Create new payment_out records

Accountant CANNOT:
- Delete payment_out records — must raise a modification request

**What to do:**
Replace the entire component using `AdminPages/PaymentOutPage.tsx` as the base, minus delete.

**Files Changed:**
- `[MODIFY]` `client/src/pages/AccountantPages/PaymentOutPage.tsx` — replace with working component (based on admin version, minus delete)

**Verification:**
- Payment OUT page shows real records, 5 per page ✓
- Create new payment out → appears in list ✓
- No delete button ✓

---

## TASK AC5 — AccountantLayout: Add Real Notification Bell
**Type:** Bug Fix  
**Complexity:** LOW  
**Depends On:** Nothing

**Root Cause:**
`AccountantLayout.tsx` line 104 shows `<BellRing size={18} />` as a static decorative icon. No `NotificationPanel` is mounted, no `notificationStore` is connected, and no unread badge appears. Accountants get no notifications.

**What to do:**
1. Import `NotificationPanel` from `../../components/app/NotificationPanel`
2. Import `unreadCount, subscribe, fetchNotifications` from `../../store/notificationStore`
3. Add state: `const [notifOpen, setNotifOpen] = useState(false)` and `const [notifCount, setNotifCount] = useState(0)`
4. In `useEffect`, call `fetchNotifications()` and subscribe to count changes
5. Replace the static `<BellRing>` with the full notification button + badge + panel (copy from `CustomerLayout.tsx` lines 151–201 — exact same pattern):
```tsx
<div style={{ position: 'relative' }}>
  <button
    id="notif-bell-btn"
    onClick={() => setNotifOpen(p => !p)}
    style={{ /* same styles as CustomerLayout */ }}
  >
    <BellRing size={18} />
  </button>
  {notifCount > 0 && (
    <span style={{ /* badge styles */ }}>
      {notifCount > 99 ? '99+' : notifCount}
    </span>
  )}
</div>
{notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
```

**Files Changed:**
- `[MODIFY]` `client/src/pages/AccountantPages/AccountantLayout.tsx`
  - Add imports: `NotificationPanel`, notification store functions
  - Add `notifOpen`, `notifCount` state
  - Add `useEffect` for notification subscription
  - Replace static `<BellRing>` with interactive bell + panel

**Verification:**
- Log in as accountant → bell icon shows, clicking opens NotificationPanel ✓
- If admin sends a notification to accountant → unread badge appears ✓

---

## TASK AC6 — AccountantModificationsPage: Fix Wrong Endpoint + Remove localStorage
**Type:** Critical Bug Fix  
**Complexity:** LOW  
**Depends On:** S4 (same fix as staff modifications — backend endpoint)

**Root Cause:**
Identical to the staff bug (S4 in staff plan):
- Line 32: `api.get('/customer/modifications')` → wrong path
- Line 67: `api.post('/customer/modifications', ...)` → wrong path
- Lines 36–51: localStorage fallback → anti-pattern
- Lines 74–99: localStorage on POST failure → anti-pattern
- Column labels are overly technical ("Ledger Segment / Core Target", "Transaction UUID Token / Voucher Reference", "Audit Trail & Rectification Justification")

**What to do:**
1. Fix GET endpoint: `api.get('/api/v1/modifications/my-requests')` (same fix as S4)
2. Fix POST endpoint: `api.post('/api/v1/modifications/', { entity_type, entity_id, request_type, reason })`
3. Remove ALL localStorage fallback code (lines 36-51 and 74-99)
4. Show proper error state on failure instead of localStorage fallback
5. Simplify column headers to plain English:
   - "Financial Target Scope" → "Category"
   - "Transaction ID / Reference Token" → "Reference / ID"
   - "Operation Scope" → "Type"
   - "Audit Trail Justification" → "Reason"
   - "Status" → unchanged
   - "Submitted" → unchanged
6. Simplify modal labels:
   - "Ledger Segment / Core Target" → "What to correct"
   - "Transaction UUID Token / Voucher Reference" → "Transaction ID / Reference"
   - "Adjustment Mode" → "Request Type"
   - "Audit Trail & Rectification Justification" → "Reason for correction"
7. Change entity type options to simpler names:
   - "Payment IN Ledger Row Transaction" → "Payment IN record"
   - "Payment OUT Ledger Row Transaction" → "Payment OUT record"
   - "Commission / Broker payout calculation value" → "Commission record"
   - "Advances Outstanding Balance Settlement State" → "Advance record"
8. Change button text: "Escalating balancing ticket..." → "Submitting..." and "Escalate Change to Admin" → "Submit to Admin"

**Files Changed:**
- `[MODIFY]` `client/src/pages/AccountantPages/AccountantModificationsPage.tsx`
  - Fix GET/POST API paths
  - Remove all localStorage fallback code
  - Simplify all labels

**Verification:**
- Submit a modification request → appears in the list from real API ✓
- Submit fails (API down) → shows error message, does NOT write to localStorage ✓

---

## TASK AC7 — Backend: Restrict Delete Endpoints for Accountant
**Type:** Security Fix  
**Complexity:** LOW  
**Depends On:** Nothing

**Why Needed:**
Even with no delete buttons in the UI, an accountant could call delete endpoints directly. Since accountant uses `get_current_staff` (same as admin+staff), the backend currently allows accountant to delete payment records.

**What to do:**
Check and update these backend endpoints to use `get_current_admin` instead of `get_current_staff`:
1. `DELETE /api/v1/payments-in/{id}` in `payments_in.py`
2. `DELETE /api/v1/payments-out/{id}` in `payments_out.py`
3. `DELETE /api/v1/rto-payments/{id}` in `rto_payments.py`
4. `DELETE /api/v1/insurance-payments/{id}` in `insurance_payments.py`
5. `DELETE /api/v1/expenses/{id}` in `expenses.py`
6. `DELETE /api/v1/advances/{id}` in `advances.py`
7. `DELETE /api/v1/commissions-in/{id}` in `commissions_in.py`
8. `DELETE /api/v1/commissions-out/{id}` in `commissions_out.py`

For each: change dependency from `get_current_staff` to `get_current_admin`.

**Note:** The `PATCH`/`PUT` endpoints should remain `get_current_staff` so accountant can still update records (e.g., fix an amount).

**Files Changed:**
- `[MODIFY]` `server/backend/routes/admin/payments_in.py`
- `[MODIFY]` `server/backend/routes/admin/payments_out.py`
- `[MODIFY]` `server/backend/routes/admin/rto_payments.py`
- `[MODIFY]` `server/backend/routes/admin/insurance_payments.py`
- `[MODIFY]` `server/backend/routes/admin/expenses.py`
- `[MODIFY]` `server/backend/routes/admin/advances.py`
- `[MODIFY]` `server/backend/routes/admin/commissions_in.py`
- `[MODIFY]` `server/backend/routes/admin/commissions_out.py`

**Verification:**
```bash
# Should return 403 for accountant JWT:
curl -X DELETE http://localhost:8000/api/v1/payments-in/{id} \
  -H "Authorization: Bearer {accountant_jwt}"
```

---

## TASK AC8 — Verify RTOPayments, Insurance, Expenses, Advances Pages
**Type:** Verification / Minor Fix  
**Complexity:** LOW  
**Depends On:** A2 (FileDetailDrawer), A8 (Pagination)

**Current State:**
These 4 pages are large and likely already connected to real APIs. But they need verification for:
1. File # click behavior — do they navigate to a non-existent route OR already use a drawer?
2. Delete button visibility — should not be shown for accountant
3. Pagination — should be 5 per page

**What to do:**
For each of the 4 pages (`RTOPaymentsPage.tsx`, `InsurancePaymentsPage.tsx`, `ExpensesPage.tsx`, `AdvancesPage.tsx`):
1. Open and check line count for any `navigate('/accountant/...')` patterns — replace with `FileDetailDrawer`
2. Check if delete button is present — if yes, remove it
3. Check pagination default — if `limit=100` or similar, change to `limit=5` with pagination controls
4. **Do NOT rewrite these** — only make targeted fixes

**Files Changed (targeted edits only):**
- `[MODIFY]` `client/src/pages/AccountantPages/RTOPaymentsPage.tsx` — fix file click (drawer), remove delete, verify pagination
- `[MODIFY]` `client/src/pages/AccountantPages/InsurancePaymentsPage.tsx` — same
- `[MODIFY]` `client/src/pages/AccountantPages/ExpensesPage.tsx` — same
- `[MODIFY]` `client/src/pages/AccountantPages/AdvancesPage.tsx` — same

**Verification:**
- All 4 pages load real data with 5 rows per page ✓
- No delete button visible ✓
- File number click opens drawer ✓

---

## TASK AC9 — Accountant Commission IN/OUT Pages: Create Missing Files
**Type:** Critical Bug Fix (Missing Pages)  
**Complexity:** MEDIUM  
**Depends On:** A2 (FileDetailDrawer), A8 (Pagination), AC7 (backend delete guard)

**Root Cause (Confirmed by file inspection):**
`AccountantLayout.tsx` nav includes 2 commission items (lines 28–29):
```tsx
{ to: '/accountant/commission/in',  label: 'Commission IN',  icon: BadgePercent },
{ to: '/accountant/commission/out', label: 'Commission OUT', icon: BadgePercent },
```
However:
- **No `CommissionInPage.tsx` or `CommissionOutPage.tsx` exists** in `AccountantPages/` folder
- `App.tsx` has **NO routes** registered for `/accountant/commission/in` or `/accountant/commission/out`
- Clicking either nav item results in a blank screen (wildcard fallback)

The `AdminPages/CommissionInPage.tsx` and `AdminPages/CommissionOutPage.tsx` ARE fully implemented with real API connections.

**Accountant Permissions on Commission:**

| Action | Accountant Can | Accountant Cannot |
|---|---|---|
| View all commission records | ✅ | — |
| Create new Commission IN/OUT | ✅ | — |
| Edit existing records | ✅ | — |
| Delete records | ❌ | Must raise modification request (AC6) |
| Export PDF/Excel | ✅ | — |

**What to do:**

**Step 1 — Create accountant CommissionInPage:**
1. Create `client/src/pages/AccountantPages/CommissionInPage.tsx`
2. Base it on `AdminPages/CommissionInPage.tsx` with these changes:
   - Remove the Delete button and `commissionsInApi.remove()` calls
   - Fix pagination: admin version calls `limit: 5000` (line 220) — change to `page=1, limit=5` with proper pagination
   - Keep View, Create, Edit, Export functionality
   - Keep file detail drawer on file# click

**Step 2 — Create accountant CommissionOutPage:**
1. Create `client/src/pages/AccountantPages/CommissionOutPage.tsx`
2. Base it on `AdminPages/CommissionOutPage.tsx` with same changes

**Step 3 — Register routes in App.tsx:**
```tsx
// Add inside the accountant route group:
<Route path="/accountant/commission/in"  element={<AccountantCommissionInPage />} />
<Route path="/accountant/commission/out" element={<AccountantCommissionOutPage />} />
```

**Files Changed:**
- `[NEW]` `client/src/pages/AccountantPages/CommissionInPage.tsx`
- `[NEW]` `client/src/pages/AccountantPages/CommissionOutPage.tsx`
- `[MODIFY]` `client/src/App.tsx` — add 2 routes

**Verification:**
- Log in as accountant → click Commission IN in sidebar → page loads with real data, 5 per page ✓
- No delete button visible ✓
- Create new commission entry → appears in list ✓
- DELETE via API client with accountant JWT → 403 Forbidden (from AC7) ✓

---

## Execution Order (Recommended)

| Order | Task | Why |
|---|---|---|
| 1 | **AC7** — Backend delete guards | Security first — do before any UI work |
| 2 | **AC1** — Dashboard real API | Highest visibility, easy win |
| 3 | **AC5** — Notification bell | Low risk, zero dependencies |
| 4 | **AC6** — Fix modifications endpoint | Same fix as S4 — simple endpoint swap |
| 5 | **AC2** — Files page real API | Depends on A2 (drawer) and A8 (pagination) |
| 6 | **AC3** — Payment IN real API | Copy from admin, remove delete |
| 7 | **AC4** — Payment OUT real API | Copy from admin, remove delete |
| 8 | **AC9** — Create Commission IN/OUT pages | Same copy pattern as AC3/AC4 |
| 9 | **AC8** — Verify RTO/Insurance/Expenses/Advances | Last — verification and targeted fixes only |

## Verification Plan

### Backend Security (run after AC7)
```bash
# All should return 403 with accountant JWT:
curl -X DELETE http://localhost:8000/api/v1/payments-in/{id} -H "Authorization: Bearer {accountant_jwt}"
curl -X DELETE http://localhost:8000/api/v1/payments-out/{id} -H "Authorization: Bearer {accountant_jwt}"
curl -X DELETE http://localhost:8000/api/v1/expenses/{id} -H "Authorization: Bearer {accountant_jwt}"
```

### Manual Checklist
1. AC1: Dashboard shows real ₹ amounts (not `₹84.5L` hardcoded) ✓
2. AC2: Files page shows real files, 5 per page, file click opens drawer ✓
3. AC3: Payment IN shows real records, create works, no delete ✓
4. AC4: Payment OUT shows real records, create works, no delete ✓
5. AC5: Bell icon shows unread count, click opens NotificationPanel ✓
6. AC6: Submit modification request → shows in list from real API ✓
7. AC7: DELETE via API client with accountant JWT → 403 ✓
8. AC8: RTO/Insurance/Expenses/Advances pages — real data, no delete ✓
9. AC9: `/accountant/commission/in` → Commission IN page loads with real data, 5/page ✓
10. AC9: `/accountant/commission/out` → Commission OUT page loads with real data ✓
11. AC9: No delete button on either commission page ✓
