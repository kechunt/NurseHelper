import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ShiftsService, Shift } from '../../../services/shifts.service';
import { ShiftRealtimeService } from '../../../shared/services/shift-realtime.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit, OnDestroy {
  @Input() onNavigate?: (tab: string) => void;
  @Input() onOpenCoordination?: () => void;
  @Input() onOpenReports?: () => void;

  stats = {
    users: 0,
    areas: 0,
    beds: 0,
    patients: 0,
    nurses: 0,
    availableBeds: 0,
  };

  loading = true;
  liveDateTimeLabel = '';
  liveCurrentShiftLabel = 'Sin turno activo';
  private shifts: Shift[] = [];
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private adminService: AdminService,
    private toastService: ToastService,
    private shiftsService: ShiftsService,
    private shiftRealtimeService: ShiftRealtimeService
  ) {}

  navigate(tab: string): void {
    if (this.onNavigate) {
      this.onNavigate(tab);
    }
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadShiftsForRealtimeCard();
    this.startLiveClock();
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
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
          availableBeds: 0,
        };
        this.loading = false;
      },
    });
  }

  private loadShiftsForRealtimeCard(): void {
    this.shiftsService.getAllShifts().subscribe({
      next: (shifts) => {
        this.shifts = Array.isArray(shifts) ? shifts.filter((s) => s.isActive !== false) : [];
        this.updateLiveClockFields();
      },
      error: () => {
        this.shifts = [];
        this.updateLiveClockFields();
      },
    });
  }

  private startLiveClock(): void {
    this.updateLiveClockFields();
    this.clockTimer = setInterval(() => this.updateLiveClockFields(), 1000);
  }

  private updateLiveClockFields(): void {
    const now = new Date();
    this.liveDateTimeLabel = this.shiftRealtimeService.formatDateTimeLabel(now);
    const currentShift = this.shiftRealtimeService.resolveCurrentShift(this.shifts, now, false);
    this.liveCurrentShiftLabel = this.shiftRealtimeService.formatShiftLabel(currentShift);
  }
}
