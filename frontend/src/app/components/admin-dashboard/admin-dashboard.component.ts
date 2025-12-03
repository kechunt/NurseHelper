import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

