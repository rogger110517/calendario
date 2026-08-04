# Propuesta de Mejoras — UX, Producto y Power Platform

> Generado el 2026-08-03. Rol: UX/UI Senior + Product Owner + Power Platform
> Solution Architect. Base: estado real del código en `C:\srcCalendar`
> (Next.js 15 + MUI + Dataverse `cre47_comunicaciondecampana`, ver
> `src/DESPLIEGUE_DATAVERSE.md`). **Esto es una propuesta — no se tocó
> código ni se hizo push.** Todas las referencias a archivos son del estado
> actual del repo, para que la implementación después sea directa.

---

## 0. Dos cosas que necesito antes de poder cerrar el detalle

No las tengo y aparecen en tus requerimientos — no las voy a inventar:

1. **"Excel corporativo con todas las unidades y áreas de MAF"** (req. 2) —
   hoy `Unidad` vive en `src/mocks/unidades.json` (4-5 registros de prueba).
   Compárteme el Excel (o su estructura de columnas) para diseñar el mapeo
   real e importarlo.
2. **"Lógica e información proporcionada previamente por Rouse"** (req. 8,
   Campañas Dealers) — no tengo ese documento/conversación en contexto.
   Pásamelo y ajusto la sección 7 (flujo de aprobación) y el modelo de
   datos de Dealers con las reglas reales, en vez de la propuesta genérica
   que dejo abajo.

---

## 1. Propuesta de UX

### Diagnóstico de lo que hay hoy (grounding, no opinión)

- El formulario de campaña (`CampaignFormModal.tsx`) usa `size="small"` en
  todos los campos, `Grid2` con poco `spacing`, y agrupa 11 campos en una
  sola pantalla sin separación visual fuerte entre bloques — coincide con
  tu pedido de "mejorar espaciado, separar mejor formularios".
- El menú de cuenta (`AppHeader.tsx:151-154`) tiene un ítem **"Mi perfil"**
  sin `onClick` real (solo cierra el menú) — confirmado candidato a
  eliminar, no rompe nada quitarlo.
- El estado se pinta con un **rectángulo de color** (`StatusDot` en
  `CalendarView.tsx`, no un círculo) — tu pedido de "círculo verde
  únicamente cuando corresponda" implica: (a) cambiar la forma a círculo,
  y (b) que el punto de color solo aparezca para el estado que definan
  como "positivo" (ej. Aprobado/Enviado), no para todos los estados.
- La leyenda (`CalendarLegend.tsx`) ya solo muestra 2 estados fijos
  (Aprobada/Ejecutada) — hay que decidir si los 4 estados nuevos
  (Pendiente/Aprobado/Enviado/Todos) se muestran ahí o se mueve a un
  filtro.

### Principios de la propuesta

1. **Densidad media, no baja.** Es una app de gestión (muchas filas/campos
   por sesión) — "más espaciado" no debe significar "menos información por
   pantalla", sino mejor agrupación. Objetivo: pasar de `size="small"` +
   `spacing` ajustado a un sistema de 3 niveles de spacing (8/16/24px) con
   secciones claramente separadas por `Divider` + título de sección con
   ícono, en vez de un formulario plano de 11 campos.
2. **Un solo lenguaje de estado.** Reemplazar cualquier badge/etiqueta
   ad-hoc ("Pendiente de aprobación", chips distintos por pantalla) por un
   único componente `<EstadoChip estado={...} />` reutilizado en calendario,
   detalle, lista y filtros.
3. **Menos decisiones por pantalla.** El checkbox "¿Campaña por Dealer?" +
   selector condicional + cantidad es el patrón correcto (progressive
   disclosure) — se mantiene, pero se aplica el mismo patrón a Recurso y a
   los 2 links de OneDrive para no saturar el formulario base.

---

## 2. Rediseño visual recomendado

