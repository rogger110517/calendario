# Diagnóstico — Tabla única de Dataverse para MVP + Power Automate

> Generado el 2026-08-02. Objetivo: en vez de migrar las 4 entidades del
> modelo actual (`Campaign`, `Communication`, `Dealer`, `User` — ver
> `MODELO_DATOS.md`) a 4 tablas Dataverse separadas con relaciones, para el
> MVP se consolida todo en **una sola tabla plana**. Motivo: Power Automate
> trabaja mucho más simple sobre una tabla sin necesitar `$expand`/lookups
> para armar el correo — el trigger "cuando se agrega o modifica una fila"
> ya trae todos los datos que necesita el flujo en la misma fila.

## 1. Por qué una tabla única y no 4

El modelo actual (`MODELO_DATOS.md`) separa `Campaign` (1) → `Communication`
(N), con `Dealer` y `User` como catálogos aparte. Es el diseño correcto a
largo plazo, pero para el MVP con Power Automate añade complejidad que no
aporta todavía:

- Power Automate tendría que hacer `$expand` o una acción "Listar filas"
  adicional cada vez que dispara sobre `Communication` para traer el
  `subject`, `dirigidoA`, etc. de la `Campaign` padre.
- Dealer/User como lookups nativos requieren que esas tablas ya existan y
  estén pobladas antes de poder crear la tabla principal.

Para el MVP, cada **fila = una comunicación concreta a enviar**, con el
contexto de campaña **duplicado/aplanado** en la misma fila. Cuando se migre
a la arquitectura completa de 4 tablas más adelante, esta tabla puede
quedar como vista/tabla de "cola de envíos" alimentada desde las tablas
normalizadas — no se pierde el trabajo.

## 2. El prompt para crear la tabla con Copilot en Power Apps

Power Apps tiene una opción **"Describir los datos que se van a rastrear"**
(Copilot) al crear una tabla nueva en `make.powerapps.com` → Tablas → Nueva
tabla → "Crear con Copilot". Pega este texto ahí:

```
Quiero una tabla llamada "Comunicación de Campaña" para gestionar el envío
de comunicaciones de marketing a clientes de concesionarios de autos.

Cada fila representa un envío de comunicación individual, con estos datos:

- Nombre de la campaña (texto)
- Nombre de la comunicación (texto)
- Asunto del correo (texto)
- Canal de envío: Email, SMS, Push o WhatsApp (opción)
- A quién va dirigido, en texto libre (texto largo)
- Filtros a aplicar sobre la base de clientes (texto largo)
- Nombre del concesionario/dealer (texto)
- Código del concesionario/dealer (texto)
- Fecha de inicio de la campaña (fecha)
- Fecha de fin de la campaña (fecha)
- Fecha y hora programada para este envío específico (fecha y hora)
- Si la campaña es recurrente (sí/no)
- Tipo de recurrencia: Diario, Semanal, Mensual, Trimestral o Anual (opción)
- Cantidad total de comunicaciones de la campaña (número entero)
- Nombre del archivo adjunto con la base de clientes (texto)
- URL del archivo adjunto en OneDrive/SharePoint (texto)
- Comentarios (texto largo)
- Correo del solicitante que crea la campaña (texto)
- Fecha de registro de la campaña (fecha y hora)
- Estado de la campaña: Pendiente, Aprobada, Rechazada, Ejecutada o
  Cancelada (opción)
- Estado del envío de esta comunicación: Pendiente, Programado, Enviado,
  Error o Cancelado (opción)
- Fecha real de envío (fecha y hora)
- Mensaje de error si el envío falla (texto largo)
```

**Importante:** Copilot interpreta el texto y genera columnas de forma
razonable pero **no siempre exacta** (puede cambiar nombres, tipos de dato
o agrupar cosas distinto). Úsalo como acelerador para no crear 21 columnas
una por una a mano, pero después **valida y corrige cada columna contra la
tabla de la sección 3**, que es la especificación real que necesita el
código (los nombres de columna deben poder mapearse 1:1 a los campos de
`Campaign`/`Communication` en `MODELO_DATOS.md`).

## 3. Especificación exacta de columnas (fuente de verdad)

Nombre de tabla sugerido: **`cr_comunicacion`** (Nombre para mostrar:
"Comunicación de Campaña"). Prefijo `cr_` para mantener consistencia con lo
ya documentado en `INTEGRACION_DATAVERSE.md`.

