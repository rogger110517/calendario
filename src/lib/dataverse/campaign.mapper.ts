/**
 * Mapea Campaign (src/types/index.ts) → columnas reales de
 * cre47_comunicaciondecampana en Dataverse QA.
 *
 * Diseño "una fila por fecha de envío": una Campaign recurrente genera
 * varias fechas (diaEnvio + fechasRecurrencia). Se crea una fila de
 * Dataverse por cada fecha, compartiendo los campos "de campaña" y
 * variando los campos "de ocurrencia" (fecha programada, canal, estado de
 * envío). Ver src/DESPLIEGUE_DATAVERSE.md.
 */
import type { Campaign, Dealer, Unidad, User } from '@/types'
import {
  CANAL_ENVIO_OPTIONS,
  ESTADO_CAMPANA_OPTIONS,
  ESTADO_ENVIO_OPTIONS,
  TIPO_RECURRENCIA_OPTIONS,
} from './campaign.options'

/** Campos que son iguales en todas las filas de una misma campaña. */
export function mapCampaignLevelFields(
  campaign: Campaign,
  dealer: Dealer | null,
  unidad: Unidad | null,
  solicitante: User | null,
  totalOcurrencias: number,
) {
  return {
    cre47_nombredelacampana: campaign.nombreCampana,
    cre47_asuntodelcorreo: campaign.subject,
    cre47_aquienvadirigido: campaign.dirigidoA,
    cre47_filtrosaaplicarsobrelabasedeclientes: campaign.filtrosAplicar,
    cre47_unidaddenegocio: unidad?.nombre ?? '',
    cre47_nombredelconcesionario: dealer?.nombre ?? '',
    cre47_codigodelconcesionario: dealer?.codigo ?? '',
    cre47_cantidaddealers: campaign.cantidadDealers ?? null,
    cre47_fechadeiniciodelacampana: campaign.diaEnvio,
    cre47_fechadefindelacampana: campaign.diaFin,
    cre47_horadeenvio: combinarFechaHora(campaign.diaEnvio, campaign.horaEnvio),
    cre47_silacampanaesrecurrente: campaign.recurrencia,
    ...(campaign.tipoRecurrencia
      ? { cre47_tipoderecurrencia: TIPO_RECURRENCIA_OPTIONS[campaign.tipoRecurrencia] }
      : {}),
    cre47_cantidadtotaldecomunicaciones: totalOcurrencias,
    cre47_urldelarchivoadjunto: campaign.linkOneDrive ?? '',
    cre47_comentarios: campaign.comentarios ?? '',
    cre47_correodelsolicitante: solicitante?.correo ?? '',
    cre47_fechaderegistrodelacampana: campaign.fechaRegistro,
    cre47_estadodelacampana: ESTADO_CAMPANA_OPTIONS[campaign.estado],
  }
}

/** Campos propios de una fecha de envío puntual (una fila = una fecha). */
export function mapOcurrenciaFields(campaign: Campaign, fecha: string) {
  return {
    cre47_nombredelacomunicacion: `${campaign.nombreCampana} (${fecha})`,
    cre47_fechasrecurrencia: fecha,
    cre47_fechayhoraprogramadaparaesteenvio: combinarFechaHora(fecha, campaign.horaEnvio),
    // Único canal implementado hoy (SendGrid) — no hay campo de canal en
    // Campaign todavía. Ajustar si se agrega selección de canal al form.
    cre47_canaldeenvio: CANAL_ENVIO_OPTIONS.Email,
    cre47_estadodelenvio: ESTADO_ENVIO_OPTIONS.Pendiente,
  }
}

/** Todas las fechas de envío de la campaña: diaEnvio + fechasRecurrencia. */
export function fechasDeEnvio(campaign: Campaign): string[] {
  return [campaign.diaEnvio, ...(campaign.recurrencia ? campaign.fechasRecurrencia ?? [] : [])]
}

function combinarFechaHora(fechaISO: string, horaHHmm: string | undefined): string {
  const fecha = fechaISO.split('T')[0]
  return `${fecha}T${horaHHmm && /^\d{2}:\d{2}$/.test(horaHHmm) ? horaHHmm : '00:00'}:00`
}
