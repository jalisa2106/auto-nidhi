import { useEffect, useState, useMemo } from 'react'
import { ShieldCheck, AlertTriangle, Calendar, Search, FileText, IndianRupee, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import api from '../../api/axios'

// ── Types mapping to database columns ────────────────────────────────────────

interface InsurancePolicy {
  file_number: string
  file_type: string
  company_name: string // maps to master_insurance_company.company_name
  policy_number: string // maps to insurance_info.policy_number
  valid_from: string | null // maps to insurance_info.valid_from (YYYY-MM-DD)
  valid_to: string | null // maps to insurance_info.valid_to (YYYY-MM-DD)
  premium_amount: number // maps to insurance_info.premium_amount
  idv_amount: number // maps to insurance_info.idv_amount
}

// ── Pagination Sub-component matching Admin spec ─────────────────────────────
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

export default function CustomerInsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all')

  // Pagination states
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  useEffect(() => {
    // Attempt to load from portal API, fallback to database-structured mock data if not implemented
    api.get('/portal/insurance')
      .then(res => {
        setPolicies(res.data || [])
      })
      .catch((err) => {
        console.error('Failed to load insurance policies', err)
        setPolicies([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Dynamic policy status calculator helper
  const getPolicyStatus = (validToDateStr: string | null) => {
    if (!validToDateStr) {
      return { label: 'No expiry date', color: '#64748b', bg: '#f1f5f9', type: 'expired' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const validTo = new Date(validToDateStr)
    validTo.setHours(0, 0, 0, 0)

    const diffTime = validTo.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { label: 'Expired', color: '#b91c1c', bg: '#fef2f2', type: 'expired' }
    } else if (diffDays <= 30) {
      return { label: `Expiring in ${diffDays}d`, color: '#d97706', bg: '#fffbeb', type: 'expiring' }
    } else {
      return { label: 'Active', color: '#15803d', bg: '#f0fdf4', type: 'active' }
    }
  }

  // Filter & Search logic
  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      const status = getPolicyStatus(p.valid_to).type
      const matchesSearch = 
        p.policy_number.toLowerCase().includes(search.toLowerCase()) ||
        p.company_name.toLowerCase().includes(search.toLowerCase()) ||
        p.file_number.toLowerCase().includes(search.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [policies, search, statusFilter])

  // Paginated Rows
  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => {
    return filteredPolicies.slice((safePage - 1) * pageSize, safePage * pageSize)
  }, [filteredPolicies, safePage, pageSize])

  // Key visual metrics calculated dynamically
  const metrics = useMemo(() => {
    let activeCount = 0
    let expiringCount = 0
    let expiredCount = 0
    let totalPremium = 0

    policies.forEach(p => {
      const status = getPolicyStatus(p.valid_to).type
      if (status === 'active') activeCount++
      if (status === 'expiring') expiringCount++
      if (status === 'expired') expiredCount++
      totalPremium += p.premium_amount
    })

    return { activeCount, expiringCount, expiredCount, totalPremium }
  }, [policies])

  return (
    <>
      <PageHeader
        title="Insurance Details"
        subtitle="Manage and monitor active policies, renewals, and coverage amounts"
      />

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
          Loading your insurance details…
        </div>
      ) : (
        <>
          {/* ── Key Metrics Cards ── */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="data-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  {metrics.activeCount}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>Active Policies</div>
              </div>
            </div>

            <div className="data-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  {metrics.expiringCount}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>Expiring Soon (30d)</div>
              </div>
            </div>

            <div className="data-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  {metrics.expiredCount}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>Expired Policies</div>
              </div>
            </div>

            <div className="data-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IndianRupee size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  ₹{metrics.totalPremium.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>Total Premiums Paid</div>
              </div>
            </div>
          </div>

          {/* ── Search & Filter Panel ── */}
          <div className="data-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', minWidth: 260, flex: 1 }}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by Policy No., Insurer, or File No…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, width: '100%', color: 'var(--gray-800)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'active', 'expiring', 'expired'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setStatusFilter(tab); setPage(1) }}
                  className={`btn btn-sm ${statusFilter === tab ? 'btn-primary' : 'btn-outline'}`}
                  style={{ textTransform: 'capitalize', fontSize: 12 }}
                >
                  {tab === 'all' ? 'All Policies' : tab === 'expiring' ? 'Expiring Soon' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── Policies Ledger Table ── */}
          <div className="data-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {filteredPolicies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                <ShieldCheck size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
                <h4 style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#1e293b' }}>No policies match criteria</h4>
                <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your search terms or status filters.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>File & Vehicle info</th>
                        <th>Insurer & Policy Number</th>
                        <th>Coverage Period</th>
                        <th>IDV amount</th>
                        <th>premium paid</th>
                        <th style={{ textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(p => {
                        const status = getPolicyStatus(p.valid_to)
                        return (
                          <tr key={p.policy_number} style={{ transition: 'background-color 0.15s' }}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={16} color="var(--brand-600)" />
                                <div>
                                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--gray-800)' }}>
                                    {p.file_number}
                                  </span>
                                  <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
                                    {p.file_type.replace('_', ' ')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.company_name}</div>
                              <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                                No: {p.policy_number}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                                {p.valid_from ? new Date(p.valid_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                <span style={{ margin: '0 6px', color: '#94a3b8' }}>➔</span>
                                {p.valid_to ? new Date(p.valid_to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                                ₹{p.idv_amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--brand-700)' }}>
                                ₹{p.premium_amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: status.bg, color: status.color,
                                padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700
                              }}>
                                {status.type === 'expiring' && <AlertTriangle size={12} />}
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination bar aligned at the bottom of the card */}
                <Pagination
                  total={filteredPolicies.length}
                  page={safePage}
                  pageSize={pageSize}
                  onPage={setPage}
                  onPageSize={setPageSize}
                />
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
