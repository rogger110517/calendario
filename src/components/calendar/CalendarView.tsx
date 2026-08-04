'use client'

import React, { useRef, useCallback, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin     from '@fullcalendar/daygrid'
import timeGridPlugin    from '@fullcalendar/timegrid'
import listPlugin        from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateSelectArg, EventClickArg, EventContentArg, DatesSetArg } from '@fullcalendar/core'
import esLocale from '@fullcalendar/core/locales/es'
import {
  Box, Paper, CircularProgress, Typography,
  IconButton, ButtonGroup, Button, Select,
  MenuItem, Tooltip, SelectChangeEvent,
} from '@mui/material'
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon        from '@mui/icons-material/Today'
import { useCampaigns }     from '@/hooks/useCampaigns'
import { useUnidades }      from '@/hooks/useUnidades'
import { useCampaignStore } from '@/store/campaign.store'
import type { Campaign, CampaignEstado } from '@/types'

// ── Colores de estado ─────────────────────────────────────────────────────────
// El fondo del evento SIEMPRE es el color del área (campaign.unidad) — estos
// colores solo se usan en el StatusDot (círculo) y en la leyenda.
// Mismos colores documentados en ManualUsuarioModal.tsx (ESTADOS) — mantener
// sincronizados si se cambia alguno.
export const ESTADO_COLORS: Record<CampaignEstado, { bg: string; text: string; label: string }> = {
  Pendiente: { bg: '#F59E0B', text: '#000', label: 'Pendiente' },
  Aprobada:  { bg: '#2563EB', text: '#fff', label: 'Aprobada'  },
  Ejecutada: { bg: '#16A34A', text: '#fff', label: 'Enviada'   },
  Rechazada: { bg: '#DC2626', text: '#fff', label: 'Rechazada' },
  Cancelada: { bg: '#9CA3AF', text: '#fff', label: 'Cancelada' },
}

const OCULTOS: CampaignEstado[] = ['Rechazada', 'Cancelada']

type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'listMonth'
const VIEW_LABELS: Record<ViewType, string> = {
  dayGridMonth: 'Mes',
  timeGridWeek: 'Semana',
  listMonth:    'Lista',
}

// ── Punto de estado dentro del evento ────────────────────────────────────────
function StatusDot({ color }: { color: string }) {
  return (
    <Box component="span" sx={{
      display: 'inline-block', width: 7, height: 7,
      borderRadius: '50%', bgcolor: color,
      border: '1.5px solid rgba(255,255,255,0.85)',
      flexShrink: 0, mr: 0.4,
    }} />
  )
}

