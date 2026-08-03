# Despliegue Dataverse — QA

> Generado el 2026-08-02, actualizado el mismo día tras agregar columnas
> nuevas (`cre47_cantidaddealers`, `cre47_unidaddenegocio`,
> `cre47_horadeenvio`, `cre47_fechasrecurrencia`), decidir el diseño
> "una fila por fecha de envío" y cambiar la autenticación a ROPC
> (usuario/contraseña) con las credenciales reales de QA. Documenta cómo
> quedó la tabla y el registro automático desde el código.
>
> ⚠️ **Credenciales hardcodeadas a propósito.** `src/lib/dataverse/client.ts`
> tiene el usuario/contraseña/appId de QA como fallback literal en el
> código — a pedido explícito, para poder probar de inmediato sin esperar
> a mover esto a Application Settings. Quedan commiteadas en el repo. Rotar
> la contraseña de `mafcrm@mafperu.com.pe` cuando termine la prueba y mover
> esto a variables de entorno reales (ver sección 5).

## 1. Tabla en QA

| | |
|---|---|
| Entorno | `mafperutst.crm.dynamics.com` |
| Nombre para mostrar | Comunicación de Campaña |
| Nombre lógico (tabla) | `cre47_comunicaciondecampana` |
| Entity set (plural, usado en la Web API) | `cre47_comunicaciondecampanas` *(sin confirmar — ver pendientes)* |
| Prefijo del publisher | `cre47_` |
| Primary column | `cre47_nombredelacomunicacion` |
| PK (GUID) | `cre47_comunicaciondecampanaid` |

## 2. Diseño: una fila de Dataverse por fecha de envío

`Campaign` puede ser recurrente (`recurrencia: true`, con `tipoRecurrencia`
Diario/Semanal/Trimestral), y ya trae calculado `fechasRecurrencia: string[]`
— todas las fechas intermedias entre `diaEnvio` y `diaFin`. En vez de guardar
ese array serializado en una sola fila, **se crea una fila en Dataverse por
cada fecha de envío** (`diaEnvio` + cada elemento de `fechasRecurrencia`),
todas comparten los datos de campaña pero cada una tiene su propia fecha
programada — así Power Automate puede disparar un flujo por cada envío real
sin tener que parsear nada.

```
Campaign (1)  →  N filas en cre47_comunicaciondecampana (una por fecha)
```

`Campaign.dataverseIds: string[]` (en `src/types/index.ts`) guarda los GUIDs
de todas las filas creadas para esa campaña, para poder actualizarlas
después (al aprobar/rechazar) sin crear filas duplicadas.

## 3. Mapeo de columnas

### Campos "de campaña" — iguales en todas las filas de una misma Campaign

| Columna Dataverse | Tipo | Campo `Campaign` |
|---|---|---|
| `cre47_nombredelacampana` | Texto | `nombreCampana` |
| `cre47_asuntodelcorreo` | Texto | `subject` |
| `cre47_aquienvadirigido` | Memo | `dirigidoA` |
| `cre47_filtrosaaplicarsobrelabasedeclientes` | Memo | `filtrosAplicar` |
| `cre47_unidaddenegocio` | Texto | `Unidad.nombre` (resuelto vía `unidad` id) |
| `cre47_nombredelconcesionario` | Texto | `Dealer.nombre` (resuelto vía `dealer` id) |
| `cre47_codigodelconcesionario` | Texto | `Dealer.codigo` |
| `cre47_cantidaddealers` | Entero | `cantidadDealers` |
| `cre47_fechadeiniciodelacampana` | Fecha/hora | `diaEnvio` |
| `cre47_fechadefindelacampana` | Fecha/hora | `diaFin` |
| `cre47_horadeenvio` | Fecha/hora | `diaEnvio` + `horaEnvio` combinados |
| `cre47_silacampanaesrecurrente` | Sí/No | `recurrencia` |
| `cre47_tipoderecurrencia` | Picklist | `tipoRecurrencia` |
| `cre47_cantidadtotaldecomunicaciones` | Entero | calculado: cantidad de fechas de envío (`1 + fechasRecurrencia.length`) |
| `cre47_urldelarchivoadjunto` | Texto | `linkOneDrive` |
| `cre47_comentarios` | Memo | `comentarios` |
| `cre47_correodelsolicitante` | Texto | `User.correo` (resuelto vía `solicitante` id) |
| `cre47_fechaderegistrodelacampana` | Fecha/hora | `fechaRegistro` |
| `cre47_estadodelacampana` | Picklist | `estado` — **Pendiente/Aprobada/Rechazada/Ejecutada/Cancelada** |

### Campos "de ocurrencia" — distintos en cada fila (una por fecha)

