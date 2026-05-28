import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Car, Landmark, ShieldCheck, CreditCard,
  FileText, Clock, CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react'
import api from '../../api/axios'
import PageHeader from '../../components/app/PageHeader'

// ── Types ──────────────────────────────────────────────────────────────────

interface FileDetail {
  id: string
  file_number: string
  file_type: string
  status: string
  created_at: string
  vehicle?: {
    make?: string
    model?: string
    year?: string
    registration_no?: string
    chassis_no?: string
    engine_no?: string
  }
  finance?: {
    bank_name?: string
    loan_amount?: number
    tenure?: number
    emi_amount?: number
    rate?: number
    disbursement_date?: string
    lan_number?: string
  }
  insurance?: {
    company_name?: string
    policy_number?: string
    valid_from?: string
    valid_to?: string
    premium_amount?: number
    idv?: number
  }
  payments?: Array<{
    id: string
    payment_date: string
    amount: number
    mode: string
    remarks?: string
  }>
}

// ── Status helpers ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string; next: string }> = {
  draft:         { color: '#92400e', bg: '#fef3c7', icon: <Clock size={13}/>,         label: 'Draft',          next: 'Documents collection in progress' },
  login:         { color: '#1d4ed8', bg: '#eff6ff', icon: <FileText size={13}/>,      label: 'Login Done',     next: 'File submitted to bank' },
  under_process: { color: '#7c3aed', bg: '#fdf4ff', icon: <Clock size={13}/>,         label: 'Under Process',  next: 'Bank is reviewing your application' },
  sanctioned:    { color: '#0891b2', bg: '#ecfeff', icon: <CheckCircle2 size={13}/>,  label: 'Sanctioned',     next: 'Loan approved — awaiting disbursement' },
  disbursed:     { color: '#059669', bg: '#f0fdf4', icon: <CheckCircle2 size={13}/>,  label: 'Disbursed',      next: 'Loan disbursed — RTO/Insurance in process' },
  completed:     { color: '#15803d', bg: '#f0fdf4', icon: <CheckCircle2 size={13}/>,  label: 'Completed',      next: 'All done! File closed.' },
  cancelled:     { color: '#b91c1c', bg: '#fef2f2', icon: <XCircle size={13}/>,       label: 'Cancelled',      next: 'File has been cancelled' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || { color: '#64748b', bg: '#f1f5f9', icon: <AlertCircle size={13}/>, label: status, next: '' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{value ?? '—'}</span>
    </div>
  )
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '2px solid #f1f5f9' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

type Tab = 'overview' | 'finance' | 'insurance' | 'payments'

export default function CustomerFileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [file, setFile] = useState<FileDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get(`/portal/files/${id}`)
      .then(res => setFile(res.data))
      .catch(() => setError('Could not load file details. Please try again.'))
      .finally(() => setLoading(false))
  }, [id])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',  label: 'Overview',   icon: <FileText size={14}/>    },
    { key: 'finance',   label: 'Finance',    icon: <Landmark size={14}/>    },
    { key: 'insurance', label: 'Insurance',  icon: <ShieldCheck size={14}/> },
    { key: 'payments',  label: 'Payments',   icon: <CreditCard size={14}/>  },
  ]

  const status = file?.status?.toLowerCase() || ''
  const statusCfg = STATUS_CONFIG[status] || {}

  return (
    <>
      <PageHeader
        title={file ? `File: ${file.file_number}` : 'File Details'}
        subtitle={file ? `${file.file_type?.replace('_', ' ')} — ${statusCfg.label || file.status}` : ''}
      />

      {/* Back button */}
      <button
        className="btn btn-outline btn-sm"
        style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={() => navigate('/portal/files')}
      >
        <ArrowLeft size={14} /> Back to My Files
      </button>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          Loading file details…
        </div>
      )}
      {error && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#b91c1c' }}>
          <AlertCircle size={24} style={{ marginBottom: 8 }} /><br />{error}
        </div>
      )}

      {file && (
        <>
          {/* ── Status banner ── */}
          <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '1.5px solid #e0e7ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>CURRENT STATUS</div>
                <StatusBadge status={file.status} />
                {statusCfg.next && (
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
                    📍 <strong>Next step:</strong> {statusCfg.next}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>File Number</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#1e293b' }}>{file.file_number}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  Opened {new Date(file.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f8fafc', borderRadius: 12, padding: 4 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                  background: tab === t.key ? '#fff' : 'transparent',
                  color: tab === t.key ? '#2563eb' : '#64748b',
                  boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}

          {tab === 'overview' && (
            <SectionCard title="Vehicle Information" icon={<Car size={16} color="#2563eb"/>}>
              <InfoRow label="Make / Model"    value={[file.vehicle?.make, file.vehicle?.model].filter(Boolean).join(' ') || null} />
              <InfoRow label="Year"            value={file.vehicle?.year} />
              <InfoRow label="Registration No" value={file.vehicle?.registration_no} />
              <InfoRow label="Chassis No"      value={file.vehicle?.chassis_no} />
              <InfoRow label="Engine No"       value={file.vehicle?.engine_no} />
              <InfoRow label="File Type"       value={file.file_type?.replace(/_/g,' ')} />
            </SectionCard>
          )}

          {tab === 'finance' && (
            <SectionCard title="Finance / Loan Details" icon={<Landmark size={16} color="#2563eb"/>}>
              <InfoRow label="Bank"              value={file.finance?.bank_name} />
              <InfoRow label="LAN Number"        value={file.finance?.lan_number} />
              <InfoRow label="Loan Amount"       value={file.finance?.loan_amount != null ? `₹${file.finance.loan_amount.toLocaleString('en-IN')}` : null} />
              <InfoRow label="Tenure"            value={file.finance?.tenure ? `${file.finance.tenure} months` : null} />
              <InfoRow label="EMI"               value={file.finance?.emi_amount != null ? `₹${file.finance.emi_amount.toLocaleString('en-IN')} / month` : null} />
              <InfoRow label="Interest Rate"     value={file.finance?.rate ? `${file.finance.rate}% p.a.` : null} />
              <InfoRow label="Disbursement Date" value={file.finance?.disbursement_date ? new Date(file.finance.disbursement_date).toLocaleDateString('en-IN') : null} />
            </SectionCard>
          )}

          {tab === 'insurance' && (
            <SectionCard title="Insurance Details" icon={<ShieldCheck size={16} color="#2563eb"/>}>
              <InfoRow label="Insurance Company" value={file.insurance?.company_name} />
              <InfoRow label="Policy Number"     value={file.insurance?.policy_number} />
              <InfoRow label="Valid From"        value={file.insurance?.valid_from  ? new Date(file.insurance.valid_from).toLocaleDateString('en-IN')  : null} />
              <InfoRow label="Valid Until"       value={file.insurance?.valid_to    ? new Date(file.insurance.valid_to).toLocaleDateString('en-IN')    : null} />
              <InfoRow label="Premium Amount"    value={file.insurance?.premium_amount != null ? `₹${file.insurance.premium_amount.toLocaleString('en-IN')}` : null} />
              <InfoRow label="IDV"               value={file.insurance?.idv != null ? `₹${file.insurance.idv.toLocaleString('en-IN')}` : null} />
            </SectionCard>
          )}

          {tab === 'payments' && (
            <SectionCard title="Payment History" icon={<CreditCard size={16} color="#2563eb"/>}>
              {!file.payments || file.payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
                  No payment records found for this file.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {file.payments.map((p, i) => (
                        <tr key={p.id}>
                          <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>{i + 1}</td>
                          <td>{new Date(p.payment_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                          <td style={{ fontWeight: 700, color: '#15803d' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                          <td><span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{p.mode}</span></td>
                          <td style={{ color: '#64748b', fontSize: 13 }}>{p.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}
        </>
      )}
    </>
  )
}
