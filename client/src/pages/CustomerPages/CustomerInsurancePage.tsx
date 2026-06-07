import { useEffect, useState, useMemo } from 'react'
import { 
  ShieldCheck, AlertTriangle, Calendar, Search, 
  IndianRupee, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  PlusCircle, Loader2
} from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import api from '../../api/axios'
import { notificationsApi, serviceRequestsApi } from '../../api/services'
import InsuranceCenter from '../../components/CustomerPages/InsuranceCenter'

interface InsurancePolicy {
  file_number: string
  file_type: string
  company_name: string 
  policy_number: string 
  valid_from: string | null 
  valid_to: string | null 
  premium_amount: number 
  idv_amount: number 
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

const REQ_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:   { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: 'Pending' },
  processed: { bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6', label: 'Processed' },
  approved:  { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Approved' },
  rejected:  { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: 'Rejected' },
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

export default function CustomerInsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [backendError, setBackendError] = useState<string | null>(null)
  
  // Submitted request history
  const [submittedRequests, setSubmittedRequests] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [regNo, setRegNo] = useState('')
  const [insurerPreference, setInsurerPreference] = useState('')
  const [policyType, setPolicyType] = useState('comprehensive')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

const loadData = () => {
  setLoading(true)
  setBackendError(null)
  
  // 🔌 CHANGED: Target the correct /portal/insurance backend route
  api.get('/portal/insurance')
    .then(res => {
      // 🛡️ Bulletproof check: Look for data array wrappers across common API standards
      if (res.data && Array.isArray(res.data)) {
        setPolicies(res.data)
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        setPolicies(res.data.data)
      } else {
        // Fallback cleanly to prevent rendering engine breakdowns
        setPolicies([])
      }
    })
    .catch((err) => {
      console.error("Database connection fault tracking logs:", err)
      
      // If your API returns a clean 200/404 empty block, let's handle it silently 
      // instead of locking out the customer dashboard layout interface
      if (err.response && err.response.status === 404) {
        setPolicies([])
      } else {
        setBackendError("Could not secure streaming channel with policy history clusters.")
      }
    })
    .finally(() => setLoading(false))
}

  const loadSubmittedRequests = () => {
    setLoadingHistory(true)
    serviceRequestsApi.list()
      .then(res => {
        const filtered = (res || []).filter((r: any) => r.request_type === 'insurance')
        setSubmittedRequests(filtered)
      })
      .catch(err => {
        console.error("Failed to load submitted insurance requests:", err)
      })
      .finally(() => setLoadingHistory(false))
  }

  useEffect(() => {
    loadData()
    loadSubmittedRequests()
  }, [])

  const getPolicyStatus = (validToDateStr: string | null) => {
    if (!validToDateStr) {
      return { label: 'No expiry date', color: '#64748b', bg: '#f1f5f9', type: 'expired' }
    }
    const today = new Date(); today.setHours(0,0,0,0)
    const validTo = new Date(validToDateStr); validTo.setHours(0,0,0,0)
    const diffDays = Math.ceil((validTo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { label: 'Expired', color: '#b91c1c', bg: '#fef2f2', type: 'expired' }
    if (diffDays <= 30) return { label: `Expiring in ${diffDays}d`, color: '#d97706', bg: '#fffbeb', type: 'expiring' }
    return { label: 'Active', color: '#15803d', bg: '#f0fdf4', type: 'active' }
  }

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      const status = getPolicyStatus(p.valid_to).type
      const matchesSearch = p.policy_number.toLowerCase().includes(search.toLowerCase()) || 
                            p.company_name.toLowerCase().includes(search.toLowerCase()) ||
                            p.file_number.toLowerCase().includes(search.toLowerCase())
      return matchesSearch && (statusFilter === 'all' || status === statusFilter)
    })
  }, [policies, search, statusFilter])

  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredPolicies.length / pageSize)))
  const pageRows = filteredPolicies.slice((safePage - 1) * pageSize, safePage * pageSize)

  const metrics = useMemo(() => {
    let active = 0, expiring = 0, expired = 0, premium = 0
    policies.forEach(p => {
      const s = getPolicyStatus(p.valid_to).type
      if (s === 'active') active++; if (s === 'expiring') expiring++; if (s === 'expired') expired++
      premium += Number(p.premium_amount || 0)
    })
    return { active, expiring, expired, premium }
  }, [policies])

  const triggerToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regNo) { triggerToast('err', 'Please enter Vehicle Registration Number.'); return }

    setSubmitting(true)
    try {
      // 1. Log structured request
      const userRaw = localStorage.getItem('an_current_user')
      const user = userRaw ? JSON.parse(userRaw) : null
      await serviceRequestsApi.create({
        customer_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Customer',
        customer_email: user?.email || '',
        customer_mobile: user?.phone_number || '9876543210',
        request_type: 'insurance',
        details: {
          registration_no: regNo,
          policy_type: policyType,
          insurer_preference: insurerPreference || 'Any'
        },
        remarks: remarks
      })

      // 2. legacy admin notification
      try {
        await notificationsApi.notifyAdmin({
          subject: `New Insurance Request: ${regNo}`,
          page_context: 'Quick Services - Insurance',
          message: `Customer is requesting vehicle insurance coverage/renewal.

Registration No: ${regNo}
Policy Type: ${policyType.replace('_', ' ').toUpperCase()}
Insurer Preference: ${insurerPreference || 'Any'}
Remarks: ${remarks || 'None'}`,
          include_summary: true
        })
      } catch (err) {
        console.warn("Legacy notifyAdmin failed, continuing as request was logged:", err)
      }

      triggerToast('ok', 'Insurance request submitted to AutoNidhi team!')
      setIsModalOpen(false); setRegNo(''); setRemarks(''); setInsurerPreference('')
      loadData()
      loadSubmittedRequests()
    } catch {
      triggerToast('err', 'Failed to send request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader title="Insurance Details" subtitle="Manage active policies, renewals, and track coverage amounts." />

      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 10000,
          background: toast.type === 'ok' ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${toast.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
          borderLeft: `4px solid ${toast.type === 'ok' ? '#22c55e' : '#f43f5e'}`,
          borderRadius: 12, padding: '14px 20px', color: toast.type === 'ok' ? '#166534' : '#be123c',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10
        }}>
          {toast.type === 'ok' ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Policies', val: metrics.active, color: '#15803d', bg: '#f0fdf4', icon: ShieldCheck },
          { label: 'Expiring Soon', val: metrics.expiring, color: '#d97706', bg: '#fffbeb', icon: AlertTriangle },
          { label: 'Expired Policies', val: metrics.expired, color: '#b91c1c', bg: '#fef2f2', icon: Calendar },
          { label: 'Total Premiums', val: `₹${metrics.premium.toLocaleString('en-IN')}`, color: 'var(--brand-600)', bg: 'var(--brand-50)', icon: IndianRupee },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ background: m.bg, padding: 12, borderRadius: 8, color: m.color }}><m.icon size={22}/></div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase' }}>{m.label}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800 }}>{loading ? '…' : m.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7.5fr 4.5fr', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="data-card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', minWidth: 260, flex: 1 }}>
              <Search size={16} color="#94a3b8" />
              <input type="text" placeholder="Search by Policy No., Insurer..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} disabled={loading} style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }} disabled={loading} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
                <option value="all">All Items</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring</option>
                <option value="expired">Expired</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}><PlusCircle size={14} /> Request Insurance Service</button>
            </div>
          </div>

          <div className="data-card" style={{ padding: 0, overflow: 'hidden', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {loading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand-600)' }} />
                <span>Streaming policy documents...</span>
              </div>
            )}

            {!loading && backendError && (
              <div style={{ padding: 40, textAlign: 'center', color: '#b91c1c' }}>
                <AlertTriangle size={24} style={{ margin: '0 auto 8px auto' }} />
                <span>{backendError}</span>
              </div>
            )}

            {!loading && !backendError && pageRows.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                No registered policies match the specified search queries.
              </div>
            )}

            {!loading && !backendError && pageRows.length > 0 && (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vehicle Info</th>
                      <th>Insurer & Policy</th>
                      <th>Coverage Period</th>
                      <th>Premium</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(p => {
                      const s = getPolicyStatus(p.valid_to)
                      return (
                        <tr key={p.policy_number}>
                          <td><div style={{ fontWeight: 700, color: 'var(--brand-700)' }}>{p.file_number}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{p.file_type ? p.file_type.replace('_',' ') : ''}</div></td>
                          <td><div style={{ fontWeight: 600 }}>{p.company_name}</div><div style={{ fontSize: 12, fontFamily: 'monospace' }}>{p.policy_number}</div></td>
                          <td style={{ fontSize: 12 }}>{p.valid_from} ➔ {p.valid_to}</td>
                          <td style={{ fontWeight: 700 }}>₹{p.premium_amount.toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{s.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <Pagination total={filteredPolicies.length} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
              </>
            )}
          </div>

          {/* Submitted Requests History Card */}
          <div className="data-card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} style={{ color: 'var(--brand-600)' }} />
                Submitted Insurance Requests History
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
                <span style={{ fontSize: '0.8rem' }}>Loading submitted requests...</span>
              </div>
            ) : submittedRequests.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.84rem' }}>
                You have not submitted any insurance request forms yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem' }}>Request ID</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem' }}>Registration No</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem' }}>Insurer Pref</th>
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
                          {req.details?.registration_no}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#1e293b' }}>
                          {req.details?.insurer_preference || 'Any'}
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

        {/* Modular Sidebar Center Integration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <InsuranceCenter />
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Request Vehicle Insurance Service</h3><button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>✕</button></div>
            <form onSubmit={handleWizardSubmit}>
              <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label className="form-label">Registration Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" required placeholder="e.g. MH 12 AB 1234" value={regNo} onChange={e => setRegNo(e.target.value)} className="form-input" />
                
                <label className="form-label">Insurance Type</label>
                <select value={policyType} onChange={e => setPolicyType(e.target.value)} className="form-input">
                  <option value="comprehensive">Comprehensive Package</option>
                  <option value="third_party">Third Party Only</option>
                  <option value="zero_dep">Zero Depreciation</option>
                </select>

                <label className="form-label">Preferred Insurer</label>
                <input type="text" placeholder="e.g. HDFC Ergo, ICICI Lombard" value={insurerPreference} onChange={e => setInsurerPreference(e.target.value)} className="form-input" />

                <label className="form-label">Remarks</label>
                <textarea rows={3} placeholder="Current expiry date or special requirements..." value={remarks} onChange={e => setRemarks(e.target.value)} className="form-input" />

              </div>
              <div className="modal-footer"><button type="button" className="btn btn-outline btn-sm" onClick={() => setIsModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Submitting...' : 'Send Request'}</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
