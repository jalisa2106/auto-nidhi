import React, { useState, useEffect } from 'react'
import {
  User, Mail, Phone, Shield, Edit3, Save, X,
  Lock, Eye, EyeOff, Calendar, CheckCircle, Clock,
} from 'lucide-react'
import API_BASE from '../../lib/apiConfig'

// ── DB fields from SystemUser model ──────────────────────────────────────────
interface UserProfile {
  first_name: string   // system_user.first_name  VARCHAR(100)
  last_name: string   // system_user.last_name   VARCHAR(100)
  email: string   // system_user.email       VARCHAR(255)
  phone_number: string   // system_user.phone_number VARCHAR(15)
  role: string   // via master_role.role_name
  is_active: boolean  // system_user.is_active
  last_login: string   // system_user.last_login
  created_at: string   // system_user.created_at
}

const ROLE_META: Record<string, { bg: string; color: string; border: string; label: string; icon: string }> = {
  admin: { bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', color: '#1d4ed8', border: '#bfdbfe', label: 'Administrator', icon: '🛡️' },
  accountant: { bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', color: '#15803d', border: '#bbf7d0', label: 'Accountant', icon: '📊' },
  data_entry: { bg: 'linear-gradient(135deg,#fefce8,#fef9c3)', color: '#a16207', border: '#fde68a', label: 'Data Entry', icon: '📝' },
  customer: { bg: 'linear-gradient(135deg,#fdf4ff,#fae8ff)', color: '#7e22ce', border: '#e9d5ff', label: 'Customer', icon: '👤' },
}

function readCurrentUser(): UserProfile {
  const currentRole = localStorage.getItem('user_role') || ''
  const raw = localStorage.getItem('an_current_user')
  if (raw) {
    try {
      const u = JSON.parse(raw)
      return {
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        email: u.email || '',
        phone_number: u.phone || u.phone_number || '',
        role: u.role || currentRole || 'data_entry',
        is_active: u.is_active !== false,
        last_login: u.last_login || '',
        created_at: u.created_at || '',
      }
    } catch { /* ignore */ }
  }
  return { first_name: '', last_name: '', email: '', phone_number: '', role: 'data_entry', is_active: true, last_login: '', created_at: '' }
}

function writeCurrentUser(updates: Partial<UserProfile>) {
  const raw = localStorage.getItem('an_current_user')
  if (!raw) return
  try {
    const u = JSON.parse(raw)
    localStorage.setItem('an_current_user', JSON.stringify({ ...u, ...updates, phone: updates.phone_number ?? u.phone }))
  } catch { /* ignore */ }
}

function fmt(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DataEntryProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(readCurrentUser)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<UserProfile>(readCurrentUser)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const [pwdOpen, setPwdOpen] = useState(false)
  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [pwdBanner, setPwdBanner] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)

  const pwdStrength = (p: string) => {
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
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
    if (!editForm.last_name.trim()) { showBanner('err', 'Last name is required.'); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/v1/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
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
      writeCurrentUser(editForm)
      setProfile({ ...editForm })
      setEditing(false)
      showBanner('ok', 'Profile saved locally.')
    } finally {
      setSaving(false)
    }
  }

  const handlePwdChange = async () => {
    if (!curPwd) { setPwdBanner({ type: 'err', msg: 'Enter your current password.' }); return }
    if (newPwd.length < 8) { setPwdBanner({ type: 'err', msg: 'New password must be at least 8 characters.' }); return }
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

  const roleMeta = ROLE_META[profile.role] || ROLE_META.data_entry
  const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase() || '?'
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'No name set'

  const field = (label: string, icon: React.ReactNode, value: string) => (
    <div style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#64748b' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: value ? '#0f172a' : '#cbd5e1', fontWeight: value ? 500 : 400 }}>{value || '—'}</div>
      </div>
    </div>
  )

  const editField = (label: string, key: keyof UserProfile, type = 'text') => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        className="form-input"
        value={editForm[key] as string}
        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
        disabled={key === 'email'}
        style={{ opacity: key === 'email' ? 0.6 : 1 }}
      />
      {key === 'email' && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Email cannot be changed here.</div>}
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 32 }}>

      {/* Banner */}
      {banner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: banner.type === 'ok' ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${banner.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
          borderRadius: 10, padding: '10px 16px', marginBottom: 20,
          color: banner.type === 'ok' ? '#166534' : '#be123c', fontSize: 13.5, fontWeight: 500,
        }}>
          {banner.type === 'ok' ? <CheckCircle size={16} /> : <X size={16} />}
          {banner.msg}
        </div>
      )}

      {/* Profile Hero Card */}
      <div style={{
        borderRadius: 18, padding: 28, marginBottom: 20,
        background: roleMeta.bg, border: `1px solid ${roleMeta.border}`,
        display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{fullName}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fff', border: `1px solid ${roleMeta.border}`,
            borderRadius: 20, padding: '3px 12px', fontSize: 12.5, fontWeight: 700, color: roleMeta.color,
          }}>
            <span>{roleMeta.icon}</span> {roleMeta.label}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, color: profile.is_active ? '#15803d' : '#b91c1c',
              background: profile.is_active ? '#dcfce7' : '#fee2e2',
              borderRadius: 99, padding: '2px 10px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: profile.is_active ? '#22c55e' : '#ef4444' }} />
              {profile.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        {!editing && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => { setEditForm({ ...profile }); setEditing(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start' }}
          >
            <Edit3 size={14} /> Edit Profile
          </button>
        )}
      </div>

      {/* Edit Form */}
      {editing && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Edit Profile</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {editField('First Name', 'first_name')}
            {editField('Last Name', 'last_name')}
          </div>
          {editField('Email Address', 'email', 'email')}
          {editField('Phone Number', 'phone_number', 'tel')}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              {saving ? 'Saving...' : <><Save size={14} /> Save Changes</>}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setEditing(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Profile Info Card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '4px 24px 16px', border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.6px', padding: '16px 0 8px' }}>
          Account Information
        </div>
        {field('First Name', <User size={16} />, profile.first_name || '—')}
        {field('Last Name', <User size={16} />, profile.last_name || '—')}
        {field('Email', <Mail size={16} />, profile.email || '—')}
        {field('Phone Number', <Phone size={16} />, profile.phone_number || '—')}
        {field('Role', <Shield size={16} />, roleMeta.label)}
        {field('Last Login', <Clock size={16} />, fmt(profile.last_login))}
        {field('Member Since', <Calendar size={16} />, fmt(profile.created_at))}
      </div>

      {/* Change Password */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '4px 24px 16px', border: '1px solid #e2e8f0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0 8px', cursor: 'pointer',
        }}
          onClick={() => setPwdOpen(o => !o)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={16} color="#64748b" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.6px' }}>
              Change Password
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{pwdOpen ? '▲ Hide' : '▼ Show'}</span>
        </div>

        {pwdOpen && (
          <div>
            {pwdBanner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: pwdBanner.type === 'ok' ? '#f0fdf4' : '#fff1f2',
                border: `1px solid ${pwdBanner.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
                borderRadius: 8, padding: '9px 14px', marginBottom: 14,
                color: pwdBanner.type === 'ok' ? '#166534' : '#be123c', fontSize: 13,
              }}>
                {pwdBanner.msg}
              </div>
            )}
            {([
              { label: 'Current Password', val: curPwd, set: setCurPwd, show: showCur, setShow: setShowCur },
              { label: 'New Password', val: newPwd, set: setNewPwd, show: showNew, setShow: setShowNew },
              { label: 'Confirm Password', val: confPwd, set: setConfPwd, show: showConf, setShow: setShowConf },
            ] as const).map(({ label, val, set, show, setShow }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={show ? 'text' : 'password'}
                    className="form-input"
                    value={val}
                    onChange={e => set(e.target.value)}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s: boolean) => !s)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {label === 'New Password' && newPwd && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColor : '#e2e8f0', transition: 'background .2s' }} />
                    ))}
                    <span style={{ fontSize: 11, color: strengthColor, fontWeight: 700, marginLeft: 4 }}>{strengthLabel}</span>
                  </div>
                )}
              </div>
            ))}
            <button
              className="btn btn-primary btn-sm"
              onClick={handlePwdChange}
              disabled={pwdSaving}
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              {pwdSaving ? 'Changing...' : <><Lock size={14} /> Change Password</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
