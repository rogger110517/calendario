'use client'

import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Stepper, Step, StepLabel,
  StepContent, Chip, Divider, IconButton, Stack, Grid2 as Grid,
} from '@mui/material'
import CloseIcon          from '@mui/icons-material/Close'
import CalendarMonthIcon  from '@mui/icons-material/CalendarMonth'
import AddCircleIcon      from '@mui/icons-material/AddCircle'
import CheckCircleIcon    from '@mui/icons-material/CheckCircle'
import InfoIcon           from '@mui/icons-material/Info'
import GroupsIcon         from '@mui/icons-material/Groups'

interface Props { open: boolean; onClose: () => void }

const ESTADOS = [
  { label: 'Pendiente',  color: '#F59E0B', texto: '#000', desc: 'Campaña creada, esperando aprobación del administrador.' },
  { label: 'Aprobada',   color: '#2563EB', texto: '#fff', desc: 'Aprobada por admin. Comunicación siendo preparada.' },
  { label: 'Enviada',    color: '#16A34A', texto: '#fff', desc: 'Comunicación confirmada como enviada. Estado final exitoso.' },
  { label: 'Rechazada',  color: '#DC2626', texto: '#fff', desc: 'Rechazada por admin. Desaparece del calendario.' },
  { label: 'Cancelada',  color: '#9CA3AF', texto: '#fff', desc: 'Cancelada manualmente. Desaparece del calendario.' },
]

const REGLAS = [
  { icon: '📅', titulo: 'Máximo 2 comunicaciones por día', desc: 'No se pueden registrar más de 2 campañas con la misma fecha de envío.' },
  { icon: '🎯', titulo: '1 público objetivo por día',       desc: 'No puede existir más de una campaña dirigida al mismo público en el mismo día.' },
  { icon: '🔵', titulo: 'Color por unidad de negocio',      desc: 'Cada unidad tiene un color único en el calendario para identificación rápida.' },
  { icon: '🔑', titulo: 'Aprobaciones solo para Admin',     desc: 'Solo los usuarios con rol Administrador pueden aprobar, rechazar o confirmar el envío.' },
]

/** Bloque de texto con bullets — con más aire entre líneas que un Typography suelto. */
function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <Stack spacing={1} sx={{ pl: 0.5 }}>
      {items.map((item, i) => (
        <Typography key={i} variant="body2" sx={{ lineHeight: 1.7 }}>{item}</Typography>
      ))}
    </Stack>
  )
}

/** Caja de aviso (tip / warning) con más padding y un ícono destacado. */
function InfoBox({ tone, title, children }: { tone: 'tip' | 'warning'; title: string; children: React.ReactNode }) {
  const palette = tone === 'tip'
    ? { bg: '#fff3f4', border: '#fecaca' }
    : { bg: '#fef9ec', border: '#fde68a' }
  return (
    <Box sx={{ bgcolor: palette.bg, border: `1px solid ${palette.border}`, borderRadius: 2, p: 2.25 }}>
      <Typography variant="subtitle2" fontWeight={700} mb={0.75}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{children}</Typography>
    </Box>
  )
}