| Elemento | Hoy | Propuesta |
|---|---|---|
| Tamaño de campos | `size="small"` en todo | `size="medium"` en campos primarios (nombre, asunto, área, recurso); `small` se mantiene en campos secundarios (comentarios, filtros) |
| Spacing del formulario | `Grid2` compacto | Contenedor con `p: 3`, `spacing={3}` entre secciones, `spacing={2}` entre campos de una misma sección |
| Separación de secciones | Un `Divider` suelto ("Recursos y Comentarios") | 4 secciones con encabezado + ícono: **Identificación** (nombre, asunto, área), **Audiencia y recurso** (dirigido a, recurso, filtros), **Programación** (fechas, hora, recurrencia, dealers), **Adjuntos y comentarios** (2 links OneDrive, comentarios) |
| Indicador de estado | Rectángulo de color (`StatusDot`, `CalendarView.tsx`) | Círculo (`border-radius: 50%`), 8-10px, solo visible en verde cuando el estado sea el "positivo" definido (a confirmar cuál: ¿Aprobado o Enviado?); el resto de estados se distingue por texto/chip, no por punto de color |
| Color de área | Ya existe (`unidad.color`, usado en `backgroundColor` de eventos del calendario) | Mostrar también como **swatch** (cuadrado 16x16 + nombre) en el selector de área del formulario y en filtros — hoy el selector es un `<TextField select>` de solo texto |
| Etiquetas de campo | "A quién está dirigido" | "dirigido a" (minúscula, como pediste) — aplicar el mismo criterio de minúsculas a labels de UI en general si es un lineamiento de marca, o solo a este campo si es puntual (confirmar alcance) |
| Iconografía | Mixta (MUI icons por componente, sin criterio único) | Set reducido: 1 ícono por sección de formulario, 1 ícono por acción de flujo (✓ aprobar, ✕ rechazar, ⊘ cancelar, 🗑 eliminar), sin duplicar conceptos con distintos íconos en distintas pantallas |

---

## 3. Estructura de navegación

Hoy la navegación es de una sola pantalla (calendario + modales). Con los
nuevos conceptos (Áreas por Excel, Dealers como categoría, Estados como
filtro global, Administradores) conviene introducir una barra de
navegación secundaria, sin perder el calendario como pantalla principal:

```
AppHeader (existente, sin "Mi perfil")
└── Barra de navegación secundaria (nueva)
    ├── Calendario          (vista actual, default)
    ├── Campañas Dealers    (nueva — lista/tablero filtrado por categoría Dealer)
    ├── Administración      (solo visible para rol admin — usuarios, áreas, permisos)
    └── [Filtro global de Estado: Pendiente | Aprobado | Enviado | Todos]
```

El filtro de Estado vive a nivel de navegación (no dentro de cada
pantalla) para que aplique igual en Calendario y en Campañas Dealers —
evita reimplementar el mismo filtro dos veces.

---

## 4. Wireframe textual de cada pantalla

### 4.1 Calendario (pantalla principal — hoy `CalendarView.tsx`)

```
┌─────────────────────────────────────────────────────────────┐
│ AppHeader                                                     │
├─────────────────────────────────────────────────────────────┤
│ [Calendario] [Campañas Dealers] [Administración]   [Estado ▾]│
├─────────────────────────────────────────────────────────────┤
│  ← Julio 2026 →      [Mes] [Semana] [Lista]      [+ Nueva]   │
│                                                                 │
│   L    M    X    J    V    S    D                             │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                          │
│  │  │ │●C │ │  │ │●C │ │  │ │  │ │  │   ● = color de área    │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘   ○ verde = estado ok    │
│                                                                 │
├─────────────────────────────────────────────────────────────┤
│ Leyenda: [color área 1] Marketing  [color área 2] Ventas ...  │
└─────────────────────────────────────────────────────────────┘
```

Se mantiene la estructura actual (ya es sólida), solo se agrega la barra
de navegación arriba y se limpia la leyenda para que muestre colores de
**área** (nuevo foco) en vez de solo colores de estado.

### 4.2 Formulario de campaña (modal — hoy `CampaignFormModal.tsx`)

