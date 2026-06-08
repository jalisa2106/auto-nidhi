// client/src/pages/CustomerPages/CustomerProfilePage.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, Shield, Edit3, Save, X, ArrowLeft,
  Lock, Eye, EyeOff, Calendar, CheckCircle, Clock,
} from 'lucide-react'
import API_BASE from '../../lib/apiConfig'

// ── DB fields: first_name, last_name, email, phone_number, is_active, last_login, created_at
interface UserProfile {
  first_name:   string
  last_name:    string
  email:        string
  phone_number: string
  role:         string
  is_active:    boolean
  last_login:   string
  created_at:   string
}

/** Read customer profile from localStorage using DB-mapped fields */
function readCurrentUser(): UserProfile {
  const currentRole = localStorage.getItem('user_role') || 'customer'
  const raw = localStorage.getItem('an_current_user') || sessionStorage.getItem('an_current_user')
  if (raw) {
    try {
      const u = JSON.parse(raw)
      return {
        first_name:   u.first_name   || '',
        last_name:    u.last_name    || '',
        email:        u.email        || '',
        phone_number: u.phone_number || u.phone || '',
        role:         u.role         || currentRole,
        is_active:    u.is_active    !== false,
        last_login:   u.last_login   || '',
        created_at:   u.created_at   || '',
      }
    } catch { /* ignore */ }
  }
  return { first_name: '', last_name: '', email: '', phone_number: '', role: currentRole, is_active: true, last_login: '', created_at: '' }
}

/** Write updated profile back to localStorage */
function writeCurrentUser(updates: Partial<UserProfile>) {
  const raw = localStorage.getItem('an_current_user') || sessionStorage.getItem('an_current_user')
  if (!raw) return
  try {
    const u = JSON.parse(raw)
    const merged = JSON.stringify({ ...u, ...updates, phone: updates.phone_number ?? u.phone })
    if (localStorage.getItem('an_current_user')) localStorage.setItem('an_current_user', merged)
    else sessionStorage.setItem('an_current_user', merged)
  } catch { /* ignore */ }
}

function fmt(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso }
}

