'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Box, CircularProgress } from '@mui/material'
import { AppHeader } from '@/components/layout/AppHeader'
import { CalendarLegend } from '@/components/calendar/CalendarLegend'
import { CampaignFormModal } from '@/components/campaigns/CampaignFormModal'
import { CampaignDetailModal } from '@/components/campaigns/CampaignDetailModal'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useCampaignStore } from '@/store/campaign.store'

const CalendarView = dynamic(
  () => import('@/components/calendar/CalendarView').then((m) => m.CalendarView),
  {
    ssr: false,
    loading: () => (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress color="primary" />
      </Box>
    ),
  },
)

function CalendarContent() {
  const { isFormOpen, isDetailOpen, setFormOpen, setDetailOpen } = useCampaignStore()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <Box sx={{ flex: 1, pt: '48px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <CalendarView />
        </Box>
        <CalendarLegend />
      </Box>
      <CampaignFormModal  open={isFormOpen}  onClose={() => setFormOpen(false)} />
      <CampaignDetailModal open={isDetailOpen} onClose={() => setDetailOpen(false)} />
    </Box>
  )
}

export function CalendarPage() {
  return (
    <AuthGuard>
      <CalendarContent />
    </AuthGuard>
  )
}
