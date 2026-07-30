# Decisiones Técnicas

## Por qué Next.js 15 (App Router)

**Decisión:** Framework principal para frontend y backend ligero.

**Razones:**
- API Routes integradas — sin servidor Express separado en MVP
- App Router permite layouts anidados y streaming
- SSR/SSG para mejor SEO y performance
- Compatible con Azure Static Web Apps y App Service
- Soporte React 19 nativo

**Alternativas consideradas:**
- Vite + React SPA: descartado por falta de API Routes nativas
- Remix: ecosistema más pequeño, menor soporte corporativo
- Angular: mayor curva de aprendizaje, no alineado con preferencias del equipo

---

## Por qué FullCalendar

**Decisión:** Librería de calendario principal.

**Razones:**
- El más completo del ecosistema React/JavaScript
- Soporte nativo para vistas mes, semana, lista
- Localización en español incorporada
- API madura y estable (v6)
- Plugins de interacción (click, drag, select) de fábrica

**Alternativas consideradas:**
- React Big Calendar: menos features, no actualizado
- DayGrid personalizado: costo de desarrollo muy alto
- Google Calendar Embed: no personalizable, datos en Google

---

## Por qué Repository Pattern

**Decisión:** Capa de abstracción entre UI/Services y fuente de datos.

**Razones:**
- Permite migrar JSON → Dataverse → .NET API sin tocar componentes
- Facilita testing unitario (mock del repositorio)
- Separa responsabilidades claramente
- Patrón reconocido por equipos .NET/C# (Dynamics)

**Costo:** Más archivos y boilerplate. Justificado por la migración planificada a Dataverse.

---

## Por qué Zustand (no Redux)

**Decisión:** Estado global del cliente.

**Razones:**
- Boilerplate mínimo (sin actions, reducers, dispatch)
- API simple basada en hooks
- Compatible con React 19 Concurrent Features
- Suficiente para el estado de UI (modales, usuario autenticado)
- Bundle size ~3kb vs ~25kb Redux Toolkit

**Regla:** Zustand para estado de UI local. TanStack Query para estado del servidor.

---

## Por qué TanStack Query

**Decisión:** Manejo de estado del servidor (datos remotos).

**Razones:**
- Cacheo automático por QueryKey
- Invalidación precisa después de mutations
- Estados loading/error/success sin código manual
- DevTools integradas para debugging
- Reduce re-fetching innecesario (staleTime)

---

## Por qué Zod + React Hook Form

**Decisión:** Validación y manejo de formularios.

**Razones:**
- Zod genera tipos TypeScript inferidos automáticamente
- zodResolver integra ambas librerías sin adaptadores manuales
- React Hook Form controla renders: solo re-renderiza el campo modificado
- Sin validación condicional manual (el schema Zod lo maneja)

---

## Por qué Material UI v6

**Decisión:** Sistema de componentes UI.

**Razones:**
- Diseño más cercano a Microsoft 365 / Outlook (con customización del theme)
- Componentes accesibles (ARIA) de fábrica
- Sistema de theme robusto (color, tipografía, spacing)
- Soporte React 19
- Ecosystem maduro (DatePicker, DataGrid, etc.) para fases futuras

**Alternativas consideradas:**
- Fluent UI (Microsoft): API más compleja, integración con Next.js complicada
- Tailwind + Radix: más personalización, pero mayor tiempo de desarrollo inicial
- Chakra UI: menor control sobre tokens de diseño

---

## Por qué Dataverse (futuro, no Redux/otro DB)

**Decisión:** Fuente de datos de producción.

**Razones:**
- Parte del ecosistema Microsoft 365 / Power Platform
- Integración nativa con Power Automate, Power Apps, Power BI
- Seguridad basada en roles de Entra ID (RBAC)
- API REST OData estándar — fácil de consumir desde Next.js
- Auditoria y trazabilidad incorporadas
- El equipo IT ya gestiona licencias Microsoft

**Consideración:** Si el volumen de datos es muy alto, evaluar Azure SQL + .NET API.

---

## Por qué Dayjs (no Moment.js / date-fns)

**Decisión:** Librería de manejo de fechas.

**Razones:**
- Bundle size: ~2kb (Moment: ~67kb, date-fns: ~13kb)
- API inmutable y chainable
- Compatible con `@mui/x-date-pickers` (AdapterDayjs)
- Localización en español con un import
- Moment.js está en modo mantenimiento (deprecated)
