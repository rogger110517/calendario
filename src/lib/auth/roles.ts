import type { UserRole } from '@/types'

/**
 * Roles sin base de datos — lista fija de administradores. Cualquier otro
 * correo autenticado vía Easy Auth es "colaborador". Para agregar un
 * admin, sumar su correo acá (en minúsculas).
 */
const ADMIN_EMAILS = [
  'palomino_pach@outlook.com',
]

export function getUserRole(email: string): UserRole {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? 'admin' : 'colaborador'
}

export function isAdminEmail(email: string): boolean {
  return getUserRole(email) === 'admin'
}

export { ADMIN_EMAILS }
