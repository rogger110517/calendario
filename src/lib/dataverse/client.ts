/**
 * Cliente Dataverse Web API — SOLO server-side.
 *
 * Nunca importar este archivo desde un componente/hook que corra en el
 * navegador: usa DATAVERSE_CLIENT_SECRET, que jamás debe llegar al bundle
 * del cliente. Se invoca desde Route Handlers (src/app/api/**).
 *
 * Auth: OAuth2 client_credentials contra Entra ID (App Registration +
 * Application User creado en el entorno de Dataverse).
 */

interface TokenCache {
  token: string
  expiresAt: number
}

let cached: TokenCache | null = null

function requireEnv() {
  const tenantId = process.env.DATAVERSE_TENANT_ID
  const clientId = process.env.DATAVERSE_CLIENT_ID
  const clientSecret = process.env.DATAVERSE_CLIENT_SECRET
  const dataverseUrl = process.env.DATAVERSE_URL
  if (!tenantId || !clientId || !clientSecret || !dataverseUrl) {
    throw new Error('Dataverse no configurado: faltan variables de entorno DATAVERSE_*')
  }
  return { tenantId, clientId, clientSecret, dataverseUrl }
}

async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token

  const { tenantId, clientId, clientSecret, dataverseUrl } = requireEnv()

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: `${dataverseUrl}/.default`,
    }),
  })
  if (!res.ok) {
    throw new Error(`Login Dataverse falló (${res.status}): ${await res.text()}`)
  }

  const json = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 }
  return cached.token
}

async function dvFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { dataverseUrl } = requireEnv()
  const token = await getAccessToken()
  const res = await fetch(`${dataverseUrl}/api/data/v9.2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    throw new Error(`Dataverse error ${res.status} en ${path}: ${await res.text()}`)
  }
  return res
}

/** Crea una fila. Devuelve el GUID generado (leído del header OData-EntityId). */
export async function dvCreate(entitySet: string, body: object): Promise<string> {
  const res = await dvFetch(`/${entitySet}`, { method: 'POST', body: JSON.stringify(body) })
  const entityId = res.headers.get('OData-EntityId') ?? ''
  return entityId.match(/\(([^)]+)\)/)?.[1] ?? ''
}

/** Actualiza una fila existente por GUID. */
export async function dvUpdate(entitySet: string, id: string, body: object): Promise<void> {
  await dvFetch(`/${entitySet}(${id})`, { method: 'PATCH', body: JSON.stringify(body) })
}
