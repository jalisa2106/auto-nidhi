# Future Implementations

## Overview
Features deferred from the current implementation scope. These are valid, well-defined features that require either more design clarity, additional infrastructure, or are lower priority relative to the bugs and core features in plans 01-04.

---

## F1 — Customer-Staff Messaging / In-App Chat
**Priority:** Medium  
**Complexity:** HIGH  
**Blocked By:** Requires a real-time channel (WebSocket or polling with message store)

**Description:**
Allow customers to send messages directly to their allocated staff member from the customer portal. Staff can reply from the staff portal.

**What's needed:**
- New DB table: `messages (id, sender_id, receiver_id, content, is_read, created_at)`
- Backend: WebSocket endpoint or long-polling `GET /messages?after=timestamp`
- Frontend: Chat UI in `CustomerProfilePage.tsx` (customer side) + `RequestsPage.tsx` (staff side)

**Deferred because:**
Real-time messaging requires WebSocket infrastructure which Render supports but needs careful setup. Not critical for MVP.

---

## F2 — Bulk File Import (Excel/CSV Upload)
**Priority:** Low  
**Complexity:** HIGH  
**Blocked By:** Requires file parsing, validation pipeline, and error reporting

**Description:**
Admin or staff can upload an Excel file with multiple customer/file records and have them batch-imported into the system.

**What's needed:**
- Frontend: File upload component with drag-and-drop
- Backend: `POST /api/v1/files/bulk-import` — parse CSV/XLSX, validate each row, return report
- Error handling: Row-level errors (e.g., customer not found) returned in a downloadable error report

**Deferred because:**
Complex validation logic. High risk of data corruption if not done carefully. Not requested in current scope.

---

## F3 — Audit Log Viewer for Admin
**Priority:** Medium  
**Complexity:** MEDIUM  
**Blocked By:** `audit_logs` table exists — just needs a frontend UI

**Description:**
Admin can view a full audit trail of all actions: who created what, who edited what, who deleted what, with timestamps and IP addresses.

**What's needed:**
- Backend: `GET /api/v1/audit-logs/?user_id=&table=&action=&from=&to=&page=&limit=` — the `audit_logs` table already exists
- Frontend: New `AuditLogsPage.tsx` in `AdminPages/` with filters (by user, by table, by date range) and a read-only table
- Add route `/dashboard/audit-logs` in `App.tsx`
- Add nav item in AdminDashboard sidebar

**Deferred because:**
The `audit_logs` table exists but may not be populated consistently by all endpoints. Need to verify `record_dashboard_event()` is called correctly before building the UI.

---

## F4 — Staff Performance Reports
**Priority:** Low  
**Complexity:** MEDIUM  
**Blocked By:** Depends on customer_staff_allocation (022 migration)

**Description:**
Admin can view a per-staff performance report: how many files created, how many completed, average completion time, payment totals, and customer satisfaction scores.

**What's needed:**
- Backend: `GET /api/v1/analytics/staff-performance/{staff_id}` — aggregated query across `file_record`, `payment_in`, `customer_staff_allocation`
- Frontend: New section in `AnalyticsPage.tsx` (from A1) — staff performance table with sortable columns

**Deferred because:**
Depends on A1 (Analytics page) being built first, and `022_customer_staff_allocation.sql` being populated with real data.

---

## F5 — Customer Document Verification Workflow (Admin Side)
**Priority:** Medium  
**Complexity:** MEDIUM  
**Blocked By:** Nothing — `customer_document` table exists

**Description:**
When a customer uploads a document (Aadhar, PAN, etc.) from `CustomerDocumentsPage.tsx`, staff/admin should receive a notification and be able to mark it as Verified, Rejected, or Request Re-upload.

**Current state:**
Customer can upload documents. But there's no admin/staff UI to verify them. The `customer_document` table has a `status` column (`pending`, `verified`, `rejected`) but no one sets it beyond `pending`.

**What's needed:**
- Backend: `PATCH /api/v1/documents/{id}/verify` — admin/staff can set status
- Backend: Send notification to customer when document is verified/rejected
- Frontend (Admin/Staff): In `CustomerDetailPage.tsx`, show the customer's uploaded documents with Verify/Reject buttons
- Frontend (Customer): In `CustomerDocumentsPage.tsx`, show the current status badge per document and re-upload button if rejected

**Deferred because:**
Requires the admin `CustomerDetailPage.tsx` to be built first (from A3 in admin plan). Cannot show customer docs there until A3 is done.

---

## F6 — Commission Automation (Auto-calculate from File)
**Priority:** Medium  
**Complexity:** HIGH  
**Blocked By:** Requires business rules document from client

**Description:**
When a file moves to `disbursed` or `completed` status, automatically calculate commission_in (from bank/insurer) and commission_out (to broker/dealer) based on configured rates.

