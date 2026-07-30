/**
 * NotificationRepository
 *
 * Currently backed by local JSON mock data (vacío por defecto).
 * To migrate to Dataverse / REST API, replace the implementations below
 * with HTTP calls to your endpoint — la interfaz se mantiene igual.
 */

import type { Notification } from '@/types'
import notificationsData from '@/mocks/notifications.json'

// In-memory store so mutations persist during the browser session
let store: Notification[] = notificationsData as Notification[]

export const NotificationRepository = {
  async findByUser(userId: string): Promise<Notification[]> {
    return structuredClone(
      store.filter((n) => n.userId === userId).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    )
  },

  async create(data: Omit<Notification, 'id'>): Promise<Notification> {
    const notification: Notification = {
      ...data,
      id: `not-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }
    store = [...store, notification]
    return structuredClone(notification)
  },

  async markAsRead(id: string): Promise<Notification | null> {
    const index = store.findIndex((n) => n.id === id)
    if (index === -1) return null
    store[index] = { ...store[index], leida: true }
    return structuredClone(store[index])
  },

  async markAllAsRead(userId: string): Promise<void> {
    store = store.map((n) => (n.userId === userId ? { ...n, leida: true } : n))
  },
}
