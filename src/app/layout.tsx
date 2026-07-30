import type { Metadata } from 'next'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Calendario Comunicaciones Corporativas',
  description: 'Gestión de campañas y comunicaciones corporativas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        {/* AppRouterCacheProvider resuelve el mismatch de clases Emotion entre SSR y cliente */}
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
