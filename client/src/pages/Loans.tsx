import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Users, CreditCard,
  Shield, TrendingUp, LogOut, Car, FileText, MessageSquare,
  Search, Filter, Bell, X, CheckCircle, Clock, AlertTriangle,
  Phone, MapPin, Building2, CalendarDays, ArrowUpRight,
  ChevronRight, Eye,
} from 'lucide-react'
import '../pages.css'
import './CSS_pages/loans.css'

/* ── Sidebar nav items ── */
const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/dashboard' },
  { icon: FolderOpen,      label: 'Applications', path: '/files' },
  { icon: MessageSquare,   label: 'Leads',        path: '/leads' },
  { icon: Car,             label: 'Loans',        path: '/loans', active: true },
  { icon: Shield,          label: 'Insurance',    path: '/insurance' },
  { icon: FileText,        label: 'RTO Services', path: '/rto' },
  { icon: Users,           label: 'Customers',    path: '/customers' },
  { icon: CreditCard,      label: 'Payments',     path: '/payments' },
  { icon: TrendingUp,      label: 'Reports',      path: '/reports' },
]

/* ── Dummy Loan Data ── */
const LOANS = [
  {
    id: 'LN/25/0142',
    customerId: 'CUST/001',
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    address: 'A-12, Satellite, Ahmedabad - 380015',
    dealer: 'Shree Motors',
    bank: 'HDFC Bank',
    loanAmount: 850000,
    emi: 17240,
    totalMonths: 60,
    paidMonths: 28,
    startDate: '01 Jan, 2023',
    endDate: 'Dec, 2027',
    status: 'active',
    carModel: 'Maruti Swift ZXI',
  },
  {
    id: 'LN/25/0141',
    customerId: 'CUST/002',
    name: 'Priya Mehta',
    phone: '+91 87654 32109',
    address: 'B-45, Navrangpura, Ahmedabad - 380009',
    dealer: 'City Car World',
    bank: 'SBI',
    loanAmount: 1200000,
    emi: 21800,
    totalMonths: 72,
    paidMonths: 72,
    startDate: '15 Mar, 2019',
    endDate: 'Feb, 2025',
    status: 'completed',
    carModel: 'Hyundai Creta SX',
  },
  {
    id: 'LN/25/0139',
    customerId: 'CUST/003',
    name: 'Suresh Patel',
    phone: '+91 76543 21098',
    address: '14, Vastrapur, Ahmedabad - 380054',
    dealer: 'Autolink Dealers',
    bank: 'ICICI Bank',
    loanAmount: 630000,
    emi: 13500,
    totalMonths: 48,
    paidMonths: 30,
    startDate: '10 Jun, 2022',
    endDate: 'May, 2026',
    status: 'active',
    carModel: 'Tata Nexon XZ+',
  },
  {
    id: 'LN/25/0137',
    customerId: 'CUST/004',
    name: 'Anita Shah',
    phone: '+91 65432 10987',
    address: 'C-7, Paldi, Ahmedabad - 380007',
    dealer: 'Shree Motors',
    bank: 'Axis Bank',
    loanAmount: 980000,
    emi: 19600,
    totalMonths: 60,
    paidMonths: 18,
    startDate: '20 Nov, 2023',
    endDate: 'Oct, 2028',
    status: 'active',
    carModel: 'Kia Seltos HTX',
  },
  {
    id: 'LN/25/0133',
    customerId: 'CUST/005',
    name: 'Mohan Verma',
    phone: '+91 54321 09876',
    address: 'D-23, Bopal, Ahmedabad - 380058',
    dealer: 'Raj Auto',
    bank: 'Bank of Baroda',
    loanAmount: 550000,
    emi: 12800,
    totalMonths: 48,
    paidMonths: 48,
    startDate: '05 Apr, 2021',
    endDate: 'Mar, 2025',
    status: 'premature',
    carModel: 'Honda Amaze VX',
  },
  {
    id: 'LN/25/0130',
    customerId: 'CUST/006',
    name: 'Kavya Joshi',
    phone: '+91 91234 56789',
    address: 'E-9, Thaltej, Ahmedabad - 380059',
    dealer: 'City Car World',
    bank: 'Punjab National Bank',
    loanAmount: 1500000,
    emi: 28500,
    totalMonths: 84,
    paidMonths: 5,
    startDate: '01 Dec, 2024',
    endDate: 'Nov, 2031',
    status: 'active',
    carModel: 'Toyota Fortuner 4x4',
  },
  {
    id: 'LN/25/0128',
    customerId: 'CUST/007',
    name: 'Deepak Trivedi',
    phone: '+91 78901 23456',
    address: 'F-17, Chandkheda, Gandhinagar - 382424',
    dealer: 'Autolink Dealers',
    bank: 'HDFC Bank',
    loanAmount: 720000,
    emi: 15200,
    totalMonths: 60,
    paidMonths: 9,
    startDate: '10 Aug, 2024',
    endDate: 'Jul, 2029',
    status: 'npa',
    carModel: 'Mahindra XUV700 AX5',
  },
]

