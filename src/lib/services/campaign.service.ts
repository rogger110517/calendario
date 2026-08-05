import { CampaignRepository } from '@/lib/repositories/campaign.repository'
import { CommunicationRepository } from '@/lib/repositories/communication.repository'
import type { Campaign, CampaignFormData, User } from '@/types'
import dayjs from 'dayjs'

/**
 * Sincroniza la campaña contra Dataverse vía el Route Handler
 * /api/dataverse/sync-campaign (las credenciales viven solo en el server).
 * Se espera (no es "fire and forget"): como el calendario ahora LEE de
 * Dataverse (ver src/DESPLIEGUE_DATAVERSE.md sección 8), hay que esperar a
 * que el sync termine antes de invalidar/refrescar la lista, si no el
 * refetch podría llegar antes de que el dato exista en Dataverse.
 * Devuelve si realmente funcionó — antes se ignoraba el resultado y la UI
 * mostraba éxito aunque el sync hubiera fallado (ej. al eliminar).
 */
async function syncCampaignToDataverse(campaign: Campaign, mode: 'create' | 'update' | 'delete'): Promise<boolean> {
  try {
    const res = await fetch('/api/dataverse/sync-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign, mode }),
      cache: 'no-store',
    })
    const json = (await res.json()) as { ok: boolean }
    return json.ok
  } catch (err) {
    console.error('[Dataverse] sync falló', err)
    return false
  }
}

/**
 * Campañas "reales" para validar reglas de negocio — se leen de Dataverse
 * (vía /api/campaigns), no de la memoria local del navegador. Si esto
 * leyera solo memoria local, dos personas en dos navegadores distintos
 * podrían saltarse el máximo de 2 por día sin verse entre sí.
 */
async function fetchCampaignsReales(): Promise<Campaign[]> {
  const res = await fetch('/api/campaigns', { cache: 'no-store' })
  const json = (await res.json()) as { data: Campaign[]; success: boolean }
  return json.success ? json.data : []
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

  /** Valida reglas de negocio antes de crear — contra las campañas reales (Dataverse), máximo 2 por día. */
  async validarReglas(
    diaEnvio: string,
    dirigidoA: string,
    excludeId?: string,
  ): Promise<ReglaViolacion[]> {
    const todas = await fetchCampaignsReales()
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
      recurrencia:       formData.tieneRecurrencia,
      tipoRecurrencia:   formData.tieneRecurrencia ? formData.tipoRecurrencia : undefined,
      linkOneDrive:      formData.linkOneDrive ?? '',
      comentarios:       formData.comentarios,
      solicitante:       currentUser.correo,
      fechaRegistro:     dayjs().toISOString(),
      estado:            'Pendiente',
    }
    const campaign = await CampaignRepository.create(payload)
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
      const ok = await syncCampaignToDataverse(actualizada, 'update')
      if (!ok) throw new Error('No se pudo actualizar la campaña en Dataverse')
    }
    return actualizada
  },

  async delete(campaign: Campaign): Promise<boolean> {
    await CampaignRepository.delete(campaign.id).catch(() => false) // best-effort, cache local
    const ok = await syncCampaignToDataverse(campaign, 'delete')
    if (!ok) throw new Error('No se pudo eliminar la campaña en Dataverse')
    return true
  },

  async validateSimilar(nombreCampana: string, subject: string): Promise<Campaign[]> {
    const todas = await fetchCampaignsReales()
    const q = (s: string) => s.toLowerCase().trim()
    return todas.filter(
      (c) =>
        q(c.nombreCampana).includes(q(nombreCampana)) ||
        q(nombreCampana).includes(q(c.nombreCampana)) ||
        q(c.subject).includes(q(subject)) ||
        q(subject).includes(q(c.subject)),
    )
  },
}
