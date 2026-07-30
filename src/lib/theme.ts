import { createTheme } from '@mui/material/styles'

// ── Paleta MAF Perú ──────────────────────────────────────────────────────────
// Fuente: https://mafperu.com/wp-content/themes/mafperu2023/style.css
// Primary   → #E40521  (rojo MAF)
// Secondary → #4A4A4A  (gris MAF)
// Light bg  → #E9EAE8
// Text      → #212529

export const MAF_RED   = '#E40521'
export const MAF_GRAY  = '#4A4A4A'
export const MAF_LIGHT = '#E9EAE8'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main:  MAF_RED,
      light: '#ff4d63',
      dark:  '#a80018',
    },
    secondary: {
      main:  MAF_GRAY,
      light: '#767676',
      dark:  '#2e2e2e',
    },
    background: {
      default: MAF_LIGHT,
      paper:   '#ffffff',
    },
    error:   { main: '#dc3545' },
    warning: { main: '#ffc107' },
    success: { main: '#198754' },
    info:    { main: '#0078d4' },
    text: {
      primary:   '#212529',
      secondary: '#6c757d',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 700 },
        containedPrimary: {
          '&:hover': { backgroundColor: '#a80018' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,.10)',
          border: '1px solid #dee2e6',
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: { backgroundColor: MAF_RED },
      },
    },
  },
})
