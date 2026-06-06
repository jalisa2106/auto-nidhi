# Customer Portal Implementation Plan

## Overview
8 tasks covering new widgets, bug fixes, permission enforcement, and backend improvements for the Customer role.
The customer portal is in reasonably good shape compared to the staff role — most pages exist and are connected to real APIs. The gaps are widget additions, a broken payment backend query, and missing "Action Required" flows.

**Pre-read: What Already Exists and Works**

| File | Status | Notes |
|---|---|---|
| `CustomerPortalPage.tsx` | ✅ Connected to real API | Calls `/portal/files`, `/portal/insurance` — working |
| `CustomerPaymentsPage.tsx` | ⚠️ Partial | Connected, but backend query broken (wrong join — sees 0 payments) |
| `CustomerFilesPage.tsx` | ✅ Working | Real data |
| `CustomerFileDetailPage.tsx` | ✅ Working | Shows full file details |
| `CustomerDocumentsPage.tsx` | ✅ Working | Upload + view |
| `CustomerInsurancePage.tsx` | ✅ Working | Real data |
| `CustomerLoanPage.tsx` | ✅ Working | Real data |
| `CustomerRTOPage.tsx` | ✅ Working | Real data |
| `CustomerProfilePage.tsx` | ✅ Working | Real data |
| `CustomerSettingsPage.tsx` | ✅ Working | Notification prefs in localStorage |
| `CustomerLayout.tsx` | ✅ Working | Sidebar nav, notification bell |
| `customer/payments.py` | 🔴 BROKEN | Joins on `created_by_user_id` — customers never create files, staff do |
| `customer/dashboard.py` | ✅ Working | Returns total_files, completed_files, recent_files |

**Key Bug Found:**
In `customer/payments.py` line 23:
```python
.filter(FileRecord.created_by_user_id == current_user.id)
```
This is **wrong** — customers never create files themselves, staff do. The correct join is:
```python
.join(Customer, Customer.email == current_user.email)
.filter(FileRecord.customer_id == Customer.id)
```

---

## TASK C1 — Fix Payments Backend: Wrong Join Query
**Type:** Critical Bug Fix  
**Complexity:** LOW  
**Depends On:** Nothing — do this FIRST

**Root Cause:**
`server/backend/routes/customer/payments.py` L23 filters `FileRecord.created_by_user_id == current_user.id`. Customers never create files — staff do on their behalf. So this returns zero results for every customer.

**What to do:**
1. Open `server/backend/routes/customer/payments.py`
2. Replace the broken query with the correct one:
```python
@router.get("/payments")
def customer_payments_status(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    # Step 1: Find the customer record linked to this system_user by email
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        return []

    # Step 2: Get all payment_in records for this customer's files
    payments = (
        db.query(PaymentIn)
        .join(FileRecord, FileRecord.id == PaymentIn.file_id)
        .filter(
            FileRecord.customer_id == customer.id,
            FileRecord.is_deleted == False,
        )
        .order_by(PaymentIn.payment_date.desc())
        .all()
    )

    return [
        {
            "file_number": p.file.file_number if p.file else None,
            "file_type": p.file.file_type if p.file else None,
            "payment_amount": float(p.payment_amount or 0),
            "paid_amount": float(p.paid_amount or 0),
            "remaining_amount": float(p.remaining_amount or 0),
            "payment_mode": p.payment_mode,
            "payment_date": p.payment_date.isoformat() if hasattr(p.payment_date, "isoformat") else str(p.payment_date) if p.payment_date else None,
            "remarks": p.remarks,
        }
        for p in payments
    ]
```
3. Also import `Customer` from `backend.models` at the top if not already imported

**Files Changed:**
- `[MODIFY]` `server/backend/routes/customer/payments.py` — fix the join query

**Verification:**
- Log in as a customer whose files have payment records
- Navigate to `/portal/payments` → payments now show instead of empty state

---

## TASK C2 — Dashboard: Add "Action Required" Widget
**Type:** New Feature  
**Complexity:** MEDIUM  
**Depends On:** C1 (payments fixed)

