'use client'

import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { useCurrentUser } from './UserProvider'

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  colaborador: 'Colaborador',
}

/** Muestra correo + rol del usuario autenticado (Easy Auth). */
export function UserProfile() {
  const user = useCurrentUser()
  if (!user) return null

  return (
    <Box>
      <Typography variant="body2" fontWeight={700}>{user.correo}</Typography>
      <Box mt={0.5}>
        <Chip
          label={ROL_LABEL[user.rol] ?? user.rol}
          size="small"
          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#E40521', color: '#fff' }}
        />
      </Box>
    </Box>
  )
}