```
┌───────────────────────────────────────────────────┐
│  Nueva campaña                                  ✕  │
├───────────────────────────────────────────────────┤
│  IDENTIFICACIÓN                                     │
│  Nombre de campaña*        Asunto del email*        │
│  [____________________]   [____________________]    │
│                                                       │
│  Área solicitante*                                   │
│  [🟦 Marketing        ▾]   (swatch de color visible) │
│  ───────────────────────────────────────────────── │
│  AUDIENCIA Y RECURSO                                 │
│  dirigido a*                Recurso*                 │
│  [____________________]   [____________________]    │
│  Filtros a aplicar                                   │
│  [____________________________________________]     │
│  ───────────────────────────────────────────────── │
│  PROGRAMACIÓN                                        │
│  ☐ ¿Campaña por Dealer?                              │
│      Dealer [▾]   Cantidad de dealers (opcional) [_] │
│  ☐ ¿Con recurrencia?  → Tipo: Diario/Semanal/Trim.   │
│  Día de envío*  Hora*   Fecha fin*                   │
│  ───────────────────────────────────────────────── │
│  ADJUNTOS Y COMENTARIOS                              │
│  Link OneDrive (base de clientes)                    │
│  [____________________________________________]     │
│  Link OneDrive (piezas gráficas)          ← NUEVO    │
│  [____________________________________________]     │
│  Comentarios                                         │
│  [____________________________________________]     │
├───────────────────────────────────────────────────┤
│                              [Cancelar]  [Guardar]   │
└───────────────────────────────────────────────────┘
```

Cambios de validación concretos sobre `CampaignFormModal.tsx`:
- Agregar campo `recurso` (texto, **obligatorio** — nuevo `z.string().min(1)`).
- Agregar campo `linkOneDrivePiezas` (URL, opcional, mismo patrón que
  `linkOneDrive`).
- Quitar el `.refine()` que hace obligatoria `cantidadDealers` (líneas
  53-54 del schema) — pasa a opcional sin validación cruzada.
- Renombrar label `"A quién está dirigido"` → `"dirigido a"`.
- Renombrar label `"Unidad de Negocio"` → `"Área solicitante"` (alineado
  al Excel corporativo de áreas).

### 4.3 Detalle de campaña / flujo de aprobación (hoy `CampaignDetailModal.tsx`)

```
┌───────────────────────────────────────────────────┐
│  Lanzamiento Sedán 2025                          ✕  │
│  🟦 Marketing              ● Pendiente               │
├───────────────────────────────────────────────────┤
│  [...detalle de campos, igual que hoy...]           │
├───────────────────────────────────────────────────┤
│  [🗑 Eliminar]        [✕ Rechazar]  [✓ Aprobar]      │
└───────────────────────────────────────────────────┘
```

Reglas de visibilidad de acciones (según permisos + estado — ya hay una
base de esto en `CampaignDetailModal.tsx:51-60`, solo se completa):

| Estado actual | Admin ve | Solicitante ve |
|---|---|---|
| Pendiente | Aprobar, Rechazar, Eliminar | Cancelar (si es propia), Eliminar (si es propia) |
| Aprobado | Rechazar, Cancelar | — (solo lectura) |
| Enviado | — (solo lectura, ya se ejecutó) | — (solo lectura) |

### 4.4 Campañas Dealers (pantalla nueva)

```
┌─────────────────────────────────────────────────────────────┐
│ [Calendario] [Campañas Dealers] [Administración]   [Estado ▾]│
├─────────────────────────────────────────────────────────────┤
│  Filtrar por: [Área ▾] [Periodicidad: Diaria/Semanal/Trim ▾] │
├─────────────────────────────────────────────────────────────┤
│  Campaña          Área      Dealer        Periodicidad Estado│
│  Promo Sedán      Marketing AutoMundo Lima Semanal      ● Aprob│
│  Lanzamiento SUV  Ventas    Todos          Trimestral   ○ Pend │
└─────────────────────────────────────────────────────────────┘
```

Vista tabular (no calendario) porque una campaña Dealer típicamente
involucra revisar muchas filas por dealer/periodicidad a la vez — el
calendario no es el mejor formato para eso. Reutiliza el mismo
`CampaignDetailModal` al hacer clic en una fila.

### 4.5 Administración (pantalla nueva, solo rol admin)

