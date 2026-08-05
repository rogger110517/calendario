import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/components/auth/UserProvider'
import { useCampaigns } from '@/hooks/useCampaigns'
import type { Campaign, Notification, NotificationTipo } from '@/types'

/**
 * Las notificaciones se DERIVAN de las campañas reales (Dataverse, vía
 * useCampaigns) en vez de guardarse en un log aparte — así admin y
 * colaborador ven lo correcto sin importar en qué navegador/sesión se
 * creó o cambió de estado la campaña:
 *   - admin: una notificación por cada campaña en estado Pendiente
 *   - colaborador: una por cada campaña propia (solicitante = su correo)
 *     que ya fue Aprobada / Rechazada / Ejecutada
 * "Leída" y "eliminada" son solo de UI, se guardan en localStorage (no
 * hace falta que se sincronicen entre dispositivos). "Eliminar" oculta
 * la notificación de la lista — como el id es determinístico por
 * (campaña, estado), si la campaña vuelve a cambiar de estado aparece
 * como una notificación nueva (id distinto).
 */

const LEIDAS_KEY = ['notificaciones-leidas'] as const
const READ_STORAGE_KEY = 'cc_notificaciones_leidas'
const DESCARTADAS_KEY = ['notificaciones-descartadas'] as const
const DISCARD_STORAGE_KEY = 'cc_notificaciones_descartadas'

function leerSetStorage(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]')
  } catch {
    return []
  }
}

function guardarSetStorage(key: string, ids: string[]) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(ids))
}

type EstadoConNotificacion = 'Aprobada' | 'Rechazada' | 'Ejecutada'

const MENSAJE: Record<EstadoConNotificacion, (nombre: string) => string> = {
  Aprobada:  (n) => `Tu comunicación "${n}" ha sido aprobada`,
  Rechazada: (n) => `Tu comunicación "${n}" ha sido rechazada`,
  Ejecutada: (n) => `Tu comunicación "${n}" ha sido enviada`,
}
const TIPO_POR_ESTADO: Record<EstadoConNotificacion, NotificationTipo> = {
  Aprobada: 'APROBADA', Rechazada: 'RECHAZADA', Ejecutada: 'ENVIADA',
}

function esEstadoConNotificacion(estado: Campaign['estado']): estado is EstadoConNotificacion {
  return estado === 'Aprobada' || estado === 'Rechazada' || estado === 'Ejecutada'
}

function derivarNotificaciones(
  campaigns: Campaign[],
  correo: string,
  esAdmin: boolean,
  leidas: Set<string>,
  descartadas: Set<string>,
): Notification[] {
  const base: Notification[] = esAdmin
    ? campaigns
        .filter((c) => c.estado === 'Pendiente')
        .map((c): Notification => ({
          id: `pend-${c.id}`,
          userId: correo,
          campaignId: c.id,
          tipo: 'PENDIENTE_APROBACION',
          mensaje: `Tienes una comunicación por aprobar: "${c.nombreCampana}"`,
          leida: leidas.has(`pend-${c.id}`),
          fecha: c.fechaRegistro,
        }))
    : campaigns
        .filter((c) => c.solicitante === correo && esEstadoConNotificacion(c.estado))
        .map((c): Notification => {
          const estado = c.estado as EstadoConNotificacion
          const id = `est-${c.id}-${estado}`
          return {
            id,
            userId: correo,
            campaignId: c.id,
            tipo: TIPO_POR_ESTADO[estado],
            mensaje: MENSAJE[estado](c.nombreCampana),
            leida: leidas.has(id),
            fecha: c.fechaRegistro,
          }
        })

  return base
    .filter((n) => !descartadas.has(n.id))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

function useDerivadas() {
  const currentUser = useCurrentUser()
  const { data: campaigns } = useCampaigns()
  const { data: leidasArr } = useQuery({ queryKey: LEIDAS_KEY, queryFn: () => leerSetStorage(READ_STORAGE_KEY), staleTime: Infinity })
  const { data: descartadasArr } = useQuery({ queryKey: DESCARTADAS_KEY, queryFn: () => leerSetStorage(DISCARD_STORAGE_KEY), staleTime: Infinity })

  return useMemo(() => {
    if (!currentUser || !campaigns) return []
    return derivarNotificaciones(
      campaigns, currentUser.correo, currentUser.rol === 'admin',
      new Set(leidasArr ?? []), new Set(descartadasArr ?? []),
    )
  }, [currentUser, campaigns, leidasArr, descartadasArr])
}

/** Todas las notificaciones vigentes (sin límite) — para la página completa. */
export function useNotifications() {
  return { data: useDerivadas() }
}

/** Solo las últimas 5 — para el menú desplegable del header. */
export function useNotificationsPreview() {
  const todas = useDerivadas()
  return { data: todas.slice(0, 5), total: todas.length }
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const actuales = new Set(leerSetStorage(READ_STORAGE_KEY))
      actuales.add(id)
      const ids = [...actuales]
      guardarSetStorage(READ_STORAGE_KEY, ids)
      return ids
    },
    onSuccess: (ids) => qc.setQueryData(LEIDAS_KEY, ids),
  })
}

/** Alterna leída ↔ no leída (para la página completa, donde tiene sentido "desmarcar"). */
export function useToggleNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, leida }: { id: string; leida: boolean }) => {
      const actuales = new Set(leerSetStorage(READ_STORAGE_KEY))
      if (leida) actuales.add(id)
      else actuales.delete(id)
      const ids = [...actuales]
      guardarSetStorage(READ_STORAGE_KEY, ids)
      return ids
    },
    onSuccess: (ids) => qc.setQueryData(LEIDAS_KEY, ids),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  const currentUser = useCurrentUser()
  const { data: campaigns } = useCampaigns()
  return useMutation({
    mutationFn: async () => {
      const actuales = new Set(leerSetStorage(READ_STORAGE_KEY))
      if (currentUser && campaigns) {
        const todas = derivarNotificaciones(campaigns, currentUser.correo, currentUser.rol === 'admin', new Set(), new Set())
        todas.forEach((n) => actuales.add(n.id))
      }
      const ids = [...actuales]
      guardarSetStorage(READ_STORAGE_KEY, ids)
      return ids
    },
    onSuccess: (ids) => qc.setQueryData(LEIDAS_KEY, ids),
  })
}

/** Elimina (oculta) una notificación de la lista. Si la campaña vuelve a cambiar de estado, reaparece como una nueva. */
export function useDismissNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const actuales = new Set(leerSetStorage(DISCARD_STORAGE_KEY))
      actuales.add(id)
      const ids = [...actuales]
      guardarSetStorage(DISCARD_STORAGE_KEY, ids)
      return ids
    },
    onSuccess: (ids) => qc.setQueryData(DESCARTADAS_KEY, ids),
  })
}
