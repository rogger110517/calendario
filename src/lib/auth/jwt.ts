/**
 * JWT simulado para MVP.
 *
 * Migración a Entra ID (Fase 2):
 * - Reemplazar createMockToken() con msalInstance.acquireTokenSilent()
 * - Reemplazar decodeMockToken() con jwt-decode o MSAL's getActiveAccount()
 * - El token real de Entra ID es un JWT firmado con RS256
 */

import type { User, UserRole } from '@/types'

export interface TokenPayload {
  sub:    string    // user id
  nombre: string
  email:  string
  rol:    UserRole
  depto:  string
  iat:    number    // issued at  (ms)
  exp:    number    // expires at (ms)
}

const DURATION_MS = 8 * 60 * 60 * 1000 // 8 horas

export function createMockToken(user: User): string {
  const header  = btoa(JSON.stringify({ alg: 'mock-HS256', typ: 'JWT' }))
  const payload: TokenPayload = {
    sub:    user.id,
    nombre: user.nombre,
    email:  user.correo,
    rol:    user.rol,
    depto:  user.departamento ?? '',
    iat:    Date.now(),
    exp:    Date.now() + DURATION_MS,
  }
  const encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
  const sig = btoa(`cc-mock.${user.id}.${payload.iat}`)
  return `${header}.${encodedPayload}.${sig}`
}

export function decodeMockToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload: TokenPayload = JSON.parse(decodeURIComponent(escape(atob(parts[1]))))
    if (payload.exp < Date.now()) return null   // expirado
    return payload
  } catch {
    return null
  }
}
