import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, User,
  FolderOpen, TrendingUp, TrendingDown, ShieldCheck,
  Car, CreditCard, IndianRupee, Receipt, BadgeCheck,
} from 'lucide-react'
import { customerProfileApi } from '../../api/services'

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
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    load()
  }, [id])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await customerProfileApi.detail(id!)
      setCustomer(data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load customer details')
    } finally {
      setLoading(false)
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

  const typeLabel = customer.customer_type === 'company' ? 'Company' : 'Individual'
  const typeColor = customer.customer_type === 'company'
    ? { bg: '#dbeafe', color: '#1e40af' }
    : { bg: '#fef9c3', color: '#854d0e' }

  return (
    <div>
      {/* ── Back Button ── */}
      <button
        className="btn btn-outline btn-sm"
        style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={() => navigate('/customers')}
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
            <span style={{
              padding: '3px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
              background: typeColor.bg, color: typeColor.color,
            }}>
              {typeLabel}
            </span>
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
    </div>
  )
}
