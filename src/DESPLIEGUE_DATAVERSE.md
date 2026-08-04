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
├── client.ts                      ← auth OAuth2 ROPC (usuario/contraseña) + fetch genérico (dvUpsert, principal)
├── campaign.options.ts            ← valores numéricos de los Picklist (confirmados en QA, ver sección 6)
├── campaign.mapper.ts             ← separa campos "de campaña" vs "de ocurrencia" + idExterno() (cre47_campanaid)
└── campaign-dataverse.service.ts  ← resuelve Dealer/Unidad/User, hace upsert de N filas

src/app/api/dataverse/sync-campaign/route.ts   ← único lugar donde corren las
                                                   credenciales (server-side)
```

Flujo (ver sección 7 para el detalle de idempotencia):

1. **Crear campaña** (`CampaignService.create()`): se crea localmente como
   siempre, y además se llama `syncCampaignToDataverse(campaign, 'create')`
   → `POST /api/dataverse/sync-campaign` →
   `CampaignDataverseService.syncOnCreate()` → upsert de **una fila por
   cada fecha** de `[diaEnvio, ...fechasRecurrencia]`, cada una con su
   `cre47_campanaid` único (`campaignId-fecha`).
2. **Aprobar / Rechazar** (`CampaignService.update()`, cuando cambia
   `estado`): llama al mismo endpoint con `mode: 'update'` →
   `syncOnUpdate()` → upsert solo de los **campos de campaña** (sección 3,
   primera tabla) en **todas** las filas de esa campaña, recalculando las
   mismas claves. No toca `cre47_estadodelenvio` / `cre47_fecharealdeenvio`
   / `cre47_mensajedeerror` — esos quedan reservados para que los
   actualice el flujo de Power Automate.

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

## 7. Idempotencia — IMPLEMENTADO con `cre47_campanaid` (Alternate Key)

En vez de la columna `cre47_idexterno` que se había planeado originalmente,
el usuario ya tenía/creó una columna de texto propia,
**`cre47_campanaid`**, y la registró como **clave alternativa** en Power
Apps. Se usó esa directamente (no hizo falta crear una columna nueva).

**Valor guardado:** `campaignId + '-' + fecha` (ej.
`cmp-1735000000000-2026-08-10`) — **no** solo `campaignId`, porque el
diseño genera varias filas por campaña (una por fecha de envío) y una
clave alternativa exige un valor único por fila. Calculado en
`idExterno()` (`campaign.mapper.ts`).

**Cómo quedó el código:**

- `client.ts` → `dvUpsert(entitySet, keyField, keyValue, body)`: hace
  `PATCH /{entitySet}(<keyField>='<keyValue>')` — sintaxis de upsert por
  alternate key de la Web API. Escapa comillas simples en el valor
  (`'` → `''`, regla de escape de OData).
- `campaign.mapper.ts` → `idExterno(campaign, fecha)` calcula la clave;
  `mapOcurrenciaFields()` la incluye como `cre47_campanaid`.
- `campaign-dataverse.service.ts`:
  - `syncOnCreate(campaign)` — upsert con el body **completo** (campos de
    campaña + de ocurrencia) por cada fecha.
  - `syncOnUpdate(campaign)` — upsert solo con los **campos de campaña**
    (no toca `cre47_estadodelenvio`/`cre47_fecharealdeenvio`/
    `cre47_mensajedeerror`, reservados para Power Automate). Si por algún
    motivo la fila no existía todavía, esto la crearía incompleta (sin
    campos de ocurrencia) — caso borde aceptado, poco probable en la
    práctica.
  - Ya **no rastrea GUIDs**: `Campaign.dataverseIds` se eliminó de
    `src/types/index.ts` — no hace falta, la clave siempre se puede
    recalcular a partir de `campaignId + fecha`.
- `api/dataverse/sync-campaign/route.ts` recibe `{ campaign, mode: 'create' | 'update' }`
  en vez de inferir el modo a partir de `dataverseIds`.

**Validado en QA (2026-08-03)**, contra la tabla real, no solo localmente:
1. Confirmado que `cre47_campanaid` es tipo `String` (no un Autonumber real
   de Dataverse pese al nombre "autoenumeración") — controlado 100% por el
   código.
2. Confirmado el índice de la clave alternativa en estado `Active`
   (`GET .../Keys`).
3. `PATCH` con una clave que no existía → creó la fila (`204`).
4. Mismo `PATCH` repetido con la misma clave, cambiando
   `cre47_estadodelacampana` → **no duplicó**, actualizó la fila existente
   (confirmado con `GET` filtrando por `cre47_campanaid`: 1 sola fila, con
   el valor nuevo).
5. Fila de prueba borrada al terminar (`DELETE` también funciona por
   alternate key).

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
