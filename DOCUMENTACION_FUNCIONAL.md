# Documentación Funcional

## Objetivo del Sistema

Aplicación interna corporativa para gestionar campañas de comunicaciones mediante un calendario visual tipo Microsoft Outlook. Permite registrar, visualizar y hacer seguimiento de campañas de email, SMS, WhatsApp y Push.

---

## Actores y Permisos

| Actor | Descripción | Permisos |
|---|---|---|
| **Admin** | Administrador del sistema | Ver · Crear · **Aprobar · Rechazar · Cancelar · Ejecutar** |
| **Editor** | Gestor de campañas | Ver · Crear |
| **Viewer** | Solo lectura | Ver campañas y detalles |

**Usuario administrador del MVP:** Ana García Ríos (`ana.garcia@empresa.com`, rol: `admin`)

---

## Flujo de Estados de Campaña

```
                     [Crear]
                        │
                        ▼
                   ┌─────────┐
                   │Pendiente│ ◄── Estado inicial de toda campaña nueva
                   └────┬────┘
          ┌─────────────┼──────────────┐
          │             │              │
       [Aprobar]    [Rechazar]     [Cancelar]
      (solo Admin)  (solo Admin)   (solo Admin)
          │             │              │
          ▼             ▼              ▼
      ┌───────┐    ┌──────────┐  ┌──────────┐
      │Aprobada│    │Rechazada │  │Cancelada │
      └───┬───┘    └──────────┘  └──────────┘
          │
   ┌──────┴──────┐
   │             │
[Ejecutar]   [Cancelar]
(solo Admin) (solo Admin)
   │             │
   ▼             ▼
┌────────┐  ┌──────────┐
│Ejecutada│  │Cancelada │
└────────┘  └──────────┘
```

---

## Flujo de Aprobación / Rechazo (UC-08 al UC-12)

### UC-08 — Aprobar Campaña

**Actor:** Admin (Ana García Ríos)

**Precondición:** La campaña está en estado **Pendiente**

**Pasos:**
1. Admin hace clic en la campaña desde el calendario (evento amarillo)
2. Se abre el modal de detalle
3. En el pie del modal aparecen los botones de acción (solo visibles para Admin):
   - **Aprobar** (verde) — disponible si estado = Pendiente
   - **Rechazar** (rojo) — disponible si estado = Pendiente o Aprobada
   - **Cancelar** (gris) — disponible si estado = Pendiente o Aprobada
4. Admin hace clic en **Aprobar**
5. El estado cambia a **Aprobada** en tiempo real
6. El evento en el calendario cambia de color amarillo a verde
7. El sistema muestra notificación: *"Campaña aprobada correctamente"*

**Postcondición:** Campaña en estado Aprobada · Evento verde en calendario

---

### UC-09 — Rechazar Campaña

**Actor:** Admin

**Precondición:** Campaña en estado **Pendiente** o **Aprobada**

**Pasos:**
1. Admin abre detalle de campaña
2. Hace clic en **Rechazar** (botón rojo con ícono)
3. Estado cambia a **Rechazada**
4. Evento en calendario cambia a rojo
5. Notificación: *"Campaña rechazada correctamente"*

**Postcondición:** Campaña en estado Rechazada · Evento rojo en calendario

---

### UC-10 — Marcar Ejecutada

**Actor:** Admin

**Precondición:** Campaña en estado **Aprobada**

**Pasos:**
1. Admin abre detalle de campaña Aprobada
2. Hace clic en **Marcar Ejecutada**
3. Estado cambia a **Ejecutada**
4. Evento en calendario cambia a azul
5. Notificación: *"Campaña ejecutada correctamente"*

**Postcondición:** Campaña en estado Ejecutada · Evento azul en calendario

---

### UC-11 — Cancelar Campaña

**Actor:** Admin

**Precondición:** Campaña en estado **Pendiente** o **Aprobada**

