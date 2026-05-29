-- AutoNidhi — Migration 016: Customer Document Vault (Customer Portal)
-- Adds customer_document table used by /api/v1/portal/documents endpoints.

CREATE TABLE IF NOT EXISTS customer_document (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  customer_id      UUID NOT NULL REFERENCES customer(id),
  file_id          UUID REFERENCES file_record(id),

  document_type    VARCHAR(100) NOT NULL,
  label            VARCHAR(255) NOT NULL,
  category         VARCHAR(50) NOT NULL,   -- kyc / transactional
  status           VARCHAR(50) NOT NULL DEFAULT 'missing', -- verified / pending_review / rejected / missing

  file_name        VARCHAR(255),
  file_path        TEXT,
  file_size        INT,
  content_type     VARCHAR(100),

  rejection_reason TEXT,

  uploaded_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_document_customer_id
  ON customer_document(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_document_customer_category
  ON customer_document(customer_id, category);

CREATE INDEX IF NOT EXISTS idx_customer_document_status
  ON customer_document(status);

-- Reuse the shared updated_at trigger function (created in 005_triggers_constraints.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_update_updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customer_document_updated_at') THEN
      EXECUTE 'CREATE TRIGGER trg_customer_document_updated_at
               BEFORE UPDATE ON customer_document
               FOR EACH ROW
               EXECUTE FUNCTION auto_update_updated_at();';
    END IF;
  END IF;
END $$;