function pwdStrength(p: string) {
  let s = 0
  if (p.length >= 8)          s++
  if (/[A-Z]/.test(p))        s++
  if (/[0-9]/.test(p))        s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function CustomerProfilePage() {
  const navigate = useNavigate()
  const [profile,   setProfile]   = useState<UserProfile>(readCurrentUser)
  const [editing,   setEditing]   = useState(false)
  const [editForm,  setEditForm]  = useState<UserProfile>(readCurrentUser)
  const [saving,    setSaving]    = useState(false)
  const [banner,    setBanner]    = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const [pwdOpen,   setPwdOpen]   = useState(false)
  const [curPwd,    setCurPwd]    = useState('')
  const [newPwd,    setNewPwd]    = useState('')
  const [confPwd,   setConfPwd]   = useState('')
  const [showCur,   setShowCur]   = useState(false)
  const [showNew,   setShowNew]   = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [pwdBanner, setPwdBanner] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)

  const [staffChangeReason, setStaffChangeReason] = useState('')
  const [staffChangeSubmitting, setStaffChangeSubmitting] = useState(false)
  const [staffChangeBanner, setStaffChangeBanner] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const strength      = pwdStrength(newPwd)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][strength]

  useEffect(() => {
    const p = readCurrentUser()
    setProfile(p)
    setEditForm(p)
  }, [])

  const showBanner = (type: 'ok' | 'err', msg: string) => {
    setBanner({ type, msg })
    setTimeout(() => setBanner(null), 3500)
  }

  const handleSave = async () => {
    if (!editForm.first_name.trim()) { showBanner('err', 'First name is required.'); return }
    if (!editForm.last_name.trim())  { showBanner('err', 'Last name is required.');  return }
    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/v1/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name:   editForm.first_name.trim(),
          last_name:    editForm.last_name.trim(),
          phone_number: editForm.phone_number.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        showBanner('err', d.detail || 'Failed to update profile.')
      } else {
        writeCurrentUser(editForm)
        setProfile({ ...editForm })
        setEditing(false)
        // Dispatch event to notify header to refresh
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: editForm }))
        showBanner('ok', 'Profile updated successfully!')
      }
    } catch {
      // API not yet wired — save locally
      writeCurrentUser(editForm)
      setProfile({ ...editForm })
      setEditing(false)
      showBanner('ok', 'Profile saved locally.')
    } finally {
      setSaving(false)
    }
  }

  const handlePwdChange = async () => {
    if (!curPwd)            { setPwdBanner({ type: 'err', msg: 'Enter your current password.' }); return }
    if (newPwd.length < 8)  { setPwdBanner({ type: 'err', msg: 'New password must be at least 8 characters.' }); return }
    if (newPwd !== confPwd) { setPwdBanner({ type: 'err', msg: 'Passwords do not match.' }); return }
    setPwdSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: curPwd, new_password: newPwd }),
      })
      if (!res.ok) {
        const d = await res.json()
        setPwdBanner({ type: 'err', msg: d.detail || 'Failed to change password.' })
      } else {
        setPwdBanner({ type: 'ok', msg: 'Password changed successfully!' })
        setCurPwd(''); setNewPwd(''); setConfPwd('')
        setTimeout(() => { setPwdBanner(null); setPwdOpen(false) }, 2500)
      }
    } catch {
      setPwdBanner({ type: 'err', msg: 'Server unreachable. Try again later.' })
    } finally {
      setPwdSaving(false)
    }
  }

  const handleRequestStaffChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffChangeReason.trim()) {
      setStaffChangeBanner({ type: 'err', msg: 'Please provide a reason for the request.' })
      return
    }
    setStaffChangeSubmitting(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/v1/customer/modification-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ request_type: 'staff_change', reason: staffChangeReason }),
      })
      if (!res.ok) {
        const d = await res.json()
        setStaffChangeBanner({ type: 'err', msg: d.detail || 'Failed to submit request.' })
      } else {
        setStaffChangeBanner({ type: 'ok', msg: 'Your request has been sent to AutoNidhi. You will be notified once reviewed.' })
        setStaffChangeReason('')
      }
    } catch {
      setStaffChangeBanner({ type: 'err', msg: 'Server unreachable. Try again later.' })
    } finally {
      setStaffChangeSubmitting(false)
    }
  }

  const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase() || '?'
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Customer'

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '32px' }}>
      
      {/* ── Back Button ── */}
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16 }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* ── Banner ── */}
      {banner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: banner.type === 'ok' ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${banner.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
          borderLeft: `4px solid ${banner.type === 'ok' ? '#22c55e' : '#f43f5e'}`,
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          color: banner.type === 'ok' ? '#166534' : '#be123c',
          fontSize: 13.5, fontWeight: 500,
        }}>
          {banner.type === 'ok' ? <CheckCircle size={16} /> : <X size={16} />}
          {banner.msg}
        </div>
      )}

      {/* ── Hero Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #4f46e5 55%, #7c3aed 100%)',
        borderRadius: 18, padding: '22px 24px', marginBottom: 16,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(255,255,255,.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 100, width: 90, height: 90,
          borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
          {/* Avatar */}
          <div style={{
            width: 68, height: 68, borderRadius: '50%',
            background: 'rgba(255,255,255,.2)', border: '2.5px solid rgba(255,255,255,.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Name + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.2px' }}>
              {fullName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,.3)',
                color: '#fff', fontSize: 12, fontWeight: 600,
                padding: '4px 12px', borderRadius: 20,
              }}>
                👤 Customer
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: profile.is_active ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)',
                border: `1px solid ${profile.is_active ? 'rgba(34,197,94,.5)' : 'rgba(239,68,68,.5)'}`,
                color: '#fff', fontSize: 12, fontWeight: 600,
                padding: '4px 12px', borderRadius: 20,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: profile.is_active ? '#86efac' : '#fca5a5' }} />
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {!editing && (
            <button
              onClick={() => { setEditing(true); setEditForm(profile); setBanner(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.35)',
                backdropFilter: 'blur(6px)', borderRadius: 10,
                color: '#fff', fontSize: 13, fontWeight: 600,
                padding: '9px 18px', cursor: 'pointer',
              }}
            >
              <Edit3 size={14} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* ── Personal Info Card ── */}
      <div className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: 3, height: 16, background: 'linear-gradient(#2563eb,#7c3aed)', borderRadius: 2 }} />
          <span style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>Personal Information</span>
        </div>

        {!editing ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #f8fafc' }}>
              <RowField icon={<User size={13}/>}  label="FIRST NAME"    value={profile.first_name  || '—'} />
              <RowField icon={<User size={13}/>}  label="LAST NAME"     value={profile.last_name   || '—'} border />
            </div>
            <div style={{ borderBottom: '1px solid #f8fafc' }}>
              <RowField icon={<Mail size={13}/>}  label="EMAIL ADDRESS" value={profile.email        || '—'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <RowField icon={<Phone size={13}/>}  label="PHONE NUMBER"  value={profile.phone_number || 'Not provided'} empty={!profile.phone_number} />
              <RowField icon={<Shield size={13}/>} label="ROLE"          value="Customer" border />
            </div>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: 14 }}>
              <FormField
                label="First Name" required
                value={editForm.first_name}
                onChange={v => setEditForm(p => ({ ...p, first_name: v }))}
                icon={<User size={14} color="#94a3b8"/>}
                placeholder="Enter first name"
              />
              <FormField
                label="Last Name" required
                value={editForm.last_name}
                onChange={v => setEditForm(p => ({ ...p, last_name: v }))}
                icon={<User size={14} color="#94a3b8"/>}
                placeholder="Enter last name"
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <FormField
                label="Email Address"
                value={editForm.email}
                icon={<Mail size={14} color="#94a3b8"/>}
                readOnly
                hint="Email cannot be changed"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <FormField
                label="Phone Number"
                value={editForm.phone_number}
                onChange={v => setEditForm(p => ({ ...p, phone_number: v }))}
                icon={<Phone size={14} color="#94a3b8"/>}
                placeholder="+91 98765 43210"
                hint="Used for contact purposes"
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setBanner(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Account Details Card ── */}
      <div className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: 3, height: 16, background: 'linear-gradient(#22c55e,#16a34a)', borderRadius: 2 }} />
          <span style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>Account Details</span>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #f8fafc' }}>
            <RowField icon={<Calendar size={13}/>} label="MEMBER SINCE"    value={fmt(profile.created_at)} empty={!profile.created_at} />
            <RowField icon={<Clock size={13}/>}    label="LAST LOGIN"      value={fmt(profile.last_login)}  empty={!profile.last_login}  border />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <RowField icon={<CheckCircle size={13}/>} label="ACCOUNT STATUS"
              value={profile.is_active ? 'Active' : 'Inactive'}
              valueColor={profile.is_active ? '#16a34a' : '#dc2626'} />
            <RowField icon={<Shield size={13}/>} label="ACCESS LEVEL" value="Customer Portal" border />
          </div>
        </div>
      </div>

      {/* ── Change Password Card ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: pwdOpen ? '1px solid #f1f5f9' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,#fee2e2,#fecaca)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Lock size={18} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>Change Password</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Update your account password for security</div>
            </div>
          </div>
          {!pwdOpen
            ? <button className="btn btn-outline btn-sm" onClick={() => setPwdOpen(true)} style={{ flexShrink: 0 }}>Change</button>
            : <button onClick={() => { setPwdOpen(false); setCurPwd(''); setNewPwd(''); setConfPwd(''); setPwdBanner(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6, borderRadius: 8, display: 'flex' }}>
                <X size={18} />
              </button>
          }
        </div>

        {pwdOpen && (
          <div style={{ padding: 20 }}>
            {pwdBanner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: pwdBanner.type === 'ok' ? '#f0fdf4' : '#fff1f2',
                border: `1px solid ${pwdBanner.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
                borderLeft: `3px solid ${pwdBanner.type === 'ok' ? '#22c55e' : '#f43f5e'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 18,
                color: pwdBanner.type === 'ok' ? '#166534' : '#be123c', fontSize: 13, fontWeight: 500,
              }}>
                {pwdBanner.type === 'ok' ? <CheckCircle size={14}/> : <X size={14}/>}
                {pwdBanner.msg}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <PwdField label="Current Password" value={curPwd} show={showCur}
                onChange={setCurPwd} onToggle={() => setShowCur(p => !p)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <PwdField label="New Password" value={newPwd} show={showNew}
                onChange={setNewPwd} onToggle={() => setShowNew(p => !p)} />
              {newPwd && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength ? strengthColor : '#e2e8f0',
                        transition: 'background .2s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11.5, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 22 }}>
              <PwdField label="Confirm New Password" value={confPwd} show={showConf}
                onChange={setConfPwd} onToggle={() => setShowConf(p => !p)} />
              {confPwd && newPwd !== confPwd && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚠ Passwords do not match
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={handlePwdChange} disabled={pwdSaving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc2626', borderColor: '#dc2626' }}>
                <Lock size={14} /> {pwdSaving ? 'Updating…' : 'Update Password'}
              </button>
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setPwdOpen(false); setCurPwd(''); setNewPwd(''); setConfPwd(''); setPwdBanner(null) }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Request Staff Change Card ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ width: 3, height: 16, background: 'linear-gradient(#f59e0b,#ea580c)', borderRadius: 2 }} />
          <span style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>Request Staff Change</span>
        </div>
        <div style={{ padding: 20 }}>
          {staffChangeBanner && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: staffChangeBanner.type === 'ok' ? '#f0fdf4' : '#fff1f2',
              border: `1px solid ${staffChangeBanner.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
              borderLeft: `3px solid ${staffChangeBanner.type === 'ok' ? '#22c55e' : '#f43f5e'}`,
              borderRadius: 10, padding: '10px 14px', marginBottom: 18,
              color: staffChangeBanner.type === 'ok' ? '#166534' : '#be123c', fontSize: 13, fontWeight: 500,
            }}>
              {staffChangeBanner.type === 'ok' ? <CheckCircle size={14}/> : <X size={14}/>}
              {staffChangeBanner.msg}
            </div>
          )}
          <form onSubmit={handleRequestStaffChange}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Reason for Request
            </label>
            <textarea
              value={staffChangeReason}
              onChange={(e) => setStaffChangeReason(e.target.value)}
              placeholder="Why would you like to request a change of consultant?"
              style={{
                width: '100%', height: 100, padding: '10px 12px',
                border: '1.5px solid #e2e8f0', borderRadius: 10,
                fontSize: 13.5, color: '#0f172a', background: '#fff',
                boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', resize: 'vertical'
              }}
              onFocus={e => { e.target.style.borderColor = '#6366f1' }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
            />
            <button
              type="submit"
              disabled={staffChangeSubmitting}
              className="btn btn-primary btn-sm"
              style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <User size={14} /> {staffChangeSubmitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function RowField({ icon, label, value, border, valueColor, empty }: {
  icon: React.ReactNode; label: string; value: string;
  border?: boolean; valueColor?: string; empty?: boolean
}) {
  return (
    <div style={{ padding: '14px 20px', borderLeft: border ? '1px solid #f1f5f9' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <span style={{ color: '#94a3b8', display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: 14, fontWeight: 600,
        color: empty ? '#cbd5e1' : (valueColor || '#0f172a'),
        fontStyle: empty ? 'italic' : 'normal',
        wordBreak: 'break-word',
      }}>
        {value}
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, icon, placeholder, readOnly, required, hint }: {
  label: string; value: string; onChange?: (v: string) => void; icon?: React.ReactNode;
  placeholder?: string; readOnly?: boolean; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: '#ef4444', fontSize: 13 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>{icon}</span>}
        <input
          type="text" value={value} readOnly={readOnly}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', height: 42,
            padding: icon ? '0 12px 0 36px' : '0 12px',
            border: `1.5px solid ${readOnly ? '#f1f5f9' : '#e2e8f0'}`,
            borderRadius: 10, fontSize: 13.5,
            color: readOnly ? '#94a3b8' : '#0f172a',
            background: readOnly ? '#f8fafc' : '#fff',
            boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={e => { if (!readOnly) e.target.style.borderColor = '#6366f1' }}
          onBlur={e => { e.target.style.borderColor = readOnly ? '#f1f5f9' : '#e2e8f0' }}
        />
      </div>
      {hint && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function PwdField({ label, value, show, onChange, onToggle }: {
  label: string; value: string; show: boolean; onChange: (v: string) => void; onToggle: () => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <Lock size={14} color="#94a3b8" />
        </span>
        <input
          type={show ? 'text' : 'password'} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          style={{
            width: '100%', height: 42, padding: '0 44px 0 36px',
            border: '1.5px solid #e2e8f0', borderRadius: 10,
            fontSize: 13.5, color: '#0f172a', background: '#fff',
            boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={e => { e.target.style.borderColor = '#6366f1' }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
        />
        <button type="button" onClick={onToggle}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex',
          }}>
          {show ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>
    </div>
  )
}