// ────────────────────────────────────────────────────────────────────────────
// notificationStore.ts  –  Lightweight notification system for Admin/Staff
// Persists to localStorage so notifications survive page navigation.
// ────────────────────────────────────────────────────────────────────────────

export type NotifType = 'added' | 'deleted' | 'updated' | 'info' | 'error'

export interface Notification {
  id:      string
  type:    NotifType
  message: string
  page:    string       // e.g. "Payment IN"
  time:    string       // ISO string
  read:    boolean
}

const STORAGE_KEY = 'an_notifications'
const MAX_NOTIFS  = 50   // keep only latest 50

// ── Helpers ──────────────────────────────────────────────────────────────────

function load(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Notification[]) : []
  } catch {
    return []
  }
}

function save(notifs: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, MAX_NOTIFS)))
  } catch { /* ignore quota errors */ }
}

// ── Listeners (so components can subscribe to changes) ─────────────────────

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach(fn => fn())
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Add a new notification and broadcast to all subscribers */
export function addNotification(type: NotifType, message: string, page: string) {
  const notifs = load()
  const newNotif: Notification = {
    id:      `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    page,
    time:    new Date().toISOString(),
    read:    false,
  }
  notifs.unshift(newNotif)
  save(notifs)
  notify()
}

/** Get all notifications */
export function getNotifications(): Notification[] {
  return load()
}

/** Mark all as read */
export function markAllRead() {
  const notifs = load().map(n => ({ ...n, read: true }))
  save(notifs)
  notify()
}

/** Mark a single notification as read */
export function markRead(id: string) {
  const notifs = load().map(n => n.id === id ? { ...n, read: true } : n)
  save(notifs)
  notify()
}

/** Clear all notifications */
export function clearAll() {
  save([])
  notify()
}

/** Count of unread notifications */
export function unreadCount(): number {
  return load().filter(n => !n.read).length
}

/** Subscribe to changes — returns unsubscribe function */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
