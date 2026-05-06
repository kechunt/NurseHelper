# Checklist: modularización y reutilización (NurseHelper frontend)

**Léeme primero** en tareas que toquen UI admin, paneles compartidos, servicios de dominio o duplicación de patrones (modales, tablas, botones).

Este documento es corto y accionable. El detalle arquitectónico sigue en [`ADMIN_MODULARIZACION_REUTILIZACION.md`](./ADMIN_MODULARIZACION_REUTILIZACION.md).

---

## Antes de escribir código

1. **¿Ya existe en `shared/`?** Estilos (`admin-panel-responsive`, `admin-table-unified`, `dashboard-layout`, `table-actions-normalized`), componentes (`PaginationComponent`, `ToastService`, `ConfirmationService`), directivas (`DebounceDirective`).
2. **¿Misma acción en otro hijo de admin?** Copiar el marcado y clases de un módulo que ya esté alineado (p. ej. `users-management`, `areas-management`) en lugar de inventar clases nuevas.
3. **Botones:** preferir **`neuro-btn`** + **`neuro-btn outlined`** (cancelar / secundario) como en el resto del panel admin; evitar enlaces disfrazados de botón para acciones principales.
4. **Modales:** mismo esqueleto `modal-backdrop` → `modal-content` → `modal-header` / `modal-body` / `modal-footer`; si el flujo se repite, candidato a extraer `ModalShellComponent` (ver doc admin).
5. **Datos / API:** **`AdminService`** + invalidación de caché; no duplicar llamadas HTTP si otro componente ya expone el mismo flujo.
6. **Lógica repetida:** extraer un método privado compartido (p. ej. validación de `assignedAreaId`) en lugar de copiar bloques `if` + `alert`.

---

## Al terminar un cambio

- [ ] No se añadieron estilos globales innecesarios; lo específico del feature vive en el CSS del componente o en `shared/styles` solo si se reutilizará.
- [ ] Nombres y estructura de plantilla coherentes con el archivo vecino más parecido.
- [ ] Si se tocó una regla compartida, comprobar impacto en farmacia / enfermera / supervisor (mismos tokens en varios dashboards).

---

## Objetivo

> Menos superficies únicas, más **reuso explícito** (clases, servicios, patrones de modal) y extracción a `shared/` solo cuando haya **dos usos reales** o un requisito claro de consistencia.
