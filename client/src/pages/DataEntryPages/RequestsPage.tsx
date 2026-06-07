import React, { useEffect, useState, useMemo } from 'react'
import { 
  GitPullRequest, ClipboardList, CheckCircle2, Clock, 
  Search, AlertTriangle, Eye, ShieldCheck, 
  Mail, Phone, Calendar, Loader2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import { serviceRequestsApi, type ServiceRequest } from '../../api/services'
import { addNotification } from '../../store/notificationStore'
import { message } from 'antd'

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
    <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--gray-200)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pagination-info" style={{ fontSize: '0.84rem', color: 'var(--gray-500)' }}>Showing {start}-{end} of {total} records</span>
        <select className="page-size-select" value={pageSize} onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1) }} style={{ border: '1px solid var(--gray-200)', borderRadius: 6, padding: '4px 8px', fontSize: '0.8rem' }}>
          {[5, 10, 20].map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="pagination-controls" style={{ display: 'flex', gap: 4 }}>
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First" style={{ display: 'flex', alignItems: 'center', padding: '5px', borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}><ChevronsLeft size={14} /></button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Prev" style={{ display: 'flex', alignItems: 'center', padding: '5px', borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}><ChevronLeft size={14} /></button>
        {pages.map((p, i) => p === '...' ? (
          <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem', alignSelf: 'center' }}>...</span>
        ) : (
          <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p as number)} style={{ minWidth: '28px', height: '28px', borderRadius: 6, border: page === p ? 'none' : '1px solid var(--gray-200)', background: page === p ? 'var(--brand-600)' : '#fff', color: page === p ? '#fff' : 'inherit', cursor: 'pointer', fontWeight: 600, fontSize: '0.84rem' }}>{p}</button>
        ))}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next" style={{ display: 'flex', alignItems: 'center', padding: '5px', borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}><ChevronRight size={14} /></button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last" style={{ display: 'flex', alignItems: 'center', padding: '5px', borderRadius: 6, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Current logged in user info
  const userRole = localStorage.getItem('user_role') || 'guest'



  // Modals / Dialogs states
  const [selectedReq, setSelectedReq] = useState<ServiceRequest | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processRemarks, setProcessRemarks] = useState('')
  const [processing, setProcessing] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'processed' | 'approved' | 'rejected'>('processed')

  // Warning for unseen requests older than 3 days
  const [unseenOverdueRequests, setUnseenOverdueRequests] = useState<ServiceRequest[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch requests
      const data = await serviceRequestsApi.list()
      const filteredForRole = data
      
      setRequests(filteredForRole)

      // 2. Check for overdue unseen requests (pending, unseen, and > 3 days old)
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
      const overdue = filteredForRole.filter(r => 
        r.status === 'pending' && 
        !r.viewed_by_consultant && 
        new Date(r.created_at).getTime() < threeDaysAgo
      )
      setUnseenOverdueRequests(overdue)

      // 3. Trigger in-app notifications for overdue requests
      overdue.forEach(r => {
        const sessionKey = `notified_overdue_${r.id}`
        if (!sessionStorage.getItem(sessionKey)) {
          addNotification(
            'general',
            `Warning: Request ${r.id.slice(-6).toUpperCase()} from ${r.customer_name} is unviewed for over 3 days!`,
            'Requests'
          )
          sessionStorage.setItem(sessionKey, 'true')
        }
      })

    } catch (err) {
      message.error('Failed to sync service requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter list computations
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchSearch = 
        r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        r.customer_email.toLowerCase().includes(search.toLowerCase()) ||
        r.customer_mobile.includes(search) ||
        r.remarks.toLowerCase().includes(search.toLowerCase()) ||
        (r.details?.registration_no && r.details.registration_no.toLowerCase().includes(search.toLowerCase())) ||
        (r.details?.file_number && r.details.file_number.toLowerCase().includes(search.toLowerCase()))

      const matchType = typeFilter === 'all' || r.request_type === typeFilter
      const matchStatus = statusFilter === 'all' || r.status === statusFilter

      return matchSearch && matchType && matchStatus
    })
  }, [requests, search, typeFilter, statusFilter])

  // Pagination bounds
  const totalRows = filteredRequests.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => {
    return filteredRequests.slice((safePage - 1) * pageSize, safePage * pageSize)
  }, [filteredRequests, safePage, pageSize])

  // View request details
  const handleViewDetails = async (req: ServiceRequest) => {
    setSelectedReq(req)
    setShowDetailModal(true)
    
    // Mark as viewed if unseen
    if (!req.viewed_by_consultant) {
      try {
        await serviceRequestsApi.markViewed(req.id)
        
        // Refresh local requests list instantly to show updated viewed status
        setRequests(prev => 
          prev.map(r => r.id === req.id ? { ...r, viewed_by_consultant: true, viewed_at: new Date().toISOString() } : r)
        )
        // Also trigger sidebar count updates
        window.dispatchEvent(new CustomEvent('service_requests_updated'))
      } catch (err) {
        console.error("Failed to mark request as viewed:", err)
      }
    }
  }

  // Open Process Modal
  const handleOpenProcess = (req: ServiceRequest) => {
    setSelectedReq(req)
    setProcessRemarks('')
    setShowProcessModal(true)
  }

  // Submit status update (processed / approved / rejected)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReq) return

    setProcessing(true)
    try {
      await serviceRequestsApi.updateStatus(selectedReq.id, submitStatus, processRemarks)
      message.success(`Request status updated to ${submitStatus.toUpperCase()}.`)
      setShowProcessModal(false)
      loadData()
      // Dispatch event to update sidebar badges
      window.dispatchEvent(new CustomEvent('service_requests_updated'))
    } catch {
      message.error('Failed to update request status.')
    } finally {
      setProcessing(false)
    }
  }



  // Count stats
  const metrics = useMemo(() => {
    const total = requests.length
    const pending = requests.filter(r => r.status === 'pending').length
    const processed = requests.filter(r => r.status !== 'pending').length
    const unseen = requests.filter(r => !r.viewed_by_consultant).length
    return { total, pending, processed, unseen }
  }, [requests])

  return (
    <>
      <PageHeader 
        title="Service Requests" 
        subtitle={userRole === 'admin' ? "Monitor and manage all service requests escalated by consultants." : "Manage and process service requests submitted by your customers."} 
      />

      {/* ⚠️ Unseen Overdue Request Warning Banner */}
      {unseenOverdueRequests.length > 0 && (
        <div style={{
          background: '#fff1f2', border: '1px solid #fecdd3', borderLeft: '4px solid #f43f5e',
          borderRadius: 12, padding: '14px 20px', color: '#be123c', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(244,63,94,0.08)'
        }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>
            <strong>Action Required:</strong> You have {unseenOverdueRequests.length} pending service request(s) that have remained unviewed for over 3 days. Please review them immediately.
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Requests', val: metrics.total, color: 'var(--brand-600)', bg: 'var(--brand-50)', icon: ClipboardList },
          { label: 'Pending Requests', val: metrics.pending, color: '#d97706', bg: '#fffbeb', icon: Clock },
          { label: 'Processed Requests', val: metrics.processed, color: '#15803d', bg: '#f0fdf4', icon: CheckCircle2 },
          { label: 'New / Unseen', val: metrics.unseen, color: '#7c3aed', bg: '#f5f3ff', icon: GitPullRequest },
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

      <div className="data-card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', minWidth: 280, flex: 1 }}>
          <Search size={16} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search by customer, mobile, registration..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1) }} 
            disabled={loading} 
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, width: '100%' }} 
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select 
            value={typeFilter} 
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }} 
            disabled={loading} 
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <option value="all">All Request Types</option>
            <option value="loan">Loans</option>
            <option value="insurance">Insurance</option>
            <option value="rto">RTO Services</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }} 
            disabled={loading} 
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>


        </div>
      </div>

      {/* Main Table */}
      <div className="data-card" style={{ padding: 0, overflow: 'hidden', minHeight: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand-600)' }} />
            <span>Streaming requests pipeline...</span>
          </div>
        )}

        {!loading && pageRows.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
            No service requests matched the specified filters.
          </div>
        )}

        {!loading && pageRows.length > 0 && (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Customer Info</th>
                  <th>Request Type</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Unseen</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const reqDate = new Date(r.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })

                  // Color badges for types
                  const typeColors: Record<string, { bg: string; color: string }> = {
                    loan: { bg: '#eff6ff', color: '#1d4ed8' },
                    insurance: { bg: '#f5f3ff', color: '#6d28d9' },
                    rto: { bg: '#fffbeb', color: '#d97706' },
                  }
                  const tc = typeColors[r.request_type] || { bg: '#f1f5f9', color: '#475569' }

                  return (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {r.id.slice(-8).toUpperCase()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{r.customer_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: 12, alignItems: 'center', marginTop: 2 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={11} /> {r.customer_email}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={11} /> {r.customer_mobile}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          background: tc.bg, color: tc.color, padding: '3px 10px',
                          borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase'
                        }}>
                          {r.request_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.84rem', color: '#334155' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {reqDate}</span>
                      </td>
                      <td>
                        {(() => {
                          const sStyles: Record<string, { bg: string; color: string; label: string }> = {
                            pending: { bg: '#fffbeb', color: '#b45309', label: '● Pending' },
                            processed: { bg: '#eff6ff', color: '#1d4ed8', label: '⚙ Processed' },
                            approved: { bg: '#dcfce7', color: '#15803d', label: '✓ Approved' },
                            rejected: { bg: '#fef2f2', color: '#b91c1c', label: '✕ Rejected' },
                          }
                          const s = sStyles[r.status] || { bg: '#f1f5f9', color: '#475569', label: r.status }
                          return (
                            <span style={{
                              background: s.bg, color: s.color, padding: '3px 10px',
                              borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                              textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: 4
                            }}>
                              {s.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td>
                        {!r.viewed_by_consultant ? (
                          <span style={{
                            background: '#fee2e2', color: '#ef4444', padding: '2px 8px',
                            borderRadius: 6, fontSize: '0.68rem', fontWeight: 800
                          }}>
                            NEW
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Read</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button 
                            className="btn btn-ghost btn-xs" 
                            style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28 }}
                            onClick={() => handleViewDetails(r)}
                          >
                            <Eye size={13} /> View
                          </button>
                          
                          {r.status === 'pending' && userRole !== 'admin' && (
                            <button 
                              className="btn btn-outline btn-xs" 
                              style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28, borderColor: '#bfdbfe', color: '#2563eb' }}
                              onClick={() => handleOpenProcess(r)}
                            >
                              <ShieldCheck size={13} /> Process
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pagination total={totalRows} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
          </>
        )}
      </div>

      {/* Modal 1: Request Details */}
      {showDetailModal && selectedReq && (
        <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="modal" style={{ maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Service Request details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Requester Profile</h4>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>{selectedReq.customer_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Email: {selectedReq.customer_email} | Mobile: {selectedReq.customer_mobile}</div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Service Requested</h4>
                <span style={{
                  background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px',
                  borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase'
                }}>
                  {selectedReq.request_type}
                </span>
              </div>

              {/* Dynamic details parsing */}
              <div style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {selectedReq.request_type === 'loan' && (
                  <>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Vehicle Make</span><strong style={{ fontSize: '0.88rem' }}>{selectedReq.details?.vehicle_make}</strong></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Model</span><strong style={{ fontSize: '0.88rem' }}>{selectedReq.details?.vehicle_model}</strong></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Loan Amount</span><strong style={{ fontSize: '0.88rem' }}>₹{Number(selectedReq.details?.loan_amount).toLocaleString('en-IN')}</strong></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Tenure Cycle</span><strong style={{ fontSize: '0.88rem' }}>{selectedReq.details?.tenure} Months</strong></div>
                  </>
                )}
                {selectedReq.request_type === 'insurance' && (
                  <>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Registration No</span><strong style={{ fontSize: '0.88rem' }}>{selectedReq.details?.registration_no}</strong></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Policy Option</span><strong style={{ fontSize: '0.88rem', textTransform: 'capitalize' }}>{selectedReq.details?.policy_type?.replace('_', ' ')}</strong></div>
                    <div style={{ gridColumn: 'span 2' }}><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Insurer Preference</span><strong style={{ fontSize: '0.88rem' }}>{selectedReq.details?.insurer_preference}</strong></div>
                  </>
                )}
                {selectedReq.request_type === 'rto' && (
                  <>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>File Number</span><strong style={{ fontSize: '0.88rem' }}>{selectedReq.details?.file_number || 'No File Associated'}</strong></div>
                    <div><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>RTO Service</span><strong style={{ fontSize: '0.88rem', textTransform: 'capitalize' }}>{selectedReq.details?.service_type?.replace(/_/g, ' ')}</strong></div>
                    <div style={{ gridColumn: 'span 2' }}><span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>RTO District</span><strong style={{ fontSize: '0.88rem' }}>{selectedReq.details?.rto_district}</strong></div>
                  </>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Remarks & Notes</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #f1f5f9', whiteSpace: 'pre-line' }}>
                  {selectedReq.remarks || 'No remarks provided.'}
                </p>
              </div>

              {selectedReq.viewed_at && (
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'right' }}>
                  Viewed on: {new Date(selectedReq.viewed_at).toLocaleString('en-IN')}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowDetailModal(false)}>Close</button>
              {selectedReq.status === 'pending' && userRole !== 'admin' && (
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => {
                    setShowDetailModal(false)
                    handleOpenProcess(selectedReq)
                  }}
                >
                  Process Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Process Request */}
      {showProcessModal && selectedReq && (
        <div className="modal-backdrop" onClick={() => setShowProcessModal(false)}>
          <div className="modal" style={{ maxWidth: 450, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Process Service Request</h3>
              <button className="btn btn-ghost btn-sm" disabled={processing} onClick={() => setShowProcessModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                  Confirm processing request for <strong>{selectedReq.customer_name}</strong>. Provide comments below:
                </p>

                <div>
                  <label className="form-label">Processing Remarks</label>
                  <textarea 
                    rows={3} 
                    required 
                    placeholder="Enter details about documents received, status updates, or action notes..." 
                    value={processRemarks} 
                    onChange={e => setProcessRemarks(e.target.value)} 
                    className="form-input" 
                    style={{ fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline btn-sm" disabled={processing} onClick={() => setShowProcessModal(false)}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-sm" 
                  disabled={processing} 
                  onClick={() => setSubmitStatus('rejected')} 
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
                >
                  Reject
                </button>
                <button 
                  type="submit" 
                  className="btn btn-sm" 
                  disabled={processing} 
                  onClick={() => setSubmitStatus('processed')} 
                  style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}
                >
                  Mark Processed
                </button>
                <button 
                  type="submit" 
                  className="btn btn-sm" 
                  disabled={processing} 
                  onClick={() => setSubmitStatus('approved')} 
                  style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                >
                  Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </>
  )
}