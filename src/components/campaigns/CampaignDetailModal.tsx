'use client'

import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Chip, Divider, Grid2 as Grid,
  Stack, IconButton, Tooltip, Alert, Link,
} from '@mui/material'
import CloseIcon         from '@mui/icons-material/Close'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AccessTimeIcon    from '@mui/icons-material/AccessTime'
import PersonIcon        from '@mui/icons-material/Person'
import RepeatIcon        from '@mui/icons-material/Repeat'
import CheckCircleIcon   from '@mui/icons-material/CheckCircle'
import ThumbDownIcon     from '@mui/icons-material/ThumbDown'
import CancelIcon        from '@mui/icons-material/Cancel'
import SendIcon          from '@mui/icons-material/Send'
import LinkIcon          from '@mui/icons-material/Link'
import BusinessIcon      from '@mui/icons-material/Business'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { ConfirmDialog }    from '@/components/common/ConfirmDialog'
import { useCampaignStore } from '@/store/campaign.store'
import { useCurrentUser }   from '@/components/auth/UserProvider'
import { useUpdateCampaign, useDeleteCampaign } from '@/hooks/useCampaigns'
import { useUnidades }       from '@/hooks/useUnidades'
import { useSnackbar } from 'notistack'
import { ESTADO_COLORS }    from '@/components/calendar/CalendarView'
import type { CampaignEstado } from '@/types'
import dayjs from 'dayjs'

interface Props { open: boolean; onClose: () => void }

const CANAL_COLOR: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning'> = {
  Email: 'primary', SMS: 'secondary', Push: 'warning', WhatsApp: 'success',
}

type Accion = {
  nuevoEstado:   CampaignEstado
  label:         string
  icon:          React.ReactNode
  variant:       'contained' | 'outlined'
  color:         'success' | 'info' | 'error' | 'inherit'
  needsConfirm:  boolean
  confirmTitle?: string
  confirmMsg?:   string
  confirmLabel?: string
  confirmColor?: 'error' | 'warning' | 'inherit'
}

const ACCIONES: Record<CampaignEstado, Accion[]> = {
  Pendiente: [
    { nuevoEstado: 'Aprobada',  label: 'Aprobar campaña',  icon: <CheckCircleIcon />, variant: 'contained', color: 'info',    needsConfirm: false },
    { nuevoEstado: 'Rechazada', label: 'Rechazar',          icon: <ThumbDownIcon />,  variant: 'outlined',  color: 'error',   needsConfirm: true,  confirmTitle: '¿Rechazar campaña?',         confirmMsg: 'La campaña será rechazada y desaparecerá del calendario.', confirmLabel: 'Sí, rechazar',  confirmColor: 'error'   },
    { nuevoEstado: 'Cancelada', label: 'Cancelar',          icon: <CancelIcon />,     variant: 'outlined',  color: 'inherit', needsConfirm: true,  confirmTitle: '¿Cancelar campaña?',         confirmMsg: 'La campaña desaparecerá del calendario. Esta acción no se puede deshacer.', confirmLabel: 'Sí, cancelar', confirmColor: 'warning' },
  ],
  Aprobada: [
    { nuevoEstado: 'Ejecutada', label: 'Confirmar envío',   icon: <SendIcon />,       variant: 'contained', color: 'success', needsConfirm: false },
    { nuevoEstado: 'Rechazada', label: 'Rechazar',          icon: <ThumbDownIcon />,  variant: 'outlined',  color: 'error',   needsConfirm: true,  confirmTitle: '¿Rechazar campaña aprobada?', confirmMsg: 'La campaña será rechazada y desaparecerá del calendario.', confirmLabel: 'Sí, rechazar',  confirmColor: 'error'   },
    { nuevoEstado: 'Cancelada', label: 'Cancelar',          icon: <CancelIcon />,     variant: 'outlined',  color: 'inherit', needsConfirm: true,  confirmTitle: '¿Cancelar campaña aprobada?', confirmMsg: 'La campaña ya fue aprobada. ¿Cancelar de todas formas?', confirmLabel: 'Sí, cancelar', confirmColor: 'warning' },
  ],
  Ejecutada: [], Rechazada: [], Cancelada: [],
}

function LabeledValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography component="span" variant="caption" color="text.secondary" fontWeight={700} display="block"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.67rem', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography component="div" variant="body2">{children}</Typography>
    </Box>
  )
}