**What's needed:**
- New DB table: `commission_rules (role_type, percentage, applies_to_file_type, applies_to_bank_id)`
- Backend: Trigger or post-status-update hook that calls `calculate_commission(file_id)`
- Frontend: Admin UI to configure commission rules per bank/broker

**Deferred because:**
Commission calculation rules vary per bank, per product type, per broker. Business rules not fully defined.

---

## F7 — Mobile App / PWA Support
**Priority:** Low  
**Complexity:** HIGH  
**Blocked By:** Requires PWA manifest + service worker + push notification infrastructure

**Description:**
Package the customer portal as a Progressive Web App (PWA) so customers can install it on their phones and receive push notifications for file status updates.

**What's needed:**
- `manifest.json` + `service-worker.js` + `offline.html`
- Web Push API integration (using VAPID keys)
- Backend: `POST /api/v1/push-subscriptions` endpoint
- Icons in multiple sizes

**Deferred because:**
PWA push notifications require significant infrastructure work. Customer portal works fine on mobile browser without PWA for now.

---

## F8 — Two-Factor Authentication (2FA)
**Priority:** Medium  
**Complexity:** HIGH  
**Blocked By:** Requires TOTP library (pyotp) + QR code generation

**Description:**
Admin and Accountant roles should optionally enable TOTP-based 2FA (e.g., Google Authenticator) for an extra security layer.

**What's needed:**
- DB: `system_user.totp_secret` column, `system_user.totp_enabled` boolean
- Backend: `POST /auth/2fa/setup` (generate secret + QR code), `POST /auth/2fa/verify` (validate TOTP), `POST /auth/2fa/disable`
- Frontend: Settings page section for 2FA setup (show QR code, enter verification code)
- Login flow: After password auth, if 2FA enabled, prompt for TOTP code before issuing JWT

**Deferred because:**
Security enhancement — not blocking current operations. Can be added post-launch.

---

## F9 — Sidebar Navigation: Role-by-Role Cleanup
**Priority:** Medium  
**Complexity:** LOW  
**Blocked By:** All role plans completed (can only clean up nav after pages exist)

**Description:**
Each role's sidebar has either orphan links (pointing to non-existent pages), inconsistent ordering, or missing icons. Once all pages in plans 01-04 are implemented, a final sidebar audit is needed for all 4 roles.

**What's needed per role:**

| Role | Layout File | Issues to fix |
|---|---|---|
| Admin | `AdminDashboard.tsx` (sidebar section) | Verify every nav item has a working route. Remove any dead links. Add Analytics (/dashboard/analytics). Add Review Desk (/dashboard/review-desk). |
| Staff | `DataEntryLayout.tsx` | Confirm Commission IN/OUT links added (S11). Confirm Customers, Files, Payments, Requests links all work. |
| Accountant | `AccountantLayout.tsx` | Confirm Commission IN/OUT links added (AC9). Verify all links match implemented pages. |
| Customer | `CustomerLayout.tsx` | Verify Quick Services section present. Add "My Requests" link to show service request status. |

**Additional improvements:**
- Add active link highlight (current route highlighted in sidebar)
- Add tooltips on collapsed sidebar icons
- Add role badge chip at top of sidebar ("STAFF", "ADMIN", etc.)
- Ensure mobile sidebar collapses cleanly

**Files Changed:**
- `[MODIFY]` Admin sidebar nav section in `AdminDashboard.tsx`
- `[MODIFY]` `DataEntryLayout.tsx` (staff)
- `[MODIFY]` `AccountantLayout.tsx`
- `[MODIFY]` `CustomerLayout.tsx`

---

## F10 — UI Consistency: Design Theme + Color System
**Priority:** Medium  
**Complexity:** MEDIUM  
**Blocked By:** All functional changes complete (do this last, purely visual)

**Description:**
The current codebase has inconsistent styling across pages — some pages use inline styles with raw hex values, others use CSS variables from `pages.css`. The visual design is inconsistent in colors, spacing, border radii, and typography across Admin/Staff/Accountant/Customer portals.

**What's needed:**

1. **Audit existing CSS variables in `client/src/pages.css`** — ensure all design tokens are defined:
   ```css
   /* These MUST be centrally defined, not repeated inline: */
   --brand-50, --brand-100, ..., --brand-900  /* primary blue/indigo */
   --success, --warning, --error, --info      /* status colors */
   --surface-1, --surface-2, --surface-3      /* backgrounds */
   --text-primary, --text-secondary, --text-muted
   --radius-sm, --radius-md, --radius-lg
   --shadow-sm, --shadow-md
   ```

