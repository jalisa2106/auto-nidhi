import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderOpen, Clock, AlertCircle, CheckCircle2,
  ArrowRight, FileText, Car, ShieldCheck,
  ChevronRight, CreditCard,
} from 'lucide-react'
import { customerDashboardApi } from '../../api/services'
import api from '../../api/axios'
import { unreadCount, fetchNotifications, subscribe } from '../../store/notificationStore'

// ── Types ──────────────────────────────────────────────────────────────────

interface FileRecord {
  id: string
  file_number: string
  file_type?: string
  status?: string
  finance_bank?: string
  created_at?: string
}
interface ActionRequiredData {
  outstanding_payments: number
  pending_documents: number
  expiring_insurance_days: number | null
  expiring_insurance_file: string | null
  files_needing_attention: Array<{ file_number: string; status: string; days_old: number }>
}
// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string; next: string }> = {
  draft:         { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Draft',         next: 'Collecting documents' },
  login:         { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Login',         next: 'File submitted to bank' },
  under_process: { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b', label: 'Under Process', next: 'Bank is reviewing your application' },
  sanctioned:    { bg: '#f0fdf4', text: '#0f766e', dot: '#14b8a6', label: 'Sanctioned',    next: 'Awaiting disbursement' },
  disbursed:     { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Disbursed',     next: 'Loan disbursed — RTO/Insurance in progress' },
  completed:     { bg: '#dcfce7', text: '#166534', dot: '#16a34a', label: 'Completed',     next: 'All done!' },
  cancelled:     { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444', label: 'Cancelled',     next: 'File was cancelled' },
}

function normalizeStatus(s?: string) {
  return (s || 'draft').toLowerCase().replace(/ /g, '_')
}

function StatusBadge({ status }: { status?: string }) {
  const key = normalizeStatus(status)
  const cfg = STATUS_CONFIG[key] || STATUS_CONFIG.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.text,
      padding: '3px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

const PIPELINE_STATUSES = ['draft', 'login', 'under_process', 'sanctioned', 'disbursed']

// ── Main ───────────────────────────────────────────────────────────────────

export default function CustomerPortalPage() {
  const navigate = useNavigate()
  const [allFiles, setAllFiles] = useState<FileRecord[]>([])
  const [insuranceCount, setInsuranceCount] = useState<number | null>(null)
  const [paymentSummary, setPaymentSummary] = useState({
  totalPaid: 0,
  totalOutstanding: 0,
  count: 0,
})
  const [actionRequired, setActionRequired] = useState<ActionRequiredData | null>(null)
  // FIXED: Removed the 'unread' variable to resolve TS6133, but kept the setter.
  const [, setUnread] = useState(unreadCount())
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('Customer')

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    // 1. Fetch dashboard welcome/greeting name
    const p1 = customerDashboardApi.get()
      .then(res => {
        setFirstName(res.user?.first_name || 'Customer')
      })
      .catch(() => {})

    // 2. Fetch all files for accurate KPI metrics and status pipeline
    const p2 = api.get<FileRecord[]>('/portal/files')
      .then(res => setAllFiles(res.data || []))
      .catch(() => setAllFiles([]))

    // 3. Fetch insurance policies count
    const p3 = api.get('/portal/insurance')
      .then(res => setInsuranceCount(res.data?.length ?? 0))
      .catch(() => setInsuranceCount(0))

    // 4. Fetch action-required summary
    const p4 = api.get<ActionRequiredData>('/customer/action-required')
      .then(res => setActionRequired(res.data))
      .catch(() => setActionRequired(null))

    // 5. Fetch payment summary
   const p5 = api.get('/portal/payments')
  .then(res => {
    const payments = res.data || []

    const totalPaid = payments.reduce(
      (sum: number, p: any) => sum + (Number(p.paid_amount) || 0),
      0
    )

    const totalOutstanding = payments.reduce(
      (sum: number, p: any) => sum + (Number(p.remaining_amount) || 0),
      0
    )

    setPaymentSummary({
      totalPaid,
      totalOutstanding,
      count: payments.length,
    })
  })
  .catch(() => {})

    // 6. Fetch notifications
    fetchNotifications()

    Promise.all([p1, p2, p3, p4, p5]).finally(() => setLoading(false))

    // 7. Subscribe to notifications unread updates
    const unsub = subscribe(() => setUnread(unreadCount()))
    return unsub
   
  }, [])

  // Derived stats
  const active    = allFiles.filter(f => !['completed', 'cancelled'].includes(normalizeStatus(f.status))).length
  const completed = allFiles.filter(f => normalizeStatus(f.status) === 'completed').length

  // Pipeline counts
  const pipeline = PIPELINE_STATUSES.map(key => ({
    key,
    cfg: STATUS_CONFIG[key],
    count: allFiles.filter(f => normalizeStatus(f.status) === key).length,
  }))

  return (
    <div className="db-root customer-db">
      {/* ── Welcome Banner ── */}
      <div className="db-welcome">
        <div>
          <div className="db-greeting">{greeting}, {firstName}! 👋</div>
          <div className="db-sub">Track your ongoing services and file updates — AutoNidhi</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/portal/files" className="btn btn-primary btn-sm">
            <FileText size={14} style={{ marginRight: 5 }} /> My Files
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="db-kpi-grid">
        <div className="db-kpi-card db-kpi-blue" onClick={() => navigate('/portal/files')}>
          <div className="db-kpi-icon"><FolderOpen size={22} /></div>
          <div className="db-kpi-body">
            <div className="db-kpi-label">Active Files</div>
            <div className="db-kpi-value">{loading ? '…' : active}</div>
            <div className="db-kpi-sub">
              <span className="db-chip db-chip-blue">In Progress</span>
            </div>
          </div>
          <ChevronRight size={16} className="db-kpi-arrow" />
        </div>

        <div className="db-kpi-card db-kpi-green" onClick={() => navigate('/portal/files')}>
          <div className="db-kpi-icon"><CheckCircle2 size={22} /></div>
          <div className="db-kpi-body">
            <div className="db-kpi-label">Completed Services</div>
            <div className="db-kpi-value">{loading ? '…' : completed}</div>
            <div className="db-kpi-sub">
              <span className="db-kpi-tag green">All done</span>
            </div>
          </div>
          <ChevronRight size={16} className="db-kpi-arrow" />
        </div>

        <div className="db-kpi-card db-kpi-red" onClick={() => navigate('/portal/insurance')}>
          <div className="db-kpi-icon"><ShieldCheck size={22} /></div>
          <div className="db-kpi-body">
            <div className="db-kpi-label">Insurance</div>
            <div className="db-kpi-value">{loading || insuranceCount === null ? '…' : insuranceCount}</div>
            <div className="db-kpi-sub">
              <span className="db-kpi-tag red">View policies</span>
            </div>
          </div>
          <ChevronRight size={16} className="db-kpi-arrow" />
        </div>
      </div>

      {actionRequired && (
        (actionRequired.outstanding_payments > 0 || actionRequired.pending_documents > 0 ||
          (actionRequired.expiring_insurance_days !== null && actionRequired.expiring_insurance_days <= 30) ||
          (actionRequired.files_needing_attention?.length ?? 0) > 0) && (
          <div className="db-card" style={{ margin: '20px 0', border: '1px solid #fecdd3', background: '#fff1f2' }}>
            <div className="db-card-header">
              <div className="db-card-title" style={{ color: '#be123c' }}>
                <AlertCircle size={16} /> Action Required
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px 0 8px' }}>
              {actionRequired.outstanding_payments > 0 && (
                <div style={{ flex: '1 1 240px', minWidth: 240, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#991b1b' }}>💳 {actionRequired.outstanding_payments} payment(s) outstanding</div>
                  <div style={{ marginTop: 8, color: '#7f1d1d', fontSize: '.84rem' }}>Please settle pending dues to avoid delays in your services.</div>
                  <div style={{ marginTop: 12 }}><Link to="/portal/payments" style={{ color: '#991b1b', fontWeight: 700 }}>View payments →</Link></div>
                </div>
              )}

              {actionRequired.pending_documents > 0 && (
                <div style={{ flex: '1 1 240px', minWidth: 240, background: '#ffedd5', border: '1px solid #fed7aa', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#9a3412' }}>📄 {actionRequired.pending_documents} document(s) need attention</div>
                  <div style={{ marginTop: 8, color: '#7c2d12', fontSize: '.84rem' }}>Upload or correct documents so your file can progress smoothly.</div>
                  <div style={{ marginTop: 12 }}><Link to="/portal/documents" style={{ color: '#9a3412', fontWeight: 700 }}>Review documents →</Link></div>
                </div>
              )}

              {actionRequired.expiring_insurance_days !== null && actionRequired.expiring_insurance_days <= 30 && (
                <div style={{ flex: '1 1 240px', minWidth: 240, background: '#ede9fe', border: '1px solid #ddd6fe', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4c1d95' }}>🛡️ Insurance expires in {actionRequired.expiring_insurance_days} days</div>
                  <div style={{ marginTop: 8, color: '#4338ca', fontSize: '.84rem' }}>{actionRequired.expiring_insurance_file || 'Policy file'} is due soon.</div>
                  <div style={{ marginTop: 12 }}><Link to="/portal/insurance" style={{ color: '#4338ca', fontWeight: 700 }}>View insurance →</Link></div>
                </div>
              )}

              {(actionRequired.files_needing_attention || []).map(f => (
                <div key={f.file_number} style={{ flex: '1 1 240px', minWidth: 240, background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1d4ed8' }}>📁 File {f.file_number} needs attention</div>
                  <div style={{ marginTop: 8, color: '#1e40af', fontSize: '.84rem' }}>Draft for {f.days_old} days — status is {f.status}.</div>
                  <div style={{ marginTop: 12 }}><Link to="/portal/files" style={{ color: '#1d4ed8', fontWeight: 700 }}>View file →</Link></div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ── Row 2: Pipeline + Services ── */}
      <div className="db-row2">
        {/* File Status Pipeline */}
        <div className="db-card db-pipeline">
          <div className="db-card-header">
            <div className="db-card-title"><Car size={16} /> File Status Pipeline</div>
            <Link to="/portal/files" className="db-see-all">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="db-pipeline-grid">
            {pipeline.map(p => (
              <div
                key={p.key}
                className="db-pipeline-item"
                style={{ background: p.cfg.bg, cursor: 'pointer' }}
                onClick={() => navigate('/portal/files')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.cfg.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: '.72rem', fontWeight: 700, color: p.cfg.text, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    {p.cfg.label}
                  </span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: p.cfg.text, lineHeight: 1 }}>{p.count}</div>
                <div style={{ fontSize: '.72rem', color: p.cfg.text, opacity: 0.7, marginTop: 4 }}>
                  {p.count === 1 ? 'file' : 'files'}
                </div>
              </div>
            ))}
          </div>
          <div className="db-pipeline-bar">
            {pipeline.map(p => p.count > 0 && (
              <div
                key={p.key}
                title={`${p.cfg.label}: ${p.count}`}
                style={{ flex: p.count, height: 6, background: p.cfg.dot, borderRadius: 4, transition: 'flex .4s ease' }}
              />
            ))}
          </div>
        </div>

        {/* Apply for new service */}
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-title"><FileText size={16} /> Quick Services</div>
          </div>
          {[
            { icon: Car,         bg: '#2563eb', title: 'Vehicle Loan',      desc: 'New or used vehicle financing from banks/NBFCs', to: '/portal/loans' },
            { icon: ShieldCheck, bg: '#7c3aed', title: 'Vehicle Insurance', desc: 'Fresh coverage or renewal — third-party & comprehensive', to: '/portal/insurance' },
            { icon: FileText,    bg: '#d97706', title: 'RTO Services',      desc: 'Transfer, NOC, and fitness certificate applications', to: '/portal/rto' },
          ].map(({ icon: Icon, bg, title, desc, to }) => (
            <div
              key={title}
              onClick={() => navigate(to)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 0', borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon color="#fff" size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.88rem', color: '#0f172a' }}>{title}</div>
                <div style={{ fontSize: '.76rem', color: '#94a3b8' }}>{desc}</div>
              </div>
              <ArrowRight size={14} color="#94a3b8" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Recent Files + Notifications ── */}
      <div className="db-row3">
        {/* Recent Files Table */}
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-title"><FolderOpen size={16} /> My Recent Files</div>
            <Link to="/portal/files" className="db-see-all">All files <ArrowRight size={12} /></Link>
          </div>
          <table className="db-mini-table">
            <thead>
              <tr>
                <th>File #</th>
                <th>Type</th>
                <th>Bank</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} style={{ color: 'var(--gray-400)' }}>Loading…</td></tr>
              )}
              {!loading && allFiles.length === 0 && (
                <tr><td colSpan={4} style={{ color: 'var(--gray-400)' }}>No files yet. Contact AutoNidhi to start.</td></tr>
              )}
              {!loading && allFiles.slice(0, 5).map(f => (
                <tr key={f.id} onClick={() => navigate(`/portal/files/${f.id}`)} style={{ cursor: 'pointer' }}>
                  <td><span className="db-file-id">{f.file_number || '—'}</span></td>
                  <td style={{ fontSize: '.78rem', color: '#64748b', fontWeight: 500 }}>
                    {f.file_type?.replace(/_/g, ' ') || '—'}
                  </td>
                  <td style={{ fontSize: '.78rem', color: '#64748b' }}>{f.finance_bank || '—'}</td>
                  <td><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="db-card">
         <div className="db-card-header">
          <div className="db-card-title">
           <CreditCard size={16} /> Payment Summary
          </div>

          <Link to="/portal/payments" className="db-see-all">
            View all <ArrowRight size={12} />
          </Link>
        </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '.72rem',
                  color: '#94a3b8',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Paid
              </div>

              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#16a34a',
                }}
              >
                ₹{paymentSummary.totalPaid.toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '.72rem',
                  color: '#94a3b8',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Outstanding
              </div>

              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color:
                    paymentSummary.totalOutstanding > 0
                      ? '#b91c1c'
                      : '#16a34a',
                }}
              >
                ₹{paymentSummary.totalOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {paymentSummary.count === 0 && (
            <div
              style={{
                fontSize: '.8rem',
                color: '#94a3b8',
                marginTop: 8,
              }}
            >
              No payments recorded yet
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-title"><AlertCircle size={16} /> Quick Actions</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'View My Files',       to: '/portal/files',      icon: FolderOpen },
              { label: 'Check Documents',     to: '/portal/documents',  icon: FileText   },
              { label: 'Payment Status',      to: '/portal/payments',   icon: Clock      },
              { label: 'Insurance Details',   to: '/portal/insurance',  icon: ShieldCheck},
            ].map(({ label, to, icon: Icon }) => (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10,
                background: '#f8fafc', border: '1px solid #f1f5f9',
                textDecoration: 'none', color: '#334155', fontSize: '.84rem', fontWeight: 500,
                transition: 'background .12s',
              }}>
                <Icon size={14} color="#2563eb" />
                {label}
                <ArrowRight size={13} color="#94a3b8" style={{ marginLeft: 'auto' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}