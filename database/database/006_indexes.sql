-- AutoNidhi — Part 6: Indexes
-- CHANGES: + 6 new indexes; removed old broken advances index (party_id gone)

-- Customer
CREATE INDEX idx_customer_mobile_1    ON customer(mobile_1);
CREATE INDEX idx_customer_name_search ON customer USING gin(to_tsvector('english', full_name));
CREATE INDEX idx_customer_created_by  ON customer(created_by);

-- File Record
CREATE INDEX idx_file_record_customer_id  ON file_record(customer_id);
CREATE INDEX idx_file_record_created_at   ON file_record(created_at DESC);
CREATE INDEX idx_file_record_created_by   ON file_record(created_by_user_id);
CREATE INDEX idx_file_record_assigned_to  ON file_record(assigned_to);
CREATE INDEX idx_file_record_status       ON file_record(status);
CREATE INDEX idx_file_record_file_type    ON file_record(file_type);

-- Sub-Modules
CREATE INDEX idx_vehicle_info_file_id    ON vehicle_info(file_id);
CREATE INDEX idx_finance_info_file_id    ON finance_info(file_id);
CREATE INDEX idx_insurance_info_file_id  ON insurance_info(file_id);
CREATE INDEX idx_insurance_info_type_id  ON insurance_info(insurance_type_id);
CREATE INDEX idx_rto_info_file_id        ON rto_info(file_id);

-- Documents
CREATE INDEX idx_documents_file_id     ON documents(file_id);
CREATE INDEX idx_documents_not_deleted ON documents(file_id) WHERE is_deleted = FALSE;

-- Ledgers
CREATE INDEX idx_payment_in_file_id         ON payment_in(file_id);
CREATE INDEX idx_payment_out_file_id        ON payment_out(file_id);
CREATE INDEX idx_commission_in_file_id      ON commission_in(file_id);
CREATE INDEX idx_commission_out_file_id     ON commission_out(file_id);
CREATE INDEX idx_expense_category_id        ON expense_ledger(expense_category_id);
CREATE INDEX idx_expense_ledger_file_id     ON expense_ledger(file_id);
CREATE INDEX idx_rto_payment_file_id        ON rto_payment(file_id);
CREATE INDEX idx_insurance_payment_file_id  ON insurance_payment(file_id);

-- Advances (FIXED: old idx_advances_party removed, replaced with proper FK indexes)
CREATE INDEX idx_advances_dealer_id ON advances(dealer_id);
CREATE INDEX idx_advances_broker_id ON advances(broker_id);
CREATE INDEX idx_advances_file_id   ON advances(file_id);

-- Operational
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX idx_notifications_unread    ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_file_id   ON notifications(file_id);
