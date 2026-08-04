import { NotificationRepository } from '@/lib/repositories/notification.repository'
import { ADMIN_EMAILS } from '@/lib/auth/roles'
import type { Campaign, Notification, NotificationTipo } from '@/types'
import dayjs from 'dayjs'

const MENSAJES: Record<NotificationTipo, (campaign: Campaign) => string> = {
  PENDIENTE_APROBACION: (c) => `Tienes una comunicación por aprobar: "${c.nombreCampana}"`,
  APROBADA:             (c) => `Tu comunicación "${c.nombreCampana}" ha sido aprobada`,
  RECHAZADA:            (c) => `Tu comunicación "${c.nombreCampana}" ha sido rechazada`,
  ENVIADA:              (c) => `Tu comunicación "${c.nombreCampana}" ha sido enviada`,
}

export const NotificationService = {
  async getByUser(userId: string): Promise<Notification[]> {
    return NotificationRepository.findByUser(userId)
  },

  async markAsRead(id: string): Promise<Notification | null> {
    return NotificationRepository.markAsRead(id)
  },

  async markAllAsRead(userId: string): Promise<void> {
    return NotificationRepository.markAllAsRead(userId)
  },

  /** Notifica a todos los administradores (lista fija, ver src/lib/auth/roles.ts) que hay una campaña nueva por aprobar */
  async notificarNuevaCampana(campaign: Campaign): Promise<void> {
    await Promise.all(ADMIN_EMAILS.map((correoAdmin) => NotificationRepository.create({
      userId:     correoAdmin,
      campaignId: campaign.id,
      tipo:       'PENDIENTE_APROBACION',
      mensaje:    MENSAJES.PENDIENTE_APROBACION(campaign),
      leida:      false,
      fecha:      dayjs().toISOString(),
    })))
  },

  /** Notifica al solicitante el cambio de estado de su campaña (Aprobada, Rechazada, Ejecutada) */
  async notificarCambioEstado(campaign: Campaign): Promise<void> {
    const tipoPorEstado: Partial<Record<Campaign['estado'], NotificationTipo>> = {
      Aprobada:  'APROBADA',
      Rechazada: 'RECHAZADA',
      Ejecutada: 'ENVIADA',
    }
    const tipo = tipoPorEstado[campaign.estado]
    if (!tipo) return
    await NotificationRepository.create({
      userId:     campaign.solicitante,
      campaignId: campaign.id,
      tipo,
      mensaje:    MENSAJES[tipo](campaign),
      leida:      false,
      fecha:      dayjs().toISOString(),
    })
  },
}
