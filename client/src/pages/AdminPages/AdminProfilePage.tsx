// client/src/pages/AdminPages/AdminProfilePage.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, Shield, Edit3, Save, X, ArrowLeft,
  Lock, Eye, EyeOff, Calendar, CheckCircle, Clock,
} from 'lucide-react'
import API_BASE from '../../lib/apiConfig'

interface UserProfile {
  first_name:  string
  last_name:   string
  email:       string
  phone_number: string
  role:        string
  is_active:   boolean
  last_login:  string
  created_at:  string
}

const ROLE_META: Record<string, { bg: string; color: string; border: string; label: string; icon: string }> = {
  admin:      { bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', color: '#1d4ed8', border: '#bfdbfe', label: 'Administrator', icon: '🛡️' },
  accountant: { bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', color: '#15803d', border: '#bbf7d0', label: 'Accountant',    icon: '📊' },
  data_entry: { bg: 'linear-gradient(135deg,#fefce8,#fef9c3)', color: '#a16207', border: '#fde68a', label: 'Data Entry',    icon: '📝' },
  customer:   { bg: 'linear-gradient(135deg,#fdf4ff,#fae8ff)', color: '#7e22ce', border: '#e9d5ff', label: 'Customer',      icon: '👤' },
}

/** Read the correct user from storage, using user_role to disambiguate */
function readCurrentUser(): UserProfile {
  const currentRole = localStorage.getItem('user_role') || ''
  const lsRaw = localStorage.getItem('an_current_user')
  const ssRaw = sessionStorage.getItem('an_current_user')
  let raw: string | null = null
  if (lsRaw) {
    try { const ls = JSON.parse(lsRaw); if (ls.role === currentRole) raw = lsRaw } catch { /* ignore */ }
  }
  if (!raw && ssRaw) {
    try { const ss = JSON.parse(ssRaw); if (ss.role === currentRole) raw = ssRaw } catch { /* ignore */ }
  }
  if (!raw) raw = lsRaw || ssRaw
  if (raw) {
    try {
      const u = JSON.parse(raw)
      return {
        first_name:   u.first_name   || '',
        last_name:    u.last_name    || '',
        email:        u.email        || '',
        phone_number: u.phone        || u.phone_number || '',
        role:         u.role         || currentRole    || 'admin',
        is_active:    u.is_active    !== false,
        last_login:   u.last_login   || '',
        created_at:   u.created_at   || '',
      }
    } catch { /* ignore */ }
  }
  return { first_name: '', last_name: '', email: '', phone_number: '', role: currentRole || 'admin', is_active: true, last_login: '', created_at: '' }
}

/** Write updated profile back to the correct storage */
function writeCurrentUser(updates: Partial<UserProfile>) {
  const currentRole = localStorage.getItem('user_role') || ''
  const lsRaw = localStorage.getItem('an_current_user')
  const ssRaw = sessionStorage.getItem('an_current_user')
  const updateInStorage = (raw: string | null, setter: (v: string) => void) => {
    if (!raw) return
    try {
      const u = JSON.parse(raw)
      setter(JSON.stringify({ ...u, ...updates, phone: updates.phone_number ?? u.phone }))
    } catch { /* ignore */ }
  }
  if (lsRaw) {
    try {
      const ls = JSON.parse(lsRaw)
      if (ls.role === currentRole) { updateInStorage(lsRaw, v => localStorage.setItem('an_current_user', v)); return }
    } catch { /* ignore */ }
  }
  if (ssRaw) updateInStorage(ssRaw, v => sessionStorage.setItem('an_current_user', v))
}

function fmt(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminProfilePage() {
  const navigate = useNavigate()
  const [profile,    setProfile]    = useState<UserProfile>(readCurrentUser)
  const [editing,    setEditing]    = useState(false)
  const [editForm,   setEditForm]   = useState<UserProfile>(readCurrentUser)
  const [saving,     setSaving]     = useState(false)
  const [banner,     setBanner]     = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Password section
  const [pwdOpen,    setPwdOpen]    = useState(false)
  const [curPwd,     setCurPwd]     = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [confPwd,    setConfPwd]    = useState('')
  const [showCur,    setShowCur]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [showConf,   setShowConf]   = useState(false)
  const [pwdBanner,  setPwdBanner]  = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [pwdSaving,  setPwdSaving]  = useState(false)

  // Pwd strength
  const pwdStrength = (p: string) => {
    let s = 0
    if (p.length >= 8)          s++
    if (/[A-Z]/.test(p))        s++
    if (/[0-9]/.test(p))        s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strength = pwdStrength(newPwd)
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

  const roleMeta = ROLE_META[profile.role] || ROLE_META.admin
  const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase() || '?'
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'No name set'

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '32px' }}>

      {/* ── Back Button ── */}
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16 }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* ── Global Banner ── */}
      {banner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: banner.type === 'ok' ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${banner.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
          borderLeft: `4px solid ${banner.type === 'ok' ? '#22c55e' : '#f43f5e'}`,
          borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
          color: banner.type === 'ok' ? '#166534' : '#be123c',
          fontSize: '13.5px', fontWeight: 500, animation: 'fadeIn .2s ease',
        }}>
          {banner.type === 'ok' ? <CheckCircle size={16} /> : <X size={16} />}
          {banner.msg}
        </div>
      )}

      {/* ── Hero Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #4f46e5 55%, #7c3aed 100%)',
        borderRadius: '18px', padding: '22px 24px', marginBottom: '16px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px',
          borderRadius: '50%', background: 'rgba(255,255,255,.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-30px', right: '100px', width: '90px', height: '90px',
          borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

        {/* Single horizontal row: avatar | name+badges | edit button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', position: 'relative' }}>

          {/* Avatar */}
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'rgba(255,255,255,.2)',
            border: '2.5px solid rgba(255,255,255,.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 800, color: '#fff',
            flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Name + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '8px', letterSpacing: '-0.2px' }}>
              {fullName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,.3)',
                color: '#fff', fontSize: '12px', fontWeight: 600,
                padding: '4px 12px', borderRadius: '20px',
              }}>
                {roleMeta.icon} {roleMeta.label}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: profile.is_active ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)',
                border: `1px solid ${profile.is_active ? 'rgba(34,197,94,.5)' : 'rgba(239,68,68,.5)'}`,
                color: '#fff', fontSize: '12px', fontWeight: 600,
                padding: '4px 12px', borderRadius: '20px',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%',
                  background: profile.is_active ? '#86efac' : '#fca5a5' }} />
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Edit Profile button — always on the far right */}
          {!editing && (
            <button
              onClick={() => { setEditing(true); setEditForm(profile); setBanner(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0,
                background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.35)',
                backdropFilter: 'blur(6px)', borderRadius: '10px',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                padding: '9px 18px', cursor: 'pointer', transition: 'background .15s',
              }}
            >
              <Edit3 size={14} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* ── Profile Details Card ── */}
      <div className="card" style={{ marginBottom: '14px', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: '3px', height: '16px', background: 'linear-gradient(#2563eb,#7c3aed)', borderRadius: '2px' }} />
          <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#0f172a' }}>Personal Information</span>
        </div>

        {!editing ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #f8fafc' }}>
              <RowField icon={<User size={13}/>}  label="FIRST NAME"    value={profile.first_name  || '—'} />
              <RowField icon={<User size={13}/>}  label="LAST NAME"     value={profile.last_name   || '—'} border />
            </div>
            <div style={{ borderBottom: '1px solid #f8fafc' }}>
              <RowField icon={<Mail size={13}/>}  label="EMAIL ADDRESS" value={profile.email || '—'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <RowField icon={<Phone size={13}/>}  label="PHONE NUMBER" value={profile.phone_number || 'Not provided'} empty={!profile.phone_number} />
              <RowField icon={<Shield size={13}/>} label="ROLE"         value={roleMeta.label} border />
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
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
            <div style={{ marginBottom: '14px' }}>
              <FormField
                label="Email Address"
                value={editForm.email}
                icon={<Mail size={14} color="#94a3b8"/>}
                readOnly
                hint="Email cannot be changed"
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <FormField
                label="Phone Number"
                value={editForm.phone_number}
                onChange={v => setEditForm(p => ({ ...p, phone_number: v }))}
                icon={<Phone size={14} color="#94a3b8"/>}
                placeholder="+91 98765 43210"
                hint="Optional — used for contact purposes"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setBanner(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Account Details Card ── */}
      <div className="card" style={{ marginBottom: '14px', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: '3px', height: '16px', background: 'linear-gradient(#22c55e,#16a34a)', borderRadius: '2px' }} />
          <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#0f172a' }}>Account Details</span>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #f8fafc' }}>
            <RowField icon={<Calendar size={13}/>} label="MEMBER SINCE"
              value={fmt(profile.created_at)}
              empty={!profile.created_at} />
            <RowField icon={<Clock size={13}/>}    label="LAST LOGIN"
              value={fmt(profile.last_login)}
              empty={!profile.last_login} border />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <RowField icon={<CheckCircle size={13}/>} label="ACCOUNT STATUS"
              value={profile.is_active ? 'Active' : 'Inactive'}
              valueColor={profile.is_active ? '#16a34a' : '#dc2626'} />
            <RowField icon={<Shield size={13}/>}     label="ACCESS LEVEL" value={roleMeta.label} border />
          </div>
        </div>
      </div>

      {/* ── Change Password Card ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: pwdOpen ? '1px solid #f1f5f9' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg,#fee2e2,#fecaca)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Lock size={18} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#0f172a' }}>Change Password</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Update your account password for security</div>
            </div>
          </div>
          {!pwdOpen
            ? <button className="btn btn-outline btn-sm"
                onClick={() => setPwdOpen(true)}
                style={{ flexShrink: 0 }}>
                Change
              </button>
            : <button
                onClick={() => { setPwdOpen(false); setCurPwd(''); setNewPwd(''); setConfPwd(''); setPwdBanner(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: '6px', borderRadius: '8px', flexShrink: 0 }}>
                <X size={18} />
              </button>
          }
        </div>

        {/* Expandable form */}
        {pwdOpen && (
          <div style={{ padding: '20px', animation: 'fadeIn .15s ease' }}>

            {/* Status banner */}
            {pwdBanner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: pwdBanner.type === 'ok' ? '#f0fdf4' : '#fff1f2',
                border: `1px solid ${pwdBanner.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
                borderLeft: `3px solid ${pwdBanner.type === 'ok' ? '#22c55e' : '#f43f5e'}`,
                borderRadius: '10px', padding: '10px 14px', marginBottom: '18px',
                color: pwdBanner.type === 'ok' ? '#166534' : '#be123c', fontSize: '13px', fontWeight: 500,
              }}>
                {pwdBanner.type === 'ok' ? <CheckCircle size={14}/> : <X size={14}/>}
                {pwdBanner.msg}
              </div>
            )}

            {/* Current password */}
            <div style={{ marginBottom: '16px' }}>
              <PwdField label="Current Password" value={curPwd} show={showCur}
                onChange={setCurPwd} onToggle={() => setShowCur(p => !p)} />
            </div>

            {/* New password + strength bar */}
            <div style={{ marginBottom: '16px' }}>
              <PwdField label="New Password" value={newPwd} show={showNew}
                onChange={setNewPwd} onToggle={() => setShowNew(p => !p)} />
              {newPwd && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '3px', borderRadius: '2px',
                        background: i <= strength ? strengthColor : '#e2e8f0',
                        transition: 'background .2s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '11.5px', color: strengthColor, fontWeight: 600 }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: '22px' }}>
              <PwdField label="Confirm New Password" value={confPwd} show={showConf}
                onChange={setConfPwd} onToggle={() => setShowConf(p => !p)} />
              {confPwd && newPwd !== confPwd && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⚠ Passwords do not match
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handlePwdChange}
                disabled={pwdSaving}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dc2626', borderColor: '#dc2626' }}>
                <Lock size={14} /> {pwdSaving ? 'Updating…' : 'Update Password'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setPwdOpen(false); setCurPwd(''); setNewPwd(''); setConfPwd(''); setPwdBanner(null) }}>
                Cancel
              </button>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Clean row-style field — no individual card background, separated by parent grid borders */
function RowField({ icon, label, value, border, valueColor, empty }: {
  icon: React.ReactNode; label: string; value: string;
  border?: boolean; valueColor?: string; empty?: boolean
}) {
  return (
    <div style={{
      padding: '14px 20px',
      borderLeft: border ? '1px solid #f1f5f9' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
        <span style={{ color: '#94a3b8', display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: '14px', fontWeight: 600,
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
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
        {label}
        {required && <span style={{ color: '#ef4444', fontSize: '13px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
            {icon}
          </span>
        )}
        <input
          type="text" value={value} readOnly={readOnly}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', height: '42px',
            padding: icon ? '0 12px 0 36px' : '0 12px',
            border: `1.5px solid ${readOnly ? '#f1f5f9' : '#e2e8f0'}`,
            borderRadius: '10px',
            fontSize: '13.5px',
            color: readOnly ? '#94a3b8' : '#0f172a',
            background: readOnly ? '#f8fafc' : '#fff',
            boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
            transition: 'border-color .15s',
          }}
          onFocus={e => { if (!readOnly) e.target.style.borderColor = '#6366f1' }}
          onBlur={e => { e.target.style.borderColor = readOnly ? '#f1f5f9' : '#e2e8f0' }}
        />
      </div>
      {hint && <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>{hint}</div>}
    </div>
  )
}

function PwdField({ label, value, show, onChange, onToggle }: {
  label: string; value: string; show: boolean; onChange: (v: string) => void; onToggle: () => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <Lock size={14} color="#94a3b8" />
        </span>
        <input
          type={show ? 'text' : 'password'} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          style={{
            width: '100%', height: '42px', padding: '0 44px 0 36px',
            border: '1.5px solid #e2e8f0', borderRadius: '10px',
            fontSize: '13.5px', color: '#0f172a', background: '#fff',
            boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
            transition: 'border-color .15s',
          }}
          onFocus={e => { e.target.style.borderColor = '#6366f1' }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
        />
        <button type="button" onClick={onToggle}
          style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex',
          }}>
          {show ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>
    </div>
  )
}