# Diagnóstico — `sh: 1: next: not found` / 503 en App Service

> Generado el 2026-08-02 para depurar el fallo de arranque después de que
> OIDC ya autentica correctamente (ver `src/DIAGNOSTICO_GITHUB_ACTIONS_OIDC.md`).
> No se tocó el Startup Command en Azure hasta confirmar por escrito que
> `server.js` existe.

## 1. ¿Existe `server.js` en la raíz del proyecto?

**No.** Búsqueda en el repo (`find` / `Glob`) no encuentra ningún `server.js`
propio — solo apariciones dentro de `node_modules/` (internos de Next.js,
`react-dom`, etc., que no son el entry point de la app).

Esto es **esperado y correcto**: `server.js` no es un archivo que se escriba
ni se commitee a mano. Es un artefacto que **genera `next build`** dentro de
`.next/standalone/server.js`, y **solo cuando** `next.config.ts` tiene la
opción `output: 'standalone'` activada — igual que `.next/` en general, no
debe versionarse (ya está en `.gitignore`).

## 2. Estado actual: el fix todavía no se desplegó

```
$ git status --short
 M .github/workflows/main_calendarioweb05.yml
 M next.config.ts
```

Ambos cambios (agregar `output: 'standalone'` a `next.config.ts` y el paso
que empaqueta `.next/standalone` en el workflow) están **aplicados en el
disco local, pero sin commit ni push**. El error de Log Stream que pegaste:

```
> calendar-comunicaciones@0.1.0 start
> next start

sh: 1: next: not found
```

corresponde al **último deploy real** (el anterior a este fix), que todavía
corre `npm start` → `next start` sobre un `node_modules` desplegado tal cual
desde GitHub Actions — exactamente el escenario diagnosticado antes. No es
un fallo del cambio nuevo, porque el cambio nuevo aún no llegó a Azure.

## 3. ¿Es `server.js` el entry point correcto para producción?

**Sí, una vez desplegado el build standalone.** Con `output: 'standalone'`,
`next build` genera:

```
.next/standalone/
├── server.js          ← entry point autocontenido (Node HTTP server)
├── package.json        ← mínimo, generado por Next.js
└── node_modules/        ← solo las deps de producción realmente usadas
```

`server.js` es el punto de entrada **oficial y recomendado por Next.js**
para este modo (documentado en next.js.org bajo "Output File Tracing" /
`output: standalone`). Se ejecuta con `node server.js` y lee el puerto de
la variable de entorno `PORT` — que Azure App Service Linux ya inyecta
automáticamente, así que no requiere configuración adicional de puerto.

**Importante:** `public/` y `.next/static/` **no** se copian solos dentro de
`.next/standalone/` — por eso el workflow tiene un paso explícito que los
copia ahí antes de subir el artifact (`Prepare standalone output for
deployment`). Sin ese paso, el server arrancaría pero serviría assets/CSS
rotos (404 en `/static/...`).

## 4. `package.json` completo (estado actual, sin cambios)

```json
{
  "name": "calendar-comunicaciones",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@emotion/cache": "^11.13.1",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.0",
    "@fullcalendar/core": "^6.1.15",
    "@fullcalendar/daygrid": "^6.1.15",
    "@fullcalendar/interaction": "^6.1.15",
    "@fullcalendar/list": "^6.1.15",
    "@fullcalendar/react": "^6.1.15",
    "@fullcalendar/timegrid": "^6.1.15",
    "@hookform/resolvers": "^3.10.0",
    "@mui/icons-material": "^6.4.8",
    "@mui/material": "^6.4.8",
    "@mui/material-nextjs": "^9.1.1",
    "@mui/x-date-pickers": "^8.3.0",
    "@tanstack/react-query": "^5.62.16",
    "@tanstack/react-query-devtools": "^5.62.16",
    "axios": "^1.8.4",
    "dayjs": "^1.11.13",
    "next": "15.3.3",
    "notistack": "^3.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.2",
    "zod": "^3.24.1",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^8",
    "eslint-config-next": "15.3.3",
    "typescript": "^5"
  }
}
```

`"start": "next start"` se deja tal cual — no hace falta borrarlo. En
producción con standalone **no se usa** (Azure no ejecuta `npm start`, sino
directamente `node server.js` vía Startup Command), pero sigue sirviendo
para levantar un build de producción en local con `npm run build && npm
start` si hace falta probar algo sin Azure de por medio.

`next` sigue en `dependencies` (correcto, ya confirmado en el diagnóstico
anterior) — eso nunca fue la causa del problema.

## 5. Startup Command correcto — y cuándo aplicarlo

**`node server.js`**

Pero **en este orden, no antes**:

1. Yo hago commit + push de `next.config.ts` y
   `.github/workflows/main_calendarioweb05.yml` (los cambios ya están
   escritos, solo falta tu OK para el push).
2. Se dispara el workflow → `next build` genera `.next/standalone/server.js`
   → el workflow lo empaqueta y lo despliega en la raíz de `wwwroot`.
3. **Recién ahí**, en el Portal: Web App `calendarioweb05` → **Configuration**
   → **General settings** → **Startup Command** → `node server.js` → **Save**.
4. Verificar en **Log stream** que arranca sin el error `next: not found`
   (debería verse algo tipo `▲ Next.js 15.3.3` / `Ready in ...ms`).

Si se configura el Startup Command **antes** del paso 2, el resultado sería
un error distinto pero igual de fatal: `node: can't open file
'server.js': No such file or directory`, porque en ese momento el paquete
desplegado en Azure todavía es el viejo (sin `output: 'standalone'`), que no
contiene `server.js` en la raíz.

## 6. Resumen

| Pregunta | Respuesta |
|---|---|
| ¿`server.js` existe hoy en el repo? | No (correcto, no debe commitearse) |
| ¿Existe en el último deploy en Azure? | No — ese deploy es anterior al fix |
| ¿Es el entry point correcto? | Sí, una vez generado por `next build` con `output: 'standalone'` |
| ¿Cuándo se genera? | En el próximo `next build` del workflow, tras el push |
| Startup Command final | `node server.js` — configurar **después** del próximo deploy exitoso |
