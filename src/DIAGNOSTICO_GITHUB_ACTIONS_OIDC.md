# Diagnóstico — Workflow de GitHub Actions y autenticación OIDC a Azure

> Generado el 2026-08-02 para depurar el fallo `AADSTS700213: No matching
> federated identity record found` durante el deploy a Azure App Service.

## 1. Archivo y ubicación

```
.github/workflows/main_calendarioweb05.yml
```

Es el **único** archivo de workflow en el repo (no hay otros en `.github/workflows/`).

## 2. YAML completo

```yaml
# Docs for the Azure Web Apps Deploy action: https://github.com/Azure/webapps-deploy
# More GitHub Actions for Azure: https://github.com/Azure/actions

name: Build and deploy Node.js app to Azure Web App - calendarioweb05

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read #This is required for actions/checkout

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js version
        uses: actions/setup-node@v3
        with:
          node-version: '22.x'

      - name: npm install, build, and test
        run: |
          npm install
          npm run build --if-present
          npm run test --if-present

      - name: Upload artifact for deployment job
        uses: actions/upload-artifact@v4
        with:
          name: node-app
          path: .

  deploy:
    runs-on: ubuntu-latest
    needs: build
    permissions:
      id-token: write #This is required for requesting the JWT
      contents: read #This is required for actions/checkout

    steps:
      - name: Download artifact from build job
        uses: actions/download-artifact@v4
        with:
          name: node-app

      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZUREAPPSERVICE_CLIENTID_A7E52BC6172C4284BA7AB13F4B5D0FCD }}
          tenant-id: ${{ secrets.AZUREAPPSERVICE_TENANTID_91106C057D9248F5B0B432B7ABCAB59D }}
          subscription-id: ${{ secrets.AZUREAPPSERVICE_SUBSCRIPTIONID_A781F9D4831743648BABB325A4B39710 }}

      - name: 'Deploy to Azure Web App'
        id: deploy-to-webapp
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'calendarioweb05'
          slot-name: 'Production'
          package: .
```

## 3. Bloque `permissions`

Hay **dos** bloques `permissions`, uno por job:

| Job | Permissions | Para qué |
|---|---|---|
| `build` | `contents: read` | Solo necesita leer el repo (`actions/checkout`) |
| `deploy` | `id-token: write`, `contents: read` | `id-token: write` es **obligatorio** para que `azure/login@v2` pueda pedir el JWT de OIDC a GitHub |

Ambos están correctos para un flujo OIDC — no falta nada aquí.

## 4. Paso `azure/login@v2` y secrets utilizados

```yaml
- name: Login to Azure
  uses: azure/login@v2
  with:
    client-id:       ${{ secrets.AZUREAPPSERVICE_CLIENTID_A7E52BC6172C4284BA7AB13F4B5D0FCD }}
    tenant-id:        ${{ secrets.AZUREAPPSERVICE_TENANTID_91106C057D9248F5B0B432B7ABCAB59D }}
    subscription-id:  ${{ secrets.AZUREAPPSERVICE_SUBSCRIPTIONID_A781F9D4831743648BABB325A4B39710 }}
```

**Secrets referenciados por nombre (en GitHub → Settings → Secrets and variables → Actions):**

| Uso | Nombre exacto del secret |
|---|---|
| `client-id` | `AZUREAPPSERVICE_CLIENTID_A7E52BC6172C4284BA7AB13F4B5D0FCD` |
| `tenant-id` | `AZUREAPPSERVICE_TENANTID_91106C057D9248F5B0B432B7ABCAB59D` |
| `subscription-id` | `AZUREAPPSERVICE_SUBSCRIPTIONID_A781F9D4831743648BABB325A4B39710` |

