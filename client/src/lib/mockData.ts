// AutoNidhi — local seed data used while API endpoints are being built out

export const mockCustomers = [
  { id: 'C001', name: 'Rakesh Sharma',  mobile: '9876543210', city: 'Pune',       files: 3, created: '2025-03-12' },
  { id: 'C002', name: 'Anita Desai',    mobile: '9090909090', city: 'Mumbai',     files: 1, created: '2025-04-02' },
  { id: 'C003', name: 'Vikram Patil',   mobile: '9123456780', city: 'Nashik',     files: 2, created: '2025-05-19' },
  { id: 'C004', name: 'Pooja Iyer',     mobile: '9988776655', city: 'Bengaluru',  files: 1, created: '2025-06-21' },
  { id: 'C005', name: 'Sanjay Mehta',   mobile: '9876123450', city: 'Ahmedabad',  files: 4, created: '2025-07-30' },
]

export const mockFiles = [
  { id: 'F1001', customer: 'Rakesh Sharma', type: 'NEW',     status: 'Disbursed',      bank: 'HDFC Bank', assigned: 'Aditya Rao',  created: '2025-08-04' },
  { id: 'F1002', customer: 'Anita Desai',   type: 'USED',    status: 'Under Process',  bank: 'ICICI',     assigned: 'Neha Patil',  created: '2025-09-12' },
  { id: 'F1003', customer: 'Vikram Patil',  type: 'RENEWAL', status: 'Completed',      bank: '—',         assigned: 'Aditya Rao',  created: '2025-09-22' },
  { id: 'F1004', customer: 'Sanjay Mehta',  type: 'NEW',     status: 'Login',          bank: 'Axis',      assigned: 'Aditya Rao',  created: '2025-10-08' },
  { id: 'F1005', customer: 'Pooja Iyer',    type: 'NEW',     status: 'Draft',          bank: 'Kotak',     assigned: '—',           created: '2025-10-30' },
  { id: 'F1006', customer: 'Ravi Kumar',    type: 'NEW',     status: 'Sanctioned',     bank: 'SBI',       assigned: 'Neha Patil',  created: '2025-10-05' },
  { id: 'F1007', customer: 'Priya Shah',    type: 'USED',    status: 'Login',          bank: 'HDFC Bank', assigned: 'Aditya Rao',  created: '2025-10-18' },
  { id: 'F1008', customer: 'Amit Verma',    type: 'NEW',     status: 'Under Process',  bank: 'Kotak',     assigned: 'Neha Patil',  created: '2025-10-20' },
  { id: 'F1009', customer: 'Sunita Rao',    type: 'RENEWAL', status: 'Draft',          bank: '—',         assigned: '—',           created: '2025-11-01' },
  { id: 'F1010', customer: 'Deepak Joshi',  type: 'NEW',     status: 'Cancelled',      bank: 'Axis',      assigned: 'Aditya Rao',  created: '2025-09-01' },
]

