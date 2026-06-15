-- ============================================================
-- AutoNidhi — Migration 030: Real-World Indian Seed Data
-- Tables: customer, file_record, finance_info,
--         payment_in, payment_out, advances
-- SAFE: Uses ON CONFLICT DO NOTHING + WHERE NOT EXISTS guards.
--       Only INSERTs — no UPDATE/DELETE on existing data.
-- ============================================================

DO $$
DECLARE
  -- System user (admin) id
  v_admin_id        UUID;

  -- Master bank ids
  v_bank_hdfc       UUID;
  v_bank_icici      UUID;
  v_bank_sbi        UUID;
  v_bank_axis       UUID;
  v_bank_kotak      UUID;
  v_bank_bajaj      UUID;
  v_bank_shriram    UUID;
  v_bank_mahindra   UUID;

  -- Dealer ids
  v_dealer_1        UUID;
  v_dealer_2        UUID;
  v_dealer_3        UUID;
  v_dealer_4        UUID;

  -- Broker ids
  v_broker_1        UUID;
  v_broker_2        UUID;
  v_broker_3        UUID;

  -- Company bank id
  v_comp_bank_id    UUID;

  -- Customer ids
  v_cust_1  UUID; v_cust_2  UUID; v_cust_3  UUID; v_cust_4  UUID;
  v_cust_5  UUID; v_cust_6  UUID; v_cust_7  UUID; v_cust_8  UUID;
  v_cust_9  UUID; v_cust_10 UUID;

  -- File record ids
  v_file_1  UUID; v_file_2  UUID; v_file_3  UUID; v_file_4  UUID;
  v_file_5  UUID; v_file_6  UUID; v_file_7  UUID; v_file_8  UUID;
  v_file_9  UUID; v_file_10 UUID;

