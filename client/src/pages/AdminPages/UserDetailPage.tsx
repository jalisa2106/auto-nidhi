import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, Calendar, Clock,
  FolderOpen, Users, IndianRupee, ShieldCheck, Car,
  Receipt, TrendingUp, TrendingDown, Wallet, CreditCard,
  CheckCircle, XCircle, Pencil, X,
} from 'lucide-react'
import { message } from 'antd'
import { userProfilesApi } from '../../api/services'
import api from '../../api/axios'

interface UserDetail {
  id: string
  full_name: string
  first_name: string
  email: string
  phone_number: string
  is_active: boolean
  role: string
  last_login: string | null
  joined: string
  files_created: number
  files_by_status: Record<string, number>
  customers_created: number
  payment_in_count: number
  payment_in_total: number
  payment_out_count: number
  payment_out_total: number
  insurance_count: number
  insurance_total: number
  rto_count: number
  rto_total: number
  loans_count: number
  loans_total: number
  expenses_count: number
  expenses_total: number
  advances_count: number
  advances_total: number
  recent_files: {
    id: string
    file_number: string
    customer: string
    status: string
    file_type: string
    created_at: string
  }[]
}

function fmtINR(n: number) {
  if (!n) return '₹0'
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function fmtLastLogin(iso: string | null) {
  if (!iso) return 'Never logged in'
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    draft:    { bg: '#f1f5f9', color: '#64748b' },
    active:   { bg: '#dcfce7', color: '#166534' },
    closed:   { bg: '#fee2e2', color: '#991b1b' },
    approved: { bg: '#dbeafe', color: '#1e40af' },
  }
  const style = map[status?.toLowerCase()] || { bg: '#f1f5f9', color: '#64748b' }
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
      background: style.bg, color: style.color,
    }}>
      {status || '—'}
    </span>
  )
}