> **Nota importante:** desde el repositorio (y desde acá) **no puedo leer el valor
> real de ningún secret** — GitHub los oculta incluso para quien tiene acceso al
> código; solo se ve el *nombre* con el que el workflow los referencia. Según lo
> que confirmaste en el chat, actualizaste el **valor** de estos 3 secrets para
> que contengan el Client ID / Tenant ID / Subscription ID de la App Registration
> `github-calendario` — pero esa asociación vive únicamente en GitHub (Settings →
> Secrets) y en Entra ID, no en este archivo ni en el repo.

## 5. `environment:` usado por el workflow

**No hay ninguna clave `environment:`** en ningún job de este workflow (ni en
`build` ni en `deploy`). Esto es relevante porque el "Entity type" de la
credencial federada en Entra ID debe ser **Branch** (no "Environment"), ya
que el *subject* que GitHub genera para este workflow tiene el formato:

```
repo:<owner>/<repo>:ref:refs/heads/main
```

y no el formato que usaría un `environment:` (`repo:<owner>/<repo>:environment:<nombre>`).
Esto coincide con el *subject* real que apareció en el error `AADSTS700213`
(`...:ref:refs/heads/main`), así que la credencial federada creada debe ser
de tipo **Branch → `main`**, no de tipo Environment.

## 6. ¿Deployment Center autogenerado o configuración manual?

**Autogenerado por Azure.** Evidencia:
- El comentario de cabecera (`# Docs for the Azure Web Apps Deploy action...`)
  es el que Azure inserta automáticamente en todos los workflows que crea desde
  **Deployment Center → GitHub Actions**.
- El nombre del archivo sigue el patrón `main_<nombre-del-webapp>.yml`, que es
  el que usa el generador automático de Azure (no un patrón que se use al
  escribir el YAML a mano).
- Los nombres de secret con sufijo hexadecimal largo (`..._A7E52BC6172C4284BA7AB13F4B5D0FCD`)
  también son característicos del generador automático (evita colisiones si
  hay más de un Web App conectado al mismo repo).

Tú interviniste manualmente **después**, no en el workflow, sino directamente
en Entra ID (creando la App Registration `github-calendario` + credencial
federada) y en GitHub (actualizando el *valor* de estos 3 secrets) — el
archivo YAML en sí nunca se editó a mano.

## 7. ¿Referencia a una App Registration antigua?

**No, el YAML no nombra ninguna App Registration** (ni la vieja ni la nueva)
— solo referencia los *nombres* de los secrets, nunca un Client ID ni un
nombre de App Registration en texto plano. La app que realmente se usa en
cada ejecución depende exclusivamente del **valor actual** de esos 3 secrets
en GitHub, que tú administras desde el Portal de Secrets — no queda rastro
de "cuál" App Registration se usó en corridas anteriores dentro del código,
solo en el historial de Actions (los logs de cada run, que sí muestran el
`client-id` real usado en el paso "Login to Azure" cuando falla).

## 8. Resumen — qué identidad de Azure intenta usar el deploy hoy

1. GitHub genera un JWT de OIDC con subject `repo:rogger110517/calendario:ref:refs/heads/main`
   (con los IDs numéricos de owner/repo que GitHub agrega automáticamente).
2. `azure/login@v2` presenta ese JWT a Entra ID, identificándose con el
   `client-id` guardado en el secret `AZUREAPPSERVICE_CLIENTID_A7E52BC6172C4284BA7AB13F4B5D0FCD`.
3. Ese Client ID **debería** corresponder hoy a la App Registration `github-calendario`
   que creaste manualmente, con su credencial federada tipo Branch/`main`
   apuntando al Repository ID `1317729510`.
4. Confirmaste en el chat que el paso "Login to Azure" del último run
   (commit `b51259b`) **pasó en verde** — es decir, esta identidad ya
   autentica correctamente contra Azure.
5. El bloqueo actual **ya no es de identidad/login** — es que el sitio
   sigue mostrando la plantilla por defecto de Azure después de un deploy
   exitoso, lo cual apunta a un problema de arranque de la app (Comando de
   inicio / Log stream), no de OIDC. Ver `src/PROXIMOS_PASOS_DESPLIEGUE.md`
   para el seguimiento de ese problema.