2. **Enforce consistent component styling:**
   - All tables: same header background, row hover, border style
   - All modals: same border-radius, backdrop blur, shadow
   - All buttons: `btn-primary`, `btn-secondary`, `btn-danger` classes
   - All status badges: same size/font/padding per status type
   - All pagination: same component (A8 Pagination from admin plan)

3. **Typography:** Ensure all roles use the same font (currently mixed between system fonts and loaded fonts)

4. **Color theme per role** (optional enhancement):
   - Admin: Indigo/dark theme (current)
   - Staff: Teal accent
   - Accountant: Slate/neutral
   - Customer: Blue/light theme

**Files Changed:**
- `[MODIFY]` `client/src/pages.css` — centralize all design tokens
- `[MODIFY]` `client/src/styles/auth.css` — ensure login/signup consistent
- Multiple page files — replace inline hex colors with CSS variable references

**Deferred because:**
Functional correctness comes first. UI polish is the final step before production release.

---

## F11 — Real Email + Forgot Password (SMTP)
**Priority:** HIGH  
**Complexity:** LOW  
**Blocked By:** SMTP credentials must be in `.env` (already partially configured)

**Description:**
The forgot password flow has a complete backend implementation (`forgot_password.py`, `password_reset_tokens` table, `email_utils.py`) but real email delivery is not working in production because SMTP credentials may not be configured or tested.

**What's needed:**

**Step 1 — Verify SMTP configuration in `server/.env`:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password   # Gmail App Password (not regular password)
SMTP_FROM=noreply@autonidhi.in
```

**Step 2 — Verify `email_utils.py` uses these env vars correctly:**
```python
import smtplib
from email.mime.text import MIMEText
import os

def send_email(to_email: str, subject: str, html_body: str):
    msg = MIMEText(html_body, 'html')
    msg['Subject'] = subject
    msg['From'] = os.getenv('SMTP_FROM')
    msg['To'] = to_email
    with smtplib.SMTP(os.getenv('SMTP_HOST'), int(os.getenv('SMTP_PORT', 587))) as server:
        server.starttls()
        server.login(os.getenv('SMTP_USER'), os.getenv('SMTP_PASS'))
        server.send_message(msg)
```

**Step 3 — Test forgot password end-to-end:**
1. Go to `/forgot-password` → enter a registered email
2. Should receive an email with reset link within 30 seconds
3. Click link → `/reset-password?token=...` → enter new password → login with new password

**Step 4 — Email templates (improve if basic HTML):**
- Forgot password email: AutoNidhi logo, reset link button, expiry note (24 hours)
- Document verified email: document type, verification status, link to portal
- File status change email: file number, new status, link to portal
- Notification emails: summary of unread notifications (weekly digest, optional)

**Step 5 — Verify `ResetPassword.tsx` frontend flow:**
1. Open `client/src/pages/ResetPassword.tsx` — confirm it reads `?token=` from URL params
2. Calls `POST /api/v1/auth/reset-password` with token + new password
3. On success: redirects to `/login` with toast "Password updated. Please log in."

**Files Changed:**
- `[MODIFY]` `server/.env` — confirm SMTP credentials present
- `[MODIFY]` `server/backend/email_utils.py` — verify/fix SMTP send function
- `[MODIFY]` `server/backend/routes/auth/forgot_password.py` — verify sends email correctly
- `[MODIFY]` `client/src/pages/ResetPassword.tsx` — verify token flow works

**Priority Note:** This is marked HIGH priority despite being in the "future" plan because:
- Password recovery is a business-critical feature (locked-out users call support)
- The backend code is already written — this is just config + testing
- Estimated effort: 1-2 hours max

**Deferred from main plans because:** Requires SMTP credentials to be set up and tested in production environment (not just localhost). Do this in production testing phase.

---

## Summary Table

| ID | Feature | Priority | Complexity | Blocked By |
|---|---|---|---|---|
| F1 | Customer-Staff Messaging | Medium | HIGH | WebSocket infra |
| F2 | Bulk File Import CSV/Excel | Low | HIGH | Validation pipeline |
| F3 | Audit Log Viewer (Admin) | Medium | MEDIUM | Verify audit_logs population |
| F4 | Staff Performance Reports | Low | MEDIUM | A1 analytics + allocation data |
| F5 | Document Verification Workflow | MOVED TO C10 | — | — |
| F6 | Commission Auto-calculation | Medium | HIGH | Business rules document |
| F7 | Mobile PWA + Push Notifications | Low | HIGH | PWA infrastructure |
| F8 | Two-Factor Authentication | Medium | HIGH | TOTP library + login flow |
| F9 | Sidebar Nav Cleanup (all roles) | Medium | LOW | All plans 01-04 done first |
| F10 | UI Consistency / Design Theme | Medium | MEDIUM | All functional changes done |
| F11 | Real Email + Forgot Password SMTP | **HIGH** | LOW | SMTP credentials in .env |