function EventContent({ info }: { info: EventContentArg }) {
  const estado     = info.event.extendedProps.estado as CampaignEstado
  const statusColor = ESTADO_COLORS[estado]?.bg ?? '#aaa'
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.3,
      px: 0.75, py: 0.15, width: '100%', overflow: 'hidden',
      cursor: 'pointer', '&:hover': { filter: 'brightness(0.87)' },
    }}>
      <StatusDot color={statusColor} />
      <Typography component="span" sx={{
        fontSize: '0.71rem', fontWeight: 600, color: '#fff',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
      }}>
        {info.event.title}
      </Typography>
    </Box>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function CalendarView() {
  const { data: campaigns, isLoading, error } = useCampaigns()
  const { data: unidades }  = useUnidades()
  const {
    setSelectedCampaign, setNewCampaignDate, setFormOpen, setDetailOpen,
    myUnidad, setMyUnidad,
  } = useCampaignStore()

  const calendarRef    = useRef<FullCalendar>(null)
  const [title,        setTitle]       = useState('')
  const [currentView,  setCurrentView] = useState<ViewType>('dayGridMonth')

  const api        = () => calendarRef.current?.getApi()
  const prev       = () => api()?.prev()
  const next       = () => api()?.next()
  const today      = () => api()?.today()
  const changeView = (v: ViewType) => { api()?.changeView(v); setCurrentView(v) }

  const handleDatesSet    = useCallback((arg: DatesSetArg) => setTitle(arg.view.title), [])
  const handleDateSelect  = useCallback((arg: DateSelectArg) => {
    setNewCampaignDate(arg.startStr); setFormOpen(true)
  }, [setNewCampaignDate, setFormOpen])
  const handleEventClick  = useCallback((arg: EventClickArg) => {
    const campaignId = arg.event.extendedProps.campaignId as string
    const campaign = campaigns?.find((c) => c.id === campaignId)
    if (campaign) { setSelectedCampaign(campaign); setDetailOpen(true) }
  }, [campaigns, setSelectedCampaign, setDetailOpen])

  const getUnidadColor = useCallback(
    (id: string) => unidades?.find((u) => u.id === id)?.color ?? '#4A4A4A',
    [unidades],
  )

  if (isLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
      <CircularProgress sx={{ color: '#E40521' }} />
    </Box>
  )
  if (error) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
      <Typography color="error">Error al cargar campañas</Typography>
    </Box>
  )

  // ── Coloreado de eventos ──────────────────────────────────────────────────
  // El fondo del evento SIEMPRE es el color del área (campaign.unidad),
  // sin importar el estado. El estado se distingue solo por el círculo
  // (StatusDot, usa ESTADO_COLORS) dentro del evento.
  // Todos son visibles — sin filtrado
  const events = (campaigns ?? [])
    .filter((c: Campaign) => !OCULTOS.includes(c.estado))
    .flatMap((c: Campaign) => {
      const color = getUnidadColor(c.unidad)
      // Un evento por cada fecha de envío: la fecha principal + las fechas de recurrencia calculadas
      const fechas = c.recurrencia && c.fechasRecurrencia?.length
        ? [c.diaEnvio, ...c.fechasRecurrencia]
        : [c.diaEnvio]
      return fechas.map((fecha, i) => ({
        id:    `${c.id}::${i}`,
        title: c.nombreCampana,
        start: fecha,   // solo fecha inicial — sin end para que no coloree varios días
        backgroundColor: color,
        borderColor:     color,
        textColor:       '#fff',
        extendedProps:   { campaignId: c.id, estado: c.estado, unidad: c.unidad },
      }))
    })

  // Datos de la unidad seleccionada para el Select
  const unidadActual = myUnidad ? unidades?.find((u) => u.id === myUnidad) : null

  return (
    <Paper elevation={0} sx={{ height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column' }}>

      {/* ── Toolbar personalizado ─────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1, bgcolor: '#fff',
        borderBottom: '1px solid #dee2e6',
        flexWrap: 'wrap',
      }}>

        {/* Navegación */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <Tooltip title="Período anterior">
            <IconButton size="small" onClick={prev}
              sx={{ border: '1px solid #dee2e6', borderRadius: 1, width: 28, height: 28 }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Período siguiente">
            <IconButton size="small" onClick={next}
              sx={{ border: '1px solid #dee2e6', borderRadius: 1, width: 28, height: 28 }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            startIcon={<TodayIcon sx={{ fontSize: '14px !important' }} />}
            onClick={today}
            variant="outlined"
            sx={{
              ml: 0.5, height: 28, fontSize: '0.78rem', fontWeight: 700,
              borderColor: '#E40521', color: '#E40521', minWidth: 56,
              '&:hover': { bgcolor: '#fff0f1', borderColor: '#E40521' },
            }}
          >
            Hoy
          </Button>
        </Box>

        {/* ── Mi Área (selector de unidad del usuario) ────────────────────── */}
        <Tooltip title="Selecciona tu área — los Pendientes de tu unidad se diferencian por color">
          <Select
            value={myUnidad}
            onChange={(e: SelectChangeEvent) => setMyUnidad(e.target.value)}
            size="small"
            displayEmpty
            sx={{
              height: 28,
              fontSize: '0.78rem',
              fontWeight: 600,
              minWidth: 200,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor:  unidadActual ? unidadActual.color : '#dee2e6',
                borderWidth:  unidadActual ? 2 : 1,
              },
              '& .MuiSelect-select': {
                display: 'flex', alignItems: 'center', gap: 0.75,
                py: '4px !important',
              },
            }}
            renderValue={() => (
              <Box display="flex" alignItems="center" gap={0.75}>
                {unidadActual ? (
                  <>
                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: unidadActual.color, flexShrink: 0 }} />
                    <Typography variant="caption" fontWeight={700} sx={{ color: unidadActual.color }}>
                      Mi área: {unidadActual.nombre}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Seleccionar mi área ▾
                  </Typography>
                )}
              </Box>
            )}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.secondary">— Sin selección —</Typography>
            </MenuItem>
            {(unidades ?? []).map((u) => (
              <MenuItem key={u.id} value={u.id}>
                <Box display="flex" alignItems="center" gap={1.25}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '3px', bgcolor: u.color, flexShrink: 0 }} />
                  <Typography variant="body2">{u.nombre}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </Tooltip>

        {/* Título del período */}
        <Typography
          variant="subtitle2" fontWeight={700} color="text.primary"
          flex={1} textAlign="center" sx={{ textTransform: 'capitalize', minWidth: 140 }}
        >
          {title}
        </Typography>

        {/* Selector de vista */}
        <ButtonGroup size="small" sx={{ height: 28 }}>
          {(['dayGridMonth', 'timeGridWeek', 'listMonth'] as ViewType[]).map((v) => (
            <Button
              key={v}
              onClick={() => changeView(v)}
              variant={currentView === v ? 'contained' : 'outlined'}
              sx={{
                fontSize: '0.73rem', fontWeight: 700, px: 1.25,
                bgcolor:      currentView === v ? '#E40521' : 'transparent',
                borderColor:  '#E40521',
                color:        currentView === v ? '#fff' : '#E40521',
                '&:hover': {
                  bgcolor:     currentView === v ? '#a80018' : '#fff0f1',
                  borderColor: '#E40521',
                },
              }}
            >
              {VIEW_LABELS[v]}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* ── FullCalendar sin toolbar nativo ───────────────────────────────── */}
      <Box sx={{
        flex: 1, px: 2, pb: 1, overflow: 'hidden',
        '& .fc':                    { fontFamily: '"Segoe UI", sans-serif', height: '100%' },
        '& .fc-daygrid-day-number': { color: '#212529', fontWeight: 500, fontSize: '0.85rem' },
        '& .fc-col-header-cell':    { background: '#E9EAE8', borderBottom: '1px solid #dee2e6' },
        '& .fc-col-header-cell-cushion': {
          color: '#4A4A4A', fontWeight: 700, fontSize: '0.78rem',
          textTransform: 'uppercase', letterSpacing: 0.5,
        },
        '& .fc-daygrid-day.fc-day-today': { background: '#fff3f4 !important' },
        '& .fc-event':     { cursor: 'pointer', borderRadius: '4px' },
        '& .fc-more-link': { color: '#E40521', fontWeight: 600, fontSize: '0.75rem' },
      }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          headerToolbar={false}
          datesSet={handleDatesSet}
          events={events}
          selectable selectMirror
          dayMaxEvents={3}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventContent={(info) => <EventContent info={info} />}
          height="100%"
          editable={false}
          nowIndicator
        />
      </Box>
    </Paper>
  )
}
