'use client'

import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmColor?: 'error' | 'warning' | 'inherit'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmColor = 'error',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle
        component="div"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}
      >
        <WarningAmberIcon color="warning" />
        <Typography component="span" variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onCancel} variant="outlined">
          No, volver
        </Button>
        <Button onClick={onConfirm} variant="contained" color={confirmColor}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
