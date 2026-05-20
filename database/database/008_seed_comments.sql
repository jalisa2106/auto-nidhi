-- ============================================================
-- AutoConsultancy ΓÇö Part 8: Seed Data & Comments
-- ============================================================

-- Insert admin role first and then the initial admin user (CHANGE PASSWORD HASH IN PRODUCTION)
WITH inserted_role AS (
    INSERT INTO master_role (id, role_name, description)
    VALUES (uuid_generate_v4(), 'admin', 'System Administrator')
    RETURNING id
)
INSERT INTO system_user (id, role_id, first_name, last_name, email, password_hash)
SELECT 
    uuid_generate_v4(),
    id,
    'System',
    'Admin',
    'admin@autoconsultancy.in',
    '$2b$12$examplehashplaceholder.replacethisbeforegoingproduction'
FROM inserted_role;

-- Company record
INSERT INTO master_company_profile (
    id, company_name, mobile_no, address_1, insurance_expiry_notification
) VALUES (
    uuid_generate_v4(),
    'AutoConsultancy',
    '+91-0000000000',
    'Head Office',
    '30 days'
);

-- ==============================
-- Table & Column Comments 
-- ==============================
COMMENT ON TABLE file_record IS 'Central hub. Links a customer to separated vehicle, finance, insurance, and RTO sub-modules.';
COMMENT ON TABLE payment_in IS 'Ledger for incoming payments. Separated from outward flows for strict accounting integrity.';
COMMENT ON TABLE commission_out IS 'Tracks outward commissions paid to dealers, brokers, or RTO agents.';
COMMENT ON TABLE advances IS 'Polymorphic advance tracking. party_type references either master_dealer or master_broker.';
COMMENT ON TABLE audit_logs IS 'Append-only compliance log. Stores JSONB snapshots of old/new values. Never update or delete.';
COMMENT ON COLUMN system_user.password_hash IS 'CRITICAL: Must be hashed (bcrypt/argon2) at application layer. Never plain text.';
COMMENT ON VIEW v_expiring_policies IS 'Aggregates insurance_info and customer data for automated renewal alerts.';