// ─── Payment IN ────────────────────────────────────────────────────────────
// All fields map 1:1 to payment_in DB table columns
export const mockPaymentsIn = [
  {
    id: 'PI001', file_number: 'F1001', customer: 'Rakesh Sharma',
    payment_amount: 85000, paid_amount: 85000, remaining_amount: 0, round_up: false,
    payment_mode: 'UPI', payment_date: '2025-10-12', payment_from: 'Customer',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'UTR202510120001', company_bank_id: 'CB001', remarks: 'Down payment received',
  },
  {
    id: 'PI002', file_number: 'F1003', customer: 'Vikram Patil',
    payment_amount: 12500, paid_amount: 12500, remaining_amount: 0, round_up: false,
    payment_mode: 'RTGS', payment_date: '2025-10-14', payment_from: 'Insurer',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202510140042', company_bank_id: 'CB001', remarks: 'Insurance commission from New India',
  },
  {
    id: 'PI003', file_number: 'F1006', customer: 'Ravi Kumar',
    payment_amount: 75000, paid_amount: 50000, remaining_amount: 25000, round_up: true,
    payment_mode: 'Cheque', payment_date: '2025-10-20', payment_from: 'Customer',
    cheque_bank_name: 'SBI', branch_name: 'Shivaji Nagar', cheque_no: 'CHQ009871', cheque_date: '2025-10-18',
    utr_no: null, company_bank_id: 'CB001', remarks: 'Part payment; balance pending',
  },
  {
    id: 'PI004', file_number: 'F1007', customer: 'Priya Shah',
    payment_amount: 28000, paid_amount: 28000, remaining_amount: 0, round_up: false,
    payment_mode: 'NEFT', payment_date: '2025-10-22', payment_from: 'Customer',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'NFT202510220089', company_bank_id: 'CB002', remarks: 'Processing fee',
  },
  {
    id: 'PI005', file_number: 'F1001', customer: 'Rakesh Sharma',
    payment_amount: 40000, paid_amount: 40000, remaining_amount: 0, round_up: false,
    payment_mode: 'UPI', payment_date: '2025-10-25', payment_from: 'Bank',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'UTR202510250011', company_bank_id: 'CB001', remarks: 'Bank commission received (HDFC)',
  },
  {
    id: 'PI006', file_number: 'F1002', customer: 'Anita Desai',
    payment_amount: 15000, paid_amount: 10000, remaining_amount: 5000, round_up: false,
    payment_mode: 'Cash', payment_date: '2025-10-26', payment_from: 'Customer',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Cash collected at office',
  },
  {
    id: 'PI007', file_number: 'F1008', customer: 'Amit Verma',
    payment_amount: 60000, paid_amount: 60000, remaining_amount: 0, round_up: false,
    payment_mode: 'RTGS', payment_date: '2025-10-28', payment_from: 'Bank',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202510280071', company_bank_id: 'CB002', remarks: 'Kotak Bank disbursement commission',
  },
  {
    id: 'PI008', file_number: 'F1004', customer: 'Sanjay Mehta',
    payment_amount: 35000, paid_amount: 35000, remaining_amount: 0, round_up: false,
    payment_mode: 'Cheque', payment_date: '2025-10-30', payment_from: 'Customer',
    cheque_bank_name: 'Axis Bank', branch_name: 'FC Road', cheque_no: 'CHQ112345', cheque_date: '2025-10-29',
    utr_no: null, company_bank_id: 'CB001', remarks: 'EMI advance deposit',
  },
  {
    id: 'PI009', file_number: 'F1005', customer: 'Pooja Iyer',
    payment_amount: 8000, paid_amount: 8000, remaining_amount: 0, round_up: false,
    payment_mode: 'UPI', payment_date: '2025-11-01', payment_from: 'Customer',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Login charges',
  },
  {
    id: 'PI010', file_number: 'F1009', customer: 'Sunita Rao',
    payment_amount: 22000, paid_amount: 22000, remaining_amount: 0, round_up: true,
    payment_mode: 'NEFT', payment_date: '2025-11-02', payment_from: 'Insurer',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'NFT202511020033', company_bank_id: 'CB001', remarks: 'Renewal commission - ICICI Lombard',
  },
  {
    id: 'PI011', file_number: 'F1010', customer: 'Deepak Joshi',
    payment_amount: 5000, paid_amount: 2500, remaining_amount: 2500, round_up: false,
    payment_mode: 'Cash', payment_date: '2025-11-03', payment_from: 'Customer',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Partial refund adjustment',
  },
  {
    id: 'PI012', file_number: 'F1006', customer: 'Ravi Kumar',
    payment_amount: 25000, paid_amount: 25000, remaining_amount: 0, round_up: false,
    payment_mode: 'Cheque', payment_date: '2025-11-05', payment_from: 'Customer',
    cheque_bank_name: 'SBI', branch_name: 'Shivaji Nagar', cheque_no: 'CHQ009900', cheque_date: '2025-11-04',
    utr_no: null, company_bank_id: 'CB001', remarks: 'Balance payment cleared',
  },
  {
    id: 'PI013', file_number: 'F1007', customer: 'Priya Shah',
    payment_amount: 55000, paid_amount: 55000, remaining_amount: 0, round_up: false,
    payment_mode: 'RTGS', payment_date: '2025-11-06', payment_from: 'Bank',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202511060099', company_bank_id: 'CB002', remarks: 'HDFC Bank loan commission',
  },
  {
    id: 'PI014', file_number: 'F1003', customer: 'Vikram Patil',
    payment_amount: 9500, paid_amount: 9500, remaining_amount: 0, round_up: false,
    payment_mode: 'UPI', payment_date: '2025-11-08', payment_from: 'Customer',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: 'CB001', remarks: 'Stamp duty collection',
  },
  {
    id: 'PI015', file_number: 'F1008', customer: 'Amit Verma',
    payment_amount: 18000, paid_amount: 0, remaining_amount: 18000, round_up: false,
    payment_mode: 'NEFT', payment_date: '2025-11-10', payment_from: 'Customer',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Pending - customer to transfer',
  },
]

