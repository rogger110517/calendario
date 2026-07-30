# Cómo subir este proyecto a Azure App Service

Guía paso a paso para desplegar el MVP (Next.js 15, con API Routes) en **Azure App Service (Linux, Node.js)**. Es la opción correcta para este proyecto porque App Service ejecuta Next.js en modo servidor completo (SSR + `/api/*`), a diferencia de Static Web Apps que requeriría convertir las API Routes a Azure Functions.

## 1. Qué se sube y qué no

El repositorio ya tiene un `.gitignore` preparado. **No se suben** (se regeneran o se configuran aparte):

| Carpeta/archivo | Por qué no va |
|---|---|
| `node_modules/` | Azure lo reinstala en el build (`npm install`) |
| `.next/` | Es el build; Azure lo genera con `npm run build` |
| `.env.local` | Contiene configuración/secretos — se configuran como *Application Settings* en el Portal, nunca en el repo |
| `*.tsbuildinfo`, `next-env.d.ts` | Archivos autogenerados |
| `.claude/` | Configuración local del asistente, no es parte de la app |

**Sí se sube:** todo el código (`src/`), `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, y `.env.example` (como referencia de qué variables existen, sin valores reales).

## 2. Crear los recursos en Azure

Con Azure CLI (`az login` primero):

```bash
az group create --name calendario-rg --location eastus

az appservice plan create \
  --name calendario-plan \
  --resource-group calendario-rg \
  --sku B2 \
  --is-linux

az webapp create \
  --name calendario-comunicaciones \
  --resource-group calendario-rg \
  --plan calendario-plan \
  --runtime "NODE:20-lts"
```

También se puede hacer desde el Portal: **Crear recurso → Web App → Publish: Code → Runtime stack: Node 20 LTS → Sistema operativo: Linux**.

## 3. Configurar variables de entorno (Application Settings)

En **Azure Portal → tu Web App → Configuration → Application settings**, agrega las mismas claves de `.env.example` con sus valores reales de producción:

| Key | Valor |
|---|---|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Client ID de la app en Entra ID |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | Tenant ID de la organización |
| `NEXT_PUBLIC_REDIRECT_URI` | URL pública de la app, ej. `https://calendario-comunicaciones.azurewebsites.net` |
| `SENDGRID_API_KEY` | Clave API de SendGrid |
| `EMAIL_FROM` | Email remitente |
| `DATAVERSE_URL` | URL del entorno Dataverse |
| `NEXT_PUBLIC_SHAREPOINT_SITE` | ID del sitio SharePoint |

Además, agrega estas dos para que Azure compile el proyecto automáticamente al recibir el código (build con Oryx):

| Key | Valor |
|---|---|
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |

Por CLI, todo junto:

```bash
az webapp config appsettings set \
  --name calendario-comunicaciones \
  --resource-group calendario-rg \
  --settings \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    WEBSITE_NODE_DEFAULT_VERSION=~20 \
    NEXT_PUBLIC_REDIRECT_URI=https://calendario-comunicaciones.azurewebsites.net \
    EMAIL_FROM=noreply@tuempresa.com
    # ...agrega el resto de claves aquí
```

## 4. Configurar el comando de inicio (Startup Command)

**Portal → Configuration → General settings → Startup Command:**

```
npm run start
```

Azure inyecta la variable `PORT` automáticamente; `next start` la respeta sola (no hace falta tocar código).

## 5. Subir el código

### Opción recomendada: GitHub + Deployment Center (CI/CD automático)

1. Sube este repo a GitHub (o Azure Repos):
   ```bash
   git remote add origin <URL_DE_TU_REPOSITORIO>
   git branch -M main
   git push -u origin main
   ```
2. En el Portal: **tu Web App → Deployment Center → Source: GitHub** → selecciona el repo y la rama `main`.
3. Azure genera un workflow de GitHub Actions y despliega automáticamente en cada push a `main`.

### Alternativa: Local Git (sin GitHub)

```bash
az webapp deployment source config-local-git \
  --name calendario-comunicaciones \
  --resource-group calendario-rg

git remote add azure <URL_QUE_DEVUELVE_EL_COMANDO_ANTERIOR>
git push azure main
```

En ambos casos, Azure instala dependencias (`npm install`) y ejecuta `npm run build` automáticamente (por el `SCM_DO_BUILD_DURING_DEPLOYMENT=true` del paso 3).

## 6. Verificar

1. **Portal → Log stream**: revisa que el build y el arranque no tengan errores.
2. Abre `https://<tu-app>.azurewebsites.net`.
3. Prueba login, calendario y creación de una campaña.

## 7. Notas importantes

- **Los datos son mock en memoria** (`src/mocks/*.json` + repositorios en `src/lib/repositories`): se reinician cada vez que Azure reinicia o escala la app. No hay base de datos real todavía — ver `INTEGRACION_DATAVERSE.md` en la raíz del proyecto para el plan de migración.
- Si el build falla por memoria en el plan `B1`, sube a `B2` o superior.
- Si cambias la URL de la app, actualiza `NEXT_PUBLIC_REDIRECT_URI` en Application Settings.
