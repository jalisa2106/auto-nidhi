import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API_BASE from '../lib/apiConfig'
import AuthLayout from '../components/auth/AuthLayout'
import AuthCard from '../components/auth/AuthCard'
import BrandSection from '../components/auth/BrandSection'

// ── SVG icons ────────────────────────────────────────────────────────────────

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

const LoginIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────

const Login: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading]       = useState(false)
  const [showPass, setShowPass]     = useState(false)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)

  // Controlled form values
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [remember, setRemember]   = useState(false)

  // Inline field errors
  const [emailErr, setEmailErr]   = useState('')
  const [passErr, setPassErr]     = useState('')

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    // Client-side validation
    let valid = true
    if (!email) { setEmailErr('Email is required'); valid = false }
    else if (!validateEmail(email)) { setEmailErr('Please enter a valid email'); valid = false }
    else setEmailErr('')

    if (!password) { setPassErr('Password is required'); valid = false }
    else setPassErr('')

    if (!valid) return

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          setErrorMsg('Invalid email or password. Please check your credentials and try again.')
        } else {
          setErrorMsg(data.detail || 'Login failed. Please try again.')
        }
        setLoading(false)
        return
      }

      // Persist auth — always clear the OTHER storage first to prevent
      // stale sessions (e.g. customer "remember me" bleeding into admin login).
      const userPayload = JSON.stringify({
        email:       data.user.email,
        role:        data.user.role,
        first_name:  data.user.first_name  || '',
        last_name:   data.user.last_name   || '',
        phone:       data.user.phone_number || '',
        is_active:   data.user.is_active   ?? true,
        last_login:  data.user.last_login  || new Date().toISOString(),
        created_at:  data.user.created_at  || '',
      })
      if (remember) {
        localStorage.setItem('an_current_user', userPayload)
        sessionStorage.removeItem('an_current_user')   // clear any old session-only login
      } else {
        sessionStorage.setItem('an_current_user', userPayload)
        localStorage.removeItem('an_current_user')     // clear any old "remember me" login
      }
      localStorage.setItem('user_role',    data.user.role)
      localStorage.setItem('access_token', data.access_token || '')

      // Redirect by role
      const role = data.user.role
      if      (role === 'customer')   navigate('/portal')
      else if (role === 'accountant') navigate('/accountant/dashboard')
      else if (role === 'data_entry') navigate('/data-entry/dashboard')
      else                            navigate('/dashboard')

    } catch {
      setErrorMsg('Unable to reach the server. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout brandContent={<BrandSection />}>
      <AuthCard>
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Login to continue to Auto-Nidhi</p>

        {/* Inline error alert */}
        {errorMsg && (
          <div className="auth-alert auth-alert--error" role="alert">
            <ErrorIcon />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="login-email">
              Email <span className="auth-required">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              className={`auth-input${emailErr ? ' auth-input--error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailErr('') }}
              disabled={loading}
              autoComplete="email"
            />
            {emailErr && <p className="auth-field-error">⚠ {emailErr}</p>}
          </div>

          {/* Password */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="login-password">
              Password <span className="auth-required">*</span>
            </label>
            <div className="auth-input-wrap">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className={`auth-input auth-input--password${passErr ? ' auth-input--error' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setPassErr('') }}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPass(p => !p)}
                tabIndex={-1}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {passErr && <p className="auth-field-error">⚠ {passErr}</p>}
          </div>

          {/* Remember me + Forgot password */}
          <div className="auth-remember-row">
            <label className="auth-checkbox-wrap" style={{ margin: 0 }}>
              <input
                type="checkbox"
                className="auth-checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                id="remember-me"
              />
              <span className="auth-checkbox-label" style={{ margin: 0 }}>Remember me</span>
            </label>
            <Link to="/forgot-password" className="auth-forgot-link">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button type="submit" className="auth-btn" disabled={loading} id="login-submit-btn">
            {loading ? (
              <>
                <span className="auth-spinner" />
                Signing in…
              </>
            ) : (
              <>
                <LoginIcon />
                Login
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup">Create account</Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}

export default Login