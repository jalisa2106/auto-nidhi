import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderOpen, Clock, AlertCircle, CheckCircle2,
  ArrowRight, FileText, Car, ShieldCheck,
  ChevronRight, CreditCard, User, UserCircle2, UserCheck, X
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
  const [, setUnread] = useState(unreadCount())
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('Customer')
  const [allocatedStaff, setAllocatedStaff] = useState<{name: string, email: string, since: string} | null>(null)

  // Onboarding: staff selection
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [staffOptions, setStaffOptions] = useState<{id: string; name: string; email: string}[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [savingStaff, setSavingStaff] = useState(false)
  const [staffSaved, setStaffSaved] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    const p1 = customerDashboardApi.get()
      .then(res => {
        setFirstName(res.user?.first_name || 'Customer')
        if (res.dashboard?.allocated_staff) {
          setAllocatedStaff(res.dashboard.allocated_staff)
        } else {
          // No staff assigned — show onboarding banner (once per session)
          const dismissed = sessionStorage.getItem('staff_banner_dismissed')
          if (!dismissed) setShowBanner(true)
          // Pre-load staff list
          api.get('/service-requests/consultants').then(r => {
            const users = Array.isArray(r.data) ? r.data : []
            setStaffOptions(users.map((u: any) => ({
              id: u.id,
              name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
              email: u.email || ''
            })))
          }).catch(() => {})
        }
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

  // Pipeline logic removed as it's no longer used in UI

  async function handleAssignStaff() {
    if (!selectedStaffId) return
    setSavingStaff(true)
    try {
      // get customer id from dashboard data
      const dashRes = await api.get('/portal/profile')
      const customerId = dashRes.data?.customer_id || dashRes.data?.id
      if (customerId) {
        await api.post(`/customers/${customerId}/assign-staff`, { staff_id: selectedStaffId })
      }
      const found = staffOptions.find(s => s.id === selectedStaffId)
      if (found) {
        setAllocatedStaff({ name: found.name, email: found.email, since: new Date().toISOString() })
      }
      setStaffSaved(true)
      setShowStaffModal(false)
      setShowBanner(false)
      sessionStorage.setItem('staff_banner_dismissed', '1')
    } catch { /* silent */ } finally { setSavingStaff(false) }
  }

  return (
    <div className="db-root customer-db">
      {/* Onboarding Banner — shown when no consultant assigned */}
      {showBanner && !allocatedStaff && (
        <div style={{
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          boxShadow: '0 4px 20px rgba(99,102,241,.25)'
        }}>
          <UserCheck size={28} color="#fff" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>Choose your AutoNidhi Consultant</div>
            <div style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.8)', marginTop: 2 }}>
              Assign a dedicated consultant who will manage your applications and files.
            </div>
          </div>
          <button
            onClick={() => setShowStaffModal(true)}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#fff', color: '#6366f1', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '.85rem' }}
          >
            Select Consultant
          </button>
          <button onClick={() => { setShowBanner(false); sessionStorage.setItem('staff_banner_dismissed','1') }}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Staff Selection Modal */}
      {showStaffModal && (
        <div className="modal-backdrop" onClick={() => setShowStaffModal(false)}>
          <div className="modal" style={{ maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Choose Your Consultant</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowStaffModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: '.85rem', color: '#64748b' }}>
                Select the AutoNidhi staff member who will handle your profile and applications.
              </p>
              {staffOptions.length === 0 ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontSize: '.85rem' }}>No consultants available right now. Admin will assign one shortly.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {staffOptions.map(s => (
                    <div key={s.id} onClick={() => setSelectedStaffId(s.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${selectedStaffId === s.id ? '#6366f1' : '#e2e8f0'}`,
                      background: selectedStaffId === s.id ? '#eef2ff' : '#fff',
                      transition: 'all .15s'
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: '.9rem'
                      }}>
                        {s.name.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '.88rem' }}>{s.name}</div>
                        {s.email && <div style={{ fontSize: '.74rem', color: '#64748b' }}>{s.email}</div>}
                      </div>
                      {selectedStaffId === s.id && <CheckCircle2 size={18} color="#6366f1" />}
                    </div>
                  ))}
                </div>
              )}
              {staffSaved && <div style={{ color: '#16a34a', fontSize: '.82rem', fontWeight: 600 }}>✓ Consultant assigned successfully!</div>}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setShowStaffModal(false); sessionStorage.setItem('staff_banner_dismissed','1') }}>Skip for now</button>
              <button
                className="btn btn-primary btn-sm"
                disabled={!selectedStaffId || savingStaff}
                onClick={handleAssignStaff}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {savingStaff ? 'Saving…' : <><UserCheck size={14} /> Confirm</>}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {actionRequired && actionRequired.expiring_insurance_days !== null && actionRequired.expiring_insurance_days <= 30 ? (
              <>
                <div className="db-kpi-value" style={{ color: '#b91c1c' }}>
                  {actionRequired.expiring_insurance_days}d
                </div>
                <div className="db-kpi-sub">
                  <span className="db-kpi-tag red">Expires soon!</span>
                </div>
              </>
            ) : (
              <>
                <div className="db-kpi-value">{loading || insuranceCount === null ? '…' : insuranceCount}</div>
                <div className="db-kpi-sub">
                  <span className="db-kpi-tag red">View policies</span>
                </div>
              </>
            )}
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

      {/* ── Row 2: Services ── */}
      <div className="db-row2" style={{ gridTemplateColumns: '1fr' }}>
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

        {/* Allocated Staff Card */}
        {allocatedStaff ? (
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title"><User size={16} /> Your Allocated Consultant</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserCircle2 size={24} color="#2563eb" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{allocatedStaff.name}</div>
                <div style={{ fontSize: '.78rem', color: '#64748b' }}>{allocatedStaff.email}</div>
                <div style={{ fontSize: '.72rem', color: '#94a3b8', marginTop: 3 }}>
                  Allocated since {new Date(allocatedStaff.since).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="db-card" style={{ opacity: 0.5 }}>
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '.84rem' }}>
              No consultant allocated yet. Contact AutoNidhi.
            </div>
          </div>
        )}

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