export function CampaignDetailModal({ open, onClose }: Props) {
  const campaign       = useCampaignStore((s) => s.selectedCampaign)
  const setSelected    = useCampaignStore((s) => s.setSelectedCampaign)
  const currentUser    = useCurrentUser()
  const updateCampaign = useUpdateCampaign()
  const deleteCampaign = useDeleteCampaign()
  const { data: unidades } = useUnidades()
  const { enqueueSnackbar } = useSnackbar()
  const [confirmOpen,       setConfirmOpen]       = useState(false)
  const [pendingAccion,     setPendingAccion]     = useState<Accion | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  if (!campaign) return null

  const isAdmin  = currentUser?.rol === 'admin'
  const acciones = isAdmin ? ACCIONES[campaign.estado] : []
  const estado   = ESTADO_COLORS[campaign.estado]
  const unidad   = unidades?.find((u) => u.id === campaign.unidad)

  const ejecutarCambio = async (accion: Accion) => {
    try {
      await updateCampaign.mutateAsync({ campaign, data: { estado: accion.nuevoEstado } })
      setSelected({ ...campaign, estado: accion.nuevoEstado })
      enqueueSnackbar(`Campaña actualizada a: ${accion.nuevoEstado}`, { variant: 'success' })
      if (['Rechazada', 'Cancelada'].includes(accion.nuevoEstado)) onClose()
    } catch {
      enqueueSnackbar('Error al actualizar el estado', { variant: 'error' })
    } finally {
      setConfirmOpen(false); setPendingAccion(null)
    }
  }

  const handleAccion = (accion: Accion) => {
    if (accion.needsConfirm) { setPendingAccion(accion); setConfirmOpen(true) }
    else ejecutarCambio(accion)
  }

  const handleEliminar = async () => {
    try {
      await deleteCampaign.mutateAsync(campaign)
      enqueueSnackbar('Campaña eliminada', { variant: 'success' })
      onClose()
    } catch {
      enqueueSnackbar('Error al eliminar la campaña', { variant: 'error' })
    } finally {
      setDeleteConfirmOpen(false)
    }
  }

  const puedeEliminar = isAdmin

  const fmt   = (d: string) => dayjs(d).format('DD/MM/YYYY')
  const fmtT  = (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm')

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '92vh' } }}>

        {/* Header */}
        <DialogTitle component="div" sx={{
          bgcolor: '#E40521', color: '#fff', display: 'flex', alignItems: 'flex-start',
          gap: 1, py: 1.5, px: 2.5, flexShrink: 0,
        }}>
          <Box flex={1} minWidth={0}>
            {unidad && (
              <Box display="flex" alignItems="center" gap={0.75} mb={0.25}>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: unidad.color, flexShrink: 0 }} />
                <Typography component="span" variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                  {unidad.nombre}
                </Typography>
              </Box>
            )}
            <Typography component="span" variant="subtitle1" fontWeight={700} display="block" noWrap>
              {campaign.nombreCampana}
            </Typography>
            <Typography component="span" variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.1 }} noWrap>
              {campaign.subject}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
            <Chip
              label={estado.label}
              size="small"
              sx={{ bgcolor: estado.bg, color: estado.text, fontWeight: 700 }}
            />
            <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        {/* Panel de acciones Admin */}
        {isAdmin && (
          <Box sx={{
            px: 2.5, py: 1.25,
            bgcolor: acciones.length > 0 ? '#fff3f4' : '#fafafa',
            borderBottom: '2px solid #dee2e6',
            display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          }}>
            <Stack direction="row" alignItems="center" spacing={0.75} flexShrink={0}>
              <Typography variant="caption" fontWeight={700} color="primary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Acciones
              </Typography>
              <Chip label="ADMIN" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#E40521', color: '#fff' }} />
            </Stack>
            {acciones.length > 0 ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {acciones.map((accion) => (
                  <Button key={accion.nuevoEstado} size="small" variant={accion.variant}
                    color={accion.color as any} startIcon={accion.icon}
                    disabled={updateCampaign.isPending} onClick={() => handleAccion(accion)}
                    sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
                    {accion.label}
                  </Button>
                ))}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {campaign.estado === 'Ejecutada' ? '✅ Comunicación enviada — estado final.' : 'Sin más acciones disponibles.'}
              </Typography>
            )}
            {puedeEliminar && (
              <Button size="small" variant="text" color="error" startIcon={<DeleteOutlineIcon />}
                disabled={deleteCampaign.isPending} onClick={() => setDeleteConfirmOpen(true)}
                sx={{ fontWeight: 700, fontSize: '0.78rem', ml: 'auto' }}>
                Eliminar
              </Button>
            )}
          </Box>
        )}

        {!isAdmin && ['Pendiente', 'Aprobada'].includes(campaign.estado) && (
          <Alert severity="info" sx={{ borderRadius: 0, py: 0.5 }}>
            Solo un <strong>administrador</strong> puede cambiar el estado de esta campaña
          </Alert>
        )}

        {/* Contenido */}
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>

            {/* Columna izquierda */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                <LabeledValue label="Nombre de Campaña">{campaign.nombreCampana}</LabeledValue>
                <LabeledValue label="Subject">{campaign.subject}</LabeledValue>
                <LabeledValue label="Dirigido A">{campaign.dirigidoA}</LabeledValue>
                <LabeledValue label="Filtros a Aplicar">{campaign.filtrosAplicar}</LabeledValue>

                {unidad && (
                  <Box display="flex" gap={1} alignItems="center">
                    <BusinessIcon fontSize="small" color="action" />
                    <LabeledValue label="Unidad de Negocio">
                      <Box display="flex" alignItems="center" gap={0.75}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: unidad.color }} />
                        {unidad.nombre}
                      </Box>
                    </LabeledValue>
                  </Box>
                )}

                {campaign.dealer && (
                  <LabeledValue label="Dealer">{campaign.dealer}</LabeledValue>
                )}
                {campaign.dealer && campaign.cantidadDealers != null && (
                  <LabeledValue label="Cantidad de Dealers">{campaign.cantidadDealers}</LabeledValue>
                )}
                {campaign.comentarios && (
                  <LabeledValue label="Comentarios">{campaign.comentarios}</LabeledValue>
                )}
              </Stack>
            </Grid>

            {/* Columna derecha */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>

                <Box display="flex" gap={1} alignItems="flex-start">
                  <CalendarTodayIcon fontSize="small" color="primary" sx={{ mt: 0.3 }} />
                  <LabeledValue label="Período de Envío">
                    {fmt(campaign.diaEnvio)} → {fmt(campaign.diaFin)}
                  </LabeledValue>
                </Box>

                <Box display="flex" gap={1} alignItems="flex-start">
                  <AccessTimeIcon fontSize="small" color="primary" sx={{ mt: 0.3 }} />
                  <LabeledValue label="Hora de Envío">{campaign.horaEnvio}</LabeledValue>
                </Box>

                {campaign.recurrencia && (campaign.fechasRecurrencia?.length ?? 0) > 0 && (
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <RepeatIcon fontSize="small" color="primary" sx={{ mt: 0.3 }} />
                    <Box>
                      <Typography component="span" variant="caption" color="text.secondary" fontWeight={700} display="block"
                        sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.67rem', mb: 0.5 }}>
                        Fechas de Recurrencia
                      </Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {campaign.fechasRecurrencia!.map((f) => (
                          <Chip key={f} label={fmt(f)} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        ))}
                      </Stack>
                    </Box>
                  </Box>
                )}

                <Box display="flex" gap={1} alignItems="flex-start">
                  <PersonIcon fontSize="small" color="primary" sx={{ mt: 0.3 }} />
                  <LabeledValue label="Solicitante">{campaign.solicitante}</LabeledValue>
                </Box>

                <LabeledValue label="Fecha de Registro">{fmtT(campaign.fechaRegistro)}</LabeledValue>

                {campaign.linkOneDrive && (
                  <Box display="flex" gap={1} alignItems="flex-start">
                    <LinkIcon fontSize="small" color="primary" sx={{ mt: 0.3 }} />
                    <Box>
                      <Typography component="span" variant="caption" color="text.secondary" fontWeight={700} display="block"
                        sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.67rem', mb: 0.25 }}>
                        Archivo OneDrive
                      </Typography>
                      <Link href={campaign.linkOneDrive} target="_blank" rel="noopener noreferrer"
                        variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {campaign.linkOneDrive}
                      </Link>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Grid>

            {/* Comunicaciones */}
            {(campaign.comunicaciones?.length ?? 0) > 0 && (
              <Grid size={12}>
                <Divider sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    COMUNICACIONES ({campaign.comunicaciones!.length})
                  </Typography>
                </Divider>
                <Stack spacing={1}>
                  {campaign.comunicaciones!.map((com) => (
                    <Box key={com.id} display="flex" alignItems="center" gap={2} flexWrap="wrap"
                      sx={{ p: 1.25, border: '1px solid #dee2e6', borderRadius: 1, bgcolor: '#fafafa' }}>
                      <Typography component="div" variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 120 }}>
                        {com.nombreComunicacion}
                      </Typography>
                      <Chip label={com.canal} size="small" variant="outlined" color={CANAL_COLOR[com.canal] ?? 'default'} />
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {fmtT(com.fechaProgramada)}
                      </Typography>
                      <Chip label={com.estadoEnvio} size="small"
                        color={com.estadoEnvio === 'Enviado' ? 'success' : com.estadoEnvio === 'Error' ? 'error' : com.estadoEnvio === 'Programado' ? 'info' : 'default'} />
                    </Box>
                  ))}
                </Stack>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: '1px solid #dee2e6' }}>
          <Button onClick={onClose} variant="outlined">Cerrar</Button>
        </DialogActions>
      </Dialog>

      {pendingAccion && (
        <ConfirmDialog
          open={confirmOpen}
          title={pendingAccion.confirmTitle!}
          message={pendingAccion.confirmMsg!}
          confirmLabel={pendingAccion.confirmLabel}
          confirmColor={pendingAccion.confirmColor}
          onConfirm={() => ejecutarCambio(pendingAccion)}
          onCancel={() => { setConfirmOpen(false); setPendingAccion(null) }}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="¿Eliminar campaña?"
        message="Esta acción es irreversible: se borrará la campaña por completo, incluidas sus comunicaciones asociadas."
        confirmLabel="Sí, eliminar"
        confirmColor="error"
        onConfirm={handleEliminar}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  )
}