// ─── Payment OUT ───────────────────────────────────────────────────────────
// All fields map 1:1 to payment_out DB table columns
export const mockPaymentsOut = [
  {
    id: 'PO001', file_number: 'F1002', payment_to: 'Dealer',
    payee_name: 'Auto Hub Pvt Ltd', amount: 18000,
    payment_mode: 'Cheque', payment_date: '2025-10-15',
    cheque_bank_name: 'HDFC Bank', branch_name: 'Aundh', cheque_no: 'CHQ445566', cheque_date: '2025-10-14',
    utr_no: null, company_bank_id: 'CB001', remarks: 'Dealer margin payment',
  },
  {
    id: 'PO002', file_number: 'F1004', payment_to: 'Agent',
    payee_name: 'Aditya Rao', amount: 6500,
    payment_mode: 'UPI', payment_date: '2025-10-18',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Agent incentive - Login bonus',
  },
  {
    id: 'PO003', file_number: 'F1006', payment_to: 'Dealer',
    payee_name: 'City Motors', amount: 22000,
    payment_mode: 'RTGS', payment_date: '2025-10-21',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202510210055', company_bank_id: 'CB002', remarks: 'Dealer subvention share',
  },
  {
    id: 'PO004', file_number: 'F1001', payment_to: 'Broker',
    payee_name: 'S. Joshi Associates', amount: 9500,
    payment_mode: 'UPI', payment_date: '2025-10-23',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Broker referral commission',
  },
  {
    id: 'PO005', file_number: 'F1007', payment_to: 'Agent',
    payee_name: 'Neha Patil', amount: 8000,
    payment_mode: 'NEFT', payment_date: '2025-10-25',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'NFT202510250044', company_bank_id: 'CB001', remarks: 'Agent commission - field work',
  },
  {
    id: 'PO006', file_number: 'F1003', payment_to: 'Other',
    payee_name: 'RTO Pune', amount: 12500,
    payment_mode: 'DD', payment_date: '2025-10-27',
    cheque_bank_name: 'Bank of Maharashtra', branch_name: 'Pune Camp', cheque_no: 'DD778899', cheque_date: '2025-10-26',
    utr_no: null, company_bank_id: 'CB001', remarks: 'Road tax demand draft',
  },
  {
    id: 'PO007', file_number: 'F1008', payment_to: 'Dealer',
    payee_name: 'Auto Hub Pvt Ltd', amount: 32000,
    payment_mode: 'Cheque', payment_date: '2025-10-29',
    cheque_bank_name: 'HDFC Bank', branch_name: 'Baner', cheque_no: 'CHQ556677', cheque_date: '2025-10-28',
    utr_no: null, company_bank_id: 'CB001', remarks: 'Vehicle booking advance refund',
  },
  {
    id: 'PO008', file_number: 'F1005', payment_to: 'Customer',
    payee_name: 'Pooja Iyer', amount: 3500,
    payment_mode: 'UPI', payment_date: '2025-10-30',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Excess fee refund',
  },
  {
    id: 'PO009', file_number: 'F1006', payment_to: 'Broker',
    payee_name: 'Ramesh Consultants', amount: 7000,
    payment_mode: 'Cash', payment_date: '2025-11-01',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Cash payout - petty work',
  },
  {
    id: 'PO010', file_number: 'F1009', payment_to: 'Agent',
    payee_name: 'Aditya Rao', amount: 4200,
    payment_mode: 'UPI', payment_date: '2025-11-03',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Renewal file agent fee',
  },
  {
    id: 'PO011', file_number: 'F1001', payment_to: 'Dealer',
    payee_name: 'City Motors', amount: 15000,
    payment_mode: 'RTGS', payment_date: '2025-11-04',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202511040012', company_bank_id: 'CB002', remarks: 'Final dealer margin settlement',
  },
  {
    id: 'PO012', file_number: 'F1004', payment_to: 'Other',
    payee_name: 'Smart Card Office', amount: 2000,
    payment_mode: 'Cash', payment_date: '2025-11-05',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Smart card fees',
  },
  {
    id: 'PO013', file_number: 'F1007', payment_to: 'Broker',
    payee_name: 'S. Joshi Associates', amount: 11000,
    payment_mode: 'Cheque', payment_date: '2025-11-06',
    cheque_bank_name: 'Axis Bank', branch_name: 'Kothrud', cheque_no: 'CHQ667788', cheque_date: '2025-11-05',
    utr_no: null, company_bank_id: 'CB001', remarks: 'Broker loan processing share',
  },
  {
    id: 'PO014', file_number: 'F1002', payment_to: 'Agent',
    payee_name: 'Neha Patil', amount: 5500,
    payment_mode: 'NEFT', payment_date: '2025-11-08',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'NFT202511080077', company_bank_id: 'CB001', remarks: 'Used vehicle agent commission',
  },
  {
    id: 'PO015', file_number: 'F1010', payment_to: 'Customer',
    payee_name: 'Deepak Joshi', amount: 2500,
    payment_mode: 'UPI', payment_date: '2025-11-10',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Refund on cancelled file',
  },
]