BEGIN

  -- ── 0. Resolve admin user ──────────────────────────────────────────────
  SELECT id INTO v_admin_id FROM system_user
  WHERE role_id = (SELECT id FROM master_role WHERE role_name ILIKE 'admin')
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found. Ensure 008_seed_comments.sql has run first.';
  END IF;

  -- ── 1. Resolve master bank ids ─────────────────────────────────────────
  SELECT id INTO v_bank_hdfc    FROM master_bank WHERE bank_name = 'HDFC Bank' LIMIT 1;
  SELECT id INTO v_bank_icici   FROM master_bank WHERE bank_name = 'ICICI Bank' LIMIT 1;
  SELECT id INTO v_bank_sbi     FROM master_bank WHERE bank_name ILIKE '%State Bank%' LIMIT 1;
  SELECT id INTO v_bank_axis    FROM master_bank WHERE bank_name = 'Axis Bank' LIMIT 1;
  SELECT id INTO v_bank_kotak   FROM master_bank WHERE bank_name ILIKE '%Kotak%' LIMIT 1;
  SELECT id INTO v_bank_bajaj   FROM master_bank WHERE bank_name ILIKE '%Bajaj%' LIMIT 1;
  SELECT id INTO v_bank_shriram FROM master_bank WHERE bank_name ILIKE '%Shriram%' LIMIT 1;
  SELECT id INTO v_bank_mahindra FROM master_bank WHERE bank_name ILIKE '%Mahindra%' LIMIT 1;

  -- ── 2. Insert dealers (skip if phone already exists) ──────────────────
  INSERT INTO master_dealer (id, dealer_name, address, city, phone, email)
  VALUES
    (uuid_generate_v4(), 'Raj Motors Pvt Ltd',    '12, MG Road, Near Railway Station', 'Ahmedabad', '9825011101', 'rajmotors@gmail.com'),
    (uuid_generate_v4(), 'Shree Auto Deals',      '45, Navrangpura, Opp. HDFC Bank',   'Ahmedabad', '9825011102', 'shreeauto@gmail.com'),
    (uuid_generate_v4(), 'Krishna Vehicle World', 'Plot 7, GIDC, Vatva',               'Ahmedabad', '9825011103', 'krishnavehicle@gmail.com'),
    (uuid_generate_v4(), 'Patel Car Junction',    'Shop 3, Satellite Road',            'Ahmedabad', '9825011104', 'patelcars@gmail.com')
  ON CONFLICT (phone) DO NOTHING;

  SELECT id INTO v_dealer_1 FROM master_dealer WHERE phone = '9825011101';
  SELECT id INTO v_dealer_2 FROM master_dealer WHERE phone = '9825011102';
  SELECT id INTO v_dealer_3 FROM master_dealer WHERE phone = '9825011103';
  SELECT id INTO v_dealer_4 FROM master_dealer WHERE phone = '9825011104';

  -- ── 3. Insert brokers (skip if phone already exists) ──────────────────
  INSERT INTO master_broker (id, broker_name, area, district, phone)
  VALUES
    (uuid_generate_v4(), 'Mehul Thakkar',   'Maninagar',    'Ahmedabad', '9898011201'),
    (uuid_generate_v4(), 'Bhavesh Solanki', 'Vastrapur',    'Ahmedabad', '9898011202'),
    (uuid_generate_v4(), 'Dhruvi Desai',    'Chandkheda',   'Gandhinagar','9898011203')
  ON CONFLICT (phone) DO NOTHING;

  SELECT id INTO v_broker_1 FROM master_broker WHERE phone = '9898011201';
  SELECT id INTO v_broker_2 FROM master_broker WHERE phone = '9898011202';
  SELECT id INTO v_broker_3 FROM master_broker WHERE phone = '9898011203';

  -- ── 4. Insert company bank (if not exists) ────────────────────────────
  INSERT INTO master_company_bank (id, bank_name, area, account_number, ifsc_code)
  VALUES (uuid_generate_v4(), 'HDFC Bank - Company', 'Ahmedabad', '50200099887766', 'HDFC0001234')
  ON CONFLICT (account_number) DO NOTHING;

  SELECT id INTO v_comp_bank_id FROM master_company_bank WHERE account_number = '50200099887766';

  -- ── 5. Insert customers ───────────────────────────────────────────────
  INSERT INTO customer (id, full_name, email, mobile_1, mobile_2, address, city, state,
                         pincode, date_of_birth, aadhar_number, pan_number,
                         customer_type, created_by, created_at)
  VALUES
    (uuid_generate_v4(), 'Ramesh Patel',       'ramesh.patel@gmail.com',     '9712300001', '9712300002', '14, Ambawadi, Nr. Sales India', 'Ahmedabad', 'Gujarat', '380015', '1985-03-12', '234512349876', 'ABCDE1234F', 'individual', v_admin_id, NOW() - INTERVAL '60 days'),
    (uuid_generate_v4(), 'Sunita Sharma',      'sunita.sharma@yahoo.com',    '9712300003', NULL,          '7, Vaishno Devi Society, Bopal',  'Ahmedabad', 'Gujarat', '380058', '1990-07-25', '345623456789', 'BCDEF2345G', 'individual', v_admin_id, NOW() - INTERVAL '55 days'),
    (uuid_generate_v4(), 'Vijay Kumar Singh',  'vijay.singh@rediffmail.com', '9712300005', '9712300006', '22, Sector 12, Gandhi Nagar',    'Gandhinagar','Gujarat','382016', '1978-11-30', '456734567890', 'CDEFG3456H', 'individual', v_admin_id, NOW() - INTERVAL '50 days'),
    (uuid_generate_v4(), 'Priya Mehta',        'priya.mehta@gmail.com',      '9712300007', NULL,          'B-5, Prem Society, Navrangpura',  'Ahmedabad', 'Gujarat', '380009', '1995-01-15', '567845678901', 'DEFGH4567I', 'individual', v_admin_id, NOW() - INTERVAL '45 days'),
    (uuid_generate_v4(), 'Ankit Joshi',        'ankit.joshi@gmail.com',      '9712300009', '9712300010', '31, Jalaram Society, Vastral',    'Ahmedabad', 'Gujarat', '382418', '1988-06-20', '678956789012', 'EFGHI5678J', 'individual', v_admin_id, NOW() - INTERVAL '40 days'),
    (uuid_generate_v4(), 'Kavita Rao',         'kavita.rao@gmail.com',       '9712300011', NULL,          '9, Narayan Nagar, Paldi',         'Ahmedabad', 'Gujarat', '380007', '1992-09-05', '789067890123', 'FGHIJ6789K', 'individual', v_admin_id, NOW() - INTERVAL '35 days'),
    (uuid_generate_v4(), 'Suresh Verma',       'suresh.verma@outlook.com',   '9712300013', '9712300014', '47, Shiv Colony, Odhav',          'Ahmedabad', 'Gujarat', '382415', '1982-04-18', '890178901234', 'GHIJK7890L', 'individual', v_admin_id, NOW() - INTERVAL '30 days'),
    (uuid_generate_v4(), 'Neha Gupta',         'neha.gupta@gmail.com',       '9712300015', NULL,          '15, Sai Krupa Society, Chandlodia','Ahmedabad','Gujarat', '382481', '1997-12-02', '901289012345', 'HIJKL8901M', 'individual', v_admin_id, NOW() - INTERVAL '25 days'),
    (uuid_generate_v4(), 'Harish Desai',       'harish.desai@gmail.com',     '9712300017', '9712300018', '8, Trimurti Society, Gota',        'Ahmedabad', 'Gujarat', '382481', '1975-08-14', '012390123456', 'IJKLM9012N', 'business',   v_admin_id, NOW() - INTERVAL '20 days'),
    (uuid_generate_v4(), 'Deepika Nair',       'deepika.nair@gmail.com',     '9712300019', NULL,          '25, Silver Oak, Science City Road','Ahmedabad','Gujarat', '380060', '1993-03-28', '123401234567', 'JKLMN0123O', 'individual', v_admin_id, NOW() - INTERVAL '15 days')
  ON CONFLICT (mobile_1) DO NOTHING;

  SELECT id INTO v_cust_1  FROM customer WHERE mobile_1 = '9712300001';
  SELECT id INTO v_cust_2  FROM customer WHERE mobile_1 = '9712300003';
  SELECT id INTO v_cust_3  FROM customer WHERE mobile_1 = '9712300005';
  SELECT id INTO v_cust_4  FROM customer WHERE mobile_1 = '9712300007';
  SELECT id INTO v_cust_5  FROM customer WHERE mobile_1 = '9712300009';
  SELECT id INTO v_cust_6  FROM customer WHERE mobile_1 = '9712300011';
  SELECT id INTO v_cust_7  FROM customer WHERE mobile_1 = '9712300013';
  SELECT id INTO v_cust_8  FROM customer WHERE mobile_1 = '9712300015';
  SELECT id INTO v_cust_9  FROM customer WHERE mobile_1 = '9712300017';
  SELECT id INTO v_cust_10 FROM customer WHERE mobile_1 = '9712300019';

  -- ── 6. Insert file_records ─────────────────────────────────────────────
  INSERT INTO file_record (id, customer_id, created_by_user_id, assigned_to, file_number,
                            docket_date, file_type, status, reference_dealer_id,
                            reference_broker_id, remarks, is_deleted, created_at, updated_at)
  VALUES
    (uuid_generate_v4(), v_cust_1,  v_admin_id, v_admin_id, 'AN-2024-0001', '2024-06-01', 'new_vehicle',  'completed',      v_dealer_1, v_broker_1, 'Maruti Suzuki Dzire new purchase',     FALSE, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days'),
    (uuid_generate_v4(), v_cust_2,  v_admin_id, v_admin_id, 'AN-2024-0002', '2024-06-10', 'used_vehicle', 'disbursed',      v_dealer_2, v_broker_2, 'Honda Activa used vehicle transfer',   FALSE, NOW() - INTERVAL '55 days', NOW() - INTERVAL '20 days'),
    (uuid_generate_v4(), v_cust_3,  v_admin_id, v_admin_id, 'AN-2024-0003', '2024-06-15', 'new_vehicle',  'sanctioned',     v_dealer_1, v_broker_3, 'Hyundai Creta new purchase',           FALSE, NOW() - INTERVAL '50 days', NOW() - INTERVAL '10 days'),
    (uuid_generate_v4(), v_cust_4,  v_admin_id, v_admin_id, 'AN-2024-0004', '2024-06-20', 'renewal',      'completed',      v_dealer_3, v_broker_1, 'Insurance renewal - Honda City',       FALSE, NOW() - INTERVAL '45 days', NOW() - INTERVAL '5 days'),
    (uuid_generate_v4(), v_cust_5,  v_admin_id, v_admin_id, 'AN-2024-0005', '2024-07-01', 'new_vehicle',  'under_process',  v_dealer_2, v_broker_2, 'Tata Nexon EV new purchase',           FALSE, NOW() - INTERVAL '40 days', NOW() - INTERVAL '3 days'),
    (uuid_generate_v4(), v_cust_6,  v_admin_id, v_admin_id, 'AN-2024-0006', '2024-07-10', 'used_vehicle', 'login',          v_dealer_4, v_broker_3, 'Mahindra Scorpio used vehicle',        FALSE, NOW() - INTERVAL '35 days', NOW() - INTERVAL '2 days'),
    (uuid_generate_v4(), v_cust_7,  v_admin_id, v_admin_id, 'AN-2024-0007', '2024-07-15', 'new_vehicle',  'disbursed',      v_dealer_3, v_broker_1, 'Bajaj Pulsar 150 new vehicle',         FALSE, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), v_cust_8,  v_admin_id, v_admin_id, 'AN-2024-0008', '2024-07-20', 'used_vehicle', 'completed',      v_dealer_1, v_broker_2, 'Maruti WagonR used purchase',          FALSE, NOW() - INTERVAL '25 days', NOW()),
    (uuid_generate_v4(), v_cust_9,  v_admin_id, v_admin_id, 'AN-2024-0009', '2024-08-01', 'new_vehicle',  'sanctioned',     v_dealer_4, v_broker_3, 'Toyota Fortuner - Business purchase',  FALSE, NOW() - INTERVAL '20 days', NOW()),
    (uuid_generate_v4(), v_cust_10, v_admin_id, v_admin_id, 'AN-2024-0010', '2024-08-10', 'renewal',      'draft',          v_dealer_2, v_broker_1, 'Insurance renewal - Two wheeler',      FALSE, NOW() - INTERVAL '15 days', NOW())
  ON CONFLICT (file_number) DO NOTHING;

  SELECT id INTO v_file_1  FROM file_record WHERE file_number = 'AN-2024-0001';
  SELECT id INTO v_file_2  FROM file_record WHERE file_number = 'AN-2024-0002';
  SELECT id INTO v_file_3  FROM file_record WHERE file_number = 'AN-2024-0003';
  SELECT id INTO v_file_4  FROM file_record WHERE file_number = 'AN-2024-0004';
  SELECT id INTO v_file_5  FROM file_record WHERE file_number = 'AN-2024-0005';
  SELECT id INTO v_file_6  FROM file_record WHERE file_number = 'AN-2024-0006';
  SELECT id INTO v_file_7  FROM file_record WHERE file_number = 'AN-2024-0007';
  SELECT id INTO v_file_8  FROM file_record WHERE file_number = 'AN-2024-0008';
  SELECT id INTO v_file_9  FROM file_record WHERE file_number = 'AN-2024-0009';
  SELECT id INTO v_file_10 FROM file_record WHERE file_number = 'AN-2024-0010';

  -- ── 7. Finance Info ────────────────────────────────────────────────────
  -- Only insert if finance_info doesn't already exist for these files
  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_1, 'HDFC-LAN-2024-0011', 550000, 60, 10450, v_bank_hdfc, 'Ahmedabad',  8500, 1200, 10.50, 542000, 5000, 558700
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_1);

  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_2, 'ICICI-LAN-2024-0022', 320000, 48, 7820, v_bank_icici, 'Ahmedabad', 6200, 900, 11.25, 314000, 4000, 328100
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_2);

  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_3, 'SBI-LAN-2024-0033', 1200000, 84, 16890, v_bank_sbi, 'Gandhinagar', 12000, 2500, 9.75, 1185000, 8000, 1214500
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_3);

  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_4, 'AXIS-LAN-2024-0044', 180000, 36, 5560, v_bank_axis, 'Ahmedabad',  3200, 600, 12.00, 176000, 2000, 183800
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_4);

  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_5, 'KOTAK-LAN-2024-0055', 1500000, 72, 24300, v_bank_kotak, 'Ahmedabad', 18000, 3500, 9.50, 1480000, 12000, 1521500
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_5);

  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_6, 'BAJAJ-LAN-2024-0066', 420000, 48, 10200, v_bank_bajaj, 'Ahmedabad', 7500, 1100, 13.50, 413000, 5000, 428600
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_6);

  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_7, 'SHRIRAM-LAN-2024-0077', 95000, 36, 3100, v_bank_shriram, 'Ahmedabad', 1800, 400, 14.00, 92000, 1500, 97200
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_7);

  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_8, 'HDFC-LAN-2024-0088', 250000, 36, 7800, v_bank_hdfc, 'Ahmedabad',  4500, 800, 11.75, 244000, 3000, 255300
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_8);

  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_9, 'MAHINDRA-LAN-2024-0099', 3500000, 84, 48900, v_bank_mahindra, 'Ahmedabad', 40000, 8000, 10.25, 3450000, 25000, 3548000
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_9);

  INSERT INTO finance_info (id, file_id, lan_number, loan_amount, no_of_months, emi_amount,
                              bank_id, area, fc_sc_gst_amount, gap_interest, irr_percentage,
                              disbursement_amount, rto_hold_amount, total_amount)
  SELECT uuid_generate_v4(), v_file_10, 'ICICI-LAN-2024-0110', 75000, 24, 3520, v_bank_icici, 'Ahmedabad', 1200, 300, 13.00, 73000, 1000, 76500
  WHERE NOT EXISTS (SELECT 1 FROM finance_info WHERE file_id = v_file_10);

  -- ── 8. Payment In ─────────────────────────────────────────────────────
  -- Skipped for files that already have a payment_in to avoid duplicates
  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_1, 558700, 558700, 0, FALSE, 'neft', '2024-07-01', 'customer', v_comp_bank_id, 'Full payment received - Dzire'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_1);

  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           cheque_bank_name, branch_name, cheque_no, cheque_date, cheque_amount,
                           company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_2, 328100, 200000, 128100, FALSE, 'cheque', '2024-07-05', 'customer', 'ICICI Bank', 'Vastrapur', 'CHQ-001122', '2024-07-05', 200000, v_comp_bank_id, 'Part payment - Honda Activa'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_2);

  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           utr_no, company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_3, 1214500, 1214500, 0, FALSE, 'rtgs', '2024-07-10', 'customer', 'UTR20240710123456', v_comp_bank_id, 'Full payment - Hyundai Creta'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_3);

  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_4, 183800, 183800, 0, FALSE, 'upi', '2024-07-15', 'customer', v_comp_bank_id, 'Renewal premium full payment'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_4);

  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           utr_no, company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_5, 1521500, 800000, 721500, FALSE, 'rtgs', '2024-07-20', 'customer', 'UTR20240720987654', v_comp_bank_id, 'Part payment received - Nexon EV'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_5);

  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_6, 428600, 100000, 328600, FALSE, 'cash', '2024-07-25', 'customer', v_comp_bank_id, 'Cash advance received - Scorpio'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_6);

  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_7, 97200, 97200, 0, TRUE, 'imps', '2024-08-01', 'customer', v_comp_bank_id, 'Full payment - Bajaj Pulsar'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_7);

  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           cheque_bank_name, branch_name, cheque_no, cheque_date, cheque_amount,
                           company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_8, 255300, 255300, 0, FALSE, 'cheque', '2024-08-05', 'customer', 'HDFC Bank', 'Bopal', 'CHQ-005566', '2024-08-05', 255300, v_comp_bank_id, 'Full payment - WagonR'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_8);

  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           utr_no, company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_9, 3548000, 1500000, 2048000, FALSE, 'rtgs', '2024-08-10', 'customer', 'UTR20240810556677', v_comp_bank_id, 'First tranche - Toyota Fortuner'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_9);

  INSERT INTO payment_in (id, file_id, payment_amount, paid_amount, remaining_amount,
                           round_up, payment_mode, payment_date, payment_from,
                           company_bank_id, remarks)
  SELECT uuid_generate_v4(), v_file_10, 76500, 40000, 36500, FALSE, 'upi', '2024-08-15', 'customer', v_comp_bank_id, 'Part payment - Two wheeler renewal'
  WHERE NOT EXISTS (SELECT 1 FROM payment_in WHERE file_id = v_file_10);

  -- ── 9. Payment Out ────────────────────────────────────────────────────
  -- Payouts to dealers (commission, RTO charges, etc.)
  INSERT INTO payment_out (id, file_id, amount, payment_mode, payment_date, payment_to,
                             payee_dealer_id, bank_account_no, ifsc_code, remarks)
  SELECT uuid_generate_v4(), v_file_1, 8000, 'neft', '2024-07-03', 'dealer', v_dealer_1, '005501234567', 'HDFC0000055', 'Dealer commission - Dzire'
  WHERE NOT EXISTS (SELECT 1 FROM payment_out WHERE file_id = v_file_1 AND payment_to = 'dealer');

  INSERT INTO payment_out (id, file_id, amount, payment_mode, payment_date, payment_to,
                             payee_broker_id, remarks)
  SELECT uuid_generate_v4(), v_file_1, 3500, 'cash', '2024-07-03', 'broker', v_broker_1, 'Broker fee - Dzire'
  WHERE NOT EXISTS (SELECT 1 FROM payment_out WHERE file_id = v_file_1 AND payment_to = 'broker');

  INSERT INTO payment_out (id, file_id, amount, payment_mode, payment_date, payment_to,
                             payee_dealer_id, bank_account_no, ifsc_code, remarks)
  SELECT uuid_generate_v4(), v_file_2, 5000, 'imps', '2024-07-08', 'dealer', v_dealer_2, '005509876543', 'ICIC0000099', 'Dealer payout - Activa transfer'
  WHERE NOT EXISTS (SELECT 1 FROM payment_out WHERE file_id = v_file_2 AND payment_to = 'dealer');

  INSERT INTO payment_out (id, file_id, amount, payment_mode, payment_date, payment_to,
                             payee_broker_id, remarks)
  SELECT uuid_generate_v4(), v_file_2, 2000, 'cash', '2024-07-08', 'broker', v_broker_2, 'Broker fee - Activa'
  WHERE NOT EXISTS (SELECT 1 FROM payment_out WHERE file_id = v_file_2 AND payment_to = 'broker');

  INSERT INTO payment_out (id, file_id, amount, payment_mode, payment_date, payment_to,
                             payee_dealer_id, utr_no, remarks)
  SELECT uuid_generate_v4(), v_file_3, 18000, 'rtgs', '2024-07-12', 'dealer', v_dealer_1, 'UTR20240712111222', 'Dealer commission - Creta'
  WHERE NOT EXISTS (SELECT 1 FROM payment_out WHERE file_id = v_file_3 AND payment_to = 'dealer');

  INSERT INTO payment_out (id, file_id, amount, payment_mode, payment_date, payment_to,
                             payee_broker_id, remarks)
  SELECT uuid_generate_v4(), v_file_3, 6000, 'upi', '2024-07-12', 'broker', v_broker_3, 'Broker fee - Creta'
  WHERE NOT EXISTS (SELECT 1 FROM payment_out WHERE file_id = v_file_3 AND payment_to = 'broker');

  INSERT INTO payment_out (id, file_id, amount, payment_mode, payment_date, payment_to,
                             payee_dealer_id, cheque_no, cheque_bank_name, branch_name, cheque_date, cheque_amount, remarks)
  SELECT uuid_generate_v4(), v_file_5, 22000, 'cheque', '2024-07-22', 'dealer', v_dealer_2, 'CHQ-009988', 'Kotak Bank', 'Satellite', '2024-07-22', 22000, 'Dealer commission - Nexon EV'
  WHERE NOT EXISTS (SELECT 1 FROM payment_out WHERE file_id = v_file_5 AND payment_to = 'dealer');

  INSERT INTO payment_out (id, file_id, amount, payment_mode, payment_date, payment_to,
                             payee_broker_id, remarks)
  SELECT uuid_generate_v4(), v_file_7, 3000, 'cash', '2024-08-02', 'broker', v_broker_1, 'Broker fee - Pulsar 150'
  WHERE NOT EXISTS (SELECT 1 FROM payment_out WHERE file_id = v_file_7 AND payment_to = 'broker');

  INSERT INTO payment_out (id, file_id, amount, payment_mode, payment_date, payment_to,
                             payee_dealer_id, utr_no, remarks)
  SELECT uuid_generate_v4(), v_file_9, 50000, 'rtgs', '2024-08-12', 'dealer', v_dealer_4, 'UTR20240812334455', 'Dealer commission - Fortuner (partial)'
  WHERE NOT EXISTS (SELECT 1 FROM payment_out WHERE file_id = v_file_9 AND payment_to = 'dealer');

  -- ── 10. Advances ──────────────────────────────────────────────────────
  -- Advance payments to dealers / brokers
  INSERT INTO advances (id, dealer_id, broker_id, advance_date, amount, mode,
                          utr_cheque_number, purpose, file_id, recovery_status,
                          amount_recovered, remarks, created_by, created_at, updated_at)
  SELECT uuid_generate_v4(), v_dealer_1, NULL, '2024-06-05', 25000, 'neft', 'UTR20240605778899',
         'Pre-booking advance for Maruti Dzire stock', v_file_1, 'fully_recovered', 25000,
         'Recovered after disbursement', v_admin_id, NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days'
  WHERE NOT EXISTS (SELECT 1 FROM advances WHERE dealer_id = v_dealer_1 AND file_id = v_file_1);

  INSERT INTO advances (id, dealer_id, broker_id, advance_date, amount, mode,
                          utr_cheque_number, purpose, file_id, recovery_status,
                          amount_recovered, remarks, created_by, created_at, updated_at)
  SELECT uuid_generate_v4(), NULL, v_broker_2, '2024-06-20', 10000, 'cash', NULL,
         'Broker advance for Activa transfer', v_file_2, 'partial', 6000,
         'Rs. 6000 recovered, Rs. 4000 pending', v_admin_id, NOW() - INTERVAL '50 days', NOW() - INTERVAL '15 days'
  WHERE NOT EXISTS (SELECT 1 FROM advances WHERE broker_id = v_broker_2 AND file_id = v_file_2);

  INSERT INTO advances (id, dealer_id, broker_id, advance_date, amount, mode,
                          utr_cheque_number, purpose, file_id, recovery_status,
                          amount_recovered, remarks, created_by, created_at, updated_at)
  SELECT uuid_generate_v4(), v_dealer_2, NULL, '2024-07-02', 50000, 'cheque', 'CHQ-007733',
         'Advance for Nexon EV booking', v_file_5, 'pending', 0,
         'Full amount pending recovery', v_admin_id, NOW() - INTERVAL '38 days', NOW() - INTERVAL '3 days'
  WHERE NOT EXISTS (SELECT 1 FROM advances WHERE dealer_id = v_dealer_2 AND file_id = v_file_5);

  INSERT INTO advances (id, dealer_id, broker_id, advance_date, amount, mode,
                          utr_cheque_number, purpose, file_id, recovery_status,
                          amount_recovered, remarks, created_by, created_at, updated_at)
  SELECT uuid_generate_v4(), v_dealer_4, NULL, '2024-08-02', 100000, 'rtgs', 'UTR20240802998877',
         'Advance for Toyota Fortuner showroom booking', v_file_9, 'pending', 0,
         'Advance given, recovery pending after full disbursement', v_admin_id, NOW() - INTERVAL '18 days', NOW()
  WHERE NOT EXISTS (SELECT 1 FROM advances WHERE dealer_id = v_dealer_4 AND file_id = v_file_9);

  INSERT INTO advances (id, dealer_id, broker_id, advance_date, amount, mode,
                          utr_cheque_number, purpose, file_id, recovery_status,
                          amount_recovered, remarks, created_by, created_at, updated_at)
  SELECT uuid_generate_v4(), NULL, v_broker_3, '2024-07-18', 15000, 'upi', NULL,
         'Broker advance - Mahindra Scorpio referral', v_file_6, 'partial', 8000,
         'Rs. 8000 recovered against commission', v_admin_id, NOW() - INTERVAL '32 days', NOW() - INTERVAL '2 days'
  WHERE NOT EXISTS (SELECT 1 FROM advances WHERE broker_id = v_broker_3 AND file_id = v_file_6);

  RAISE NOTICE 'Seed data inserted successfully: 4 dealers, 3 brokers, 10 customers, 10 file records, 10 finance_info, 10 payment_in, 8 payment_out, 5 advances.';

END $$;