| # | Columna Dataverse | Nombre para mostrar | Tipo Dataverse | Requerido | Origen (campo TS) |
|---|---|---|---|---|---|
| 1 | `cr_nombrecampana` | Nombre de campaña | Texto (100) | Sí | `Campaign.nombreCampana` |
| 2 | `cr_nombrecomunicacion` | Nombre de comunicación | Texto (100) | Sí | `Communication.nombreComunicacion` |
| 3 | `cr_subject` | Asunto | Texto (200) | Sí | `Campaign.subject` |
| 4 | `cr_canal` | Canal | Opción: Email / SMS / Push / WhatsApp | Sí | `Communication.canal` |
| 5 | `cr_dirigidoa` | Dirigido a | Texto largo | Sí | `Campaign.dirigidoA` |
| 6 | `cr_filtrosaplicar` | Filtros a aplicar | Texto largo | No | `Campaign.filtrosAplicar` |
| 7 | `cr_dealernombre` | Dealer | Texto (100) | No | `Campaign.especificarDealer` |
| 8 | `cr_dealercodigo` | Código dealer | Texto (20) | No | `Dealer.codigo` |
| 9 | `cr_diaenvio` | Inicio campaña | Solo fecha | Sí | `Campaign.diaEnvio` |
| 10 | `cr_diafin` | Fin campaña | Solo fecha | Sí | `Campaign.diaFin` |
| 11 | `cr_fechaprogramada` | Fecha programada (envío) | Fecha y hora | Sí | `Communication.fechaProgramada` |
| 12 | `cr_recurrencia` | Es recurrente | Sí/No | Sí | `Campaign.recurrencia` |
| 13 | `cr_tiporecurrencia` | Tipo de recurrencia | Opción: Diario/Semanal/Mensual/Trimestral/Anual | No | `Campaign.tipoRecurrencia` |
| 14 | `cr_cantidadcomunicaciones` | Cantidad de comunicaciones | Número entero | No | `Campaign.cantidadComunicaciones` |
| 15 | `cr_archivonombre` | Nombre de archivo | Texto (200) | No | `Campaign.archivoObjetivo.nombre` |
| 16 | `cr_archivourl` | URL de archivo | Texto (500) | No | `Campaign.archivoObjetivo.archivoUrl` |
| 17 | `cr_comentarios` | Comentarios | Texto largo | No | `Campaign.comentarios` |
| 18 | `cr_solicitante` | Solicitante (correo) | Texto (100) | Sí | `Campaign.solicitante` (User.correo) |
| 19 | `cr_fecharegistro` | Fecha de registro | Fecha y hora (default: ahora) | Sí | `Campaign.fechaRegistro` |
| 20 | `cr_estadocampana` | Estado de campaña | Opción: Pendiente/Aprobada/Rechazada/Ejecutada/Cancelada | Sí | `Campaign.estado` |
| 21 | `cr_estadoenvio` | Estado de envío | Opción: Pendiente/Programado/Enviado/Error/Cancelado | Sí | `Communication.estadoEnvio` |
| 22 | `cr_fechaenvio` | Fecha de envío real | Fecha y hora | No | `Communication.fechaEnvio` |
| 23 | `cr_errormensaje` | Mensaje de error | Texto largo | No | `Communication.errorMensaje` |

`cr_comunicacionid` (GUID, PK) y `Nombre de fila principal` (columna
`cr_nombrecomunicacion` marcada como *Primary column*) los crea Dataverse
automáticamente, no hace falta agregarlos a mano.

## 4. Pasos manuales en Power Apps (Portal, click a click)

1. Ir a **make.powerapps.com** → seleccionar el **Entorno** correcto (el
   mismo tenant/entorno donde vive el resto de Dataverse de la empresa).
2. Menú izquierdo → **Tablas** → **Nueva tabla** → **Crear con Copilot**
   (o "Table from description").
3. Pegar el prompt de la sección 2 → esperar a que Copilot proponga las
   columnas → **Crear**.
4. Una vez creada, entrar a la tabla → pestaña **Columnas** → revisar cada
   columna generada contra la tabla de la sección 3:
   - Renombrar el **nombre lógico** (schema name) donde no coincida con
     `cr_xxx` de la tabla (Dataverse antepone el prefijo del *publisher*
     automáticamente, confirma que sea `cr_`).
   - Corregir el **tipo de dato** si Copilot eligió uno distinto (por
     ejemplo, si puso "Texto" en vez de "Fecha y hora" en `cr_fechaprogramada`).
   - Agregar las columnas de tipo **Opción (Choice)** con los valores
     exactos listados (Email/SMS/Push/WhatsApp, etc.) si Copilot las generó
     como texto libre en vez de opción.
5. Pestaña **Primary column** de la tabla → confirmar que sea
   `cr_nombrecomunicacion`.
6. **Guardar tabla**. Dataverse la publica automáticamente en el entorno.
7. (Opcional, para pruebas) **Datos** → **Agregar fila** → cargar 1-2 filas
   de ejemplo a mano para probar el flujo de Power Automate antes de
   conectar la app real.

## 5. Cómo se usa desde Power Automate (ejemplo del flujo)

1. **Automatización** → **Flujos de nube** → **Nuevo flujo automatizado**.
2. Disparador: **Microsoft Dataverse — "Cuando se agrega, se modifica o se
   elimina una fila"**.
   - Tabla: `Comunicación de Campaña` (`cr_comunicacion`)
   - Ámbito: Organización
   - Filtrar filas: `cr_estadoenvio eq 'Pendiente'`
3. Acción **Condición**: `cr_fechaprogramada` ≤ `utcNow()`.
4. Rama **Sí** → acción **Outlook — Enviar un correo (V2)** usando
   `cr_dirigidoa` / `cr_subject` como parámetros (para MVP, `cr_dirigidoa`
   puede ser directamente la lista de correos separados por `;`).
5. Después del envío → acción **Dataverse — Actualizar una fila**:
   - `cr_estadoenvio` = `Enviado`
   - `cr_fechaenvio` = `utcNow()`
6. En la rama de error del conector de correo → **Actualizar una fila**:
   - `cr_estadoenvio` = `Error`
   - `cr_errormensaje` = mensaje de error del conector.

## 6. Qué falta / próximos pasos

- [ ] Crear la tabla en Dataverse siguiendo la sección 4.
- [ ] Confirmar el **nombre del entorno/organización** y la **URL de
      Dataverse** (`https://orgXXXXXXXX.crm.dynamics.com`) — necesaria para
      `DATAVERSE_URL` en `INTEGRACION_DATAVERSE.md`.
- [ ] Una vez creada la tabla, avisar en el chat el nombre lógico final
      (`cr_comunicacion` o el que haya quedado) para actualizar
      `INTEGRACION_DATAVERSE.md` y el `CampaignRepository`/`CommunicationRepository`
      del código con los nombres reales de columna.
- [ ] Crear el flujo de Power Automate de la sección 5 (o pedírmelo cuando
      la tabla ya exista, para afinar el mapeo de campos exacto).
