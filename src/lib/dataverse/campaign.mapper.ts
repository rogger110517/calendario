/**
 * Mapea Campaign (src/types/index.ts) → columnas reales de
 * cre47_comunicaciondecampana en Dataverse QA.
 *
 * Cada Campaign tiene una única fecha de envío (diaEnvio) → una única fila
 * en Dataverse. "recurrencia"/"tipoRecurrencia" son solo informativos: si
 * el usuario necesita varias fechas, registra una campaña por cada una.
 * Ver src/DESPLIEGUE_DATAVERSE.md.
 */
import dayjs from 'dayjs'
import type { Campaign, Dealer, Unidad } from '@/types'
import { getUserRole } from '@/lib/auth/roles'
import {
  CANAL_ENVIO_OPTIONS,
  ESTADO_CAMPANA_OPTIONS,
  ESTADO_ENVIO_OPTIONS,
  TIPO_RECURRENCIA_OPTIONS,
} from './campaign.options'

const ROL_LABEL = { admin: 'Administrador', colaborador: 'Colaborador' } as const

/**
 * Separador usado para juntar varios dealers en una sola columna de texto de
 * Dataverse. ";" en vez de "," porque los nombres de dealer pueden traer
 * comas propias (ej. razones sociales "S.A.C., ..."), lo que rompería un
 * split por coma; ";" no aparece en ningún nombre de la lista y permite a
 * Power Automate hacer split(cre47_nombredelconcesionario, ';') para saber
 * exactamente cuántos dealers van y cuáles son.
 */
export const SEPARADOR_DEALERS = '; '

/** Campos que son iguales en todas las filas de una misma campaña. */
export function mapCampaignLevelFields(
  campaign: Campaign,
  dealers: Dealer[],
  unidad: Unidad | null,
  totalOcurrencias: number,
) {
  return {
    cre47_nombredelacampana: campaign.nombreCampana,
    cre47_asuntodelcorreo: campaign.subject,
    cre47_aquienvadirigido: campaign.dirigidoA,
    cre47_filtrosaaplicarsobrelabasedeclientes: campaign.filtrosAplicar,
    cre47_unidaddenegocio: unidad?.nombre ?? '',
    cre47_nombredelconcesionario: dealers.map((d) => d.nombre).join(SEPARADOR_DEALERS),
    cre47_codigodelconcesionario: dealers.map((d) => d.codigo).join(SEPARADOR_DEALERS),
    cre47_cantidaddealers: campaign.cantidadDealers ?? null,
    cre47_fechadeiniciodelacampana: limaAUtc(campaign.diaEnvio),
    cre47_horadeenvio: limaAUtc(campaign.diaEnvio, campaign.horaEnvio),
    cre47_silacampanaesrecurrente: campaign.recurrencia,
    ...(campaign.tipoRecurrencia
      ? { cre47_tipoderecurrencia: TIPO_RECURRENCIA_OPTIONS[campaign.tipoRecurrencia] }
      : {}),
    cre47_cantidadtotaldecomunicaciones: totalOcurrencias,
    cre47_urldelarchivoadjunto: campaign.linkOneDrive ?? '',
    cre47_comentarios: campaign.comentarios ?? '',
    // campaign.solicitante ya es el correo (Easy Auth, sin catálogo local de usuarios).
    cre47_correodelsolicitante: campaign.solicitante,
    // Rol del solicitante (Administrador/Colaborador) — mismo cálculo que
    // usa la app para permisos, ver src/lib/auth/roles.ts.
    cre47_tipodeusuario: ROL_LABEL[getUserRole(campaign.solicitante)],
    // fechaRegistro ya es un ISO datetime con offset real (dayjs().toISOString()
    // en campaign.service.ts) — no pasa por limaAUtc.
    cre47_fechaderegistrodelacampana: campaign.fechaRegistro,
    cre47_estadodelacampana: ESTADO_CAMPANA_OPTIONS[campaign.estado],
  }
}

/** ID externo único por fila (campaña + fecha) — usado como clave alternativa cre47_campanaid para upsert idempotente. */
export function idExterno(campaign: Campaign, fecha: string): string {
  return `${campaign.id}-${fecha}`
}

/** Campos propios de una fecha de envío puntual (una fila = una fecha). */
export function mapOcurrenciaFields(campaign: Campaign, fecha: string) {
  return {
    cre47_campanaid: idExterno(campaign, fecha),
    cre47_nombredelacomunicacion: `${campaign.nombreCampana} (${fecha})`,
    cre47_fechasrecurrencia: limaAUtc(fecha),
    cre47_fechayhoraprogramadaparaesteenvio: limaAUtc(fecha, campaign.horaEnvio),
    // Único canal implementado hoy (SendGrid) — no hay campo de canal en
    // Campaign todavía. Ajustar si se agrega selección de canal al form.
    cre47_canaldeenvio: CANAL_ENVIO_OPTIONS.Email,
    cre47_estadodelenvio: ESTADO_ENVIO_OPTIONS.Pendiente,
  }
}

/** La(s) fecha(s) de envío de la campaña — hoy siempre es una sola (diaEnvio). */
export function fechasDeEnvio(campaign: Campaign): string[] {
  return [campaign.diaEnvio]
}

/**
 * Convierte una fecha (+ hora opcional) en horario de Lima a un instante
 * UTC real, con "Z". América/Lima es UTC-5 fijo (Perú no aplica horario de
 * verano), así que basta un offset fijo — sin necesitar el plugin timezone
 * de dayjs. Sin esto, Dataverse toma el string tal cual como si YA fuera
 * UTC (no hace la conversión), desfasando la fecha/hora guardada.
 */
function limaAUtc(fechaISO: string, horaHHmm?: string): string {
  const fecha = fechaISO.split('T')[0]
  const hora = horaHHmm && /^\d{2}:\d{2}$/.test(horaHHmm) ? horaHHmm : '00:00'
  return dayjs(`${fecha}T${hora}:00-05:00`).toISOString()
}
