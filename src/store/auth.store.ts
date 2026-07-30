import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'
import { AuthService } from '@/lib/services/auth.service'

interface AuthState {
  currentUser:     User | null
  token:           string | null
  isAuthenticated: boolean
  _hydrated:       boolean

  login:      (correo: string, password: string) => { ok: boolean; error?: string }
  logout:     () => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser:     null,
      token:           null,
      isAuthenticated: false,
      _hydrated:       false,

      login: (correo, password) => {
        const result = AuthService.login(correo, password)
        if (!result.ok) return { ok: false, error: result.error }
        set({ currentUser: result.user, token: result.token, isAuthenticated: true })
        return { ok: true }
      },

      logout: () => {
        AuthService.logout()
        set({ currentUser: null, token: null, isAuthenticated: false })
      },

      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name:    'cc_auth_store',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (s) => ({ currentUser: s.currentUser, token: s.token, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    },
  ),
)
