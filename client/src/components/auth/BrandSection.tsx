import React from 'react'

const BrandSection: React.FC = () => {
  return (
    <>
      {/* Logo */}
      <div className="auth-brand-logo">
        {/* Car SVG icon */}
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="8" fill="#2563eb" fillOpacity="0.12"/>
          <path d="M5 13L6.5 8.5C6.83 7.6 7.69 7 8.65 7h6.7c.96 0 1.82.6 2.15 1.5L19 13" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round"/>
          <rect x="3" y="13" width="18" height="5" rx="2" stroke="#2563eb" strokeWidth="1.6"/>
          <circle cx="7.5" cy="18" r="1.5" fill="#2563eb"/>
          <circle cx="16.5" cy="18" r="1.5" fill="#2563eb"/>
        </svg>
        <h1>Auto-Nidhi</h1>
      </div>

      {/* Heading */}
      <h2 className="auth-brand-heading">
        Driving <span>Smarter</span>
        <br />
        Business Operations
      </h2>

      {/* Subtext */}
      <p className="auth-brand-subtext">
        Auto consultancy powered by automation, compliance, and
        enterprise-grade workflow management.
      </p>

      {/* Features */}
      <div className="auth-feature-list">
        <div className="auth-feature-item">
          <div className="auth-feature-icon">
            {/* Shield / Trusted */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V7L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span>Trusted Operations</span>
        </div>

        <div className="auth-feature-item">
          <div className="auth-feature-icon">
            {/* Document */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span>Documentation Flow</span>
        </div>

        <div className="auth-feature-item">
          <div className="auth-feature-icon">
            {/* Bar chart */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="12" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="10" y="7" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="17" y="3" width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
          </div>
          <span>Business Insights</span>
        </div>
      </div>
    </>
  )
}

export default BrandSection
