import { dvUpsert } from './client'
import { fechasDeEnvio, idExterno, mapCampaignLevelFields, mapOcurrenciaFields } from './campaign.mapper'
import { fetchCampaignsFromDataverse } from './campaign-dataverse.reader'
import { DealerRepository } from '@/lib/repositories/dealer.repository'
import { UnidadRepository } from '@/lib/repositories/unidad.repository'
import type { Campaign } from '@/types'

const ENTITY_SET = 'cre47_comunicaciondecampanas'
const KEY_FIELD = 'cre47_campanaid'

async function resolveCampaignLevelFields(campaign: Campaign, totalOcurrencias: number) {
  // campaign.solicitante ya es el correo (Easy Auth, no hay catálogo local de usuarios).
  const [dealersEncontrados, unidad] = await Promise.all([
    Promise.all(campaign.dealers.map((id) => DealerRepository.findById(id))),
    UnidadRepository.findById(campaign.unidad),
  ])
  const dealers = dealersEncontrados.filter((d): d is NonNullable<typeof d> => d != null)
  return mapCampaignLevelFields(campaign, dealers, unidad, totalOcurrencias)
}

export const CampaignDataverseService = {
  /**
   * Crea (o repone si ya existía) 1 fila por cada fecha de envío de la
   * campaña, vía upsert por cre47_campanaid (= campaignId + fecha, único
   * por fila). Idempotente: reintentar no duplica filas. No lanza: devuelve
   * `false` si falla (best-effort — no debe romper la creación local).
   *
   * Resguardo de "máximo 2 por día" del lado de Dataverse (además del
   * chequeo en el formulario): si ya hay 2 campañas activas ese día,
   * NO sincroniza — evita que una 3ra llegue a quedar registrada aunque
   * algo se haya colado del lado del cliente.
   */
  async syncOnCreate(campaign: Campaign): Promise<boolean> {
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
        return false
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
      return true
    } catch (err) {
      console.error('[Dataverse] No se pudo registrar la campaña', err)
      return false
    }
  },

  /**
   * Actualiza SOLO los campos de campaña (ej. estado al aprobar/rechazar)
   * en todas las filas de esa campaña, vía upsert por la misma clave. No
   * toca los campos de ocurrencia (fecha, canal, estado de envío) — esos
   * los administra el flujo de Power Automate.
   */
  async syncOnUpdate(campaign: Campaign): Promise<boolean> {
    try {
      const fechas = fechasDeEnvio(campaign)
      const campaignFields = await resolveCampaignLevelFields(campaign, fechas.length)
      await Promise.all(
        fechas.map((fecha) => dvUpsert(ENTITY_SET, KEY_FIELD, idExterno(campaign, fecha), campaignFields)),
      )
      return true
    } catch (err) {
      console.error('[Dataverse] No se pudo actualizar la campaña', err)
      return false
    }
  },

  /**
   * "Elimina" la campaña = soft delete: actualiza cre47_estadodelacampana a
   * Cancelada (333900004) en vez de borrar las filas. Antes hacía un DELETE
   * físico (dvDeleteById) — la fila desaparecía sin pasar nunca por el
   * estado Cancelada, así que el flujo de Power Automate que engancha sobre
   * ese cambio de estado nunca hacía match. El calendario la sigue ocultando
   * igual (Cancelada está en OCULTOS de CalendarView), solo cambia que en
   * Dataverse queda el registro con el estado final en vez de desaparecer.
   */
  async deleteCampaign(campaign: Campaign): Promise<boolean> {
    return CampaignDataverseService.syncOnUpdate({ ...campaign, estado: 'Cancelada' })
  },
}
