import React, { useState, useEffect, useRef } from 'react'
import {
  getNotifications, markAllRead, subscribe, markRead,
  type Notification, type NotifType,
} from '../../store/notificationStore'
// Import reliable SVG icons (requires: npm install lucide-react)
import { AlertTriangle, RefreshCw, CheckCircle2, XCircle, DollarSign, Wallet, Info } from 'lucide-react'

// ── Icon & Color Mapping ──────────────────────────────────────────────────────
const typeIcon: Record<NotifType, { icon: React.ReactNode; color: string; bg: string }> = {
  insurance_expiry:    { icon: <AlertTriangle size={16} />, color: '#d97706', bg: '#fffbeb' }, 
  file_status_change:  { icon: <RefreshCw size={16} />,     color: '#2563eb', bg: '#eff6ff' }, 
  document_approved:   { icon: <CheckCircle2 size={16} />,  color: '#16a34a', bg: '#f0fdf4' }, 
  document_rejected:   { icon: <XCircle size={16} />,       color: '#dc2626', bg: '#fff1f2' }, 
  payment_recorded:    { icon: <DollarSign size={16} />,    color: '#16a34a', bg: '#f0fdf4' }, 
  commission_credited: { icon: <Wallet size={16} />,        color: '#059669', bg: '#d1fae5' }, 
  general:             { icon: <Info size={16} />,          color: '#0891b2', bg: '#ecfeff' }, 
}

function timeAgo(iso: string): string {
  if (!iso) return 'just now'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

interface Props { onClose: () => void }

const NotificationPanel: React.FC<Props> = ({ onClose }) => {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // We no longer call fetchNotifications() here. 
    // It should be called in your TopBar/Navbar.
    setNotifs(getNotifications())
    const unsub = subscribe(() => setNotifs(getNotifications()))
    return unsub
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) markRead(n.id)
  }

  // ── LIMIT LOGIC ─────────────────────────────────────────────────────────────
  const unreadCount = notifs.filter(n => !n.read).length
  // Show 10, OR the number of unread if it's greater than 10
  const displayCount = Math.max(10, unreadCount) 
  const visibleNotifs = notifs.slice(0, displayCount)

  return (
    <div ref={panelRef} style={{
      position: 'absolute', top: '56px', right: '120px', width: '360px', maxHeight: '480px',
      background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', zIndex: 1000,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(15,23,42,.15), 0 2px 8px rgba(15,23,42,.06)',
      animation: 'notifPanelIn .18s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ background: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px' }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ fontSize: '11.5px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {visibleNotifs.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13.5px' }}>
            <div style={{ fontWeight: 600, color: '#64748b' }}>No notifications yet</div>
          </div>
        ) : (
          visibleNotifs.map(n => {
            const meta = typeIcon[n.type] || typeIcon.general 
            return (
              <div key={n.id} onClick={() => handleNotificationClick(n)} style={{
                  display: 'flex', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                  background: n.read ? 'transparent' : 'rgba(37,99,235,.035)', cursor: n.read ? 'default' : 'pointer',
              }}>
                {/* SVG Icon Container */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', background: meta.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: meta.color,
                }}>
                  {meta.icon}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: n.read ? 500 : 600, lineHeight: 1.45, marginBottom: '3px' }}>
                    {n.message}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {n.page && n.page !== 'System' && (
                      <span style={{ fontSize: '11px', color: '#94a3b8', background: '#f1f5f9', borderRadius: '4px', padding: '1px 6px' }}>
                        {n.page}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{timeAgo(n.time)}</span>
                  </div>
                </div>
                
                {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563eb', flexShrink: 0, alignSelf: 'center' }} />}
              </div>
            )
          })
        )}
      </div>
      
      {/* Footer */}
      {notifs.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', textAlign: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {notifs.length > visibleNotifs.length 
              ? `Showing ${visibleNotifs.length} of ${notifs.length} notifications` 
              : `Showing all ${visibleNotifs.length} notifications`}
          </span>
        </div>
      )}
    </div>
  )
}

export default NotificationPanel