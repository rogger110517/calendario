/**
 * AuthService — MVP con validación email + contraseña y JWT simulado.
 *
 * Migración Entra ID (Fase 2):
 * ─────────────────────────────
 * import { PublicClientApplication } from '@azure/msal-browser'
 * login()          → msalInstance.loginRedirect({ scopes: ['openid','profile','email'] })
 * logout()         → msalInstance.logoutRedirect()
 * getCurrentUser() → msalInstance.getActiveAccount() + llamada a /me de Graph API
 *
 * NOTA: las contraseñas en users.json son solo para MVP.
 * En producción NUNCA se almacenan contraseñas — la autenticación la maneja Entra ID.
 */

import type { User } from '@/types'
import usersData from '@/mocks/users.json'
import { createMockToken, decodeMockToken } from '@/lib/auth/jwt'

const TOKEN_KEY = 'cc_auth_token'

// Tipo interno — incluye password solo para MVP
interface UserRecord extends User {
  password: string
}

export type LoginError = 'INVALID_CREDENTIALS' | 'USER_NOT_FOUND' | 'UNKNOWN'

export interface LoginResult {
  ok:    true
  user:  User
  token: string
}
export interface LoginFailure {
  ok:    false
  error: LoginError
}

export const AuthService = {
  /** Valida email + contraseña y emite JWT mock */
  login(correo: string, password: string): LoginResult | LoginFailure {
    const records = usersData as UserRecord[]
    const record  = records.find((u) => u.correo.toLowerCase() === correo.toLowerCase().trim())

    if (!record) return { ok: false, error: 'USER_NOT_FOUND' }
    if (record.password !== password) return { ok: false, error: 'INVALID_CREDENTIALS' }

    // Omitir password del objeto User expuesto
    const { password: _pw, ...user } = record
    const token = createMockToken(user)

    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token)
    }

    return { ok: true, user, token }
  },

  /** Lee y valida el JWT del localStorage */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null
    const payload = decodeMockToken(token)
    if (!payload) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    const records = usersData as UserRecord[]
    const record  = records.find((u) => u.id === payload.sub)
    if (!record) return null
    const { password: _pw, ...user } = record
    return user
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
    }
  },

  isAuthenticated(): boolean {
    return !!AuthService.getCurrentUser()
  },
}
