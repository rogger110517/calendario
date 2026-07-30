import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { NotificationService } from '@/lib/services/notification.service'
import { useAuthStore } from '@/store/auth.store'

const NOTIFICATIONS_KEY = ['notifications'] as const

export function useNotifications() {
  const userId = useAuthStore((s) => s.currentUser?.id)
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, userId],
    queryFn:  () => NotificationService.getByUser(userId as string),
    enabled:  !!userId,
    refetchInterval: 15_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => NotificationService.markAllAsRead(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}