```
┌─────────────────────────────────────────────────────────────┐
│  Administración                                                │
├─────────────────────────────────────────────────────────────┤
│  [Usuarios y roles] [Áreas] [Permisos]                          │
├─────────────────────────────────────────────────────────────┤
│  (tab activa: Usuarios y roles)                                 │
│  Nombre          Correo                  Rol (Entra ID)         │
│  Ana García      ana.garcia@mafperu...   Admin                  │
│  Luis Torres     luis.torres@mafperu...  Colaborador            │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Recomendaciones para Power Apps / Power Platform

La app hoy es un frontend custom (Next.js/React) sobre Dataverse
(`cre47_comunicaciondecampana`, ver `src/DESPLIEGUE_DATAVERSE.md`), no un
Power Apps canvas/model-driven app. Recomendaciones concretas de cómo
aprovechar el resto de la plataforma sin reescribir lo que ya funciona:

1. **No migrar el formulario de captura a Power Apps.** El formulario
   custom (React + MUI) ya tiene validaciones de negocio finas (reglas de
   duplicados, máximo de comunicaciones por día — `campaign.service.ts:53-83`)
   que en un formulario model-driven estándar de Power Apps serían más
   trabajo de replicar (Business Rules / Power Fx) que mantener el código
   actual. Mantener Next.js como capa de captura.
2. **Sí usar Power Apps (model-driven) para el back-office de
   Administración** (sección 4.5) — es exactamente el caso de uso donde
   Power Apps model-driven brilla: CRUD simple sobre tablas de Dataverse
   (`systemuser`, tabla de Áreas, roles), sin lógica de negocio compleja,
   con seguridad basada en roles ya nativa de Dataverse. Ahorra construir
   esa pantalla a mano.
3. **Power Automate como el "motor de envíos"** — ya documentado en
   `src/DESPLIEGUE_DATAVERSE.md` sección 3: el flujo dispara por
   `cre47_fechayhoraprogramadaparaesteenvio` y actualiza
   `cre47_estadodelenvio`/`cre47_fecharealdeenvio`/`cre47_mensajedeerror`.
   Con el estado "Enviado" del requerimiento 5, ese es el trigger natural
   para notificar al solicitante cuando el envío efectivamente ocurrió.
4. **ALM (Application Lifecycle Management):** una vez que se confirme el
   diseño, mover `cre47_comunicaciondecampana` (y las tablas de
   Áreas/Dealers que salgan del Excel) a una **Solución** de Dataverse
   (hoy parece estar como tabla suelta en el entorno QA), para poder
   promoverla de QA → Prod de forma controlada en vez de recrear a mano.
5. **Seguridad:** definir 2-3 **Security Roles** en el entorno de
   Dataverse (Solicitante, Aprobador, Administrador) que reflejen los
   mismos 3 roles de `UserRole` en el código (`admin/editor/viewer`,
   `src/types/index.ts`) — así el mismo modelo de permisos aplica tanto si
   se accede vía la app Next.js como si alguien entra directo a Power Apps
   Admin en el futuro.

---

## 6. Modelo de permisos basado en Microsoft Entra ID

Estado actual (grounding): `AuthService` (`src/lib/services/auth.service.ts`)
es un **mock** — login por email/password contra `users.json`, JWT
simulado. El propio archivo ya documenta la migración planeada (líneas
1-13): `@azure/msal-browser`, `loginRedirect`, Graph API `/me`. No está
implementado todavía.

### Propuesta de modelo de roles (Entra ID → app)

| Rol en Entra ID (grupo de seguridad) | Rol en la app (`UserRole`) | Puede |
|---|---|---|
| `CC-Administradores` | `admin` | Aprobar/rechazar cualquier campaña, gestionar áreas/usuarios, ver todo |
| `CC-Solicitantes` | `editor` | Crear campañas de su área, cancelar/eliminar las propias en estado Pendiente |
| `CC-Consulta` | `viewer` | Solo lectura del calendario y campañas |

### Cómo obtener el rol correctamente (respondiendo al requerimiento 7)

1. En el **App Registration** de Entra ID usado por MSAL, agregar un
   **App Role** por cada rol de la tabla de arriba (App roles → New app
   role), o usar **grupos de seguridad** + `groupMembershipClaims` en el
   manifiesto — cualquiera de los dos funciona, grupos es más simple de
   administrar para el equipo de IT de MAF si ya gestionan grupos en AD.
2. El rol llega en el **token ID** (`idTokenClaims.roles` o
   `idTokenClaims.groups`, según la opción anterior) — **no se debe volver
   a preguntar/mapear en Dataverse ni en la app**, se lee directo del
   claim en cada login.
3. `AuthService.getCurrentUser()` deja de leer `users.json` y arma el
   `User` con `nombre`/`correo` de la cuenta de Entra ID + `rol` resuelto
   del claim — mapeo 1:1 con la tabla de arriba.
4. **Importante para producción:** revisar que el App Registration tenga
   asignados los 3 grupos/roles reales (no solo definidos) — es el punto
   típico donde "funciona en Dev pero nadie tiene rol en Prod" porque no
   se hizo la asignación en el tenant productivo.

---

## 7. Flujo de aprobación optimizado

### Estados (requerimiento 5)

Reemplazar el concepto "Pendiente de aprobación" por **Estado**, con estos
4 valores visibles en filtros/búsquedas/vistas:

```
Pendiente → Aprobado → Enviado
    ↓           ↓
