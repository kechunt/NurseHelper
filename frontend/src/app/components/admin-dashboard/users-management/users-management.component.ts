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
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { DebounceDirective } from '../../../shared/directives/debounce.directive';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, DebounceDirective, AdminTableRowActionsModalComponent],
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
  showRoleModal = false;
  showEditModal = false;
  selectedUser: User | null = null;
  /** Fila tabla: acciones en hoja inferior. */
  userRowActionsTarget: User | null = null;
  newRole: string = '';
  editForm: Partial<User> = {};
  
  // Filtros
  selectedRole: 'all' | 'admin' | 'nurse' | 'supervisor' | 'pharmacy' = 'all';
  searchQuery: string = '';
  
  // Información de paginación (si el backend la devuelve)
  totalUsers: number = 0;

  // Jefas de enfermeras y encargado de farmacia
  supervisors: User[] = [];
  pharmacyUsers: User[] = [];
  loadingSupervisors = false;
  loadingPharmacy = false;

  constructor(
    private adminService: AdminService,
    private toastService: ToastService,
    private confirmationService: ConfirmationService,
    private exportService: ExportService,
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
    this.loadUsers();
    this.loadSupervisors();
    this.loadPharmacyUsers();
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
          this.filteredUsers = response.users;
          this.totalUsers = response.total || response.users.length;
          this.updatePagination();
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
        
        let errorMessage = 'Error desconocido al cargar usuarios';
        
        if (error.status === 0) {
          errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté corriendo en http://localhost:3000';
        } else if (error.status === 401) {
          errorMessage = 'No autorizado. Tu sesión expiró. Por favor, cierra sesión y vuelve a iniciar sesión.';
        } else if (error.status === 403) {
          errorMessage = 'Acceso denegado. No tienes permisos para ver usuarios.';
        } else if (error.status === 500) {
          errorMessage = `Error del servidor: ${error.error?.message || 'Error interno del servidor'}`;
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
    this.searchQuery = '';
    this.searchSubject.next(''); // Limpiar también el debounce
    this.loadUsers();
    this.cdr.markForCheck();
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
    return [
      `@${u.username}`,
      `${u.firstName} ${u.lastName}`,
      u.email || '—',
      `Rol: ${this.getRoleLabel(u.role)} · ${u.isActive ? 'Activo' : 'Inactivo'}`,
    ];
  }

  fromUserSheetOpenEdit(): void {
    const u = this.userRowActionsTarget;
    if (!u) {
      return;
    }
    this.closeUserRowActionsSheet();
    this.openEditModal(u);
  }

  fromUserSheetOpenRole(): void {
    const u = this.userRowActionsTarget;
    if (!u) {
      return;
    }
    this.closeUserRowActionsSheet();
    this.openRoleModal(u);
  }

  async fromUserSheetDelete(): Promise<void> {
    const u = this.userRowActionsTarget;
    if (!u) {
      return;
    }
    this.closeUserRowActionsSheet();
    await this.deleteUser(u);
  }

  openRoleModal(user: User): void {
    this.selectedUser = user;
    this.newRole = user.role;
    this.showRoleModal = true;
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

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedUser = null;
    this.newRole = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
    this.editForm = {};
  }

  updateRole(): void {
    if (!this.selectedUser) return;

    // Validar que el rol haya cambiado
    if (this.newRole === this.selectedUser.role) {
      this.toastService.warning('El usuario ya tiene este rol asignado');
      return;
    }

    // Confirmación especial si es enfermera cambiando de rol
    const wasNurse = this.selectedUser.role === 'nurse';
    const isChangingFromNurse = wasNurse && this.newRole !== 'nurse';
    
    this.updateRoleWithConfirmation(isChangingFromNurse);
  }

  /**
   * Actualiza el rol del usuario con confirmación si es necesario
   */
  private async updateRoleWithConfirmation(isChangingFromNurse: boolean): Promise<void> {
    if (isChangingFromNurse) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Cambiar rol de enfermera',
        message: '¿Estás seguro de cambiar el rol de esta enfermera?\n\nLos pacientes asignados a esta enfermera mantendrán su área pero quedarán sin enfermera asignada para poder asignar otra.',
        confirmText: 'Cambiar rol',
        cancelText: 'Cancelar',
        type: 'warning'
      });
      
      if (!confirmed) {
        return;
      }
    }

    if (!this.selectedUser) return;

    this.adminService.updateUserRole(this.selectedUser.id!, this.newRole).subscribe({
      next: (response) => {
        this.loadUsers();
        this.loadSupervisors();
        this.loadPharmacyUsers();
        this.closeRoleModal();
        
        let message = 'Rol actualizado exitosamente';
        if (isChangingFromNurse) {
          message += '. Los schedules de esta enfermera han sido desasignados. Los pacientes mantienen su área asignada.';
        }
        this.toastService.success(message);
        this.cdr.markForCheck();
      },
      error: (error) => {
        let errorMessage = 'Error al actualizar el rol';
        
        if (error.status === 400) {
          errorMessage = error.error?.message || 'Datos inválidos';
        } else if (error.status === 404) {
          errorMessage = 'Usuario no encontrado';
        } else if (error.status === 500) {
          errorMessage = 'Error del servidor. Por favor intenta más tarde.';
        } else {
          errorMessage = error.error?.message || error.message || 'Error desconocido';
        }
        
        this.toastService.error(errorMessage);
      },
    });
  }

  updateUser(): void {
    if (!this.selectedUser) return;

    // Validar campos requeridos
    if (!this.editForm.username || !this.editForm.email || !this.editForm.firstName || !this.editForm.lastName) {
      this.toastService.warning('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editForm.email!)) {
      this.toastService.warning('Por favor ingresa un email válido');
      return;
    }

    const phoneCheck = ((this.editForm.phone as string) || '').trim();
    if (phoneCheck.length > 30) {
      this.toastService.warning('El teléfono no puede superar 30 caracteres');
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
        title: 'Cambiar rol de enfermera',
        message: '¿Estás seguro de cambiar el rol de esta enfermera?\n\nLos pacientes asignados a esta enfermera mantendrán su área pero quedarán sin enfermera asignada para poder asignar otra.',
        confirmText: 'Cambiar rol',
        cancelText: 'Cancelar',
        type: 'warning'
      });
      
      if (!confirmed) {
        return;
      }
    }

    if (!this.selectedUser) return;

    const phoneTrim = ((this.editForm.phone as string) || '').trim();
    const payload = {
      ...this.editForm,
      phone: phoneTrim.length > 0 ? phoneTrim : null,
    };

    this.adminService.updateUser(this.selectedUser.id!, payload).subscribe({
      next: (response) => {
        let message = 'Usuario actualizado exitosamente';
        if (isChangingFromNurse) {
          message += '. Los schedules de esta enfermera han sido desasignados. Los pacientes mantienen su área asignada.';
        }
        this.toastService.success(message);
        this.loadUsers();
        this.loadSupervisors();
        this.loadPharmacyUsers();
        this.closeEditModal();
        this.cdr.markForCheck();
      },
      error: (error) => {
        let errorMessage = 'Error al actualizar el usuario';
        
        if (error.status === 400) {
          errorMessage = error.error?.message || 'Datos inválidos';
        } else if (error.status === 404) {
          errorMessage = 'Usuario no encontrado';
        } else if (error.status === 500) {
          errorMessage = 'Error del servidor. Por favor intenta más tarde.';
        } else {
          errorMessage = error.error?.message || error.message || 'Error desconocido';
        }
        
        this.toastService.error(errorMessage);
      },
    });
  }

  async deleteUser(user: User): Promise<void> {
    const isNurse = user.role === 'nurse';
    
    let message = `¿Estás seguro de que quieres eliminar permanentemente al usuario ${user.username} (${user.firstName} ${user.lastName})?`;
    
    if (isNurse) {
      message += `\n\n⚠️ Esta enfermera tiene pacientes asignados.\nLos pacientes mantendrán su área asignada pero quedarán sin enfermera asignada para poder asignar otra.`;
    }
    
    message += `\n\nEsta acción no se puede deshacer.`;
    
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar usuario permanentemente',
      message: message,
      confirmText: 'Eliminar permanentemente',
      cancelText: 'Cancelar',
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
        
        let successMessage = 'Usuario eliminado permanentemente';
        if (isNurse) {
          successMessage += '. Los schedules de esta enfermera han sido desasignados. Los pacientes mantienen su área asignada.';
        }
        this.toastService.success(successMessage);
      },
      error: (error) => {
        let errorMessage = 'Error al eliminar el usuario';
        
        if (error.status === 400) {
          errorMessage = error.error?.message || 'No se puede eliminar este usuario';
        } else if (error.status === 404) {
          errorMessage = 'Usuario no encontrado';
        } else if (error.status === 500) {
          errorMessage = 'Error del servidor. Por favor intenta más tarde.';
        } else {
          errorMessage = error.error?.message || error.message || 'Error desconocido';
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
        const errorMessage = error.error?.message || error.message || 'Error al restaurar el usuario';
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

  /**
   * Exporta los usuarios filtrados a CSV
   */
  exportToCSV(): void {
    try {
      const data = this.filteredUsers.map(u => ({
        ID: u.id,
        'Usuario': u.username,
        'Email': u.email,
        'Nombre': u.firstName,
        'Apellido': u.lastName,
        'Teléfono': (u.phone || '').toString().trim() || '',
        'Rol': this.getRoleLabel(u.role),
        'Estado': u.isActive ? 'Activo' : 'Inactivo'
      }));

      this.exportService.exportToCSV(data, {
        filename: `usuarios-${new Date().toISOString().split('T')[0]}.csv`
      });
      
      this.toastService.success(`Exportados ${data.length} usuarios a CSV`);
    } catch (error: any) {
      this.toastService.error(`Error al exportar: ${error.message}`);
    }
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      admin: 'Administrador',
      nurse: 'Enfermera',
      supervisor: 'Supervisor',
      pharmacy: 'Farmacia',
    };
    return labels[role] || role;
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
        const errorMessage = error.error?.message || error.message || 'Error al cargar supervisores';
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
        const errorMessage = error.error?.message || error.message || 'Error al cargar usuarios de farmacia';
        this.toastService.warning(errorMessage);
        this.pharmacyUsers = [];
        this.loadingPharmacy = false;
        this.cdr.markForCheck();
      }
    });
  }

  openSupervisorRoleModal(user: User): void {
    this.selectedUser = user;
    this.newRole = user.role;
    this.showRoleModal = true;
  }

  openPharmacyRoleModal(user: User): void {
    this.selectedUser = user;
    this.newRole = user.role;
    this.showRoleModal = true;
  }
}

