import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell/dashboard-shell.component';
import { HeroIconComponent } from '../../shared/components/hero-icon/hero-icon.component';
import { PharmacyShiftAttendanceSectionComponent } from '../pharmacy-shift-attendance-section/pharmacy-shift-attendance-section.component';

@Component({
  selector: 'app-pharmacy-attendance-page',
  standalone: true,
  imports: [DashboardShellComponent, HeroIconComponent, PharmacyShiftAttendanceSectionComponent],
  templateUrl: './pharmacy-attendance-page.component.html',
  styleUrls: ['./pharmacy-attendance-page.component.css'],
})
export class PharmacyAttendancePageComponent {
  pharmacyUserName = 'Farmacia Central';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  get headerUserName(): string {
    const u = this.authService.currentUser();
    if (u) {
      return `${u.firstName || ''} ${u.lastName || ''}`.trim();
    }
    return this.pharmacyUserName;
  }

  goToRequestsFromLogo(): void {
    this.goToPharmacyTab('requests');
  }

  goToPharmacyTab(tab: 'requests' | 'history' | 'inventory'): void {
    this.router.navigate(['/pharmacy'], { queryParams: { tab }, replaceUrl: true });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
