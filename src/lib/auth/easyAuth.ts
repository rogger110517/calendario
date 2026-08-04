import type { User } from '@/types'
import { getUserRole } from './roles'

/**
 * Forma de la respuesta de /.auth/me que expone Azure App Service Easy
 * Auth cuando la autenticación (Entra ID) está activa. Ver:
 * https://learn.microsoft.com/azure/app-service/configure-authentication-user-identities
 */
interface EasyAuthClaim {
  typ: string
  val: string
}

interface EasyAuthMeEntry {
  provider_name: string
  user_id: string
  user_claims: EasyAuthClaim[]
}

const CLAIM_NAME = [
  'name',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
]
const CLAIM_EMAIL = [
  'preferred_username',
  'email',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
]

function claim(claims: EasyAuthClaim[], tipos: string[]): string | undefined {
  for (const tipo of tipos) {
    const found = claims.find((c) => c.typ === tipo)
    if (found?.val) return found.val
  }
  return undefined
}

/**
 * Llama a /.auth/me (inyectado por Azure App Service, no existe en
 * `npm run dev` local) y arma el User de la app. `null` si no hay sesión
 * activa (local sin Easy Auth, o usuario no autenticado).
 */
export async function fetchEasyAuthUser(): Promise<User | null> {
  let res: Response
  try {
    res = await fetch('/.auth/me', { credentials: 'include' })
  } catch {
    return null
  }
  if (!res.ok) return null

  let entries: EasyAuthMeEntry[]
  try {
    entries = await res.json()
  } catch {
    return null
  }
  const entry = entries?.[0]
  if (!entry) return null

  const correo = claim(entry.user_claims, CLAIM_EMAIL) ?? entry.user_id
  if (!correo) return null

  const nombre = claim(entry.user_claims, CLAIM_NAME) ?? correo.split('@')[0]

  return {
    id: correo,
    nombre,
    correo,
    rol: getUserRole(correo),
  }
}
