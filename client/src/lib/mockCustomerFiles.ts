// Mock data for customer files - frontend development
export interface MockFile {
  id: string;
  file_number: string;
  file_type: 'new_vehicle' | 'used_vehicle' | 'renewal';
  status: 'draft' | 'login' | 'under_process' | 'sanctioned' | 'disbursed' | 'completed' | 'cancelled';
  assigned_to?: string;
  finance_amount?: number;
  finance_bank?: string;
  created_at: string;
  updated_at: string;
  documents: MockDocument[];
  history: HistoryEvent[];
}

export interface MockDocument {
  id: string;
  document_type: 
    | 'aadhar_front' | 'aadhar_back' | 'pan_card' | 'passport_photo'
    | 'address_proof' | 'income_proof' | 'bank_statement' | 'vehicle_rc'
    | 'insurance_copy' | 'dealer_invoice' | 'form_34_35' | 'noc'
    | 'signature_photo' | 'other';
  status: 'pending_review' | 'verified' | 'rejected';
  uploaded_at: string;
  uploaded_by?: string;
  rejection_reason?: string;
  file_size?: number;
}

export interface HistoryEvent {
  id: string;
  type: 'file_created' | 'status_changed' | 'document_uploaded' | 'document_verified' | 'document_rejected' | 'admin_note';
  timestamp: string;
  title: string;
  description?: string;
  actor?: string;
  old_status?: string;
  new_status?: string;
}

const documentTypeLabels: Record<string, string> = {
  aadhar_front: 'Aadhar (Front)',
  aadhar_back: 'Aadhar (Back)',
  pan_card: 'PAN Card',
  passport_photo: 'Passport Photo',
  address_proof: 'Address Proof',
  income_proof: 'Income Proof',
  bank_statement: 'Bank Statement',
  vehicle_rc: 'Vehicle RC',
  insurance_copy: 'Insurance Copy',
  dealer_invoice: 'Dealer Invoice',
  form_34_35: 'Form 34/35',
  noc: 'NOC',
  signature_photo: 'Signature Photo',
  other: 'Other',
};

export function getDocumentLabel(type: string): string {
  return documentTypeLabels[type] || type;
}

