# Admin (NurseHelper): modularización y reutilización

**Antes de implementar:** revisa el checklist breve en [`CONTEXTO_MODULARIZACION_REUTILIZACION_CHECKLIST.md`](./CONTEXTO_MODULARIZACION_REUTILIZACION_CHECKLIST.md) (qué mirar primero: `shared/`, botones `neuro-btn`, modales, `AdminService`).

Documento de contexto para alinear futuros refactors: qué hay hoy en el área de administración, qué ya es compartido y qué conviene extraer como bloques reutilizables (UI y comportamiento).

**Última revisión:** lectura del código en `frontend/src/app/components/admin-dashboard/`, `AdminService`, rutas y comparación superficial con el panel de supervisor.

---

## 1. Qué es el “módulo admin” en este repo

- **Ruta:** `/admin`, componente lazy: `AdminDashboardComponent` (`app.routes.ts`).
- **Guard:** `adminGuard` (`roleGuard(['admin'])`).
- **Estructura:** no es un `NgModule` clásico; es un **dashboard standalone** que agrupa pestañas internas y **siete subcomponentes** de gestión más el resumen:
  - `overview`
  - `users-management`, `staff-management`, `areas-management`, `beds-management`, `patients-management`, `schedules-management`
- **Patrón de pestañas:** `activeTab` + `localStorage` (`admin-dashboard-active-tab-v1`) + conjunto `visitedTabs` con `*ngIf` + `[hidden]` para **no destruir** el componente al cambiar de pestaña (menos llamadas repetidas a la API).

Este patrón de shell + tabs es candidato a reutilizar en **supervisor** (el HTML del supervisor replica la misma envoltura: cabecera, nav, contenido).

---

## 2. Ya reutilizable hoy (no duplicar esfuerzo)

### 2.1 Estilos compartidos

| Recurso | Ubicación | Uso en admin |
|--------|-----------|--------------|
| Layout neumórfico de paneles | `shared/styles/dashboard-layout.css` | Import en `admin-dashboard.component.css`; comentario en archivo: admin, farmacia, enfermera |
| Responsive panel admin | `shared/styles/admin-panel-responsive.css` | Import en admin shell |
| Tablas / acciones | `shared/styles/admin-table-unified.css`, `table-actions-normalized.css` | Referencia cruzada para vistas tabulares |
| Stats overview | `shared/styles/dashboard-overview-stats.css` | Coherente con tarjetas de métricas |

**Intención explícita en código:** normalizar admin con farmacia (comentario en `admin-dashboard.component.css`).

### 2.2 Componentes y directivas compartidos

- `PaginationComponent` + `PaginationConfig` — usado p. ej. en usuarios.
- `DebounceDirective` — búsqueda con debounce.
- `ToastComponent` / `ToastService` — feedback no bloqueante.
- `ConfirmationService` — confirmaciones async (sustituye progresivamente `confirm()` nativo donde ya se adoptó).

### 2.3 Servicios de dominio

- **`AdminService`:** concentración de HTTP para usuarios, áreas, camas, pacientes, horarios; **caché** con `shareReplay` y métodos `clear*Cache()` tras mutaciones. Es el “API layer” del admin; otros roles podrían consumir subconjuntos o derivarse servicios por dominio si crece demasiado.

### 2.4 Otros

- `ExportService` (exportaciones desde gestión de usuarios).
- `ShiftRealtimeService` + `ShiftsService` en overview para tarjeta de turno en vivo.

---

## 3. Diseño (UI): candidatos a componentes o tokens

### 3.1 Shell del dashboard

**Bloque repetido:** `.admin-dashboard` → `.dashboard-header` → `.dashboard-body` → `.dashboard-nav` → `.dashboard-content`.

**Recomendación:** componente genérico tipo `app-dashboard-shell` con `@Input()` título, rol mostrado, slots o `ng-content` para nav y contenido; clase raíz configurable (`admin-dashboard` | `supervisor-dashboard`) o una sola clase `app-dashboard` + modificador BEM.

### 3.2 Modales

Patrón HTML repetido en varios hijos del admin: `modal-backdrop` → `modal-content` → `modal-header` / `modal-body` / `modal-footer`, cierre con click en backdrop y `stopPropagation` en el contenido.

**Recomendación:** `ModalShellComponent` (título, botón cerrar, proyección de cuerpo y pie) + **una** hoja de estilos compartida para tamaños (`modal-large`, etc.).

### 3.3 Encabezados de sección

`.section-header` + `.section-title` + acciones (botón actualizar, crear, etc.) aparecen en casi todas las pestañas.

