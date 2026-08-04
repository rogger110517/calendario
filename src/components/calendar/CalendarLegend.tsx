'use client'

import React from 'react'
import { Box, Typography, Stack } from '@mui/material'
import { ESTADO_COLORS } from '@/components/calendar/CalendarView'
import type { CampaignEstado } from '@/types'

const TODOS_LOS_ESTADOS: CampaignEstado[] = ['Pendiente', 'Aprobada', 'Ejecutada', 'Rechazada', 'Cancelada']

export function CalendarLegend() {
  return (
    <Box sx={{
      px: 2, py: 0.75,
      bgcolor: '#E9EAE8',
      borderTop: '1px solid #dee2e6',
      display: 'flex', alignItems: 'center',
      gap: 2, flexWrap: 'wrap',
    }}>
      {/* El fondo del evento es el color del área — el círculo es el estado. */}
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          Estado:
        </Typography>
        {TODOS_LOS_ESTADOS.map((estado) => {
          const cfg = ESTADO_COLORS[estado]
          return (
            <Box key={estado} display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cfg.bg, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary">{cfg.label}</Typography>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