**Current State:**
`CustomerPortalPage.tsx` has KPI cards (Active Files, Completed Services, Insurance count) and a pipeline. Missing: an "Action Required" section that tells the customer what needs their attention.

**What to do:**

**Step 1 — New backend endpoint in `dashboard.py`:**
Add `GET /api/v1/customer/action-required` that returns:
```python
{
    "outstanding_payments": int,        # payments with remaining_amount > 0
    "pending_documents": int,           # documents with status = 'pending' or 'rejected'
    "expiring_insurance_days": int,     # days to nearest expiry (or null)
    "expiring_insurance_file": str,     # file_number of expiring policy
    "files_needing_attention": [        # files in 'draft' status > 7 days old
        { "file_number": str, "status": str, "days_old": int }
    ]
}
```

Implementation:
```python
@router.get("/action-required")
def customer_action_required(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        return {"outstanding_payments": 0, "pending_documents": 0, "expiring_insurance_days": None, "files_needing_attention": []}

    customer_id = str(customer.id)

    # Outstanding payments
    outstanding = db.execute(
        text("""
        SELECT COUNT(*) FROM payment_in pi
        JOIN file_record fr ON fr.id = pi.file_id
        WHERE fr.customer_id = :cid AND fr.is_deleted = FALSE
        AND pi.remaining_amount > 0
        """),
        {"cid": customer_id}
    ).scalar() or 0

    # Pending/rejected documents
    pending_docs = db.execute(
        text("""
        SELECT COUNT(*) FROM customer_document
        WHERE customer_id = :cid AND status IN ('pending', 'rejected')
        """),
        {"cid": customer_id}
    ).scalar() or 0

    # Nearest insurance expiry
    expiry = db.execute(
        text("""
        SELECT fr.file_number, ii.valid_to,
               (ii.valid_to - CURRENT_DATE) AS days_left
        FROM insurance_info ii
        JOIN file_record fr ON fr.id = ii.file_id
        WHERE fr.customer_id = :cid AND fr.is_deleted = FALSE
        AND ii.valid_to IS NOT NULL
        AND ii.valid_to >= CURRENT_DATE
        ORDER BY ii.valid_to ASC
        LIMIT 1
        """),
        {"cid": customer_id}
    ).mappings().first()

    # Files stuck in draft > 7 days
    stale_files = db.execute(
        text("""
        SELECT file_number, status::text,
               (CURRENT_DATE - created_at::date) AS days_old
        FROM file_record
        WHERE customer_id = :cid AND is_deleted = FALSE
        AND status = 'draft'
        AND created_at < NOW() - INTERVAL '7 days'
        """),
        {"cid": customer_id}
    ).mappings().all()

    return {
        "outstanding_payments": int(outstanding),
        "pending_documents": int(pending_docs),
        "expiring_insurance_days": int(expiry["days_left"]) if expiry else None,
        "expiring_insurance_file": expiry["file_number"] if expiry else None,
        "files_needing_attention": [dict(r) for r in stale_files],
    }
```

**Step 2 — Frontend widget:**
In `CustomerPortalPage.tsx`, add a new section between the KPI cards and the Pipeline:
```tsx
// Add after KPI cards, before Row 2
{actionRequired && (
  <div className="db-card" style={{ marginBottom: 20, border: '1px solid #fecdd3', background: '#fff1f2' }}>
    <div className="db-card-header">
      <div className="db-card-title" style={{ color: '#be123c' }}>
        <AlertCircle size={16} /> Action Required
      </div>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '0 0 4px' }}>
      {actionRequired.outstanding_payments > 0 && (
        <ActionItem
          icon="💳" color="#b91c1c"
          text={`${actionRequired.outstanding_payments} payment(s) outstanding`}
          to="/portal/payments"
        />
      )}
      {actionRequired.pending_documents > 0 && (
        <ActionItem
          icon="📄" color="#b45309"
          text={`${actionRequired.pending_documents} document(s) need attention`}
          to="/portal/documents"
        />
      )}
      {actionRequired.expiring_insurance_days !== null && actionRequired.expiring_insurance_days <= 30 && (
        <ActionItem
          icon="🛡️" color="#7c3aed"
          text={`Insurance expires in ${actionRequired.expiring_insurance_days} days (${actionRequired.expiring_insurance_file})`}
          to="/portal/insurance"
        />
      )}
      {(actionRequired.files_needing_attention || []).map(f => (
        <ActionItem key={f.file_number}
          icon="📁" color="#1d4ed8"
          text={`File ${f.file_number} in Draft for ${f.days_old} days — contact AutoNidhi`}
          to="/portal/files"
        />
      ))}
    </div>
  </div>
)}
```