export const mockCommissionsIn = [
  {
    id: 'CI001', file_number: 'F1001', source_type: 'Bank',
    source_name: 'HDFC Bank', amount: 38500,
    advance: false, tds_deducted: false,
    mode: 'NEFT', payment_date: '2025-10-12',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'UTR202510120045', company_bank_id: 'CB001', remarks: 'Loan disbursement commission received',
  },
  {
    id: 'CI002', file_number: 'F1003', source_type: 'Insurer',
    source_name: 'New India Assurance', amount: 4200,
    advance: true, tds_deducted: false,
    mode: 'RTGS', payment_date: '2025-10-14',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202510140055', company_bank_id: 'CB001', remarks: 'Advance insurance commission – claim pending',
  },
  {
    id: 'CI003', file_number: 'F1006', source_type: 'Bank',
    source_name: 'SBI', amount: 55000,
    advance: false, tds_deducted: true,
    mode: 'NEFT', payment_date: '2025-10-22',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'NFT202510220088', company_bank_id: 'CB001', remarks: 'Final settlement post-disbursement',
  },
  {
    id: 'CI004', file_number: 'F1002', source_type: 'Financier',
    source_name: 'HDFC Finance Limited', amount: 12000,
    advance: false, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-10-18',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Finance company commission – loan closure',
  },
  {
    id: 'CI005', file_number: 'F1001', source_type: 'Insurer',
    source_name: 'ICICI Lombard', amount: 8500,
    advance: false, tds_deducted: false,
    mode: 'Cheque', payment_date: '2025-10-25',
    cheque_bank_name: 'ICICI Bank', branch_name: 'Baner', cheque_no: 'CHQ112233', cheque_date: '2025-10-24',
    utr_no: null, company_bank_id: 'CB001', remarks: 'Insurance commission – Rakesh Sharma file',
  },
  {
    id: 'CI006', file_number: 'F1007', source_type: 'Bank',
    source_name: 'ICICI Bank', amount: 22500,
    advance: true, tds_deducted: false,
    mode: 'RTGS', payment_date: '2025-10-28',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202510280099', company_bank_id: 'CB002', remarks: 'Advance commission – loan pending approval',
  },
  {
    id: 'CI007', file_number: 'F1004', source_type: 'Other',
    source_name: 'Insurance Broker Ltd', amount: 5500,
    advance: false, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-10-30',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Broker referral commission – Sanjay file',
  },
  {
    id: 'CI008', file_number: 'F1008', source_type: 'Bank',
    source_name: 'Kotak Bank', amount: 18000,
    advance: false, tds_deducted: true,
    mode: 'NEFT', payment_date: '2025-11-01',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'NFT202511010033', company_bank_id: 'CB001', remarks: 'Kotak Bank file commission settlement',
  },
  {
    id: 'CI009', file_number: 'F1005', source_type: 'Insurer',
    source_name: 'Royal Sundaram', amount: 3200,
    advance: false, tds_deducted: false,
    mode: 'Cash', payment_date: '2025-11-02',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Cash received at office – petty commission',
  },
  {
    id: 'CI010', file_number: 'F1009', source_type: 'Financier',
    source_name: 'Bajaj Finance', amount: 9800,
    advance: true, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-11-03',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Advance – Sunita Rao renewal file',
  },
]

