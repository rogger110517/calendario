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
 * El estado "leída" es solo de UI, se guarda en localStorage (no hace
 * falta que se sincronice entre dispositivos).
 */

const LEIDAS_KEY = ['notificaciones-leidas'] as const
const READ_STORAGE_KEY = 'cc_notificaciones_leidas'

function leerLeidasStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(READ_STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function guardarLeidasStorage(ids: string[]) {
  if (typeof window !== 'undefined') localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids))
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
): Notification[] {
  if (esAdmin) {
    return campaigns
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
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }

  return campaigns
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
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export function useNotifications() {
  const currentUser = useCurrentUser()
  const { data: campaigns } = useCampaigns()
  const { data: leidasArr } = useQuery({
    queryKey: LEIDAS_KEY,
    queryFn: () => leerLeidasStorage(),
    staleTime: Infinity,
  })

  const data = useMemo(() => {
    if (!currentUser || !campaigns) return []
    return derivarNotificaciones(campaigns, currentUser.correo, currentUser.rol === 'admin', new Set(leidasArr ?? []))
  }, [currentUser, campaigns, leidasArr])

  return { data }
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const actuales = new Set(leerLeidasStorage())
      actuales.add(id)
      const ids = [...actuales]
      guardarLeidasStorage(ids)
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
      const actuales = new Set(leerLeidasStorage())
      if (currentUser && campaigns) {
        const todas = derivarNotificaciones(campaigns, currentUser.correo, currentUser.rol === 'admin', new Set())
        todas.forEach((n) => actuales.add(n.id))
      }
      const ids = [...actuales]
      guardarLeidasStorage(ids)
      return ids
    },
    onSuccess: (ids) => qc.setQueryData(LEIDAS_KEY, ids),
  })
}
