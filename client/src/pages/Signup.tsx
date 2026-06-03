import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const UserAddIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

// ── Role options ─────────────────────────────────────────────────────────────

interface RoleOption {
  value: string
  label: string
  desc: string
  restricted: boolean
}

const ROLES: RoleOption[] = [
  { value: 'customer',   label: 'Customer',    desc: 'Standard user access',    restricted: false },
  { value: 'accountant', label: 'Accountant',  desc: 'Finance & payment access', restricted: true  },
  { value: 'data_entry', label: 'Staff',  desc: 'File & record management', restricted: true  },
  { value: 'admin',      label: 'Admin',        desc: 'Full system access',       restricted: true  },
]

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

const Signup: React.FC = () => {
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading]     = useState(false)
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form values
  const [firstName, setFirstName]   = useState('')
  const [lastName,  setLastName]    = useState('')
  const [email,     setEmail]       = useState('')
  const [phone,     setPhone]       = useState('')
  const [password,  setPassword]    = useState('')
  const [confirm,   setConfirm]     = useState('')
  const [role,      setRole]        = useState('')
  const [passkey,   setPasskey]     = useState('')
  const [terms,     setTerms]       = useState(false)

  // UI state
  const [showPass,      setShowPass]    = useState(false)
  const [showConfirm,   setShowConfirm] = useState(false)
  const [showPasskey,   setShowPasskey] = useState(false)
  const [dropdownOpen,  setDropdownOpen] = useState(false)

  // Field errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const strength = getStrength(password)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedRole = ROLES.find(r => r.value === role)
  const isRestricted = selectedRole?.restricted ?? false

  const handleRoleSelect = (r: RoleOption) => {
    setRole(r.value)
    setDropdownOpen(false)
    setPasskey('')
    setErrors(prev => ({ ...prev, role: '', passkey: '' }))
  }

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const validate = (): boolean => {
    const newErr: Record<string, string> = {}
    if (!firstName.trim())          newErr.firstName = 'First name is required'
    if (!lastName.trim())           newErr.lastName  = 'Last name is required'
    if (!email)                     newErr.email     = 'Email is required'
    else if (!validateEmail(email)) newErr.email     = 'Please enter a valid email address'
    if (phone && !/^\+?[0-9\s\-]{10,15}$/.test(phone))
                                    newErr.phone     = 'Please enter a valid phone number'
    if (!password)                  newErr.password  = 'Password is required'
    else if (password.length < 8)   newErr.password  = 'Password must be at least 8 characters'
    if (!confirm)                   newErr.confirm   = 'Please confirm your password'
    else if (password !== confirm)  newErr.confirm   = 'Passwords do not match'
    if (!role)                      newErr.role      = 'Please select a role'
    if (isRestricted && !passkey)   newErr.passkey   = 'Passkey is required for this role'
    if (!terms)                     newErr.terms     = 'You must agree to the Terms & Conditions'
    setErrors(newErr)
    return Object.keys(newErr).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!validate()) return

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:      firstName.trim(),
          last_name:       lastName.trim(),
          email:           email.trim(),
          phone_number:    phone || null,
          password,
          confirmPassword: confirm,
          role,
          passkey: isRestricted ? passkey : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setErrorMsg('An account with this email already exists. Try signing in instead.')
        } else if (response.status === 401) {
          setErrors(prev => ({ ...prev, passkey: 'Invalid passkey for the selected role.' }))
          setErrorMsg('Invalid passkey for the selected role. Please check and try again.')
        } else {
          setErrorMsg(data.detail || 'Registration failed. Please try again.')
        }
        setLoading(false)
        return
      }

      // Save auth info
      localStorage.setItem('an_current_user', JSON.stringify({
        email: data.user.email,
        role:  data.user.role,
        name:  data.user.first_name || 'User',
      }))
      localStorage.setItem('user_role',    data.user.role)
      localStorage.setItem('access_token', data.access_token || '')

      setSuccessMsg(`Welcome, ${data.user.first_name}! Account created successfully. Redirecting…`)

      // Redirect after short delay so user sees the success message
      setTimeout(() => {
        const r = data.user.role
        if      (r === 'customer')   navigate('/portal')
        else if (r === 'accountant') navigate('/accountant/dashboard')
        else if (r === 'data_entry') navigate('/staff/dashboard')
        else                         navigate('/dashboard')
      }, 1400)

    } catch {
      setErrorMsg('Unable to reach the server. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const setField = (field: string, setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setErrors(prev => ({ ...prev, [field]: '' }))
    setErrorMsg(null)
  }

  return (
    <AuthLayout brandContent={<BrandSection />} reverse>
      <AuthCard>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Start managing operations smarter</p>

        {/* Global alerts */}
        {errorMsg && (
          <div className="auth-alert auth-alert--error" role="alert">
            <ErrorIcon />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert auth-alert--success" role="status">
            <SuccessIcon />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* First Name + Last Name (side by side) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="auth-form-group" style={{ marginBottom: 0 }}>
              <label className="auth-label" htmlFor="signup-first-name">
                First Name <span className="auth-required">*</span>
              </label>
              <input
                id="signup-first-name"
                type="text"
                className={`auth-input${errors.firstName ? ' auth-input--error' : ''}`}
                placeholder="John"
                value={firstName}
                onChange={setField('firstName', setFirstName)}
                disabled={loading}
                autoComplete="given-name"
              />
              {errors.firstName && <p className="auth-field-error">⚠ {errors.firstName}</p>}
            </div>

            <div className="auth-form-group" style={{ marginBottom: 0 }}>
              <label className="auth-label" htmlFor="signup-last-name">
                Last Name <span className="auth-required">*</span>
              </label>
              <input
                id="signup-last-name"
                type="text"
                className={`auth-input${errors.lastName ? ' auth-input--error' : ''}`}
                placeholder="Doe"
                value={lastName}
                onChange={setField('lastName', setLastName)}
                disabled={loading}
                autoComplete="family-name"
              />
              {errors.lastName && <p className="auth-field-error">⚠ {errors.lastName}</p>}
            </div>
          </div>

          {/* Bottom margin for the name row */}
          <div style={{ marginBottom: '12px' }} />

          {/* Email */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="signup-email">
              Email <span className="auth-required">*</span>
            </label>
            <input
              id="signup-email"
              type="email"
              className={`auth-input${errors.email ? ' auth-input--error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={setField('email', setEmail)}
              disabled={loading}
              autoComplete="email"
            />
            {errors.email && <p className="auth-field-error">⚠ {errors.email}</p>}
          </div>

          {/* Phone (optional) */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="signup-phone">
              Phone Number
              <span className="auth-label-optional">(optional)</span>
            </label>
            <input
              id="signup-phone"
              type="tel"
              className={`auth-input${errors.phone ? ' auth-input--error' : ''}`}
              placeholder="+91 98765 43210"
              value={phone}
              onChange={setField('phone', setPhone)}
              disabled={loading}
              autoComplete="tel"
            />
            {errors.phone && <p className="auth-field-error">⚠ {errors.phone}</p>}
          </div>

          {/* Password */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="signup-password">
              Password <span className="auth-required">*</span>
            </label>
            <div className="auth-input-wrap">
              <input
                id="signup-password"
                type={showPass ? 'text' : 'password'}
                className={`auth-input auth-input--password${errors.password ? ' auth-input--error' : ''}`}
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => { setField('password', setPassword)(e); setErrors(prev => ({ ...prev, confirm: '' })) }}
                disabled={loading}
                autoComplete="new-password"
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPass(p => !p)} tabIndex={-1} aria-label="Toggle password visibility">
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <p className="auth-field-error">⚠ {errors.password}</p>}

            {/* Strength bar */}
            {password.length > 0 && (
              <div className="auth-strength-wrap">
                <div className="auth-strength-bar">
                  {[1, 2, 3].map(seg => (
                    <div
                      key={seg}
                      className={`auth-strength-segment ${
                        strength >= seg
                          ? seg === 1 ? 'active-weak' : seg === 2 ? 'active-medium' : 'active-strong'
                          : ''
                      }`}
                    />
                  ))}
                </div>
                <span className={`auth-strength-label ${strengthClass[strength]}`}>
                  {strengthLabel[strength]}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="signup-confirm">
              Confirm Password <span className="auth-required">*</span>
            </label>
            <div className="auth-input-wrap">
              <input
                id="signup-confirm"
                type={showConfirm ? 'text' : 'password'}
                className={`auth-input auth-input--password${errors.confirm ? ' auth-input--error' : ''}`}
                placeholder="Repeat your password"
                value={confirm}
                onChange={setField('confirm', setConfirm)}
                disabled={loading}
                autoComplete="new-password"
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(p => !p)} tabIndex={-1} aria-label="Toggle confirm password visibility">
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirm && <p className="auth-field-error">⚠ {errors.confirm}</p>}
          </div>

          {/* Role — custom dropdown */}
          <div className="auth-form-group">
            <label className="auth-label">
              Role <span className="auth-required">*</span>
            </label>
            <div className={`auth-select-wrap${dropdownOpen ? ' open' : ''}`} ref={dropdownRef}>
              <div
                className={`auth-select-trigger${!role ? ' placeholder' : ''}${errors.role ? ' auth-input--error' : ''}${dropdownOpen ? ' open' : ''}`}
                onClick={() => !loading && setDropdownOpen(o => !o)}
                role="combobox"
                aria-expanded={dropdownOpen}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setDropdownOpen(o => !o)}
              >
                {selectedRole ? (
                  <span>{selectedRole.label}{selectedRole.restricted ? ' 🔒' : ''}</span>
                ) : (
                  <span>Select your role</span>
                )}
              </div>
              <span className="auth-select-chevron"><ChevronIcon /></span>

              {dropdownOpen && (
                <div className="auth-select-dropdown" role="listbox">
                  {ROLES.map(r => (
                    <div
                      key={r.value}
                      className={`auth-select-option${role === r.value ? ' selected' : ''}`}
                      onClick={() => handleRoleSelect(r)}
                      role="option"
                      aria-selected={role === r.value}
                    >
                      <div>
                        <div className="auth-select-option-name">{r.label}</div>
                        <div className="auth-select-option-desc">{r.desc}</div>
                      </div>
                      {r.restricted && (
                        <span className="auth-select-option-badge">🔒 Passkey</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.role && <p className="auth-field-error">⚠ {errors.role}</p>}
          </div>

          {/* Passkey (restricted roles only) */}
          {isRestricted && (
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="signup-passkey">
                Role Passkey <span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrap">
                <input
                  id="signup-passkey"
                  type={showPasskey ? 'text' : 'password'}
                  className={`auth-input auth-input--password${errors.passkey ? ' auth-input--error' : ''}`}
                  placeholder="Enter role passkey"
                  value={passkey}
                  onChange={setField('passkey', setPasskey)}
                  disabled={loading}
                  autoComplete="off"
                />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPasskey(p => !p)} tabIndex={-1} aria-label="Toggle passkey visibility">
                  {showPasskey ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.passkey && <p className="auth-field-error">⚠ {errors.passkey}</p>}
            </div>
          )}

          {/* Terms & Conditions */}
          <div style={{ marginBottom: errors.terms ? '4px' : '20px' }}>
            <label className="auth-checkbox-wrap">
              <input
                type="checkbox"
                className="auth-checkbox"
                id="signup-terms"
                checked={terms}
                onChange={e => { setTerms(e.target.checked); setErrors(prev => ({ ...prev, terms: '' })) }}
                disabled={loading}
              />
              <span className="auth-checkbox-label">
                I agree to the{' '}
                <a href="#" onClick={e => e.preventDefault()}>Terms & Conditions</a>
                {' '}and{' '}
                <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>
              </span>
            </label>
          </div>
          {errors.terms && <p className="auth-field-error" style={{ marginBottom: '14px' }}>⚠ {errors.terms}</p>}

          {/* Submit */}
          <button type="submit" className="auth-btn" disabled={loading} id="signup-submit-btn">
            {loading ? (
              <>
                <span className="auth-spinner" />
                Creating Account…
              </>
            ) : (
              <>
                <UserAddIcon />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}

export default Signup