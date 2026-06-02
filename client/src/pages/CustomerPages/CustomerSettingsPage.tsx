// client/src/pages/CustomerPages/CustomerSettingsPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Monitor, Clock, Info, Shield, CheckCircle, ArrowLeft,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { customerSettingsApi } from '../../api/services'

// ── Types ──────────────────────────────────────────────────────────────────

interface NotifPref { key: string; label: string; desc: string; enabled: boolean; color: string; icon: string }
interface SecurityStatus { status: 'enabled' | 'disabled' | 'not_enabled'; note: string }

const DEFAULT_PREFS: NotifPref[] = [
  { key: 'file_update',  label: 'File Updates',        desc: 'When your file status changes (Under Process, Sanctioned, etc.)', color: '#2563eb', icon: '📁', enabled: true  },
  { key: 'payment',      label: 'Payment Updates',     desc: 'When a payment is recorded or confirmed for your file',            color: '#16a34a', icon: '💳', enabled: true  },
  { key: 'insurance',    label: 'Insurance Reminders', desc: 'Expiry alerts and renewal reminders for your policy',              color: '#7c3aed', icon: '🛡️', enabled: true  },
  { key: 'document',     label: 'Document Status',     desc: 'When your documents are verified, rejected, or requested',        color: '#0891b2', icon: '📄', enabled: true  },
  { key: 'general',      label: 'General Alerts',      desc: 'System messages and informational notifications',                  color: '#d97706', icon: 'ℹ',  enabled: true  },
]

// ── Helper: read/write prefs to localStorage ──────────────────────────────

function applyPrefs(saved: Record<string, boolean>): NotifPref[] {
  return DEFAULT_PREFS.map(p => ({ ...p, enabled: saved[p.key] ?? p.enabled }))
}

function prefsToMap(prefs: NotifPref[]) {
  const map: Record<string, boolean> = {}
  prefs.forEach(p => { map[p.key] = p.enabled })
  return map
}

// ── JWT decode for session info ────────────────────────────────────────────

