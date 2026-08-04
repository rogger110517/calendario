# Despliegue — Azure Easy Auth (Entra ID)

> Generado el 2026-08-04. Reemplaza el login local (email + contraseña
> contra `users.json`) por autenticación de **Azure App Service Easy
> Auth** con Microsoft Entra ID. El login local quedó eliminado por
> completo del código — falta un paso manual en el Portal de Azure para
> que quede activo de verdad (sección 3).

## 1. Qué se implementó

```
src/lib/auth/
├── roles.ts                 ← getUserRole(email), ADMIN_EMAILS (lista fija)
└── easyAuth.ts               ← fetchEasyAuthUser(): llama /.auth/me y arma un User

src/components/auth/
├── UserProvider.tsx          ← Context global: useCurrentUser(), useUserLoading()
├── UserProfile.tsx           ← Muestra correo + rol (usado en el menú de cuenta)
├── AdminOnly.tsx              ← <AdminOnly>...</AdminOnly> oculta hijos a no-admins
└── AuthGuard.tsx              ← Ya no redirige a /login (no existe más); si no hay
                                  sesión, muestra mensaje + botón "Iniciar sesión"

middleware.ts (raíz del proyecto)
  → protege /admin/:path* leyendo el header que Easy Auth inyecta
    (x-ms-client-principal-name), sin llamar a /.auth/me de nuevo
```

**Regla de roles** (`src/lib/auth/roles.ts`, sin base de datos):

```
palomino_pach@outlook.com  → admin
cualquier otro autenticado → colaborador
```

Para agregar otro admin, sumar su correo (en minúsculas) al array
`ADMIN_EMAILS` en ese archivo.

## 2. Qué se eliminó

- `src/app/login/page.tsx` — pantalla de login propia.
- `src/store/auth.store.ts` — store de Zustand con `login()`/`logout()`.
- `src/lib/services/auth.service.ts` — validaba email/password contra
  `users.json`.
- `src/lib/auth/jwt.ts` — JWT simulado para el MVP.
- Las 3 env vars `NEXT_PUBLIC_AZURE_CLIENT_ID` / `_TENANT_ID` /
  `_REDIRECT_URI` de `.env.example`/`.env.local` (eran para una futura
  integración MSAL client-side que ya no hace falta — Easy Auth no
  necesita ninguna librería ni configuración en el código, todo vive en
  el App Service).

`src/mocks/users.json` + `UserRepository` **no se borraron** — quedan
solo para `src/app/api/send-email/route.ts` (ruta que hoy no está
conectada a ningún flujo activo de la UI). Ya no participan en login ni
en roles.

## 3. Paso manual pendiente en Azure Portal (obligatorio)

El código ya está listo, pero **Easy Auth hay que activarlo desde el
Portal** — no se configura con código ni env vars:

1. Azure Portal → App Service `calendarioweb05` → menú lateral
   **Autenticación** (Authentication).
2. **Agregar un proveedor de identidad** (Add identity provider).
3. Elegir **Microsoft** (Entra ID).
4. Tipo de aplicación: **Registro de aplicación** → **Crear nuevo registro
   de app** (o reutilizar uno existente si el equipo de IT ya tiene uno
   para esto — cualquiera de los dos sirve).
5. Tipo de cuenta admitida: según la política de MAF — normalmente
   **Cuentas solo en este directorio organizativo** (single-tenant).
6. En **Requisito de acción para solicitudes no autenticadas**, elegir
   **Requerir autenticación** (Require authentication) — esto es lo que
   hace que Azure intercepte a cualquiera que no haya iniciado sesión
   *antes* de que la request llegue a Next.js, sin necesitar el
   `AuthGuard` del lado del código.
7. Guardar.

Con eso, entrar a la URL de la app ya debería mandar directo al login de
Microsoft, y `/.auth/me` empieza a responder con la sesión real.

**Nota:** `palomino_pach@outlook.com` es una cuenta `outlook.com`
(personal), no una cuenta de MAF. Si el tenant de Entra ID está
configurado como single-tenant, esa cuenta **no va a poder autenticarse**
— haría falta invitarla como **usuario invitado (B2B guest)** en el
tenant de MAF, o cambiar el registro a multi-tenant/cuentas personales
si el requerimiento es literalmente permitir esa cuenta tal cual.
Avísame si ya la invitaron o si hay que ajustar el tipo de cuenta
admitida.

## 4. Cómo se comporta en local (`npm run dev`)

Easy Auth es una capa de Azure App Service — **no existe en local**.
`/.auth/me` devuelve 404, `fetchEasyAuthUser()` retorna `null`, y
`AuthGuard` muestra "No se detectó una sesión de Microsoft Entra ID" con
un botón que apunta a `/.auth/login/aad` (que tampoco existe en local).
Es esperado: para probar el login real hay que hacerlo contra el sitio
desplegado en Azure, después del paso 3.

## 5. `/admin/*` — protección de rutas

`middleware.ts` ya protege cualquier ruta bajo `/admin` — si el correo
del header `x-ms-client-principal-name` no es admin (o no existe, como en
local), redirige a `/`. Hoy **no hay ninguna página bajo `/admin`
todavía** (la app es una sola pantalla con modales) — la protección queda
lista para cuando se construya la sección "Administración" propuesta en
`PROPUESTA_UX_MEJORAS.md`.

## 6. Impacto en Dataverse (`campaign.solicitante`)

Antes, `Campaign.solicitante` guardaba un `User.id` local (`usr-001`) que
se resolvía contra `users.json` para obtener el correo al sincronizar con
Dataverse. Ahora, como ya no hay catálogo local de usuarios, `solicitante`
**es directamente el correo** de Easy Auth — se simplificó
`campaign.mapper.ts` y `campaign-dataverse.reader.ts` para no depender más
de `UserRepository` en ese punto.
