import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/auth/roles'

/**
 * Protege rutas /admin/*. Azure App Service Easy Auth inyecta el correo
 * del usuario ya autenticado en el header `x-ms-client-principal-name`
 * en cada request (más rápido que llamar a /.auth/me de nuevo acá).
 *
 * En local (`npm run dev`) ese header no existe — /admin/* redirige a "/"
 * siempre, porque no hay forma de saber el rol sin Easy Auth corriendo.
 * Probar la protección real desde el sitio desplegado en Azure.
 */
export function middleware(req: NextRequest) {
  const correo = req.headers.get('x-ms-client-principal-name')

  if (!correo || !isAdminEmail(correo)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
