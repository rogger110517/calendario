'use client'

import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Stepper, Step, StepLabel,
  StepContent, Chip, Divider, IconButton, Stack,
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

export function ManualUsuarioModal({ open, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      label: 'Ver el calendario',
      icon: <CalendarMonthIcon />,
      content: (
        <Stack spacing={1.5}>
          <Typography variant="body2">El calendario muestra todas las campañas activas de comunicaciones corporativas.</Typography>
          <Box sx={{ pl: 1 }}>
            <Typography variant="body2">• Usa los botones <strong>Mes / Semana / Lista</strong> para cambiar la vista.</Typography>
            <Typography variant="body2">• Usa las flechas <strong>← →</strong> para navegar entre periodos.</Typography>
            <Typography variant="body2">• El color del evento indica la <strong>unidad de negocio</strong> que lo creó.</Typography>
            <Typography variant="body2">• El punto de color al inicio del evento indica el <strong>estado</strong> de la campaña.</Typography>
            <Typography variant="body2">• Haz clic en cualquier evento para ver su detalle completo.</Typography>
          </Box>
          <Box sx={{ bgcolor: '#fff3f4', border: '1px solid #fecaca', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="primary">💡 Leyenda</Typography>
            <Typography variant="caption" display="block" mt={0.5}>
              La leyenda al pie del calendario muestra los colores de cada unidad y los puntos de estado.
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      label: 'Crear una campaña',
      icon: <AddCircleIcon />,
      content: (
        <Stack spacing={1.5}>
          <Typography variant="body2">Para crear una nueva campaña de comunicación:</Typography>
          <Box sx={{ pl: 1 }}>
            <Typography variant="body2"><strong>1.</strong> Haz clic en una fecha vacía del calendario.</Typography>
            <Typography variant="body2"><strong>2.</strong> Se abrirá el formulario de nueva campaña.</Typography>
            <Typography variant="body2"><strong>3.</strong> Completa los campos requeridos:</Typography>
            <Box sx={{ pl: 2, mt: 0.5 }}>
              <Typography variant="body2">• <strong>Nombre y Subject</strong> — identifican la campaña</Typography>
              <Typography variant="body2">• <strong>Dirigido A</strong> — público objetivo</Typography>
              <Typography variant="body2">• <strong>Filtros</strong> — criterios de segmentación</Typography>
              <Typography variant="body2">• <strong>Unidad de Negocio</strong> — tu área (determina el color en el calendario)</Typography>
              <Typography variant="body2">• <strong>Fecha y Hora de Envío</strong> — cuándo se enviará</Typography>
              <Typography variant="body2">• <strong>Link OneDrive</strong> — URL del archivo de base de datos en SharePoint (opcional)</Typography>
            </Box>
            <Typography variant="body2" mt={1}><strong>4.</strong> Si la campaña tiene fechas adicionales, activa <em>¿Tiene recurrencia?</em> y agrega cada fecha manualmente.</Typography>
            <Typography variant="body2"><strong>5.</strong> Haz clic en <strong>Crear Campaña</strong>.</Typography>
          </Box>
          <Box sx={{ bgcolor: '#fef9ec', border: '1px solid #fde68a', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" fontWeight={700}>⚠️ Validaciones automáticas</Typography>
            <Typography variant="caption" display="block" mt={0.5}>
              El sistema validará que no existan más de 2 comunicaciones el mismo día, ni el mismo público objetivo en esa fecha.
              Si hay una campaña similar registrada, pedirá confirmación.
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      label: 'Estados y aprobaciones',
      icon: <CheckCircleIcon />,
      content: (
        <Stack spacing={1.5}>
          <Typography variant="body2">Las campañas siguen un flujo de aprobación de 2 pasos:</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ESTADOS.map((e) => (
              <Box key={e.label} display="flex" alignItems="flex-start" gap={1.5}>
                <Chip label={e.label} size="small" sx={{ bgcolor: e.color, color: e.texto, fontWeight: 700, flexShrink: 0, mt: 0.25 }} />
                <Typography variant="body2" color="text.secondary">{e.desc}</Typography>
              </Box>
            ))}
          </Box>
          <Divider />
          <Typography variant="body2">
            <strong>Flujo:</strong> Pendiente → <em>Admin aprueba</em> → Aprobada → <em>Admin confirma envío</em> → Enviada (Verde)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Solo los usuarios con rol <strong>Administrador</strong> pueden cambiar el estado. Los colaboradores solo pueden crear y visualizar.
          </Typography>
        </Stack>
      ),
    },
    {
      label: 'Reglas de negocio',
      icon: <InfoIcon />,
      content: (
        <Stack spacing={1.5}>
          {REGLAS.map((r) => (
            <Box key={r.titulo} sx={{ p: 1.5, border: '1px solid #dee2e6', borderRadius: 1, bgcolor: '#fafafa' }}>
              <Typography variant="body2" fontWeight={700} mb={0.5}>{r.icon} {r.titulo}</Typography>
              <Typography variant="body2" color="text.secondary">{r.desc}</Typography>
            </Box>
          ))}
        </Stack>
      ),
    },
    {
      label: 'Roles de usuario',
      icon: <GroupsIcon />,
      content: (
        <Stack spacing={1.5}>
          {[
            { rol: 'Administrador', color: '#E40521', permisos: ['Ver todas las campañas', 'Crear campañas', 'Aprobar campañas', 'Rechazar campañas', 'Confirmar envío', 'Cancelar campañas'] },
            { rol: 'Colaborador',   color: '#4A4A4A', permisos: ['Ver todas las campañas', 'Crear campañas', 'Ver detalle completo'] },
          ].map((u) => (
            <Box key={u.rol} sx={{ p: 1.5, border: '1px solid #dee2e6', borderRadius: 1 }}>
              <Chip label={u.rol} size="small" sx={{ bgcolor: u.color, color: '#fff', fontWeight: 700, mb: 1 }} />
              <Box sx={{ pl: 1 }}>
                {u.permisos.map((p) => (
                  <Typography key={p} variant="body2">✓ {p}</Typography>
                ))}
              </Box>
            </Box>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            En producción, los roles son asignados desde Microsoft Entra ID por el administrador de sistemas.
          </Typography>
        </Stack>
      ),
    },
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper"
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}>

      <DialogTitle component="div" sx={{
        bgcolor: '#E40521', color: '#fff', display: 'flex', alignItems: 'center',
        gap: 1, py: 1.5, px: 2.5,
      }}>
        <Box
          component="img"
          src="https://mafperu.com/wp-content/uploads/2023/04/logo-mafperu.webp"
          alt="MAF"
          sx={{ height: 22, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
        />
        <Typography component="span" variant="subtitle1" fontWeight={700} flex={1}>
          Manual de Usuario
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Guía rápida de uso del <strong>Calendario de Comunicaciones Corporativas</strong>. Selecciona un paso para ver los detalles.
        </Typography>

        <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
          {steps.map((step, idx) => (
            <Step key={step.label} expanded={activeStep === idx}>
              <StepLabel
                onClick={() => setActiveStep(idx === activeStep ? -1 : idx)}
                sx={{ cursor: 'pointer', '& .MuiStepLabel-label': { fontWeight: 600 } }}
                StepIconProps={{ icon: step.icon }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Box sx={{ pb: 2 }}>{step.content}</Box>
                <Box display="flex" gap={1}>
                  {idx < steps.length - 1 && (
                    <Button size="small" variant="contained"
                      sx={{ bgcolor: '#E40521', '&:hover': { bgcolor: '#a80018' } }}
                      onClick={() => setActiveStep(idx + 1)}>
                      Siguiente
                    </Button>
                  )}
                  {idx > 0 && (
                    <Button size="small" variant="outlined" onClick={() => setActiveStep(idx - 1)}>
                      Anterior
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: '1px solid #dee2e6' }}>
        <Button onClick={onClose} variant="outlined">Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
