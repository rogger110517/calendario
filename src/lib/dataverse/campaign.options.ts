/**
 * Valores numéricos de las columnas Choice/Picklist de
 * cre47_comunicaciondecampana (entorno QA — mafperutst.crm.dynamics.com).
 *
 * Confirmados el 2026-08-02 consultando
 * EntityDefinitions(...)/Attributes(...)/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet
 * directamente contra Dataverse (no son un placeholder). Si se agregan
 * opciones nuevas en Power Apps, hay que volver a consultar y actualizar
 * este archivo a mano.
 */
import type { CampaignEstado, TipoRecurrencia, CommunicationCanal, CommunicationEstado } from '@/types'

export const ESTADO_CAMPANA_OPTIONS: Record<CampaignEstado, number> = {
  Pendiente: 333900000,
  Aprobada: 333900001,
  Rechazada: 333900002,
  Ejecutada: 333900003,
  Cancelada: 333900004,
}

export const TIPO_RECURRENCIA_OPTIONS: Record<TipoRecurrencia, number> = {
  Diario: 333900000,
  Semanal: 333900001,
  Mensual: 333900002,
  Trimestral: 333900003,
  Anual: 333900004,
}

export const CANAL_ENVIO_OPTIONS: Record<CommunicationCanal, number> = {
  Email: 333900000,
  SMS: 333900001,
  Push: 333900002,
  WhatsApp: 333900003,
}

export const ESTADO_ENVIO_OPTIONS: Record<CommunicationEstado, number> = {
  Pendiente: 333900000,
  Programado: 333900001,
  Enviado: 333900002,
  Error: 333900003,
  Cancelado: 333900004,
}

function invert<T extends string>(obj: Record<T, number>): Record<number, T> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v as number, k])) as Record<number, T>
}

/** Mapas inversos — para reconstruir Campaign a partir de filas de Dataverse (lectura). */
export const ESTADO_CAMPANA_REVERSE = invert(ESTADO_CAMPANA_OPTIONS)
export const TIPO_RECURRENCIA_REVERSE = invert(TIPO_RECURRENCIA_OPTIONS)
