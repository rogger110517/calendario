'use client'

import dynamic from 'next/dynamic'
import { Box, CircularProgress } from '@mui/material'

const CalendarPage = dynamic(
  () => import('@/components/calendar/CalendarPage').then((m) => m.CalendarPage),
  {
    ssr: false,
    loading: () => (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress color="primary" />
      </Box>
    ),
  },
)

export default function Home() {
  return <CalendarPage />
}