Hide the "Action Required" card entirely if all counts are zero — no noise.

**State in CustomerPortalPage.tsx:**
```tsx
const [actionRequired, setActionRequired] = useState<ActionRequiredData | null>(null)

// In useEffect:
api.get('/api/v1/customer/action-required')
   .then(res => setActionRequired(res.data))
   .catch(() => {})
```

**Files Changed:**
- `[NEW]` Backend: Add `GET /api/v1/customer/action-required` endpoint in `server/backend/routes/customer/dashboard.py`
- `[MODIFY]` `client/src/pages/CustomerPages/CustomerPortalPage.tsx` — add Action Required widget + fetch

**Verification:**
- Customer with outstanding payment → sees "1 payment outstanding" banner ✓
- Customer with no pending docs, no expiring insurance, no stale files → banner is hidden ✓

---

## TASK C3 — Dashboard: Add "Allocated Staff" Card
**Type:** New Feature  
**Complexity:** LOW  
**Depends On:** T1 (from 00-thinking-solutions.md — `customer_staff_allocation` table must exist)

**Note:** This task depends on the `customer_staff_allocation` table being created (which is in `06-database-schema-changes.md`). If that table doesn't exist yet, this task should be deferred until after the DB migration runs.

**What to do:**

**Step 1 — Backend:**
Add to `GET /api/v1/customer/dashboard` response:
```python
# Add after finding customer record in dashboard.py
allocated_staff = db.execute(
    text("""
    SELECT su.first_name, su.last_name, su.email,
           csa.allocated_since
    FROM customer_staff_allocation csa
    JOIN system_user su ON su.id = csa.staff_id
    WHERE csa.customer_id = :customer_id
    AND csa.is_active = TRUE
    ORDER BY csa.allocated_since DESC
    LIMIT 1
    """),
    {"customer_id": customer_id}
).mappings().first()
```

Return in response:
```python
"allocated_staff": {
    "name": f"{row['first_name']} {row['last_name'] or ''}".strip(),
    "email": row["email"],
    "since": row["allocated_since"].isoformat() if row["allocated_since"] else None,
} if allocated_staff else None
```

**Step 2 — Frontend widget in `CustomerPortalPage.tsx`:**
Add a small card in Row 3 (alongside Recent Files and Quick Actions):
```tsx
{dashboard?.allocated_staff ? (
  <div className="db-card">
    <div className="db-card-header">
      <div className="db-card-title"><User size={16} /> Your Allocated Consultant</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <UserCircle2 size={24} color="#2563eb" />
      </div>
      <div>
        <div style={{ fontWeight: 700, color: '#0f172a' }}>{dashboard.allocated_staff.name}</div>
        <div style={{ fontSize: '.78rem', color: '#64748b' }}>{dashboard.allocated_staff.email}</div>
        <div style={{ fontSize: '.72rem', color: '#94a3b8', marginTop: 3 }}>
          Allocated since {new Date(dashboard.allocated_staff.since).toLocaleDateString('en-IN')}
        </div>
      </div>
    </div>
  </div>
) : (
  <div className="db-card" style={{ opacity: 0.5 }}>
    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '.84rem' }}>
      No consultant allocated yet. Contact AutoNidhi.
    </div>
  </div>
)}
```

**Files Changed:**
- `[MODIFY]` `server/backend/routes/customer/dashboard.py` — add allocated_staff to response
- `[MODIFY]` `client/src/pages/CustomerPages/CustomerPortalPage.tsx` — add Allocated Staff card

