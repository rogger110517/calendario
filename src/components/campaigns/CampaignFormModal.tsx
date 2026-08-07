'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid2 as Grid, Typography, Box,
  Divider, FormControlLabel, Checkbox, MenuItem,
  CircularProgress, Alert, IconButton, Chip, Autocomplete,
} from '@mui/material'
import StorefrontIcon    from '@mui/icons-material/Storefront'
import CloseIcon        from '@mui/icons-material/Close'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LinkIcon         from '@mui/icons-material/Link'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import { useCampaignStore }   from '@/store/campaign.store'
import { useCurrentUser }    from '@/components/auth/UserProvider'
import { useCreateCampaign, useValidateSimilar, useValidarReglas } from '@/hooks/useCampaigns'
import { useDealers }        from '@/hooks/useDealers'
import { useUnidades }       from '@/hooks/useUnidades'
import type { CampaignFormData, TipoRecurrencia } from '@/types'
import type { ReglaViolacion } from '@/lib/services/campaign.service'

const TIPOS_RECURRENCIA: TipoRecurrencia[] = ['Diario', 'Semanal', 'Trimestral']

// ── Horas de envío disponibles ────────────────────────────────────────────────
const HORAS = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
}) // 07:00 → 19:30

// ── Schema de validación ──────────────────────────────────────────────────────
const schema = z.object({
  nombreCampana:   z.string().min(3, 'Mínimo 3 caracteres').max(100),
  subject:         z.string().min(5, 'Mínimo 5 caracteres').max(200),
  dirigidoA:       z.string().min(3, 'Campo requerido'),
  filtrosAplicar:  z.string().min(3, 'Campo requerido'),
  unidad:          z.string().min(1, 'Selecciona una unidad'),
  tieneDealer:     z.boolean(),
  dealers:         z.array(z.string()).optional(),
  cantidadDealers: z.coerce.number().int().min(1, 'Mínimo 1').optional(),
  tieneRecurrencia: z.boolean(),
  tipoRecurrencia: z.enum(['Diario', 'Semanal', 'Trimestral']).optional(),
  diaEnvio:        z.string().min(1, 'Fecha de envío requerida'),
  horaEnvio:       z.string().min(1, 'Hora de envío requerida'),
  linkOneDrive:    z.string().min(1, 'Campo requerido').url('Ingresa una URL válida de OneDrive'),
  comentarios:     z.string().optional(),
}).refine((data) => !data.tieneRecurrencia || !!data.tipoRecurrencia, {
  message: 'Selecciona un tipo de recurrencia', path: ['tipoRecurrencia'],
})
type FormValues = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void }

