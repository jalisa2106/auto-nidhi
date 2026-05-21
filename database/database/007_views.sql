-- ============================================================
-- AutoConsultancy ΓÇö Part 7: Views
-- ============================================================

-- Active files summary (dashboard) using strict Joins
CREATE VIEW v_files_summary AS
SELECT
    f.id,
    f.file_number,
    f.docket_date,
    f.service_type,
    c.full_name          AS customer_name,
    c.mobile_1           AS customer_mobile,
    v.vehicle_model,
    v.vehicle_number,
    fb.bank_name         AS finance_bank_name,
    ic.company_name      AS insurance_company_name,
    d.dealer_name,
    b.broker_name,
    u.first_name         AS created_by_user,
    fi.loan_amount,
    ii.premium_amount
FROM file_record f
JOIN customer c               ON c.id = f.customer_id
LEFT JOIN vehicle_info v      ON v.file_id = f.id
LEFT JOIN finance_info fi     ON fi.file_id = f.id
LEFT JOIN master_bank fb      ON fb.id = fi.bank_id
LEFT JOIN insurance_info ii   ON ii.file_id = f.id
LEFT JOIN master_insurance_company ic ON ic.id = ii.insurance_company_id
LEFT JOIN master_dealer d     ON d.id = f.reference_dealer_id
LEFT JOIN master_broker b     ON b.id = f.reference_broker_id
LEFT JOIN system_user u       ON u.id = f.created_by_user_id;

-- Outstanding advance balances
CREATE VIEW v_advance_balances AS
SELECT
    party_type,
    party_id,
    SUM(amount)              AS total_advanced,
    SUM(amount_recovered)    AS total_recovered,
    SUM(amount - amount_recovered) AS balance_outstanding
FROM advances
GROUP BY party_type, party_id
HAVING SUM(amount - amount_recovered) > 0;

-- Expiring policies
CREATE VIEW v_expiring_policies AS
SELECT
    f.id            AS file_id,
    f.file_number,
    ii.policy_number,
    ii.valid_to     AS policy_end_date,
    ii.valid_to - CURRENT_DATE AS days_to_expiry,
    c.full_name     AS customer_name,
    c.mobile_1      AS customer_mobile,
    c.email         AS customer_email,
    ic.company_name AS insurance_company_name,
    u.id            AS assigned_agent_id
FROM file_record f
JOIN customer c ON c.id = f.customer_id
JOIN insurance_info ii ON ii.file_id = f.id
LEFT JOIN master_insurance_company ic ON ic.id = ii.insurance_company_id
LEFT JOIN system_user u ON u.id = f.created_by_user_id
WHERE ii.valid_to IS NOT NULL
  AND ii.valid_to >= CURRENT_DATE;

-- Master Monthly Cashflow
CREATE VIEW v_monthly_cashflow AS
SELECT DATE_TRUNC('month', payment_date) AS month, 'Income - Customer/Company' AS category, SUM(payment_amount) AS total_amount FROM payment_in GROUP BY 1
UNION ALL
SELECT DATE_TRUNC('month', payment_date), 'Income - Commissions', SUM(amount) FROM commission_in GROUP BY 1
UNION ALL
SELECT DATE_TRUNC('month', payment_date), 'Expense - File Payouts', SUM(amount) FROM payment_out GROUP BY 1
UNION ALL
SELECT DATE_TRUNC('month', payment_date), 'Expense - Commissions', SUM(amount) FROM commission_out GROUP BY 1
UNION ALL
SELECT DATE_TRUNC('month', expense_date), 'Expense - Office Ledgers', SUM(amount) FROM expense_ledger GROUP BY 1;
