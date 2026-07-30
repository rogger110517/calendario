import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
}

export default nextConfig
