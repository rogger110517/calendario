/**
 * Reconstruye Campaign[] a partir de las filas de cre47_comunicaciondecampana
 * en Dataverse — Dataverse es la fuente de verdad para lectura del
 * calendario (ver src/DESPLIEGUE_DATAVERSE.md sección 8). Cada Campaign es
 * hoy exactamente 1 fila (1 campaña = 1 fecha de envío); se agrupa por el
 * prefijo de campaignId en cre47_campanaid (`${campaignId}-${fecha}`) para
 * seguir soportando filas legacy de antes de este cambio.
 */
import { dvList } from './client'
import { ESTADO_CAMPANA_REVERSE, TIPO_RECURRENCIA_REVERSE } from './campaign.options'
import { SEPARADOR_DEALERS } from './campaign.mapper'
import { UnidadRepository } from '@/lib/repositories/unidad.repository'
import { DealerRepository } from '@/lib/repositories/dealer.repository'
import type { Campaign } from '@/types'

const ENTITY_SET = 'cre47_comunicaciondecampanas'
const CAMPO_LIMA_OFFSET_MS = 5 * 60 * 60 * 1000 // America/Lima = UTC-5 fijo

const CAMPOS = [
  'cre47_campanaid',
  'cre47_nombredelacampana',
  'cre47_asuntodelcorreo',
  'cre47_aquienvadirigido',
  'cre47_filtrosaaplicarsobrelabasedeclientes',
  'cre47_unidaddenegocio',
  'cre47_nombredelconcesionario',
  'cre47_cantidaddealers',
  'cre47_fechadeiniciodelacampana',
  'cre47_horadeenvio',
  'cre47_silacampanaesrecurrente',
  'cre47_tipoderecurrencia',
  'cre47_urldelarchivoadjunto',
  'cre47_comentarios',
  'cre47_correodelsolicitante',
  'cre47_fechaderegistrodelacampana',
  'cre47_estadodelacampana',
]

interface DvRow {
  cre47_campanaid: string | null
  cre47_nombredelacampana: string
  cre47_asuntodelcorreo: string
  cre47_aquienvadirigido: string
  cre47_filtrosaaplicarsobrelabasedeclientes: string | null
  cre47_unidaddenegocio: string | null
  cre47_nombredelconcesionario: string | null
  cre47_cantidaddealers: number | null
  cre47_fechadeiniciodelacampana: string
  cre47_horadeenvio: string
  cre47_silacampanaesrecurrente: boolean
  cre47_tipoderecurrencia: number | null
  cre47_urldelarchivoadjunto: string | null
  cre47_comentarios: string | null
  cre47_correodelsolicitante: string | null
  cre47_fechaderegistrodelacampana: string
  cre47_estadodelacampana: number
}

/** Instante UTC (con Z) → fecha calendario de Lima "YYYY-MM-DD". Aritmética nativa, no depende del huso del servidor. */
function utcAFechaLima(utcIso: string): string {
  const d = new Date(new Date(utcIso).getTime() - CAMPO_LIMA_OFFSET_MS)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** Instante UTC (con Z) → hora de Lima "HH:mm". */
function utcAHoraLima(utcIso: string): string {
  const d = new Date(new Date(utcIso).getTime() - CAMPO_LIMA_OFFSET_MS)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** campaignId a partir de "campaignId-YYYY-MM-DD" (quita el último segmento de fecha). */
function campaignIdDesdeClave(campanaid: string): string {
  return campanaid.replace(/-\d{4}-\d{2}-\d{2}$/, '')
}

export async function fetchCampaignsFromDataverse(): Promise<Campaign[]> {
  const rows = await dvList<DvRow>(ENTITY_SET, CAMPOS)
  const filasConClave = rows.filter((r): r is DvRow & { cre47_campanaid: string } => !!r.cre47_campanaid)

  const grupos = new Map<string, DvRow[]>()
  for (const row of filasConClave) {
    const campaignId = campaignIdDesdeClave(row.cre47_campanaid)
    const grupo = grupos.get(campaignId)
    if (grupo) grupo.push(row)
    else grupos.set(campaignId, [row])
  }

  const [unidades, dealers] = await Promise.all([
    UnidadRepository.findAll(),
    DealerRepository.findAll(),
  ])

  const campaigns: Campaign[] = []
  for (const [campaignId, filas] of grupos) {
    const first = filas[0]
    const diaEnvio = utcAFechaLima(first.cre47_fechadeiniciodelacampana)

    const unidad = unidades.find((u) => u.nombre === first.cre47_unidaddenegocio)
    const nombresDealers = (first.cre47_nombredelconcesionario ?? '')
      .split(SEPARADOR_DEALERS)
      .map((n) => n.trim())
      .filter(Boolean)
    const dealersCampana = nombresDealers
      .map((nombre) => dealers.find((d) => d.nombre === nombre)?.id)
      .filter((id): id is string => !!id)

    campaigns.push({
      id: campaignId,
      nombreCampana: first.cre47_nombredelacampana,
      subject: first.cre47_asuntodelcorreo,
      dirigidoA: first.cre47_aquienvadirigido,
      filtrosAplicar: first.cre47_filtrosaaplicarsobrelabasedeclientes ?? '',
      unidad: unidad?.id ?? '',
      dealers: dealersCampana,
      cantidadDealers: first.cre47_cantidaddealers ?? undefined,
      diaEnvio,
      horaEnvio: utcAHoraLima(first.cre47_horadeenvio),
      recurrencia: !!first.cre47_silacampanaesrecurrente,
      tipoRecurrencia: first.cre47_tipoderecurrencia != null
        ? TIPO_RECURRENCIA_REVERSE[first.cre47_tipoderecurrencia]
        : undefined,
      linkOneDrive: first.cre47_urldelarchivoadjunto ?? undefined,
      comentarios: first.cre47_comentarios ?? undefined,
      // solicitante = correo directamente (Easy Auth, sin catálogo local de usuarios).
      solicitante: first.cre47_correodelsolicitante ?? '',
      fechaRegistro: first.cre47_fechaderegistrodelacampana,
      estado: ESTADO_CAMPANA_REVERSE[first.cre47_estadodelacampana] ?? 'Pendiente',
    })
  }

  return campaigns.sort((a, b) => a.diaEnvio.localeCompare(b.diaEnvio))
}
