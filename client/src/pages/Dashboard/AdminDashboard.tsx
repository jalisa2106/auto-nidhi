import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, FolderOpen,
  ArrowDownToLine, ArrowUpFromLine, BadgePercent, HandCoins,
  Receipt, ShieldCheck, Wallet, Landmark,
  Database, Settings, LogOut, Car, BellRing,
} from 'lucide-react'
import '../../pages.css'

interface NavItem { to: string; label: string; icon: React.ComponentType<any> }
interface NavGroup { title: string; items: NavItem[] }

const adminNav: NavGroup[] = [
  {
    title: 'Overview', items: [
      { to: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
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
      { to: '/settings/company', label: 'Company',       icon: Settings },
      { to: '/settings/banks',   label: 'Bank Accounts', icon: Settings },
      { to: '/settings/users',   label: 'Users',         icon: Users    },
    ],
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [userName, setUserName] = useState('Admin')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.first_name || u.email?.split('@')[0] || 'Admin')
      }
    } catch { /* ignore */ }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('an_current_user')
    localStorage.removeItem('user_role')
    navigate('/')
  }

  // Derive page title from current path
  const pathTitleMap: Record<string, string> = {
    '/dashboard': 'Dashboard', '/customers': 'Customers', '/files': 'Files',
    '/payments/in': 'Payment IN', '/payments/out': 'Payment OUT',
    '/commissions/in': 'Commission IN', '/commissions/out': 'Commission OUT',
    '/rto-payments': 'RTO Payments', '/insurance-payments': 'Insurance Payments',
    '/expenses': 'Expenses', '/advances': 'Advances',
    '/masters/dealers': 'Dealers', '/masters/brokers': 'Brokers',
    '/masters/finance-banks': 'Finance Banks',
    '/masters/insurance-companies': 'Insurance Companies',
    '/masters/insurance-types': 'Insurance Types',
    '/masters/expense-categories': 'Expense Categories',
    '/settings/company': 'Company Settings',
    '/settings/banks': 'Bank Accounts',
    '/settings/users': 'User Management',
  }
  const pageTitle = pathTitleMap[location.pathname] || 'AutoNidhi'

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div className="sb-logo">
          <div className="sb-logo-mark">
            <Car size={17} color="#fff" />
          </div>
          <div className="sb-brand">Auto<span>Nidhi</span></div>
        </div>

        {adminNav.map((group) => (
          <div key={group.title}>
            <div className="sb-section">{group.title}</div>
            {group.items.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={isActive ? 'active-link' : ''}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}

        <div className="sb-foot">
          Signed in as <strong style={{ color: '#fff' }}>{userName}</strong><br />
          <span style={{ textTransform: 'capitalize' }}>Admin</span>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="app-main">
        <header className="app-topbar">
          <h1>{pageTitle}</h1>
          <div className="app-user">
            <BellRing size={18} color="#64748b" />
            <div className="app-avatar">{userName.slice(0, 1).toUpperCase()}</div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}