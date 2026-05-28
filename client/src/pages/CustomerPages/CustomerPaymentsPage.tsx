import { useEffect, useState, useMemo } from 'react'
import { CreditCard, Search, FileText, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import api from '../../api/axios'

// ── Types mapping to database columns ────────────────────────────────────────

interface CustomerPayment {
  file_number: string // joins file_record.file_number
  file_type: string // joins file_record.file_type
  payment_amount: number // maps to payment_in.payment_amount
  paid_amount: number // maps to payment_in.paid_amount
  remaining_amount: number // maps to payment_in.remaining_amount
  payment_mode: string // maps to payment_in.payment_mode
  payment_date: string // maps to payment_in.payment_date (YYYY-MM-DD)
  remarks: string | null // maps to payment_in.remarks
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

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'outstanding' | 'settled'>('all')

  // Pagination states
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  useEffect(() => {
    api.get('/portal/payments')
      .then(res => {
        setPayments(res.data || [])
      })
      .catch(() => {
        setPayments([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Filter & Search logic
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const isSettled = p.remaining_amount <= 0
      const matchesSearch = 
        p.file_number.toLowerCase().includes(search.toLowerCase()) ||
        p.payment_mode.toLowerCase().includes(search.toLowerCase()) ||
        (p.remarks || '').toLowerCase().includes(search.toLowerCase())
      
      const matchesStatus = 
        paymentFilter === 'all' || 
        (paymentFilter === 'outstanding' && !isSettled) || 
        (paymentFilter === 'settled' && isSettled)

      return matchesSearch && matchesStatus
    })
  }, [payments, search, paymentFilter])

  // Paginated Rows
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => {
    return filteredPayments.slice((safePage - 1) * pageSize, safePage * pageSize)
  }, [filteredPayments, safePage, pageSize])

  // Key visual metrics calculated dynamically
  const metrics = useMemo(() => {
    let totalPaid = 0
    let totalOutstanding = 0
    let transactionsCount = payments.length

    payments.forEach(p => {
      totalPaid += p.paid_amount
      totalOutstanding += p.remaining_amount
    })

    return { totalPaid, totalOutstanding, transactionsCount }
  }, [payments])

  return (
    <>
      <PageHeader
        title="Payment Status"
        subtitle="Track all payments made for your files, ledger details, and outstanding balances"
      />

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
          Loading your payment history…
        </div>
      ) : (
        <>
          {/* ── Key Metrics Cards ── */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="data-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  ₹{metrics.totalPaid.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>Total Settled</div>
              </div>
            </div>

            <div className="data-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: metrics.totalOutstanding > 0 ? '#fffbeb' : '#f0fdf4', color: metrics.totalOutstanding > 0 ? '#d97706' : '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  ₹{metrics.totalOutstanding.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>Outstanding Balance</div>
              </div>
            </div>

            <div className="data-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                  {metrics.transactionsCount}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>Payment Transactions</div>
              </div>
            </div>
          </div>

          {/* ── Search & Filter Panel ── */}
          <div className="data-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', minWidth: 260, flex: 1 }}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by File No., mode, or remarks…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, width: '100%', color: 'var(--gray-800)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'outstanding', 'settled'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setPaymentFilter(tab); setPage(1) }}
                  className={`btn btn-sm ${paymentFilter === tab ? 'btn-primary' : 'btn-outline'}`}
                  style={{ textTransform: 'capitalize', fontSize: 12 }}
                >
                  {tab === 'all' ? 'All Transactions' : tab === 'outstanding' ? 'Outstanding Only' : 'Fully Settled'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Payments Ledger Table ── */}
          <div className="data-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {filteredPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                <CreditCard size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
                <h4 style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#1e293b' }}>No payments match criteria</h4>
                <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your search terms or filters.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>File & Vehicle info</th>
                        <th>Payment Date</th>
                        <th>Invoice amount</th>
                        <th>Amount Paid</th>
                        <th>Remaining balance</th>
                        <th>Payment Mode</th>
                        <th>remarks / ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((p, idx) => {
                        const isSettled = p.remaining_amount <= 0
                        return (
                          <tr key={`${p.file_number}-${idx}`} style={{ transition: 'background-color 0.15s' }}>
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
                              <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                                {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#64748b' }}>
                                ₹{p.payment_amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 800, color: '#15803d' }}>
                                ₹{p.paid_amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td>
                              {isSettled ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: '#f0fdf4', color: '#15803d',
                                  padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700
                                }}>
                                  <CheckCircle2 size={11} /> Settled
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: '#fef2f2', color: '#b91c1c',
                                  padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700
                                }}>
                                  ₹{p.remaining_amount.toLocaleString('en-IN')}
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-block',
                                background: 'var(--brand-50)', color: 'var(--brand-700)',
                                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                textTransform: 'capitalize'
                              }}>
                                {p.payment_mode.replace('_', ' ')}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, color: '#64748b', maxWidth: 280, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {p.remarks || '—'}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination bar aligned at the bottom of the card */}
                <Pagination
                  total={filteredPayments.length}
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