export const mockCommissionsOut = [
  {
    id: 'CO001', file_number: 'F1001', payee_type: 'Dealer',
    payee_name: 'Auto Hub Pvt Ltd', amount: 12000,
    advance: false, tds_deducted: false,
    mode: 'RTGS', payment_date: '2025-10-16',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202510160021', company_bank_id: 'CB001', remarks: 'Dealer margin – HDFC Bank file',
  },
  {
    id: 'CO002', file_number: 'F1002', payee_type: 'Broker',
    payee_name: 'S. Joshi Associates', amount: 4500,
    advance: true, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-10-18',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Advance commission – loan pending',
  },
  {
    id: 'CO003', file_number: 'F1006', payee_type: 'Dealer',
    payee_name: 'City Motors', amount: 18000,
    advance: false, tds_deducted: true,
    mode: 'RTGS', payment_date: '2025-10-23',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202510230055', company_bank_id: 'CB002', remarks: 'Final settlement post-disbursement',
  },
  {
    id: 'CO004', file_number: 'F1003', payee_type: 'Agent',
    payee_name: 'Aditya Rao', amount: 6800,
    advance: false, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-10-25',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Field agent fee – Vikram Patil file',
  },
  {
    id: 'CO005', file_number: 'F1007', payee_type: 'Broker',
    payee_name: 'Ramesh Consultants', amount: 9200,
    advance: true, tds_deducted: false,
    mode: 'Cheque', payment_date: '2025-10-28',
    cheque_bank_name: 'Axis Bank', branch_name: 'FC Road', cheque_no: 'CHQ334455', cheque_date: '2025-10-27',
    utr_no: null, company_bank_id: 'CB001', remarks: 'Broker advance – loan under process',
  },
  {
    id: 'CO006', file_number: 'F1004', payee_type: 'Agent',
    payee_name: 'Neha Patil', amount: 3500,
    advance: false, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-10-30',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Agent commission – Sanjay Mehta file',
  },
  {
    id: 'CO007', file_number: 'F1008', payee_type: 'Dealer',
    payee_name: 'Auto Hub Pvt Ltd', amount: 22000,
    advance: false, tds_deducted: true,
    mode: 'NEFT', payment_date: '2025-11-01',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'NFT202511010088', company_bank_id: 'CB001', remarks: 'Kotak Bank file dealer payout',
  },
  {
    id: 'CO008', file_number: 'F1005', payee_type: 'Broker',
    payee_name: 'S. Joshi Associates', amount: 5000,
    advance: false, tds_deducted: false,
    mode: 'Cash', payment_date: '2025-11-02',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Cash paid at office – petty commission',
  },
  {
    id: 'CO009', file_number: 'F1009', payee_type: 'Agent',
    payee_name: 'Aditya Rao', amount: 2800,
    advance: true, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-11-03',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Advance – Sunita Rao renewal file',
  },
  {
    id: 'CO010', file_number: 'F1001', payee_type: 'Dealer',
    payee_name: 'City Motors', amount: 15500,
    advance: false, tds_deducted: true,
    mode: 'Cheque', payment_date: '2025-11-04',
    cheque_bank_name: 'SBI', branch_name: 'Shivaji Nagar', cheque_no: 'CHQ998877', cheque_date: '2025-11-03',
    utr_no: null, company_bank_id: 'CB001', remarks: 'Balance dealer commission',
  },
  {
    id: 'CO011', file_number: 'F1002', payee_type: 'Agent',
    payee_name: 'Neha Patil', amount: 4100,
    advance: false, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-11-05',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Used vehicle agent payout',
  },
  {
    id: 'CO012', file_number: 'F1010', payee_type: 'Broker',
    payee_name: 'Ramesh Consultants', amount: 7300,
    advance: false, tds_deducted: true,
    mode: 'RTGS', payment_date: '2025-11-06',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'RTG202511060033', company_bank_id: 'CB002', remarks: 'Deepak Joshi file – broker final',
  },
  {
    id: 'CO013', file_number: 'F1006', payee_type: 'Agent',
    payee_name: 'Aditya Rao', amount: 3200,
    advance: false, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-11-07',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Ravi Kumar file completion bonus',
  },
  {
    id: 'CO014', file_number: 'F1007', payee_type: 'Dealer',
    payee_name: 'Auto Hub Pvt Ltd', amount: 26000,
    advance: false, tds_deducted: true,
    mode: 'NEFT', payment_date: '2025-11-08',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: 'NFT202511080066', company_bank_id: 'CB001', remarks: 'Priya Shah file – HDFC commission share',
  },
  {
    id: 'CO015', file_number: 'F1003', payee_type: 'Broker',
    payee_name: 'S. Joshi Associates', amount: 5600,
    advance: true, tds_deducted: false,
    mode: 'UPI', payment_date: '2025-11-10',
    cheque_bank_name: null, branch_name: null, cheque_no: null, cheque_date: null,
    utr_no: null, company_bank_id: null, remarks: 'Advance payout – Vikram Patil loan pending',
  },
]

