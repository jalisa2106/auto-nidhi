import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, User,
  FolderOpen, TrendingUp, TrendingDown, ShieldCheck,
  Car, CreditCard, IndianRupee, Receipt, BadgeCheck, Clock,
  AlertTriangle, CheckCircle2, Eye, UserCheck, RefreshCw,
} from 'lucide-react'
import { customerProfileApi, customersApi } from '../../api/services'
import api from '../../api/axios'

interface CustomerDetail {
  id: string
  full_name: string
  email: string
  mobile_1: string
  mobile_2: string | null
  address: string
  city: string
  state: string
  pincode: string
  date_of_birth: string | null
  aadhar_number: string
  pan_number: string
  customer_type: string
  created_at: string | null
  added_by: string | null
  last_login: string | null  // from linked system_user account
  // Activity
  files_total: number
  files_by_status: Record<string, number>
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
  recent_files: {
    id: string
    file_number: string
    file_type: string
    status: string
    created_at: string
  }[]
}

function fmtINR(n: number) {
  if (!n) return '₹0'
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
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

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userRole = (localStorage.getItem('user_role') || '').toLowerCase().replace(' ', '_')
  const isAdminUser = userRole === 'admin'
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingType, setEditingType] = useState(false)
  const [savingType, setSavingType] = useState(false)
  const [pendingType, setPendingType] = useState<'individual' | 'business'>('individual')

  // Assigned staff states (admin only)
  const [assignedStaff, setAssignedStaff] = useState<{ id: string; name: string; email: string } | null>(null)
  const [staffList, setStaffList] = useState<{ id: string; name: string; email: string }[]>([])
  const [assigningStaff, setAssigningStaff] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)

  // Document verification states
  const [documents, setDocuments] = useState<any[]>([])
  const [rejectionModalDoc, setRejectionModalDoc] = useState<any | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processingDocId, setProcessingDocId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    load()
    if (isAdminUser) loadStaffData()
  }, [id])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await customerProfileApi.detail(id!)
      setCustomer(data)
      try {
        const docs = await customerProfileApi.listDocuments(id!)
        setDocuments(docs)
      } catch (err) {
        console.error('Failed to load documents', err)
      }
      // Load assigned staff for this customer
      if (isAdminUser) {
        try {
          const res = await api.get(`/customers/${id}/assigned-staff`)
          if (res.data?.staff_id) {
            setAssignedStaff({ id: res.data.staff_id, name: res.data.staff_name, email: res.data.staff_email || '' })
            setSelectedStaffId(res.data.staff_id)
          }
        } catch { /* no assignment yet */ }
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load customer details')
    } finally {
      setLoading(false)
    }
  }

  async function loadStaffData() {
    try {
      // /service-requests/consultants lists active data_entry/staff users
      const res = await api.get('/service-requests/consultants')
      const users = Array.isArray(res.data) ? res.data : []
      setStaffList(users.map((u: any) => ({
        id: u.id,
        name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        email: u.email || ''
      })))
    } catch { /* silent */ }
  }

  async function handleAssignStaff() {
    if (!selectedStaffId || !id) return
    setAssigningStaff(true)
    try {
      await api.post(`/customers/${id}/assign-staff`, { staff_id: selectedStaffId })
      const found = staffList.find(s => s.id === selectedStaffId)
      if (found) setAssignedStaff(found)
      setShowAssignDropdown(false)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to assign staff')
    } finally {
      setAssigningStaff(false)
    }
  }

  const handleTypeChange = async () => {
    if (!id || !customer) return
    setSavingType(true)
    try {
      await customersApi.update(id, { customer_type: pendingType })
      setCustomer(prev => prev ? { ...prev, customer_type: pendingType } : prev)
      setEditingType(false)
    } catch (e) {
      console.error('Failed to update customer type', e)
      alert('Failed to update customer type. Please try again.')
    } finally {
      setSavingType(false)
    }
  }

  const handleVerifyDoc = async (docId: string) => {
    if (!id) return
    setProcessingDocId(docId)
    try {
      await customerProfileApi.updateDocumentStatus(id, docId, 'verified')
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'verified', rejection_reason: null } : d))
    } catch (err) {
      console.error('Failed to verify document', err)
      alert('Failed to verify document')
    } finally {
      setProcessingDocId(null)
    }
  }

  const handleRejectDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !rejectionModalDoc || !rejectionReason.trim()) return
    setProcessingDocId(rejectionModalDoc.id)
    try {
      await customerProfileApi.updateDocumentStatus(id, rejectionModalDoc.id, 'rejected', rejectionReason)
      setDocuments(prev => prev.map(d => d.id === rejectionModalDoc.id ? { ...d, status: 'rejected', rejection_reason: rejectionReason } : d))
      setRejectionModalDoc(null)
      setRejectionReason('')
    } catch (err) {
      console.error('Failed to reject document', err)
      alert('Failed to reject document')
    } finally {
      setProcessingDocId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>
        Loading customer profile...
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#ef4444' }}>
        {error || 'Customer not found'}
      </div>
    )
  }

  const initials = customer.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Fix: DB enum uses 'business' not 'company'
  const typeLabel = customer.customer_type === 'business' ? 'Business' : 'Individual'
  const typeColor = customer.customer_type === 'business'
    ? { bg: '#dbeafe', color: '#1e40af' }
    : { bg: '#fef9c3', color: '#854d0e' }

  return (
    <div>
      {/* ── Back Button ── */}
      <button
        className="btn btn-outline btn-sm"
        style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={() => {
          const userRole = localStorage.getItem('user_role') || 'guest'
          const isStaff = userRole.toLowerCase().replace(" ", "_") === 'data_entry' || userRole.toLowerCase() === 'staff'
          navigate(isStaff ? '/staff/customers' : '/customers')
        }}
      >
        <ArrowLeft size={15} /> Back to Customers
      </button>

      {/* ── Profile Header ── */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
        padding: '28px 32px', marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
        display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap',
      }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 800, color: '#fff',
        }}>
          {initials || <User size={28} />}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {customer.full_name}
            </h2>
            {/* Customer Type — editable toggle */}
            {editingType ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <select
                  value={pendingType}
                  onChange={e => setPendingType(e.target.value as 'individual' | 'business')}
                  style={{
                    fontSize: '.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    border: '1px solid #cbd5e1', outline: 'none', background: '#fff'
                  }}
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
                <button
                  onClick={handleTypeChange}
                  disabled={savingType}
                  style={{
                    fontSize: '.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  {savingType ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingType(false)}
                  disabled={savingType}
                  style={{
                    fontSize: '.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
                  background: typeColor.bg, color: typeColor.color,
                }}>
                  {typeLabel}
                </span>
                <button
                  onClick={() => { setPendingType(customer.customer_type as 'individual' | 'business'); setEditingType(true) }}
                  title="Change customer type"
                  style={{
                    fontSize: '.7rem', color: '#6366f1', fontWeight: 600,
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                    textDecoration: 'underline', textUnderlineOffset: 2
                  }}
                >
                  Change
                </button>
              </div>
            )}
            <span style={{
              padding: '3px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
              background: '#dcfce7', color: '#166534',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <BadgeCheck size={11} /> Customer
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem', color: '#64748b' }}>
              <Mail size={14} /> {customer.email}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem', color: '#64748b' }}>
              <Phone size={14} /> {customer.mobile_1}
              {customer.mobile_2 && <span style={{ color: '#94a3b8' }}>· {customer.mobile_2}</span>}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem', color: '#64748b' }}>
              <MapPin size={14} /> {[customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || '—'}
            </span>
            {customer.date_of_birth && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem', color: '#64748b' }}>
                <Calendar size={14} /> DOB: {fmtDate(customer.date_of_birth)}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.84rem', color: '#64748b' }}>
              <Clock size={14} /> Last login: {fmtLastLogin(customer.last_login)}
            </span>
          </div>

          {/* KYC row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginTop: 12 }}>
            <span style={{ fontSize: '.8rem', color: '#64748b' }}>
              <strong style={{ color: '#334155' }}>Aadhar:</strong> {customer.aadhar_number}
            </span>
            {customer.pan_number && customer.pan_number !== '—' && (
              <span style={{ fontSize: '.8rem', color: '#64748b' }}>
                <strong style={{ color: '#334155' }}>PAN:</strong> {customer.pan_number}
              </span>
            )}
            <span style={{ fontSize: '.8rem', color: '#64748b' }}>
              <strong style={{ color: '#334155' }}>Added:</strong> {fmtDate(customer.created_at)}
              {customer.added_by && <span> by {customer.added_by}</span>}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        <KPICard
          icon={<FolderOpen size={18} />}
          label="Total Files"
          value={customer.files_total}
          sub={Object.entries(customer.files_by_status || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'No files yet'}
          color="#6366f1"
        />
        <KPICard
          icon={<TrendingUp size={18} />}
          label="Payment IN"
          value={fmtINR(customer.payment_in_total)}
          sub={`${customer.payment_in_count} transaction${customer.payment_in_count !== 1 ? 's' : ''}`}
          color="#22c55e"
        />
        <KPICard
          icon={<TrendingDown size={18} />}
          label="Payment OUT"
          value={fmtINR(customer.payment_out_total)}
          sub={`${customer.payment_out_count} transaction${customer.payment_out_count !== 1 ? 's' : ''}`}
          color="#f43f5e"
        />
        <KPICard
          icon={<CreditCard size={18} />}
          label="Loans"
          value={fmtINR(customer.loans_total)}
          sub={`${customer.loans_count} loan${customer.loans_count !== 1 ? 's' : ''}`}
          color="#8b5cf6"
        />
        <KPICard
          icon={<ShieldCheck size={18} />}
          label="Insurance"
          value={fmtINR(customer.insurance_total)}
          sub={`${customer.insurance_count} payment${customer.insurance_count !== 1 ? 's' : ''}`}
          color="#06b6d4"
        />
        <KPICard
          icon={<Car size={18} />}
          label="RTO Payments"
          value={fmtINR(customer.rto_total)}
          sub={`${customer.rto_count} payment${customer.rto_count !== 1 ? 's' : ''}`}
          color="#f59e0b"
        />
        <KPICard
          icon={<Receipt size={18} />}
          label="Net Flow"
          value={fmtINR(customer.payment_in_total - customer.payment_out_total)}
          sub={customer.payment_in_total >= customer.payment_out_total ? 'Positive' : 'Negative'}
          color={customer.payment_in_total >= customer.payment_out_total ? '#22c55e' : '#ef4444'}
        />
        <KPICard
          icon={<IndianRupee size={18} />}
          label="Total Invested"
          value={fmtINR(customer.payment_in_total + customer.insurance_total + customer.rto_total)}
          sub="IN + Insurance + RTO"
          color="#14b8a6"
        />
      </div>

      {/* ── Address Card ── */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
        padding: '20px 24px', marginBottom: 24,
        boxShadow: '0 1px 4px rgba(0,0,0,.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MapPin size={16} color="#f59e0b" />
          <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700, color: '#0f172a' }}>Address Details</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px 24px' }}>
          {[
            { label: 'Full Address', value: customer.address },
            { label: 'City', value: customer.city },
            { label: 'State', value: customer.state },
            { label: 'Pincode', value: customer.pincode },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '.75rem', color: '#94a3b8', fontWeight: 500, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: '.9rem', color: '#334155', fontWeight: 500 }}>{value || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Files ── */}
      <div className="data-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderOpen size={16} color="#6366f1" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Recent Files</h3>
          <span style={{
            marginLeft: 'auto', fontSize: '.75rem', color: '#6366f1', fontWeight: 700,
            background: '#ede9fe', padding: '2px 8px', borderRadius: 99,
          }}>Last 5</span>
        </div>
        {customer.recent_files.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
            No files yet
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>File No.</th>
                  <th>File Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {customer.recent_files.map(f => (
                  <tr key={f.id}>
                    <td><span className="db-file-id">{f.file_number}</span></td>
                    <td style={{ fontSize: '.84rem', color: '#64748b' }}>{f.file_type}</td>
                    <td>{statusBadge(f.status)}</td>
                    <td style={{ fontSize: '.82rem', color: '#94a3b8' }}>{f.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Assigned Staff Section (admin only) ── */}
      {isAdminUser && (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
          padding: '20px 24px', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={16} color="#6366f1" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Assigned Staff</h3>
            </div>
            <button
              onClick={() => setShowAssignDropdown(v => !v)}
              style={{
                fontSize: '.78rem', fontWeight: 600, padding: '5px 12px',
                borderRadius: 8, border: '1px solid #cbd5e1',
                background: showAssignDropdown ? '#6366f1' : '#fff',
                color: showAssignDropdown ? '#fff' : '#475569', cursor: 'pointer'
              }}
            >
              {showAssignDropdown ? 'Cancel' : assignedStaff ? 'Change Staff' : 'Assign Staff'}
            </button>
          </div>

          {assignedStaff && !showAssignDropdown ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0
              }}>
                {assignedStaff.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '.92rem' }}>{assignedStaff.name}</div>
                {assignedStaff.email && <div style={{ fontSize: '.78rem', color: '#64748b' }}>{assignedStaff.email}</div>}
                <div style={{ fontSize: '.72rem', color: '#22c55e', fontWeight: 600, marginTop: 2 }}>● Active Assignment</div>
              </div>
            </div>
          ) : !showAssignDropdown ? (
            <div style={{ color: '#94a3b8', fontSize: '.85rem', fontStyle: 'italic' }}>No staff assigned yet. Click "Assign Staff" to assign.</div>
          ) : null}

          {showAssignDropdown && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedStaffId}
                onChange={e => setSelectedStaffId(e.target.value)}
                style={{
                  flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #cbd5e1', fontSize: '.85rem', outline: 'none'
                }}
              >
                <option value="">— Select Staff Member —</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.email ? ` (${s.email})` : ''}</option>
                ))}
              </select>
              <button
                onClick={handleAssignStaff}
                disabled={!selectedStaffId || assigningStaff}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: '#6366f1', color: '#fff', fontWeight: 700,
                  cursor: selectedStaffId ? 'pointer' : 'not-allowed',
                  opacity: selectedStaffId ? 1 : 0.6, fontSize: '.85rem',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                {assigningStaff ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={13} />}
                {assigningStaff ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Documents Section ── */}
      <div className="data-card" style={{ marginTop: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={16} color="#059669" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Customer Documents</h3>
        </div>
        <div style={{ padding: 20 }}>
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              No documents slot initialized.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {documents.map((doc) => {
                const isUploaded = doc.status !== 'missing';
                
                // badge status styling
                let statusBg = '#f1f5f9';
                let statusColor = '#64748b';
                let statusIcon = <Clock size={14} />;
                if (doc.status === 'verified') {
                  statusBg = '#dcfce7';
                  statusColor = '#15803d';
                  statusIcon = <CheckCircle2 size={14} />;
                } else if (doc.status === 'rejected') {
                  statusBg = '#fee2e2';
                  statusColor = '#991b1b';
                  statusIcon = <AlertTriangle size={14} />;
                } else if (doc.status === 'pending_review') {
                  statusBg = '#fef3c7';
                  statusColor = '#d97706';
                  statusIcon = <Clock size={14} />;
                }

                return (
                  <div key={doc.id} style={{
                    border: '1px solid #e2e8f0', borderRadius: 12, padding: 16,
                    background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'box-shadow 0.2s',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, width: '100%' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700,
                        background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b',
                        textTransform: 'uppercase'
                      }}>
                        {doc.category}
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: statusBg, color: statusColor, padding: '3px 9px', borderRadius: 99,
                        fontSize: '.72rem', fontWeight: 700
                      }}>
                        {statusIcon}
                        {doc.status === 'pending_review' ? 'Pending Review' : doc.status}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px 0', fontSize: '.9rem', fontWeight: 700, color: '#1e293b' }}>
                      {doc.label}
                    </h4>
                    {doc.file_name ? (
                      <div style={{ fontSize: '.78rem', color: '#64748b', wordBreak: 'break-all', marginBottom: 12 }}>
                        📄 {doc.file_name} ({Math.round((doc.file_size || 0) / 1024)} KB)
                      </div>
                    ) : (
                      <div style={{ fontSize: '.78rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: 12 }}>
                        No file uploaded
                      </div>
                    )}

                    {doc.status === 'rejected' && doc.rejection_reason && (
                      <div style={{
                        background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: 8,
                        padding: '8px 10px', fontSize: '.75rem', color: '#991b1b', marginBottom: 12
                      }}>
                        <strong>Rejection Reason:</strong> {doc.rejection_reason}
                      </div>
                    )}

                    {isUploaded && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                        <a
                          href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/portal/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-xs"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.72rem', padding: '4px 8px' }}
                        >
                          <Eye size={12} /> View / Download
                        </a>

                        {doc.status === 'pending_review' && (
                          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                            <button
                              disabled={processingDocId === doc.id}
                              onClick={() => handleVerifyDoc(doc.id)}
                              className="btn btn-xs"
                              style={{
                                background: '#10b981', color: '#fff', border: 'none',
                                display: 'flex', alignItems: 'center', gap: 3, fontSize: '.72rem', padding: '4px 8px'
                              }}
                            >
                              Verify
                            </button>
                            <button
                              disabled={processingDocId === doc.id}
                              onClick={() => setRejectionModalDoc(doc)}
                              className="btn btn-xs"
                              style={{
                                background: '#ef4444', color: '#fff', border: 'none',
                                display: 'flex', alignItems: 'center', gap: 3, fontSize: '.72rem', padding: '4px 8px'
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Document Rejection Modal ── */}
      {rejectionModalDoc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden', border: '1px solid #e2e8f0'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Reject Document
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '.84rem', color: '#64748b' }}>
                {rejectionModalDoc.label}
              </p>
            </div>
            <form onSubmit={handleRejectDocSubmit}>
              <div style={{ padding: 24 }}>
                <label style={{ display: 'block', fontSize: '.84rem', fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                  Reason for Rejection
                </label>
                <textarea
                  required
                  placeholder="Explain why this document is being rejected (e.g. Blurry image, expired card...)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{
                    width: '100%', height: 100, padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #cbd5e1', fontSize: '.875rem', outline: 'none', resize: 'none'
                  }}
                />
              </div>
              <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setRejectionModalDoc(null); setRejectionReason('') }}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  style={{ padding: '8px 16px', background: '#ef4444', border: 'none', color: '#fff' }}
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
