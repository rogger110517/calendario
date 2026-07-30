# Calendario de Comunicaciones Corporativas

MVP empresarial para gestión de campañas y comunicaciones corporativas, con calendario visual tipo Outlook/Microsoft 365.

## Stack Tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| Next.js | 15.3.3 | Framework full-stack |
| React | 19 | UI |
| TypeScript | 5 | Tipos estrictos |
| FullCalendar | 6 | Calendario interactivo |
| Material UI | 6 | Componentes UI |
| React Hook Form | 7 | Formularios |
| TanStack Query | 5 | Server state / caché |
| Zustand | 5 | Client state |
| Dayjs | 1 | Manejo de fechas |
| Zod | 3 | Validación de esquemas |

## Instalación

```bash
cd C:\srcCalendar
npm install
```

## Ejecución

```bash
npm run dev        # Servidor de desarrollo → http://localhost:3000
npm run build      # Build de producción
npm run start      # Servidor de producción
npm run type-check # Verificar tipos TypeScript
npm run lint       # Linting ESLint
```

## Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── campaigns/
│   │   │   ├── route.ts          # GET /api/campaigns, POST /api/campaigns
│   │   │   └── [id]/route.ts     # GET, PUT, DELETE /api/campaigns/:id
│   │   ├── dealers/route.ts      # GET /api/dealers
│   │   └── send-email/route.ts   # POST /api/send-email
│   ├── layout.tsx                # Root layout + metadata
│   └── page.tsx                  # Página principal → CalendarPage
├── components/
│   ├── calendar/
│   │   ├── CalendarPage.tsx      # Contenedor principal
│   │   ├── CalendarView.tsx      # FullCalendar + lógica eventos
│   │   └── CalendarLegend.tsx    # Leyenda de estados
│   ├── campaigns/
│   │   ├── CampaignFormModal.tsx # Formulario nueva campaña
│   │   └── CampaignDetailModal.tsx # Detalle de campaña
│   ├── layout/
│   │   └── AppHeader.tsx         # Barra superior tipo M365
│   └── Providers.tsx             # ThemeProvider, QueryClient, etc.
├── hooks/
│   ├── useCampaigns.ts           # Queries y mutations de campañas
│   └── useDealers.ts             # Query de dealers
├── lib/
│   ├── repositories/
│   │   ├── campaign.repository.ts
│   │   ├── dealer.repository.ts
│   │   ├── communication.repository.ts
│   │   └── user.repository.ts
│   ├── services/
│   │   ├── campaign.service.ts
│   │   ├── dealer.service.ts
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   └── file-storage.service.ts
│   └── theme.ts                  # Material UI theme Outlook-like
├── mocks/
│   ├── users.json
│   ├── dealers.json
│   ├── campaigns.json
│   └── communications.json
├── store/
│   ├── auth.store.ts             # Estado del usuario autenticado
│   └── campaign.store.ts         # Estado de modales y selección
└── types/
    └── index.ts                  # Interfaces TypeScript
```

## Variables de Entorno

Crear `.env.local` en la raíz:

```env
NEXT_PUBLIC_AZURE_CLIENT_ID=
NEXT_PUBLIC_AZURE_TENANT_ID=
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000
SENDGRID_API_KEY=
EMAIL_FROM=noreply@empresa.com
NEXT_PUBLIC_SHAREPOINT_SITE=
DATAVERSE_URL=
```

## Usuario Simulado

El sistema autentica automáticamente con el usuario `usr-001` (Ana García Ríos, admin).

Para cambiar el usuario simulado, editar:
```
src/lib/services/auth.service.ts → SIMULATED_USER_ID
```

## API Routes Disponibles

| Método | Endpoint | Descripción |
|---|---|---|
| GET | /api/campaigns | Listar todas las campañas |
| POST | /api/campaigns | Crear campaña |
| GET | /api/campaigns/:id | Obtener campaña por ID |
| PUT | /api/campaigns/:id | Actualizar campaña |
| DELETE | /api/campaigns/:id | Eliminar campaña |
| GET | /api/dealers | Listar dealers activos |
| POST | /api/send-email | Enviar email (simulado) |
