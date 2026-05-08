/**
 * Rutas de archivos fuente y ejemplos mínimos para copiar/pegar al normalizar UI.
 * Los estilos reales se cargan vía design-catalog.imports.css (no hay CSS duplicado “fantasma”).
 */
/**
 * Lista alineada con `design-catalog.imports.css` (ruta relativa a `frontend/src/app/` salvo primera columna «shared»…).
 */
export const DESIGN_CATALOG_IMPORTS_MANIFEST = [
  'shared/styles/table-actions-normalized.css',
  'shared/styles/dashboard-layout.css',
  'shared/styles/admin-panel-neomorphic.shared.css',
  'shared/styles/admin-table-unified.css',
  'shared/styles/admin-assign-modal.shared.css',
  'shared/styles/admin-panel-responsive.css',
  'shared/styles/dashboard-overview-stats.css',
  'shared/styles/auth-pages.css',
  'components/login/login.component.css',
  'components/register/register.component.css',
  'components/verify-email/verify-email.component.css',
  'components/terms-modal/terms-modal.component.css',
  'components/admin-dashboard/admin-dashboard.component.css',
  'components/admin-dashboard/overview/overview.component.css',
  'shared/components/pagination/pagination.component.css',
  'shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component.css',
  'shared/components/admin-toggle-button/admin-toggle-button.component.css',
  'shared/components/dashboard-user-profile-modal/dashboard-user-profile-modal.component.css',
  'components/admin-dashboard/areas-management/areas-management.component.css',
  'components/admin-dashboard/beds-management/beds-management.component.css',
  'components/admin-dashboard/patients-management/patients-management.component.css',
  'components/admin-dashboard/schedules-management/schedules-management.component.css',
  'components/admin-dashboard/staff-management/staff-management.component.css',
  'components/admin-dashboard/users-management/users-management.component.css',
  'components/pharmacy-dashboard/pharmacy-dashboard.component.css',
  'components/confirmation-modal/confirmation-modal.component.css',
  'components/toast/toast.component.css',
  'components/toast-container/toast-container.component.css',
  'components/loading-spinner/loading-spinner.component.css',
  'components/nurse-dashboard/nurse-neomorphic-modal.shared.css',
  'components/nurse-dashboard/nurse-dashboard.component.css',
  'components/nurse-dashboard/nurse-add-medication-modal/nurse-add-medication-modal.component.css',
  'components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.css',
  'components/nurse-dashboard/nurse-beds-section/nurse-beds-section.component.css',
  'components/nurse-dashboard/nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component.css',
  'components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.css',
  'components/nurse-dashboard/nurse-dashboard-main-nav/nurse-dashboard-main-nav.component.css',
  'components/nurse-dashboard/nurse-dashboard-overlays-stack/nurse-dashboard-overlays-stack.component.css',
  'components/nurse-dashboard/nurse-delete-medication-modal/nurse-delete-medication-modal.component.css',
  'components/nurse-dashboard/nurse-edit-bed-modal/nurse-edit-bed-modal.component.css',
  'components/nurse-dashboard/nurse-handover-modal/nurse-handover-modal.component.css',
  'components/nurse-dashboard/nurse-history-detail-modal/nurse-history-detail-modal.component.css',
  'components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.css',
  'components/nurse-dashboard/nurse-medication-day-detail-modal/nurse-medication-day-detail-modal.component.css',
  'components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.css',
  'components/nurse-dashboard/nurse-patient-history-tab/nurse-patient-history-tab.component.css',
  'components/nurse-dashboard/nurse-patient-medications-tab/nurse-patient-medications-tab.component.css',
  'components/nurse-dashboard/nurse-patient-modal-shell/nurse-patient-modal-shell.component.css',
  'components/nurse-dashboard/nurse-patient-observations-tab/nurse-patient-observations-tab.component.css',
  'components/nurse-dashboard/nurse-patient-treatments-day-tab/nurse-patient-treatments-day-tab.component.css',
  'components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.css',
  'components/nurse-dashboard/nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component.css',
  'components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.css',
  'components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.css',
  'components/nurse-dashboard/nurse-pharmacy-patients-modal/nurse-pharmacy-patients-modal.component.css',
  'components/nurse-dashboard/nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
  'components/nurse-dashboard/nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component.css',
  'components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.css',
  'components/nurse-dashboard/nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.css',
  'components/nurse-dashboard/nurse-schedule-slots-modal/nurse-schedule-slots-modal.component.css',
  'components/nurse-dashboard/nurse-summary-section/nurse-summary-section.component.css',
  'components/nurse-dashboard/nurse-suspend-medication-modal/nurse-suspend-medication-modal.component.css',
  'components/nurse-dashboard/nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.css',
  'components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.css',
  'components/nurse-dashboard/nurse-treatment-postpone-modal/nurse-treatment-postpone-modal.component.css',
  'components/use-case-diagram/use-case-diagram.component.css',
].join('\n');

