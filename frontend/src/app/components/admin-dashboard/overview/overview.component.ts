import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit {
  @Input() onNavigate?: (tab: string) => void;

  stats = {
    users: 0,
    areas: 0,
    beds: 0,
    patients: 0,
    nurses: 0,
    nurseShifts: 0,
    availableBeds: 0,
  };

  loading = true;

  constructor(private adminService: AdminService) {}

  navigate(tab: string): void {
    if (this.onNavigate) {
      this.onNavigate(tab);
    }
  }

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    forkJoin({
      users: this.adminService.getUsers(),
      areas: this.adminService.getAreas(),
      beds: this.adminService.getBeds(),
      patients: this.adminService.getPatients(),
    }).subscribe({
      next: ({ users, areas, beds, patients }) => {
        this.stats.users = users?.length || 0;
        this.stats.nurses = users?.filter((u: any) => u.role === 'nurse').length || 0;
        this.stats.areas = areas?.length || 0;
        this.stats.beds = beds?.length || 0;
        this.stats.patients = patients?.length || 0;
        this.stats.nurseShifts = this.stats.nurses * 7; // Estimación: 7 días por enfermera
        this.stats.availableBeds =
          beds?.filter((b: any) => !b.patientId).length || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.loading = false;
      },
    });
  }
}

