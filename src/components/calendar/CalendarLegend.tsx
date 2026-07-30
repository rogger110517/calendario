'use client'

import React from 'react'
import { Box, Typography, Stack } from '@mui/material'
import { ESTADO_COLORS } from '@/components/calendar/CalendarView'

export function CalendarLegend() {
  return (
    <Box sx={{
      px: 2, py: 0.75,
      bgcolor: '#E9EAE8',
      borderTop: '1px solid #dee2e6',
      display: 'flex', alignItems: 'center',
      gap: 2, flexWrap: 'wrap',
    }}>
      {/* Estados fijos (Aprobada y Enviada) */}
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          Estado:
        </Typography>
        {(['Aprobada', 'Ejecutada'] as const).map((estado) => {
          const cfg = ESTADO_COLORS[estado]
          return (
            <Box key={estado} display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 28, height: 12, borderRadius: '2px', bgcolor: cfg.bg, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary">{cfg.label}</Typography>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
