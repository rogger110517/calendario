import { CampaignRepository } from '@/lib/repositories/campaign.repository'
import { CommunicationRepository } from '@/lib/repositories/communication.repository'
import { NotificationService } from '@/lib/services/notification.service'
import type { Campaign, CampaignFormData, TipoRecurrencia, User } from '@/types'
import dayjs from 'dayjs'

/**
 * Sincroniza la campaña contra Dataverse vía el Route Handler
 * /api/dataverse/sync-campaign (las credenciales viven solo en el server).
 * Se espera (no es "fire and forget"): como el calendario ahora LEE de
 * Dataverse (ver src/DESPLIEGUE_DATAVERSE.md sección 8), hay que esperar a
 * que el sync termine antes de invalidar/refrescar la lista, si no el
 * refetch podría llegar antes de que el dato exista en Dataverse.
 * Best-effort igual: si falla, no interrumpe el flujo — solo queda logueado.
 */
async function syncCampaignToDataverse(campaign: Campaign, mode: 'create' | 'update' | 'delete'): Promise<void> {
  try {
    await fetch('/api/dataverse/sync-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign, mode }),
    })
  } catch (err) {
    console.error('[Dataverse] sync falló', err)
  }
}

// ── Cálculo de fechas de recurrencia ─────────────────────────────────────────
const INTERVALO_RECURRENCIA: Record<TipoRecurrencia, [number, dayjs.ManipulateType]> = {
  Diario:     [1, 'day'],
  Semanal:    [1, 'week'],
  Trimestral: [3, 'month'],
}

/** Calcula las fechas intermedias entre diaEnvio y diaFin según el tipo de recurrencia (excluye diaEnvio, incluye diaFin) */
function calcularFechasRecurrencia(diaEnvio: string, diaFin: string, tipo: TipoRecurrencia): string[] {
  const [cantidad, unidad] = INTERVALO_RECURRENCIA[tipo]
  const fin = dayjs(diaFin)
  const fechas: string[] = []
  let cursor = dayjs(diaEnvio).add(cantidad, unidad)
  while (cursor.isBefore(fin) || cursor.isSame(fin, 'day')) {
    fechas.push(cursor.format('YYYY-MM-DD'))
    cursor = cursor.add(cantidad, unidad)
  }
  return fechas
}

// ── Reglas de negocio ────────────────────────────────────────────────────────
export interface ReglaViolacion {
  tipo: 'MAX_COMUNICACIONES' | 'PUBLICO_DUPLICADO'
  mensaje: string
}

export const CampaignService = {
  async getAll(): Promise<Campaign[]> {
    const [campaigns, comms] = await Promise.all([
      CampaignRepository.findAll(),
      CommunicationRepository.findAll(),
    ])
    return campaigns.map((c) => ({
      ...c,
      comunicaciones: comms.filter((com) => com.campaignId === c.id),
    }))
  },

  async getById(id: string): Promise<Campaign | null> {
    const campaign = await CampaignRepository.findById(id)
    if (!campaign) return null
    campaign.comunicaciones = await CommunicationRepository.findByCampaignId(id)
    return campaign
  },

  /** Valida reglas de negocio antes de crear */
  async validarReglas(
    diaEnvio: string,
    dirigidoA: string,
    excludeId?: string,
  ): Promise<ReglaViolacion[]> {
    const todas = await CampaignRepository.findAll()
    const activas = todas.filter(
      (c) => c.id !== excludeId && c.estado !== 'Cancelada' && c.estado !== 'Rechazada',
    )
    const mismaFecha = activas.filter((c) => c.diaEnvio === diaEnvio)
    const violaciones: ReglaViolacion[] = []

    if (mismaFecha.length >= 2) {
      violaciones.push({
        tipo: 'MAX_COMUNICACIONES',
        mensaje: `Ya existen 2 comunicaciones programadas para el ${dayjs(diaEnvio).format('DD/MM/YYYY')}. Máximo permitido: 2 por día.`,
      })
    }

    const publicoDuplicado = mismaFecha.some(
      (c) => c.dirigidoA.trim().toLowerCase() === dirigidoA.trim().toLowerCase(),
    )
    if (publicoDuplicado) {
      violaciones.push({
        tipo: 'PUBLICO_DUPLICADO',
        mensaje: `Ya existe una campaña con el mismo público objetivo en el ${dayjs(diaEnvio).format('DD/MM/YYYY')}. Solo se permite 1 público objetivo por día.`,
      })
    }

    return violaciones
  },

  async create(formData: CampaignFormData, currentUser: User): Promise<Campaign> {
    const fechasRecurrencia = formData.tieneRecurrencia && formData.tipoRecurrencia
      ? calcularFechasRecurrencia(formData.diaEnvio, formData.diaFin, formData.tipoRecurrencia)
      : []

    const payload: Omit<Campaign, 'id'> = {
      nombreCampana:     formData.nombreCampana,
      subject:           formData.subject,
      dirigidoA:         formData.dirigidoA,
      filtrosAplicar:    formData.filtrosAplicar,
      unidad:            formData.unidad,
      dealer:            formData.tieneDealer ? (formData.dealer ?? null) : null,
      cantidadDealers:   formData.tieneDealer ? formData.cantidadDealers : undefined,
      diaEnvio:          formData.diaEnvio,
      horaEnvio:         formData.horaEnvio,
      diaFin:            formData.diaFin,
      recurrencia:       formData.tieneRecurrencia,
      tipoRecurrencia:   formData.tieneRecurrencia ? formData.tipoRecurrencia : undefined,
      fechasRecurrencia,
      linkOneDrive:      formData.linkOneDrive ?? '',
      comentarios:       formData.comentarios,
      solicitante:       currentUser.id,
      fechaRegistro:     dayjs().toISOString(),
      estado:            'Pendiente',
    }
    const campaign = await CampaignRepository.create(payload)
    await NotificationService.notificarNuevaCampana(campaign)
    await syncCampaignToDataverse(campaign, 'create')
    return campaign
  },

  /**
   * Recibe la Campaign completa (no solo el id): como la lista viene de
   * Dataverse, la campaña puede no existir en la memoria local de esta
   * pestaña (por ejemplo, se creó en otro navegador) — mezclamos el patch
   * sobre el objeto recibido en vez de depender de encontrarla localmente.
   */
  async update(campaign: Campaign, data: Partial<Campaign>): Promise<Campaign> {
    const actualizada = { ...campaign, ...data }
    await CampaignRepository.update(campaign.id, data).catch(() => null) // best-effort, cache local
    if (data.estado && data.estado !== campaign.estado) {
      await NotificationService.notificarCambioEstado(actualizada)
      await syncCampaignToDataverse(actualizada, 'update')
    }
    return actualizada
  },

  async delete(campaign: Campaign): Promise<boolean> {
    await CampaignRepository.delete(campaign.id).catch(() => false) // best-effort, cache local
    await syncCampaignToDataverse(campaign, 'delete')
    return true
  },

  async validateSimilar(nombreCampana: string, subject: string): Promise<Campaign[]> {
    return CampaignRepository.findSimilar(nombreCampana, subject)
  },
}
