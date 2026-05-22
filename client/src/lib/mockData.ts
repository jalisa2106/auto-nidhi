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

export const mockPaymentsIn = [
  { id: 'PI001', file: 'F1001', customer: 'Rakesh Sharma', amount: 45000,  mode: 'UPI',    date: '2025-10-12', from: 'Customer' },
  { id: 'PI002', file: 'F1003', customer: 'Vikram Patil',  amount: 12500,  mode: 'RTGS',   date: '2025-10-14', from: 'Insurer'  },
  { id: 'PI003', file: 'F1006', customer: 'Ravi Kumar',    amount: 75000,  mode: 'Cheque', date: '2025-10-20', from: 'Customer' },
  { id: 'PI004', file: 'F1007', customer: 'Priya Shah',    amount: 28000,  mode: 'NEFT',   date: '2025-10-22', from: 'Customer' },
]

export const mockPaymentsOut = [
  { id: 'PO001', file: 'F1002', payee: 'Dealer XYZ', amount: 18000, mode: 'Cheque', date: '2025-10-15' },
  { id: 'PO002', file: 'F1004', payee: 'Agent X',    amount: 6500,  mode: 'UPI',    date: '2025-10-18' },
  { id: 'PO003', file: 'F1006', payee: 'Auto Hub',   amount: 22000, mode: 'RTGS',   date: '2025-10-21' },
]

export const mockCommissionsIn = [
  { id: 'CI001', file: 'F1001', payment_by: 'HDFC Bank',           amount: 38500, date: '2025-10-12' },
  { id: 'CI002', file: 'F1003', payment_by: 'New India Assurance', amount: 4200,  date: '2025-10-14' },
  { id: 'CI003', file: 'F1006', payment_by: 'SBI',                 amount: 55000, date: '2025-10-22' },
]

export const mockCommissionsOut = [
  { id: 'CO001', file: 'F1001', payee_type: 'Dealer', payee: 'Auto Hub',  amount: 12000, mode: 'RTGS', date: '2025-10-16', advance: false },
  { id: 'CO002', file: 'F1002', payee_type: 'Broker', payee: 'S. Joshi',  amount: 4500,  mode: 'UPI',  date: '2025-10-18', advance: true  },
  { id: 'CO003', file: 'F1006', payee_type: 'Dealer', payee: 'City Motors', amount: 18000, mode: 'RTGS', date: '2025-10-23', advance: false },
]

export const mockRTOPayments = [
  { id: 'R001', file: 'F1001', payee: 'RTO Pune',   amount: 22500, mode: 'Cash', date: '2025-10-09' },
  { id: 'R002', file: 'F1006', payee: 'RTO Mumbai', amount: 31000, mode: 'DD',   date: '2025-10-21' },
]

export const mockInsurancePayments = [
  { id: 'IP001', file: 'F1003', payee: 'New India Assurance', amount: 12200, mode: 'NEFT', date: '2025-10-13' },
  { id: 'IP002', file: 'F1007', payee: 'ICICI Lombard',       amount: 8500,  mode: 'UPI',  date: '2025-10-23' },
]

export const mockExpenses = [
  { id: 'E001', category: 'Office Rent', amount: 35000, date: '2025-10-01' },
  { id: 'E002', category: 'Stationery',  amount: 1200,  date: '2025-10-09' },
  { id: 'E003', category: 'Travel',      amount: 3400,  date: '2025-10-15' },
]

export const mockAdvances = [
  { id: 'A001', party_type: 'Dealer', party: 'Auto Hub',    amount: 50000, recovered: 12000, date: '2025-09-05' },
  { id: 'A002', party_type: 'Broker', party: 'S. Joshi',   amount: 15000, recovered: 15000, date: '2025-09-20' },
]

export const mockDealers = [
  { id: 'D001', name: 'Auto Hub',    city: 'Pune',   phone: '9000111222', email: 'info@autohub.in'     },
  { id: 'D002', name: 'City Motors', city: 'Mumbai', phone: '9000222333', email: 'sales@citymotors.in' },
]

export const mockBrokers = [
  { id: 'B001', name: 'S. Joshi', area: 'Kothrud', district: 'Pune', phone: '9000333444' },
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
