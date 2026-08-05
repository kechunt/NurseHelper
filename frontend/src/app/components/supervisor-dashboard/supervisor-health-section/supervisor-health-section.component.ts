import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { HealthDetailedStatus, HealthMetricsData, SupervisorService } from '../../../services/supervisor.service';
import { ToastService } from '../../../services/toast.service';

/** Salud del sistema: `/health/detailed` + `/health/metrics`, con refresco manual. */
@Component({
  selector: 'app-supervisor-health-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supervisor-health-section.component.html',
  styleUrl: './supervisor-health-section.component.css',
})
export class SupervisorHealthSectionComponent implements OnInit {
  loading = true;
  health: HealthDetailedStatus | null = null;
  metrics: HealthMetricsData | null = null;

  readonly title = $localize`:@@supervisorHealth.title:Salud del sistema`;
  readonly refreshLabel = $localize`:@@supervisorHealth.refresh:Actualizar`;
  readonly loadingLabel = $localize`:@@supervisorHealth.loading:Cargando estado del sistema...`;
  readonly errLoad = $localize`:@@supervisorHealth.errLoad:Error al cargar el estado del sistema`;
  readonly detailedTitle = $localize`:@@supervisorHealth.detailedTitle:Estado detallado`;
  readonly metricsTitle = $localize`:@@supervisorHealth.metricsTitle:Métricas de rendimiento`;
  readonly dbLabel = $localize`:@@supervisorHealth.dbLabel:Base de datos`;
  readonly memoryLabel = $localize`:@@supervisorHealth.memoryLabel:Memoria`;
  readonly diskLabel = $localize`:@@supervisorHealth.diskLabel:Disco`;
  readonly uptimeLabel = $localize`:@@supervisorHealth.uptimeLabel:Tiempo activo`;
  readonly versionLabel = $localize`:@@supervisorHealth.versionLabel:Versión`;
  readonly environmentLabel = $localize`:@@supervisorHealth.environmentLabel:Entorno`;
  readonly responseTimeLabel = $localize`:@@supervisorHealth.responseTimeLabel:Tiempo de respuesta`;
  readonly cpuLabel = $localize`:@@supervisorHealth.cpuLabel:CPU`;
  readonly requestsLabel = $localize`:@@supervisorHealth.requestsLabel:Solicitudes`;
  readonly requestsTotalLabel = $localize`:@@supervisorHealth.requestsTotalLabel:Total`;
  readonly requestsPerMinuteLabel = $localize`:@@supervisorHealth.requestsPerMinuteLabel:Por minuto`;
  readonly requestsErrorsLabel = $localize`:@@supervisorHealth.requestsErrorsLabel:Errores`;
  readonly requestsErrorRateLabel = $localize`:@@supervisorHealth.requestsErrorRateLabel:Tasa de error`;
  readonly dbConnectionsLabel = $localize`:@@supervisorHealth.dbConnectionsLabel:Conexiones`;
  readonly dbQueriesLabel = $localize`:@@supervisorHealth.dbQueriesLabel:Consultas`;
  readonly dbSlowQueriesLabel = $localize`:@@supervisorHealth.dbSlowQueriesLabel:Consultas lentas`;

  constructor(
    private supervisorService: SupervisorService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadHealth();
  }

  loadHealth(): void {
    this.loading = true;
    forkJoin({
      health: this.supervisorService.getHealthDetailed(),
      metrics: this.supervisorService.getHealthMetrics(),
    }).subscribe({
      next: ({ health, metrics }) => {
        this.health = health;
        this.metrics = metrics;
        this.loading = false;
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errLoad;
        this.toastService.error(msg);
        this.loading = false;
      },
    });
  }

  statusPillClass(status: string | undefined): string {
    return `supervisor-health-pill supervisor-health-pill--${status || 'unhealthy'}`;
  }

  formatUptime(seconds: number | undefined): string {
    if (!seconds && seconds !== 0) return '—';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  }

  formatBytes(bytes: number | undefined): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }

  formatPercentage(value: number | undefined): string {
    if (value == null) return '—';
    return `${Math.round(value * 100) / 100}%`;
  }
}
