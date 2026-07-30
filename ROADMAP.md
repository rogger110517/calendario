# Roadmap del Producto

## MVP — Fase 1 (Actual)

### Completado
- [x] Calendario FullCalendar con vistas mensual, semanal y agenda
- [x] Datos desde JSON simulado (sin backend)
- [x] Autenticación simulada (Entra ID ready — MSAL preparado)
- [x] Formulario nueva campaña con validación completa (Zod + RHF)
- [x] Detalle de campaña en modal
- [x] Estados visuales por color (5 estados)
- [x] Validación de campañas similares con alerta
- [x] Soporte para Dealer (Sí/No + especificar)
- [x] Soporte para Recurrencia (tipos + cantidad)
- [x] Adjunto de archivo Excel (metadata only)
- [x] Arquitectura Repository Pattern + Services Layer
- [x] API Routes Next.js (GET, POST, PUT, DELETE)
- [x] Encabezado tipo Microsoft 365 con usuario autenticado
- [x] Leyenda de estados en el calendario
- [x] TypeScript estricto en toda la aplicación
- [x] Diseño responsive tipo Outlook/M365

### Pendiente MVP
- [ ] Instalar dependencias (`npm install`)
- [ ] Configurar `.env.local` con valores reales
- [ ] Pruebas de usuario con datos reales

---

## Fase 2 — Integración Backend (3-6 meses)

### Autenticación
- [ ] Microsoft Entra ID con MSAL real
- [ ] SSO corporativo
- [ ] Gestión de roles basada en grupos Entra ID

### Datos
- [ ] Dataverse Web API — reemplazar repositorios JSON
- [ ] Caché con Azure Cache for Redis
- [ ] Búsqueda y filtros avanzados en el calendario

### Email
- [ ] SendGrid — envío de emails reales
- [ ] Templates HTML de email corporativos
- [ ] Notificaciones de aprobación/rechazo automáticas

### Archivos
- [ ] OneDrive/SharePoint — subida de archivos real
- [ ] Preview de archivos Excel en el detalle
- [ ] Gestión de versiones de archivos

### Flujo de Aprobación
- [ ] Modal de aprobación/rechazo para Admin
- [ ] Notificaciones en tiempo real (Azure SignalR)
- [ ] Historial de cambios de estado

---

## Fase 3 — Features Avanzados (6-12 meses)

### Analytics y Reportes
- [ ] Dashboard de métricas de campañas
- [ ] Tasa de apertura, clics, conversiones
- [ ] Exportación a Excel / PDF
- [ ] Integración Power BI

### Automatización
- [ ] Power Automate para flujos de aprobación
- [ ] Recordatorios automáticos antes del día de envío
- [ ] Integración con CRM Dynamics 365

### UX / Funcionalidad
- [ ] Drag & drop para mover campañas en el calendario
- [ ] Vista de múltiples calendarios (por departamento)
- [ ] Plantillas de campañas reutilizables
- [ ] Duplicar campaña existente
- [ ] Modo oscuro (MUI dark theme)
- [ ] Internacionalización (i18n) — inglés/español
- [ ] PWA (Progressive Web App) con notificaciones push

### Seguridad y Cumplimiento
- [ ] Auditoría y trazabilidad de cambios
- [ ] Exportación para auditorías
- [ ] Cumplimiento GDPR/protección de datos
- [ ] Azure Application Insights — monitoreo

### Integraciones Adicionales
- [ ] Microsoft Teams — notificaciones y aprobaciones
- [ ] Outlook Calendar — sincronización bidireccional
- [ ] Azure DevOps — tracking de desarrollo
- [ ] WhatsApp Business API directa

---

## Notas de Priorización

- **Fase 2** desbloquea el uso real en producción
- **Flujo de aprobación** es el feature más solicitado para Fase 2
- **Analytics** es crítico para Fase 3 — demuestra ROI del sistema
- **Power Automate** reduce carga manual del equipo de Marketing
