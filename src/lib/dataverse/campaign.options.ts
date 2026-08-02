/**
 * Valores numéricos de las columnas Choice/Picklist de
 * cre47_comunicaciondecampana (entorno QA).
 *
 * PENDIENTE DE CONFIRMAR: estos son valores placeholder siguiendo la
 * numeración estándar que Dataverse asigna por default a option sets
 * personalizados (100000000, 100000001, ...). Hay que verificarlos en QA:
 * Power Apps → Tablas → cre47_comunicaciondecampana → Columnas → abrir cada
 * columna Choice → "Editar opciones" → el "Valor" numérico de cada opción.
 * Ajustar aquí una vez confirmados. Ver src/DESPLIEGUE_DATAVERSE.md.
 */
import type { CampaignEstado, TipoRecurrencia, CommunicationCanal, CommunicationEstado } from '@/types'

export const ESTADO_CAMPANA_OPTIONS: Record<CampaignEstado, number> = {
  Pendiente: 100000000,
  Aprobada: 100000001,
  Rechazada: 100000002,
  Ejecutada: 100000003,
  Cancelada: 100000004,
}

export const TIPO_RECURRENCIA_OPTIONS: Record<TipoRecurrencia, number> = {
  Diario: 100000000,
  Semanal: 100000001,
  Trimestral: 100000002,
}

export const CANAL_ENVIO_OPTIONS: Record<CommunicationCanal, number> = {
  Email: 100000000,
  SMS: 100000001,
  Push: 100000002,
  WhatsApp: 100000003,
}

export const ESTADO_ENVIO_OPTIONS: Record<CommunicationEstado, number> = {
  Pendiente: 100000000,
  Programado: 100000001,
  Enviado: 100000002,
  Error: 100000003,
  Cancelado: 100000004,
}