**Verification:**
- Customer with an allocated staff member → sees staff name, email, date ✓
- Customer with no allocation → sees "No consultant allocated" placeholder ✓

---

## TASK C4 — Dashboard: Insurance Expiry Alert Widget
**Type:** New Feature  
**Complexity:** LOW  
**Depends On:** C2 (action-required endpoint returns insurance expiry data)

**Note:** This reuses the `expiring_insurance_days` from C2's endpoint — no new backend endpoint needed.

**What to do:**
In `CustomerPortalPage.tsx`, add a dedicated Insurance Expiry card in the KPI row (replacing the generic Insurance count KPI or adding a 4th card):

The existing 3rd KPI card shows "Insurance: X" count. Replace it with a smarter card:
- If any policy expires within 30 days: show red/orange warning with days remaining
- If no expiry imminent: show the count as before

```tsx
// Replace the existing Insurance KPI card with:
<div className="db-kpi-card db-kpi-red" onClick={() => navigate('/portal/insurance')}>
  <div className="db-kpi-icon"><ShieldCheck size={22} /></div>
  <div className="db-kpi-body">
    <div className="db-kpi-label">Insurance</div>
    {actionRequired?.expiring_insurance_days !== null && actionRequired?.expiring_insurance_days <= 30 ? (
      <>
        <div className="db-kpi-value" style={{ color: '#b91c1c' }}>
          {actionRequired.expiring_insurance_days}d
        </div>
        <div className="db-kpi-sub">
          <span className="db-kpi-tag red">Expires soon!</span>
        </div>
      </>
    ) : (
      <>
        <div className="db-kpi-value">{loading || insuranceCount === null ? '…' : insuranceCount}</div>
        <div className="db-kpi-sub">
          <span className="db-kpi-tag red">View policies</span>
        </div>
      </>
    )}
  </div>
  <ChevronRight size={16} className="db-kpi-arrow" />
</div>
```

**Files Changed:**
- `[MODIFY]` `client/src/pages/CustomerPages/CustomerPortalPage.tsx` — update Insurance KPI card

**Verification:**
- Customer with policy expiring in 10 days → KPI shows "10d" in red with "Expires soon!" tag ✓
- Customer with no near expiry → KPI shows policy count as before ✓

---

## TASK C5 — Dashboard: Payment Summary Widget
**Type:** Enhancement  
**Complexity:** LOW  
**Depends On:** C1 (payments backend fixed)

**Current State:**
The dashboard has "Payment Status" as a Quick Actions link but no summary. Customer has to go to the full Payments page to see amounts.

**What to do:**
Fetch a quick payment summary on the dashboard and show in a small card in Row 3:
```tsx
// In CustomerPortalPage.tsx useEffect, add:
api.get('/portal/payments').then(res => {
  const payments = res.data || []
  const totalPaid = payments.reduce((s, p) => s + p.paid_amount, 0)
  const totalOutstanding = payments.reduce((s, p) => s + p.remaining_amount, 0)
  setPaymentSummary({ totalPaid, totalOutstanding, count: payments.length })
}).catch(() => {})
```

Show in the dashboard as a card:
```tsx
<div className="db-card">
  <div className="db-card-header">
    <div className="db-card-title"><CreditCard size={16} /> Payment Summary</div>
    <Link to="/portal/payments" className="db-see-all">View all <ArrowRight size={12} /></Link>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
    <div>
      <div style={{ fontSize: '.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Paid</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>
        ₹{paymentSummary.totalPaid.toLocaleString('en-IN')}
      </div>
    </div>
    <div>
      <div style={{ fontSize: '.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Outstanding</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: paymentSummary.totalOutstanding > 0 ? '#b91c1c' : '#16a34a' }}>
        ₹{paymentSummary.totalOutstanding.toLocaleString('en-IN')}
      </div>
    </div>
  </div>
  {paymentSummary.count === 0 && (
    <div style={{ fontSize: '.8rem', color: '#94a3b8', marginTop: 8 }}>No payments recorded yet</div>
  )}
</div>
```

