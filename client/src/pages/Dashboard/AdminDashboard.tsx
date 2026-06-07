import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, FolderOpen,
  ArrowDownToLine, ArrowUpFromLine, BadgePercent, HandCoins,
  Receipt, ShieldCheck, Wallet, Landmark,
  Database, Settings, LogOut, Bell, PiggyBank,
  User, ChevronDown, ClipboardList, BarChart2,
} from 'lucide-react'
import NotificationPanel from '../../components/app/NotificationPanel'
import { subscribe, unreadCount, fetchNotifications } from '../../store/notificationStore'
import logoDark from '../../assets/AutoNidhi Logo 1.png'
import '../../pages.css'

interface NavItem { to: string; label: string; icon: React.ComponentType<any> }
interface NavGroup { title: string; items: NavItem[] }

const adminNav: NavGroup[] = [
  {
    title: 'Overview', items: [
      { to: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
      { to: '/analytics',  label: 'Analytics', icon: BarChart2      },
      { to: '/customers',  label: 'Customers', icon: Users },
      { to: '/files',      label: 'Files',     icon: FolderOpen },
    ],
  },
  {
    title: 'Finance', items: [
      { to: '/payments/in',          label: 'Payment IN',          icon: ArrowDownToLine  },
      { to: '/payments/out',         label: 'Payment OUT',         icon: ArrowUpFromLine  },
      { to: '/commissions/in',       label: 'Commission IN',       icon: BadgePercent     },
      { to: '/commissions/out',      label: 'Commission OUT',      icon: HandCoins        },
      { to: '/rto-payments',         label: 'RTO Payments',        icon: Receipt          },
      { to: '/insurance-payments',   label: 'Insurance Payments',  icon: ShieldCheck      },
      { to: '/expenses',             label: 'Expenses',            icon: Wallet           },
      { to: '/advances',             label: 'Advances',            icon: Landmark         },
      { to: '/loans',                label: 'Loans',               icon: PiggyBank        },
    ],
  },
  {
    title: 'Masters', items: [
      { to: '/masters/dealers',             label: 'Dealers',             icon: Database },
      { to: '/masters/brokers',             label: 'Brokers',             icon: Database },
      { to: '/masters/finance-banks',       label: 'Finance Banks',       icon: Database },
      { to: '/masters/insurance-companies', label: 'Insurance Cos.',      icon: Database },
      { to: '/masters/insurance-types',     label: 'Insurance Types',     icon: Database },
      { to: '/masters/expense-categories',  label: 'Expense Categories',  icon: Database },
    ],
  },
  {
    title: 'Settings', items: [
      { to: '/settings/company',      label: 'Company',       icon: Settings },
      { to: '/settings/banks',        label: 'Bank Accounts', icon: Settings },
      { to: '/settings/users',        label: 'Users',         icon: Users    },
      { to: '/settings/staff',        label: 'Staff Members', icon: Users    },
      { to: '/settings/accountants',  label: 'Accountants',   icon: Users    },
    ],
  },
  {
    title: 'Operations', items: [
      { to: '/admin/review-desk', label: 'Review Desk', icon: ClipboardList },
    ],
  },
]

const dataEntryNav: NavGroup[] = [
  {
    title: 'Overview', items: [
      { to: '/staff/dashboard',      label: 'Dashboard',        icon: LayoutDashboard },
      { to: '/staff/customers',      label: 'Customers',        icon: Users           },
      { to: '/staff/files',          label: 'Files',            icon: FolderOpen      },
      { to: '/staff/requests',       label: 'Service Requests', icon: ClipboardList   },
      { to: '/staff/modifications',  label: 'Modifications',    icon: ClipboardList   },
    ],
  },
  {
    title: 'Finance', items: [
      { to: '/staff/payments/in',         label: 'Payment IN',         icon: ArrowDownToLine  },
      { to: '/staff/payments/out',        label: 'Payment OUT',        icon: ArrowUpFromLine  },
      { to: '/staff/commission/in',       label: 'Commission IN',       icon: BadgePercent     },
      { to: '/staff/commission/out',      label: 'Commission OUT',      icon: HandCoins        },
      { to: '/staff/rto-payments',        label: 'RTO Payments',       icon: Receipt          },
      { to: '/staff/insurance-payments',  label: 'Insurance Payments', icon: ShieldCheck      },
      { to: '/staff/expenses',            label: 'Expenses',           icon: Wallet           },
    ],
  },
]

const accountantNav: NavGroup[] = [
  {
    title: 'Overview', items: [
      { to: '/accountant/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
      { to: '/accountant/files',         label: 'Files',         icon: FolderOpen      },
      { to: '/accountant/modifications', label: 'Modifications', icon: ClipboardList   },
    ],
  },
  {
    title: 'Finance', items: [
      { to: '/accountant/payments/in',          label: 'Payment IN',          icon: ArrowDownToLine  },
      { to: '/accountant/payments/out',         label: 'Payment OUT',         icon: ArrowUpFromLine  },
      { to: '/accountant/rto-payments',         label: 'RTO Payments',        icon: Receipt          },
      { to: '/accountant/insurance-payments',   label: 'Insurance Payments',  icon: ShieldCheck      },
      { to: '/accountant/expenses',             label: 'Expenses',            icon: Wallet           },
      { to: '/accountant/advances',             label: 'Advances',            icon: Landmark         },
    ],
  },
]

export default function AdminLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [userName, setUserName]     = useState('Admin')
  const [userRole, setUserRole]     = useState('admin')
  const [badgeCount, setBadgeCount] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const [showNotifs,  setShowNotifs]  = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const role = localStorage.getItem('user_role') || 'guest';
    setUserRole(role)
    try {
      const lsRaw = localStorage.getItem('an_current_user')
      const ssRaw = sessionStorage.getItem('an_current_user')

      let stored: string | null = null
      if (lsRaw) {
        const ls = JSON.parse(lsRaw)
        if (ls.role === role) stored = lsRaw
      }
      if (!stored && ssRaw) {
        const ss = JSON.parse(ssRaw)
        if (ss.role === role) stored = ssRaw
      }
      if (!stored) stored = lsRaw || ssRaw

      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.first_name || u.name || u.email?.split('@')[0] || 'Admin')
      }
    } catch { /* ignore */ }

    const handleNameSync = (e: any) => {
      if (e.detail) setUserName(e.detail);
    };
    window.addEventListener('user_name_sync', handleNameSync);
    return () => window.removeEventListener('user_name_sync', handleNameSync);
  }, [])

  useEffect(() => {
    fetchNotifications() 
    setBadgeCount(unreadCount())
    const unsub = subscribe(() => setBadgeCount(unreadCount()))
    return unsub
  }, [])

  const updatePendingRequestsCount = () => {
    try {
      const raw = localStorage.getItem('service_requests')
      if (!raw) return
      const requests = JSON.parse(raw)
      const role = localStorage.getItem('user_role')
      const userRaw = localStorage.getItem('an_current_user')
      const user = userRaw ? JSON.parse(userRaw) : null
      if (!user) return

      const consultantsList = [
        { id: 'c2d88add-f8a6-49c6-a9d4-6603ea46a459', email: 'james@gmail.com' },
        { id: '4d763da5-8ee8-4074-ac8e-fe98767c4ad8', email: 'dataentry@gmail.com' }
      ]
      const matched = consultantsList.find(c => c.email === user.email)
      const userId = matched ? matched.id : (user.id || '')

      const filtered = role === 'admin'
        ? requests
        : requests.filter((r: any) => r.consultant_id === userId)

      const pending = filtered.filter((r: any) => r.status === 'pending').length
      setPendingRequestsCount(pending)
    } catch (err) {
      console.warn("Failed to read pending requests count:", err)
    }
  }

  useEffect(() => {
    updatePendingRequestsCount()
    window.addEventListener('service_requests_updated', updatePendingRequestsCount)
    return () => window.removeEventListener('service_requests_updated', updatePendingRequestsCount)
  }, [location.pathname])

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
    sessionStorage.removeItem('an_current_user')
    navigate('/')
  }

  const closeNotifs = useCallback(() => setShowNotifs(false), [])

  // Resolve Title smoothly dynamically based on role routes
  const baseRoute = location.pathname.replace('/staff', '').replace('/accountant', '').replace('/admin', '')
  const titleMap: Record<string, string> = {
    '/dashboard': 'Dashboard', '/customers': 'Customers', '/files': 'Files',
    '/requests': 'Service Requests',
    '/payments/in': 'Payment IN', '/payments/out': 'Payment OUT',
    '/commissions/in': 'Commission IN', '/commissions/out': 'Commission OUT',
    '/rto-payments': 'RTO Payments', '/insurance-payments': 'Insurance Payments',
    '/expenses': 'Expenses', '/advances': 'Advances', '/loans': 'Loans',
    '/masters/dealers': 'Dealers', '/masters/brokers': 'Brokers',
    '/masters/finance-banks': 'Finance Banks',
    '/masters/insurance-companies': 'Insurance Companies',
    '/masters/insurance-types': 'Insurance Types',
    '/masters/expense-categories': 'Expense Categories',
    '/settings/company': 'Company Settings',
    '/settings/banks': 'Bank Accounts',
    '/settings/users': 'User Management',
    '/settings/staff': 'Staff Members',
    '/settings/accountants': 'Accountants',
    '/profile': 'My Profile',
    '/settings': 'Account Settings',
    // ⚡ NEW: Operational Overrides & Adjustments Headers Map
    '/modifications': 'Data Overrides',
    '/review-desk': 'Administrative Review Desk'
  }
  const pageTitle = titleMap[baseRoute] || 'AutoNidhi'

  const initials = userName.slice(0, 1).toUpperCase()
  
  // Choose Navigation Array based on Role
  const activeNav = userRole === 'admin' ? adminNav : (userRole === 'accountant' ? accountantNav : dataEntryNav)
  const profilePrefix = userRole === 'admin' ? '/admin' : (userRole === 'data_entry' ? '/staff' : `/${userRole.replace('_', '-')}`)

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sb-logo">
          <div className="sb-logo-mark">
            <img src={logoDark} alt="AutoNidhi" className="sidebar-logo-image" />
          </div>
        </div>

        {activeNav.map((group) => (
          <div key={group.title}>
            <div className="sb-section">{group.title}</div>
            {group.items.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={isActive ? 'active-link' : ''}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <item.icon size={16} />
                    {item.label}
                  </span>
                  {item.label === 'Service Requests' && pendingRequestsCount > 0 && (
                    <span style={{
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      minWidth: '18px',
                      height: '18px',
                      borderRadius: '99px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 5px',
                      lineHeight: 1,
                      marginRight: '4px'
                    }}>
                      {pendingRequestsCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}

        <div className="sb-foot">
          Signed in as <strong style={{ color: '#fff' }}>{userName}</strong><br />
          <span style={{ textTransform: 'capitalize' }}>{userRole.replace('_', ' ')}</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <h1>{pageTitle}</h1>

          <div className="app-user" style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                id="notif-bell-btn"
                onClick={() => { setShowNotifs(p => !p); setShowProfile(false) }}
                style={{
                  background: showNotifs ? '#eff6ff' : 'transparent',
                  border: '1.5px solid',
                  borderColor: showNotifs ? '#bfdbfe' : 'transparent',
                  borderRadius: '10px',
                  padding: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all .15s',
                  color: showNotifs ? '#2563eb' : '#64748b',
                }}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </button>
              {badgeCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#ef4444', color: '#fff',
                  fontSize: '10px', fontWeight: 700,
                  minWidth: '17px', height: '17px',
                  borderRadius: '10px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', lineHeight: 1,
                  border: '2px solid #fff',
                  pointerEvents: 'none',
                }}>
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </div>

            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                id="profile-avatar-btn"
                onClick={() => { setShowProfile(p => !p); setShowNotifs(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  background: showProfile ? '#eff6ff' : 'transparent',
                  border: '1.5px solid',
                  borderColor: showProfile ? '#bfdbfe' : 'transparent',
                  borderRadius: '10px',
                  padding: '5px 10px 5px 5px',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
                aria-label="User menu"
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {initials}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', maxWidth: '90px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName}
                </span>
                <ChevronDown size={14} color="#94a3b8"
                  style={{ transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>

              {showProfile && (
                <div style={{
                  position: 'absolute', top: '46px', right: 0,
                  width: '200px', background: '#fff',
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(15,23,42,.14), 0 2px 6px rgba(15,23,42,.06)',
                  border: '1px solid #e2e8f0',
                  zIndex: 1000, overflow: 'hidden',
                  animation: 'notifPanelIn .15s ease',
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{userName}</div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', textTransform: 'capitalize' }}>
                      {userRole.replace('_', ' ')}
                    </div>
                  </div>
                  <DropdownItem
                    icon={<User size={14} />}
                    label="My Profile"
                    onClick={() => { navigate(`${profilePrefix}/profile`); setShowProfile(false) }}
                  />
                  <DropdownItem
                    icon={<Settings size={14} />}
                    label="Account Settings"
                    onClick={() => { navigate(`${profilePrefix}/settings`); setShowProfile(false) }}
                  />
                  <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />
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

function DropdownItem({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 14px', background: hover ? (danger ? '#fff1f2' : '#f8fafc') : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        color: danger ? '#dc2626' : '#334155',
        fontSize: '13px', fontWeight: 500, transition: 'background .12s',
      }}
    >
      {icon}
      {label}
    </button>
  )
}