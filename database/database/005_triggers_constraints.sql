-- ============================================================
-- AutoConsultancy ΓÇö Part 5: Triggers, Functions, Constraints
-- ============================================================

-- File number sequence
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

-- Advance: recovered cannot exceed advanced
ALTER TABLE advances
    ADD CONSTRAINT chk_advance_recovery_not_exceed
    CHECK (amount_recovered <= amount);
