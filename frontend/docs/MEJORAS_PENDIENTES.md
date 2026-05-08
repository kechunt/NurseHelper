# Mejoras pendientes y backlog (NurseHelper)

Este archivo recoge **lo que no está en la lista maestra numerada** de [`MEJORAS.md`](./MEJORAS.md) (lista maestra **1–168** como **Hechas** en el estado actual del repo) y lo que se dejó explícitamente como *opcional* o *después* en el historial.

Úsalo para **priorizar el siguiente trabajo** sin mezclar con el registro histórico cerrado.

---

## Estado de la lista maestra (`MEJORAS.md`)

| Situación | Acción |
|-----------|--------|
| Todas las filas numeradas en `MEJORAS.md` **Hechas** | Las nuevas mejoras numeradas se añaden primero en **este** archivo (borrador + prioridad) y, al comprometerlas, una fila nueva en `MEJORAS.md` con estado **Pendiente** o **En curso**. (Lista maestra actual: 1–168 hechas.) |

---

## Pendientes / backlog sugerido (prioridad descendente)

Las filas no tienen número fijo hasta que pasen a `MEJORAS.md`.

| ID backlog | Tema | Origen | Notas |
|------------|------|--------|--------|
| B-01 | ~~**VM u objeto único** para los `@Input` de `nurse-dashboard-overlays-stack`~~ **Hecho** | Mejora 4, nota de cierre | `NurseDashboardOverlaysStackVm` + `[vm]="overlaysStackVm"`; sincronización estable en `ngDoCheck` del padre (`syncOverlaysStackVmFromState`). Ver también **#74** en `MEJORAS.md`. |
| B-02 | ~~**`console.*` → `logger`** en `backend/src/__tests__/**`, `seeds/**`, `migrations/**`~~ **Hecho** | Mejora 2, historial | Reemplazado por `logger` en seeds, migraciones antiguas y tests de integración/scripts (`run-full-test.ts` + `integration/*.test.ts`). Ver **#75** en `MEJORAS.md`. |
| B-03 | **Partir `nurse-dashboard.component.ts`** (servicios dedicados o facade por dominio) | Evolución natural post–mejora 4 | **Parcial aplicado:** **#76–#87** + helpers (**#106**…**#142**: admin camas toasts **#142**, personal **#141**, horarios **#139–#140**, confirm **#138**…). Pendiente facade/servicios por dominio. |
| B-04 | **Más cobertura de tests** (e2e, componentes nurse-dashboard hijos, otros controladores) | Mejora 7 ampliada | Avance: **#88**–**#105**; E2E auth/nav (**#107**…**#131** register→login); rutas públicas (**#118**–**#122**); UX admin **#139–#140**; specs **`schedules-management`** (**#143**), **`staff-management`** (**#144**), **`beds-management`** (**#145**), **`admin-dashboard`** (**#147**), **`supervisor-dashboard`** (**#148**), **`pharmacy-dashboard`** (**#149**), **`nurse-dashboard-main-nav`** (**#150**), **`nurse-handover-modal`** (ARIA vía **#151**), **`nurse-dashboard-overlays-stack`** (Escape vía **#152**), **`modal-focus-trap`** (**#153**), **`nurse-dashboard-main-nav-keyboard`** (**#154**, ejecutado en Chromium). Sigue: integración real, más backend, más e2e. |
| B-05 | **Auditoría de accesibilidad / i18n** en paneles neumórficos | Nuevo | **Parcial:** **#146**–**#168** (**#167**: toasts del **nurse-dashboard** en helpers; **#168**: toasts + confirm liberar cama en **modales** hijos). Pendiente: revisar literales restantes en vistas **admin/supervisor/farmacia** / otros si unifica alcance. |

---

## Orden sugerido para aplicar el backlog (cuando retomes mejora)

1. ~~**B-01**~~ — aplicado (objeto VM único + sync en `DoCheck`).
2. ~~**B-02**~~ — aplicado (`logger` en tests integración/scripts + seeds + migraciones).
3. **B-03** continuar por fases (ya iniciado en **#76** con tareas rápidas).
4. **B-04** / **B-05** según necesidad de producto o release.

---

## Cómo sincronizar con `MEJORAS.md`

1. Elegir un ítem de la tabla **Pendientes / backlog**.
2. Si pasa a ser “oficial” para el equipo, añadir fila **#168** (o siguiente) en `MEJORAS.md` → **Pendiente**.
3. Al implementar, seguir el flujo de `MEJORAS.md` (historial + **Hecha**).
4. Tachar o mover aquí el ítem cumplido (o dejar una línea “Hecho → ver historial MEJORAS fecha …”).

---

*Última revisión: **#168** (toasts modales enfermería + confirm editar cama); siguiente sugerido **#169** (i18n admin/supervisor/farmacia u otros literales); lista maestra **1–168**.* 