**Files Changed:**
- `[MODIFY]` `client/src/pages/CustomerPages/CustomerPortalPage.tsx` — add payment summary state + card

**Verification:**
- Customer with 2 payments totaling ₹50,000 paid and ₹20,000 outstanding → dashboard shows those values ✓
- 0 outstanding → shows ₹0 in green ✓

---

## TASK C6 — Customer Settings: Save Notification Prefs to DB (not localStorage)
**Type:** Bug Fix  
**Complexity:** MEDIUM  
**Depends On:** Nothing

**Root Cause:**
`CustomerSettingsPage.tsx` (L23-27) reads/writes notification preferences to `localStorage`. This means:
1. Preferences are lost when the browser's cache is cleared
2. Preferences don't sync across devices
3. Backend-triggered notifications ignore these preferences entirely

**What to do:**

**Step 1 — DB migration:**
```sql
-- 025_customer_notification_preferences.sql
CREATE TABLE IF NOT EXISTS customer_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    pref_key VARCHAR(50) NOT NULL,  -- 'file_update', 'payment', 'insurance', 'document', 'general'
    is_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (customer_id, pref_key)
);
```

**Step 2 — Backend in `settings.py`:**
Add two endpoints:
```python
@router.get("/notification-preferences")
def get_notification_preferences(
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        return []
    prefs = db.execute(
        text("SELECT pref_key, is_enabled FROM customer_notification_preferences WHERE customer_id = :cid"),
        {"cid": str(customer.id)}
    ).mappings().all()
    return [dict(p) for p in prefs]

@router.post("/notification-preferences")
def save_notification_preferences(
    payload: List[dict],
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    for item in payload:
        db.execute(
            text("""
            INSERT INTO customer_notification_preferences (customer_id, pref_key, is_enabled)
            VALUES (:cid, :key, :enabled)
            ON CONFLICT (customer_id, pref_key) DO UPDATE SET is_enabled = :enabled, updated_at = NOW()
            """),
            {"cid": str(customer.id), "key": item["key"], "enabled": item["enabled"]}
        )
    db.commit()
    return {"saved": True}
```

**Step 3 — Frontend `CustomerSettingsPage.tsx`:**
1. On mount: fetch `GET /api/v1/customer/notification-preferences` and merge with DEFAULT_PREFS
2. On save: call `POST /api/v1/customer/notification-preferences` instead of writing to localStorage
3. Remove all `localStorage.setItem('notif_prefs', ...)` calls
4. Keep localStorage as fallback ONLY for the initial load if the API call fails

**Files Changed:**
- `[NEW]` `database/database/025_customer_notification_preferences.sql`
- `[MODIFY]` `server/backend/models.py` — add `CustomerNotificationPreferences` model
- `[MODIFY]` `server/backend/routes/customer/settings.py` — add 2 endpoints
- `[MODIFY]` `client/src/pages/CustomerPages/CustomerSettingsPage.tsx` — use API instead of localStorage

**Verification:**
- Save notification prefs → refresh page → prefs still match ✓
- Log in from different browser → prefs are the same ✓

---

## TASK C7 — Customer Profile: "Request Staff Change" Form
**Type:** New Feature  
**Complexity:** LOW  
**Depends On:** T1 (allocation table), A14 (review desk in admin plan)

**Note:** This submits a modification request to admin — it does NOT directly change the allocation. Admin reviews via the Review Desk.

**What to do:**
1. In `CustomerProfilePage.tsx`, add a "Request Staff Change" section at the bottom
2. Shows a simple form: text area for reason + "Submit Request" button
3. On submit: call `POST /api/v1/customer/modification-requests` with:
   ```json
   {
     "request_type": "staff_change",
     "reason": "..."
   }
   ```
4. Show success message: "Your request has been sent to AutoNidhi. You will be notified once reviewed."

