import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupervisorAuditLog, SupervisorService } from '../../../services/supervisor.service';
import { ToastService } from '../../../services/toast.service';

/** Auditoría reciente en memoria del servidor (`/api/supervisor/audit-recent`). */
@Component({
  selector: 'app-supervisor-audit-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supervisor-audit-section.component.html',
  styleUrl: './supervisor-audit-section.component.css',
})
export class SupervisorAuditSectionComponent implements OnInit {
  loading = true;
  events: SupervisorAuditLog[] = [];
  readonly limit = 50;

  readonly title = $localize`:@@supervisorAudit.title:Auditoría reciente`;
  readonly refreshLabel = $localize`:@@supervisorAudit.refresh:Actualizar`;
  readonly loadingLabel = $localize`:@@supervisorAudit.loading:Cargando eventos de auditoría...`;
  readonly emptyLabel = $localize`:@@supervisorAudit.empty:No hay eventos de auditoría recientes`;
  readonly errLoad = $localize`:@@supervisorAudit.errLoad:Error al cargar la auditoría`;
  readonly colDate = $localize`:@@supervisorAudit.colDate:Fecha`;
  readonly colAction = $localize`:@@supervisorAudit.colAction:Acción`;
  readonly colResource = $localize`:@@supervisorAudit.colResource:Recurso`;
  readonly colUser = $localize`:@@supervisorAudit.colUser:Usuario`;
  readonly colIp = $localize`:@@supervisorAudit.colIp:IP`;
  readonly hint = $localize`:@@supervisorAudit.hint:Se muestran los últimos ${this.limit}:limit: eventos en memoria del servidor.`;

  constructor(
    private supervisorService: SupervisorService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadAudit();
  }

  loadAudit(): void {
    this.loading = true;
    this.supervisorService.getRecentAudit(this.limit).subscribe({
      next: ({ events }) => {
        this.events = events ?? [];
        this.loading = false;
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errLoad;
        this.toastService.error(msg);
        this.events = [];
        this.loading = false;
      },
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-ES');
  }

  resourceLabel(event: SupervisorAuditLog): string {
    return event.resourceId != null ? `${event.resourceType} #${event.resourceId}` : event.resourceType;
  }

  trackByEvent(index: number, event: SupervisorAuditLog): string {
    return `${event.timestamp}-${event.action}-${index}`;
  }
}
