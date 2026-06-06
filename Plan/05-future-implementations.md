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

## Summary Table

| ID | Feature | Priority | Complexity | Blocked By |
|---|---|---|---|---|
| F1 | Customer-Staff Messaging | Medium | HIGH | WebSocket infra |
| F2 | Bulk File Import CSV/Excel | Low | HIGH | Validation pipeline |
| F3 | Audit Log Viewer (Admin) | Medium | MEDIUM | Verify audit_logs population |
| F4 | Staff Performance Reports | Low | MEDIUM | A1 analytics + allocation data |
| F5 | Document Verification Workflow | Medium | MEDIUM | A3 (CustomerDetailPage) |
| F6 | Commission Auto-calculation | Medium | HIGH | Business rules document |
| F7 | Mobile PWA + Push Notifications | Low | HIGH | PWA infrastructure |
| F8 | Two-Factor Authentication | Medium | HIGH | TOTP library + login flow |