**Backend:**
In `server/backend/routes/customer/profile.py`, add:
```python
@router.post("/modification-requests")
def submit_customer_modification_request(
    payload: dict,
    current_user: SystemUser = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    mod_req = ModificationRequest(
        entity_type="customer_staff_allocation",
        entity_id=str(customer.id),
        request_type=payload.get("request_type", "staff_change"),
        reason=payload.get("reason", ""),
        submitted_by=current_user.id,
        submitted_by_role="customer",
        status="pending"
    )
    db.add(mod_req)
    db.commit()
    return {"submitted": True, "id": str(mod_req.id)}
```

**Files Changed:**
- `[MODIFY]` `server/backend/routes/customer/profile.py` — add modification request endpoint
- `[MODIFY]` `client/src/pages/CustomerPages/CustomerProfilePage.tsx` — add request form

**Verification:**
- Customer submits "please change my consultant" → admin sees it in Review Desk as a "staff_change" type request ✓

---

## TASK C8 — Notification Polling: Move to 60-Second Interval
**Type:** Bug Fix  
**Complexity:** LOW  
**Depends On:** Nothing

**Current State:**
Check `client/src/store/notificationStore.ts` — the notification polling interval and `fetchNotifications()` call pattern. If polling is too frequent (e.g., every 10 seconds), it creates unnecessary server load, especially in production.

**What to do:**
1. Open `client/src/store/notificationStore.ts`
2. Find the polling interval (`setInterval` call)
3. If interval is < 60 seconds, change it to exactly `60000` (1 minute):
   ```ts
   const POLL_INTERVAL = 60 * 1000 // 60 seconds
   ```
4. The `CustomerLayout.tsx` calls `fetchNotifications()` on mount (L80) — this is correct for initial load. The polling store then takes over.
5. Also check `AdminDashboard.tsx` and `DataEntryLayout.tsx` for the same polling setup — apply same 60-second interval there too

**Important:** The notification polling must be in `notificationStore.ts` — not in individual page components. The store is the single source of truth.

**Files Changed:**
- `[MODIFY]` `client/src/store/notificationStore.ts` — set POLL_INTERVAL to 60000ms
- `[MODIFY]` `client/src/pages/Dashboard/AdminDashboard.tsx` — verify no duplicate polling
- `[MODIFY]` `client/src/pages/DataEntryPages/DataEntryLayout.tsx` — verify no duplicate polling

**Verification:**
- Open Network tab in browser → notification requests should appear once per minute, not more ✓

---

## Execution Order (Recommended)

| Order | Task | Why |
|---|---|---|
| 1 | **C1** — Fix payments backend query | Unblocks C5 (payment summary widget) |
| 2 | **C8** — Notification polling interval | Simple, server-load critical, zero risk |
| 3 | **C6 DB** — Run migration SQL for notification prefs | DB first before code |
| 4 | **C6** — Customer settings save to DB | Low risk, no dependencies |
| 5 | **C2** — Action Required endpoint + widget | New backend + new UI section |
| 6 | **C4** — Insurance expiry card | Depends on C2 data (same endpoint) |
| 7 | **C5** — Payment summary widget | Depends on C1 being fixed |
| 8 | **C3** — Allocated staff card | Depends on allocation table from DB plan |
| 9 | **C7** — Request staff change form | Depends on C3 concept, uses modification_request table |

## Verification Plan

### Quick Smoke Test (after C1)
```bash
# Log in as a customer, get token, call:
curl http://localhost:8000/api/v1/portal/payments \
  -H "Authorization: Bearer {customer_jwt}"
# Should now return payment records, not empty array
```

### Manual Checklist
1. C1: Customer payments page shows real data ✓
2. C2: Dashboard shows "Action Required" banner when outstanding payments exist ✓
3. C2: Banner is hidden when everything is fine ✓
4. C3: Dashboard shows "Your Allocated Consultant: [Name]" card ✓
5. C4: Insurance KPI shows "10d" in red if policy expires in 10 days ✓
6. C5: Dashboard payment summary shows ₹ amounts ✓
7. C6: Change notification pref → refresh → pref is persisted ✓
8. C7: Submit "Request Staff Change" → admin sees it in Review Desk ✓
9. C8: Network tab shows 1 notification poll per minute ✓
