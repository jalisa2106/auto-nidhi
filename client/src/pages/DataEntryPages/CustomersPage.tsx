import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import api from '../../api/axios'
import PageHeader from '../../components/app/PageHeader'

// ── Types ────────────────────────────────────────────────────────────────────
interface Customer {
  id: string
  full_name: string
  mobile_1: string
  mobile_2: string
  email: string
  city: string
  state: string
  customer_type: string
  created_at: string
  active_files_count: number
}

type TabFilter = 'all' | 'individual' | 'business'

const ROWS_PER_PAGE = 10

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function TypeBadge({ type }: { type: string }) {
  const isIndividual = type === 'individual'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: isIndividual ? '#eff6ff' : '#f5f3ff',
      color: isIndividual ? '#1d4ed8' : '#6d28d9',
      padding: '3px 10px', borderRadius: 99, fontSize: '.71rem', fontWeight: 700,
      textTransform: 'capitalize',
    }}>
      {type || '—'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const navigate = useNavigate()

  const [allRows, setAllRows]   = useState<Customer[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tab, setTab]           = useState<TabFilter>('all')
  const [page, setPage]         = useState(1)

  // ── Debounce search (300ms) ─────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  // ── Reset to page 1 when tab changes ────────────────────────────────────
  useEffect(() => { setPage(1) }, [tab])

  // ── Fetch customers ─────────────────────────────────────────────────────
  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number> = { page: 1, limit: 10000 }
      if (debouncedSearch) params.search = debouncedSearch
      if (tab !== 'all') params.customer_type = tab

      const res = await api.get('/customers/', { params })
      const data = Array.isArray(res.data) ? res.data : []
      setAllRows(data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, tab])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  // ── Client-side pagination ──────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(allRows.length / ROWS_PER_PAGE))
  const paged = allRows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  // ── Tab styles ──────────────────────────────────────────────────────────
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? '#2563eb' : '#64748b',
    background: active ? '#eff6ff' : 'transparent',
    border: active ? '1px solid #bfdbfe' : '1px solid transparent',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all .15s',
  })

  // ── Column headers ─────────────────────────────────────────────────────
  const columns = ['#', 'Name', 'Mobile', 'City / State', 'Type', 'Active Files', 'Member Since']

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Page header ── */}
      <PageHeader title="My Customers" subtitle="Customers assigned to your files" />

      {/* ── Filters row ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180, maxWidth: 300 }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="form-input"
            placeholder="Search by name, mobile, city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, height: 36 }}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={tabStyle(tab === 'all')} onClick={() => setTab('all')}>All</button>
          <button style={tabStyle(tab === 'individual')} onClick={() => setTab('individual')}>Individual</button>
          <button style={tabStyle(tab === 'business')} onClick={() => setTab('business')}>Business</button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 14px', color: '#be123c', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {columns.map(h => (
                <th key={h} style={{
                  padding: '11px 14px', textAlign: 'left',
                  fontSize: '.71rem', fontWeight: 700, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Loading customers…
                </td>
              </tr>
            )}
            {!loading && allRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Users size={32} color="#cbd5e1" />
                    <div style={{ color: '#64748b', fontWeight: 600, fontSize: 14 }}>
                      No customers assigned to you yet.
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {!loading && paged.map((c, i) => (
              <tr
                key={c.id}
                style={{
                  borderBottom: i < paged.length - 1 ? '1px solid #f1f5f9' : 'none',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* # */}
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '.8rem', color: '#94a3b8', fontWeight: 600 }}>
                    {(page - 1) * ROWS_PER_PAGE + i + 1}
                  </span>
                </td>

                {/* Name (clickable) */}
                <td style={{ padding: '11px 14px' }}>
                  <span
                    style={{
                      fontWeight: 600, fontSize: '.84rem', color: '#2563eb',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/staff/customers/${c.id}`)}
                    title="View customer"
                  >
                    {c.full_name || '—'}
                  </span>
                </td>

                {/* Mobile */}
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '.84rem', color: '#1e293b' }}>
                    {c.mobile_1 || '—'}
                  </span>
                  {c.mobile_2 && (
                    <span style={{ fontSize: '.75rem', color: '#94a3b8', marginLeft: 6 }}>
                      / {c.mobile_2}
                    </span>
                  )}
                </td>

                {/* City / State */}
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '.84rem', color: '#475569' }}>
                    {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                  </span>
                </td>

                {/* Type badge */}
                <td style={{ padding: '11px 14px' }}>
                  <TypeBadge type={c.customer_type} />
                </td>

                {/* Active Files */}
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '.84rem', fontWeight: 600, color: '#0f172a' }}>
                    {c.active_files_count ?? 0}
                  </span>
                </td>

                {/* Member Since */}
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>
                    {fmtDate(c.created_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Pagination footer ── */}
        {!loading && allRows.length > 0 && (
          <div style={{
            padding: '10px 14px', borderTop: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, color: '#64748b',
          }}>
            <span>
              Showing {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, allRows.length)} of {allRows.length} customer{allRows.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 60, textAlign: 'center' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
