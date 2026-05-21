-- ============================================================
-- AutoConsultancy ΓÇö Part 1: Extensions & Enums
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Documents
CREATE TYPE document_type AS ENUM (
    'aadhar_front','aadhar_back','pan_card','passport_photo',
    'address_proof','income_proof','bank_statement','vehicle_rc',
    'insurance_copy','dealer_invoice','form_34_35','noc',
    'signature_photo','other'
);
CREATE TYPE document_status AS ENUM ('pending_review','verified','rejected');

-- Payments & Ledgers
CREATE TYPE payment_mode AS ENUM ('cash','cheque','rtgs','neft','imps','upi');
CREATE TYPE payment_from_enum AS ENUM ('customer', 'company');
CREATE TYPE payment_to_enum AS ENUM ('customer', 'dealer', 'broker');
CREATE TYPE payee_type_enum AS ENUM ('dealer', 'broker', 'rto');

-- Advances & Other
CREATE TYPE party_type AS ENUM ('dealer','broker');
CREATE TYPE recovery_status AS ENUM ('pending','partial','fully_recovered');
CREATE TYPE notification_type AS ENUM (
    'insurance_expiry','file_status_change','document_approved',
    'document_rejected','payment_recorded','commission_credited','general'
);
