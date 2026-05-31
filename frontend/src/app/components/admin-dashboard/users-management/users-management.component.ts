import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AdminService } from '../../../services/admin.service';
import { User } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { forkJoin } from 'rxjs';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ExportService } from '../../../shared/services/export.service';
import { ShiftsService } from '../../../services/shifts.service';
import { ShiftRealtimeService } from '../../../shared/services/shift-realtime.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { DebounceDirective } from '../../../shared/directives/debounce.directive';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { SectionHeaderComponent } from '../../../shared/components/section-header/section-header.component';
import { AdminEmptyStateComponent } from '../../../shared/components/admin-empty-state/admin-empty-state.component';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, DebounceDirective, AdminTableRowActionsModalComponent, BootstrapIconComponent, ModalShellComponent, SectionHeaderComponent, AdminEmptyStateComponent],
  templateUrl: './users-management.component.html',
  styleUrl: './users-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersManagementComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  loading = false;
  
  // Paginación
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 25,
    totalPages: 0
  };
  
  // Debounce para búsqueda
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  showEditModal = false;
  selectedUser: User | null = null;
  /** Fila tabla: acciones en hoja inferior. */
  userRowActionsTarget: User | null = null;
  editForm: Partial<User> = {};
  
  // Filtros
  selectedRole: 'all' | 'admin' | 'nurse' | 'supervisor' | 'pharmacy' = 'all';
  selectedShiftPresence: 'all' | 'onShift' | 'offShift' = 'all';
  searchQuery: string = '';
  liveShiftLabel = '';
  private userShiftPresence = new Map<number, boolean>();
  
  // Información de paginación (si el backend la devuelve)
  totalUsers: number = 0;

  // Jefas de enfermeras y encargado de farmacia
  supervisors: User[] = [];
  pharmacyUsers: User[] = [];
  loadingSupervisors = false;
  loadingPharmacy = false;

  readonly usersMgmtSectionTitle = $localize`:@@usersMgmt.sectionTitle:Gestión de Usuarios`;
  readonly usersMgmtRefresh = $localize`:@@usersMgmt.refresh:Actualizar`;
  readonly usersMgmtSupervisorsTitle = $localize`:@@usersMgmt.supervisorsTitle:Jefas de Enfermeras`;
  readonly usersMgmtLoadingSupervisors = $localize`:@@usersMgmt.loadingSupervisors:Cargando jefas de enfermeras...`;
  readonly usersMgmtEmptySupervisors = $localize`:@@usersMgmt.emptySupervisors:No hay jefas de enfermeras asignadas`;
  readonly usersMgmtEditUserTitle = $localize`:@@usersMgmt.editUserTitle:Editar usuario`;
  readonly usersMgmtPharmacyTitle = $localize`:@@usersMgmt.pharmacyTitle:Encargado de Farmacia`;
  readonly usersMgmtLoadingPharmacy = $localize`:@@usersMgmt.loadingPharmacy:Cargando encargado de farmacia...`;
  readonly usersMgmtEmptyPharmacy = $localize`:@@usersMgmt.emptyPharmacy:No hay encargado de farmacia asignado`;
  readonly usersMgmtFilterRoleLabel = $localize`:@@usersMgmt.filterRole:Filtrar por Rol:`;
  readonly usersMgmtFilterShiftLabel = $localize`:@@usersMgmt.filterShift:Presencia en turno:`;
  readonly usersMgmtSearchLabel = $localize`:@@usersMgmt.searchLabel:Buscar Usuario:`;
  readonly usersMgmtSearchPlaceholder = $localize`:@@usersMgmt.searchPlaceholder:Buscar por nombre, usuario, email o teléfono...`;
  readonly usersMgmtSearchAria = $localize`:@@usersMgmt.searchAria:Buscar usuario por nombre, usuario, email o teléfono`;
  readonly usersMgmtClearFilters = $localize`:@@usersMgmt.clearFilters:Limpiar Filtros`;
  readonly usersMgmtLoadingUsers = $localize`:@@usersMgmt.loadingUsers:Cargando usuarios...`;
  readonly usersMgmtExportPanelAria = $localize`:@@usersMgmt.exportPanelAria:Exportar listado de usuarios`;
  readonly usersMgmtExportTitle = $localize`:@@usersMgmt.exportTitle:Exportar usuarios`;
  readonly usersMgmtExportHint = $localize`:@@usersMgmt.exportHint:Se exportan los usuarios visibles con los filtros y la búsqueda actuales. El nombre del archivo incluye la fecha de generación.`;
  readonly usersMgmtExportPdf = $localize`:@@usersMgmt.exportPdf:PDF`;
  readonly usersMgmtExportSaveCsv = $localize`:@@usersMgmt.exportSaveCsv:Guardar CSV`;
  readonly usersMgmtPdfUsersTitle = $localize`:@@usersMgmt.pdfUsersTitle:Listado de usuarios`;
  readonly usersMgmtPdfGeneratedPrefix = $localize`:@@usersMgmt.pdfGeneratedPrefix:Generado:`;
  readonly usersMgmtWarnExportEmpty = $localize`:@@usersMgmt.warnExportEmpty:No hay usuarios para exportar con los filtros actuales`;
  readonly usersMgmtTableAria = $localize`:@@usersMgmt.tableAria:Tabla de usuarios`;
  readonly usersMgmtColId = $localize`:@@usersMgmt.colId:ID`;
  readonly usersMgmtColUsername = $localize`:@@usersMgmt.colUsername:Usuario`;
  readonly usersMgmtColEmail = $localize`:@@usersMgmt.colEmail:Email`;
  readonly usersMgmtColFullName = $localize`:@@usersMgmt.colFullName:Nombre Completo`;
  readonly usersMgmtColPhone = $localize`:@@usersMgmt.colPhone:Teléfono`;
  readonly usersMgmtColRole = $localize`:@@usersMgmt.colRole:Rol`;
  readonly usersMgmtColStatus = $localize`:@@usersMgmt.colStatus:Estado`;
  readonly usersMgmtNoResults = $localize`:@@usersMgmt.noResults:No se encontraron usuarios que coincidan con los filtros seleccionados.`;
  readonly usersMgmtResultsHeading = $localize`:@@usersMgmt.resultsHeading:Resultados del listado`;
  readonly usersMgmtStatusActive = $localize`:@@usersMgmt.statusActive:Activo`;
  readonly usersMgmtStatusInactive = $localize`:@@usersMgmt.statusInactive:Inactivo`;
  readonly usersMgmtSheetTitle = $localize`:@@usersMgmt.sheetTitle:Usuario`;
  readonly usersMgmtSheetEdit = $localize`:@@usersMgmt.sheetEdit:Editar datos`;
  readonly usersMgmtSheetDelete = $localize`:@@usersMgmt.sheetDelete:Eliminar permanentemente`;
  readonly usersMgmtEditModalTitle = $localize`:@@usersMgmt.editModalTitle:Editar Usuario`;
  readonly usersMgmtRoleFilterOptions: ReadonlyArray<{
    value: 'all' | 'admin' | 'nurse' | 'supervisor' | 'pharmacy';
    label: string;
  }> = [
    { value: 'all', label: $localize`:@@usersMgmt.roleAll:Todos los roles` },
    { value: 'admin', label: $localize`:@@usersMgmt.roleAdmin:Administrador` },
    { value: 'nurse', label: $localize`:@@usersMgmt.roleNurse:Enfermera` },
    { value: 'supervisor', label: $localize`:@@usersMgmt.roleSupervisor:Supervisor` },
    { value: 'pharmacy', label: $localize`:@@usersMgmt.rolePharmacy:Farmacia` },
  ];

  readonly usersMgmtShiftFilterOptions: ReadonlyArray<{
    value: 'all' | 'onShift' | 'offShift';
    label: string;
  }> = [
    { value: 'all', label: $localize`:@@usersMgmt.shiftAll:Todos` },
    { value: 'onShift', label: $localize`:@@usersMgmt.shiftOn:Presentes en turno actual` },
    { value: 'offShift', label: $localize`:@@usersMgmt.shiftOff:Fuera del turno actual` },
  ];

  readonly usersMgmtShiftPresent = $localize`:@@usersMgmt.shiftPresentBadge:En turno`;
  readonly usersMgmtShiftAbsent = $localize`:@@usersMgmt.shiftAbsentBadge:Fuera de turno`;

  readonly usersMgmtWarnCompleteRequired = $localize`:@@usersMgmt.warnCompleteRequired:Por favor completa todos los campos requeridos`;
  readonly usersMgmtWarnInvalidEmail = $localize`:@@usersMgmt.warnInvalidEmail:Por favor ingresa un email válido`;
  readonly usersMgmtWarnPhoneTooLong = $localize`:@@usersMgmt.warnPhoneTooLong:El teléfono no puede superar 30 caracteres`;
  readonly usersMgmtConfirmNurseRoleTitle = $localize`:@@usersMgmt.confirmNurseRoleTitle:Cambiar rol de enfermera`;
  readonly usersMgmtConfirmNurseRoleMessage = $localize`:@@usersMgmt.confirmNurseRoleMessage:¿Estás seguro de cambiar el rol de esta enfermera?\n\nLos pacientes asignados a esta enfermera mantendrán su área pero quedarán sin enfermera asignada para poder asignar otra.`;
  readonly usersMgmtConfirmChangeRole = $localize`:@@usersMgmt.confirmChangeRole:Cambiar rol`;
  readonly usersMgmtConfirmCancel = $localize`:@@usersMgmt.confirmCancel:Cancelar`;
  readonly usersMgmtErrInvalidData = $localize`:@@usersMgmt.errInvalidData:Datos inválidos`;
  readonly usersMgmtErrUserNotFound = $localize`:@@usersMgmt.errUserNotFound:Usuario no encontrado`;
  readonly usersMgmtErrServerLater = $localize`:@@usersMgmt.errServerLater:Error del servidor. Por favor intenta más tarde.`;
  readonly usersMgmtErrUnknown = $localize`:@@usersMgmt.errUnknown:Error desconocido`;
  readonly usersMgmtErrServerInternal = $localize`:@@usersMgmt.errServerInternal:Error interno del servidor`;
  readonly usersMgmtToastUserUpdated = $localize`:@@usersMgmt.toastUserUpdated:Usuario actualizado exitosamente`;
  readonly usersMgmtToastUserUpdatedNurseExtra = $localize`:@@usersMgmt.toastUserUpdatedNurseExtra:. Los schedules de esta enfermera han sido desasignados. Los pacientes mantienen su área asignada.`;
  readonly usersMgmtErrUpdateUser = $localize`:@@usersMgmt.errUpdateUser:Error al actualizar el usuario`;
  readonly usersMgmtDeleteTitle = $localize`:@@usersMgmt.deleteTitle:Eliminar usuario permanentemente`;
  readonly usersMgmtDeletePermanent = $localize`:@@usersMgmt.deletePermanent:Eliminar permanentemente`;
  readonly usersMgmtToastUserDeleted = $localize`:@@usersMgmt.toastUserDeleted:Usuario eliminado permanentemente`;
  readonly usersMgmtToastUserDeletedNurseExtra = $localize`:@@usersMgmt.toastUserDeletedNurseExtra:. Los schedules de esta enfermera han sido desasignados. Los pacientes mantienen su área asignada.`;
  readonly usersMgmtErrDeleteUser = $localize`:@@usersMgmt.errDeleteUser:Error al eliminar el usuario`;
  readonly usersMgmtErrCannotDelete = $localize`:@@usersMgmt.errCannotDelete:No se puede eliminar este usuario`;
  readonly usersMgmtErrRestoreUser = $localize`:@@usersMgmt.errRestoreUser:Error al restaurar el usuario`;
  readonly usersMgmtErrLoadUsersUnknown = $localize`:@@usersMgmt.errLoadUsersUnknown:Error desconocido al cargar usuarios`;
  readonly usersMgmtErrLoadUsersConnect = $localize`:@@usersMgmt.errLoadUsersConnect:No se puede conectar al servidor. Verifica que el backend esté corriendo en http://localhost:3000`;
  readonly usersMgmtErrLoadUsers401 = $localize`:@@usersMgmt.errLoadUsers401:No autorizado. Tu sesión expiró. Por favor, cierra sesión y vuelve a iniciar sesión.`;
  readonly usersMgmtErrLoadUsers403 = $localize`:@@usersMgmt.errLoadUsers403:Acceso denegado. No tienes permisos para ver usuarios.`;
  readonly usersMgmtErrLoadSupervisors = $localize`:@@usersMgmt.errLoadSupervisors:Error al cargar supervisores`;
  readonly usersMgmtErrLoadPharmacy = $localize`:@@usersMgmt.errLoadPharmacy:Error al cargar usuarios de farmacia`;
  readonly usersMgmtExportColId = $localize`:@@usersMgmt.exportColId:ID`;
  readonly usersMgmtExportColUsername = $localize`:@@usersMgmt.exportColUsername:Usuario`;
  readonly usersMgmtExportColEmail = $localize`:@@usersMgmt.exportColEmail:Email`;
  readonly usersMgmtExportColFirstName = $localize`:@@usersMgmt.exportColFirstName:Nombre`;
  readonly usersMgmtExportColLastName = $localize`:@@usersMgmt.exportColLastName:Apellido`;
  readonly usersMgmtExportColPhone = $localize`:@@usersMgmt.exportColPhone:Teléfono`;
  readonly usersMgmtExportColRole = $localize`:@@usersMgmt.exportColRole:Rol`;
  readonly usersMgmtExportColStatus = $localize`:@@usersMgmt.exportColStatus:Estado`;

  /** Plantilla: resultados, modales y hoja (`@@usersMgmtHtml.*`). */
  readonly usersMgmtHtmlTableDash = $localize`:@@usersMgmtHtml.tableDash:—`;
  readonly usersMgmtHtmlSaveChanges = $localize`:@@usersMgmtHtml.saveChanges:Guardar Cambios`;
  readonly usersMgmtHtmlLabelUsername = $localize`:@@usersMgmtHtml.labelUsername:Usuario`;
  readonly usersMgmtHtmlPhUsername = $localize`:@@usersMgmtHtml.phUsername:Ingrese el nombre de usuario`;
  readonly usersMgmtHtmlLabelEmail = $localize`:@@usersMgmtHtml.labelEmail:Email`;
  readonly usersMgmtHtmlPhEmail = $localize`:@@usersMgmtHtml.phEmail:usuario@ejemplo.com`;
  readonly usersMgmtHtmlLabelFirstName = $localize`:@@usersMgmtHtml.labelFirstName:Nombres`;
  readonly usersMgmtHtmlPhFirstName = $localize`:@@usersMgmtHtml.phFirstName:Ingrese el nombre`;
  readonly usersMgmtHtmlLabelLastName = $localize`:@@usersMgmtHtml.labelLastName:Apellido`;
  readonly usersMgmtHtmlPhLastName = $localize`:@@usersMgmtHtml.phLastName:Ingrese el apellido`;
  readonly usersMgmtHtmlLabelPhone = $localize`:@@usersMgmtHtml.labelPhone:Teléfono`;
  readonly usersMgmtHtmlPhPhoneOptional = $localize`:@@usersMgmtHtml.phPhoneOptional:Opcional`;
  readonly usersMgmtHtmlLabelRole = $localize`:@@usersMgmtHtml.labelRole:Rol`;
  readonly usersMgmtHtmlOptNurse = $localize`:@@usersMgmtHtml.optNurse:Enfermera`;
  readonly usersMgmtHtmlOptSupervisorShort = $localize`:@@usersMgmtHtml.optSupervisorShort:Supervisor`;
  readonly usersMgmtHtmlOptAdmin = $localize`:@@usersMgmtHtml.optAdmin:Administrador`;
  readonly usersMgmtHtmlOptPharmacy = $localize`:@@usersMgmtHtml.optPharmacy:Farmacia`;
  readonly usersMgmtHtmlUserActive = $localize`:@@usersMgmtHtml.userActive:Usuario Activo`;
  readonly usersMgmtHtmlWarnNursePatients = $localize`:@@usersMgmtHtml.warnNursePatients:Esta enfermera tiene pacientes asignados. Al cambiar el rol, los pacientes mantendrán su área asignada pero quedarán sin enfermera asignada para poder asignar otra.`;
  readonly usersMgmtHtmlWarnRolePermissions = $localize`:@@usersMgmtHtml.warnRolePermissions:Al cambiar el rol, el usuario perderá los permisos del rol anterior y obtendrá los del nuevo rol.`;
  readonly usersMgmtHtmlWarnUsernameLoginHint = $localize`:@@usersMgmtHtml.warnUsernameLoginHint:El inicio de sesión usa el nombre de usuario o el correo electrónico.`;

  constructor(
    private adminService: AdminService,
    private toastService: ToastService,
    private confirmationService: ConfirmationService,
    private exportService: ExportService,
    private shiftsService: ShiftsService,
    private shiftRealtime: ShiftRealtimeService,
    private cdr: ChangeDetectorRef
  ) {
    this.setupSearchDebounce();
  }

  /**
   * Configura el debounce para la búsqueda
   */
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchQuery => {
      this.searchQuery = searchQuery;
      this.onSearchChange();
    });
  }

  /**
   * Maneja el cambio en el input de búsqueda con debounce
   */
  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loadUsers();
    this.loadSupervisors();
    this.loadPharmacyUsers();
    this.loadShiftPresence();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.loading = true;
    
    // Pasar filtros al servidor para que filtre allí (más eficiente)
    const params: any = {
      page: 1,
      limit: 200, // Límite razonable para gestión de usuarios
    };
    
    if (this.selectedRole !== 'all') {
      params.role = this.selectedRole;
    }
    
    if (this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }
    
    this.adminService.getUsersPaginated(params).subscribe({
      next: (response) => {
        if (response && response.users) {
          this.users = response.users;
          this.totalUsers = response.total || response.users.length;
          this.applyDisplayFilters();
          this.cdr.markForCheck();
        } else {
          this.users = [];
          this.filteredUsers = [];
          this.paginatedUsers = [];
          this.totalUsers = 0;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        // Error ya manejado con toastService más abajo
        
        let errorMessage = this.usersMgmtErrLoadUsersUnknown;
        
        if (error.status === 0) {
          errorMessage = this.usersMgmtErrLoadUsersConnect;
        } else if (error.status === 401) {
          errorMessage = this.usersMgmtErrLoadUsers401;
        } else if (error.status === 403) {
          errorMessage = this.usersMgmtErrLoadUsers403;
        } else if (error.status === 500) {
          const detail = error.error?.message || this.usersMgmtErrServerInternal;
          errorMessage = $localize`:@@usersMgmt.errLoadUsers500:Error del servidor: ${detail}:msg:`;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.toastService.error(errorMessage);
        this.users = [];
        this.filteredUsers = [];
        this.paginatedUsers = [];
        this.totalUsers = 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }


  /**
   * Maneja el cambio en el filtro de rol
   */
  onRoleFilterChange(): void {
    this.loadUsers();
  }

  onShiftPresenceFilterChange(): void {
    this.applyDisplayFilters();
  }

  hasActiveListFilters(): boolean {
    return this.selectedRole !== 'all' || this.selectedShiftPresence !== 'all' || !!this.searchQuery.trim();
  }

  private loadShiftPresence(): void {
    this.shiftsService.getAllShifts().subscribe({
      next: (shifts) => {
        const currentShift = this.shiftRealtime.resolveCurrentShift(shifts || [], new Date());
        this.liveShiftLabel = this.shiftRealtime.formatShiftLabel(currentShift);
        if (!currentShift?.id) {
          this.userShiftPresence.clear();
          this.applyDisplayFilters();
          this.cdr.markForCheck();
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        this.shiftsService.getShiftAttendance(today, currentShift.id, { background: true }).subscribe({
          next: (rows) => {
            this.userShiftPresence.clear();
            for (const row of rows || []) {
              const present = row.status === 'present' || row.status === 'late';
              this.userShiftPresence.set(row.nurseId, present);
            }
            this.applyDisplayFilters();
            this.cdr.markForCheck();
          },
          error: () => {
            this.userShiftPresence.clear();
            this.applyDisplayFilters();
            this.cdr.markForCheck();
          },
        });
      },
      error: () => {
        this.liveShiftLabel = '';
        this.userShiftPresence.clear();
        this.applyDisplayFilters();
        this.cdr.markForCheck();
      },
    });
  }

  isUserOnCurrentShift(user: User): boolean {
    if (user.role !== 'nurse' || !user.id) {
      return false;
    }
    return this.userShiftPresence.get(user.id) === true;
  }

  getShiftPresenceLabel(user: User): string {
    return this.isUserOnCurrentShift(user) ? this.usersMgmtShiftPresent : this.usersMgmtShiftAbsent;
  }

  private applyDisplayFilters(): void {
    let list = [...this.users];

    if (this.selectedShiftPresence === 'onShift') {
      list = list.filter((user) => this.isUserOnCurrentShift(user));
    } else if (this.selectedShiftPresence === 'offShift') {
      list = list.filter((user) => !this.isUserOnCurrentShift(user));
    }

    this.filteredUsers = list;
    this.paginationConfig = {
      ...this.paginationConfig,
      currentPage: 1,
    };
    this.updatePagination();
    this.cdr.markForCheck();
  }

  /**
   * Maneja el cambio en la búsqueda (sin debounce, se llama desde el debounce)
   */
  onSearchChange(): void {
    this.loadUsers();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.selectedRole = 'all';
    this.selectedShiftPresence = 'all';
    this.searchQuery = '';
    this.searchSubject.next('');
    this.loadUsers();
    this.cdr.markForCheck();
  }

  userTableRowAriaLabel(username: string): string {
    return $localize`:@@usersMgmt.userTableRowAria:Acciones para usuario ${username}:username:`;
  }

  getUsersResultsLine(): string {
    const f = this.filteredUsers.length;
    const t = this.totalUsers || this.users.length;
    return $localize`:@@usersMgmtHtml.resultsLine:Mostrando ${f}:f: de ${t}:t: usuarios`;
  }

  getUsersResultsRolePart(): string {
    return $localize`:@@usersMgmtHtml.resultsRolePart:(Rol: ${this.getRoleLabel(this.selectedRole)}:role:)`;
  }

  getUsersResultsShiftPart(): string {
    const opt = this.usersMgmtShiftFilterOptions.find((o) => o.value === this.selectedShiftPresence);
    const label = opt?.label ?? this.selectedShiftPresence;
    return $localize`:@@usersMgmtHtml.resultsShiftPart:(Turno: ${label}:shift:)`;
  }

  getUsersResultsSearchPart(): string {
    const q = this.searchQuery.trim();
    return $localize`:@@usersMgmtHtml.resultsSearchPart:(Búsqueda: "${q}:q:")`;
  }

  openUserRowActionsSheet(user: User): void {
    this.userRowActionsTarget = user;
    this.cdr.markForCheck();
  }

  closeUserRowActionsSheet(): void {
    this.userRowActionsTarget = null;
    this.cdr.markForCheck();
  }

  onUserTableRowKeydown(user: User, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openUserRowActionsSheet(user);
    }
  }

  userRowActionsSummary(u: User): string[] {
    const statusLabel = u.isActive ? this.usersMgmtStatusActive : this.usersMgmtStatusInactive;
    const roleLabel = this.getRoleLabel(u.role);
    const roleStatusLine = $localize`:@@usersMgmtHtml.sheetSummaryRoleStatus:Rol: ${roleLabel}:role: · ${statusLabel}:status:`;
    return [`@${u.username}`, `${u.firstName} ${u.lastName}`, u.email || this.usersMgmtHtmlTableDash, roleStatusLine];
  }

  fromUserSheetOpenEdit(): void {
    const u = this.userRowActionsTarget;
    if (!u) {
      return;
    }
    this.closeUserRowActionsSheet();
    this.openEditModal(u);
  }

  async fromUserSheetDelete(): Promise<void> {
    const u = this.userRowActionsTarget;
    if (!u) {
      return;
    }
    this.closeUserRowActionsSheet();
    await this.deleteUser(u);
  }

  openEditModal(user: User): void {
    this.selectedUser = user;
    this.editForm = {
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      role: user.role,
      isActive: user.isActive,
    };
    this.showEditModal = true;
  }

  isEditRoleChanged(): boolean {
    if (!this.selectedUser?.role || !this.editForm.role) {
      return false;
    }
    return this.editForm.role !== this.selectedUser.role;
  }

  isEditRoleChangeFromNurse(): boolean {
    return this.selectedUser?.role === 'nurse' && !!this.editForm.role && this.editForm.role !== 'nurse';
  }

  isEditUsernameChanged(): boolean {
    if (!this.selectedUser?.username) {
      return false;
    }
    const prev = String(this.selectedUser.username).trim();
    const next = String(this.editForm.username ?? '').trim();
    return next.length > 0 && next !== prev;
  }

  getEditUsernameLoginWarning(): string {
    const prev = this.selectedUser?.username ?? '';
    const next = String(this.editForm.username ?? '').trim();
    return $localize`:@@usersMgmtHtml.warnUsernameLogin:Si guardas un nombre de usuario distinto, esa persona deberá iniciar sesión con «${next}:new:» (ya no con «${prev}:prev:»). Informa al usuario de su nuevo acceso.`;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
    this.editForm = {};
  }

  updateUser(): void {
    if (!this.selectedUser) return;

    // Validar campos requeridos
    if (!this.editForm.username || !this.editForm.email || !this.editForm.firstName || !this.editForm.lastName) {
      this.toastService.warning(this.usersMgmtWarnCompleteRequired);
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editForm.email!)) {
      this.toastService.warning(this.usersMgmtWarnInvalidEmail);
      return;
    }

    const phoneCheck = ((this.editForm.phone as string) || '').trim();
    if (phoneCheck.length > 30) {
      this.toastService.warning(this.usersMgmtWarnPhoneTooLong);
      return;
    }

    // Confirmación especial si se está cambiando el rol de enfermera
    const wasNurse = this.selectedUser.role === 'nurse';
    const isChangingFromNurse = !!(wasNurse && this.editForm.role && this.editForm.role !== 'nurse');
    
    this.updateUserWithConfirmation(isChangingFromNurse);
  }

  /**
   * Actualiza el usuario con confirmación si es necesario
   */
  private async updateUserWithConfirmation(isChangingFromNurse: boolean): Promise<void> {
    if (isChangingFromNurse) {
      const confirmed = await this.confirmationService.confirm({
        title: this.usersMgmtConfirmNurseRoleTitle,
        message: this.usersMgmtConfirmNurseRoleMessage,
        confirmText: this.usersMgmtConfirmChangeRole,
        cancelText: this.usersMgmtConfirmCancel,
        type: 'warning'
      });
      
      if (!confirmed) {
        return;
      }
    }

    if (!this.selectedUser) return;

    const phoneTrim = ((this.editForm.phone as string) || '').trim();
    const payload: Partial<User> = {
      username: this.editForm.username,
      email: this.editForm.email,
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      phone: phoneTrim.length > 0 ? phoneTrim : null,
      role: this.editForm.role,
      isActive: this.editForm.isActive,
    };

    this.adminService.updateUser(this.selectedUser.id!, payload).subscribe({
      next: (response) => {
        let message = this.usersMgmtToastUserUpdated;
        if (isChangingFromNurse) {
          message += this.usersMgmtToastUserUpdatedNurseExtra;
        }
        this.toastService.success(message);
        this.loadUsers();
        this.loadSupervisors();
        this.loadPharmacyUsers();
        this.closeEditModal();
        this.cdr.markForCheck();
      },
      error: (error) => {
        let errorMessage = this.usersMgmtErrUpdateUser;
        
        if (error.status === 400) {
          errorMessage = error.error?.message || this.usersMgmtErrInvalidData;
        } else if (error.status === 404) {
          errorMessage = this.usersMgmtErrUserNotFound;
        } else if (error.status === 500) {
          errorMessage = this.usersMgmtErrServerLater;
        } else {
          errorMessage = error.error?.message || error.message || this.usersMgmtErrUnknown;
        }
        
        this.toastService.error(errorMessage);
      },
    });
  }

  private buildDeleteUserConfirmMessage(user: User, isNurse: boolean): string {
    const un = user.username || '';
    const fn = user.firstName || '';
    const ln = user.lastName || '';
    let msg = $localize`:@@usersMgmt.deleteUserLead:¿Estás seguro de que quieres eliminar permanentemente al usuario ${un}:un: (${fn}:fn: ${ln}:ln:)?`;
    if (isNurse) {
      msg += $localize`:@@usersMgmt.deleteUserNurseNote:\n\n Esta enfermera tiene pacientes asignados.\nLos pacientes mantendrán su área asignada pero quedarán sin enfermera asignada para poder asignar otra.`;
    }
    msg += $localize`:@@usersMgmt.deleteUserIrreversible:\n\nEsta acción no se puede deshacer.`;
    return msg;
  }

  async deleteUser(user: User): Promise<void> {
    const isNurse = user.role === 'nurse';
    const message = this.buildDeleteUserConfirmMessage(user, isNurse);

    const confirmed = await this.confirmationService.confirm({
      title: this.usersMgmtDeleteTitle,
      message: message,
      confirmText: this.usersMgmtDeletePermanent,
      cancelText: this.usersMgmtConfirmCancel,
      type: 'danger'
    });
    
    if (!confirmed) {
      return;
    }

    this.adminService.deleteUser(user.id!).subscribe({
      next: (response) => {
        this.loadUsers();
        this.loadSupervisors();
        this.loadPharmacyUsers();
        
        let successMessage = this.usersMgmtToastUserDeleted;
        if (isNurse) {
          successMessage += this.usersMgmtToastUserDeletedNurseExtra;
        }
        this.toastService.success(successMessage);
      },
      error: (error) => {
        let errorMessage = this.usersMgmtErrDeleteUser;
        
        if (error.status === 400) {
          errorMessage = error.error?.message || this.usersMgmtErrCannotDelete;
        } else if (error.status === 404) {
          errorMessage = this.usersMgmtErrUserNotFound;
        } else if (error.status === 500) {
          errorMessage = this.usersMgmtErrServerLater;
        } else {
          errorMessage = error.error?.message || error.message || this.usersMgmtErrUnknown;
        }
        
        this.toastService.error(errorMessage);
      },
    });
  }

  restoreUser(user: User): void {
    this.adminService.restoreUser(user.id!).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || this.usersMgmtErrRestoreUser;
        this.toastService.error(errorMessage);
      },
    });
  }

  /**
   * Actualiza la paginación y los usuarios paginados
   */
  updatePagination(): void {
    const total = this.filteredUsers.length;
    const itemsPerPage = this.paginationConfig.itemsPerPage;
    const totalPages = Math.ceil(total / itemsPerPage);
    
    this.paginationConfig = {
      ...this.paginationConfig,
      totalItems: total,
      totalPages: totalPages || 1,
      currentPage: Math.min(this.paginationConfig.currentPage, totalPages || 1)
    };

    const start = (this.paginationConfig.currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(start, end);
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  /**
   * Maneja el cambio de items por página
   */
  onItemsPerPageChange(itemsPerPage: number): void {
    this.paginationConfig.itemsPerPage = itemsPerPage;
    this.paginationConfig.currentPage = 1;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  /**
   * TrackBy function para mejorar rendimiento en *ngFor
   */
  trackByUserId(index: number, user: User): number {
    return user.id || index;
  }

  private getUsersExportHeaders(): string[] {
    return [
      this.usersMgmtExportColId,
      this.usersMgmtExportColUsername,
      this.usersMgmtExportColEmail,
      this.usersMgmtExportColFirstName,
      this.usersMgmtExportColLastName,
      this.usersMgmtExportColPhone,
      this.usersMgmtExportColRole,
      this.usersMgmtExportColStatus,
    ];
  }

  private buildUsersExportData(): Record<string, string | number>[] {
    return this.filteredUsers.map((u) => ({
      [this.usersMgmtExportColId]: u.id ?? '',
      [this.usersMgmtExportColUsername]: u.username,
      [this.usersMgmtExportColEmail]: u.email,
      [this.usersMgmtExportColFirstName]: u.firstName,
      [this.usersMgmtExportColLastName]: u.lastName,
      [this.usersMgmtExportColPhone]: (u.phone || '').toString().trim() || '',
      [this.usersMgmtExportColRole]: this.getRoleLabel(u.role),
      [this.usersMgmtExportColStatus]: u.isActive ? this.usersMgmtStatusActive : this.usersMgmtStatusInactive,
    }));
  }

  private exportFilenameBase(): string {
    return `usuarios-${new Date().toISOString().split('T')[0]}`;
  }

  exportToPdf(): void {
    try {
      const data = this.buildUsersExportData();
      if (!data.length) {
        this.toastService.warning(this.usersMgmtWarnExportEmpty);
        return;
      }

      this.exportService.exportToPdf(data, {
        title: this.usersMgmtPdfUsersTitle,
        filename: `${this.exportFilenameBase()}.pdf`,
        headers: this.getUsersExportHeaders(),
        generatedAtLabel: this.usersMgmtPdfGeneratedPrefix,
        orientation: 'landscape',
      });

      this.toastService.success(
        $localize`:@@usersMgmt.exportPdfOk:Exportados ${data.length}:n: usuarios a PDF`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error ?? '');
      this.toastService.error(
        $localize`:@@usersMgmt.exportPdfErr:Error al exportar PDF: ${msg}:msg:`
      );
    }
  }

  /** Exporta los usuarios filtrados a CSV. */
  exportToCSV(): void {
    try {
      const data = this.buildUsersExportData();
      if (!data.length) {
        this.toastService.warning(this.usersMgmtWarnExportEmpty);
        return;
      }

      this.exportService.exportToCSV(data, {
        filename: `${this.exportFilenameBase()}.csv`,
      });

      this.toastService.success(
        $localize`:@@usersMgmt.exportCsvOk:Exportados ${data.length}:n: usuarios a CSV`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error ?? '');
      this.toastService.error(
        $localize`:@@usersMgmt.exportCsvErr:Error al exportar: ${msg}:msg:`
      );
    }
  }

  getRoleLabel(role: string): string {
    const opt = this.usersMgmtRoleFilterOptions.find((o) => o.value === role);
    return opt?.label ?? role;
  }

  getUserInitials(user: User): string {
    const first = String(user.firstName ?? '').trim();
    const last = String(user.lastName ?? '').trim();
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    }
    if (first) {
      return first.slice(0, 2).toUpperCase();
    }
    const username = String(user.username ?? '').trim();
    return username.slice(0, 2).toUpperCase() || '?';
  }

  getRolePillClass(role: string): Record<string, boolean> {
    return {
      'users-mgmt-role-pill--admin': role === 'admin',
      'users-mgmt-role-pill--supervisor': role === 'supervisor',
      'users-mgmt-role-pill--nurse': role === 'nurse',
      'users-mgmt-role-pill--pharmacy': role === 'pharmacy',
    };
  }

  loadSupervisors(): void {
    this.loadingSupervisors = true;
    forkJoin([
      this.adminService.getUsersPaginated({ role: 'supervisor', limit: 100 }),
      this.adminService.getUsersPaginated({ role: 'admin', limit: 100 })
    ]).subscribe({
      next: ([supervisorResponse, adminResponse]) => {
        const allSupervisors = [
          ...supervisorResponse.users.filter(u => u.role === 'supervisor'),
          ...adminResponse.users.filter(u => u.role === 'admin')
        ];
        this.supervisors = allSupervisors;
        this.loadingSupervisors = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || this.usersMgmtErrLoadSupervisors;
        this.toastService.warning(errorMessage);
        this.supervisors = [];
        this.loadingSupervisors = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadPharmacyUsers(): void {
    this.loadingPharmacy = true;
    this.adminService.getUsersPaginated({ role: 'pharmacy', limit: 100 }).subscribe({
      next: (response) => {
        this.pharmacyUsers = response.users.filter(u => u.role === 'pharmacy');
        this.loadingPharmacy = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || this.usersMgmtErrLoadPharmacy;
        this.toastService.warning(errorMessage);
        this.pharmacyUsers = [];
        this.loadingPharmacy = false;
        this.cdr.markForCheck();
      }
    });
  }

}

