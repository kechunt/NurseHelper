import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { OverviewComponent } from './overview/overview.component';
import { UsersManagementComponent } from './users-management/users-management.component';
import { StaffManagementComponent } from './staff-management/staff-management.component';
import { AreasManagementComponent } from './areas-management/areas-management.component';
import { BedsManagementComponent } from './beds-management/beds-management.component';
import { PatientsManagementComponent } from './patients-management/patients-management.component';
import { SchedulesManagementComponent } from './schedules-management/schedules-management.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    OverviewComponent,
    UsersManagementComponent,
    StaffManagementComponent,
    AreasManagementComponent,
    BedsManagementComponent,
    PatientsManagementComponent,
    SchedulesManagementComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  activeTab: string = 'overview';
  private readonly storageKey = 'admin-dashboard-active-tab-v1';
  private readonly allowedTabs = new Set(['overview', 'users', 'staff', 'areas', 'beds', 'patients', 'schedules']);
  /** Pestañas ya visitadas: el componente se mantiene montado (oculto) para no repetir llamadas a la API al volver. */
  private readonly visitedTabs = new Set<string>(['overview']);
  showProfileModal = false;
  profileForm: { firstName: string; lastName: string; username: string; email: string } = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
  };
  savingProfile = false;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}
  
  get currentUser() {
    return this.authService.currentUser;
  }

  ngOnInit(): void {
    // Verificar autenticación y rol
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    const user = this.currentUser();
    if (!user || user.role !== 'admin') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.restoreActiveTab();
    this.visitedTabs.add(this.activeTab);
  }

  hasVisitedTab(tab: string): boolean {
    return this.visitedTabs.has(tab);
  }

  setActiveTab(tab: string): void {
    if (!this.allowedTabs.has(tab)) {
      return;
    }
    this.activeTab = tab;
    this.visitedTabs.add(tab);
    this.persistActiveTab();
  }

  goToOverviewFromLogo(): void {
    this.setActiveTab('overview');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private persistActiveTab(): void {
    localStorage.setItem(this.storageKey, this.activeTab);
  }

  private restoreActiveTab(): void {
    const savedTab = localStorage.getItem(this.storageKey);
    if (savedTab && this.allowedTabs.has(savedTab)) {
      this.activeTab = savedTab;
    } else {
      this.activeTab = 'overview';
    }
  }

  openProfileModal(): void {
    const user = this.currentUser();
    if (!user) return;
    this.profileForm = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || '',
    };
    this.showProfileModal = true;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.savingProfile = false;
  }

  saveProfile(): void {
    const user = this.currentUser();
    if (!user?.id) return;
    if (
      !this.profileForm.firstName.trim() ||
      !this.profileForm.lastName.trim() ||
      !this.profileForm.username.trim() ||
      !this.profileForm.email.trim()
    ) {
      alert('Completa todos los campos.');
      return;
    }

    this.savingProfile = true;
    this.adminService.updateUser(user.id, {
      firstName: this.profileForm.firstName.trim(),
      lastName: this.profileForm.lastName.trim(),
      username: this.profileForm.username.trim(),
      email: this.profileForm.email.trim(),
    }).subscribe({
      next: () => {
        const updatedUser = {
          ...user,
          firstName: this.profileForm.firstName.trim(),
          lastName: this.profileForm.lastName.trim(),
          username: this.profileForm.username.trim(),
          email: this.profileForm.email.trim(),
        };
        this.authService.currentUser.set(updatedUser);
        localStorage.setItem('nursehelper_user', JSON.stringify(updatedUser));
        this.savingProfile = false;
        this.showProfileModal = false;
        alert('✅ Información personal actualizada');
      },
      error: (error) => {
        this.savingProfile = false;
        alert(`❌ No se pudo actualizar tu información: ${error.error?.message || error.message}`);
      },
    });
  }
}

