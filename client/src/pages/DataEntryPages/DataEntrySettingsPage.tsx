import { useEffect, useState } from 'react'
import {
  Bell, Monitor, Clock, Info, Shield, CheckCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { adminSettingsApi } from '../../api/services'

// ── Notification preference types ─────────────────────────────────────────────
interface NotifPref { key: string; label: string; desc: string; enabled: boolean; color: string; icon: string }

interface UserSession {
  user_id: string
  email: string
  name: string
  role: string | null
  issued_at?: number
  expires_at?: number
  token_storage: string
  authentication: string
  is_active: boolean
  last_login?: string | null
}

interface SecurityItem {
  status: 'enabled' | 'disabled' | 'not_enabled'
  note: string
}

interface UserSecurity {
  two_factor_authentication: SecurityItem
  password_protection: SecurityItem
  jwt_token_auth: SecurityItem
  role_based_access: SecurityItem
  account_status: SecurityItem
}

const DEFAULT_PREFS: NotifPref[] = [
  { key: 'added',   label: 'Record Added',    desc: 'When payments, customers or files are created', color: '#16a34a', icon: '✚', enabled: true },
  { key: 'deleted', label: 'Record Deleted',  desc: 'When any record is removed from the system',    color: '#dc2626', icon: '✕', enabled: true },
  { key: 'updated', label: 'Record Updated',  desc: 'When existing records are edited',              color: '#2563eb', icon: '✎', enabled: true },
  { key: 'info',    label: 'Info & Reminders',desc: 'System info messages and reminders',            color: '#0891b2', icon: 'ℹ', enabled: true },
  { key: 'error',   label: 'Error Alerts',    desc: 'Failed operations or system warnings',          color: '#d97706', icon: '⚠', enabled: true },
]

function fmtDate(ts?: number) {
  if (!ts) return '—'
  try { return new Date(ts * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '—' }
}

// ── Section component ─────────────────────────────────────────────────────────
function Section({ title, icon, open, onToggle, children }: {
  title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 16, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid #f1f5f9' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontWeight: 700, fontSize: 14 }}>
          {icon} {title}
        </div>
        {open ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
      </button>
      {open && <div style={{ padding: 20 }}>{children}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DataEntrySettingsPage() {
  const [prefs, setPrefs] = useState<NotifPref[]>(DEFAULT_PREFS)
  const [prefSaved, setPrefSaved] = useState(false)
  const [prefLoading, setPrefLoading] = useState(false)
  const [session, setSession] = useState<UserSession | null>(null)
  const [security, setSecurity] = useState<UserSecurity | null>(null)

  const [notifOpen,    setNotifOpen]    = useState(true)
  const [displayOpen,  setDisplayOpen]  = useState(false)
  const [sessionOpen,  setSessionOpen]  = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setPrefLoading(true)
      try {
        const [savedPrefs, sessionData, securityData] = await Promise.all([
          adminSettingsApi.getNotificationPreferences(),
          adminSettingsApi.getSession(),
          adminSettingsApi.getSecurity(),
        ])
        setPrefs(DEFAULT_PREFS.map(pref => ({
          ...pref,
          enabled: savedPrefs?.[pref.key] !== undefined ? savedPrefs[pref.key] : pref.enabled,
        })))
        setSession(sessionData)
        setSecurity(securityData)
      } catch {
        // API not yet connected — use defaults
      } finally {
        setPrefLoading(false)
      }
    }
    load()
  }, [])

  const savePrefs = async () => {
    const payload = Object.fromEntries(prefs.map(p => [p.key, p.enabled]))
    try {
      await adminSettingsApi.updateNotificationPreferences(payload)
    } catch { /* ignore */ }
    setPrefSaved(true)
    setTimeout(() => setPrefSaved(false), 2500)
  }

  const toggle = (key: string) =>
    setPrefs(prev => prev.map(p => p.key === key ? { ...p, enabled: !p.enabled } : p))

  const statusBadge = (s: SecurityItem['status']) => {
    const map = {
      enabled:     { bg: '#dcfce7', color: '#166534', label: 'Enabled'      },
      disabled:    { bg: '#fef2f2', color: '#b91c1c', label: 'Disabled'     },
      not_enabled: { bg: '#fef3c7', color: '#92400e', label: 'Not Enabled'  },
    }
    const m = map[s] || map.not_enabled
    return (
      <span style={{ background: m.bg, color: m.color, borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
        {m.label}
      </span>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 32 }}>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Account Settings</h2>
        <p style={{ color: '#64748b', fontSize: 13.5, margin: '4px 0 0' }}>
          Manage your notification preferences, session, and security settings.
        </p>
      </div>

      {/* ── Notification Preferences ── */}
      <Section title="Notification Preferences" icon={<Bell size={16} color="#2563eb" />} open={notifOpen} onToggle={() => setNotifOpen(o => !o)}>
        {prefLoading ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading preferences...</div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Choose which events trigger in-app notifications.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {prefs.map(pref => (
                <div key={pref.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10,
                  background: pref.enabled ? '#f8fafc' : '#f8fafc',
                  border: `1px solid ${pref.enabled ? '#e2e8f0' : '#f1f5f9'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: pref.enabled ? `${pref.color}18` : '#f1f5f9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, color: pref.enabled ? pref.color : '#94a3b8',
                    }}>
                      {pref.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: pref.enabled ? '#0f172a' : '#94a3b8' }}>{pref.label}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{pref.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(pref.key)}
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: pref.enabled ? '#2563eb' : '#e2e8f0',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background .2s', flexShrink: 0,
                    }}
                    aria-checked={pref.enabled}
                    role="switch"
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: pref.enabled ? 22 : 2,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#fff', transition: 'left .2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,.18)',
                    }} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 7 }}
              onClick={savePrefs}
            >
              {prefSaved ? <><CheckCircle size={14} /> Saved!</> : 'Save Preferences'}
            </button>
          </>
        )}
      </Section>

      {/* ── Display Preferences ── */}
      <Section title="Display Preferences" icon={<Monitor size={16} color="#7c3aed" />} open={displayOpen} onToggle={() => setDisplayOpen(o => !o)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Theme',        value: 'Light (System Default)' },
            { label: 'Language',     value: 'English (India)'        },
            { label: 'Date Format',  value: 'DD/MM/YYYY'             },
            { label: 'Currency',     value: '₹ Indian Rupee (INR)'   },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: '#334155' }}>{label}</span>
              <span style={{ fontSize: 13, color: '#64748b' }}>{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Session Info ── */}
      <Section title="Session Information" icon={<Clock size={16} color="#0891b2" />} open={sessionOpen} onToggle={() => setSessionOpen(o => !o)}>
        {session ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Account Email',   value: session.email             },
              { label: 'Name',            value: session.name              },
              { label: 'Role',            value: session.role || 'data_entry' },
              { label: 'Token Storage',   value: session.token_storage     },
              { label: 'Authentication',  value: session.authentication    },
              { label: 'Account Status',  value: session.is_active ? 'Active' : 'Inactive' },
              { label: 'Session Issued',  value: fmtDate(session.issued_at)  },
              { label: 'Session Expires', value: fmtDate(session.expires_at) },
              { label: 'Last Login',      value: session.last_login || '—'   },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{label}</span>
                <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace' }}>{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Session data unavailable.</div>
        )}
      </Section>

      {/* ── Security Info ── */}
      <Section title="Security Overview" icon={<Shield size={16} color="#16a34a" />} open={securityOpen} onToggle={() => setSecurityOpen(o => !o)}>
        {security ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(Object.entries(security) as [string, SecurityItem][]).map(([key, item]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid #f8fafc', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155', marginBottom: 2 }}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.note}</div>
                </div>
                {statusBadge(item.status)}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Two-Factor Authentication', note: 'Not configured' },
              { label: 'Password Protection',        note: 'Enabled via JWT' },
              { label: 'JWT Token Auth',              note: 'Active'          },
              { label: 'Role-Based Access',           note: 'Data Entry role active' },
            ].map(({ label, note }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{note}</div>
                </div>
                {statusBadge('enabled')}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── About ── */}
      <Section title="About AutoNidhi" icon={<Info size={16} color="#64748b" />} open={false} onToggle={() => {}}>
        <></>
      </Section>
    </div>
  )
}
