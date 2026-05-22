import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, Shield, FileText, Clock, 
  CheckCircle2, AlertCircle, ArrowRight, User, LogOut, LayoutDashboard, History
} from 'lucide-react';

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [requestStats] = useState({
    active: 2,
    actionNeeded: 1,
    completed: 5
  });

  const [recentRequests] = useState([
    { id: 'REQ/26/0102', service: 'Used Car Loan', date: '21 May, 2026', status: 'Under Process', color: 'var(--gold-600)', bg: '#fef3c7' },
    { id: 'REQ/26/0094', service: 'Comprehensive Insurance', date: '15 May, 2026', status: 'Action Needed', color: '#dc2626', bg: '#fef2f2' },
  ]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1)', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── Top Navigation Bar ── */}
      <header style={{
        background: 'var(--surface-0)', borderBottom: '1px solid var(--gray-100)',
        padding: '0 40px', height: 70, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--brand-600), var(--brand-800))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Car size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)' }}>
              Auto<span style={{ color: 'var(--gold-500)' }}>Nidhi</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)', fontWeight: 500 }}>Customer Portal</div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...navLinkStyle, background: 'var(--brand-50)', color: 'var(--brand-700)', fontWeight: 600 }}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button style={navLinkStyle} onClick={() => navigate('/customer/history')}>
            <History size={16} /> My Requests
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-900)' }}>Tribhuvan Gandhi</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Client Account</div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-700)' }}>
              <User size={18} />
            </div>
          </div>
          
          <div style={{ width: 1, height: 24, background: 'var(--gray-200)' }}></div>
          
          <button onClick={handleLogout} style={logoutBtnStyle} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── Screen-Filling Content Body ── */}
      <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: 32, width: '100%', boxSizing: 'border-box' }}>
        
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)', margin: '0 0 6px 0' }}>
            Welcome back! 👋
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', margin: 0 }}>
            Track your ongoing services or apply for a new configuration.
          </p>
        </div>

        {/* Status Tracker Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <div className="card" style={statCardStyle}>
            <div style={{ ...iconContainerStyle, background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={statValueStyle}>{requestStats.active}</div>
              <div style={statLabelStyle}>Active Requests</div>
            </div>
          </div>

          <div className="card" style={statCardStyle}>
            <div style={{ ...iconContainerStyle, background: '#fef2f2', color: '#dc2626' }}>
              <AlertCircle size={22} />
            </div>
            <div>
              <div style={statValueStyle}>{requestStats.actionNeeded}</div>
              <div style={statLabelStyle}>Action Needed (Resubmit Docs)</div>
            </div>
          </div>

          <div className="card" style={statCardStyle}>
            <div style={{ ...iconContainerStyle, background: '#dcfce7', color: '#15803d' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={statValueStyle}>{requestStats.completed}</div>
              <div style={statLabelStyle}>Completed Services</div>
            </div>
          </div>
        </div>

        {/* Master Fluid Twin-Column Interface Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32, alignItems: 'start', flex: 1 }}>
          
          {/* Action Operations Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
              Apply for a New Service
            </h2>
            
            <div onClick={() => navigate('/apply/loan')} style={serviceCardStyle}>
              <div style={{ ...serviceIconStyle, background: 'var(--brand-600)' }}><Car color="#fff" size={22} /></div>
              <div style={{ flex: 1 }}>
                <h3 style={serviceTitleStyle}>Vehicle Financing / Car Loan</h3>
                <p style={serviceDescStyle}>Get competitive interest rates for new or used vehicles directly from premium banks.</p>
              </div>
              <ArrowRight size={18} color="var(--gray-400)" />
            </div>

            <div onClick={() => navigate('/apply/insurance')} style={serviceCardStyle}>
              <div style={{ ...serviceIconStyle, background: '#8b5cf6' }}><Shield color="#fff" size={22} /></div>
              <div style={{ flex: 1 }}>
                <h3 style={serviceTitleStyle}>Vehicle Insurance</h3>
                <p style={serviceDescStyle}>Apply for fresh coverage or renew third-party and comprehensive insurance plans quickly.</p>
              </div>
              <ArrowRight size={18} color="var(--gray-400)" />
            </div>

            <div onClick={() => navigate('/apply/rto')} style={serviceCardStyle}>
              <div style={{ ...serviceIconStyle, background: '#f59e0b' }}><FileText color="#fff" size={22} /></div>
              <div style={{ flex: 1 }}>
                <h3 style={serviceTitleStyle}>RTO Management Services</h3>
                <p style={serviceDescStyle}>Hassle-free ownership transfers, clearance certificates (NOC), and fitness processing.</p>
              </div>
              <ArrowRight size={18} color="var(--gray-400)" />
            </div>
          </div>

          {/* Context Feed Sidebar Tracking Container */}
          <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24, height: '100%', minHeight: 380 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
              Recent Requests Log
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {recentRequests.map(req => (
                <div key={req.id} style={{ paddingBottom: 20, borderBottom: '1px solid var(--gray-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gray-800)' }}>{req.service}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}>ID: {req.id} • {req.date}</div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '5px 12px', borderRadius: 99, color: req.color, background: req.bg }}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

const navLinkStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--gray-600)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' };
const logoutBtnStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, border: '1px solid var(--gray-200)', background: 'transparent', color: 'var(--gray-400)', cursor: 'pointer', transition: 'all 0.2s' };

const statCardStyle = { padding: 24, display: 'flex', alignItems: 'center', gap: 20 };
const iconContainerStyle = { width: 54, height: 54, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const statValueStyle = { fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1, marginBottom: 6 };
const statLabelStyle = { fontSize: '0.82rem', color: 'var(--gray-400)', fontWeight: 500 };

const serviceCardStyle = { display: 'flex', alignItems: 'center', gap: 24, padding: 24, background: 'var(--surface-0)', border: '1px solid var(--gray-200)', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-xs)' };
const serviceIconStyle = { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const serviceTitleStyle = { fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 6px 0' };
const serviceDescStyle = { fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0, lineHeight: 1.4 };