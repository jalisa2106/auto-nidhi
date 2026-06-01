import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  LayoutDashboard, Users, FolderOpen,
  ArrowDownToLine, ArrowUpFromLine, Receipt, ShieldCheck, Wallet,
  Car, LogOut, Bell, User, Settings, ChevronDown,
} from 'lucide-react'
import NotificationPanel from '../../components/app/NotificationPanel'
import { subscribe, unreadCount, fetchNotifications } from '../../store/notificationStore'

interface NavItem { to: string; label: string; icon: React.ComponentType<any> }
interface NavGroup { title: string; items: NavItem[] }

const dataEntryNav: NavGroup[] = [
  {
    title: 'Overview', items: [
      { to: '/data-entry/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/data-entry/customers', label: 'Customers', icon: Users           },
      { to: '/data-entry/files',     label: 'Files',     icon: FolderOpen      },
    ],
  },
  {
    title: 'Finance', items: [
      { to: '/data-entry/payments/in',         label: 'Payment IN',         icon: ArrowDownToLine },
      { to: '/data-entry/payments/out',        label: 'Payment OUT',        icon: ArrowUpFromLine },
      { to: '/data-entry/rto-payments',        label: 'RTO Payments',       icon: Receipt         },
      { to: '/data-entry/insurance-payments',  label: 'Insurance Payments', icon: ShieldCheck     },
      { to: '/data-entry/expenses',            label: 'Expenses',           icon: Wallet          },
    ],
  },
]

function DropdownItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', background: hover ? (danger ? '#fff1f2' : '#f8fafc') : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        color: danger ? '#dc2626' : '#334155',
        fontSize: 13, fontWeight: 500, transition: 'background .12s',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

export default function DataEntryLayout() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('Data Entry')
  const [badgeCount, setBadgeCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const role = localStorage.getItem('user_role') || ''
    
    // Initial load from storage
    try {
      const stored = localStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.first_name || u.name || u.email?.split('@')[0] || 'Data Entry')
      }
    } catch { /* ignore */ }

    if (!localStorage.getItem('access_token') || role.toLowerCase() !== 'data_entry') {
      navigate('/login', { replace: true })
    }

    // NEW: Listen for the exact same sync event that DashboardPage dispatches
    const handleNameSync = (e: any) => {
      if (e.detail) setUserName(e.detail);
    };
    window.addEventListener('user_name_sync', handleNameSync);
    
    return () => window.removeEventListener('user_name_sync', handleNameSync);
  }, [navigate])

  useEffect(() => {
    fetchNotifications()
    setBadgeCount(unreadCount())
    const unsub = subscribe(() => setBadgeCount(unreadCount()))
    return unsub
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('an_current_user')
    localStorage.removeItem('user_role')
    navigate('/login', { replace: true })
  }

  const closeNotifs = useCallback(() => setShowNotifs(false), [])
  const initials = userName.slice(0, 1).toUpperCase()

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sb-logo">
          <div className="sb-logo-mark"><Car size={18} color="#fff" /></div>
          <div className="sb-brand">Auto<span>Nidhi</span></div>
        </div>

        {dataEntryNav.map((group) => (
          <div key={group.title}>
            <div className="sb-section">{group.title}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/data-entry/dashboard'}
                className={({ isActive }) => (isActive ? 'active-link' : '')}
              >
                <item.icon size={16} /> {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sb-foot">
          Signed in as <strong style={{ color: '#fff' }}>{userName}</strong><br />
          <span>Data Entry</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <h1>Data Entry Portal</h1>

          <div className="app-user" style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                id="de-notif-bell-btn"
                onClick={() => { setShowNotifs(p => !p); setShowProfile(false) }}
                style={{
                  background: showNotifs ? '#eff6ff' : 'transparent',
                  border: '1.5px solid',
                  borderColor: showNotifs ? '#bfdbfe' : 'transparent',
                  borderRadius: 10, padding: 7, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s', color: showNotifs ? '#2563eb' : '#64748b',
                }}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </button>
              {badgeCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#ef4444', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  minWidth: 17, height: 17,
                  borderRadius: 10, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', lineHeight: 1,
                  border: '2px solid #fff', pointerEvents: 'none',
                }}>
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </div>

            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                id="de-profile-avatar-btn"
                onClick={() => { setShowProfile(p => !p); setShowNotifs(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: showProfile ? '#eff6ff' : 'transparent',
                  border: '1.5px solid',
                  borderColor: showProfile ? '#bfdbfe' : 'transparent',
                  borderRadius: 10, padding: '5px 10px 5px 5px',
                  cursor: 'pointer', transition: 'all .15s',
                }}
                aria-label="User menu"
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {initials}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: '#334155',
                  maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {userName}
                </span>
                <ChevronDown size={14} color="#94a3b8"
                  style={{ transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>

              {showProfile && (
                <div style={{
                  position: 'absolute', top: 46, right: 0,
                  width: 200, background: '#fff', borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(15,23,42,.14), 0 2px 6px rgba(15,23,42,.06)',
                  border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden',
                  animation: 'notifPanelIn .15s ease',
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{userName}</div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8' }}>Data Entry</div>
                  </div>
                  <DropdownItem
                    icon={<User size={14} />}
                    label="My Profile"
                    onClick={() => { navigate('/data-entry/profile'); setShowProfile(false) }}
                  />
                  <DropdownItem
                    icon={<Settings size={14} />}
                    label="Account Settings"
                    onClick={() => { navigate('/data-entry/settings'); setShowProfile(false) }}
                  />
                  <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                  <DropdownItem
                    icon={<LogOut size={14} />}
                    label="Logout"
                    onClick={handleLogout}
                    danger
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        {showNotifs && <NotificationPanel onClose={closeNotifs} />}

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        @keyframes notifPanelIn {
          from { opacity: 0; transform: translateY(-6px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}