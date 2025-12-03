import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { OverviewComponent } from '../admin-dashboard/overview/overview.component';
import { UsersManagementComponent } from '../admin-dashboard/users-management/users-management.component';
import { StaffManagementComponent } from '../admin-dashboard/staff-management/staff-management.component';
import { AreasManagementComponent } from '../admin-dashboard/areas-management/areas-management.component';
import { BedsManagementComponent } from '../admin-dashboard/beds-management/beds-management.component';
import { PatientsManagementComponent } from '../admin-dashboard/patients-management/patients-management.component';
import { SchedulesManagementComponent } from '../admin-dashboard/schedules-management/schedules-management.component';

@Component({
  selector: 'app-supervisor-dashboard',
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
  templateUrl: './supervisor-dashboard.component.html',
  styleUrl: './supervisor-dashboard.component.css',
})
export class SupervisorDashboardComponent implements OnInit {
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
    if (!user || user.role !== 'supervisor') {
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

