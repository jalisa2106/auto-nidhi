// client/src/pages/Home.tsx
import { Link } from 'react-router-dom'
import {
  CheckCircle2, ArrowRight, Car, Shield, TrendingUp, Users, Building, ShieldCheck
} from 'lucide-react'
import '../pages.css'

const features = [
  {
    icon: '📁',
    bg: '#eff6ff',
    title: 'File Management',
    desc: 'Track every loan & insurance file through its entire lifecycle — from enquiry to disbursement.',
  },
  {
    icon: '💰',
    bg: '#fef3c7',
    title: 'Payment Tracking',
    desc: 'Record all inward and outward payments with full mode-specific details (RTGS, UPI, cheque).',
  },
  {
    icon: '🏦',
    bg: '#dcfce7',
    title: 'Commission Management',
    desc: 'Track commissions from banks & insurers and payouts to agents, brokers, and dealers.',
  },
  {
    icon: '📄',
    bg: '#fce7f3',
    title: 'Document Management',
    desc: 'Upload, verify, and manage all KYC and vehicle documents with status tracking.',
  },
  {
    icon: '🔔',
    bg: '#fff7ed',
    title: 'Insurance Alerts',
    desc: 'Automated expiry alerts ensure no customer policy goes unrenewed.',
  },
  {
    icon: '📊',
    bg: '#f3e8ff',
    title: 'Reports & Analytics',
    desc: 'Monthly KPIs, advance balances, and commission outstanding at a glance.',
  },
]

export default function Home() {
  return (
    <>
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="navbar-logo">
            <div className="logo-mark">
              <Car size={20} color="#fff" />
            </div>
            Auto<span className="logo-nidhi">Nidhi</span>
          </Link>
 
          <ul className="navbar-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#about">About Us</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
 
          <div className="navbar-actions">
            <Link to="/login" className="btn btn-outline btn-sm">Sign In</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>
 
      {/* ── Hero ── */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="dot" />
              India's Smart Auto Finance Platform
            </div>
 
            <h1 className="hero-title">
              Manage Loans &<br />
              <span className="highlight">Insurance Files</span><br />
              the <span className="highlight-gold">Smart Way</span>
            </h1>
 
            <p className="hero-desc">
              AutoNidhi is a complete consultancy management system for auto loans and
              insurance — built for agents, brokers, and finance consultants across India.
            </p>
 
            <div className="hero-actions">
              <Link to="/signup" className="btn btn-primary btn-lg">
                Start Free <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Sign In
              </Link>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-value">248</div>
                <div className="hero-stat-label">Active Files</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">₹42L</div>
                <div className="hero-stat-label">Commission In</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">96</div>
                <div className="hero-stat-label">Disbursed</div>
              </div>
            </div>
          </div>

          {/* Visual panel */}
          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-header">
                <span className="hero-card-title">📋 Active Files</span>
                <span className="hero-card-status">● Live</span>
              </div>
              <div className="hero-card-metric">248</div>
              <div className="hero-card-sub">+12 this week</div>
            </div>

            <div className="hero-mini-cards">
              <div className="hero-mini-card">
                <div className="hero-mini-icon blue">
                  <TrendingUp size={18} color="var(--brand-600)" />
                </div>
                <div className="hero-mini-val">₹42L</div>
                <div className="hero-mini-label">Commission In</div>
              </div>
              <div className="hero-mini-card">
                <div className="hero-mini-icon gold">
                  <Shield size={18} color="var(--gold-600)" />
                </div>
                <div className="hero-mini-val">18</div>
                <div className="hero-mini-label">Expiring Soon</div>
              </div>
              <div className="hero-mini-card">
                <div className="hero-mini-icon green">
                  <CheckCircle2 size={18} color="#15803d" />
                </div>
                <div className="hero-mini-val">96</div>
                <div className="hero-mini-label">Disbursed</div>
              </div>
            </div>

            <div className="hero-card">
              <div className="hero-card-header">
                <span className="hero-card-title">💳 Today's Payments</span>
                <span className="badge badge-blue">4 new</span>
              </div>
              {[
                { label: 'HDFC Bank — Commission', amt: '₹38,500', color: '#15803d' },
                { label: 'New India — Insurance', amt: '₹12,200', color: '#15803d' },
                { label: 'Dealer Payout', amt: '-₹8,000', color: '#ef4444' },
              ].map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--gray-100)' : 'none' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>{p.label}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: p.color }}>{p.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-eyebrow">What We Offer</div>
          <h2 className="section-title">Everything your consultancy needs</h2>
          <p className="section-desc">
            From file creation to final disbursement — AutoNidhi handles every step
            with precision, transparency, and zero paperwork hassle.
          </p>
          <div className="features-grid">
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon" style={{ background: f.bg }}>
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Us ── */}
      <section className="features" id="about" style={{ background: 'var(--surface-0)' }}>
        <div className="container">
          <div className="section-eyebrow">About AutoNidhi</div>
          <h2 className="section-title">Empowering Auto Finance Consultants</h2>
          <p className="section-desc">
            AutoNidhi was founded to simplify and digitize the complex workflow of auto loan and insurance consultancies across India. We believe in providing robust tools that let you focus on growing your business while we handle the organization.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginTop: '40px' }}>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}><Users size={22} /></div>
              <h3>Our Mission</h3>
              <p>To eliminate paperwork bottlenecks and provide a centralized, highly secure digital space for agents, brokers, and dealers to manage their customer files seamlessly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#ecfeff', color: '#0891b2' }}><Building size={22} /></div>
              <h3>Our Vision</h3>
              <p>To become the leading digital backbone of India's auto finance ecosystem, effortlessly connecting banking protocols, insurer networks, and consultants on one unified grid.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#fef3c7', color: '#d97706' }}><ShieldCheck size={22} /></div>
              <h3>Trusted Reliability</h3>
              <p>Leading auto finance agencies, top insurance brokers, and widespread DSA networks across major Indian cities rely on AutoNidhi's resilient infrastructure every single day.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="features" id="contact" style={{ background: '#0f172a', color: '#fff' }}>
        <div className="container">
          <h2 className="section-title" style={{ color: '#fff', textAlign: 'center' }}>Get in Touch</h2>
          <p className="section-desc" style={{ color: '#94a3b8', textAlign: 'center' }}>
            Have questions about integrating AutoNidhi into your consultancy? Our dedicated support team is here to help you get started.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '40px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '14px', minWidth: '240px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Support</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>support@autonidhi.com</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '14px', minWidth: '240px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sales & Inquiries</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>+91 98765 43210</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '14px', minWidth: '240px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Head Office</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Vadodara, Gujarat</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container">
          <h2 className="cta-title">Ready to streamline your consultancy?</h2>
          <p className="cta-desc">Join hundreds of auto finance consultants already using AutoNidhi.</p>
          <Link to="/signup" className="btn btn-gold btn-lg">
            Create Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-logo">Auto<span>Nidhi</span></div>
            <div className="footer-links">
              <a href="#features">Features</a>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </div>
          </div>
          <p className="footer-copy">© 2026 AutoNidhi. Built for India's auto finance consultants.</p>
        </div>
      </footer>
    </>
  )
}