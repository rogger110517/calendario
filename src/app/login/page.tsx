'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, Divider,
} from '@mui/material'
import VisibilityIcon    from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import LockOutlinedIcon  from '@mui/icons-material/LockOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  correo:   z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, _hydrated } = useAuthStore()
  const [showPass, setShowPass]   = useState(false)
  const [loginError, setLoginError] = useState('')

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { correo: '', password: '' },
  })

  useEffect(() => {
    if (_hydrated && isAuthenticated) router.replace('/')
  }, [_hydrated, isAuthenticated, router])

  const onSubmit = async (data: FormValues) => {
    setLoginError('')
    const result = login(data.correo, data.password)
    if (!result.ok) {
      setLoginError('Correo o contraseña incorrectos. Verifica tus credenciales.')
    } else {
      router.replace('/')
    }
  }

  if (!_hydrated || isAuthenticated) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bgcolor="#E9EAE8">
        <CircularProgress sx={{ color: '#E40521' }} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#E9EAE8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>

        {/* Logo MAF */}
        <Box textAlign="center" mb={3}>
          <Box
            component="img"
            src="https://mafperu.com/wp-content/uploads/2023/04/logo-mafperu.webp"
            alt="MAF Perú"
            sx={{ height: 56, objectFit: 'contain', mb: 2 }}
          />
          <Typography variant="h6" fontWeight={700} color="#212529">
            Comunicaciones Corporativas
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Mitsui Auto Finance Perú S.A.
          </Typography>
        </Box>

        {/* Card de login */}
        <Card elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>

          {/* Franja roja MAF */}
          <Box sx={{ bgcolor: '#E40521', px: 3, py: 1.5 }}>
            <Typography variant="subtitle2" color="white" fontWeight={700} letterSpacing={0.3}>
              Iniciar Sesión
            </Typography>
          </Box>

          <CardContent sx={{ p: 3 }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Box display="flex" flexDirection="column" gap={2.5}>

                {loginError && (
                  <Alert severity="error" sx={{ py: 0.5 }}>
                    {loginError}
                  </Alert>
                )}

                {/* Correo */}
                <Controller
                  name="correo"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Correo corporativo"
                      type="email"
                      fullWidth
                      size="small"
                      autoComplete="email"
                      autoFocus
                      error={!!errors.correo}
                      helperText={errors.correo?.message}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailOutlinedIcon fontSize="small" color="action" />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                />

                {/* Contraseña */}
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Contraseña"
                      type={showPass ? 'text' : 'password'}
                      fullWidth
                      size="small"
                      autoComplete="current-password"
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockOutlinedIcon fontSize="small" color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowPass((p) => !p)}
                                edge="end"
                                tabIndex={-1}
                              >
                                {showPass
                                  ? <VisibilityOffIcon fontSize="small" />
                                  : <VisibilityIcon fontSize="small" />
                                }
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                />

                {/* Botón */}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={isSubmitting}
                  sx={{
                    bgcolor: '#E40521',
                    fontWeight: 700,
                    py: 1.25,
                    fontSize: '0.95rem',
                    '&:hover': { bgcolor: '#a80018' },
                    '&:disabled': { bgcolor: '#f5a0a8' },
                  }}
                  startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {isSubmitting ? 'Verificando...' : 'Ingresar'}
                </Button>

              </Box>
            </form>

            <Divider sx={{ my: 2.5 }} />

            {/* Nota MVP */}
            <Box sx={{ bgcolor: '#fff8f8', border: '1px solid #ffd6d9', borderRadius: 1, p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={700}>
                🔑 Credenciales de prueba (MVP)
              </Typography>
              <Box display="flex" flexDirection="column" gap={0.5}>
                {[
                  { correo: 'ana.garcia@mafperu.com',     pass: 'Admin.2026', rol: 'Admin' },
                  { correo: 'roberto.silva@mafperu.com',  pass: 'Admin.2026', rol: 'Admin' },
                  { correo: 'lucia.torres@mafperu.com',   pass: 'Colab.2026', rol: 'Colaborador' },
                ].map((u) => (
                  <Box key={u.correo} display="flex" alignItems="baseline" gap={0.75} flexWrap="wrap">
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#E40521', fontWeight: 700 }}>
                      {u.correo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">·</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {u.pass}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      [{u.rol}]
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={1} sx={{ fontStyle: 'italic' }}>
                En producción: Microsoft Entra ID SSO (sin contraseña manual)
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Footer */}
        <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={2}>
          © 2026 Mitsui Auto Finance Perú S.A. · Todos los derechos reservados
        </Typography>
      </Box>
    </Box>
  )
}
