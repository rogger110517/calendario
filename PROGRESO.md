# Progreso del Proyecto — Calendario de Comunicaciones

> Última actualización: 2026-07-30. Este documento resume el avance funcional real del MVP para retomar el trabajo rápidamente en la próxima sesión.

## Estado general

MVP funcional en Next.js 15 (App Router) con datos mock en memoria (se reinician al recargar el navegador). Login, calendario, formulario de campaña, aprobación por administrador y notificaciones básicas ya están operativos.

## Módulos implementados

### 1. Autenticación (`src/store/auth.store.ts`, `src/lib/services/auth.service.ts`)
- Login con correo/password contra `src/mocks/users.json` (2 admins, 1 colaborador/editor).
- Sesión persistida en `localStorage`.

### 2. Calendario (`src/components/calendar/CalendarView.tsx`)
- FullCalendar (mes / semana / lista) coloreado por estado de campaña y por unidad de negocio.
- **Fix reciente:** el calendario ahora pinta un evento por cada fecha de envío (fecha principal + todas las `fechasRecurrencia` calculadas), en vez de un único evento en `diaEnvio`. Antes, sin importar el tipo de recurrencia elegido, solo aparecía la fecha principal.

### 3. Formulario de campaña (`src/components/campaigns/CampaignFormModal.tsx`)
Orden de secciones: Información General → Dealer → **Recurrencia** → Fechas y Hora de Envío → Recursos y Comentarios.

- **Dealer:** checkbox "¿Campaña por Dealer?" + selector de dealer + campo numérico **"Cantidad de Dealers"** (nuevo).
- **Recurrencia:** checkbox "¿Con recurrencia?" + selector **Tipo de Recurrencia** (Diario / Semanal / Trimestral). Sin campo de cantidad de comunicaciones (se descartó a pedido del usuario).
- **Fechas y Hora:** Día de Envío, Hora de Envío y **Fecha Fin** (restaurada, antes se calculaba sola).
- El backend (`CampaignService.create`) calcula automáticamente las fechas intermedias de envío entre Día de Envío y Fecha Fin según el tipo de recurrencia (diario = cada día, semanal = cada 7 días, trimestral = cada 3 meses), y las guarda en `fechasRecurrencia`.

### 4. Flujo de aprobación (`src/components/campaigns/CampaignDetailModal.tsx`)
Estados: `Pendiente → Aprobada → Ejecutada`, con salidas a `Rechazada` / `Cancelada` en cualquier punto (solo admin).

### 5. Notificaciones (nuevo)
- Modelo: `src/types/index.ts` (`Notification`, `NotificationTipo`).
- Datos mock: `src/mocks/notifications.json` (vacío, se llena en runtime).
- Repositorio/servicio: `src/lib/repositories/notification.repository.ts`, `src/lib/services/notification.service.ts`.
- Hooks: `src/hooks/useNotifications.ts` (polling cada 15s).
- UI: campana en `AppHeader.tsx` con badge de no leídas + `src/components/layout/NotificationsMenu.tsx` (lista, marcar leída, marcar todas, click abre la campaña).

Disparadores automáticos (`CampaignService`):
| Evento | Destinatario | Mensaje |
|---|---|---|
| Campaña creada (`Pendiente`) | Todos los usuarios `admin` | "Tienes una comunicación por aprobar: ..." |
| Cambio a `Aprobada` | Solicitante (colaborador) | "Tu comunicación ... ha sido aprobada" |
| Cambio a `Rechazada` | Solicitante | "Tu comunicación ... ha sido rechazada" |
| Cambio a `Ejecutada` | Solicitante | "Tu comunicación ... ha sido enviada" |

## Pendiente / ideas para siguiente sesión
- Las notificaciones son 100% mock en memoria del navegador (no hay backend real ni push/email). Ver `INTEGRACION_EMAIL.md` para el plan de correo real.
- No hay pantalla dedicada de "todas las notificaciones" (solo el dropdown de la campana).
- Revisar si se necesita notificar también sobre `Cancelada`.
- Migración de mocks a Dataverse sigue pendiente (ver `INTEGRACION_DATAVERSE.md`).

## Notas de trabajo con el usuario
- El usuario corre el proyecto (`npm run dev`) en su propia terminal — no lanzar el servidor de desarrollo por él.
- Verificación de cambios en esta sesión: `npx tsc --noEmit` (sin errores).
- Para tareas de Azure, dar siempre pasos manuales del Portal — no ejecutar `az` CLI por el usuario.

## Despliegue en Azure App Service

- Repo conectado por GitHub Actions: `.github/workflows/main_calendarioweb05.yml` (generado por Azure Deployment Center).
- Web App: `calendarioweb05` (Azure le asigna un hostname único, ej. `calendarioweb05-xxxxxxx.centralus-01.azurewebsites.net` — **no** el clásico `calendarioweb05.azurewebsites.net`, ese ya no se usa por defecto en recursos nuevos).
- `npm run build` local corre limpio, sin variables de entorno obligatorias todavía (todo lo que usa `SENDGRID_API_KEY` etc. sigue siendo mock/`console.log`).
- 2026-08-01: el Web App mostraba la plantilla por defecto de Azure ("Welcome") — el recurso se había recreado (nuevo hostname) y nunca había recibido un deploy real, aunque el primer run del workflow sí había sido exitoso contra el recurso anterior. Se solucionó forzando un nuevo push para disparar el workflow contra el recurso actual.
