import React, { useState, useEffect, useRef } from 'react'
import {
  getNotifications, markAllRead, clearAll, subscribe,
  type Notification, type NotifType,
} from '../../store/notificationStore'

// ── Icon helpers ──────────────────────────────────────────────────────────────

const typeIcon: Record<NotifType, { icon: string; color: string; bg: string }> = {
  added:   { icon: '✚', color: '#16a34a', bg: '#f0fdf4' },
  deleted: { icon: '✕', color: '#dc2626', bg: '#fff1f2' },
  updated: { icon: '✎', color: '#2563eb', bg: '#eff6ff' },
  info:    { icon: 'ℹ', color: '#0891b2', bg: '#ecfeff' },
  error:   { icon: '⚠', color: '#d97706', bg: '#fffbeb' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

const NotificationPanel: React.FC<Props> = ({ onClose }) => {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  // Subscribe to store changes
  useEffect(() => {
    setNotifs(getNotifications())
    const unsub = subscribe(() => setNotifs(getNotifications()))
    return unsub
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleMarkAllRead = () => { markAllRead(); setNotifs(getNotifications()) }
  const handleClearAll    = () => { clearAll();    setNotifs(getNotifications()) }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div ref={panelRef} style={{
      position:        'absolute',
      top:             '56px',
      right:           '120px',
      width:           '360px',
      maxHeight:       '480px',
      background:      '#fff',
      borderRadius:    '16px',
      boxShadow:       '0 8px 40px rgba(15,23,42,.15), 0 2px 8px rgba(15,23,42,.06)',
      border:          '1px solid #e2e8f0',
      zIndex:          1000,
      display:         'flex',
      flexDirection:   'column',
      overflow:        'hidden',
      animation:       'notifPanelIn .18s ease',
    }}>
      {/* Header */}
      <div style={{
        padding:        '14px 16px 10px',
        borderBottom:   '1px solid #f1f5f9',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexShrink:     0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
            Notifications
          </span>
          {unread > 0 && (
            <span style={{
              background: '#2563eb', color: '#fff',
              fontSize: '11px', fontWeight: 700,
              padding: '1px 7px', borderRadius: '20px',
            }}>
              {unread} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} style={{
              fontSize: '11.5px', color: '#3b82f6', background: 'none',
              border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 4px',
            }}>
              Mark all read
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={handleClearAll} style={{
              fontSize: '11.5px', color: '#94a3b8', background: 'none',
              border: 'none', cursor: 'pointer', padding: '2px 4px',
            }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifs.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            color: '#94a3b8', fontSize: '13.5px',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>
              No notifications yet
            </div>
            <div style={{ fontSize: '12px' }}>
              Activity like adding or deleting records will appear here.
            </div>
          </div>
        ) : (
          notifs.map(n => {
            const meta = typeIcon[n.type]
            return (
              <div
                key={n.id}
                style={{
                  display:         'flex',
                  gap:             '12px',
                  padding:         '12px 16px',
                  borderBottom:    '1px solid #f8fafc',
                  background:      n.read ? 'transparent' : 'rgba(37,99,235,.035)',
                  transition:      'background .15s',
                  cursor:          'default',
                }}
              >
                {/* Type icon */}
                <div style={{
                  width:          '32px', height: '32px',
                  borderRadius:   '10px',
                  background:     meta.bg,
                  display:        'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink:     0,
                  fontSize:       '14px',
                  color:          meta.color,
                  fontWeight:     700,
                }}>
                  {meta.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize:   '13px', color: '#1e293b', fontWeight: n.read ? 500 : 600,
                    lineHeight: 1.45, marginBottom: '3px',
                  }}>
                    {n.message}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '11px', color: '#94a3b8',
                      background: '#f1f5f9', borderRadius: '4px', padding: '1px 6px',
                    }}>
                      {n.page}
                    </span>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      {timeAgo(n.time)}
                    </span>
                  </div>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    width: '7px', height: '7px',
                    borderRadius: '50%', background: '#2563eb',
                    flexShrink: 0, alignSelf: 'center',
                  }} />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {notifs.length > 0 && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Showing last {notifs.length} notification{notifs.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <style>{`
        @keyframes notifPanelIn {
          from { opacity: 0; transform: translateY(-8px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

export default NotificationPanel
