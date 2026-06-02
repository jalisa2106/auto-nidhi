import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import API_BASE from '../lib/apiConfig'
import AuthLayout from '../components/auth/AuthLayout'
import AuthCard from '../components/auth/AuthCard'
import BrandSection from '../components/auth/BrandSection'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const ErrorIcon = () => (
  <svg className="auth-alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1" fill="currentColor"/>
  </svg>
)

const InfoIcon = () => (
  <svg className="auth-alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
    <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="12" cy="8" r="1" fill="currentColor"/>
  </svg>
)

const MailIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <polyline points="2,4 12,13 22,4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────

const ForgotPassword: React.FC = () => {
  const [email,      setEmail]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [emailErr,   setEmailErr]   = useState('')
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [submitted,  setSubmitted]  = useState(false)
  // debug token returned by backend (shown in dev, hide in prod)
  const [debugToken, setDebugToken] = useState<string | null>(null)

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email) { setEmailErr('Email is required'); return }
    if (!validateEmail(email)) { setEmailErr('Please enter a valid email address'); return }
    setEmailErr('')

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data.detail || 'Something went wrong. Please try again.')
        return
      }

      setSubmitted(true)

      if (import.meta.env.DEV && data.debug_token) {
        setDebugToken(data.debug_token)
      } else {
        setDebugToken(null)
      }

    } catch {
      setErrorMsg('Unable to reach the server. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout brandContent={<BrandSection />}>
      <AuthCard>
        <h2 className="auth-title">Forgot Password</h2>
        <p className="auth-subtitle">
          {submitted
            ? 'Check your email for reset instructions'
            : "Enter your registered email and we'll send you reset instructions"}
        </p>

        {/* Error */}
        {errorMsg && (
          <div className="auth-alert auth-alert--error" role="alert">
            <ErrorIcon />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success state */}
        {submitted ? (
          <>
            <div className="auth-alert auth-alert--info" role="status">
              <InfoIcon />
              <span>
                If an account exists for <strong>{email}</strong>, you'll receive password reset instructions shortly.
              </span>
            </div>

            {/* Debug token — only for testing, remove in production */}
            {import.meta.env.DEV && debugToken && (
              <div style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '12px',
                color: '#475569',
                wordBreak: 'break-all',
              }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  🔧 Dev Mode — Reset Token:
                </strong>
                <code style={{ fontSize: '11px', color: '#7c3aed' }}>{debugToken}</code>
                <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  Go to: <strong>/reset-password?token={debugToken}</strong>
                </p>
              </div>
            )}

            <Link
              to={import.meta.env.DEV && debugToken ? `/reset-password?token=${debugToken}` : '/login'}
              className="auth-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', marginBottom: '0' }}
            >
              {import.meta.env.DEV && debugToken ? 'Reset Password Now' : 'Back to Sign In'}
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="forgot-email">
                Email Address <span className="auth-required">*</span>
              </label>
              <input
                id="forgot-email"
                type="email"
                className={`auth-input${emailErr ? ' auth-input--error' : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailErr(''); setErrorMsg(null) }}
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
              {emailErr && <p className="auth-field-error">⚠ {emailErr}</p>}
            </div>

            <button type="submit" className="auth-btn" disabled={loading} id="forgot-submit-btn">
              {loading ? (
                <>
                  <span className="auth-spinner" />
                  Sending…
                </>
              ) : (
                <>
                  <MailIcon />
                  Send Reset Link
                </>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}

export default ForgotPassword
