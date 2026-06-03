import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, CheckCircle, XCircle, Phone, FolderOpen, UserCheck } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import { userProfilesApi } from '../../api/services'

interface UserRow {
  id: string
  full_name: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  is_active: boolean
  last_login: string | null
  created_at: string | null
  role: string
  files_created: number
  customers_created: number
  expenses_count: number
}

interface Props {
  roleType: 'staff' | 'accountant'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

function fmtLastLogin(iso: string | null) {
  if (!iso) return 'Never'
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export default function UserListPage({ roleType }: Props) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const detailBase = roleType === 'staff' ? '/settings/staff' : '/settings/accountants'
  const title = roleType === 'staff' ? 'Staff Members' : 'Accountants'
  const subtitle = roleType === 'staff'
    ? 'All staff users with their activity summary'
    : 'All accountant users with their activity summary'

  useEffect(() => {
    load()
  }, [roleType])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await userProfilesApi.list(roleType)
      setUsers(res.data || [])
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number.includes(search)
  )

  const activeCount = users.filter(u => u.is_active).length

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
      />

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: users.length, color: '#6366f1' },
          { label: 'Active', value: activeCount, color: '#22c55e' },
          { label: 'Inactive', value: users.length - activeCount, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: 'relative', maxWidth: 380 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          className="pay-filter-input"
          style={{ paddingLeft: 36 }}
          placeholder={`Search ${title.toLowerCase()}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="data-card">
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--gray-400)' }}>
            Loading {title.toLowerCase()}...
          </div>
        ) : error ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--error)' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--gray-400)' }}>
            No {title.toLowerCase()} found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Files</th>
                  <th style={{ textAlign: 'center' }}>Customers</th>
                  {roleType === 'accountant' && <th style={{ textAlign: 'center' }}>Expenses</th>}
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr
                    key={u.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`${detailBase}/${u.id}`)}
                  >
                    <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: roleType === 'staff'
                            ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                            : 'linear-gradient(135deg,#0ea5e9,#6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#fff',
                        }}>
                          {u.first_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '.9rem' }}>
                            {u.full_name || '—'}
                          </div>
                          <div style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '.8rem', color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={11} /> {u.phone_number}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 9px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
                        background: u.is_active ? '#dcfce7' : '#fee2e2',
                        color: u.is_active ? '#166534' : '#991b1b',
                      }}>
                        {u.is_active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontWeight: 700, color: '#6366f1', fontSize: '.9rem',
                      }}>
                        <FolderOpen size={13} color="#6366f1" />
                        {u.files_created}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0ea5e9', fontSize: '.9rem', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <UserCheck size={13} color="#0ea5e9" />
                        {u.customers_created}
                      </span>
                    </td>
                    {roleType === 'accountant' && (
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#f59e0b', fontSize: '.9rem' }}>
                        {u.expenses_count}
                      </td>
                    )}
                    <td style={{ fontSize: '.82rem', color: 'var(--gray-500)' }}>{fmtDate(u.created_at)}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--gray-500)' }}>{fmtLastLogin(u.last_login)}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px' }}
                        onClick={e => { e.stopPropagation(); navigate(`${detailBase}/${u.id}`) }}
                      >
                        View <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
