/**
 * Cliente Dataverse Web API — SOLO server-side.
 *
 * Nunca importar este archivo desde un componente/hook que corra en el
 * navegador: usa DATAVERSE_PASSWORD, que jamás debe llegar al bundle del
 * cliente. Se invoca desde Route Handlers (src/app/api/**).
 *
 * Auth: OAuth2 Resource Owner Password Credentials (ROPC) contra Entra ID
 * — mismo patrón que ya usa el resto de sistemas MAF (App Registration
 * pública, sin client secret, + usuario/contraseña de servicio).
 *
 * ⚠️ TEMPORAL: a pedido explícito, los valores de conexión a QA quedan
 * hardcodeados como fallback más abajo para poder probar de inmediato.
 * Rotar la contraseña de mafcrm@mafperu.com.pe después de las pruebas y
 * mover esto a variables de entorno / Application Settings de Azure
 * (las env vars DATAVERSE_* siguen teniendo prioridad si se configuran).
 * Ver src/DESPLIEGUE_DATAVERSE.md.
 */

interface TokenCache {
  token: string
  expiresAt: number
}

let cached: TokenCache | null = null

const FALLBACK = {
  appId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
  username: 'mafcrm@mafperu.com.pe',
  password: 'P4ssW0rdM4f2023##',
  dataverseUrl: 'https://mafperutst.crm.dynamics.com',
}

function requireEnv() {
  const appId = process.env.DATAVERSE_APP_ID || FALLBACK.appId
  const username = process.env.DATAVERSE_USERNAME || FALLBACK.username
  const password = process.env.DATAVERSE_PASSWORD || FALLBACK.password
  const dataverseUrl = process.env.DATAVERSE_URL || FALLBACK.dataverseUrl
  const tenant = process.env.DATAVERSE_TENANT || 'common'
  return { appId, username, password, dataverseUrl, tenant }
}

async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token

  const { appId, username, password, dataverseUrl, tenant } = requireEnv()

  // Endpoint v1 (no v2.0): es el que soporta grant_type=password (ROPC)
  // contra Dataverse, igual que usa Microsoft.Xrm.Tooling.Connector.
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: appId,
      username,
      password,
      resource: dataverseUrl,
    }),
  })
  if (!res.ok) {
    throw new Error(`Login Dataverse falló (${res.status}): ${await res.text()}`)
  }

  const json = (await res.json()) as { access_token: string; expires_in: string }
  cached = { token: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) - 60) * 1000 }
  return cached.token
}

async function dvFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { dataverseUrl } = requireEnv()
  const token = await getAccessToken()
  const res = await fetch(`${dataverseUrl}/api/data/v9.2${path}`, {
    ...init,
    cache: 'no-store',
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

/**
 * Crea o actualiza por clave alternativa (upsert nativo de Dataverse).
 * `keyValue` no debe contener comillas simples sin escapar (OData: '' → ').
 */
export async function dvUpsert(entitySet: string, keyField: string, keyValue: string, body: object): Promise<void> {
  const safeValue = keyValue.replace(/'/g, "''")
  await dvFetch(`/${entitySet}(${keyField}='${safeValue}')`, { method: 'PATCH', body: JSON.stringify(body) })
}

/** Borra una fila por clave alternativa. No lanza si ya no existía (404). */
export async function dvDelete(entitySet: string, keyField: string, keyValue: string): Promise<void> {
  const safeValue = keyValue.replace(/'/g, "''")
  try {
    await dvFetch(`/${entitySet}(${keyField}='${safeValue}')`, { method: 'DELETE' })
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('404')) throw err
  }
}

/** Borra una fila por su GUID real. No lanza si ya no existía (404). */
export async function dvDeleteById(entitySet: string, id: string): Promise<void> {
  try {
    await dvFetch(`/${entitySet}(${id})`, { method: 'DELETE' })
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('404')) throw err
  }
}

/** Lista filas de un entity set con $select y $filter opcionales. */
export async function dvList<T>(entitySet: string, select: string[], filter?: string): Promise<T[]> {
  const params = new URLSearchParams()
  if (select.length) params.set('$select', select.join(','))
  if (filter) params.set('$filter', filter)
  const query = params.toString() ? `?${params.toString()}` : ''
  const res = await dvFetch(`/${entitySet}${query}`, { method: 'GET' })
  const json = (await res.json()) as { value: T[] }
  return json.value
}