export function CampaignFormModal({ open, onClose }: Props) {
  const { newCampaignDate, myUnidad } = useCampaignStore()
  const currentUser         = useCurrentUser()
  const { enqueueSnackbar } = useSnackbar()

  const [similarWarning,   setSimilarWarning]   = useState(false)
  const [reglaViolaciones, setReglaViolaciones] = useState<ReglaViolacion[]>([])
  const [pendingData,      setPendingData]      = useState<FormValues | null>(null)
  const [fechaRegistro,  setFechaRegistro]  = useState('')

  const { data: dealers }  = useDealers()
  const { data: unidades } = useUnidades()
  const createCampaign  = useCreateCampaign()
  const validateSimilar = useValidateSimilar()
  const validarReglas   = useValidarReglas()

  const defaultValues = useMemo<FormValues>(() => ({
    nombreCampana: '', subject: '', dirigidoA: '', filtrosAplicar: '',
    // Pre-rellena la unidad con "Mi área" seleccionada en el calendario
    unidad: myUnidad ?? '',
    tieneDealer: false, dealers: [], cantidadDealers: undefined,
    tieneRecurrencia: false, tipoRecurrencia: undefined,
    diaEnvio:  newCampaignDate ?? dayjs().format('YYYY-MM-DD'),
    horaEnvio: '09:00',
    linkOneDrive: '', comentarios: '',
  }), [newCampaignDate, myUnidad])

  const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const tieneDealer     = useWatch({ control, name: 'tieneDealer' })
  const tieneRecurrencia = useWatch({ control, name: 'tieneRecurrencia' })
  const dealersElegidos  = useWatch({ control, name: 'dealers' }) ?? []
  const dealersInfo = useMemo(
    () => (dealers ?? []).filter((d) => dealersElegidos.includes(d.id)),
    [dealers, dealersElegidos],
  )

  useEffect(() => {
    if (open) {
      reset(defaultValues)
      setSimilarWarning(false)
      setReglaViolaciones([])
      setPendingData(null)
      setFechaRegistro(dayjs().format('DD/MM/YYYY HH:mm'))
    }
  }, [open, reset, defaultValues])

  // ── Submits ───────────────────────────────────────────────────────────────
  const doCreate = async (data: FormValues) => {
    if (!currentUser) return
    const formData: CampaignFormData = {
      ...data,
      tipoRecurrencia: data.tieneRecurrencia ? data.tipoRecurrencia : undefined,
      cantidadDealers: data.tieneDealer ? data.cantidadDealers : undefined,
    }
    await createCampaign.mutateAsync({ formData, user: currentUser })
    enqueueSnackbar('Campaña creada exitosamente', { variant: 'success' })
    onClose()
  }

  const onSubmit = async (data: FormValues) => {
    setSimilarWarning(false)
    setReglaViolaciones([])

    // Validar reglas de negocio
    const violaciones = await validarReglas.mutateAsync({
      diaEnvio: data.diaEnvio, dirigidoA: data.dirigidoA,
    })
    if (violaciones.length > 0) {
      setReglaViolaciones(violaciones)
      // MAX_COMUNICACIONES es un límite duro (2 por día) — no se guarda
      // pendingData para esa, así "Crear de todas formas" no puede saltarlo.
      const soloBloqueantes = violaciones.every((v) => v.tipo === 'MAX_COMUNICACIONES')
      setPendingData(soloBloqueantes ? null : data)
      return
    }

    // Validar campaña similar
    const similares = await validateSimilar.mutateAsync({
      nombre: data.nombreCampana, subject: data.subject,
    })
    if (similares.length > 0) {
      setSimilarWarning(true)
      setPendingData(data)
      return
    }

    try { await doCreate(data) }
    catch { enqueueSnackbar('Error al crear la campaña', { variant: 'error' }) }
  }

  const hayViolacionBloqueante = reglaViolaciones.some((v) => v.tipo === 'MAX_COMUNICACIONES')

  const handleForceCreate = async () => {
    if (!pendingData) return
    try { await doCreate(pendingData) }
    catch { enqueueSnackbar('Error al crear la campaña', { variant: 'error' }) }
  }

  const isBusy = isSubmitting || createCampaign.isPending || validateSimilar.isPending || validarReglas.isPending

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper"
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '95vh' } }}>

      {/* Header */}
      <DialogTitle component="div" sx={{
        bgcolor: '#E40521', color: '#fff', display: 'flex',
        alignItems: 'center', gap: 1, py: 1.5, px: 2.5, flexShrink: 0,
      }}>
        <Typography variant="subtitle1" component="span" fontWeight={700} flex={1}>
          Nueva Campaña
        </Typography>
        <Chip label="Pendiente" size="small"
          sx={{ bgcolor: '#F59E0B', color: '#000', fontWeight: 700, fontSize: '0.7rem' }} />
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Campos automáticos */}
      <Box sx={{ bgcolor: '#f8f9fa', px: 2.5, py: 1, display: 'flex', gap: 3,
        borderBottom: '1px solid #dee2e6', flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Solicitante</Typography>
          <Typography variant="body2" fontWeight={600}>{currentUser?.nombre ?? '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Fecha Registro</Typography>
          <Typography variant="body2" fontWeight={600}>{fechaRegistro || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Estado</Typography>
          <Typography variant="body2" fontWeight={600} sx={{ color: '#F59E0B' }}>Pendiente</Typography>
        </Box>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ p: 3 }}>

          {/* Alertas de reglas de negocio */}
          {reglaViolaciones.length > 0 && (
            <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 2 }}
              action={
                !hayViolacionBloqueante && (
                  <Button size="small" color="error" variant="outlined" onClick={handleForceCreate} disabled={isBusy}>
                    Crear de todas formas
                  </Button>
                )
              }>
              <strong>{hayViolacionBloqueante ? 'No se puede crear la campaña:' : 'Violación de reglas:'}</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                {reglaViolaciones.map((v) => <li key={v.mensaje}><Typography variant="caption">{v.mensaje}</Typography></li>)}
              </ul>
            </Alert>
          )}

          {/* Alerta campaña similar */}
          {similarWarning && !reglaViolaciones.length && (
            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}
              action={
                <Button size="small" color="warning" variant="contained" onClick={handleForceCreate} disabled={isBusy}>
                  Continuar de todas formas
                </Button>
              }>
              <strong>Campaña similar detectada.</strong> Existe una campaña con nombre o subject similar.
            </Alert>
          )}

          <Grid container spacing={2.5}>

            {/* ── INFORMACIÓN GENERAL ── */}
            <Grid size={12}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Información General
                </Typography>
              </Divider>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name="nombreCampana" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre de Campaña" fullWidth size="small" required
                  error={!!errors.nombreCampana} helperText={errors.nombreCampana?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name="subject" control={control} render={({ field }) => (
                <TextField {...field} label="Subject del Email" fullWidth size="small" required
                  error={!!errors.subject} helperText={errors.subject?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name="dirigidoA" control={control} render={({ field }) => (
                <TextField {...field} label="A quién está dirigido" fullWidth size="small" required
                  placeholder="Ej: Clientes activos región Lima"
                  error={!!errors.dirigidoA} helperText={errors.dirigidoA?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name="filtrosAplicar" control={control} render={({ field }) => (
                <TextField {...field} label="Filtros a aplicar" fullWidth size="small" required
                  placeholder="Ej: Edad 30-55, ingreso medio-alto"
                  error={!!errors.filtrosAplicar} helperText={errors.filtrosAplicar?.message} />
              )} />
            </Grid>

            {/* Unidad */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name="unidad" control={control} render={({ field }) => (
                <TextField {...field} select label="Unidad de Negocio" fullWidth size="small" required
                  error={!!errors.unidad} helperText={errors.unidad?.message}>
                  <MenuItem value="">Seleccionar...</MenuItem>
                  {(unidades ?? []).map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: u.color, flexShrink: 0 }} />
                        {u.nombre}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>

            {/* ── DEALER ── */}
            <Grid size={12}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Dealer
                </Typography>
              </Divider>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller name="tieneDealer" control={control} render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={field.value} size="small" color="primary" />}
                  label={<Typography variant="body2">¿Campaña por Dealer?</Typography>}
                />
              )} />
            </Grid>
            {tieneDealer && (
              <Grid size={{ xs: 12, md: 8 }}>
                <Controller name="dealers" control={control} render={({ field }) => (
                  <Autocomplete
                    multiple
                    size="small"
                    options={dealers ?? []}
                    value={dealersInfo}
                    onChange={(_, seleccionados) => field.onChange(seleccionados.map((d) => d.id))}
                    getOptionLabel={(d) => d.nombre}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderTags={() => null}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.id}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{option.nombre}</Typography>
                          <Typography variant="caption" color="text.secondary">{option.codigo}</Typography>
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label="Seleccionar Dealers"
                        placeholder={dealersInfo.length ? 'Agregar otro...' : 'Buscar y seleccionar...'}
                        error={!!errors.dealers} helperText={errors.dealers?.message} />
                    )}
                  />
                )} />
              </Grid>
            )}
            {tieneDealer && dealersInfo.length > 0 && (
              <Grid size={12}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1,
                  p: 1.5, bgcolor: '#fff3f4', borderRadius: 1.5, border: '1px dashed #E4052144',
                }}>
                  <Typography variant="caption" fontWeight={700} color="primary" sx={{ mr: 0.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Seleccionados ({dealersInfo.length})
                  </Typography>
                  {dealersInfo.map((d) => (
                    <Chip
                      key={d.id}
                      size="small"
                      icon={<StorefrontIcon sx={{ fontSize: '1rem' }} />}
                      label={`${d.nombre} · ${d.codigo}`}
                      color="primary"
                      variant="outlined"
                      onDelete={() => setValue('dealers', dealersElegidos.filter((id) => id !== d.id), { shouldValidate: true })}
                      sx={{ fontWeight: 600, bgcolor: '#fff' }}
                    />
                  ))}
                </Box>
              </Grid>
            )}
            {tieneDealer && (
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller name="cantidadDealers" control={control} render={({ field }) => (
                  <TextField {...field} value={field.value ?? ''} type="number" label="Cantidad de Dealers (opcional)" fullWidth size="small"
                    slotProps={{ htmlInput: { min: 1 } }}
                    error={!!errors.cantidadDealers} helperText={errors.cantidadDealers?.message} />
                )} />
              </Grid>
            )}

            {/* ── RECURRENCIA ── */}
            <Grid size={12}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Recurrencia
                </Typography>
              </Divider>
            </Grid>
            <Grid size={tieneRecurrencia ? { xs: 12, md: 6 } : 12}>
              <Controller name="tieneRecurrencia" control={control} render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={field.value} size="small" color="primary" />}
                  label={<Typography variant="body2">¿Con recurrencia?</Typography>}
                />
              )} />
            </Grid>
            {tieneRecurrencia && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller name="tipoRecurrencia" control={control} render={({ field }) => (
                  <TextField {...field} value={field.value ?? ''} select label="Tipo de Recurrencia" fullWidth size="small" required
                    error={!!errors.tipoRecurrencia} helperText={errors.tipoRecurrencia?.message}>
                    <MenuItem value="">Seleccionar...</MenuItem>
                    {TIPOS_RECURRENCIA.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
            )}
            {tieneRecurrencia && (
              <Grid size={12}>
                <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                  Este tipo de recurrencia solo identifica la periodicidad de la campaña.
                  Igual tienes que registrar una campaña por cada fecha de envío que
                  necesites — completa este formulario de nuevo para cada una.
                </Alert>
              </Grid>
            )}

            {/* ── FECHAS Y HORA ── */}
            <Grid size={12}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Fechas y Hora de Envío
                </Typography>
              </Divider>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name="diaEnvio" control={control} render={({ field }) => (
                <TextField {...field} label="Día de Envío" type="date" fullWidth size="small" required
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.diaEnvio} helperText={errors.diaEnvio?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name="horaEnvio" control={control} render={({ field }) => (
                <TextField {...field} select label="Hora de Envío" fullWidth size="small" required
                  error={!!errors.horaEnvio} helperText={errors.horaEnvio?.message}>
                  {HORAS.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                </TextField>
              )} />
            </Grid>

            {/* ── ENLACE ONEDRIVE Y COMENTARIOS ── */}
            <Grid size={12}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Recursos y Comentarios
                </Typography>
              </Divider>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Controller name="linkOneDrive" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label="Pieza Gráfica"
                  fullWidth size="small" required
                  placeholder="https://mafperu.sharepoint.com/..."
                  error={!!errors.linkOneDrive}
                  helperText={errors.linkOneDrive?.message ?? 'URL de pieza gráfica'}
                  slotProps={{
                    input: { startAdornment: <LinkIcon fontSize="small" color="action" sx={{ mr: 0.5 }} /> },
                  }}
                />
              )} />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Controller name="comentarios" control={control} render={({ field }) => (
                <TextField {...field} label="Comentarios" fullWidth size="small" multiline rows={3}
                  placeholder="Información adicional sobre la campaña..." />
              )} />
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #dee2e6', gap: 1 }}>
          <Button type="submit" variant="contained" disabled={isBusy}
            sx={{ bgcolor: '#E40521', '&:hover': { bgcolor: '#a80018' } }}
            startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : null}>
            {isBusy ? 'Guardando...' : 'Crear Campaña'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
