import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderOpen, Clock, AlertCircle, CheckCircle2,
  ArrowRight, Bell, FileText, Car, ShieldCheck,
  ChevronRight, BellRing,
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
  const [unread, setUnread] = useState(unreadCount())
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

    // 4. Fetch notifications
    fetchNotifications()

    Promise.all([p1, p2, p3]).finally(() => setLoading(false))

    // 5. Subscribe to notifications unread updates
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
    <div className="db-root">
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
          <Link to="/portal/notifications" className="btn btn-outline btn-sm">
            <BellRing size={14} style={{ marginRight: 5 }} /> Notifications {unread > 0 && `(${unread})`}
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

        <div className="db-kpi-card db-kpi-gold" onClick={() => navigate('/portal/notifications')}>
          <div className="db-kpi-icon"><Bell size={22} /></div>
          <div className="db-kpi-body">
            <div className="db-kpi-label">Unread Notifications</div>
            <div className="db-kpi-value">{unread}</div>
            <div className="db-kpi-sub">
              <span className="db-kpi-tag gold">{unread > 0 ? 'Action needed' : 'All caught up'}</span>
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
            { icon: Car,        bg: '#2563eb', title: 'Vehicle Loan',      desc: 'New or used vehicle financing from banks/NBFCs', to: '/portal/loans' },
            { icon: ShieldCheck, bg: '#7c3aed', title: 'Vehicle Insurance', desc: 'Fresh coverage or renewal — third-party & comprehensive', to: '/portal/insurance' },
            { icon: FileText,   bg: '#d97706', title: 'RTO Services',      desc: 'Transfer, NOC, and fitness certificate applications', to: '/portal/rto' },
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
