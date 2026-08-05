'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Typography, IconButton, Tooltip, Divider, Chip, Button,
} from '@mui/material'
import ArrowBackIcon        from '@mui/icons-material/ArrowBack'
import HourglassTopIcon     from '@mui/icons-material/HourglassTop'
import CheckCircleIcon      from '@mui/icons-material/CheckCircle'
import ThumbDownIcon        from '@mui/icons-material/ThumbDown'
import SendIcon             from '@mui/icons-material/Send'
import DeleteOutlineIcon    from '@mui/icons-material/DeleteOutline'
import MarkEmailReadIcon    from '@mui/icons-material/MarkEmailRead'
import MarkEmailUnreadIcon  from '@mui/icons-material/MarkEmailUnread'
import dayjs from 'dayjs'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useCampaignStore } from '@/store/campaign.store'
import { useCampaigns } from '@/hooks/useCampaigns'
import {
  useNotifications, useToggleNotificationRead, useMarkAllNotificationsRead, useDismissNotification,
} from '@/hooks/useNotifications'
import type { Notification, NotificationTipo } from '@/types'

const ICONO: Record<NotificationTipo, React.ReactNode> = {
  PENDIENTE_APROBACION: <HourglassTopIcon fontSize="small" sx={{ color: '#F59E0B' }} />,
  APROBADA:             <CheckCircleIcon fontSize="small" sx={{ color: '#111827' }} />,
  RECHAZADA:            <ThumbDownIcon fontSize="small" sx={{ color: '#DC2626' }} />,
  ENVIADA:              <SendIcon fontSize="small" sx={{ color: '#3D7A00' }} />,
}

function NotificacionesContent() {
  const router = useRouter()
  const { data: notifications } = useNotifications()
  const { data: campaigns } = useCampaigns()
  const { setSelectedCampaign, setDetailOpen } = useCampaignStore()
  const toggleLeida = useToggleNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const dismiss      = useDismissNotification()
  const [pendingDelete, setPendingDelete] = useState<Notification | null>(null)

  const lista = notifications ?? []

  const verCampana = (campaignId: string) => {
    const campaign = campaigns?.find((c) => c.id === campaignId)
    if (campaign) {
      setSelectedCampaign(campaign)
      setDetailOpen(true)
      router.push('/')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Box sx={{
        bgcolor: '#E40521', color: '#fff', px: 2.5, py: 1.75,
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Tooltip title="Volver al calendario">
          <IconButton onClick={() => router.push('/')} sx={{ color: '#fff' }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h6" fontWeight={700} flex={1}>Notificaciones</Typography>
        {lista.some((n) => !n.leida) && (
          <Button size="small" onClick={() => markAllRead.mutate()}
            sx={{ color: '#fff', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>
            Marcar todas como leídas
          </Button>
        )}
      </Box>

      <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        {lista.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">No tienes notificaciones.</Typography>
          </Box>
        ) : (
          <Box sx={{ bgcolor: '#fff', borderRadius: 2, overflow: 'hidden', border: '1px solid #dee2e6' }}>
            {lista.map((n, i) => (
              <React.Fragment key={n.id}>
                {i > 0 && <Divider />}
                <Box sx={{
                  display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 2,
                  bgcolor: n.leida ? 'transparent' : '#fff8f0',
                }}>
                  <Box sx={{ mt: 0.3 }}>{ICONO[n.tipo]}</Box>

                  <Box flex={1} minWidth={0} sx={{ cursor: 'pointer' }} onClick={() => verCampana(n.campaignId)}>
                    <Typography variant="body2" fontWeight={n.leida ? 400 : 700}>{n.mensaje}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(n.fecha).format('DD/MM/YYYY HH:mm')}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={0.5} flexShrink={0}>
                    <Tooltip title={n.leida ? 'Marcar como no leída' : 'Marcar como leída'}>
                      <Chip
                        size="small"
                        icon={n.leida ? <MarkEmailReadIcon fontSize="small" /> : <MarkEmailUnreadIcon fontSize="small" />}
                        label={n.leida ? 'Leída' : 'No leída'}
                        onClick={() => toggleLeida.mutate({ id: n.id, leida: !n.leida })}
                        color={n.leida ? 'default' : 'warning'}
                        variant={n.leida ? 'outlined' : 'filled'}
                        sx={{ fontWeight: 600, cursor: 'pointer' }}
                      />
                    </Tooltip>
                    <Tooltip title="Eliminar notificación">
                      <IconButton size="small" color="error" onClick={() => setPendingDelete(n)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </React.Fragment>
            ))}
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={!!pendingDelete}
        title="¿Eliminar notificación?"
        message="Se quita de esta lista. Si la campaña vuelve a cambiar de estado, puede volver a aparecer como una notificación nueva."
        confirmLabel="Sí, eliminar"
        confirmColor="error"
        onConfirm={() => { if (pendingDelete) dismiss.mutate(pendingDelete.id); setPendingDelete(null) }}
        onCancel={() => setPendingDelete(null)}
      />
    </Box>
  )
}

export function NotificacionesPage() {
  return (
    <AuthGuard>
      <NotificacionesContent />
    </AuthGuard>
  )
}