export const mockRTOPayments = [
  { id: 'R001', file: 'F1001', payee: 'RTO Pune',   amount: 22500, mode: 'Cash', date: '2025-10-09' },
  { id: 'R002', file: 'F1006', payee: 'RTO Mumbai', amount: 31000, mode: 'DD',   date: '2025-10-21' },
]

export const mockInsurancePayments = [
  {
    id: "IP001",
    file_number: "F1003",
    payee_name: "New India Assurance",
    amount: 12200,
    mode: "NEFT" as const,
    payment_date: "2025-10-13",
    valid_to: "2026-05-20", // Lapsed state condition check target
    company_bank_id: "CB001",
    remarks: "Comprehensive auto collision asset policy cover",
    is_deleted: false
  },
  {
    id: "IP002",
    file_number: "F1007",
    payee_name: "ICICI Lombard",
    amount: 8500,
    mode: "UPI" as const,
    payment_date: "2025-10-23",
    valid_to: "2027-10-22", // Active safe tracking state
    company_bank_id: "CB002",
    remarks: "Zero-depreciation bumper add-on supplement tier",
    is_deleted: false
  },
  {
    id: "IP003",
    file_number: "F1009",
    payee_name: "GoDigit General Insurance",
    amount: 14200,
    mode: "RTGS" as const,
    payment_date: "2025-06-01",
    valid_to: "2026-06-01", // Imminent warning lookahead flag threshold item
    company_bank_id: "CB001",
    remarks: "Commercial haul transit safety premium block",
    is_deleted: false
  }
];

export const mockExpenses = [
  { id: 'E001', category: 'Office Rent', amount: 35000, date: '2025-10-01' },
  { id: 'E002', category: 'Stationery',  amount: 1200,  date: '2025-10-09' },
  { id: 'E003', category: 'Travel',      amount: 3400,  date: '2025-10-15' },
]

