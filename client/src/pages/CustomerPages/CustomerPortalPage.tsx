import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Clock, CheckCircle2, AlertCircle, Car, Shield, FileText, ArrowRight } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import { filesApi } from '../../api/services'

interface FileRecord {
  id: string
  file_number: string
  file_type?: string
  status?: string
  finance_bank?: string
  created_at?: string
}

interface Notification {
  id: string
  message: string
  time: string
  read: boolean
}

// Mock notifications (replace with real API when available)
const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', message: 'Your file is under review by the bank.', time: '2 hours ago', read: false },
  { id: '2', message: 'Documents approved — disbursement pending.', time: '1 day ago', read: true },
  { id: '3', message: 'Insurance renewal reminder: expires in 15 days.', time: '3 days ago', read: true },
]

export default function CustomerPortalPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const userName = localStorage.getItem('user_name') || 'Customer'

  useEffect(() => {
    async function load() {
      try {
        const res = await filesApi.list(1, 5)
        setFiles(Array.isArray(res) ? res : res.data || [])
      } catch {
        setFiles([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const active    = files.filter(f => f.status && !['completed', 'cancelled'].includes(f.status.toLowerCase())).length
  const completed = files.filter(f => f.status?.toLowerCase() === 'completed').length
  const unread    = MOCK_NOTIFICATIONS.filter(n => !n.read).length

  return (
    <>
      <PageHeader
        title={`Welcome back, ${userName.split(' ')[0]}! 👋`}
        subtitle="Track your ongoing services or apply for a new one"
      />

      {/* ── Stat cards ── */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <div className="data-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1 }}>{loading ? '…' : active}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-400)', fontWeight: 500 }}>Active Files</div>
          </div>
        </div>
        <div className="data-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1 }}>{loading ? '…' : completed}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-400)', fontWeight: 500 }}>Completed Services</div>
          </div>
        </div>
        <div className="data-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1 }}>{unread}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-400)', fontWeight: 500 }}>Unread Notifications</div>
          </div>
        </div>
      </div>

      {/* ── Main 2-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* Apply for new service */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-700)', margin: 0 }}>Apply for a New Service</h2>
          {[
            { icon: Car, bg: 'var(--brand-600)', title: 'Vehicle Financing / Car Loan', desc: 'Competitive rates from premium banks for new or used vehicles.' },
            { icon: Shield, bg: '#8b5cf6', title: 'Vehicle Insurance', desc: 'Fresh coverage or renewal — third-party and comprehensive plans.' },
            { icon: FileText, bg: '#f59e0b', title: 'RTO Management Services', desc: 'Ownership transfers, NOC, and fitness certificates.' },
          ].map(({ icon: Icon, bg, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 20, background: 'var(--surface-0)', border: '1px solid var(--gray-100)', borderRadius: 14, cursor: 'pointer', transition: 'box-shadow .15s' }}
              onClick={() => navigate('/portal/files')}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon color="#fff" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--gray-500)' }}>{desc}</div>
              </div>
              <ArrowRight size={16} color="var(--gray-400)" />
            </div>
          ))}
        </div>

        {/* Recent files + notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recent files */}
          <div className="data-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700, color: 'var(--gray-800)' }}>My Files</h3>
              <Link to="/portal/files" style={{ fontSize: '.8rem', color: 'var(--brand-600)', fontWeight: 600 }}>View all</Link>
            </div>
            {loading ? (
              <div style={{ color: 'var(--gray-400)', fontSize: '.85rem' }}>Loading…</div>
            ) : files.length === 0 ? (
              <div style={{ color: 'var(--gray-400)', fontSize: '.85rem' }}>No files yet.</div>
            ) : files.slice(0, 3).map(f => (
              <Link key={f.id} to="/portal/files"
                style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--gray-50)', textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.87rem', color: 'var(--gray-800)' }}>{f.file_number}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>{f.file_type || '—'}</div>
                  </div>
                  <span style={{ fontSize: '.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--brand-50)', color: 'var(--brand-700)' }}>
                    {f.status || 'Active'}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Notifications */}
          <div className="data-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700, color: 'var(--gray-800)' }}>Notifications</h3>
              <Link to="/portal/notifications" style={{ fontSize: '.8rem', color: 'var(--brand-600)', fontWeight: 600 }}>See all</Link>
            </div>
            {MOCK_NOTIFICATIONS.map(n => (
              <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-50)' }}>
                <div style={{ fontSize: '.84rem', fontWeight: n.read ? 400 : 600, color: n.read ? 'var(--gray-600)' : 'var(--gray-900)' }}>{n.message}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--gray-400)', marginTop: 2 }}>{n.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
