// ─── INSURANCE LIFECYCLE LEDGER INTERFACE ───
export interface InsurancePayment {
  id: string;               // e.g., 'IP001' or cryptographically parsed UUIDs
  file_number: string;      // Matches structural key F1001, F1002, etc.
  payee_name: string;       // e.g., 'New India Assurance', 'ICICI Lombard'
  amount: number;           // Precise premium costing metric
  mode: 'UPI' | 'NEFT' | 'RTGS' | 'Cheque' | 'Cash' | 'DD';
  payment_date: string;     // ISO standard formatted tracking string (YYYY-MM-DD)
  valid_to: string;         // Core timeline variable checking policy boundaries
  company_bank_id: string | null;
  remarks: string | null;
  is_deleted: boolean;      // Structural column supporting soft delete mandates
}