**Recomendación:** `SectionHeaderComponent` con `title`, `optional` template para acciones derecha.

### 3.4 Controles neumórficos

Clases recurrentes: `neuro-btn`, `neuro-btn-icon`, `neuro-input`, `neuro-select`, badges tipo `neuro-status`.

**Recomendación:** mantenerlas como **capa de diseño** en CSS compartido; si se repiten grupos (label + input + error), un `FormFieldComponent` o directivas mínimas reducen ruido en plantillas largas (p. ej. pacientes).

### 3.5 Estados de lista

`loading-state`, grids de cards (`area-card`, `role-card`), tablas con contenedor scroll.

**Recomendación:** `LoadingStateComponent`, `EmptyStateComponent` con mensaje e icono opcional.

---

## 4. Acciones y lógica: candidatos a servicios / utilidades / patrones

### 4.1 Pestañas con persistencia y “lazy mount”

Lógica en `AdminDashboardComponent`: `allowedTabs`, `visitedTabs`, `persistActiveTab` / `restoreActiveTab`, `setActiveTab`, `hasVisitedTab`.

**Recomendación:** `DashboardTabStateService` inyectable con factory por `storageKey`, o directiva + `signal`/`model` si se migra a un enfoque más moderno; el objetivo es **copiar el mismo comportamiento** en supervisor sin duplicar 40 líneas.

### 4.2 Perfil de usuario (modal en admin)

Edición de nombre, apellido, username, email vía `AdminService.updateUser` + actualización de `AuthService.currentUser` y `localStorage`.

**Recomendación:** componente `ProfileEditModalComponent` + método único en `AuthService` o pequeño `UserProfileService` para “persistir sesión tras patch”.

**Inconsistencia actual:** éxito/error con `alert()` en el shell admin, mientras otras pantallas usan `ToastService`. Unificar en toast mejora reutilización del flujo de feedback.

### 4.3 Búsqueda con debounce

`UsersManagementComponent` monta `Subject` + `debounceTime` manualmente aunque existe `DebounceDirective`.

**Recomendación:** una sola estrategia (directiva o servicio `createSearchStream()`) para el resto de listas paginadas.

### 4.4 CRUD genérico (opcional, a largo plazo)

Muchas pestañas siguen: cargar lista → modal crear/editar → confirmar borrado → invalidar caché. No hace falta un framework CRUD completo; sí **plantillas** o una clase base mínima con `loading`, `error`, `reload()` si se repite el mismo boilerplate.

### 4.5 `AdminService` monolítico

Interfaces `Area`, `Bed`, `Patient`, `Schedule` viven en el mismo archivo que el servicio.

**Recomendación gradual:** mover tipos a `models/admin.types.ts` (o por dominio); opcionalmente dividir el servicio en `AdminUsersApi`, `AdminAreasApi`, etc., manteniendo la misma API pública durante la transición.

---

## 5. Mapa rápido de dependencias (admin → app)

```
AdminDashboardComponent
├── AuthService, AdminService, Router
├── OverviewComponent → AdminService, ToastService, ShiftsService, ShiftRealtimeService
├── UsersManagementComponent → AdminService, ToastService, ConfirmationService, ExportService, Pagination, Debounce
├── StaffManagementComponent
├── AreasManagementComponent
├── BedsManagementComponent
├── PatientsManagementComponent (formularios reactivos extensos)
└── SchedulesManagementComponent
```

---

## 6. Prioridades sugeridas (orden práctico)

1. **Shell compartido** admin / supervisor (máximo impacto visual y de mantenimiento).
2. **Modal shell** + estilos unificados (muchas plantillas HTML largas).
3. **Unificar feedback** (`ToastService` en perfil admin; revisar otros `alert()`).
4. **`SectionHeader` + estados loading/empty** (mejora densidad y lectura).
5. **Servicio o helper de tabs** con persistencia.
6. **Refactor de tipos y troceo de `AdminService`** cuando el equipo toque backend de admin con frecuencia.

---

## 7. Principio rector (para futuros PR)

> **Reutilizar primero lo que ya está en `shared/`** (estilos, paginación, toast, confirmación, export); **extraer solo cuando el mismo marcado o la misma secuencia de acciones aparezca en dos sitios**; mantener standalone components y rutas lazy como están salvo que se defina un feature module por negocio.

Este documento es **solo contexto**; los cambios concretos de código deben acotarse a tareas explícitas y revisar impacto en farmacia/enfermera porque comparten tokens de layout.
