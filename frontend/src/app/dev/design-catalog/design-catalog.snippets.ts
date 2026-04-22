/**
 * Fragmentos de plantilla / estilos alineados con el código real del proyecto.
 * Referencias: login, register, nurse-dashboard, patients-management, schedules-management, pagination, pharmacy-dashboard.
 */
export const DESIGN_CATALOG_SNIPPETS = {
  loginCard:
    `<div class="login-card">\n  <input class="neuro-input" type="email" placeholder="Correo" />\n  <button type="button" class="neuro-btn">Entrar</button>\n  <div class="error-message">Mensaje de error</div>\n</div>`,

  loginCss: `frontend/src/app/components/login/login.component.css`,

  registerSelectCheckbox:
    `<select class="neuro-select">\n  <option>Rol</option>\n</select>\n<label class="neuro-checkbox">\n  <input type="checkbox" /> Acepto términos\n</label>`,

  registerCss: `frontend/src/app/components/register/register.component.css`,

  primaryButtons:
    `<button type="button" class="btn-primary-neuro">Primario</button>\n<button type="button" class="btn-secondary-neuro">Secundario</button>\n<button type="button" class="neuro-btn outlined">Outlined</button>`,

  nurseActions:
    `<button type="button" class="add-task-btn-neuro" title="Acción">+</button>\n<button type="button" class="filter-btn-neuro active">Filtro</button>\n<button type="button" class="view-patient-btn-neuro">Ver paciente</button>\n<button type="button" class="complete-btn-neuro">Completar</button>\n<button type="button" class="not-administered-btn-neuro">No administrado</button>\n<button type="button" class="save-observation-btn-neuro small">Guardar</button>`,

  nurseCss: `frontend/src/app/components/nurse-dashboard/nurse-dashboard.component.css`,

  headerIcon:
    `<button type="button" class="neuro-btn-icon logout-btn" title="Salir">⎋</button>`,

  tableActionsCss: `frontend/src/app/shared/styles/table-actions-normalized.css`,

  neuroTable:
    `<table class="neuro-table">\n  <thead><tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>\n  <tbody>\n    <tr>\n      <td><span>Ejemplo</span></td>\n      <td><span class="neuro-status active">Activo</span></td>\n      <td>\n        <div class="action-buttons-table">\n          <button type="button" class="neuro-btn-icon success" title="Ok">✓</button>\n          <button type="button" class="neuro-btn-icon danger" title="Eliminar">✕</button>\n        </div>\n      </td>\n    </tr>\n  </tbody>\n</table>`,

  patientsCss: `frontend/src/app/components/admin-dashboard/patients-management/patients-management.component.css`,

  toggleAndLarge:
    `<button type="button" class="toggle-btn-neuro">Alternar sección</button>\n<button type="button" class="neuro-btn-large">neuro-btn-large</button>\n<button type="button" class="neuro-btn-small">Small</button>`,

  schedulesHeader:
    `<div class="section-header-neuro">\n  <h2 class="section-title-neuro">Turnos</h2>\n  <button type="button" class="btn-save-neuro">Guardar</button>\n</div>`,

  schedulesFilters:
    `<div class="filters-neuro">\n  <div class="filter-item-neuro">\n    <label>Desde</label>\n    <input class="input-neuro" type="date" />\n  </div>\n  <div class="filter-item-neuro">\n    <label>Área</label>\n    <select class="select-neuro"><option>—</option></select>\n  </div>\n</div>`,

  schedulesExtraButtons:
    `<button type="button" class="btn-save-nurse-neuro">Guardar enfermera</button>\n<button type="button" class="btn-close-neuro">Cerrar</button>\n<button type="button" class="btn-cancel-neuro">Cancelar</button>`,

  schedulesCss: `frontend/src/app/components/admin-dashboard/schedules-management/schedules-management.component.css`,

  pagination:
    `<div class="pagination-container">\n  <div class="pagination-info">\n    <span>Mostrando 1 - 10 de 100</span>\n    <select class="items-per-page-select">\n      <option>10 por página</option>\n    </select>\n  </div>\n  <div class="pagination-controls">\n    <button type="button" class="pagination-btn">Anterior</button>\n    <button type="button" class="pagination-btn active">1</button>\n    <button type="button" class="pagination-btn">Siguiente</button>\n  </div>\n</div>`,

  paginationCss: `frontend/src/app/shared/components/pagination/pagination.component.css`,

  overviewStats:
    `<div class="stats-grid">\n  <div class="stat-card">\n    <div class="stat-icon">👤</div>\n    <div class="stat-content">\n      <p class="stat-value">42</p>\n      <p class="stat-label">Pacientes</p>\n    </div>\n  </div>\n</div>`,

  overviewCss: `frontend/src/app/components/admin-dashboard/overview/overview.component.css`,

  bedsFilters:
    `<button type="button" class="filter-btn">Todos</button>\n<button type="button" class="filter-btn active">Activos</button>`,

  bedsCss: `frontend/src/app/components/admin-dashboard/beds-management/beds-management.component.css`,

  areasStatus:
    `<span class="neuro-status active">Activo</span>\n<span class="neuro-status inactive">Inactivo</span>`,

  areasCss: `frontend/src/app/components/admin-dashboard/areas-management/areas-management.component.css`,

  pharmacyDanger:
    `<button type="button" class="btn-danger-neuro">Rechazar / peligro</button>\n<span class="stock-info-badge available">En stock</span>\n<span class="stock-info-badge unavailable">Agotado</span>`,

  pharmacyCss: `frontend/src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.css`,

  termsModal:
    `<button type="button" class="neuro-btn outlined">Cerrar términos</button>\n<button type="button" class="neuro-btn">Aceptar</button>`,

  termsCss: `frontend/src/app/components/terms-modal/terms-modal.component.css`,

  designTokens:
    `design-catalog/css/design-tokens.css`,

  neuroBase:
    `design-catalog/css/neuro-base.css`,

  statCardNurse:
    `<div class="stat-card clickable">\n  <div class="stat-icon">📋</div>\n  <div class="stat-content">...</div>\n</div>`,

  patientFormSection:
    `<div class="patient-form-section">\n  <div class="form-section">\n    <h3>Datos</h3>\n    <input class="neuro-input" placeholder="Campo" />\n  </div>\n</div>`,

  areaSectionBeds:
    `<div class="area-section">\n  <p>Contenedor por área (gestión de camas)</p>\n</div>`,

  filtersPatients:
    `<div class="filters-container">\n  <div class="filter-box">\n    <label>Buscar</label>\n    <input class="neuro-input search-input" placeholder="..." />\n  </div>\n  <div class="filter-box">\n    <label>Estado</label>\n    <select class="neuro-select"><option>Todos</option></select>\n  </div>\n</div>`,

  filtersUsers:
    `<div class="filters-container">\n  <div class="filter-group">\n    <label>Rol</label>\n    <select class="neuro-select">...</select>\n  </div>\n  <div class="filter-group search-group">\n    <label>Buscar</label>\n    <input class="neuro-input search-input" />\n  </div>\n</div>`,

  resultsInfo: `<div class="results-info"><p>Mostrando 10 de 120 usuarios</p></div>`,

  shiftsTable:
    `<div class="table-wrapper-neuro">\n  <table class="shifts-table-neuro">\n    <thead><tr><th>Enfermera</th><th>Lun</th><th>Acciones</th></tr></thead>\n    <tbody>\n      <tr class="row-neuro">\n        <td class="cell-nurse-neuro"><strong>Ana</strong></td>\n        <td class="cell-day-neuro">\n          <select class="select-day-neuro shift-morning"><option>Mañana</option></select>\n        </td>\n        <td class="cell-actions-neuro">\n          <button type="button" class="btn-save-nurse-neuro">Guardar</button>\n        </td>\n      </tr>\n    </tbody>\n  </table>\n</div>`,

  schedulesSummary:
    `<div class="summary-section-neuro">\n  <h3 class="title-summary-neuro">Resumen</h3>\n  <div class="area-box-neuro">...</div>\n</div>`,

  schedulesLoading:
    `<div class="loading-neuro"><p>Cargando turnos...</p></div>\n<div class="empty-neuro"><p>Sin datos</p></div>`,

  unifiedTasksTable:
    `<div class="unified-table-container">\n  <table class="unified-tasks-table">\n    <thead><tr><th>Tarea</th><th>Estado</th><th>Acciones</th></tr></thead>\n    <tbody>\n      <tr>\n        <td><span>Control signos</span></td>\n        <td><span>Pendiente</span></td>\n        <td>\n          <div class="action-buttons-table">\n            <button type="button" class="action-btn-compact success">✓</button>\n          </div>\n        </td>\n      </tr>\n    </tbody>\n  </table>\n</div>`,

  patientsTableAreas:
    `<div class="patients-table-container">\n  <table class="patients-table">\n    <thead><tr><th>Paciente</th><th>Cama</th></tr></thead>\n    <tbody><tr><td><span>López</span></td><td><span>12A</span></td></tr></tbody>\n  </table>\n</div>`,

  roleCard:
    `<div class="role-cards-container">\n  <div class="role-card">\n    <div class="role-card-content">\n      <div class="role-card-info">\n        <h4>María Supervisor</h4>\n        <p class="role-card-username">@msup</p>\n        <span class="neuro-status role-supervisor">Supervisor</span>\n      </div>\n      <div class="role-card-actions">\n        <button type="button" class="neuro-btn-icon" title="Rol">⚙</button>\n      </div>\n    </div>\n  </div>\n</div>`,

  usersCss: `frontend/src/app/components/admin-dashboard/users-management/users-management.component.css`,

  nurseCardStaff:
    `<div class="nurses-grid">\n  <div class="nurse-card">\n    <div class="nurse-card-header">...</div>\n    <div class="nurse-details">\n      <div class="detail-item">\n        <span class="detail-label">Área</span>\n        <span class="detail-value">UCI</span>\n      </div>\n    </div>\n  </div>\n</div>`,

  staffCss: `frontend/src/app/components/admin-dashboard/staff-management/staff-management.component.css`,

  pharmacyRowBadges:
    `<span class="priority-badge urgent">Urgente</span>\n<span class="priority-badge high">Alta</span>\n<span class="status-badge pending">Pendiente</span>\n<span class="status-badge ready">Lista</span>\n<div class="action-buttons-pharmacy">\n  <button type="button" class="action-btn-compact">👁</button>\n  <button type="button" class="action-btn-compact accept-btn">✓</button>\n</div>`,

  modalPatientTabs:
    `<div class="modal-backdrop">\n  <div class="modal-content">\n    <div class="modal-header">\n      <h3>Paciente</h3>\n      <button type="button" class="close-btn" aria-label="Cerrar">×</button>\n    </div>\n    <div class="tabs-container">\n      <button type="button" class="tab active">Datos</button>\n      <button type="button" class="tab">Historial</button>\n    </div>\n    <div class="modal-body scrollable">...</div>\n  </div>\n</div>`,

  sectionHeaderCollapsible:
    `<div class="section-header collapsible-header">\n  <h2 class="section-title">Ingreso de paciente</h2>\n  <div class="header-actions">\n    <button type="button" class="toggle-btn-neuro">Alternar</button>\n  </div>\n</div>`,
} as const;
