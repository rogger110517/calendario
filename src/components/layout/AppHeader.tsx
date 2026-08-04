'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AppBar, Toolbar, Typography, Box, Avatar, Chip,
  IconButton, Tooltip, Divider, Menu, MenuItem,
  ListItemIcon, ListItemText, Button, Badge,
} from '@mui/material'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import MenuBookIcon              from '@mui/icons-material/MenuBook'
import LogoutIcon                from '@mui/icons-material/Logout'
import SwitchAccountIcon         from '@mui/icons-material/SwitchAccount'
import { useAuthStore }          from '@/store/auth.store'
import { ManualUsuarioModal }    from '@/components/common/ManualUsuarioModal'
import { NotificationsMenu }     from '@/components/layout/NotificationsMenu'
import { useNotifications }      from '@/hooks/useNotifications'

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const ROL_LABEL: Record<string, string> = {
  admin:  'Admin',
  editor: 'Colaborador',
  viewer: 'Visor',
}

export function AppHeader() {
  const { currentUser, logout } = useAuthStore()
  const router  = useRouter()
  const [anchor,       setAnchor]       = useState<null | HTMLElement>(null)
  const [manualOpen,   setManualOpen]   = useState(false)
  const [notifAnchor,  setNotifAnchor]  = useState<null | HTMLElement>(null)
  const { data: notifications } = useNotifications()
  const unreadCount = notifications?.filter((n) => !n.leida).length ?? 0

  const handleLogout = () => {
    setAnchor(null)
    logout()
    router.replace('/login')
  }

  return (
    <>
      <AppBar position="fixed" elevation={0} sx={{
        bgcolor: '#E40521',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        zIndex: (t) => t.zIndex.drawer + 1,
      }}>
        <Toolbar sx={{ gap: 1, minHeight: '48px !important', px: 2 }}>

          {/* Logo MAF */}
          <Box
            component="img"
            src="https://mafperu.com/wp-content/uploads/2023/04/logo-mafperu.webp"
            alt="MAF Perú"
            sx={{ height: 26, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          />
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />
          <Typography variant="subtitle2" component="span" color="white" fontWeight={700}
            sx={{ letterSpacing: 0.1, display: { xs: 'none', sm: 'block' } }}>
            Comunicaciones Corporativas
          </Typography>

          <Box flex={1} />

          {/* Notificaciones */}
          <Tooltip title="Notificaciones">
            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.85)' }}
              onClick={(e) => setNotifAnchor(e.currentTarget)}>
              <Badge badgeContent={unreadCount} color="error" max={9}
                sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 15, minWidth: 15 } }}>
                <NotificationsOutlinedIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <NotificationsMenu anchorEl={notifAnchor} onClose={() => setNotifAnchor(null)} />

          {/* Manual de uso */}
          <Tooltip title="Manual de usuario">
            <Button
              size="small"
              startIcon={<MenuBookIcon fontSize="small" />}
              onClick={() => setManualOpen(true)}
              sx={{
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.78rem',
                px: 1.25,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
              }}
            >
              Manual
            </Button>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.25)', mx: 0.5 }} />

          {/* Usuario */}
          {currentUser && (
            <Box display="flex" alignItems="center" gap={1}>
              <Box textAlign="right" sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="caption" color="white" display="block" fontWeight={600} lineHeight={1.2}>
                  {currentUser.nombre}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.67rem' }}>
                  {currentUser.correo}
                </Typography>
              </Box>
              <Chip
                label={ROL_LABEL[currentUser.rol] ?? currentUser.rol}
                size="small"
                sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}
              />
              <Tooltip title="Mi cuenta">
                <Avatar
                  onClick={(e) => setAnchor(e.currentTarget)}
                  sx={{
                    width: 32, height: 32,
                    bgcolor: 'rgba(255,255,255,0.25)',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    border: '2px solid rgba(255,255,255,0.4)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.38)' },
                  }}
                >
                  {getInitials(currentUser.nombre)}
                </Avatar>
              </Tooltip>
            </Box>
          )}
        </Toolbar>

        {/* Menú de cuenta */}
        <Menu
          anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{ paper: { elevation: 3, sx: { mt: 0.5, minWidth: 230, borderRadius: 2 } } }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #dee2e6' }}>
            <Typography variant="body2" fontWeight={700}>{currentUser?.nombre}</Typography>
            <Typography variant="caption" color="text.secondary">{currentUser?.correo}</Typography>
            <Box mt={0.75}>
              <Chip label={ROL_LABEL[currentUser?.rol ?? ''] ?? currentUser?.rol} size="small"
                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#E40521', color: '#fff' }} />
            </Box>
          </Box>
          <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.25 }}>
            <ListItemIcon><SwitchAccountIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Cambiar cuenta" primaryTypographyProps={{ variant: 'body2' }} />
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.25, color: 'error.main' }}>
            <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText primary="Cerrar sesión" primaryTypographyProps={{ variant: 'body2', color: 'error' }} />
          </MenuItem>
        </Menu>
      </AppBar>

      <ManualUsuarioModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </>
  )
}
