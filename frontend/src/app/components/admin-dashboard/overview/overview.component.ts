import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
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

  constructor(
    private adminService: AdminService,
    private toastService: ToastService
  ) {}

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
      users: this.adminService.getUsers(false), // No usar caché para datos frescos
      areas: this.adminService.getAreas(false),
      beds: this.adminService.getBeds(false),
      patients: this.adminService.getPatientsTotal(),
    }).subscribe({
      next: ({ users, areas, beds, patients }) => {
        this.stats.users = users?.length || 0;
        this.stats.nurses = users?.filter((u: any) => u.role === 'nurse').length || 0;
        this.stats.areas = areas?.length || 0;
        this.stats.beds = beds?.length || 0;
        this.stats.patients = typeof patients === 'number' ? patients : 0;
        this.stats.nurseShifts = this.stats.nurses * 7; // Estimación: 7 días por enfermera
        this.stats.availableBeds =
          beds?.filter((b: any) => !b.patientId).length || 0;
        
        this.loading = false;
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error al cargar las estadísticas';
        this.toastService.error(errorMessage);
        // Establecer valores por defecto en caso de error
        this.stats = {
          users: 0,
          areas: 0,
          beds: 0,
          patients: 0,
          nurses: 0,
          nurseShifts: 0,
          availableBeds: 0,
        };
        this.loading = false;
      },
    });
  }
}

