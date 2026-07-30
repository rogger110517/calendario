# Integración con Microsoft Dataverse

## Estrategia de Migración

La arquitectura Repository Pattern permite migrar de JSON a Dataverse sin modificar ningún componente de UI ni servicio. Solo se reemplaza el cuerpo de los métodos en cada repositorio.

## Pasos de Migración

### 1. Configurar autenticación MSAL

```bash
npm install @azure/msal-browser @azure/msal-react
```

```typescript
// src/lib/auth/msal.ts
import { PublicClientApplication, Configuration } from '@azure/msal-browser'

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
  },
  cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
}

export const msalInstance = new PublicClientApplication(msalConfig)

export async function getDataverseToken() {
  const account = msalInstance.getActiveAccount()
  if (!account) throw new Error('No active account')
  const result = await msalInstance.acquireTokenSilent({
    scopes: [`${process.env.DATAVERSE_URL}/.default`],
    account,
  })
  return result.accessToken
}
```

### 2. Crear cliente HTTP Dataverse

```typescript
// src/lib/dataverse/client.ts
const BASE = process.env.DATAVERSE_URL // https://orgXXX.crm.dynamics.com/api/data/v9.2

export async function dvGet<T>(path: string): Promise<T> {
  const token = await getDataverseToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Dataverse error: ${res.status}`)
  return res.json()
}

export async function dvPost<T>(path: string, body: object): Promise<T> {
  const token = await getDataverseToken()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Dataverse error: ${res.status}`)
  return res.json()
}
```

### 3. Reemplazar CampaignRepository

```typescript
// src/lib/repositories/campaign.repository.ts (producción)
import { dvGet, dvPost } from '@/lib/dataverse/client'
import type { Campaign } from '@/types'

function mapToCampaign(dv: Record<string, unknown>): Campaign {
  return {
    id: dv.cr_campaignid as string,
    nombreCampana: dv.cr_nombrecampana as string,
    subject: dv.cr_subject as string,
    dirigidoA: dv.cr_dirigidoa as string,
    filtrosAplicar: dv.cr_filtrosaplicar as string,
    dealer: dv._cr_dealerid_value as string | null,
    diaEnvio: (dv.cr_diaenvio as string).split('T')[0],
    diaFin: (dv.cr_diafin as string).split('T')[0],
    recurrencia: dv.cr_recurrencia as boolean,
    tipoRecurrencia: dv.cr_tiporecurrencia as Campaign['tipoRecurrencia'],
    cantidadComunicaciones: dv.cr_cantidadcomunicaciones as number,
    solicitante: dv._ownerid_value as string,
    fechaRegistro: dv.createdon as string,
    estado: dv.cr_estado as Campaign['estado'],
  }
}

export const CampaignRepository = {
  async findAll(): Promise<Campaign[]> {
    const { value } = await dvGet<{ value: Record<string, unknown>[] }>(
      '/cr_campaigns?$select=cr_campaignid,cr_nombrecampana,cr_subject,cr_estado,cr_diaenvio,cr_diafin'
    )
    return value.map(mapToCampaign)
  },

  async create(data: Omit<Campaign, 'id'>): Promise<Campaign> {
    return dvPost<Campaign>('/cr_campaigns', {
      cr_nombrecampana: data.nombreCampana,
      cr_subject: data.subject,
      cr_dirigidoa: data.dirigidoA,
      cr_filtrosplicar: data.filtrosAplicar,
      cr_diaenvio: data.diaEnvio,
      cr_diafin: data.diaFin,
      cr_recurrencia: data.recurrencia,
      cr_estado: data.estado,
    })
  },
  // ... resto de métodos
}
```

## OData Queries Útiles

```
# Filtrar por estado
GET /cr_campaigns?$filter=cr_estado eq 'Pendiente'

# Filtrar por rango de fechas
GET /cr_campaigns?$filter=cr_diaenvio ge 2026-07-01T00:00:00Z and cr_diaenvio le 2026-07-31T23:59:59Z

# Expandir dealer
GET /cr_campaigns?$expand=cr_dealerid($select=cr_nombre,cr_codigo)

# Ordenar por fecha
GET /cr_campaigns?$orderby=cr_diaenvio desc

# Paginación
GET /cr_campaigns?$top=50&$skip=0
```

## Permisos Azure AD Requeridos

- `Dynamics CRM user_impersonation` — para Dataverse Web API
- Configurar en: Azure Portal → App registrations → API permissions

## Variables de Entorno Producción

```env
DATAVERSE_URL=https://orgXXXXXXXX.crm.dynamics.com/api/data/v9.2
NEXT_PUBLIC_AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