export const DESIGN_CATALOG_SNIPPETS = {
  importsManifest: DESIGN_CATALOG_IMPORTS_MANIFEST,

  paths: {
    adminNeomorphicShared: 'frontend/src/app/shared/styles/admin-panel-neomorphic.shared.css',
    adminTableUnified: 'frontend/src/app/shared/styles/admin-table-unified.css',
    adminAssignModalShared: 'frontend/src/app/shared/styles/admin-assign-modal.shared.css',
    tableActionsNormalized: 'frontend/src/app/shared/styles/table-actions-normalized.css',
    loginCss: 'frontend/src/app/components/login/login.component.css',
    registerCss: 'frontend/src/app/components/register/register.component.css',
    authPagesCss: 'frontend/src/app/shared/styles/auth-pages.css',
    dashboardLayoutCss: 'frontend/src/app/shared/styles/dashboard-layout.css',
    adminDashboardCss: 'frontend/src/app/components/admin-dashboard/admin-dashboard.component.css',
    patientsCss: 'frontend/src/app/components/admin-dashboard/patients-management/patients-management.component.css',
    staffCss: 'frontend/src/app/components/admin-dashboard/staff-management/staff-management.component.css',
    bedsCss: 'frontend/src/app/components/admin-dashboard/beds-management/beds-management.component.css',
    areasCss: 'frontend/src/app/components/admin-dashboard/areas-management/areas-management.component.css',
    schedulesCss: 'frontend/src/app/components/admin-dashboard/schedules-management/schedules-management.component.css',
    rowActionsModalCss:
      'frontend/src/app/shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component.css',
    paginationCss: 'frontend/src/app/shared/components/pagination/pagination.component.css',
    pharmacyCss: 'frontend/src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.css',
    nurseCss: 'frontend/src/app/components/nurse-dashboard/nurse-dashboard.component.css',
    nurseModalSharedCss: 'frontend/src/app/components/nurse-dashboard/nurse-neomorphic-modal.shared.css',
  },

  apmBtn: `<button type="button" class="apm-btn">Primario</button>
<button type="button" class="apm-btn apm-btn--outline">Secundario</button>
<button type="button" class="apm-btn apm-btn--danger">Destructivo (texto)</button>`,

  apmFilter: `<button type="button" class="apm-btn apm-btn--filter">Disponibles</button>
<button type="button" class="apm-btn apm-btn--filter active">Activo (hundido)</button>`,

  apmCard: `<div class="apm-area-card">
  <div class="apm-area-card__header">
    <h4 class="apm-area-card__title">SALA-12</h4>
    <span class="apm-status-pill apm-status-pill--busy">OCUPADA</span>
  </div>
  <p class="apm-area-description"><strong>Paciente:</strong> Ejemplo</p>
</div>`,

  apmShift: `<div class="apm-shift-block">
  <div class="apm-shift-heading">Enfermera(s) en este turno</div>
  <ul class="apm-shift-nurse-list"><li>Ana López</li></ul>
</div>
<button type="button" class="apm-shift-alert apm-shift-alert--clickable">Aviso cobertura (clicable)</button>`,

  apmModalShell: `<div class="apm-backdrop">
  <div class="apm-shell apm-shell--large" (ejemplo)>
    <div class="apm-header"><h3>Título</h3></div>
    <div class="apm-body">…</div>
  </div>
</div>`,

  assignModal: `<div class="admin-assign-modal-backdrop">
  <div class="admin-assign-modal-content">
    <div class="admin-assign-modal-header"><h3>Modal asignación</h3></div>
    <div class="admin-assign-modal-body"><p class="apm-field-label">Campo</p></div>
  </div>
</div>`,

  neuroTable: `<table class="neuro-table">
  <thead><tr><th>Nombre</th><th>Estado</th></tr></thead>
  <tbody>
    <tr class="admin-table-row--clickable"><td>Paciente</td><td><span class="neuro-status active">Activo</span></td></tr>
  </tbody>
</table>`,

  filtersStaff: `<div class="filters-container">
  <div class="filter-group"><label>Área</label><select class="neuro-select"><option>Todas</option></select></div>
</div>`,

  nurseCard: `<div class="nurse-card" style="max-width:320px">
  <div class="nurse-card-header">…</div>
</div>`,

  pagination: `<div class="pagination-container">
  <div class="pagination-controls">
    <button type="button" class="pagination-btn">‹</button>
    <button type="button" class="pagination-btn active">1</button>
    <button type="button" class="pagination-btn">›</button>
  </div>
</div>`,

  schedulesAttendance: `<button type="button" class="badge-shift-neuro active">Presentes: 3</button>
<button type="button" class="btn-attendance">Marcar presente</button>
<input class="input-neuro" placeholder="Buscar…" />`,

  pharmacy: `<button type="button" class="btn-danger-neuro">Rechazar</button>
<span class="stock-info-badge available">En stock</span>`,

  nurseActions: `<button type="button" class="add-task-btn-neuro">+</button>
<button type="button" class="filter-btn-neuro active">Hoy</button>
<button type="button" class="view-patient-btn-neuro">Ver paciente</button>
<button type="button" class="complete-btn-neuro">Completar</button>`,
} as const;
