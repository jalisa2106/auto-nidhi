-- AutoNidhi — Migration 010: Add company_bank_id to payment_out and commission_out
-- Safe: uses ADD COLUMN IF NOT EXISTS — non-destructive, existing rows get NULL

ALTER TABLE payment_out
  ADD COLUMN IF NOT EXISTS company_bank_id UUID REFERENCES master_company_bank(id);

ALTER TABLE commission_out
  ADD COLUMN IF NOT EXISTS company_bank_id UUID REFERENCES master_company_bank(id);
