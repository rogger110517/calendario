'use client'

import React from 'react'
import {
  Menu, Box, Typography, Divider, Button, MenuItem,
  ListItemIcon, ListItemText,
} from '@mui/material'
import HourglassTopIcon    from '@mui/icons-material/HourglassTop'
import CheckCircleIcon     from '@mui/icons-material/CheckCircle'
import ThumbDownIcon       from '@mui/icons-material/ThumbDown'
import SendIcon            from '@mui/icons-material/Send'
import dayjs from 'dayjs'
import { useAuthStore } from '@/store/auth.store'
import { useCampaignStore } from '@/store/campaign.store'
import { useCampaigns } from '@/hooks/useCampaigns'
import {
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
} from '@/hooks/useNotifications'
import type { NotificationTipo } from '@/types'

const ICONO: Record<NotificationTipo, React.ReactNode> = {
  PENDIENTE_APROBACION: <HourglassTopIcon fontSize="small" sx={{ color: '#F59E0B' }} />,
  APROBADA:             <CheckCircleIcon fontSize="small" sx={{ color: '#111827' }} />,
  RECHAZADA:            <ThumbDownIcon fontSize="small" sx={{ color: '#DC2626' }} />,
  ENVIADA:              <SendIcon fontSize="small" sx={{ color: '#3D7A00' }} />,
}

interface Props { anchorEl: HTMLElement | null; onClose: () => void }

export function NotificationsMenu({ anchorEl, onClose }: Props) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const { data: notifications } = useNotifications()
  const { data: campaigns } = useCampaigns()
  const { setSelectedCampaign, setDetailOpen } = useCampaignStore()
  const markRead    = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const lista = notifications ?? []

  const handleClick = (notificationId: string, campaignId: string) => {
    markRead.mutate(notificationId)
    const campaign = campaigns?.find((c) => c.id === campaignId)
    if (campaign) { setSelectedCampaign(campaign); setDetailOpen(true) }
    onClose()
  }

  return (
    <Menu
      anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      slotProps={{ paper: { elevation: 3, sx: { mt: 0.5, width: 340, maxHeight: 420, borderRadius: 2 } } }}
    >
      <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" fontWeight={700}>Notificaciones</Typography>
        {lista.some((n) => !n.leida) && (
          <Button size="small" sx={{ textTransform: 'none', fontSize: '0.72rem' }}
            onClick={() => currentUser && markAllRead.mutate(currentUser.id)}>
            Marcar todas como leídas
          </Button>
        )}
      </Box>
      <Divider />
      {lista.length === 0 ? (
        <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">Sin notificaciones</Typography>
        </Box>
      ) : (
        lista.map((n) => (
          <MenuItem key={n.id} onClick={() => handleClick(n.id, n.campaignId)}
            sx={{ gap: 1.25, py: 1, alignItems: 'flex-start', bgcolor: n.leida ? 'transparent' : '#fff8f0', whiteSpace: 'normal' }}>
            <ListItemIcon sx={{ mt: 0.25, minWidth: 28 }}>{ICONO[n.tipo]}</ListItemIcon>
            <ListItemText
              primary={n.mensaje}
              secondary={dayjs(n.fecha).format('DD/MM/YYYY HH:mm')}
              primaryTypographyProps={{ variant: 'body2', fontWeight: n.leida ? 400 : 700, sx: { lineHeight: 1.3 } }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        ))
      )}
    </Menu>
  )
}
