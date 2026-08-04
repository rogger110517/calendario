'use client'

import React from 'react'
import { useCurrentUser } from './UserProvider'

/** Renderiza los hijos solo si el usuario autenticado tiene rol admin. */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser()
  if (user?.rol !== 'admin') return null
  return <>{children}</>
}
