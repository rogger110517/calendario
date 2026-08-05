import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  // El HTML nunca se cachea, así cada visita/deploy carga siempre la
  // última versión de los bundles — evita que el navegador quede
  // "pegado" mostrando una versión vieja después de un deploy. Los
  // archivos de _next/static/* sí se pueden cachear largo plazo, son
  // inmutables (Next les pone hash en el nombre).
  async headers() {
    return [
      {
        // Todo menos los assets estáticos con hash (_next/static, _next/image) — esos sí son seguros de cachear largo plazo.
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
