import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Users, CreditCard,
  Shield, TrendingUp, LogOut, Car, FileText, MessageSquare,
  Search, Filter, MoreVertical, Plus, CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import '../pages.css'
import './CSS_pages/applications.css'

/* ── Sidebar nav items ── */
const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/dashboard' },
  { icon: FolderOpen,      label: 'Applications', path: '/files', active: true },
  { icon: MessageSquare,   label: 'Leads',        path: '/leads' },
  { icon: Car,             label: 'Loans',        path: '/loans' },
  { icon: Shield,          label: 'Insurance',    path: '/insurance' },
  { icon: FileText,        label: 'RTO Services', path: '/rto' },
  { icon: Users,           label: 'Customers',    path: '/customers' },
  { icon: CreditCard,      label: 'Payments',     path: '/payments' },
  { icon: TrendingUp,      label: 'Reports',      path: '/reports' },
]

export default function Applications() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('All')

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/')
  }

  // Dummy Application Data
  const applications = [
    { id: 'APP/25/089', customer: 'Rajesh Kumar', phone: '+91 9876543210', service: 'Used Car Loan', provider: 'HDFC Bank', date: '20 May, 2026', status: 'Approved', badge: 'Loan' },
    { id: 'APP/25/088', customer: 'Priya Mehta', phone: '+91 8765432109', service: 'Comprehensive', provider: 'New India', date: '19 May, 2026', status: 'Completed', badge: 'Insurance' },
    { id: 'APP/25/087', customer: 'Suresh Patel', phone: '+91 7654321098', service: 'Ownership Transfer', provider: 'RTO Gujarat', date: '18 May, 2026', status: 'Action Needed', badge: 'RTO' },
    { id: 'APP/25/086', customer: 'Anita Shah', phone: '+91 6543210987', service: 'New Car Loan', provider: 'ICICI Bank', date: '18 May, 2026', status: 'Under Process', badge: 'Loan' },
  ]

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return { bg: '#dcfce7', text: '#15803d' }
      case 'Completed': return { bg: '#eff6ff', text: 'var(--brand-700)' }
      case 'Action Needed': return { bg: '#fef2f2', text: '#dc2626' }
      default: return { bg: '#fef3c7', text: 'var(--gold-600)' }
    }
  }

  const getBadgeColor = (badge: string) => {
    switch(badge) {
      case 'Loan': return { bg: 'var(--brand-50)', text: 'var(--brand-700)', border: 'var(--brand-200)' }
      case 'Insurance': return { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' }
      case 'RTO': return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' }
      default: return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
    }
  }

  return (
    <div className="applications-layout">
      
      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div className="sidebar-logo-container">
          <div className="sidebar-logo">
            <Car size={18} color="#fff" />
          </div>
          <div>
            <div className="sidebar-title">
              Auto<span style={{ color: 'var(--gold-500)' }}>Nidhi</span>
            </div>
            <div className="sidebar-subtitle">Consultancy Suite</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ icon: Icon, label, path, active }) => (
            <Link key={label} to={path} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon size={17} /> {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={17} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="app-main">
        
        {/* Header */}
        <div className="header-container">
          <div>
            <h1 className="header-title">Master Applications</h1>
            <p className="header-subtitle">Manage all loans, insurance, and RTO requests.</p>
          </div>
          
          <div className="header-actions">
            <div className="search-container">
              <Search size={16} color="var(--gray-400)" className="search-icon" />
              <input type="text" placeholder="Search File No. or Name..." className="search-input" />
            </div>
            <button className="new-app-btn" onClick={() => navigate('/files/new')}>
              <Plus size={16} /> New Application
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="card summary-card">
            <div className="summary-icon folder"><FolderOpen color="var(--brand-600)" /></div>
            <div><div className="summary-value">1,248</div><div className="summary-label">Total Applications</div></div>
          </div>
          <div className="card summary-card">
            <div className="summary-icon alert"><AlertCircle color="#dc2626" /></div>
            <div><div className="summary-value">12</div><div className="summary-label">Action Needed</div></div>
          </div>
          <div className="card summary-card">
            <div className="summary-icon clock"><Clock color="var(--gold-600)" /></div>
            <div><div className="summary-value">45</div><div className="summary-label">Under Process</div></div>
          </div>
          <div className="card summary-card">
            <div className="summary-icon check"><CheckCircle color="#15803d" /></div>
            <div><div className="summary-value">89</div><div className="summary-label">Completed (This Month)</div></div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="card table-section">
          
          {/* Tabs & Filters */}
          <div className="table-header">
            <div className="tabs-container">
              {['All', 'Loans', 'Insurance', 'RTO'].map(tab => (
                <div 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`tab ${activeTab === tab ? 'active' : ''}`}
                >
                  {tab}
                </div>
              ))}
            </div>
            <button className="filter-btn">
              <Filter size={14} /> Filter Status
            </button>
          </div>

          {/* Table */}
          <table className="data-table">
            <thead>
              <tr>
                {['App ID', 'Customer Info', 'Service', 'Provider / Bank', 'Date', 'Status', ''].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.map(app => {
                const sColor = getStatusColor(app.status)
                const bColor = getBadgeColor(app.badge)
                
                return (
                <tr key={app.id} className="table-row">
                  <td className="table-td td-id">{app.id}</td>
                  <td className="table-td">
                    <div className="td-customer-name">{app.customer}</div>
                    <div className="td-customer-phone">{app.phone}</div>
                  </td>
                  <td className="table-td">
                    <div className="td-service-container">
                      <span className="badge" style={{ background: bColor.bg, color: bColor.text, border: `1px solid ${bColor.border}` }}>
                        {app.badge}
                      </span>
                      <span className="td-service-name">{app.service}</span>
                    </div>
                  </td>
                  <td className="table-td td-provider">{app.provider}</td>
                  <td className="table-td td-date">{app.date}</td>
                  <td className="table-td">
                    <span className="status-pill" style={{ background: sColor.bg, color: sColor.text }}>
                      {app.status}
                    </span>
                  </td>
                  <td className="table-td" style={{ textAlign: 'right' }}>
                    <button className="action-btn">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>

        </div>
      </main>
    </div>
  )
}