**Pasos:**
1. Admin abre detalle de campaña
2. Hace clic en **Cancelar**
3. Estado cambia a **Cancelada**
4. Evento en calendario cambia a gris
5. Notificación: *"Campaña cancelada correctamente"*

---

### UC-12 — Restricción para Editor / Viewer

**Actor:** Editor o Viewer

**Comportamiento:**
- Al abrir el detalle de una campaña **no aparecen botones de acción**
- Si la campaña está en Pendiente, aparece el mensaje:
  *"Solo un administrador puede cambiar el estado"*
- El resto del detalle (nombre, fechas, comunicaciones, archivo) es visible para todos

---

## Botones de Acción por Estado y Rol

| Estado Actual | Admin ve | Editor ve | Viewer ve |
|---|---|---|---|
| Pendiente | Aprobar · Rechazar · Cancelar | — | — |
| Aprobada | Ejecutar · Rechazar · Cancelar | — | — |
| Rechazada | — | — | — |
| Ejecutada | — | — | — |
| Cancelada | — | — | — |

---

## Flujo Principal: Crear Campaña

```
1. Usuario hace clic en fecha vacía del calendario
2. Modal "Nueva Campaña" se abre con la fecha pre-seleccionada
3. Campos automáticos llenados:
   - Solicitante = usuario autenticado (Ana García Ríos)
   - Fecha Registro = fecha y hora actual
   - Estado = Pendiente
4. Usuario completa campos requeridos:
   - Nombre de Campaña (mín. 3 chars)
   - Subject (mín. 5 chars)
   - A quién está dirigido
   - Filtros a aplicar
5. Opcionalmente activa "¿Aplica a Dealer?"
   → Selecciona dealer del listado + especifica nombre
6. Configura fechas de envío y fin
7. Opcionalmente activa "¿Con recurrencia?"
   → Selecciona tipo + cantidad de comunicaciones
8. Opcionalmente adjunta archivo Excel
9. Hace clic en "Crear Campaña"
10. Sistema valida campaña similar:
    → Si similar: alerta "¿Desea continuar?"
    → "Continuar" guarda / Cancela para modificar
11. Campaña creada en estado Pendiente (amarillo en calendario)
```

---

## Estados Visuales en el Calendario

| Estado | Color | Hex |
|---|---|---|
| Pendiente | Amarillo | #ffb900 |
| Aprobada | Verde | #107c10 |
| Rechazada | Rojo | #d13438 |
| Ejecutada | Azul | #0078d4 |
| Cancelada | Gris | #8a8886 |

---

## Canales de Comunicación

| Canal | Descripción |
|---|---|
| Email | Correo electrónico corporativo |
| SMS | Mensaje de texto |
| Push | Notificación push móvil |
| WhatsApp | WhatsApp Business |

---

## Validaciones del Formulario Nueva Campaña

| Campo | Regla |
|---|---|
| Nombre Campaña | Requerido · mín. 3 · máx. 100 chars |
| Subject | Requerido · mín. 5 · máx. 200 chars |
| Dirigido A | Requerido · mín. 3 chars |
| Filtros | Requerido · mín. 3 chars |
| Día Envío | Requerido · fecha válida |
| Día Fin | Requerido · fecha válida |
| Tipo Recurrencia | Requerido si recurrencia = true |
| Cantidad Comunicaciones | Número 1–999, requerido si recurrencia = true |
| Archivo | Opcional · .xlsx, .xls, .csv |

---

## Reglas de Negocio

1. Toda campaña nueva inicia en **Pendiente**
2. El solicitante y la fecha de registro se asignan **automáticamente**
3. Solo usuarios con rol **admin** pueden cambiar el estado
4. Solo dealers con `activo: true` aparecen en el formulario
5. La validación de similares compara nombre y subject (insensible a mayúsculas)
6. Los archivos solo guardan metadata en MVP (sin subida física)
