import { NotificationRepository } from '@/lib/repositories/notification.repository'
import { UserRepository } from '@/lib/repositories/user.repository'
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

  /** Notifica a todos los administradores que hay una campaña nueva por aprobar */
  async notificarNuevaCampana(campaign: Campaign): Promise<void> {
    const usuarios = await UserRepository.findAll()
    const admins = usuarios.filter((u) => u.rol === 'admin')
    await Promise.all(admins.map((admin) => NotificationRepository.create({
      userId:     admin.id,
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