export function ManualUsuarioModal({ open, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      label: 'Ver el calendario',
      icon: <CalendarMonthIcon />,
      content: (
        <Stack spacing={2.5}>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            El calendario muestra todas las campañas activas de comunicaciones corporativas.
          </Typography>
          <Bullets items={[
            <>Usa los botones <strong>Mes / Semana / Lista</strong> para cambiar la vista.</>,
            <>Usa las flechas <strong>← →</strong> para navegar entre periodos.</>,
            <>El color del evento indica la <strong>unidad de negocio</strong> que lo creó.</>,
            <>El punto de color al inicio del evento indica el <strong>estado</strong> de la campaña.</>,
            <>Haz clic en cualquier evento para ver su detalle completo.</>,
          ]} />
          <InfoBox tone="tip" title="💡 Leyenda">
            La leyenda al pie del calendario muestra los colores de cada unidad y los puntos de estado.
          </InfoBox>
        </Stack>
      ),
    },
    {
      label: 'Crear una campaña',
      icon: <AddCircleIcon />,
      content: (
        <Stack spacing={2.5}>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            Para crear una nueva campaña de comunicación:
          </Typography>
          <Bullets items={[
            <><strong>1.</strong> Haz clic en una fecha vacía del calendario.</>,
            <><strong>2.</strong> Se abrirá el formulario de nueva campaña.</>,
            <><strong>3.</strong> Completa los campos requeridos.</>,
          ]} />
          <Box sx={{ pl: 2.5 }}>
            <Bullets items={[
              <><strong>Nombre y Subject</strong> — identifican la campaña</>,
              <><strong>Dirigido a</strong> — público objetivo</>,
              <><strong>Filtros</strong> — criterios de segmentación</>,
              <><strong>Área solicitante</strong> — tu área (determina el color en el calendario)</>,
              <><strong>Fecha y hora de envío</strong> — cuándo se enviará</>,
              <><strong>Pieza gráfica</strong> — URL del material en OneDrive/SharePoint</>,
            ]} />
          </Box>
          <Bullets items={[
            <><strong>4.</strong> Si la campaña tiene fechas adicionales, activa <em>¿Tiene recurrencia?</em> y elige el tipo.</>,
            <><strong>5.</strong> Haz clic en <strong>Crear Campaña</strong>.</>,
          ]} />
          <InfoBox tone="warning" title="⚠️ Validaciones automáticas">
            El sistema validará que no existan más de 2 comunicaciones el mismo día, ni el mismo público objetivo en esa fecha.
            Si hay una campaña similar registrada, pedirá confirmación.
          </InfoBox>
        </Stack>
      ),
    },
    {
      label: 'Estados y aprobaciones',
      icon: <CheckCircleIcon />,
      content: (
        <Stack spacing={2.5}>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            Las campañas siguen un flujo de aprobación de 2 pasos:
          </Typography>
          <Stack spacing={1.5}>
            {ESTADOS.map((e) => (
              <Box key={e.label} display="flex" alignItems="center" gap={2}
                sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fafafa', border: '1px solid #eee' }}>
                <Chip label={e.label} size="small" sx={{ bgcolor: e.color, color: e.texto, fontWeight: 700, flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{e.desc}</Typography>
              </Box>
            ))}
          </Stack>
          <Divider />
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            <strong>Flujo:</strong> Pendiente → <em>Admin aprueba</em> → Aprobada → <em>Admin confirma envío</em> → Enviada (Verde)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Solo los usuarios con rol <strong>Administrador</strong> pueden cambiar el estado. Los colaboradores solo pueden crear y visualizar.
          </Typography>
        </Stack>
      ),
    },
    {
      label: 'Reglas de negocio',
      icon: <InfoIcon />,
      content: (
        <Grid container spacing={2}>
          {REGLAS.map((r) => (
            <Grid key={r.titulo} size={{ xs: 12, sm: 6 }}>
              <Box sx={{
                p: 2.25, height: '100%', border: '1px solid #dee2e6', borderRadius: 2, bgcolor: '#fafafa',
                display: 'flex', flexDirection: 'column', gap: 1,
              }}>
                <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }}>{r.icon}</Typography>
                <Typography variant="body2" fontWeight={700}>{r.titulo}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{r.desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      ),
    },
    {
      label: 'Roles de usuario',
      icon: <GroupsIcon />,
      content: (
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            {[
              { rol: 'Administrador', color: '#E40521', permisos: ['Ver todas las campañas', 'Crear campañas', 'Aprobar campañas', 'Rechazar campañas', 'Confirmar envío', 'Cancelar campañas'] },
              { rol: 'Colaborador',   color: '#4A4A4A', permisos: ['Ver todas las campañas', 'Crear campañas', 'Ver detalle completo'] },
            ].map((u) => (
              <Grid key={u.rol} size={{ xs: 12, sm: 6 }}>
                <Box sx={{ p: 2.25, height: '100%', border: '1px solid #dee2e6', borderRadius: 2 }}>
                  <Chip label={u.rol} size="small" sx={{ bgcolor: u.color, color: '#fff', fontWeight: 700, mb: 1.5 }} />
                  <Stack spacing={0.75}>
                    {u.permisos.map((p) => (
                      <Typography key={p} variant="body2" sx={{ lineHeight: 1.6 }}>✓ {p}</Typography>
                    ))}
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Stack>
      ),
    },
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper"
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>

      <DialogTitle component="div" sx={{
        bgcolor: '#E40521', color: '#fff', display: 'flex', alignItems: 'center',
        gap: 1.5, py: 2, px: 3,
      }}>
        <Box
          component="img"
          src="https://mafperu.com/wp-content/uploads/2023/04/logo-mafperu.webp"
          alt="MAF"
          sx={{ height: 24, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
        />
        <Typography component="span" variant="h6" fontWeight={700} flex={1}>
          Manual de Usuario
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2.5, sm: 4 }, pt: { xs: 3.5, sm: 5 } }}>
        <Typography variant="body1" color="text.secondary" mb={3.5} sx={{ lineHeight: 1.7 }}>
          Guía rápida de uso del <strong>Calendario de Comunicaciones Corporativas</strong>. Selecciona un paso para ver los detalles.
        </Typography>

        <Stepper activeStep={activeStep} orientation="vertical" nonLinear
          sx={{
            '& .MuiStep-root': { pb: 0.5 },
            '& .MuiStepContent-root': { pl: 3, ml: 0.5 },
            '& .MuiStepLabel-iconContainer': { pr: 1.5 },
          }}>
          {steps.map((step, idx) => (
            <Step key={step.label} expanded={activeStep === idx}>
              <StepLabel
                onClick={() => setActiveStep(idx === activeStep ? -1 : idx)}
                sx={{ cursor: 'pointer', py: 1, '& .MuiStepLabel-label': { fontWeight: 600, fontSize: '0.95rem' } }}
                StepIconProps={{ icon: step.icon }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Box sx={{ pt: 1, pb: 3 }}>{step.content}</Box>
                <Box display="flex" gap={1.5} sx={{ pb: 1 }}>
                  {idx < steps.length - 1 && (
                    <Button size="medium" variant="contained"
                      sx={{ bgcolor: '#E40521', px: 3, '&:hover': { bgcolor: '#a80018' } }}
                      onClick={() => setActiveStep(idx + 1)}>
                      Siguiente
                    </Button>
                  )}
                  {idx > 0 && (
                    <Button size="medium" variant="outlined" sx={{ px: 3 }} onClick={() => setActiveStep(idx - 1)}>
                      Anterior
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #dee2e6' }}>
        <Button onClick={onClose} variant="outlined" size="medium" sx={{ px: 3 }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
