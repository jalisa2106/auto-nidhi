import React, { useEffect, useState, useMemo } from 'react'
import {
  CheckCircle2, Clock, AlertTriangle,
  PlusCircle, ClipboardList, TrendingUp, IndianRupee, Loader2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import { filesApi, notificationsApi, serviceRequestsApi } from '../../api/services'
import LoanResourceCenter from '../../components/CustomerPages/LoanResourceCenter'

// ── Helpers ────────────────────────────────────────────────────────────────

const LOAN_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:          { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Draft' },
  login:          { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Login' },
  under_process: { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b', label: 'In Process' },
  sanctioned:    { bg: '#f0fdf4', text: '#0f766e', dot: '#14b8a6', label: 'Sanctioned' },
  disbursed:     { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Disbursed' },
}

const REQ_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:   { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: 'Pending' },
  processed: { bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6', label: 'Processed' },
  approved:  { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Approved' },
  rejected:  { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: 'Rejected' },
}

function normalizeStatus(s?: string) {
  return (s || 'draft').toLowerCase().replace(/ /g, '_')
}

function LoanStatusBadge({ status }: { status?: string }) {
  const key = normalizeStatus(status)
  const cfg = LOAN_STATUS_CONFIG[key] || LOAN_STATUS_CONFIG.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.text,
      padding: '4px 12px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.5px'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function ReqStatusBadge({ status }: { status?: string }) {
  const key = (status || 'pending').toLowerCase()
  const cfg = REQ_STATUS_CONFIG[key] || REQ_STATUS_CONFIG.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.text,
      padding: '4px 12px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.5px'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function Pagination({
  total, page, pageSize, onPage, onPageSize,
}: {
  total: number; page: number; pageSize: number
  onPage: (p: number) => void; onPageSize: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total)
  const end = Math.min(page * pageSize, total)
  const pages: (number | '...')[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="pagination-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pagination-info">Showing {start}-{end} of {total} records</span>
        <select className="page-size-select" value={pageSize} onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1) }}>
          {[5, 10, 20].map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First"><ChevronsLeft size={14} /></button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Prev"><ChevronLeft size={14} /></button>
        {pages.map((p, i) => p === '...' ? (
          <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem' }}>...</span>
        ) : (
          <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
        ))}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next"><ChevronRight size={14} /></button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

export default function CustomerLoanPage() {
  // ─── 🔌 CORE BACKEND STATE ENGINES ───
  const [loanFiles, setLoanFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [backendError, setBackendError] = useState<string | null>(null)
  
  // Submitted request history
  const [submittedRequests, setSubmittedRequests] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Search & Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Request wizard states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [vehicleMake, setVehicleMake] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [tenure, setTenure] = useState('36')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  
  // ─── 🔄 LIVE SERVER STREAM DESK ───
  const loadData = () => {
    setLoading(true)
    setBackendError(null)
    
    // Calls your unified files listing service targeting the 'new_vehicle' classification scope
    filesApi.list(1, 100, undefined, 'new_vehicle')
      .then(res => {
        setLoanFiles(res.data || [])
      })
      .catch((err) => {
        console.error("Failed to load customer loan profiles from cluster:", err)
        setBackendError("Could not sync active applications with the server dashboard.")
        setLoanFiles([])
      })
      .finally(() => setLoading(false))
  }

  const loadSubmittedRequests = () => {
    setLoadingHistory(true)
    serviceRequestsApi.list()
      .then(res => {
        const filtered = (res || []).filter((r: any) => r.request_type === 'loan')
        setSubmittedRequests(filtered)
      })
      .catch(err => {
        console.error("Failed to load submitted loan requests:", err)
      })
      .finally(() => setLoadingHistory(false))
  }

  useEffect(() => {
    loadData()
    loadSubmittedRequests()
  }, [])

  const triggerToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // Filter list computations
  const filteredRecords = useMemo(() => {
    return loanFiles.filter(r => {
      const status = normalizeStatus(r.status)
      const fileNum = r.file_number || ''
      const bankName = r.finance_bank || ''
      
      const matchesSearch = 
        fileNum.toLowerCase().includes(search.toLowerCase()) ||
        bankName.toLowerCase().includes(search.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [loanFiles, search, statusFilter])

  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredRecords.length / pageSize)))
  const pageRows = useMemo(() => {
    return filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize)
  }, [filteredRecords, safePage, pageSize])

  // Real-time server metrics computations
  const stats = useMemo(() => {
    let pendingCount = 0
    let processCount = 0
    let sanctionedCount = 0
    let totalLoanAmount = 0

    loanFiles.forEach(r => {
      const status = normalizeStatus(r.status)
      if (status === 'login') pendingCount++
      if (status === 'under_process') processCount++
      if (status === 'sanctioned') sanctionedCount++
      if (r.finance_amount) totalLoanAmount += Number(r.finance_amount)
    })

    return { pendingCount, processCount, sanctionedCount, totalLoanAmount }
  }, [loanFiles])

  // Handle Wizard Submit
  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vehicleMake || !vehicleModel || !loanAmount) { 
      triggerToast('err', 'Please fill in all required fields.')
      return 
    }

      setSubmitting(true)
      try {
        await serviceRequestsApi.create({
          request_type: 'loan',
          details: {
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            loan_amount: Number(loanAmount),
            tenure: Number(tenure)
          },
          remarks: remarks
        })

      // 2. Notify Admin via backend communications endpoint (legacy)
      try {
        await notificationsApi.notifyAdmin({
          subject: `New Vehicle Loan Request: ${vehicleMake} ${vehicleModel}`,
          page_context: 'Quick Services - Loan',
          message: `A customer has requested a new vehicle loan application.
          
Vehicle details: ${vehicleMake} ${vehicleModel}
Requested Capital Amount: ₹${Number(loanAmount).toLocaleString('en-IN')}
Desired Tenure Cycle: ${tenure} months
Customer Submissions Remarks: ${remarks || 'None'}`,
          include_summary: true 
        })
      } catch (err) {
        console.warn("Legacy notifyAdmin failed, continuing as request was logged:", err)
      }
      
      triggerToast('ok', 'Loan Application Request sent to AutoNidhi team!')
      setIsModalOpen(false)
      setVehicleMake('')
      setVehicleModel('')
      setLoanAmount('')
      setRemarks('')
      
      // Smooth refresh to show updates if the backend auto-creates a trace draft line
      loadData()
      loadSubmittedRequests()
    } catch (err: any) {
      triggerToast('err', 'Failed to send request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader 
        title="Vehicle Loans" 
        subtitle="Apply for new vehicle financing, used car loans, and track your sanction progress." 
      />

      {/* Toast Alert Messaging Element */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 10000,
          background: toast.type === 'ok' ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${toast.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
          borderLeft: `4px solid ${toast.type === 'ok' ? '#22c55e' : '#f43f5e'}`,
          borderRadius: 12, padding: '14px 20px',
          color: toast.type === 'ok' ? '#166534' : '#be123c',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
          fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideIn 0.2s ease-out'
        }}>
          {toast.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* ─── LIVE FINANCIAL KPI STATS ROWS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: 'var(--brand-50)', padding: 12, borderRadius: 8, color: 'var(--brand-600)' }}><ClipboardList size={22}/></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Total Applications</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-800)' }}>{loading ? '…' : loanFiles.length}</p>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#fffbeb', padding: 12, borderRadius: 8, color: '#d97706' }}><Clock size={22}/></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Processing</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>{loading ? '…' : stats.processCount}</p>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, color: '#0f766e' }}><CheckCircle2 size={22}/></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Sanctioned</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f766e' }}>{loading ? '…' : stats.sanctionedCount}</p>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: 'var(--brand-50)', padding: 12, borderRadius: 8, color: 'var(--brand-600)' }}><IndianRupee size={22}/></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Total Loan Vol.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-800)' }}>₹{loading ? '…' : stats.totalLoanAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Shared Operational Grid Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.5fr 4.5fr', gap: 20, alignItems: 'flex-start' }}>
        
        {/* Main Applications Data Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Filters Toolbar */}
          <div className="data-card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', minWidth: 260 }}>
              <TrendingUp size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by File No. or Bank..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                disabled={loading}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, width: '100%', color: 'var(--gray-800)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select 
                value={statusFilter} 
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                disabled={loading}
                style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600, outline: 'none', color: '#475569' }}
              >
                <option value="all">All Statuses</option>
                <option value="login">Login</option>
                <option value="under_process">In Process</option>
                <option value="sanctioned">Sanctioned</option>
                <option value="disbursed">Disbursed</option>
              </select>

              <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsModalOpen(true)}>
                <PlusCircle size={14} /> Request Loan Service
              </button>
            </div>
          </div>

          {/* Central Live Files Table Dashboard View */}
          <div className="data-card" style={{ padding: 0, overflow: 'hidden', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {loading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand-600)' }} />
                <span>Synchronizing live credit lines...</span>
              </div>
            )}

            {!loading && backendError && (
              <div style={{ padding: 40, textAlign: 'center', color: '#b91c1c' }}>
                <AlertTriangle size={24} style={{ margin: '0 auto 8px auto' }} />
                <span>{backendError}</span>
              </div>
            )}

            {!loading && !backendError && filteredRecords.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                No active loan folders found mapping current selection profiles.
              </div>
            )}

            {!loading && !backendError && filteredRecords.length > 0 && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>File Number</th>
                        <th>Bank Name</th>
                        <th>Loan Amount</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Date Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(rec => (
                        <tr key={rec.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--brand-700)', fontFamily: 'monospace' }}>
                              {rec.file_number}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: 600 }}>
                            {rec.finance_bank || '—'}
                          </td>
                          <td style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: 700 }}>
                            ₹{(rec.finance_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td>
                            <LoanStatusBadge status={rec.status} />
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                            {rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-IN') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  total={filteredRecords.length}
                  page={safePage}
                  pageSize={pageSize}
                  onPage={setPage}
                  onPageSize={setPageSize}
                />
              </>
            )}
          </div>

          {/* Submitted Requests History Card */}
          <div className="data-card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={18} style={{ color: 'var(--brand-600)' }} />
                Submitted Loan Requests History
              </h3>
              <button 
                type="button"
                className="btn btn-ghost btn-sm" 
                onClick={loadSubmittedRequests} 
                disabled={loadingHistory}
                style={{ fontSize: '0.75rem', fontWeight: 600 }}
              >
                Refresh History
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand-600)' }} />
                <span style={{ fontSize: '0.8rem' }}>Loading submitted applications...</span>
              </div>
            ) : submittedRequests.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.84rem' }}>
                You have not submitted any loan request forms yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem' }}>Request ID</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem' }}>Vehicle</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem' }}>Amount</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem' }}>Status</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem' }}>Assigned To</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.75rem' }}>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittedRequests.map(req => (
                      <tr key={req.id}>
                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--gray-600)' }}>
                          {req.id.replace('req-', '').substring(0, 8).toUpperCase()}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                          {req.details?.vehicle_make} {req.details?.vehicle_model}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                          ₹{(req.details?.loan_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <ReqStatusBadge status={req.status} />
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#64748b' }}>
                          {req.consultant_name || 'Unassigned'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                          {req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Resource Center Column Element */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* ⚡ INSTANT INJECTION POINT: Clean modular components tracking hub */}
          <LoanResourceCenter />
          
        </div>

      </div>

      {/* Modal View Workspace: New Loan Request Layout Form */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Request New Vehicle Loan Service</h3>
              <button className="btn btn-ghost btn-sm" disabled={submitting} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleWizardSubmit}>
              <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Vehicle Make <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maruti"
                      value={vehicleMake}
                      onChange={e => setVehicleMake(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Model <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Swift"
                      value={vehicleModel}
                      onChange={e => setVehicleModel(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Requested Loan Amount (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                  <div className="input-wrapper">
                    <IndianRupee className="input-icon" size={16} />
                    <input
                      type="number"
                      required
                      placeholder="5,00,000"
                      value={loanAmount}
                      onChange={e => setLoanAmount(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Tenure (Months)</label>
                  <select
                    value={tenure}
                    onChange={e => setTenure(e.target.value)}
                    className="form-input"
                    style={{ appearance: 'auto' }}
                  >
                    {[12, 24, 36, 48, 60, 72, 84].map(m => <option key={m} value={m}>{m} Months</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Additional Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Any specific bank preference or message..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="form-input"
                    style={{ fontFamily: 'inherit' }}
                  />
                </div>

              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline btn-sm" disabled={submitting} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Sending Request...' : 'Submit Loan Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
