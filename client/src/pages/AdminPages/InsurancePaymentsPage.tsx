import { useMemo, useState, type MouseEvent } from 'react'
import {
  ShieldAlert, IndianRupee, CalendarClock, Plus, X, Eye, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, AlertTriangle
} from 'lucide-react'
import type { InsurancePayment } from '../../lib/finance'
import { mockInsurancePayments } from '../../lib/mockData'
import PageHeader from '../../components/app/PageHeader'

// ─── RUNTIME RE-EVALUATION CHRONO CONSTANTS ───
const SYSTEM_ANCHOR_DATE = "2026-05-26" // Fixed system operational datetime anchor
const PAYMENT_MODES = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'DD'] as const
const COMPANY_BANKS = [
  { id: 'CB001', label: 'HDFC Bank – Main A/C' },
  { id: 'CB002', label: 'ICICI Bank – Operations' },
]

type PaymentMode = (typeof PAYMENT_MODES)[number]

type InsurancePaymentForm = {
  file_number: string
  payee_name: string
  amount: string
  mode: PaymentMode
  payment_date: string
  valid_to: string
  company_bank_id: string
  remarks: string
}

export default function InsurancePaymentsPage() {
  // Local reactive registers mapping standard collection layouts
  const [rows, setRows] = useState<InsurancePayment[]>(() => mockInsurancePayments)
  const [showAdd, setShowAdd] = useState(false)
  const [viewRow, setViewRow] = useState<InsurancePayment | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Filtering Registers
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState('')
  const [filterStatus, setFilterStatus] = useState('') 
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Pagination Configuration
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Empty Blueprint State Mapping
  const [form, setForm] = useState<InsurancePaymentForm>({
    file_number: '', payee_name: '', amount: '', mode: 'UPI',
    payment_date: SYSTEM_ANCHOR_DATE, valid_to: '', company_bank_id: '', remarks: ''
  })

  // ─── EVALUATOR ENGINE: DERIVE ACTIVE/EXPIRING/EXPIRED METRICS ───
  const evalPolicyStatus = (validToDateStr: string): 'Active' | 'Expiring' | 'Expired' => {
    if (!validToDateStr) return 'Active'
    
    const today = new Date(SYSTEM_ANCHOR_DATE)
    const policyExpiry = new Date(validToDateStr)
    
    const limitBoundary = new Date(today)
    limitBoundary.setDate(limitBoundary.getDate() + 7) // Precise 7-day calendar lookahead range calculation
    
    const expiryISO = policyExpiry.toISOString().slice(0, 10)
    
    if (expiryISO < SYSTEM_ANCHOR_DATE) return 'Expired'
    if (expiryISO >= SYSTEM_ANCHOR_DATE && policyExpiry <= limitBoundary) return 'Expiring'
    return 'Active'
  }

  // Count active expiring items to drive Option C Hybrid Notification Alert block
  const imminentRiskCount = useMemo(() => {
    return rows.filter(r => !r.is_deleted && evalPolicyStatus(r.valid_to) === 'Expiring').length
  }, [rows])

  // ─── QUERY COMPLIANCE RECOGNITION PIPELINE ───
  const processedLedgerRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.is_deleted) return false // Standard compliance check: soft-deleted items remain locked out of direct array views
      
      if (search) {
        const query = search.toLowerCase()
        if (
          !r.file_number.toLowerCase().includes(query) &&
          !r.payee_name.toLowerCase().includes(query) &&
          !(r.remarks || '').toLowerCase().includes(query)
        ) return false
      }
      
      if (filterStatus && evalPolicyStatus(r.valid_to) !== filterStatus) return false
      if (filterMode && r.mode !== filterMode) return false
      if (filterDateFrom && r.payment_date < filterDateFrom) return false
      if (filterDateTo && r.payment_date > filterDateTo) return false
      
      return true
    })
  }, [rows, search, filterStatus, filterMode, filterDateFrom, filterDateTo])

  const totalPages = Math.max(1, Math.ceil(processedLedgerRows.length / pageSize))
  const safePageIndex = Math.min(page, totalPages)
  const paginatedRows = processedLedgerRows.slice((safePageIndex - 1) * pageSize, safePageIndex * pageSize)

  // ─── FINANCIAL AGGREGATE CALCULATORS ───
  const totalPremiumsPaid = rows.filter(r => !r.is_deleted).reduce((sum, r) => sum + r.amount, 0)
  const activeCount = rows.filter(r => !r.is_deleted && evalPolicyStatus(r.valid_to) === 'Active').length
  const expiredCount = rows.filter(r => !r.is_deleted && evalPolicyStatus(r.valid_to) === 'Expired').length

  // ─── MUTATION COMPILER DISPATCHERS ───
  const validateFormPayload = () => {
    const errCollection: Record<string, string> = {}
    if (!form.file_number.trim()) errCollection.file_number = 'File registration index required.'
    if (!form.payee_name.trim()) errCollection.payee_name = 'Carrier operational corporate identity identifier missing.'
    if (!form.amount || Number(form.amount) <= 0) errCollection.amount = 'Valid transaction premium costing metric mandatory.'
    if (!form.valid_to) errCollection.valid_to = 'Plan protection duration limit boundary target required.'
    setErrors(errCollection)
    return Object.keys(errCollection).length === 0
  }

  const dispatchInsertionMutation = () => {
    if (!validateFormPayload()) return
    
    const configuredRecord: InsurancePayment = {
      id: `IP${String(rows.length + 1).padStart(3, '0')}`,
      file_number: form.file_number.trim().toUpperCase(),
      payee_name: form.payee_name.trim(),
      amount: Number(form.amount),
      mode: form.mode,
      payment_date: form.payment_date,
      valid_to: form.valid_to,
      company_bank_id: form.company_bank_id || null,
      remarks: form.remarks.trim() || null,
      is_deleted: false
    }

    setRows([configuredRecord, ...rows])
    setForm({ file_number: '', payee_name: '', amount: '', mode: 'UPI', payment_date: SYSTEM_ANCHOR_DATE, valid_to: '', company_bank_id: '', remarks: '' })
    setErrors({})
    setShowAdd(false)
    setPage(1)
  }

  const dispatchSoftDeletionMutation = (targetId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (window.confirm("Perform irreversible system ledger soft-deletion? This element will bypass viewing matrices but will maintain permanent residency in low-level corporate compliance audit tables.")) {
      setRows(prevRows => prevRows.map(r => r.id === targetId ? { ...r, is_deleted: true } : r))
    }
  }

  return (
    <>
      <PageHeader title="Insurance Payments" subtitle="Insurance premium payments and system coverage mapping" />

      {/* ── Option C Hybrid Alert Banner Engine Layer ── */}
      {imminentRiskCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '14px 18px', borderRadius: 8, marginBottom: 20 }}>
          <ShieldAlert size={20} style={{ color: '#d97706' }} />
          <div style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500 }}>
            Attention System Admin: <strong>{imminentRiskCount} policy asset plans</strong> are crossing the critical 7-day contract expiry threshold parameter.
          </div>
          <button className="btn btn-outline btn-sm" style={{ borderColor: '#f59e0b', color: '#b45309', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => setFilterStatus('Expiring')}>
            Isolate Expiring
          </button>
        </div>
      )}

      {/* ── KPI Metric Container Grid Blocks ── */}
      <div className="pay-kpi-row">
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon blue"><IndianRupee size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Premiums Paid</div>
            <div className="pay-kpi-value" style={{ color: 'var(--brand-700)' }}>₹{totalPremiumsPaid.toLocaleString('en-IN')}</div>
            <div className="pay-kpi-sub">{rows.filter(r => !r.is_deleted).length} ledger objects loaded</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon green"><CalendarClock size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Active Protected Files</div>
            <div className="pay-kpi-value" style={{ color: '#137333' }}>{activeCount}</div>
            <div className="pay-kpi-sub">Assets current and compliant</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon red"><AlertTriangle size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Lapsed / Expired Policies</div>
            <div className="pay-kpi-value" style={{ color: '#b91c1c' }}>{expiredCount}</div>
            <div className="pay-kpi-sub">Requires immediate administrative lookup</div>
          </div>
        </div>
      </div>

      {/* ── Filter Matrix Component Form Panel ── */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <input className="pay-filter-input" placeholder="File no., insurer profile identity, metadata..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Policy Status</span>
          <select className="pay-filter-input" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="Active">Active Plan</option>
            <option value="Expiring">Expiring (≤ 7 Days)</option>
            <option value="Expired">Expired / Lapsed</option>
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Payment Mode</span>
          <select className="pay-filter-input" value={filterMode} onChange={(e) => { setFilterMode(e.target.value); setPage(1) }}>
            <option value="">All channels</option>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date From</span>
          <input type="date" className="pay-filter-input" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }} />
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date To</span>
          <input type="date" className="pay-filter-input" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1) }} />
        </div>
        {(search || filterStatus || filterMode || filterDateFrom || filterDateTo) && (
          <button className="pay-filter-reset" onClick={() => { setSearch(''); setFilterStatus(''); setFilterMode(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }}>
            <RotateCcw size={13} style={{ marginRight: 4 }} />Reset
          </button>
        )}
        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add new
        </button>
      </div>

      {/* ── Main Structured Ledger Layout View ── */}
      <div className="data-card">
        {processedLedgerRows.length === 0 ? (
          <div className="data-empty">No tracking records hit the configured pipeline parameters.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>FILE REFERENCE</th>
                    <th>INSURANCE PAYEE VENDOR</th>
                    <th>AMOUNT DISBURSED</th>
                    <th>POLICY STATUS</th> {/* 👈 Explicit Status Tracking Column */}
                    <th>MODE</th>
                    <th>PAYMENT DATE</th>
                    <th>VALID UNTIL</th>
                    <th style={{ textAlign: 'right' }}>ACTION CONTROL</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((r) => {
                    const status = evalPolicyStatus(r.valid_to)
                    return (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--gray-400)', fontSize: '0.82rem' }}>{r.id}</td>
                        <td><span className="db-file-id">{r.file_number}</span></td>
                        <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{r.payee_name}</td>
                        <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>₹{r.amount.toLocaleString('en-IN')}</td>
                        <td>
                          {/* Dedicated badge evaluation rendering mapping directly into pages.css core token variables */}
                          <span className={`from-badge ${status === 'Active' ? 'from-dealer' : status === 'Expiring' ? 'from-broker' : 'from-other'}`} style={{ fontWeight: 600 }}>
                            {status.toUpperCase()}
                          </span>
                        </td>
                        <td><span className="mode-badge mode-upi">{r.mode}</span></td>
                        <td style={{ fontSize: '0.84rem', color: 'var(--gray-600)' }}>{r.payment_date}</td>
                        <td style={{ fontSize: '0.84rem', color: 'var(--gray-600)', fontWeight: 500 }}>{r.valid_to}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }} onClick={() => setViewRow(r)}>
                              <Eye size={13} />
                            </button>
                            <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px', borderColor: '#fca5a5', color: '#ef4444' }} onClick={(e) => dispatchSoftDeletionMutation(r.id, e)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Functional Pagination Engine bar context component mapping */}
            <div className="pagination-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="pagination-info">Showing {Math.min((safePageIndex - 1) * pageSize + 1, processedLedgerRows.length)}–{Math.min(safePageIndex * pageSize, processedLedgerRows.length)} of {processedLedgerRows.length} records</span>
                <select className="page-size-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {[10, 20, 50].map((s) => <option key={s} value={s}>{s} / page</option>)}
                </select>
              </div>
              <div className="pagination-controls">
                <button className="page-btn" onClick={() => setPage(1)} disabled={safePageIndex === 1}><ChevronsLeft size={14} /></button>
                <button className="page-btn" onClick={() => setPage(safePageIndex - 1)} disabled={safePageIndex === 1}><ChevronLeft size={14} /></button>
                <button className="page-btn active">{safePageIndex}</button>
                <button className="page-btn" onClick={() => setPage(safePageIndex + 1)} disabled={safePageIndex === totalPages}><ChevronRight size={14} /></button>
                <button className="page-btn" onClick={() => setPage(totalPages)} disabled={safePageIndex === totalPages}><ChevronsRight size={14} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Transaction Inward Entry Overlay Modal ── */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Premium Insurance Payment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); dispatchInsertionMutation(); }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  
                  <div className="modal-section-label">Coverage File & Provider Info</div>
                  
                  <div className="form-group">
                    <label className="form-label">File Number Reference *</label>
                    <input className={`form-input ${errors.file_number ? 'error' : ''}`} placeholder="e.g. F1003" value={form.file_number} onChange={(e) => setForm({...form, file_number: e.target.value})} />
                    {errors.file_number && <span className="form-error">{errors.file_number}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Insurer Provider Corporation *</label>
                    <input className={`form-input ${errors.payee_name ? 'error' : ''}`} placeholder="e.g. Tata AIG, HDFC Ergo" value={form.payee_name} onChange={(e) => setForm({...form, payee_name: e.target.value})} />
                    {errors.payee_name && <span className="form-error">{errors.payee_name}</span>}
                  </div>

                  <div className="modal-section-label">Financial Parameters</div>

                  <div className="form-group">
                    <label className="form-label">Premium Amount (₹) *</label>
                    <input type="number" className={`form-input ${errors.amount ? 'error' : ''}`} placeholder="e.g. 9500" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} />
                    {errors.amount && <span className="form-error">{errors.amount}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Transaction Mode *</label>
                    <select className="form-input" value={form.mode} onChange={(e) => setForm({...form, mode: e.target.value as any})}>
                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="modal-section-label">Coverage Duration Lifecycle</div>

                  <div className="form-group">
                    <label className="form-label">Premium Payment Booked Date *</label>
                    <input type="date" className="form-input" value={form.payment_date} onChange={(e) => setForm({...form, payment_date: e.target.value})} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Policy Expiration Target (Valid Until) *</label>
                    <input type="date" className={`form-input ${errors.valid_to ? 'error' : ''}`} value={form.valid_to} onChange={(e) => setForm({...form, valid_to: e.target.value})} />
                    {errors.valid_to && <span className="form-error">{errors.valid_to}</span>}
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Remittance Corporate Bank Account</label>
                    <select className="form-input" value={form.company_bank_id} onChange={(e) => setForm({...form, company_bank_id: e.target.value})}>
                      <option value="">— Select processing account —</option>
                      {COMPANY_BANKS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  </div>

                  <div className="modal-section-label">Metadata Records</div>
                  <div className="form-group modal-full">
                    <label className="form-label">Internal Audit Notes / Remarks</label>
                    <textarea className="form-input" rows={2} placeholder="Add policy numbers or specific registration markers..." value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} />
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Insurance Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Inspection Detail Inspection Modal Drawer ── */}
      {viewRow && (
        <div className="modal-backdrop" onClick={() => setViewRow(null)}>
          <div className="modal" style={{ maxWidth: 550 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Insurance Plan Audit Ledger — {viewRow.id}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="pay-detail-grid">
                <div className="pay-detail-item">
                  <div className="pay-detail-key">File Reference Number</div>
                  <div className="pay-detail-val"><span className="db-file-id">{viewRow.file_number}</span></div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Calculated Policy Status</div>
                  <div className="pay-detail-val">
                    <span className={`from-badge ${evalPolicyStatus(viewRow.valid_to) === 'Active' ? 'from-dealer' : evalPolicyStatus(viewRow.valid_to) === 'Expiring' ? 'from-broker' : 'from-other'}`}>
                      {evalPolicyStatus(viewRow.valid_to).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Insurance Provider Carrier</div>
                  <div className="pay-detail-val" style={{ fontWeight: 600 }}>{viewRow.payee_name}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Premium Cost Value</div>
                  <div className="pay-detail-val" style={{ fontWeight: 600 }}>₹{viewRow.amount.toLocaleString('en-IN')}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Transaction Channel</div>
                  <div className="pay-detail-val"><span className="mode-badge mode-upi">{viewRow.mode}</span></div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Finalized Date</div>
                  <div className="pay-detail-val">{viewRow.payment_date}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Coverage Expiration Date</div>
                  <div className="pay-detail-val" style={{ fontWeight: 500 }}>{viewRow.valid_to}</div>
                </div>
                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Linked Ledger Settlement Bank</div>
                  <div className="pay-detail-val">
                    {COMPANY_BANKS.find(b => b.id === viewRow.company_bank_id)?.label || '—'}
                  </div>
                </div>
                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Audit Remarks</div>
                  <div className="pay-detail-val">{viewRow.remarks || '—'}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setViewRow(null)}>Close Inspection</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}