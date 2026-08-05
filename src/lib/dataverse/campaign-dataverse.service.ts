import { dvDeleteById, dvList, dvUpsert } from './client'
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
   * Borra TODAS las filas reales de la campaña. En vez de reconstruir la(s)
   * clave(s) esperadas y borrar por ahí (frágil: si algo no calza exacto
   * con lo guardado, el DELETE por clave alternativa no encuentra nada y
   * no borra nada, sin avisar), consulta Dataverse por prefijo de
   * cre47_campanaid y borra cada fila encontrada por su GUID real — así
   * funciona sin importar si la reconstrucción de fecha/hora coincide
   * exactamente, y de paso limpia filas legacy de antes de este cambio
   * (cuando una campaña recurrente podía generar varias filas).
   *
   * Como Dataverse ahora es la fuente de verdad para lectura, si esto
   * falla la campaña "eliminada" volvería a aparecer en el próximo
   * refresh — por eso devuelve el resultado real (antes se tragaba el
   * error y la app decía "eliminada" aunque no lo estuviera).
   */
  async deleteCampaign(campaign: Campaign): Promise<boolean> {
    try {
      const prefijo = campaign.id.replace(/'/g, "''")
      const filas = await dvList<{ cre47_comunicaciondecampanaid: string }>(
        ENTITY_SET,
        ['cre47_comunicaciondecampanaid'],
        `startswith(${KEY_FIELD},'${prefijo}-')`,
      )
      await Promise.all(filas.map((f) => dvDeleteById(ENTITY_SET, f.cre47_comunicaciondecampanaid)))
      return true
    } catch (err) {
      console.error('[Dataverse] No se pudo eliminar la campaña', err)
      return false
    }
  },
}
