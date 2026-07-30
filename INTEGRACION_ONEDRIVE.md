# Integración OneDrive / SharePoint

## Estado MVP

En el MVP, `FileStorageService` **no sube archivos físicamente**. Solo guarda metadata:
- `nombre` (string)
- `tamaño` (number, bytes)
- `fechaCarga` (ISO datetime string)

## Migración a Microsoft Graph + OneDrive

### Instalación

```bash
npm install @microsoft/microsoft-graph-client @azure/identity
npm install --save-dev @microsoft/microsoft-graph-types
```

### Subida de Archivo

```typescript
import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'

async function getGraphClient(accessToken: string) {
  const authProvider = {
    getAccessToken: async () => accessToken,
  }
  return Client.initWithMiddleware({ authProvider })
}

// En FileStorageService
async uploadFile(file: File): Promise<UploadResult> {
  const accessToken = await getDataverseToken() // reusar token MSAL con scope Graph
  const client = await getGraphClient(accessToken)

  const arrayBuffer = await file.arrayBuffer()
  const FOLDER = 'Campanas/Archivos' // carpeta en OneDrive corporativo

  const result = await client
    .api(`/me/drive/root:/${FOLDER}/${file.name}:/content`)
    .put(arrayBuffer)

  return {
    nombre: result.name,
    tamaño: result.size,
    fechaCarga: result.createdDateTime,
    archivoId: result.id,
    archivoUrl: result.webUrl,
  }
}
```

### Descarga de Archivo

```typescript
async downloadFile(archivoId: string): Promise<void> {
  const accessToken = await getDataverseToken()
  const client = await getGraphClient(accessToken)

  // Obtener URL de descarga directa
  const item = await client
    .api(`/me/drive/items/${archivoId}`)
    .select('@microsoft.graph.downloadUrl,name')
    .get()

  // Abrir descarga en nueva pestaña
  window.open(item['@microsoft.graph.downloadUrl'], '_blank')
}
```

### Obtener Metadatos

```typescript
async getFile(archivoId: string): Promise<UploadResult | null> {
  const accessToken = await getDataverseToken()
  const client = await getGraphClient(accessToken)

  const item = await client
    .api(`/me/drive/items/${archivoId}`)
    .select('id,name,size,createdDateTime,webUrl')
    .get()

  return {
    nombre: item.name,
    tamaño: item.size,
    fechaCarga: item.createdDateTime,
    archivoId: item.id,
    archivoUrl: item.webUrl,
  }
}
```

### Eliminar Archivo

```typescript
async deleteFile(archivoId: string): Promise<void> {
  const accessToken = await getDataverseToken()
  const client = await getGraphClient(accessToken)
  await client.api(`/me/drive/items/${archivoId}`).delete()
}
```

## Integración con SharePoint (Alternativa)

```typescript
// Subir a biblioteca de SharePoint en lugar de OneDrive personal
const SITE_ID = process.env.NEXT_PUBLIC_SHAREPOINT_SITE!
const LIBRARY = 'ArchivosCampanas'

const result = await client
  .api(`/sites/${SITE_ID}/drives`)
  .get()

const driveId = result.value[0].id

await client
  .api(`/sites/${SITE_ID}/drives/${driveId}/root:/${LIBRARY}/${file.name}:/content`)
  .put(arrayBuffer)
```

## Actualización del Modelo Campaign

Al integrar OneDrive, el campo `archivoObjetivo` se enriquece:

```typescript
archivoObjetivo: {
  nombre: 'Clientes_Lima.xlsx',
  tamaño: 245760,
  fechaCarga: '2026-07-22T10:00:00Z',
  archivoId: '01XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',  // ← nuevo
  archivoUrl: 'https://empresa.sharepoint.com/...',   // ← nuevo
}
```

## Permisos Azure AD Requeridos

| Permiso | Tipo | Descripción |
|---|---|---|
| Files.ReadWrite | Delegado | Leer/escribir archivos en OneDrive del usuario |
| Files.ReadWrite.All | Delegado | Leer/escribir todos los archivos |
| Sites.ReadWrite.All | Delegado | Acceso a SharePoint |

Configurar en: **Azure Portal → App registrations → [Tu App] → API permissions → Add permission → Microsoft Graph**

## Variables de Entorno

```env
# Microsoft Graph
NEXT_PUBLIC_SHAREPOINT_SITE=empresa.sharepoint.com,site-id,web-id
GRAPH_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
