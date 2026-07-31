# Cómo subir este proyecto a Azure App Service (manual, desde el Portal)

Guía paso a paso para desplegar el MVP (Next.js 15, con API Routes) en **Azure App Service (Linux, Node.js)**, creando la Web App y conectándola al repositorio de GitHub directamente desde el Portal — sin usar Azure CLI. Es la opción correcta para este proyecto porque App Service ejecuta Next.js en modo servidor completo (SSR + `/api/*`), a diferencia de Static Web Apps que requeriría convertir las API Routes a Azure Functions.

El código ya está en GitHub: `https://github.com/rogger110517/calendario`.

## 1. Qué se sube y qué no

El repositorio ya tiene un `.gitignore` preparado. **No están en el repo** (se regeneran o se configuran aparte):

| Carpeta/archivo | Por qué no va |
|---|---|
| `node_modules/` | Azure lo reinstala en el build |
| `.next/` | Es el build; Azure lo genera al desplegar |
| `.env.local` | Contiene configuración/secretos — se configuran como *Application settings* en el Portal, nunca en el repo |
| `*.tsbuildinfo`, `next-env.d.ts` | Archivos autogenerados |
| `.claude/` | Configuración local del asistente, no es parte de la app |

**Sí está en el repo:** todo el código (`src/`), `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, y `.env.example` (referencia de qué variables existen, sin valores reales).

## 2. Crear la Web App y conectarla al repo (un solo asistente)

En [portal.azure.com](https://portal.azure.com):

1. **Crear un recurso** → busca **"Aplicación web"** (Web App) → **Crear**.

2. **Pestaña "Conceptos básicos":**
   | Campo | Valor |
   |---|---|
   | Suscripción | la tuya |
   | Grupo de recursos | Crear nuevo → `calendario-rg` |
   | Nombre | `calendario-comunicaciones` (define la URL final: `https://calendario-comunicaciones.azurewebsites.net` — debe ser único en todo Azure, si está ocupado prueba con un sufijo) |
   | Publicar | **Código** |
   | Pila en tiempo de ejecución | **Node 20 LTS** |
   | Sistema operativo | **Linux** |
   | Región | la más cercana a tus usuarios |
   | Plan de Linux | Crear nuevo |
   | Plan de tarifa (SKU) | **B1** (Basic) como mínimo — el plan Gratis (F1) suele quedarse sin memoria al compilar Next.js |

3. **Pestaña "Implementación" (Deployment):**
   | Campo | Valor |
   |---|---|
   | Implementación continua | **Activar** |
   | Origen | **GitHub** |
   | (se abre un popup) | Inicia sesión y autoriza a Azure sobre tu cuenta de GitHub |
   | Organización | `rogger110517` |
   | Repositorio | `calendario` |
   | Rama | `main` |

   Con esto, Azure arma automáticamente un workflow de **GitHub Actions** (lo agrega como commit al repo en `.github/workflows/`) que compila y despliega el proyecto en cada `git push` a `main`.

4. **Pestaña "Redes":** deja los valores por defecto (acceso público habilitado) para el MVP.

5. **Revisar y crear** → **Crear**. Azure aprovisiona el recurso y dispara el primer despliegue automáticamente (tarda unos minutos).

## 3. Configurar variables de entorno (Application settings)

Una vez creada la Web App: **tu Web App → Configuración → Variables de entorno (Environment variables / Application settings) → + Nueva configuración de la aplicación**. Agrega, una por una, las claves de `.env.example` con sus valores reales:

| Key | Valor |
|---|---|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Client ID de la app en Entra ID |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | Tenant ID de la organización |
| `NEXT_PUBLIC_REDIRECT_URI` | URL pública de la app, ej. `https://calendario-comunicaciones.azurewebsites.net` |
| `SENDGRID_API_KEY` | Clave API de SendGrid |
| `EMAIL_FROM` | Email remitente |
| `DATAVERSE_URL` | URL del entorno Dataverse |
| `NEXT_PUBLIC_SHAREPOINT_SITE` | ID del sitio SharePoint |

Guarda con **Aplicar** (esto reinicia la app).

> **Producción:** `SENDGRID_API_KEY` y `DATAVERSE_URL` son secretos — mejor no guardarlos en texto
> plano aquí. La guía para moverlos a **Azure Key Vault** (con Managed Identity, sin tocar código)
> está en `DESPLIEGUE_AZURE.md` → sección "Secretos con Azure Key Vault". Las variables
> `NEXT_PUBLIC_*` sí deben quedarse como Application settings normales (Next.js las necesita
> disponibles durante el build, no solo en runtime).

## 4. Revisar el comando de inicio (Startup Command)

**Tu Web App → Configuración → Configuración general → Comando de inicio.** Si aparece vacío, escribe:

```
npm run start
```

Azure inyecta la variable `PORT` automáticamente; `next start` la respeta sola (no hace falta tocar código).

## 5. Seguir el progreso del despliegue

**Tu Web App → Centro de implementación (Deployment Center) → pestaña Registros (Logs).** Ahí ves cada ejecución del workflow de GitHub Actions (build + deploy) con su estado. También puedes verlo directamente en GitHub: pestaña **Actions** del repositorio.

Si algo falla en el arranque (no en el build), revisa **Log stream** dentro de la Web App para ver los errores en vivo.

## 6. Verificar

1. Abre `https://calendario-comunicaciones.azurewebsites.net` (o el nombre que le hayas puesto).
2. Prueba login, calendario y creación de una campaña.

## 7. Notas importantes

- **Los datos son mock en memoria** (`src/mocks/*.json` + repositorios en `src/lib/repositories`): se reinician cada vez que Azure reinicia o escala la app. No hay base de datos real todavía — ver `INTEGRACION_DATAVERSE.md` en la raíz del proyecto para el plan de migración.
- Si el build falla por memoria en el plan `B1`, sube a `B2` o superior.
- Si cambias la URL de la app, actualiza `NEXT_PUBLIC_REDIRECT_URI` en Application settings.
- Cada `git push` a `main` vuelve a desplegar solo (CI/CD ya queda armado desde el paso 2).

---

## Apéndice: lo mismo por Azure CLI (opcional, no es el flujo recomendado aquí)

Si en algún momento prefieres scriptear la creación de recursos en vez de usar el Portal:

```bash
az login

az group create --name calendario-rg --location eastus

az appservice plan create \
  --name calendario-plan --resource-group calendario-rg --sku B2 --is-linux

az webapp create \
  --name calendario-comunicaciones --resource-group calendario-rg \
  --plan calendario-plan --runtime "NODE:20-lts"

az webapp config appsettings set \
  --name calendario-comunicaciones --resource-group calendario-rg \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true WEBSITE_NODE_DEFAULT_VERSION=~20

az webapp config set \
  --name calendario-comunicaciones --resource-group calendario-rg \
  --startup-file "npm run start"

az webapp deployment source config \
  --name calendario-comunicaciones --resource-group calendario-rg \
  --repo-url https://github.com/rogger110517/calendario --branch main --manual-integration
```