type Loan = typeof LOANS[0]

function getStatusLabel(status: string) {
  switch (status) {
    case 'active':    return 'Active'
    case 'completed': return 'Completed'
    case 'premature': return 'Premature'
    case 'npa':       return 'NPA'
    default:          return status
  }
}

function formatINR(amount: number) {
  return '₹' + amount.toLocaleString('en-IN')
}

/* ── Stat Card ── */
function LoanStatCard({
  value, label, iconColor, icon: Icon, trend, trendLabel,
}: {
  value: number; label: string; iconColor: string;
  icon: any; trend?: boolean; trendLabel?: string;
}) {
  return (
    <div className="loan-stat-card">
      <div className={`loan-stat-icon ${iconColor}`}>
        <Icon size={22} color="#fff" />
      </div>
      <div className="loan-stat-body">
        <div className="loan-stat-value">{value}</div>
        <div className="loan-stat-label">{label}</div>
        {trendLabel && (
          <div className="loan-stat-trend" style={{ color: trend ? '#10b981' : '#f59e0b' }}>
            <ArrowUpRight size={12} />
            {trendLabel}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Customer Detail Panel ── */
function CustomerDetailPanel({ loan, onClose }: { loan: Loan | null; onClose: () => void }) {
  if (!loan) {
    return (
      <div className="loans-detail-panel">
        <div className="detail-empty">
          <div className="detail-empty-icon">
            <Eye size={28} color="var(--brand-600)" />
          </div>
          <div className="detail-empty-title">No customer selected</div>
          <div className="detail-empty-sub">
            Click on any row in the table to view that customer's loan details here.
          </div>
        </div>
      </div>
    )
  }

  const pct = Math.round((loan.paidMonths / loan.totalMonths) * 100)
  const remaining = loan.totalMonths - loan.paidMonths
  const paidAmount = loan.emi * loan.paidMonths

  return (
    <div className="loans-detail-panel">
      <div className="detail-filled">
        {/* Panel header */}
        <div className="detail-panel-header">
          <span className="detail-panel-title">Customer Details</span>
          <button className="detail-close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Profile */}
        <div className="detail-profile-section">
          <div className="detail-avatar-wrap">
            <div className="detail-avatar-fallback">
              {loan.name.charAt(0)}
            </div>
            {loan.status === 'active' && <div className="detail-status-dot" />}
          </div>
          <div className="detail-customer-name">{loan.name}</div>
          <div className="detail-customer-id">{loan.customerId}</div>
          <div className="detail-customer-phone">{loan.phone}</div>
        </div>

        {/* Contact Info */}
        <div className="detail-section">
          <div className="detail-section-title">Contact & Vehicle</div>
          <div className="detail-info-row">
            <span className="detail-info-label">
              <Phone size={12} style={{ display: 'inline', marginRight: 4 }} />
              Phone
            </span>
            <span className="detail-info-value">{loan.phone}</span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-label">
              <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
              Address
            </span>
            <span className="detail-info-value" style={{ maxWidth: 160, textAlign: 'right', lineHeight: 1.4, whiteSpace: 'normal' }}>
              {loan.address}
            </span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-label">
              <Car size={12} style={{ display: 'inline', marginRight: 4 }} />
              Car Model
            </span>
            <span className="detail-info-value" style={{ maxWidth: 140, textAlign: 'right', whiteSpace: 'normal' }}>
              {loan.carModel}
            </span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-label">
              <Building2 size={12} style={{ display: 'inline', marginRight: 4 }} />
              Dealer
            </span>
            <span className="detail-info-value">{loan.dealer}</span>
          </div>
        </div>

        {/* Loan Details */}
        <div className="detail-section">
          <div className="detail-section-title">Loan Details</div>
          <div className="detail-info-row">
            <span className="detail-info-label">Loan ID</span>
            <span className="detail-info-value highlight">{loan.id}</span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-label">Loan Amount</span>
            <span className="detail-info-value amount">{formatINR(loan.loanAmount)}</span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-label">Monthly EMI</span>
            <span className="detail-info-value amount">{formatINR(loan.emi)}</span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-label">Bank</span>
            <span className="detail-info-value">{loan.bank}</span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-label">
              <CalendarDays size={12} style={{ display: 'inline', marginRight: 4 }} />
              Start Date
            </span>
            <span className="detail-info-value">{loan.startDate}</span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-label">
              <CalendarDays size={12} style={{ display: 'inline', marginRight: 4 }} />
              End Date
            </span>
            <span className="detail-info-value">{loan.endDate}</span>
          </div>
          <div className="detail-info-row">
            <span className="detail-info-label">Status</span>
            <span className={`loans-status-pill ${loan.status}`}>
              {getStatusLabel(loan.status)}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="detail-progress-section">
          <div className="detail-progress-header">
            <span className="detail-progress-label">Repayment Progress</span>
            <span className="detail-progress-pct">{pct}%</span>
          </div>
          <div className="detail-progress-bar-track">
            <div className="detail-progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="detail-progress-months">
            <span>{loan.paidMonths} months paid · {formatINR(paidAmount)}</span>
            <span>{remaining} left</span>
          </div>
        </div>

        {/* Actions */}
        <div className="detail-actions">
          <button className="detail-action-btn-primary">
            <ChevronRight size={15} /> View Full Profile
          </button>
          <button className="detail-action-btn-secondary">
            <FileText size={15} /> Download Statement
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function Loans() {
  const navigate = useNavigate()
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/')
  }

  const filtered = LOANS.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.dealer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const runningCount  = LOANS.filter(l => l.status === 'active').length
  const completedCount = LOANS.filter(l => l.status === 'completed').length
  const prematureCount = LOANS.filter(l => l.status === 'premature' || l.status === 'npa').length

  return (
    <div className="loans-layout">

      {/* ── Sidebar (10%) ── */}
      <aside className="loans-sidebar">
        <div className="loans-sidebar-logo">
          <div className="loans-logo-icon">
            <Car size={18} color="#fff" />
          </div>
          <div>
            <div className="loans-logo-title">
              Auto<span style={{ color: 'var(--gold-500)' }}>Nidhi</span>
            </div>
            <div className="loans-logo-sub">Consultancy Suite</div>
          </div>
        </div>

        <nav className="loans-sidebar-nav">
          {NAV.map(({ icon: Icon, label, path, active }) => (
            <Link
              key={label}
              to={path}
              className={`loans-nav-link ${active ? 'active' : ''}`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="loans-sidebar-bottom">
          <button className="loans-logout-btn" onClick={handleLogout}>
            <LogOut size={17} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Right side: header + content columns ── */}
      <div className="loans-body">

        {/* ── Top Header ── */}
        <header className="loans-header">
          <div className="loans-header-left">
            <h1>Loan Management</h1>
            <p>Track and manage all active, completed, and pre-closed loan accounts.</p>
          </div>
          <div className="loans-header-right">
            <button className="loans-notif-btn">
              <Bell size={18} color="var(--gray-600)" />
              <span className="notif-dot" />
            </button>
            <div className="loans-profile">
              <div className="loans-profile-avatar-fallback">A</div>
              <div className="loans-profile-info">
                <span className="loans-profile-name">Admin</span>
                <span className="loans-profile-role">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Content area: center 70% + detail panel 20% ── */}
        <div className="loans-content-area">

          {/* ── Center (70%) ── */}
          <div className="loans-center">

            {/* Quick Stats */}
            <div className="loans-stats-row">
              <LoanStatCard
                value={runningCount}
                label="Current Running Loans"
                iconColor="blue"
                icon={CreditCard}
                trend={true}
                trendLabel="+3 this month"
              />
              <LoanStatCard
                value={completedCount}
                label="Total Completed Loans"
                iconColor="green"
                icon={CheckCircle}
                trend={true}
                trendLabel="+12 this quarter"
              />
              <LoanStatCard
                value={prematureCount}
                label="Premature / NPA"
                iconColor="amber"
                icon={AlertTriangle}
                trend={false}
                trendLabel="Needs attention"
              />
            </div>

            {/* Table Card */}
            <div className="loans-table-card">
              <div className="loans-table-header">
                <span className="loans-table-title">All Loan Accounts</span>
                <div className="loans-table-actions">
                  <div className="loans-search-wrap">
                    <Search size={14} color="var(--gray-400)" className="loans-search-icon" />
                    <input
                      type="text"
                      placeholder="Search by name, ID, dealer…"
                      className="loans-search-input"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button className="loans-filter-btn">
                    <Filter size={13} /> Filter
                  </button>
                </div>
              </div>

              <div className="loans-table-scroll">
                <table className="loans-table">
                  <thead>
                    <tr>
                      {[
                        'Loan ID', 'Customer', 'Car Dealer', 'Loan Amount',
                        'Total Months', 'Paid Months', 'EMI / Month', 'Status',
                      ].map(h => (
                        <th key={h} className="loans-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(loan => (
                      <tr
                        key={loan.id}
                        className={`loans-tr ${selectedLoan?.id === loan.id ? 'selected' : ''}`}
                        onClick={() => setSelectedLoan(loan)}
                      >
                        <td className="loans-td loans-td-id">{loan.id}</td>
                        <td className="loans-td">
                          <div className="loans-td-name">{loan.name}</div>
                          <div className="loans-td-sub">{loan.customerId}</div>
                        </td>
                        <td className="loans-td">
                          <div className="loans-td-name">{loan.dealer}</div>
                          <div className="loans-td-sub">{loan.bank}</div>
                        </td>
                        <td className="loans-td">
                          <span className="loan-amount">{formatINR(loan.loanAmount)}</span>
                        </td>
                        <td className="loans-td">
                          <span className="loan-months">{loan.totalMonths} mo.</span>
                        </td>
                        <td className="loans-td">
                          <span className="loan-paid">{loan.paidMonths}</span>
                          <span className="loans-td-sub"> / {loan.totalMonths}</span>
                        </td>
                        <td className="loans-td">
                          <span className="loan-amount">{formatINR(loan.emi)}</span>
                        </td>
                        <td className="loans-td">
                          <span className={`loans-status-pill ${loan.status}`}>
                            {loan.status === 'active'    && <span>●</span>}
                            {loan.status === 'completed' && <CheckCircle size={10} />}
                            {loan.status === 'premature' && <Clock size={10} />}
                            {loan.status === 'npa'       && <AlertTriangle size={10} />}
                            {getStatusLabel(loan.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                          No loan records match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>{/* end loans-center */}

          {/* ── Customer Detail Panel (20%) ── */}
          <CustomerDetailPanel
            loan={selectedLoan}
            onClose={() => setSelectedLoan(null)}
          />

        </div>{/* end loans-content-area */}
      </div>{/* end loans-body */}
    </div>
  )
}
