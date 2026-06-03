import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import API_BASE from '../lib/apiConfig'
import AuthLayout from '../components/auth/AuthLayout'
import AuthCard from '../components/auth/AuthCard'
import BrandSection from '../components/auth/BrandSection'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M17.94 17.94A11 11 0 0 1 12 19C5 19 1 12 1 12a18.1 18.1 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const ErrorIcon = () => (
  <svg className="auth-alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1" fill="currentColor"/>
  </svg>
)

const SuccessIcon = () => (
  <svg className="auth-alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const LockIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

// ── Password strength ─────────────────────────────────────────────────────────

function getStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8)           score++
  if (/[A-Z]/.test(pwd))         score++
  if (/[0-9]/.test(pwd))         score++
  if (/[^A-Za-z0-9]/.test(pwd))  score++
  if (pwd.length >= 12)          score++
  if (score <= 1) return 1
  if (score <= 3) return 2
  return 3
}
const strengthLabel = ['', 'Weak', 'Medium', 'Strong'] as const
const strengthClass  = ['', 'weak', 'medium', 'strong'] as const

// ── Component ─────────────────────────────────────────────────────────────────

const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password,  setPassword]    = useState('')
  const [confirm,   setConfirm]     = useState('')
  const [showPass,  setShowPass]    = useState(false)
  const [showConf,  setShowConf]    = useState(false)
  const [loading,   setLoading]     = useState(false)
  const [errorMsg,  setErrorMsg]    = useState<string | null>(null)
  const [success,   setSuccess]     = useState(false)
  const [errors,    setErrors]      = useState<Record<string, string>>({})
  const [checkingToken, setCheckingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  const strength = getStrength(password)

  // Auto redirect after success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => navigate('/login'), 2500)
      return () => clearTimeout(t)
    }
  }, [success, navigate])

  // Verify reset token when page opens
  useEffect(() => {
    if (!token) {
      setCheckingToken(false)
      setTokenValid(false)
      return
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/v1/auth/reset-password/verify?token=${encodeURIComponent(token)}`
        )
        const data = await response.json()

        if (!response.ok) {
          setErrorMsg(data.detail || 'Password reset link is invalid or expired.')
          setTokenValid(false)
          return
        }

        setTokenValid(true)
      } catch {
        setErrorMsg('Unable to verify reset link. Please try again.')
        setTokenValid(false)
      } finally {
        setCheckingToken(false)
      }
    }

    verifyToken()
  }, [token])

  // Token checking state
  if (checkingToken) {
    return (
      <AuthLayout brandContent={<BrandSection />}>
        <AuthCard>
          <h2 className="auth-title">Checking Link</h2>
          <p className="auth-subtitle">Please wait while we verify your reset link.</p>
        </AuthCard>
      </AuthLayout>
    )
  }

  // No token guard
  if (!token) {
    return (
      <AuthLayout brandContent={<BrandSection />}>
        <AuthCard>
          <h2 className="auth-title">Invalid Link</h2>
          <p className="auth-subtitle">This reset link is missing a token.</p>
          <div className="auth-alert auth-alert--error" role="alert">
            <ErrorIcon />
            <span>The password reset link is invalid or has expired. Please request a new one.</span>
          </div>
          <Link to="/forgot-password" className="auth-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            Request New Reset Link
          </Link>
          <div className="auth-footer">
            <Link to="/login">← Back to Sign In</Link>
          </div>
        </AuthCard>
      </AuthLayout>
    )
  }

  // Invalid or expired token guard
  if (!tokenValid) {
    return (
      <AuthLayout brandContent={<BrandSection />}>
        <AuthCard>
          <h2 className="auth-title">Link Expired</h2>
          <p className="auth-subtitle">This password reset link is invalid or has expired.</p>

          <div className="auth-alert auth-alert--error" role="alert">
            <ErrorIcon />
            <span>{errorMsg || 'Please request a new reset link.'}</span>
          </div>

          <Link
            to="/forgot-password"
            className="auth-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
          >
            Request New Reset Link
          </Link>

          <div className="auth-footer">
            <Link to="/login">Back to Sign In</Link>
          </div>
        </AuthCard>
      </AuthLayout>
    )
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!password)                newErr(errs, 'password', 'Password is required')
    else if (password.length < 8) newErr(errs, 'password', 'Password must be at least 8 characters')
    if (!confirm)                 newErr(errs, 'confirm', 'Please confirm your new password')
    else if (password !== confirm) newErr(errs, 'confirm', 'Passwords do not match')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function newErr(obj: Record<string, string>, key: string, msg: string) { obj[key] = msg }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!validate()) return

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password, confirm_password: confirm }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data.detail || 'Failed to reset password. Please try again.')
        return
      }

      setSuccess(true)

    } catch {
      setErrorMsg('Unable to reach the server. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout brandContent={<BrandSection />}>
        <AuthCard>
          <h2 className="auth-title">Password Reset!</h2>
          <p className="auth-subtitle">Your password has been changed successfully</p>
          <div className="auth-alert auth-alert--success" role="status">
            <SuccessIcon />
            <span>Password updated successfully. Redirecting you to Sign In in 2 seconds…</span>
          </div>
          <Link to="/login" className="auth-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            Go to Sign In Now
          </Link>
        </AuthCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout brandContent={<BrandSection />}>
      <AuthCard>
        <h2 className="auth-title">Reset Password</h2>
        <p className="auth-subtitle">Enter your new password below</p>

        {errorMsg && (
          <div className="auth-alert auth-alert--error" role="alert">
            <ErrorIcon />
            <span>{errorMsg}</span>
            {errorMsg.includes('expired') || errorMsg.includes('Invalid') ? (
              <><br /><Link to="/forgot-password" style={{ color: 'inherit', fontWeight: 700 }}>Request a new reset link →</Link></>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* New Password */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="reset-password">
              New Password <span className="auth-required">*</span>
            </label>
            <div className="auth-input-wrap">
              <input
                id="reset-password"
                type={showPass ? 'text' : 'password'}
                className={`auth-input auth-input--password${errors.password ? ' auth-input--error' : ''}`}
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '', confirm: '' })) }}
                disabled={loading}
                autoComplete="new-password"
                autoFocus
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPass(p => !p)} tabIndex={-1} aria-label="Toggle password">
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <p className="auth-field-error">⚠ {errors.password}</p>}

            {password.length > 0 && (
              <div className="auth-strength-wrap">
                <div className="auth-strength-bar">
                  {[1, 2, 3].map(seg => (
                    <div key={seg} className={`auth-strength-segment ${
                      strength >= seg
                        ? seg === 1 ? 'active-weak' : seg === 2 ? 'active-medium' : 'active-strong'
                        : ''
                    }`} />
                  ))}
                </div>
                <span className={`auth-strength-label ${strengthClass[strength]}`}>{strengthLabel[strength]}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="reset-confirm">
              Confirm New Password <span className="auth-required">*</span>
            </label>
            <div className="auth-input-wrap">
              <input
                id="reset-confirm"
                type={showConf ? 'text' : 'password'}
                className={`auth-input auth-input--password${errors.confirm ? ' auth-input--error' : ''}`}
                placeholder="Repeat your new password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: '' })) }}
                disabled={loading}
                autoComplete="new-password"
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowConf(p => !p)} tabIndex={-1} aria-label="Toggle confirm password">
                {showConf ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirm && <p className="auth-field-error">⚠ {errors.confirm}</p>}
          </div>

          <button type="submit" className="auth-btn" disabled={loading} id="reset-submit-btn">
            {loading ? (
              <>
                <span className="auth-spinner" />
                Resetting…
              </>
            ) : (
              <>
                <LockIcon />
                Reset Password
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}

export default ResetPassword
