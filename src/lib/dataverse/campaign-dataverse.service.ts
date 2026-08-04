import { dvDelete, dvUpsert } from './client'
import { fechasDeEnvio, idExterno, mapCampaignLevelFields, mapOcurrenciaFields } from './campaign.mapper'
import { fetchCampaignsFromDataverse } from './campaign-dataverse.reader'
import { DealerRepository } from '@/lib/repositories/dealer.repository'
import { UnidadRepository } from '@/lib/repositories/unidad.repository'
import type { Campaign } from '@/types'

const ENTITY_SET = 'cre47_comunicaciondecampanas'
const KEY_FIELD = 'cre47_campanaid'

async function resolveCampaignLevelFields(campaign: Campaign, totalOcurrencias: number) {
  // campaign.solicitante ya es el correo (Easy Auth, no hay catálogo local de usuarios).
  const [dealer, unidad] = await Promise.all([
    campaign.dealer ? DealerRepository.findById(campaign.dealer) : Promise.resolve(null),
    UnidadRepository.findById(campaign.unidad),
  ])
  return mapCampaignLevelFields(campaign, dealer, unidad, totalOcurrencias)
}

export const CampaignDataverseService = {
  /**
   * Crea (o repone si ya existía) 1 fila por cada fecha de envío de la
   * campaña, vía upsert por cre47_campanaid (= campaignId + fecha, único
   * por fila). Idempotente: reintentar no duplica filas. No lanza: si
   * falla, solo loguea.
   *
   * Resguardo de "máximo 2 por día" del lado de Dataverse (además del
   * chequeo en el formulario): si ya hay 2 campañas activas ese día,
   * NO sincroniza — evita que una 3ra llegue a quedar registrada aunque
   * algo se haya colado del lado del cliente.
   */
  async syncOnCreate(campaign: Campaign): Promise<void> {
    try {
      const existentes = await fetchCampaignsFromDataverse()
      const mismaFecha = existentes.filter(
        (c) => c.id !== campaign.id && c.diaEnvio === campaign.diaEnvio
          && c.estado !== 'Cancelada' && c.estado !== 'Rechazada',
      )
      if (mismaFecha.length >= 2) {
        console.warn(
          `[Dataverse] Bloqueado: ya hay ${mismaFecha.length} campañas activas el ${campaign.diaEnvio}, no se registra "${campaign.nombreCampana}"`,
        )
        return
      }

      const fechas = fechasDeEnvio(campaign)
      const campaignFields = await resolveCampaignLevelFields(campaign, fechas.length)
      await Promise.all(
        fechas.map((fecha) =>
          dvUpsert(ENTITY_SET, KEY_FIELD, idExterno(campaign, fecha), {
            ...campaignFields,
            ...mapOcurrenciaFields(campaign, fecha),
          }),
        ),
      )
    } catch (err) {
      console.error('[Dataverse] No se pudo registrar la campaña', err)
    }
  },

  /**
   * Actualiza SOLO los campos de campaña (ej. estado al aprobar/rechazar)
   * en todas las filas de esa campaña, vía upsert por la misma clave. No
   * toca los campos de ocurrencia (fecha, canal, estado de envío) — esos
   * los administra el flujo de Power Automate. No lanza: solo loguea.
   */
  async syncOnUpdate(campaign: Campaign): Promise<void> {
    try {
      const fechas = fechasDeEnvio(campaign)
      const campaignFields = await resolveCampaignLevelFields(campaign, fechas.length)
      await Promise.all(
        fechas.map((fecha) => dvUpsert(ENTITY_SET, KEY_FIELD, idExterno(campaign, fecha), campaignFields)),
      )
    } catch (err) {
      console.error('[Dataverse] No se pudo actualizar la campaña', err)
    }
  },

  /**
   * Borra todas las filas de la campaña (una por fecha de envío). Como
   * Dataverse ahora es la fuente de verdad para lectura, si esto falla la
   * campaña "eliminada" volvería a aparecer en el próximo refresh. No
   * lanza: solo loguea.
   */
  async deleteCampaign(campaign: Campaign): Promise<void> {
    try {
      const fechas = fechasDeEnvio(campaign)
      await Promise.all(fechas.map((fecha) => dvDelete(ENTITY_SET, KEY_FIELD, idExterno(campaign, fecha))))
    } catch (err) {
      console.error('[Dataverse] No se pudo eliminar la campaña', err)
    }
  },
}
