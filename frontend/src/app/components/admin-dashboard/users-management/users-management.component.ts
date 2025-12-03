import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { User } from '../../../services/auth.service';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-management.component.html',
  styleUrl: './users-management.component.css',
})
export class UsersManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  loading = false;
  showRoleModal = false;
  showEditModal = false;
  selectedUser: User | null = null;
  newRole: string = '';
  editForm: Partial<User> = {};
  
  // Filtros
  selectedRole: 'all' | 'admin' | 'nurse' | 'supervisor' = 'all';
  searchQuery: string = '';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Filtrar por rol
    if (this.selectedRole !== 'all') {
      filtered = filtered.filter((user) => user.role === this.selectedRole);
    }

    // Filtrar por búsqueda (nombre, apellido, username, email)
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.firstName?.toLowerCase().includes(query) ||
          user.lastName?.toLowerCase().includes(query) ||
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(query)
      );
    }

    this.filteredUsers = filtered;
  }

  onRoleFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
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

    this.adminService.updateUserRole(this.selectedUser.id!, this.newRole).subscribe({
      next: () => {
        this.loadUsers();
        this.closeRoleModal();
      },
      error: (error) => {
        console.error('Error updating role:', error);
        alert(error.error?.message || 'Error al actualizar el rol');
      },
    });
  }

  updateUser(): void {
    if (!this.selectedUser) return;

    this.adminService.updateUser(this.selectedUser.id!, this.editForm).subscribe({
      next: () => {
        this.loadUsers();
        this.closeEditModal();
      },
      error: (error) => {
        console.error('Error updating user:', error);
        alert(error.error?.message || 'Error al actualizar el usuario');
      },
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`¿Estás seguro de que quieres eliminar permanentemente al usuario ${user.username} (${user.firstName} ${user.lastName})? Esta acción no se puede deshacer y eliminará todos los datos relacionados.`)) {
      return;
    }

    this.adminService.deleteUser(user.id!).subscribe({
      next: () => {
        alert('✅ Usuario eliminado permanentemente.');
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        alert(error.error?.message || 'Error al eliminar el usuario.');
      },
    });
  }

  restoreUser(user: User): void {
    this.adminService.restoreUser(user.id!).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error restoring user:', error);
        alert('Error al restaurar el usuario');
      },
    });
  }

  clearFilters(): void {
    this.selectedRole = 'all';
    this.searchQuery = '';
    this.applyFilters();
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      admin: 'Administrador',
      nurse: 'Enfermera',
      supervisor: 'Supervisor',
    };
    return labels[role] || role;
  }
}

