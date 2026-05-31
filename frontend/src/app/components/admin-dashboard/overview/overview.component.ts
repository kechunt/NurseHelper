import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ShiftsService, Shift } from '../../../services/shifts.service';
import { ShiftRealtimeService } from '../../../shared/services/shift-realtime.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  liveCurrentShiftLabel = '';

  backups: { filename: string; size: number; createdAt: string }[] = [];
  loadingBackups = false;
  creatingBackup = false;
  backupName = '';
  lastBackupFilename: string | null = null;

  readonly adminOverviewBackupTitle = $localize`:@@adminOverview.backupTitle:Respaldos de base de datos`;
  readonly adminOverviewBackupCreate = $localize`:@@adminOverview.backupCreate:Crear respaldo`;
  readonly adminOverviewBackupNameLabel = $localize`:@@adminOverview.backupNameLabel:Nombre del respaldo (opcional)`;
  readonly adminOverviewBackupNameHint = $localize`:@@adminOverview.backupNameHint:Ej: prod_mayo, bdresp1. Si lo dejas vacío se genera automáticamente.`;
  readonly adminOverviewBackupProductionNote = $localize`:@@adminOverview.backupProductionNote:Recomendado antes de despliegues o cambios en producción. Guarda una copia del estado actual de la base de datos en el servidor.`;
  readonly adminOverviewBackupLast = $localize`:@@adminOverview.backupLast:Último respaldo`;
  readonly adminOverviewBackupEmpty = $localize`:@@adminOverview.backupEmpty:No hay respaldos disponibles`;
  readonly adminOverviewBackupCreated = $localize`:@@adminOverview.backupCreated:Respaldo creado correctamente`;
  readonly adminOverviewBackupCreatedAs = $localize`:@@adminOverview.backupCreatedAs:Archivo generado`;
  readonly adminOverviewBackupErrLoad = $localize`:@@adminOverview.backupErrLoad:Error al cargar respaldos`;
  readonly adminOverviewBackupErrCreate = $localize`:@@adminOverview.backupErrCreate:Error al crear respaldo`;
  readonly adminOverviewErrLoadStats = $localize`:@@adminOverview.errLoadStats:Error al cargar las estadísticas`;
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
    this.loadBackups();
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
        const errorMessage = error.error?.message || error.message || this.adminOverviewErrLoadStats;
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

  loadBackups(): void {
    this.loadingBackups = true;
    this.adminService.listBackups().subscribe({
      next: ({ backups, lastBackup }) => {
        this.backups = backups.map((b) => ({
          filename: b.filename,
          size: b.size,
          createdAt:
            typeof b.createdAt === 'string'
              ? b.createdAt
              : new Date(b.createdAt).toISOString(),
        }));
        this.lastBackupFilename = lastBackup?.filename ?? this.backups[0]?.filename ?? null;
        this.loadingBackups = false;
      },
      error: () => {
        this.toastService.error(this.adminOverviewBackupErrLoad);
        this.backups = [];
        this.loadingBackups = false;
      },
    });
  }

  createBackup(): void {
    if (this.creatingBackup) return;
    this.creatingBackup = true;
    this.adminService.createBackup('full', this.backupName).subscribe({
      next: (response) => {
        const filename = response.backup?.filename;
        this.lastBackupFilename = filename ?? this.lastBackupFilename;
        const detail = filename ? `${this.adminOverviewBackupCreatedAs}: ${filename}` : this.adminOverviewBackupCreated;
        this.toastService.success(detail);
        this.creatingBackup = false;
        this.loadBackups();
      },
      error: (error) => {
        const msg = error.error?.message || error.message || this.adminOverviewBackupErrCreate;
        this.toastService.error(msg);
        this.creatingBackup = false;
      },
    });
  }

  formatBackupSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }

  formatBackupDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-ES');
  }
}