| Columna Dataverse | Tipo | Valor |
|---|---|---|
| `cre47_nombredelacomunicacion` (primary) | Texto | `"<nombreCampana> (<fecha>)"` |
| `cre47_fechasrecurrencia` | Fecha/hora | La fecha de envío de esta fila |
| `cre47_fechayhoraprogramadaparaesteenvio` | Fecha/hora | Esa fecha + `horaEnvio` — **este es el campo que debe observar el flujo de Power Automate para disparar el envío** |
| `cre47_canaldeenvio` | Picklist | `Email` fijo (único canal implementado hoy vía SendGrid — `Campaign` no tiene selector de canal todavía) |
| `cre47_estadodelenvio` | Picklist | `Pendiente` al crear — **Power Automate debe actualizar este campo** (Programado/Enviado/Error/Cancelado) al procesar el envío, no lo vuelve a tocar la app |
| `cre47_fecharealdeenvio` | Fecha/hora | No se setea al crear — lo llena Power Automate al enviar |
| `cre47_mensajedeerror` | Memo | No se setea al crear — lo llena Power Automate si falla |
| `cre47_nombredelarchivoadjunto` | Texto | No usado — `Campaign` ya no maneja archivo adjunto (usa `linkOneDrive`) |

## 4. Cómo quedó implementado

```
src/lib/dataverse/
├── client.ts                      ← auth OAuth2 ROPC (usuario/contraseña) + fetch genérico (dvCreate/dvUpdate)
├── campaign.options.ts            ← valores numéricos de los Picklist (PLACEHOLDER, ver pendientes)
├── campaign.mapper.ts             ← separa campos "de campaña" vs "de ocurrencia"
└── campaign-dataverse.service.ts  ← resuelve Dealer/Unidad/User, crea N filas o actualiza N filas

src/app/api/dataverse/sync-campaign/route.ts   ← único lugar donde corren las
                                                   credenciales (server-side)
```

Flujo:

1. **Crear campaña** (`CampaignService.create()`): se crea localmente como
   siempre, y además se llama `syncCampaignToDataverse(campaign)` →
   `POST /api/dataverse/sync-campaign` → `CampaignDataverseService.syncOnCreate()`
   → crea **una fila por cada fecha** de `[diaEnvio, ...fechasRecurrencia]`
   → devuelve los GUIDs, que se guardan en `campaign.dataverseIds` vía
   `CampaignRepository.update()`.
2. **Aprobar / Rechazar** (`CampaignService.update()`, cuando cambia
   `estado`): llama al mismo endpoint, que esta vez detecta
   `campaign.dataverseIds` ya presente → `syncOnUpdate()` → hace `PATCH`
   solo de los **campos de campaña** (sección 3, primera tabla) en **todas**
   las filas de esa campaña. No toca `cre47_estadodelenvio` /
   `cre47_fecharealdeenvio` / `cre47_mensajedeerror` — esos quedan
   reservados para que los actualice el flujo de Power Automate.

**Diseño "best-effort":** todo el sync está en `try/catch`, nunca lanza — si
Dataverse no responde o rechaza el login, la campaña se crea/actualiza igual
en la app; el error queda solo en la consola del servidor
(`[Dataverse] ...`).

## 5. Credenciales de QA — auth ROPC (usuario/contraseña)

| Variable | Valor | Dónde vive hoy |
|---|---|---|
| `DATAVERSE_URL` | `https://mafperutst.crm.dynamics.com` | hardcodeado en `client.ts` (fallback) |
| `DATAVERSE_APP_ID` | `51f81489-12ee-4a9e-aaae-a2591f45987d` | hardcodeado en `client.ts` (fallback) |
| `DATAVERSE_USERNAME` | `mafcrm@mafperu.com.pe` | hardcodeado en `client.ts` (fallback) |
| `DATAVERSE_PASSWORD` | *(la que compartiste en el chat)* | hardcodeado en `client.ts` (fallback) |
| `DATAVERSE_TENANT` | `common` (se resuelve automático por el username) | default en código |

`requireEnv()` en `client.ts` lee primero las variables de entorno
(`DATAVERSE_*`) y si no están, usa estos valores fijos como fallback — así
que definir las env vars en `.env.local` o en Application Settings de Azure
las sobreescribe sin tocar código.

## 6. Pendiente

- [ ] **Rotar la contraseña de `mafcrm@mafperu.com.pe`** una vez terminadas
      las pruebas de QA — quedó commiteada en el repo a pedido explícito
      para poder probar ya, así que hay que asumir que está expuesta.
- [ ] **Mover las credenciales a Application Settings de Azure** (Portal →
      App Service → Configuration → Application settings) y quitar el
      fallback hardcodeado de `client.ts` cuando se pase de "prueba rápida"
      a algo más permanente.
- [x] **Entity set confirmado** — `cre47_comunicaciondecampanas` es correcto.
      Probado el 2026-08-02 con un `POST` real (`204 No Content`, fila creada
      y luego borrada) directo contra Dataverse QA.
- [x] **Valores reales de los Picklist confirmados** — se consultó
      `Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet`
      para las 4 columnas Choice y `campaign.options.ts` ya tiene los
      valores reales (base `333900000`, no `100000000` como se asumió al
      principio). El primer intento real falló con
      `A validation error occurred. The value 100000001 of
      'cre47_tipoderecurrencia' ... outside the valid range` — quedó
      corregido.