function KPICard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
      padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: '.8rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '.78rem', color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone_number: '', is_active: true })
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    load()
  }, [id])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await userProfilesApi.detail(id!)
      setUser(data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  function openEdit() {
    if (!user) return
    setEditForm({
      first_name: user.first_name || '',
      last_name: (user as any).last_name || '',
      phone_number: user.phone_number || '',
      is_active: user.is_active,
    })
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!id) return
    setEditSaving(true)
    try {
      await api.put(`/api/v1/settings/users/${id}`, editForm)
      message.success('User details updated')
      setShowEdit(false)
      load()
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to update user')
    } finally {
      setEditSaving(false)
    }
  }

  const normalizedRole = user?.role?.toLowerCase()
  const backPath = normalizedRole === 'data_entry' ? '/settings/staff' : '/settings/accountants'
  const roleLabel = normalizedRole === 'data_entry' ? 'Staff' : normalizedRole === 'accountant' ? 'Accountant' : 'User'

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>
        Loading user details...
      </div>
    )
  }

  if (error || !user) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#ef4444' }}>
        {error || 'User not found'}
      </div>
    )
  }

  const initials = (user.first_name?.[0] || '?').toUpperCase()
  const avatarBg = user.role === 'data_entry'
    ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
    : 'linear-gradient(135deg,#0ea5e9,#6366f1)'

  return (
    <div>
      {/* ── Back Button + Edit ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => navigate(backPath)}
        >
          <ArrowLeft size={15} /> Back to {roleLabel}s
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={openEdit}
        >
          <Pencil size={13} /> Edit Details
        </button>
      </div>

      {/* ── Profile Header ── */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
        padding: '28px 32px', marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
        display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap',
      }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {user.full_name || '—'}
            </h2>
            <span style={{
              padding: '3px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
              background: user.role === 'data_entry' ? '#ede9fe' : '#dbeafe',
              color: user.role === 'data_entry' ? '#5b21b6' : '#1e40af',
            }}>
              {roleLabel}
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
              background: user.is_active ? '#dcfce7' : '#fee2e2',
              color: user.is_active ? '#166534' : '#991b1b',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              {user.is_active ? <CheckCircle size={11} /> : <XCircle size={11} />}
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem', color: '#64748b' }}>
              <Mail size={14} /> {user.email}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem', color: '#64748b' }}>
              <Phone size={14} /> {user.phone_number}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem', color: '#64748b' }}>
              <Calendar size={14} /> Joined: {user.joined}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem', color: '#64748b' }}>
              <Clock size={14} /> Last login: {fmtLastLogin(user.last_login)}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        <KPICard
          icon={<FolderOpen size={18} />}
          label="Files Created"
          value={user.files_created}
          sub={Object.entries(user.files_by_status || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'No files'}
          color="#6366f1"
        />
        <KPICard
          icon={<Users size={18} />}
          label="Customers Added"
          value={user.customers_created}
          color="#0ea5e9"
        />
        <KPICard
          icon={<TrendingUp size={18} />}
          label="Payment IN"
          value={fmtINR(user.payment_in_total)}
          sub={`${user.payment_in_count} transaction${user.payment_in_count !== 1 ? 's' : ''}`}
          color="#22c55e"
        />
        <KPICard
          icon={<TrendingDown size={18} />}
          label="Payment OUT"
          value={fmtINR(user.payment_out_total)}
          sub={`${user.payment_out_count} transaction${user.payment_out_count !== 1 ? 's' : ''}`}
          color="#f43f5e"
        />
        <KPICard
          icon={<CreditCard size={18} />}
          label="Loans"
          value={fmtINR(user.loans_total)}
          sub={`${user.loans_count} loan${user.loans_count !== 1 ? 's' : ''}`}
          color="#8b5cf6"
        />
        <KPICard
          icon={<ShieldCheck size={18} />}
          label="Insurance"
          value={fmtINR(user.insurance_total)}
          sub={`${user.insurance_count} payment${user.insurance_count !== 1 ? 's' : ''}`}
          color="#06b6d4"
        />
        <KPICard
          icon={<Car size={18} />}
          label="RTO Payments"
          value={fmtINR(user.rto_total)}
          sub={`${user.rto_count} payment${user.rto_count !== 1 ? 's' : ''}`}
          color="#f59e0b"
        />
        <KPICard
          icon={<Wallet size={18} />}
          label="Expenses"
          value={fmtINR(user.expenses_total)}
          sub={`${user.expenses_count} expense${user.expenses_count !== 1 ? 's' : ''}`}
          color="#ec4899"
        />
        <KPICard
          icon={<IndianRupee size={18} />}
          label="Advances"
          value={fmtINR(user.advances_total)}
          sub={`${user.advances_count} advance${user.advances_count !== 1 ? 's' : ''}`}
          color="#14b8a6"
        />
        <KPICard
          icon={<Receipt size={18} />}
          label="Net Flow"
          value={fmtINR(user.payment_in_total - user.payment_out_total)}
          sub={user.payment_in_total >= user.payment_out_total ? 'Positive' : 'Negative'}
          color={user.payment_in_total >= user.payment_out_total ? '#22c55e' : '#ef4444'}
        />
      </div>

      {/* ── Recent Files ── */}
      <div className="data-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderOpen size={16} color="#6366f1" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Recent Files Created</h3>
          <span style={{
            marginLeft: 'auto', fontSize: '.75rem', color: '#6366f1', fontWeight: 700,
            background: '#ede9fe', padding: '2px 8px', borderRadius: 99,
          }}>Last 5</span>
        </div>
        {user.recent_files.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
            No files created yet
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>File No.</th>
                  <th>Customer</th>
                  <th>File Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {user.recent_files.map(f => (
                  <tr key={f.id}>
                    <td><span className="db-file-id">{f.file_number}</span></td>
                    <td style={{ fontWeight: 500, color: '#334155' }}>{f.customer}</td>
                    <td style={{ fontSize: '.84rem', color: '#64748b' }}>{f.file_type || '—'}</td>
                    <td>{statusBadge(f.status)}</td>
                    <td style={{ fontSize: '.82rem', color: '#94a3b8' }}>{f.created_at}</td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Details Modal ── */}
      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-grid-2">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    className="form-input"
                    value={editForm.first_name}
                    onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    className="form-input"
                    value={editForm.last_name}
                    onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
                <div className="form-group modal-full">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-input"
                    value={editForm.phone_number}
                    onChange={e => setEditForm(p => ({ ...p, phone_number: e.target.value }))}
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div className="form-group modal-full" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="checkbox"
                    id="edit-user-active"
                    checked={editForm.is_active}
                    onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--brand-600)', cursor: 'pointer' }}
                  />
                  <label htmlFor="edit-user-active" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--gray-700)', fontSize: '.88rem' }}>
                    Account is Active
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={editSaving} onClick={saveEdit}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
