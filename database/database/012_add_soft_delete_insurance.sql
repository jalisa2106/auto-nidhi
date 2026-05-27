-- ============================================================
-- Add Soft Delete Columns to Insurance Tables
-- ============================================================

-- Add soft delete columns to master_insurance_type
ALTER TABLE master_insurance_type
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Add soft delete columns to master_insurance_company
ALTER TABLE master_insurance_company
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Create indexes for efficient filtering
CREATE INDEX idx_master_insurance_type_is_deleted 
ON master_insurance_type(is_deleted);

CREATE INDEX idx_master_insurance_company_is_deleted 
ON master_insurance_company(is_deleted);