// advances — maps to `advances` table
// party_type enum: 'dealer' | 'broker' only (DB constraint)
// recovery_status enum: 'pending' | 'partial' | 'fully_recovered'
export const mockAdvances = [
  { id: 'A001', dealer_id: 'D001', broker_id: null, party_name: 'Auto Hub Pvt Ltd',      party_type: 'dealer', advance_date: '2025-09-05', amount: 50000, mode: 'cash',   utr_cheque_number: '',             purpose: 'Vehicle booking advance',          recovery_status: 'partial',          amount_recovered: 12000, remarks: 'Partial recovery via cheque' },
  { id: 'A002', dealer_id: null,   broker_id: 'B001', party_name: 'S. Joshi Associates', party_type: 'broker', advance_date: '2025-09-20', amount: 15000, mode: 'upi',    utr_cheque_number: 'UPI20250920001', purpose: 'Operating cash advance',           recovery_status: 'fully_recovered',  amount_recovered: 15000, remarks: 'Fully settled' },
  { id: 'A003', dealer_id: 'D002', broker_id: null, party_name: 'City Motors',           party_type: 'dealer', advance_date: '2025-10-01', amount: 10000, mode: 'neft',   utr_cheque_number: 'NFT20251001002', purpose: 'Showroom inspection advance',      recovery_status: 'pending',          amount_recovered: 0,     remarks: '' },
  { id: 'A004', dealer_id: 'D001', broker_id: null, party_name: 'Auto Hub Pvt Ltd',      party_type: 'dealer', advance_date: '2025-10-08', amount: 30000, mode: 'cheque', utr_cheque_number: 'CHQ00112233',    purpose: 'Pre-delivery inspection charges',  recovery_status: 'fully_recovered',  amount_recovered: 30000, remarks: 'Recovered in full' },
  { id: 'A005', dealer_id: null,   broker_id: 'B003', party_name: 'Ramesh Consultants',  party_type: 'broker', advance_date: '2025-10-15', amount: 8000,  mode: 'cash',   utr_cheque_number: '',             purpose: 'File processing advance',          recovery_status: 'partial',          amount_recovered: 5000,  remarks: 'Balance pending from broker' },
  { id: 'A006', dealer_id: null,   broker_id: 'B002', party_name: 'Patel Broker Srvcs',  party_type: 'broker', advance_date: '2025-10-22', amount: 20000, mode: 'rtgs',   utr_cheque_number: 'RTG20251022099', purpose: 'Commission advance before loan close', recovery_status: 'pending',       amount_recovered: 0,     remarks: 'Loan disbursement pending' },
  { id: 'A007', dealer_id: 'D002', broker_id: null, party_name: 'City Motors',           party_type: 'dealer', advance_date: '2025-10-28', amount: 25000, mode: 'upi',    utr_cheque_number: 'UPI20251028044', purpose: 'Accessory fitment advance',        recovery_status: 'fully_recovered',  amount_recovered: 25000, remarks: '' },
  { id: 'A008', dealer_id: null,   broker_id: 'B001', party_name: 'S. Joshi Associates', party_type: 'broker', advance_date: '2025-11-02', amount: 12000, mode: 'imps',   utr_cheque_number: 'IMP20251102007', purpose: 'Broker operational expense float', recovery_status: 'partial',          amount_recovered: 4000,  remarks: 'Two instalments received' },
  { id: 'A009', dealer_id: 'D001', broker_id: null, party_name: 'Auto Hub Pvt Ltd',      party_type: 'dealer', advance_date: '2025-11-05', amount: 18000, mode: 'cheque', utr_cheque_number: 'CHQ00998877',    purpose: 'New model launch booking',        recovery_status: 'pending',          amount_recovered: 0,     remarks: 'Awaiting vehicle delivery' },
  { id: 'A010', dealer_id: null,   broker_id: 'B004', party_name: 'Mehul Finance Broking',party_type: 'broker', advance_date: '2025-11-10', amount: 9000,  mode: 'neft',   utr_cheque_number: 'NFT20251110033', purpose: 'File documentation advance',       recovery_status: 'fully_recovered',  amount_recovered: 9000,  remarks: 'Cleared on disbursement day' },
]

export const mockDealers = [
  { id: 'D001', name: 'Auto Hub',    city: 'Pune',   phone: '9000111222', email: 'info@autohub.in'     },
  { id: 'D002', name: 'City Motors', city: 'Mumbai', phone: '9000222333', email: 'sales@citymotors.in' },
]

// master_broker — exact DB columns: id, broker_name, area, district, phone
export const mockBrokers = [
  { id: 'B001', broker_name: 'S. Joshi Associates',    area: 'Kothrud',      district: 'Pune',      phone: '9000333444' },
  { id: 'B002', broker_name: 'Patel Broker Services',  area: 'Aundh',        district: 'Pune',      phone: '9876541230' },
  { id: 'B003', broker_name: 'Ramesh Consultants',     area: 'FC Road',      district: 'Pune',      phone: '9123456789' },
  { id: 'B004', broker_name: 'Mehul Finance Broking',  area: 'Vile Parle',   district: 'Mumbai',    phone: '9900112233' },
  { id: 'B005', broker_name: 'Desai Associates',       area: 'Navrangpura',  district: 'Ahmedabad', phone: '9988001122' },
  { id: 'B006', broker_name: 'Kapoor Loan Experts',    area: 'Lajpat Nagar', district: 'Delhi',     phone: '9811223344' },
  { id: 'B007', broker_name: 'Singh & Sons Brokers',   area: 'Bani Park',    district: 'Jaipur',    phone: '9461122334' },
  { id: 'B008', broker_name: 'Verma Financial Srvcs',  area: 'Civil Lines',  district: 'Nagpur',    phone: '7122334455' },
]

