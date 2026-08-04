import { CampaignRepository } from '@/lib/repositories/campaign.repository'
import { CommunicationRepository } from '@/lib/repositories/communication.repository'
import { NotificationService } from '@/lib/services/notification.service'
import type { Campaign, CampaignFormData, TipoRecurrencia, User } from '@/types'
import dayjs from 'dayjs'

/**
 * Sincroniza la campaña contra Dataverse vía el Route Handler
 * /api/dataverse/sync-campaign (las credenciales viven solo en el server).
 * Best-effort: si falla (Dataverse mal configurado, sin credenciales
 * todavía, etc.) no interrumpe el flujo local — solo queda logueado.
 */
async function syncCampaignToDataverse(campaign: Campaign, mode: 'create' | 'update'): Promise<void> {
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
    void syncCampaignToDataverse(campaign, 'create')
    return campaign
  },

  async update(id: string, data: Partial<Campaign>): Promise<Campaign | null> {
    const anterior = await CampaignRepository.findById(id)
    const campaign = await CampaignRepository.update(id, data)
    if (campaign && data.estado && data.estado !== anterior?.estado) {
      await NotificationService.notificarCambioEstado(campaign)
      void syncCampaignToDataverse(campaign, 'update')
    }
    return campaign
  },

  async delete(id: string): Promise<boolean> {
    return CampaignRepository.delete(id)
  },

  async validateSimilar(nombreCampana: string, subject: string): Promise<Campaign[]> {
    return CampaignRepository.findSimilar(nombreCampana, subject)
  },
}
