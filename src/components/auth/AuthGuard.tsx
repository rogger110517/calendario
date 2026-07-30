'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuthStore } from '@/store/auth.store'

interface Props {
  children: React.ReactNode
}

export function AuthGuard({ children }: Props) {
  const { isAuthenticated, _hydrated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (_hydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [_hydrated, isAuthenticated, router])

  // Esperando rehidratación de Zustand desde localStorage
  if (!_hydrated) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" gap={2}>
        <CircularProgress color="primary" />
        <Typography variant="caption" color="text.secondary">Verificando sesión...</Typography>
      </Box>
    )
  }

  // No autenticado — useEffect hará el redirect, mostramos spinner mientras
  if (!isAuthenticated) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
        <CircularProgress color="primary" />
      </Box>
    )
  }

  return <>{children}</>
}
