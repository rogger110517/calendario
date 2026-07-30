# Manual del Administrador

## Mantenimiento de Datos Mock (MVP)

Los datos de desarrollo están en `src/mocks/`. Son archivos JSON editables directamente.

| Archivo | Contenido | Cuándo editar |
|---|---|---|
| `users.json` | Usuarios del sistema | Para agregar/cambiar usuarios |
| `dealers.json` | Concesionarios | Para agregar/desactivar dealers |
| `campaigns.json` | Campañas de ejemplo | Para datos de demo |
| `communications.json` | Comunicaciones por campaña | Para datos de demo |

> **Nota:** Los cambios en JSON se aplican al reiniciar el servidor de desarrollo. En tiempo de ejecución, el store in-memory refleja las mutaciones (crear/editar/eliminar) hasta que el servidor se reinicia.

## Cambiar Usuario Simulado

Editar `src/lib/services/auth.service.ts`:

```typescript
const SIMULATED_USER_ID = 'usr-001' // Cambiar al id del usuario deseado
```

Usuarios disponibles: `usr-001` (Admin), `usr-002` (Editor), `usr-003` (Viewer)

## Agregar Usuario

Editar `src/mocks/users.json`:

```json
{
  "id": "usr-004",
  "nombre": "Nuevo Usuario",
  "correo": "nuevo@empresa.com",
  "rol": "editor",
  "departamento": "Marketing"
}
```

Roles válidos: `admin`, `editor`, `viewer`

## Agregar Dealer

Editar `src/mocks/dealers.json`:

```json
{
  "id": "dlr-006",
  "nombre": "Nuevo Dealer",
  "codigo": "NDL-01",
  "region": "Lima",
  "activo": true
}
```

> Solo los dealers con `activo: true` aparecen en el formulario.

## Agregar Estado de Campaña

1. `src/types/index.ts` → agregar al tipo `CampaignEstado`:
   ```typescript
   export type CampaignEstado = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Ejecutada' | 'Cancelada' | 'NuevoEstado'
   ```

2. `src/components/calendar/CalendarView.tsx` → agregar color:
   ```typescript
   const STATUS_COLORS: Record<CampaignEstado, string> = {
     // ... existentes
     NuevoEstado: '#8764b8',
   }
   ```

3. `src/components/campaigns/CampaignDetailModal.tsx` → agregar chip color:
   ```typescript
   const STATUS_CHIP_COLORS = {
     // ... existentes
     NuevoEstado: 'secondary',
   }
   ```

4. `src/components/calendar/CalendarLegend.tsx` → agregar a la leyenda

## Cambiar Theme / Colores Corporativos

Editar `src/lib/theme.ts`:

```typescript
palette: {
  primary: {
    main: '#TU_COLOR_CORPORATIVO', // reemplazar #0078d4
  },
}
```

## Resolución de Problemas Comunes

### Error: "Module not found: @fullcalendar/..."
```bash
npm install
```

### Error: "Cannot find module '@/...'"
Verificar que `tsconfig.json` tenga:
```json
"paths": { "@/*": ["./src/*"] }
```

### Tipos TypeScript erróneos
```bash
npm run type-check
```
Ver los errores y corregir tipos en `src/types/index.ts`.

### Datos no actualizan en el calendario
TanStack Query cachea por 30 segundos. Para invalidar manualmente desde el navegador:
```javascript
// En DevTools → Console
window.__tanstack_query_client?.invalidateQueries({ queryKey: ['campaigns'] })
```

### Formulario no cierra después de crear
Verificar que `onClose()` se llame en el `doCreate()` después de `mutateAsync`.

### FullCalendar no muestra eventos
Verificar que `diaEnvio` en campaigns.json tenga formato `YYYY-MM-DD` (no datetime).

### El calendario está en inglés
Verificar que `locale={esLocale}` esté en `CalendarView.tsx` y que el import sea:
```typescript
import esLocale from '@fullcalendar/core/locales/es'
```

## Logs y Debugging

En desarrollo, la consola del navegador muestra:
- `[EmailService]` — llamadas a email (simuladas)
- `[FileStorageService]` — operaciones de archivo
- TanStack Query DevTools (visible en desarrollo)

## Actualización de Dependencias

```bash
# Ver dependencias desactualizadas
npx npm-check-updates

# Actualizar package.json
npx npm-check-updates -u

# Instalar actualizaciones
npm install
```

> ⚠️ Siempre probar `npm run type-check` y `npm run build` después de actualizar.

## Backup de Datos Mock

En MVP, hacer copia de los archivos JSON antes de modificarlos:
```powershell
Copy-Item src/mocks/campaigns.json src/mocks/campaigns.backup.json
```

## Estructura de Logs para Producción

Al integrar Application Insights, los eventos clave a trackear son:
- `campaign.created` — nueva campaña
- `campaign.approved` — campaña aprobada
- `campaign.rejected` — campaña rechazada
- `campaign.similar_detected` — advertencia de campaña similar
- `email.sent` — email enviado
- `file.uploaded` — archivo subido