- [ ] **Canal de envío fijo en "Email"** — `Campaign` no tiene un campo de
      canal propio; si más adelante se agrega selector de canal al
      formulario, hay que pasarlo a `mapOcurrenciaFields()` en vez del
      valor fijo actual.
- [ ] **ROPC puede fallar si la cuenta tiene MFA habilitado** — Entra ID
      bloquea `grant_type=password` para cuentas con multi-factor. Si el
      login falla con algo tipo `AADSTS50076`/`AADSTS50079`, es por eso —
      la alternativa sería client_credentials con Application User (lo que
      se implementó originalmente antes de este cambio).

## 7. Pendiente (diseño) — Idempotencia con Alternate Key

**El problema hoy:** cada fila creada en Dataverse recibe un GUID nuevo, que
se guarda de vuelta en `campaign.dataverseIds` (en memoria, vía
`CampaignRepository.update`). Si ese guardado no llega a pasar — el proceso
se reinicia, el store en memoria se pierde (pasa en cada redeploy, porque
hoy `CampaignRepository` es JSON en memoria, no una base real) — la próxima
sincronización no tiene forma de saber que esa fila ya existe, y
`syncOnCreate()` la vuelve a crear: **fila duplicada**. El ID que "viaja"
hoy es el que genera Dataverse, no uno propio y determinístico.

**La solución: Alternate Key + upsert.** En vez de depender de recordar el
GUID que devuelve Dataverse, se agrega una clave alternativa con un ID
propio y reproducible (`campaignId + fecha`), y cada sync hace `PATCH`
contra esa clave. Dataverse resuelve el upsert solo: crea si no existe,
actualiza si existe — sin duplicar, sin importar si se perdió el estado
local.

### Qué crear en Power Apps (antes de tocar código)

1. **Tablas → `cre47_comunicaciondecampana` → Columnas → Nueva columna**
   - Nombre para mostrar: `Id externo`
   - Nombre lógico resultante: `cre47_idexterno`
   - Tipo de dato: **Texto** (100 caracteres), no requerido.
2. **Tablas → `cre47_comunicaciondecampana` → Claves (Keys) → Nueva clave
   alternativa**
   - Seleccionar la columna `cre47_idexterno` → Guardar.
   - Dataverse construye el índice en segundo plano — puede tardar unos
     minutos antes de que la clave quede activa (columna "Estado" pasa de
     "Activo (compilando índice)" a "Activo").

### Cómo quedaría el código (una vez creada la clave, no implementado aún)

- `mapOcurrenciaFields()` (`campaign.mapper.ts`) agrega
  `cre47_idexterno: `${campaign.id}-${fecha}`` a cada fila.
- `client.ts` suma una función `dvUpsert(entitySet, keyField, keyValue, body)`
  que hace `PATCH /{entitySet}(<keyField>='<keyValue>')` — la sintaxis de
  upsert por alternate key de la Dataverse Web API.
- `campaign-dataverse.service.ts` deja de distinguir "crear" vs "actualizar"
  por `dataverseIds` — cada llamada a `syncCampaign(campaign)` simplemente
  hace upsert de todas las filas de esa campaña por su `cre47_idexterno`
  calculado. Esto simplifica el flujo: **ya no hace falta rastrear
  `dataverseIds` en memoria en absoluto** — se puede quitar ese campo de
  `Campaign` (`src/types/index.ts`) y de `CampaignRepository`.
- Se llama igual en los mismos 2 puntos que hoy (crear, y cambio de
  `estado` en aprobar/rechazar) — **no se necesita ningún campo nuevo para
  aprobar/rechazar en sí**, `cre47_estadodelacampana` ya cubre eso. El único
  campo nuevo es `cre47_idexterno`, y es exclusivamente para resolver la
  idempotencia del sync, no para el flujo de negocio.

Avísame cuando crees la columna + la clave alternativa en Power Apps y
confirmes que el índice ya quedó "Activo" — ahí implemento los cambios de
código de esta sección.

## 8. Cómo probar en QA ahora mismo

1. `npm run dev` (ya no hace falta configurar nada más — las credenciales
   están hardcodeadas como fallback).
2. Crear una campaña de prueba **recurrente** (para validar que se crean
   varias filas, no solo una).
3. Revisar la consola del servidor: si algo falla aparece como
   `[Dataverse] No se pudo registrar la campaña <error>` — el error trae el
   detalle (401 = credenciales/MFA, 404 = entity set mal, 400 = algún
   Picklist con valor inválido).
4. En Power Apps → Tablas → Comunicación de Campaña → Datos, confirmar que
   aparecieron tantas filas como fechas de envío, todas con los mismos
   datos de campaña pero `cre47_fechasrecurrencia` distinta.
5. Cambiar el estado de esa campaña a Aprobada/Rechazada en la app y
   confirmar que `cre47_estadodelacampana` se actualiza en **todas** las
   filas de esa campaña (no crea filas nuevas, no toca
   `cre47_estadodelenvio`).
