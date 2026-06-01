import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  LayoutDashboard, FileText, FolderOpen, CreditCard, ShieldCheck, ClipboardList,
  Car, LogOut, BellRing, UserCircle2, ChevronDown, Settings,
} from 'lucide-react'
import NotificationPanel from '../../components/app/NotificationPanel'

interface NavItem { to: string; label: string; icon: React.ComponentType<any> }
interface NavGroup { title: string; items: NavItem[] }

const customerNav: NavGroup[] = [
  {
    title: 'My Portal',
    items: [
      { to: '/portal',            label: 'Dashboard',       icon: LayoutDashboard },
      { to: '/portal/files',      label: 'My Files',        icon: FileText },
    ],
  },
  {
    title: 'My Account',
    items: [
      { to: '/portal/documents',  label: 'Documents',       icon: FolderOpen  },
      { to: '/portal/payments',   label: 'Payment Status',  icon: CreditCard  },
      { to: '/portal/insurance',  label: 'Insurance',       icon: ShieldCheck },
      { to: '/portal/rto',        label: 'RTO Services',    icon: ClipboardList },
    ],
  },
]

export default function CustomerLayout() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('Customer')
  const [userInitial, setUserInitial] = useState('C')
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false) // Added missing state for the popup
  const profileRef = useRef<HTMLDivElement>(null)

  // Centralized user loading logic
  const loadUserName = useCallback(() => {
    try {
      const stored = localStorage.getItem('an_current_user') || sessionStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        const name = u.first_name || u.name || 'Customer'
        setUserName(name)
        setUserInitial(name.slice(0, 1).toUpperCase())
      }
    } catch { /* ignore */ }
  }, [])

  // Initial load and Auth check
  useEffect(() => {
    loadUserName()
    const role = localStorage.getItem('user_role')

    if (!localStorage.getItem('access_token') || (role && role.toLowerCase() !== 'customer')) {
      navigate('/login', { replace: true })
    }
  }, [navigate, loadUserName])

  // Listen to storage changes (e.g., when profile is updated on another tab or after save)
  useEffect(() => {
    window.addEventListener('storage', loadUserName)
    window.addEventListener('user-profile-updated', loadUserName)
    return () => {
      window.removeEventListener('storage', loadUserName)
      window.removeEventListener('user-profile-updated', loadUserName)
    }
  }, [loadUserName])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_name')
    localStorage.removeItem('an_current_user')
    sessionStorage.removeItem('an_current_user') // Also clean session storage
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div className="sb-logo">
          <div className="sb-logo-mark"><Car size={18} color="#fff" /></div>
          <div className="sb-brand">Auto<span>Nidhi</span></div>
        </div>

        {customerNav.map((group) => (
          <div key={group.title}>
            <div className="sb-section">{group.title}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/portal'}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <item.icon size={16} /> {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sb-foot">
          Signed in as <strong style={{ color: '#fff' }}>{userName}</strong><br />
          <span>Customer</span>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="app-main">
        <header className="app-topbar">
          <h1>Customer Portal</h1>
          <div className="app-user">

            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                title="Notifications"
                onClick={() => setNotifOpen(prev => !prev)}
                style={{ position: 'relative', padding: '6px 8px' }}
              >
                <BellRing size={18} color="#64748b" />
              </button>
            </div>

            {/* Notification Panel Popup */}
            {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}

            {/* Profile dropdown */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px' }}
                onClick={() => setProfileOpen(p => !p)}
              >
                <div className="app-avatar">{userInitial}</div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                  {userName}
                </span>
                <ChevronDown size={13} color="#94a3b8"
                  style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
              </button>

              {profileOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 999,
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,.10)', minWidth: 180, overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{userName}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Customer</div>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/portal/profile') }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 13, color: '#334155',
                    }}
                  >
                    <UserCircle2 size={15} /> My Profile
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/portal/settings') }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 13, color: '#334155',
                    }}
                  >
                    <Settings size={15} /> Account Settings
                  </button>
                  <div style={{ borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: 13, color: '#dc2626',
                      }}
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}