export const mockBanks = [
  { id: 'FB001', name: 'HDFC Bank', area: 'Shivaji Nagar', contact: '9000444555' },
  { id: 'FB002', name: 'ICICI',     area: 'Aundh',         contact: '9000555666' },
]

export const mockInsuranceCos = [
  { id: 'IC001', name: 'New India Assurance', person: 'Mr. Rao',  mobile: '9000666777' },
  { id: 'IC002', name: 'ICICI Lombard',       person: 'Ms. Patel', mobile: '9000777888' },
]

export const mockInsuranceTypes = [
  { id: 'IT001', name: 'Comprehensive' },
  { id: 'IT002', name: 'Third Party'   },
]

export const mockExpenseCategories = [
  { id: 'EC001', name: 'Office Rent' },
  { id: 'EC002', name: 'Stationery'  },
  { id: 'EC003', name: 'Travel'      },
]

export const mockUsers = [
  { id: 'U001', first: 'Aditya', last: 'Rao',   email: 'aditya@autonidhi.in', role: 'staff',      active: true,  lastLogin: '2025-11-04' },
  { id: 'U002', first: 'Neha',   last: 'Patil',  email: 'neha@autonidhi.in',   role: 'agent',      active: true,  lastLogin: '2025-11-03' },
  { id: 'U003', first: 'Suresh', last: 'Kumar',  email: 'suresh@autonidhi.in', role: 'accountant', active: false, lastLogin: '2025-09-12' },
]

export const mockNotifications = [
  { id: 'N1', message: 'File F1004 moved to Login.',              time: '2 hrs ago',  read: false },
  { id: 'N2', message: 'Insurance for F1003 expiring in 18 days.',time: '1 day ago',  read: false },
  { id: 'N3', message: 'Commission ₹38,500 received from HDFC.',  time: '2 days ago', read: false },
  { id: 'N4', message: 'New customer Ravi Kumar created.',         time: '3 days ago', read: true  },
  { id: 'N5', message: 'File F1010 marked as Cancelled.',          time: '5 days ago', read: true  },
]

export const mockActivityFeed = [
  { id: 'A1', user: 'Aditya Rao',  action: 'changed status to Login',     file: 'F1004', time: '2 hrs ago'  },
  { id: 'A2', user: 'Neha Patil',  action: 'uploaded document (Aadhar)',   file: 'F1007', time: '4 hrs ago'  },
  { id: 'A3', user: 'Aditya Rao',  action: 'recorded Payment IN ₹75,000', file: 'F1006', time: '6 hrs ago'  },
  { id: 'A4', user: 'Admin',       action: 'marked file as Completed',     file: 'F1003', time: '1 day ago'  },
  { id: 'A5', user: 'Neha Patil',  action: 'created new customer',         file: '—',     time: '1 day ago'  },
  { id: 'A6', user: 'Aditya Rao',  action: 'updated vehicle details',      file: 'F1007', time: '2 days ago' },
  { id: 'A7', user: 'Admin',       action: 'disbursed commission ₹55,000', file: 'F1006', time: '3 days ago' },
]

// Insurance files expiring soon (mocked from insurance_info.valid_to)
export const mockInsuranceExpiring = [
  { file: 'F1001', customer: 'Rakesh Sharma', policy: 'Comprehensive', expiresIn: 8,  daysLabel: '8 days' },
  { file: 'F1003', customer: 'Vikram Patil',  policy: 'Third Party',   expiresIn: 18, daysLabel: '18 days' },
  { file: 'F1007', customer: 'Priya Shah',    policy: 'Comprehensive', expiresIn: 26, daysLabel: '26 days' },
]

export const fileStatuses = ['Draft', 'Login', 'Under Process', 'Sanctioned', 'Disbursed', 'Completed', 'Cancelled'] as const

