'use client'

import React from 'react'
import { Box, CircularProgress, Typography, Button } from '@mui/material'
import { useCurrentUser, useUserLoading } from './UserProvider'

interface Props {
  children: React.ReactNode
}

/**
 * Ya no redirige a un /login propio: Azure App Service Easy Auth
 * intercepta las requests no autenticadas ANTES de que lleguen a Next.js
 * (cuando "Require authentication" está activo en el App Service) y
 * redirige solo a Microsoft. Acá solo esperamos /.auth/me y, si por algún
 * motivo no hay sesión (típicamente en `npm run dev` local, donde Easy
 * Auth no corre), mostramos un mensaje en vez de loopear un redirect.
 */
export function AuthGuard({ children }: Props) {
  const user = useCurrentUser()
  const loading = useUserLoading()

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" gap={2}>
        <CircularProgress color="primary" />
        <Typography variant="caption" color="text.secondary">Verificando sesión...</Typography>
      </Box>
    )
  }

  if (!user) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" gap={2} px={3} textAlign="center">
        <Typography variant="h6">No se detectó una sesión de Microsoft Entra ID</Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={420}>
          Esta app se autentica con Azure Easy Auth. Si estás en desarrollo local
          (`npm run dev`), /.auth/me no existe — probá desde el sitio desplegado en
          Azure App Service, o inicia sesión manualmente.
        </Typography>
        <Button variant="contained" sx={{ bgcolor: '#E40521' }} href="/.auth/login/aad">
          Iniciar sesión
        </Button>
      </Box>
    )
  }

  return <>{children}</>
}
