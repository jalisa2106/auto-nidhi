import React, { useState } from 'react'
import {
  Bell, Monitor, Clock, Info, Shield, CheckCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Notification preferences ──────────────────────────────────────────────────

interface NotifPref { key: string; label: string; desc: string; enabled: boolean; color: string; icon: string }

const DEFAULT_PREFS: NotifPref[] = [
  { key: 'added',   label: 'Record Added',    desc: 'When payments, customers or files are created', color: '#16a34a', icon: '✚', enabled: true  },
  { key: 'deleted', label: 'Record Deleted',  desc: 'When any record is removed from the system',    color: '#dc2626', icon: '✕', enabled: true  },
  { key: 'updated', label: 'Record Updated',  desc: 'When existing records are edited',              color: '#2563eb', icon: '✎', enabled: true  },
  { key: 'info',    label: 'Info & Reminders',desc: 'System info messages and reminders',            color: '#0891b2', icon: 'ℹ', enabled: true  },
  { key: 'error',   label: 'Error Alerts',    desc: 'Failed operations or system warnings',          color: '#d97706', icon: '⚠', enabled: true  },
]

const PREF_KEY = 'an_notif_prefs'

function loadPrefs(): NotifPref[] {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (raw) {
      const saved: Record<string, boolean> = JSON.parse(raw)
      return DEFAULT_PREFS.map(p => ({ ...p, enabled: saved[p.key] ?? p.enabled }))
    }
  } catch { /* ignore */ }
  return DEFAULT_PREFS
}

function savePrefs(prefs: NotifPref[]) {
  const map: Record<string, boolean> = {}
  prefs.forEach(p => { map[p.key] = p.enabled })
  localStorage.setItem(PREF_KEY, JSON.stringify(map))
}

// ── JWT decode helper ─────────────────────────────────────────────────────────

function decodeJwt(): { iat?: number; exp?: number; sub?: string; role?: string } {
  try {
    const token = localStorage.getItem('access_token')
    if (token) return JSON.parse(atob(token.split('.')[1]))
  } catch { /* ignore */ }
  return {}
}