export const mockCustomerFiles: MockFile[] = [
  {
    id: '1',
    file_number: 'FILE/2026/001',
    file_type: 'new_vehicle',
    status: 'sanctioned',
    assigned_to: 'Rajesh Kumar',
    finance_amount: 450000,
    finance_bank: 'HDFC Bank',
    created_at: '2026-04-15T10:30:00Z',
    updated_at: '2026-05-20T14:45:00Z',
    documents: [
      { id: 'd1', document_type: 'aadhar_front', status: 'verified', uploaded_at: '2026-04-15T11:00:00Z', uploaded_by: 'Self', file_size: 2048576 },
      { id: 'd2', document_type: 'aadhar_back', status: 'verified', uploaded_at: '2026-04-15T11:05:00Z', uploaded_by: 'Self', file_size: 1953152 },
      { id: 'd3', document_type: 'pan_card', status: 'verified', uploaded_at: '2026-04-15T11:10:00Z', uploaded_by: 'Self', file_size: 1820672 },
      { id: 'd4', document_type: 'passport_photo', status: 'verified', uploaded_at: '2026-04-15T11:15:00Z', uploaded_by: 'Self', file_size: 1048576 },
      { id: 'd5', document_type: 'income_proof', status: 'verified', uploaded_at: '2026-04-16T09:20:00Z', uploaded_by: 'Self', file_size: 3145728 },
    ],
    history: [
      { id: 'h1', type: 'file_created', timestamp: '2026-04-15T10:30:00Z', title: 'File Created', actor: 'System' },
      { id: 'h2', type: 'status_changed', timestamp: '2026-04-15T10:35:00Z', title: 'Status Updated', description: 'File moved to Login', old_status: 'draft', new_status: 'login', actor: 'Rajesh Kumar' },
      { id: 'h3', type: 'document_uploaded', timestamp: '2026-04-15T11:00:00Z', title: 'Aadhar Front Uploaded', actor: 'Self' },
      { id: 'h4', type: 'document_verified', timestamp: '2026-04-16T10:00:00Z', title: 'Documents Verified', description: 'All initial documents verified', actor: 'Admin Verify' },
      { id: 'h5', type: 'status_changed', timestamp: '2026-05-20T14:45:00Z', title: 'File Sanctioned', description: 'Loan approved for ₹4,50,000', old_status: 'under_process', new_status: 'sanctioned', actor: 'Rajesh Kumar' },
    ],
  },
  {
    id: '2',
    file_number: 'FILE/2026/002',
    file_type: 'used_vehicle',
    status: 'under_process',
    assigned_to: 'Priya Sharma',
    finance_amount: 280000,
    finance_bank: 'ICICI Bank',
    created_at: '2026-05-01T09:15:00Z',
    updated_at: '2026-05-25T16:20:00Z',
    documents: [
      { id: 'd6', document_type: 'aadhar_front', status: 'verified', uploaded_at: '2026-05-01T09:45:00Z', uploaded_by: 'Self', file_size: 2097152 },
      { id: 'd7', document_type: 'pan_card', status: 'verified', uploaded_at: '2026-05-01T10:00:00Z', uploaded_by: 'Self', file_size: 1835008 },
      { id: 'd8', document_type: 'vehicle_rc', status: 'pending_review', uploaded_at: '2026-05-22T14:30:00Z', uploaded_by: 'Self', file_size: 2304768 },
      { id: 'd9', document_type: 'bank_statement', status: 'pending_review', uploaded_at: '2026-05-23T11:15:00Z', uploaded_by: 'Self', file_size: 4194304 },
    ],
    history: [
      { id: 'h6', type: 'file_created', timestamp: '2026-05-01T09:15:00Z', title: 'File Created', actor: 'System' },
      { id: 'h7', type: 'status_changed', timestamp: '2026-05-01T09:20:00Z', title: 'Assigned to Priya', description: 'File assigned for processing', old_status: 'draft', new_status: 'login', actor: 'Priya Sharma' },
      { id: 'h8', type: 'document_uploaded', timestamp: '2026-05-01T09:45:00Z', title: 'Documents Started', actor: 'Self' },
      { id: 'h9', type: 'status_changed', timestamp: '2026-05-15T10:00:00Z', title: 'Under Process', old_status: 'login', new_status: 'under_process', actor: 'Priya Sharma' },
      { id: 'h10', type: 'admin_note', timestamp: '2026-05-25T16:20:00Z', title: 'Verification In Progress', description: 'Checking vehicle documents', actor: 'Priya Sharma' },
    ],
  },
  {
    id: '3',
    file_number: 'FILE/2026/003',
    file_type: 'renewal',
    status: 'completed',
    assigned_to: 'Vijay Patel',
    finance_amount: 350000,
    finance_bank: 'Axis Bank',
    created_at: '2026-03-10T08:00:00Z',
    updated_at: '2026-05-10T15:30:00Z',
    documents: [
      { id: 'd10', document_type: 'pan_card', status: 'verified', uploaded_at: '2026-03-11T09:30:00Z', uploaded_by: 'Self', file_size: 1835008 },
      { id: 'd11', document_type: 'income_proof', status: 'verified', uploaded_at: '2026-03-12T10:15:00Z', uploaded_by: 'Self', file_size: 2621440 },
      { id: 'd12', document_type: 'bank_statement', status: 'verified', uploaded_at: '2026-03-13T11:00:00Z', uploaded_by: 'Self', file_size: 3670016 },
      { id: 'd13', document_type: 'form_34_35', status: 'verified', uploaded_at: '2026-03-15T14:45:00Z', uploaded_by: 'Self', file_size: 1572864 },
    ],
    history: [
      { id: 'h11', type: 'file_created', timestamp: '2026-03-10T08:00:00Z', title: 'Renewal File Created', actor: 'System' },
      { id: 'h12', type: 'status_changed', timestamp: '2026-03-11T09:00:00Z', title: 'Under Process', old_status: 'draft', new_status: 'under_process', actor: 'Vijay Patel' },
      { id: 'h13', type: 'document_verified', timestamp: '2026-04-05T10:30:00Z', title: 'All Documents Verified', actor: 'Admin Verify' },
      { id: 'h14', type: 'status_changed', timestamp: '2026-04-20T12:00:00Z', title: 'Sanctioned', old_status: 'under_process', new_status: 'sanctioned', actor: 'Vijay Patel' },
      { id: 'h15', type: 'status_changed', timestamp: '2026-05-05T09:00:00Z', title: 'Disbursed', old_status: 'sanctioned', new_status: 'disbursed', actor: 'Finance Team' },
      { id: 'h16', type: 'status_changed', timestamp: '2026-05-10T15:30:00Z', title: 'Completed', old_status: 'disbursed', new_status: 'completed', actor: 'System' },
    ],
  },
  {
    id: '4',
    file_number: 'FILE/2026/004',
    file_type: 'new_vehicle',
    status: 'draft',
    created_at: '2026-05-26T14:20:00Z',
    updated_at: '2026-05-26T14:20:00Z',
    documents: [],
    history: [
      { id: 'h17', type: 'file_created', timestamp: '2026-05-26T14:20:00Z', title: 'File Created', actor: 'System' },
    ],
  },
  {
    id: '5',
    file_number: 'FILE/2026/005',
    file_type: 'used_vehicle',
    status: 'cancelled',
    assigned_to: 'Rajesh Kumar',
    finance_amount: 320000,
    finance_bank: 'SBI Bank',
    created_at: '2026-04-22T11:45:00Z',
    updated_at: '2026-05-18T13:00:00Z',
    documents: [
      { id: 'd14', document_type: 'aadhar_front', status: 'rejected', uploaded_at: '2026-04-23T10:00:00Z', uploaded_by: 'Self', rejection_reason: 'Document is blurry, please resubmit', file_size: 1835008 },
      { id: 'd15', document_type: 'pan_card', status: 'verified', uploaded_at: '2026-04-23T10:30:00Z', uploaded_by: 'Self', file_size: 1703936 },
    ],
    history: [
      { id: 'h18', type: 'file_created', timestamp: '2026-04-22T11:45:00Z', title: 'File Created', actor: 'System' },
      { id: 'h19', type: 'status_changed', timestamp: '2026-04-22T12:00:00Z', title: 'Under Process', old_status: 'draft', new_status: 'under_process', actor: 'Rajesh Kumar' },
      { id: 'h20', type: 'document_rejected', timestamp: '2026-04-25T09:15:00Z', title: 'Aadhar Front Rejected', description: 'Document is blurry, please resubmit', actor: 'Admin Verify' },
      { id: 'h21', type: 'status_changed', timestamp: '2026-05-18T13:00:00Z', title: 'File Cancelled', description: 'Cancelled by customer request', old_status: 'under_process', new_status: 'cancelled', actor: 'Rajesh Kumar' },
    ],
  },
  {
    id: '6',
    file_number: 'FILE/2026/006',
    file_type: 'new_vehicle',
    status: 'disbursed',
    assigned_to: 'Priya Sharma',
    finance_amount: 520000,
    finance_bank: 'Kotak Bank',
    created_at: '2026-02-14T10:00:00Z',
    updated_at: '2026-05-15T11:30:00Z',
    documents: [
      { id: 'd16', document_type: 'aadhar_front', status: 'verified', uploaded_at: '2026-02-15T09:00:00Z', uploaded_by: 'Self', file_size: 2048576 },
      { id: 'd17', document_type: 'pan_card', status: 'verified', uploaded_at: '2026-02-15T09:30:00Z', uploaded_by: 'Self', file_size: 1835008 },
      { id: 'd18', document_type: 'income_proof', status: 'verified', uploaded_at: '2026-02-16T10:00:00Z', uploaded_by: 'Self', file_size: 2621440 },
      { id: 'd19', document_type: 'vehicle_rc', status: 'verified', uploaded_at: '2026-02-20T14:15:00Z', uploaded_by: 'Self', file_size: 2097152 },
      { id: 'd20', document_type: 'insurance_copy', status: 'verified', uploaded_at: '2026-02-22T11:45:00Z', uploaded_by: 'Self', file_size: 1048576 },
    ],
    history: [
      { id: 'h22', type: 'file_created', timestamp: '2026-02-14T10:00:00Z', title: 'File Created', actor: 'System' },
      { id: 'h23', type: 'status_changed', timestamp: '2026-02-15T10:30:00Z', title: 'Under Process', old_status: 'draft', new_status: 'under_process', actor: 'Priya Sharma' },
      { id: 'h24', type: 'document_verified', timestamp: '2026-03-10T10:00:00Z', title: 'Documents Verified', actor: 'Admin Verify' },
      { id: 'h25', type: 'status_changed', timestamp: '2026-04-01T13:00:00Z', title: 'Sanctioned', old_status: 'under_process', new_status: 'sanctioned', actor: 'Priya Sharma' },
      { id: 'h26', type: 'status_changed', timestamp: '2026-05-15T11:30:00Z', title: 'Amount Disbursed', description: '₹5,20,000 transferred to your account', old_status: 'sanctioned', new_status: 'disbursed', actor: 'Finance Team' },
    ],
  },
];
