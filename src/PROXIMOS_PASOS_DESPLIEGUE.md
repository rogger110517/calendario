# Próximos pasos — terminar el despliegue en Azure App Service

Checklist de lo que falta hacer **de tu lado en Azure/GitHub** para dejar
`calendarioweb05` funcionando. El código y el workflow ya están listos y
verificados (`npm run build` corre limpio, sin errores) — lo que queda
pendiente es 100% configuración en Azure/GitHub, no código.

## Acción actual: cambiar de OIDC a Publish Profile

El login automático (OIDC) sigue fallando con el mismo error incluso después
de Desconectar/Reconectar en Deployment Center (ver "Diagnóstico" abajo).
Vamos a evitarlo por completo usando el método clásico de **Publish Profile**.

### Lo que tienes que hacer tú (en este orden)

1. **Portal de Azure → Web App `calendarioweb05` → Overview** → botón
   **"Obtener perfil de publicación"** ("Get publish profile"). Se descarga
   un archivo `.PublishSettings`.
2. Ábrelo con el Bloc de notas (es texto/XML) y copia **todo** el contenido.
3. **GitHub → repo `calendario` → Settings → Secrets and variables → Actions
   → "New repository secret"**:
   - **Name:** `AZURE_WEBAPP_PUBLISH_PROFILE`
   - **Value:** pega el XML completo que copiaste
   - **Add secret**
4. Avísame en el chat cuando el secret ya esté creado (no hace falta que me
   pegues el contenido — es sensible, solo confírmame que lo agregaste).

### Lo que hago yo después

En cuanto confirmes el paso 4, edito
`.github/workflows/main_calendarioweb05.yml` para:
- Quitar el paso `Login to Azure` (`azure/login@v2`) y el permiso `id-token: write`
  (ya no hacen falta, eran solo para OIDC).
- Agregar `publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}` al
  paso `azure/webapps-deploy`.

Con eso hago commit + push, se dispara el deploy solo, y probamos la URL de
nuevo.

## Después de que el login funcione — checklist adicional

Si el deploy pasa pero el sitio sigue sin mostrar la app (plantilla por
defecto de Azure en vez del login/calendario), revisa esto en el Portal:

1. **Comando de inicio** — Web App → Configuración → Configuración general →
   Comando de inicio. Si está vacío, escribe `npm run start` → Guardar.
2. **Pila (runtime stack)** — misma pantalla: `Node`, `Linux`, 20 o 22 LTS.
3. **Log stream** — Web App → Supervisión → Log stream. Ábrelo y recarga el
   sitio en otra pestaña; si el proceso falla al arrancar, el error real
   (módulo faltante, puerto, etc.) aparece ahí en vivo.
4. **Reiniciar** — Web App → Overview → botón "Reiniciar", por si el proceso
   quedó colgado de un deploy anterior.

## Diagnóstico (por qué se llegó a esta decisión)

- El sitio (`https://calendarioweb05-bna8ethvgzetafhs.centralus-01.azurewebsites.net`)
  mostraba la plantilla por defecto de Azure, no la app.
- El workflow fallaba en el paso `Login to Azure` con:
  ```
  AADSTS700213: No matching federated identity record found for presented
  assertion subject 'repo:rogger110517@89188172/calendario@1317729510:ref:refs/heads/main'
  ```
- Se probó **Desconectar/Reconectar** en Deployment Center — generó
  credenciales nuevas (`AZUREAPPSERVICE_CLIENTID_A7E52BC6...`), pero el
  siguiente run falló **con el mismo subject exacto**, señal de que el
  asistente automático de Azure no está generando bien la credencial
  federada para este repositorio (posiblemente por un historial de
  rename/recreación que hace que GitHub incluya IDs numéricos en el subject:
  `owner@id/repo@id`). Por eso se decidió saltarse OIDC y usar Publish
  Profile en su lugar.
- Avisos de "Node.js 20 deprecated" en los logs son informativos, no la causa
  del fallo — se pueden ignorar.