function fmtTs(ts?: number) {
  if (!ts) return '—'
  try { return new Date(ts * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '—' }
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CustomerSettingsPage() {
  const navigate = useNavigate()
  const [prefs,        setPrefs]        = useState<NotifPref[]>(DEFAULT_PREFS)
  const [prefSaved,    setPrefSaved]    = useState(false)

  const [notifOpen,    setNotifOpen]    = useState(true)
  const [displayOpen, setDisplayOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [securityOpen,setSecurityOpen]= useState(false)

  // Session data from JWT
  const [session, setSession] = useState<{
    issued_at?: number; expires_at?: number; user_id?: string; role?: string; token_storage?: string; authentication?: string
  }>({})
  const [security, setSecurity] = useState<Record<string, SecurityStatus>>({})

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedPrefs, sessionData, securityData] = await Promise.all([
          customerSettingsApi.getNotificationPreferences(),
          customerSettingsApi.getSession(),
          customerSettingsApi.getSecurity(),
        ])

        setPrefs(applyPrefs(savedPrefs))
        setSession(sessionData)
        setSecurity(securityData)
      } catch (err) {
        console.error('Failed to load customer settings', err)
      }
    }

    loadSettings()
  }, [])

  const togglePref = (key: string) => {
    setPrefs(prev => prev.map(p => p.key === key ? { ...p, enabled: !p.enabled } : p))
    setPrefSaved(false)
  }

  const handleSave = async () => {
    try {
      await customerSettingsApi.updateNotificationPreferences(prefsToMap(prefs))
      setPrefSaved(true)
      setTimeout(() => setPrefSaved(false), 2500)
    } catch (err) {
      console.error('Failed to save customer notification preferences', err)
    }
  }

  const enabledCount = prefs.filter(p => p.enabled).length

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '32px' }}>
      
      {/* ── Back Button ── */}
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16 }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* ── Notification Preferences ── */}
      <SettingsCard
        icon={<Bell size={17} color="#2563eb" />}
        iconBg="linear-gradient(135deg,#eff6ff,#dbeafe)"
        title="Notification Preferences"
        subtitle={`${enabledCount} of ${prefs.length} types enabled`}
        open={notifOpen}
        onToggle={() => setNotifOpen(p => !p)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {prefs.map(p => (
            <div key={p.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 12,
              background: p.enabled ? '#fafbff' : '#f8fafc',
              border: `1.5px solid ${p.enabled ? '#e0e7ff' : '#f1f5f9'}`,
              transition: 'all .15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: p.enabled ? `${p.color}18` : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, color: p.enabled ? p.color : '#94a3b8', fontWeight: 700,
                }}>
                  {p.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: p.enabled ? '#0f172a' : '#94a3b8', marginBottom: 2 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>{p.desc}</div>
                </div>
              </div>
              <Toggle enabled={p.enabled} onToggle={() => togglePref(p.key)} color={p.color} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} /> Save Preferences
          </button>
          {prefSaved && (
            <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={13} /> Saved!
            </span>
          )}
          <button
            onClick={() => { setPrefs(DEFAULT_PREFS); setPrefSaved(false) }}
            style={{ fontSize: 12.5, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Reset to defaults
          </button>
        </div>
      </SettingsCard>

      {/* ── Display ── */}
      <SettingsCard
        icon={<Monitor size={17} color="#7c3aed" />}
        iconBg="linear-gradient(135deg,#fdf4ff,#ede9fe)"
        title="Display"
        subtitle="Appearance and visual preferences"
        open={displayOpen}
        onToggle={() => setDisplayOpen(p => !p)}
      >
        <DisplayRow label="Dark Mode"      desc="Switch to dark theme"               disabled disabledNote="Coming soon" />
        <DisplayRow label="Compact Layout" desc="Reduce spacing for more content"    disabled disabledNote="Coming soon" />
      </SettingsCard>

      {/* ── Current Session ── */}
      <SettingsCard
        icon={<Clock size={17} color="#0891b2" />}
        iconBg="linear-gradient(135deg,#ecfeff,#cffafe)"
        title="Current Session"
        subtitle="Details about your active login"
        open={sessionOpen}
        onToggle={() => setSessionOpen(p => !p)}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <SessionBox label="Session Started" value={fmtTs(session.issued_at)} />
          <SessionBox label="Session Expires" value={fmtTs(session.expires_at)} />
          <SessionBox label="Role"             value={session.role || 'Customer'} />
          <SessionBox label="Token Storage"   value={session.token_storage || 'Local Storage'} />
          <SessionBox label="Authentication"  value={session.authentication || 'JWT Bearer'} />
          <SessionBox label="Account ID"      value={session.user_id ? `…${session.user_id.slice(-8)}` : '—'} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: '#f0f9ff', border: '1px solid #bae6fd',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <Info size={14} color="#0284c7" style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#0369a1' }}>
            Your session expires automatically for security. You'll be prompted to log in again when it does.
          </span>
        </div>
      </SettingsCard>

      {/* ── Security ── */}
      <SettingsCard
        icon={<Shield size={17} color="#16a34a" />}
        iconBg="linear-gradient(135deg,#f0fdf4,#dcfce7)"
        title="Security"
        subtitle="Your account security status"
        open={securityOpen}
        onToggle={() => setSecurityOpen(p => !p)}
      >
        <SecurityRow label="Password Protection"  status={security.password_protection?.status || 'enabled'}     note={security.password_protection?.note || 'Your account is protected with a password'} />
        <SecurityRow label="JWT Token Auth"        status={security.jwt_token_auth?.status || 'enabled'}     note={security.jwt_token_auth?.note || 'Secure token-based authentication is active'} />
        <SecurityRow label="Two-Factor Auth"       status={security.two_factor_authentication?.status || 'not_enabled'} note={security.two_factor_authentication?.note || 'Coming soon — extra login verification'} />
        <SecurityRow label="Account Status"        status={security.account_status?.status || 'enabled'}
          note={security.account_status?.note || 'Your account is currently active'} />
        <div style={{ marginTop: 14, background: '#fefce8', border: '1px solid #fef08a', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <Info size={13} color="#a16207" />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#92400e' }}>Security Tip</span>
          </div>
          <span style={{ fontSize: 12, color: '#92400e' }}>
            Change your password regularly and never share your login credentials with anyone.
          </span>
        </div>
      </SettingsCard>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SettingsCard({ icon, iconBg, title, subtitle, open, onToggle, children }: {
  icon: React.ReactNode; iconBg: string; title: string; subtitle: string;
  open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left', borderBottom: open ? '1.5px solid #f1f5f9' : 'none',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{subtitle}</div>
        </div>
        <div style={{ color: '#94a3b8' }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {open && <div style={{ padding: 20 }}>{children}</div>}
    </div>
  )
}

function Toggle({ enabled, onToggle, color }: { enabled: boolean; onToggle: () => void; color: string }) {
  return (
    <div onClick={onToggle} style={{
      width: 46, height: 26, borderRadius: 13, flexShrink: 0,
      background: enabled ? color : '#e2e8f0',
      position: 'relative', cursor: 'pointer',
      transition: 'background .2s',
      boxShadow: enabled ? `0 0 0 3px ${color}20` : 'none',
    }}>
      <div style={{
        position: 'absolute', top: 3,
        left: enabled ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.22)',
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
      padding: '14px 16px', borderRadius: 12, background: '#f8fafc',
      border: '1.5px solid #f1f5f9', marginBottom: 8, opacity: disabled ? 0.65 : 1,
    }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {disabled && disabledNote ? <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{disabledNote}</span> : desc}
        </div>
      </div>
      <div style={{ width: 46, height: 26, borderRadius: 13, background: '#e2e8f0', position: 'relative', cursor: 'not-allowed' }}>
        <div style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.18)' }} />
      </div>
    </div>
  )
}

function SessionBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

function SecurityRow({ label, status, note }: { label: string; status: 'enabled' | 'disabled' | 'not_enabled'; note: string }) {
  const cfg = {
    enabled:     { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', text: 'Enabled'  },
    disabled:    { color: '#dc2626', bg: '#fff1f2', border: '#fecdd3', dot: '#f87171', text: 'Disabled' },
    not_enabled: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#fbbf24', text: 'Not Set'  },
  }[status]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderRadius: 12, background: '#f8fafc',
      border: '1.5px solid #f1f5f9', marginBottom: 8,
    }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{note}</div>
      </div>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        color: cfg.color, fontSize: 12, fontWeight: 600,
        padding: '4px 10px', borderRadius: 20, flexShrink: 0,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
        {cfg.text}
      </span>
    </div>
  )
}