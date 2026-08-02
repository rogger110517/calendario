# Próximos pasos — terminar el despliegue en Azure App Service

Checklist de lo que falta hacer **de tu lado en Azure/GitHub** para dejar
`calendarioweb05` funcionando. El código y el workflow ya están listos y
verificados (`npm run build` corre limpio, sin errores) — lo que queda
pendiente es 100% configuración en Azure, no código.

## Diagnóstico hasta ahora

- El sitio (`https://calendarioweb05-bna8ethvgzetafhs.centralus-01.azurewebsites.net`)
  sigue mostrando la **plantilla por defecto de Azure**, no la app.
- Un run del workflow falló con:
  ```
  AADSTS700213: No matching federated identity record found for presented
  assertion subject 'repo:rogger110517@89188172/calendario@1317729510:ref:refs/heads/main'
  ```
  → la credencial federada (OIDC) para que GitHub Actions inicie sesión en Azure
  estaba desincronizada (probablemente porque el Web App se recreó en algún
  momento con un hostname nuevo).
- Ya hiciste **Desconectar / Reconectar** en Deployment Center, lo que generó
  credenciales nuevas (`AZUREAPPSERVICE_CLIENTID_A7E52BC6...`, etc.) — pero el
  sitio sigue sin mostrar contenido real, así que hay que confirmar si esa
  reconexión quedó bien o si hay un segundo problema encima (ej. Startup Command).

## Checklist — hazlo en este orden

### 1. Confirmar si el último run realmente pasó el login
- GitHub → repo `calendario` → pestaña **Actions**.
- Abre el run **más reciente** (commit `135fe1d`, "Add or update the Azure App
  Service build and deployment workflow config").
- ¿Está en verde (✅) o rojo (❌)?
  - Si es **rojo**, abre el job → paso **"Login to Azure"** → copia el error
    completo (como hiciste antes) — probablemente vuelve a fallar por lo mismo,
    y hay que revisar la credencial federada directamente en Entra ID
    (App registrations → la app de Deployment Center → Certificados y
    secretos → Credenciales federadas → verificar que el "Subject identifier"
    coincida exactamente con lo que pide el error).
  - Si es **verde**, sigue al paso 2.

### 2. Revisar el Comando de inicio
**Portal → Web App `calendarioweb05` → Configuración → Configuración general
→ Comando de inicio.**
- Si está vacío, escribe: `npm run start` → **Guardar** (reinicia la app sola).

### 3. Confirmar la Pila (runtime stack)
Misma pantalla del paso 2: **Pila = Node**, **Sistema operativo = Linux**,
versión 20 LTS o 22 LTS (coincide con lo que usa el workflow).

### 4. Ver el Log stream mientras recargas el sitio
**Portal → Web App → Supervisión → Log stream.** Ábrelo, y en otra pestaña
recarga `https://calendarioweb05-bna8ethvgzetafhs.centralus-01.azurewebsites.net`.
Si el proceso intenta arrancar y falla, el error real (módulo faltante, puerto,
etc.) va a aparecer ahí en vivo. Cópiame lo que salga si sigue sin funcionar.

### 5. Reiniciar el recurso
**Portal → Web App → Overview → botón "Reiniciar" (Restart).** A veces el
proceso queda colgado tras un deploy y un restart manual lo destraba.

### 6. Verificar
Abre de nuevo la URL y prueba login / calendario / crear una campaña.

## Si nada de esto funciona

Copia y pégame:
- El estado (verde/rojo) del último run de Actions.
- El log completo del paso que falle (Login to Azure o el de Deploy).
- Lo que aparezca en Log stream al recargar el sitio.

Con eso identifico el siguiente paso exacto — evitamos adivinar sin datos.
