import { useState } from 'react'
import { BellRing, CheckCircle2, Circle } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'

interface Notification {
  id: string
  message: string
  time: string
  read: boolean
  type: 'info' | 'warning' | 'success'
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: '1', message: 'Your loan file FILE/2026/001 is under review by the finance bank.', time: '2 hours ago', read: false, type: 'info' },
  { id: '2', message: 'Documents approved — disbursement is now pending.', time: '1 day ago', read: false, type: 'success' },
  { id: '3', message: 'Insurance renewal reminder: your policy expires in 15 days.', time: '3 days ago', read: true, type: 'warning' },
  { id: '4', message: 'Your RTO transfer application has been submitted successfully.', time: '5 days ago', read: true, type: 'success' },
  { id: '5', message: 'New statement available for your loan account.', time: '1 week ago', read: true, type: 'info' },
]

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  info:    { bg: 'var(--brand-50)',  color: 'var(--brand-700)' },
  success: { bg: '#dcfce7',          color: '#15803d' },
  warning: { bg: '#fef3c7',          color: '#d97706' },
}

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  const markRead    = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
      />

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-500)', fontSize: '.87rem' }}>
          <BellRing size={16} />
          {notifications.length} total notifications
        </div>
        {unread > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="data-card">
        {notifications.length === 0 ? (
          <div className="data-empty">No notifications yet.</div>
        ) : (
          notifications.map(n => {
            const { bg, color } = TYPE_STYLE[n.type]
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 20px',
                  borderBottom: '1px solid var(--gray-50)',
                  background: n.read ? 'transparent' : 'var(--brand-50)',
                  transition: 'background .15s',
                }}
              >
                {/* Icon */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BellRing size={16} />
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: n.read ? 400 : 600, color: n.read ? 'var(--gray-600)' : 'var(--gray-900)', fontSize: '.88rem', lineHeight: 1.5 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '.74rem', color: 'var(--gray-400)', marginTop: 4 }}>{n.time}</div>
                </div>

                {/* Read toggle */}
                {!n.read ? (
                  <button
                    onClick={() => markRead(n.id)}
                    title="Mark as read"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-600)', padding: 4 }}
                  >
                    <Circle size={16} />
                  </button>
                ) : (
                  <CheckCircle2 size={16} color="var(--gray-300)" />
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
