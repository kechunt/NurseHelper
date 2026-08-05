import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import {
  BackupListItem,
  HealthDetailedStatus,
  SupervisorPlatformInfo,
  SupervisorService,
} from '../../../services/supervisor.service';
import { ToastService } from '../../../services/toast.service';

/** Resumen del panel de supervisión: salud básica, último respaldo, SMTP y accesos a otras pestañas. */
@Component({
  selector: 'app-supervisor-system-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supervisor-system-overview.component.html',
  styleUrl: './supervisor-system-overview.component.css',
})
export class SupervisorSystemOverviewComponent implements OnInit {
  @Input() onNavigate?: (tab: string) => void;

  loading = true;
  health: HealthDetailedStatus | null = null;
  platform: SupervisorPlatformInfo | null = null;
  lastBackup: BackupListItem | null = null;

  readonly title = $localize`:@@supervisorOverview.title:Resumen del sistema`;
  readonly refreshLabel = $localize`:@@supervisorOverview.refresh:Actualizar`;
  readonly loadingLabel = $localize`:@@supervisorOverview.loading:Cargando resumen del sistema...`;
  readonly errLoad = $localize`:@@supervisorOverview.errLoad:Error al cargar el resumen del sistema`;
  readonly statHealthLabel = $localize`:@@supervisorOverview.statHealth:Salud del servidor`;
  readonly statBackupLabel = $localize`:@@supervisorOverview.statBackup:Último respaldo`;
  readonly statSmtpLabel = $localize`:@@supervisorOverview.statSmtp:Correo (SMTP)`;
  readonly statAuditLabel = $localize`:@@supervisorOverview.statAudit:Auditoría reciente`;
  readonly statWebhooksLabel = $localize`:@@supervisorOverview.statWebhooks:Webhooks`;
  readonly statPlatformLabel = $localize`:@@supervisorOverview.statPlatform:Plataforma`;
  readonly smtpOkLabel = $localize`:@@supervisorOverview.smtpOk:Configurado`;
  readonly smtpMissingLabel = $localize`:@@supervisorOverview.smtpMissing:No configurado`;
  readonly noBackupLabel = $localize`:@@supervisorOverview.noBackup:Sin respaldos`;
  readonly viewDetailLabel = $localize`:@@supervisorOverview.viewDetail:Ver detalle`;

  constructor(
    private supervisorService: SupervisorService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  navigate(tab: string): void {
    this.onNavigate?.(tab);
  }

  loadSummary(): void {
    this.loading = true;
    forkJoin({
      health: this.supervisorService.getHealthDetailed(),
      platform: this.supervisorService.getPlatformInfo(),
      backups: this.supervisorService.listBackups(),
    }).subscribe({
      next: ({ health, platform, backups }) => {
        this.health = health;
        this.platform = platform;
        this.lastBackup = backups.lastBackup ?? backups.backups[0] ?? null;
        this.loading = false;
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errLoad;
        this.toastService.error(msg);
        this.loading = false;
      },
    });
  }

  healthStatusClass(): string {
    const status = this.health?.status ?? 'unhealthy';
    return `supervisor-status-pill supervisor-status-pill--${status}`;
  }

  formatBackupDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-ES');
  }
}
