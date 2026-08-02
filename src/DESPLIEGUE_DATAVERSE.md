# Despliegue Dataverse — QA

> Generado el 2026-08-02, actualizado el mismo día tras agregar columnas
> nuevas (`cre47_cantidaddealers`, `cre47_unidaddenegocio`,
> `cre47_horadeenvio`, `cre47_fechasrecurrencia`) y decidir el diseño
> "una fila por fecha de envío". Documenta cómo quedó la tabla en QA y
> cómo quedó implementado el registro automático desde el código.

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
├── client.ts                      ← auth OAuth2 client_credentials + fetch genérico (dvCreate/dvUpdate)
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
`DATAVERSE_CLIENT_SECRET` está vacío (como ahora, a propósito, ver sección
5) o Dataverse no responde, la campaña se crea/actualiza igual en la app; el
error queda solo en la consola del servidor (`[Dataverse] ...`).

## 5. Pendiente

- [ ] **Credenciales reales** — quedan **estáticas/en blanco por ahora**,
      tal como pediste. Cuando las tengas, pásame:
      - `DATAVERSE_TENANT_ID` (tenant de Entra ID)
      - `DATAVERSE_CLIENT_ID` (App Registration)
      - `DATAVERSE_CLIENT_SECRET` (secret de esa App Registration)
      - Confirmación de que esa App tiene un **Application User** creado en
        el entorno QA de Dataverse, con rol de seguridad que permita
        crear/editar filas de `cre47_comunicaciondecampana`.
      Van en `.env.local` (gitignored, no se commitea) y luego como
      Application Settings de Azure App Service para producción.
- [ ] **Confirmar el entity set exacto** — asumí `cre47_comunicaciondecampanas`
      (la `s` que agrega Dataverse por default). Si en QA quedó distinto,
      ajusto `ENTITY_SET` en `campaign-dataverse.service.ts`.
- [ ] **Valores reales de los Picklist** — `campaign.options.ts` tiene
      placeholders (`100000000`, `100000001`, ...). Abrir cada columna
      Choice en Power Apps → "Editar opciones" → copiar el Valor numérico
      real de cada opción y actualizarlos ahí.
- [ ] **Canal de envío fijo en "Email"** — `Campaign` no tiene un campo de
      canal propio; si más adelante se agrega selector de canal al
      formulario, hay que pasarlo a `mapOcurrenciaFields()` en vez del
      valor fijo actual.

## 6. Cómo probar en QA una vez tengas las credenciales

1. Completar `DATAVERSE_TENANT_ID`, `DATAVERSE_CLIENT_ID`,
   `DATAVERSE_CLIENT_SECRET` en `.env.local`.
2. Reiniciar `npm run dev` (las variables de entorno solo se leen al
   arrancar).
3. Crear una campaña de prueba **recurrente** (para validar que se crean
   varias filas, no solo una).
4. Revisar la consola del servidor: si algo falla aparece como
   `[Dataverse] No se pudo registrar la campaña <error>`.
5. En Power Apps → Tablas → Comunicación de Campaña → Datos, confirmar que
   aparecieron tantas filas como fechas de envío, todas con los mismos
   datos de campaña pero `cre47_fechasrecurrencia` distinta.
6. Cambiar el estado de esa campaña a Aprobada/Rechazada en la app y
   confirmar que `cre47_estadodelacampana` se actualiza en **todas** las
   filas de esa campaña (no crea filas nuevas, no toca
   `cre47_estadodelenvio`).
