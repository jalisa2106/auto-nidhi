import { notificationsApi } from '../api/services'

// 1. Match the exact PostgreSQL ENUM
export type NotifType = 
  | 'insurance_expiry'
  | 'file_status_change'
  | 'document_approved'
  | 'document_rejected'
  | 'payment_recorded'
  | 'commission_credited'
  | 'general'

export interface Notification {
  id: string
  type: NotifType
  message: string
  time: string
  read: boolean
  page?: string
}

let notifications: Notification[] = []
let listeners: Array<() => void> = []

export const subscribe = (listener: () => void) => {
  listeners.push(listener)
  return () => { listeners = listeners.filter((l) => l !== listener) }
}

const notifyListeners = () => listeners.forEach((l) => l())

export const getNotifications = () => notifications

export const unreadCount = () => notifications.filter(n => !n.read).length

export const addNotification = (type: NotifType, message: string, page: string) => {
  const newNotif: Notification = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type,
    message,
    time: new Date().toISOString(),
    read: false,
    page,
  }
  notifications = [newNotif, ...notifications]
  notifyListeners()
}

// Fetch from backend API
export const fetchNotifications = async () => {
  try {
    const response = await notificationsApi.list()
    // Map the backend structure to our frontend interface
    notifications = response.data.map((n: any) => ({
      id: n.id,
      type: (n.type || 'general') as NotifType,
      message: n.message,
      time: n.created_at,
      read: n.read,
      page: n.file_id ? `File: ${n.file_id.substring(0, 8)}` : 'System'
    }))
    notifyListeners()
  } catch (error) {
    console.error("Failed to load notifications:", error)
  }
}

// Mark single notification as read
export const markRead = async (id: string) => {
  try {
    // Optimistic UI update for instant feedback
    notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n)
    notifyListeners()
    // Background API call
    await notificationsApi.markAsRead(id)
  } catch (e) {
    console.error(`Error marking notification ${id} as read`, e)
    fetchNotifications() // Revert on failure
  }
}

// Mark all as read
export const markAllRead = async () => {
  try {
    notifications = notifications.map(n => ({ ...n, read: true }))
    notifyListeners()
    await notificationsApi.markAllRead()
  } catch (e) {
    console.error("Error marking all as read", e)
    fetchNotifications() // Revert on failure
  }
}

// Clear all locally (Optional: if you want a backend clear, you'd add an endpoint for it)
export const clearAll = () => {
  notifications = []
  notifyListeners()
}
const POLL_INTERVAL = 60000;
let pollingInterval: number | ReturnType<typeof setInterval> | null = null;

export const startPolling = () => {
  if (!pollingInterval) {
    pollingInterval = setInterval(fetchNotifications, POLL_INTERVAL);
  }
};

export const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

// Start polling immediately when store is evaluated
startPolling();