function fmtDate(ts?: number) {
  if (!ts) return '—'
  try { return new Date(ts * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '—' }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [prefs,    setPrefs]   = useState<NotifPref[]>(loadPrefs)
  const [prefSaved, setPrefSaved] = useState(false)

  // Section collapse state
  const [notifOpen,   setNotifOpen]   = useState(true)
  const [displayOpen, setDisplayOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [securityOpen,setSecurityOpen]= useState(false)

  const jwt     = decodeJwt()
  const role    = localStorage.getItem('user_role') || 'admin'
  const hasToken = !!localStorage.getItem('access_token')

  const togglePref = (key: string) => {
    setPrefs(prev => prev.map(p => p.key === key ? { ...p, enabled: !p.enabled } : p))
    setPrefSaved(false)
  }

  const handleSavePrefs = () => {
    savePrefs(prefs)
    setPrefSaved(true)
    setTimeout(() => setPrefSaved(false), 2500)
  }

  const enabledCount = prefs.filter(p => p.enabled).length

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '32px' }}>

      {/* ─── Section: Notification Preferences ─── */}
      <SettingsCard
        icon={<Bell size={17} color="#2563eb" />}
        iconBg="linear-gradient(135deg,#eff6ff,#dbeafe)"
        title="Notification Preferences"
        subtitle={`${enabledCount} of ${prefs.length} types enabled`}
        open={notifOpen}
        onToggle={() => setNotifOpen(p => !p)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
          {prefs.map(p => (
            <div key={p.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: '12px',
              background: p.enabled ? '#fafbff' : '#f8fafc',
              border: `1.5px solid ${p.enabled ? '#e0e7ff' : '#f1f5f9'}`,
              transition: 'all .15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Type icon */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                  background: p.enabled ? `${p.color}18` : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '15px', color: p.enabled ? p.color : '#94a3b8',
                  fontWeight: 700, transition: 'all .15s',
                }}>
                  {p.icon}
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: p.enabled ? '#0f172a' : '#94a3b8', marginBottom: '2px' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{p.desc}</div>
                </div>
              </div>
              {/* Toggle */}
              <Toggle enabled={p.enabled} onToggle={() => togglePref(p.key)} color={p.color} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-primary btn-sm" onClick={handleSavePrefs}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} /> Save Preferences
          </button>
          {prefSaved && (
            <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', animation: 'fadeIn .2s ease' }}>
              <CheckCircle size={13} /> Saved!
            </span>
          )}
          <button
            onClick={() => { setPrefs(DEFAULT_PREFS); setPrefSaved(false) }}
            style={{ fontSize: '12.5px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Reset to defaults
          </button>
        </div>
      </SettingsCard>

      {/* ─── Section: Display ─── */}
      <SettingsCard
        icon={<Monitor size={17} color="#7c3aed" />}
        iconBg="linear-gradient(135deg,#fdf4ff,#ede9fe)"
        title="Display"
        subtitle="Appearance and visual preferences"
        open={displayOpen}
        onToggle={() => setDisplayOpen(p => !p)}
      >
        <DisplayRow
          label="Dark Mode"
          desc="Switch to dark theme"
          disabled
          disabledNote="Coming soon"
        />
        <DisplayRow
          label="Compact Tables"
          desc="Show more rows by reducing row height"
          disabled
          disabledNote="Coming soon"
        />
      </SettingsCard>

      {/* ─── Section: Session Info ─── */}
      <SettingsCard
        icon={<Clock size={17} color="#0891b2" />}
        iconBg="linear-gradient(135deg,#ecfeff,#cffafe)"
        title="Current Session"
        subtitle="Details about your active login"
        open={sessionOpen}
        onToggle={() => setSessionOpen(p => !p)}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <SessionBox label="Session Started"   value={fmtDate(jwt.iat)} />
          <SessionBox label="Session Expires"   value={fmtDate(jwt.exp)} />
          <SessionBox label="Role"              value={role.replace('_', ' ')} capitalize />
          <SessionBox label="Token Storage"     value={hasToken ? 'Local (Remembered)' : 'Session Only'} />
          <SessionBox label="Authentication"    value="JWT Bearer Token" />
          <SessionBox label="Account ID"        value={jwt.sub ? `…${jwt.sub.slice(-8)}` : '—'} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          background: '#f0f9ff', border: '1px solid #bae6fd',
          borderRadius: '10px', padding: '10px 14px',
        }}>
          <Info size={14} color="#0284c7" style={{ marginTop: '1px', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#0369a1' }}>
            Your session expires automatically for security. You'll be prompted to log in again when it does.
          </span>
        </div>
      </SettingsCard>

      {/* ─── Section: Security ─── */}
      <SettingsCard
        icon={<Shield size={17} color="#16a34a" />}
        iconBg="linear-gradient(135deg,#f0fdf4,#dcfce7)"
        title="Security"
        subtitle="Account security status"
        open={securityOpen}
        onToggle={() => setSecurityOpen(p => !p)}
      >
        <SecurityRow label="Two-Factor Authentication" status="not_enabled" note="Coming soon" />
        <SecurityRow label="Password Protection"       status="enabled"     note="Password is set" />
        <SecurityRow label="JWT Token Auth"            status="enabled"     note="Active session" />
        <SecurityRow label="Role-Based Access"         status="enabled"     note={`Access level: ${role.replace('_', ' ')}`} />
        <div style={{ marginTop: '14px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <Info size={13} color="#a16207" />
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#92400e' }}>Security Tip</span>
          </div>
          <span style={{ fontSize: '12px', color: '#92400e' }}>
            Change your password regularly and never share your login credentials.
          </span>
        </div>
      </SettingsCard>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SettingsCard({ icon, iconBg, title, subtitle, open, onToggle, children }: {
  icon: React.ReactNode; iconBg: string; title: string; subtitle: string;
  open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="card" style={{ marginBottom: '14px', padding: 0, overflow: 'hidden' }}>
      {/* Header — always visible */}
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
        padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left', borderBottom: open ? '1.5px solid #f1f5f9' : 'none',
        transition: 'background .12s',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#0f172a' }}>{title}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{subtitle}</div>
        </div>
        {/* Accent line on left when open */}
        <div style={{ color: '#94a3b8' }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {/* Body */}
      {open && (
        <div style={{ padding: '20px', animation: 'fadeIn .15s ease' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Toggle({ enabled, onToggle, color }: { enabled: boolean; onToggle: () => void; color: string }) {
  return (
    <div onClick={onToggle} style={{
      width: '46px', height: '26px', borderRadius: '13px', flexShrink: 0,
      background: enabled ? color : '#e2e8f0',
      position: 'relative', cursor: 'pointer',
      transition: 'background .2s',
      boxShadow: enabled ? `0 0 0 3px ${color}20` : 'none',
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: enabled ? '23px' : '3px',
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.22)',
        transition: 'left .2s',
      }} />
    </div>
  )
}

function DisplayRow({ label, desc, disabled, disabledNote }: {
  label: string; desc: string; disabled?: boolean; disabledNote?: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', borderRadius: '12px', background: '#f8fafc',
      border: '1.5px solid #f1f5f9', marginBottom: '8px', opacity: disabled ? 0.65 : 1,
    }}>
      <div>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          {disabled && disabledNote ? <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{disabledNote}</span> : desc}
        </div>
      </div>
      <div style={{
        width: '46px', height: '26px', borderRadius: '13px',
        background: '#e2e8f0', position: 'relative', cursor: 'not-allowed',
      }}>
        <div style={{
          position: 'absolute', top: '3px', left: '3px',
          width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.18)',
        }} />
      </div>
    </div>
  )
}

function SessionBox({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 14px', border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', textTransform: capitalize ? 'capitalize' : 'none', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  )
}

function SecurityRow({ label, status, note }: { label: string; status: 'enabled' | 'disabled' | 'not_enabled'; note: string }) {
  const cfg = {
    enabled:     { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', text: 'Enabled'    },
    disabled:    { color: '#dc2626', bg: '#fff1f2', border: '#fecdd3', dot: '#f87171', text: 'Disabled'   },
    not_enabled: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#fbbf24', text: 'Not Set'    },
  }[status]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderRadius: '12px', background: '#f8fafc',
      border: '1.5px solid #f1f5f9', marginBottom: '8px',
    }}>
      <div>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{note}</div>
      </div>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        color: cfg.color, fontSize: '12px', fontWeight: 600,
        padding: '4px 10px', borderRadius: '20px', flexShrink: 0,
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot }} />
        {cfg.text}
      </span>
    </div>
  )
}