Rechazado   Cancelado
```

**Nota de mapeo con Dataverse:** la tabla `cre47_comunicaciondecampana` ya
tiene 5 valores en `cre47_estadodelacampana` (Pendiente/Aprobada/
Rechazada/Ejecutada/Cancelada — confirmados en
`src/lib/dataverse/campaign.options.ts`) y **por separado**
`cre47_estadodelenvio` con Pendiente/Programado/Enviado/Error/Cancelado.
Tu requerimiento de UI (Pendiente/Aprobado/Enviado/Todos) es un
**subconjunto simplificado para el usuario final** — recomiendo que la UI
muestre esos 4, pero por debajo se siga escribiendo a los 2 campos reales
de Dataverse que ya existen (no hay que tocar el schema de Dataverse para
esto, solo la capa de presentación/filtro en React). "Todos" es un filtro
de UI (sin valor propio), no un estado que se guarda.

### Acciones (requerimiento 6)

Ya existe una base funcional en `CampaignDetailModal.tsx:50-60`
(transiciones por estado con confirmación para las destructivas). Se
completa así:

| Acción | Quién | Desde estado | Confirmación |
|---|---|---|---|
| Aprobar | Admin | Pendiente | No (ya es así hoy) |
| Rechazar | Admin | Pendiente, Aprobado | Sí (ya es así hoy) |
| Cancelar | Admin, Solicitante (propia) | Pendiente, Aprobado | Sí (ya es así hoy) |
| Eliminar | Admin, Solicitante (propia, solo si Pendiente) | Pendiente | Sí — **nuevo**, hoy no está listado en las acciones del modal |

`Eliminar` es distinto de `Cancelar`: cancelar dispara notificación y sync
a Dataverse (cambia `estado`); eliminar borra el registro completo — debe
ser irreversible solo desde Pendiente, para no perder trazabilidad de
campañas que ya llegaron a Aprobado/Enviado.

---

## 8. Lista de mejoras priorizadas

**Alta**
1. Quitar "Mi perfil" del menú de cuenta (`AppHeader.tsx:151-154`).
2. Cambiar indicador de estado de rectángulo a círculo + verde solo en el
   estado "positivo" (`CalendarView.tsx`, `StatusDot`).
3. Quitar obligatoriedad de "Cantidad de dealers" (`CampaignFormModal.tsx`
   schema, líneas 53-54).
4. Agregar campo "Recurso" obligatorio al formulario.
5. Renombrar "Pendiente de aprobación" → "Estado" en toda la UI, con los
   4 valores del requerimiento 5.
6. Agregar acción "Eliminar" visible en el detalle de campaña.

**Media**
7. Rediseño de spacing/secciones del formulario (sección 2 de esta
   propuesta).
8. Segundo link de OneDrive (piezas gráficas).
9. Swatch de color visible en el selector de Área.
10. Pantalla "Campañas Dealers" (tabular, sección 4.4).
11. Renombrar label "A quién está dirigido" → "dirigido a".

**Baja**
12. Pantalla "Administración" con tabs (Usuarios/Áreas/Permisos) — hoy no
    hay ninguna pantalla de administración, es funcionalidad nueva.
13. Migración real a MSAL/Entra ID (sección 6) — depende de que IT
    confirme grupos/roles en el tenant.
14. Importación del Excel corporativo de áreas (sección 0, bloqueado sin
    el archivo).
15. Lógica específica de Dealers de "Rouse" (sección 0, bloqueado sin el
    documento).

---

## 9. Riesgos y consideraciones técnicas

- **Fuente de verdad de Áreas duplicada.** Si el Excel corporativo se
  importa una vez a `unidades.json`/Dataverse pero el Excel real sigue
  cambiando en SharePoint, se desincroniza. Recomendación: definir si el
  Excel es "importación única" (snapshot) o si necesita sync recurrente
  (en cuyo caso es un flujo de Power Automate más, no solo una carga
  manual).
- **ROPC + MFA (ya documentado en `DESPLIEGUE_DATAVERSE.md` sección 6).**
  Si la cuenta de servicio de Dataverse llega a requerir MFA, el login
  actual se rompe — no es parte de esta propuesta de UX pero es relevante
  si el approval flow depende de que el sync a Dataverse funcione.
- **Doble modelo de estados (UI simplificado vs. Dataverse completo,
  sección 7).** Si en el futuro alguien edita directo en Power Apps
  usando los 5 estados reales de Dataverse en vez de los 4 de la UI, hay
  que decidir cómo se refleja "Ejecutada" (Dataverse) en la UI
  simplificada (¿es lo mismo que "Enviado"? — asumido que sí en esta
  propuesta, confirmar).
- **"Eliminar" campaña borra también las N filas de Dataverse asociadas**
  (una por fecha de envío, ver `DESPLIEGUE_DATAVERSE.md` sección 2) — hay
  que decidir si eliminar en la app también hace `DELETE` en Dataverse o
  solo oculta localmente; si Power Automate ya generó envíos para alguna
  fecha, borrar la fila real podría romper trazabilidad del lado de
  Dataverse.
- **Permisos durante la transición a Entra ID.** Mientras `AuthService`
  siga siendo mock (`users.json`), el modelo de roles de la sección 6 no
  puede probarse end-to-end — hay que decidir si se prueba con roles mock
  primero (rápido, pero no valida el claim real de Entra ID) o se espera
  a tener el App Registration configurado.

---

## 10. Mockup descriptivo de la pantalla final

Calendario mensual como pantalla de entrada, con una barra de navegación
secundaria delgada justo debajo del header rojo corporativo (mismo tono
`#E40521` en detalles, no en toda la barra — evitar sobrecargar de rojo).
Los días con campañas muestran una barra de color sólido con el color del
**área** (no del estado) y, superpuesto a la izquierda del texto, un
círculo pequeño (8px) que solo se pinta en verde cuando el estado de esa
comunicación es el positivo definido (Aprobado o Enviado, a confirmar) —
el resto de estados no pintan círculo, se distinguen abriendo el detalle.
Al hacer clic se abre el modal de detalle con foco visual claro en las 3-4
acciones de flujo (Aprobar en color primario, Rechazar/Cancelar en
outline, Eliminar en texto rojo discreto al extremo izquierdo, separado
de las demás para evitar clics accidentales). El formulario de creación
usa las 4 secciones con headers de la sección 4.2, con más aire entre
bloques que hoy, y los selects de Área/Dealer muestran el swatch de color
antes del nombre. La sección Administración queda detrás de una pestaña
visible solo para admins, con la misma tipografía y densidad del resto de
la app — no un panel aparte con otro sistema visual.

---

## Siguiente paso

Esto es una propuesta para tu revisión — no toqué código ni hice push.
Cuando la valides (entera o por partes), dime con qué empezamos — sugiero
por la lista de **Alta prioridad** (sección 8, ítems 1-6) porque son
cambios acotados, sin dependencias externas (no necesitan el Excel ni el
documento de Rouse) y con impacto visible inmediato.

Sobre "levanta el proyecto para revisar": como esta entrega es solo
documento (sin cambios de código), no hay nada nuevo que ver corriendo
todavía — tu `npm run dev` que ya tienes abierto sigue mostrando la app
tal cual está hoy. En cuanto implementemos algo de la lista de Alta
prioridad, lo revisas ahí mismo.
