# Despliegue en Azure

## Opción 1: Azure Static Web Apps (Recomendado para MVP)

Ideal para Next.js con App Router. Incluye API Routes como Azure Functions automáticamente.

### GitHub Actions

```yaml
# .github/workflows/azure-static-web-apps.yml
name: Deploy to Azure Static Web Apps

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: 'upload'
          app_location: '/'
          api_location: ''
          output_location: '.next'
```

### Configuración en Azure Portal

1. Crear **Static Web App** en Azure Portal
2. Vincular con repositorio GitHub
3. Configurar variables de entorno en:
   `Static Web App → Configuration → Application Settings`

| Key | Descripción |
|---|---|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Client ID de la aplicación Entra ID |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | Tenant ID de la organización |
| `NEXT_PUBLIC_REDIRECT_URI` | URL de la app desplegada |
| `SENDGRID_API_KEY` | Clave API de SendGrid |
| `EMAIL_FROM` | Email remitente |
| `DATAVERSE_URL` | URL del entorno Dataverse |
| `NEXT_PUBLIC_SHAREPOINT_SITE` | ID del sitio SharePoint |

## Opción 2: Azure App Service (recomendado — control total sobre el servidor Node.js)

Es la opción usada actualmente para este proyecto, porque corre Next.js en modo servidor completo
(SSR + `/api/*`). Guía paso a paso completa, con Application Settings, Deployment Center y
verificación: **[`src/DESPLIEGUE_APP_SERVICE.md`](src/DESPLIEGUE_APP_SERVICE.md)**.

Resumen rápido con Azure CLI:

```bash
# Crear App Service plan
az appservice plan create \
  --name calendario-plan \
  --resource-group calendario-rg \
  --sku B2 \
  --is-linux

# Crear Web App (runtime: Node 20 LTS)
az webapp create \
  --name calendario-comunicaciones \
  --resource-group calendario-rg \
  --plan calendario-plan \
  --runtime "NODE:20-lts"

# Habilitar build automático (Oryx) y comando de inicio
az webapp config appsettings set \
  --name calendario-comunicaciones \
  --resource-group calendario-rg \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true WEBSITE_NODE_DEFAULT_VERSION=~20

az webapp config set \
  --name calendario-comunicaciones \
  --resource-group calendario-rg \
  --startup-file "npm run start"

# Deploy: conectar el repo (GitHub Deployment Center o Local Git) — NO se sube
# un zip manual. Azure instala dependencias y ejecuta "npm run build" solo.
# Ver src/DESPLIEGUE_APP_SERVICE.md, sección 5, para el paso a paso.
```

### Verificar que quedó publicado

Una vez que el Deployment Center termina el primer deploy (ver **Log stream** en el Portal
para seguirlo en vivo), el proyecto queda disponible en:

```
https://calendario-comunicaciones.azurewebsites.net
```

(sustituye `calendario-comunicaciones` por el nombre real que le diste a la Web App). Ese es el
link que hay que compartir/usar en producción — pruébalo abriendo login, calendario y creación
de una campaña antes de darlo por bueno.

### Secretos con Azure Key Vault (recomendado para producción)

En vez de guardar `SENDGRID_API_KEY` y `DATAVERSE_URL` como texto plano en Application Settings,
usa Key Vault + Managed Identity:

```bash
# 1. Crear el Key Vault
az keyvault create \
  --name calendario-kv \
  --resource-group calendario-rg \
  --location eastus

# 2. Guardar los secretos ahí (no en el repo, no en Application Settings en texto plano)
az keyvault secret set --vault-name calendario-kv --name SendgridApiKey  --value "<tu-api-key>"
az keyvault secret set --vault-name calendario-kv --name DataverseUrl   --value "<tu-url>"

# 3. Activar identidad administrada en la Web App
az webapp identity assign \
  --name calendario-comunicaciones \
  --resource-group calendario-rg

# 4. Darle permiso de lectura de secretos a esa identidad (usa el principalId que devuelve el paso 3)
az keyvault set-policy \
  --name calendario-kv \
  --object-id <principalId-del-paso-3> \
  --secret-permissions get list

# 5. Referenciar el secreto desde Application Settings (la Web App lo resuelve solo)
az webapp config appsettings set \
  --name calendario-comunicaciones \
  --resource-group calendario-rg \
  --settings SENDGRID_API_KEY="@Microsoft.KeyVault(SecretUri=https://calendario-kv.vault.azure.net/secrets/SendgridApiKey/)" \
             DATAVERSE_URL="@Microsoft.KeyVault(SecretUri=https://calendario-kv.vault.azure.net/secrets/DataverseUrl/)"
```

**Importante:** las referencias `@Microsoft.KeyVault(...)` solo se resuelven cuando el proceso
del sitio arranca (runtime) — úsalas solo para variables que el código lee en tiempo de ejecución,
como `SENDGRID_API_KEY` (usada dentro de `src/lib/services/email.service.ts` / la API Route).
**No** las uses para las variables `NEXT_PUBLIC_*`: Next.js las incrusta en el bundle del
navegador durante `npm run build`, así que esas deben seguir siendo Application Settings normales
(en texto plano dentro de Azure, nunca en el repo) para que estén disponibles durante el build.

## Opción 3: Azure Container Apps

Para arquitectura containerizada.

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build y push imagen
az acr build \
  --registry miRegistro \
  --image calendario-comunicaciones:latest .

# Crear Container App
az containerapp create \
  --name calendario-comunicaciones \
  --resource-group calendario-rg \
  --image miRegistro.azurecr.io/calendario-comunicaciones:latest \
  --target-port 3000 \
  --ingress external
```

## Azure Functions (API Backend Futuro)

Cuando la lógica de negocio crezca, mover las API Routes a Azure Functions:

```
/api/campaigns     → HttpTrigger (Node.js)
/api/send-email    → HttpTrigger + SendGrid binding
/api/dealers       → HttpTrigger
```

```typescript
// campaigns/index.ts (Azure Function v4)
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'

app.http('campaigns', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (request.method === 'GET') {
      const campaigns = await CampaignRepository.findAll()
      return { jsonBody: { data: campaigns, success: true } }
    }
    // ... POST handler
  },
})
```

## Pipeline CI/CD Completo

```mermaid
graph LR
    DEV[Developer Push] --> GH[GitHub]
    GH --> CI[GitHub Actions CI]
    CI -->|type-check + lint| QA[Quality Gate]
    QA -->|pass| BUILD[npm build]
    BUILD --> STAGING[Azure SWA Staging]
    STAGING -->|preview URL| PR[Pull Request Review]
    PR -->|merge main| PROD[Azure SWA Production]
```

## Monitoreo

```typescript
// Agregar Application Insights (producción)
// npm install @microsoft/applicationinsights-web

import { ApplicationInsights } from '@microsoft/applicationinsights-web'

const appInsights = new ApplicationInsights({
  config: {
    connectionString: process.env.NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING,
  },
})
appInsights.loadAppInsights()
appInsights.trackPageView()
```
