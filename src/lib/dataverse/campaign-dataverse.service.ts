import { dvCreate, dvUpdate } from './client'
import { fechasDeEnvio, mapCampaignLevelFields, mapOcurrenciaFields } from './campaign.mapper'
import { DealerRepository } from '@/lib/repositories/dealer.repository'
import { UnidadRepository } from '@/lib/repositories/unidad.repository'
import { UserRepository } from '@/lib/repositories/user.repository'
import type { Campaign } from '@/types'

const ENTITY_SET = 'cre47_comunicaciondecampanas'

async function resolveCampaignLevelFields(campaign: Campaign, totalOcurrencias: number) {
  const [dealer, unidad, solicitante] = await Promise.all([
    campaign.dealer ? DealerRepository.findById(campaign.dealer) : Promise.resolve(null),
    UnidadRepository.findById(campaign.unidad),
    UserRepository.findById(campaign.solicitante),
  ])
  return mapCampaignLevelFields(campaign, dealer, unidad, solicitante, totalOcurrencias)
}

export const CampaignDataverseService = {
  /**
   * Crea 1 fila por cada fecha de envío de la campaña (diaEnvio +
   * fechasRecurrencia). No lanza: si falla, retorna [] y loguea.
   */
  async syncOnCreate(campaign: Campaign): Promise<string[]> {
    try {
      const fechas = fechasDeEnvio(campaign)
      const campaignFields = await resolveCampaignLevelFields(campaign, fechas.length)
      const ids = await Promise.all(
        fechas.map((fecha) =>
          dvCreate(ENTITY_SET, { ...campaignFields, ...mapOcurrenciaFields(campaign, fecha) }),
        ),
      )
      return ids.filter(Boolean)
    } catch (err) {
      console.error('[Dataverse] No se pudo registrar la campaña', err)
      return []
    }
  },

  /**
   * Actualiza SOLO los campos de campaña (ej. estado al aprobar/rechazar)
   * en todas las filas ya creadas para esta campaña. No toca los campos de
   * ocurrencia (fecha, canal, estado de envío) — esos los administra el
   * flujo de Power Automate una vez que envía. No lanza: solo loguea.
   */
  async syncOnUpdate(dataverseIds: string[], campaign: Campaign): Promise<void> {
    try {
      const campaignFields = await resolveCampaignLevelFields(campaign, dataverseIds.length)
      await Promise.all(dataverseIds.map((id) => dvUpdate(ENTITY_SET, id, campaignFields)))
    } catch (err) {
      console.error('[Dataverse] No se pudo actualizar la campaña', err)
    }
  },
}
