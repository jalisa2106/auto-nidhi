-- AutoNidhi — Part 8: Seed Data & Comments
-- FIXED: Was inserting into 'users' and 'company_details' — tables that don't exist.
--        Correct tables are system_user and master_company_profile.

-- Seed roles first (needed as FK)
INSERT INTO master_role (id, role_name, description) VALUES
  (uuid_generate_v4(), 'admin',    'Full system access'),
  (uuid_generate_v4(), 'Accountant', 'Day-to-day operations'),
  (uuid_generate_v4(), 'Data_Entry', 'Field executive, own leads only'),
  (uuid_generate_v4(), 'Customer', 'Self-service portal access');

-- Admin user
INSERT INTO system_user (id, first_name, last_name, email, password_hash, role_id, is_active)
VALUES (
  uuid_generate_v4(), 'System', 'Admin', 'admin@autoconsultancy.in',
  '$2b$12$examplehashplaceholder.replacethisbeforegoingproduction',
  (SELECT id FROM master_role WHERE role_name = 'admin'),
  TRUE
);

-- Company record
INSERT INTO master_company_profile (id, company_name, address_1, mobile_no, insurance_expiry_notification)
VALUES (
  uuid_generate_v4(), 'AutoConsultancy',
  'Your Office Address Here', '+91-0000000000', '30'
);

-- Comments
COMMENT ON TABLE file_record    IS 'Central hub. file_type and status use strict enums for lifecycle tracking.';
COMMENT ON TABLE customer       IS 'KYC fields (aadhar_number, pan_number) must be encrypted at app layer.';
COMMENT ON TABLE payment_in     IS 'paid_amount + remaining_amount = payment_amount enforced by CHECK constraint.';
COMMENT ON TABLE advances       IS 'dealer_id or broker_id must be set (never both) — chk_advances_one_party.';
COMMENT ON TABLE expense_ledger IS 'file_id NULL = general overhead; file_id set = file-specific expense.';
COMMENT ON TABLE audit_logs     IS 'Append-only. Never UPDATE or DELETE rows here.';
COMMENT ON COLUMN customer.aadhar_number        IS 'SENSITIVE: Encrypt before storing. Never log.';
COMMENT ON COLUMN customer.pan_number           IS 'SENSITIVE: Encrypt before storing.';
COMMENT ON COLUMN system_user.password_hash     IS 'CRITICAL: bcrypt/argon2 only. Never plain text.';
