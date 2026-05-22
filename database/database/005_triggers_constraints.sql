-- AutoNidhi — Part 5: Triggers, Functions, Constraints
-- CHANGES: + auto_update_updated_at() trigger applied to file_record and advances

CREATE SEQUENCE file_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_file_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.file_number := 'AC/' || TO_CHAR(NOW(), 'YYYY') || '/' ||
    LPAD(NEXTVAL('file_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_file_number
BEFORE INSERT ON file_record
FOR EACH ROW
WHEN (NEW.file_number IS NULL OR NEW.file_number = '')
EXECUTE FUNCTION generate_file_number();

ALTER TABLE advances
  ADD CONSTRAINT chk_advance_recovery_not_exceed
  CHECK (amount_recovered <= amount);

-- [NEW] Auto-set updated_at on every UPDATE
CREATE OR REPLACE FUNCTION auto_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_file_record_updated_at
BEFORE UPDATE ON file_record
FOR EACH ROW EXECUTE FUNCTION auto_update_updated_at();

CREATE TRIGGER trg_advances_updated_at
BEFORE UPDATE ON advances
FOR EACH ROW EXECUTE FUNCTION auto_update_updated_at();
