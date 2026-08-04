'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { fetchEasyAuthUser } from '@/lib/auth/easyAuth'
import type { User } from '@/types'

interface UserContextValue {
  user: User | null
  loading: boolean
}

const UserContext = createContext<UserContextValue>({ user: null, loading: true })

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true
    fetchEasyAuthUser().then((u) => {
      if (activo) { setUser(u); setLoading(false) }
    })
    return () => { activo = false }
  }, [])

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  )
}

/** Usuario autenticado vía Azure Easy Auth (o null si no hay sesión). */
export function useCurrentUser(): User | null {
  return useContext(UserContext).user
}

export function useUserLoading(): boolean {
  return useContext(UserContext).loading
}
