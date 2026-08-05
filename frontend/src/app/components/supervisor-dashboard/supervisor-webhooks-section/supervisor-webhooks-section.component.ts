import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupervisorService, SupervisorWebhook, SupervisorWebhookEvent } from '../../../services/supervisor.service';
import { forkJoin } from 'rxjs';
import { ToastService } from '../../../services/toast.service';

/** Registro y prueba de webhooks salientes del sistema. */
@Component({
  selector: 'app-supervisor-webhooks-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervisor-webhooks-section.component.html',
  styleUrl: './supervisor-webhooks-section.component.css',
})
export class SupervisorWebhooksSectionComponent implements OnInit {
  loading = true;
  webhooks: SupervisorWebhook[] = [];
  availableEvents: SupervisorWebhookEvent[] = [];
  registering = false;
  busyId: number | null = null;

  formUrl = '';
  selectedEvents = new Set<string>();
  formSecret = '';

  readonly title = $localize`:@@supervisorWebhooks.title:Webhooks`;
  readonly refreshLabel = $localize`:@@supervisorWebhooks.refresh:Actualizar`;
  readonly loadingLabel = $localize`:@@supervisorWebhooks.loading:Cargando webhooks...`;
  readonly emptyLabel = $localize`:@@supervisorWebhooks.empty:No hay webhooks registrados`;
  readonly errLoad = $localize`:@@supervisorWebhooks.errLoad:Error al cargar los webhooks`;
  readonly registerTitle = $localize`:@@supervisorWebhooks.registerTitle:Registrar nuevo webhook`;
  readonly urlLabel = $localize`:@@supervisorWebhooks.urlLabel:URL de destino`;
  readonly eventsLabel = $localize`:@@supervisorWebhooks.eventsLabel:Eventos que enviará este webhook`;
  readonly eventsHint = $localize`:@@supervisorWebhooks.eventsHint:Selecciona uno o varios eventos del sistema.`;
  readonly secretLabel = $localize`:@@supervisorWebhooks.secretLabel:Secreto (opcional)`;
  readonly registerBtn = $localize`:@@supervisorWebhooks.registerBtn:Registrar webhook`;
  readonly registeringBtn = $localize`:@@supervisorWebhooks.registeringBtn:Registrando…`;
  readonly registerOk = $localize`:@@supervisorWebhooks.registerOk:Webhook registrado correctamente`;
  readonly errRegister = $localize`:@@supervisorWebhooks.errRegister:Error al registrar el webhook`;
  readonly warnUrlRequired = $localize`:@@supervisorWebhooks.warnUrlRequired:La URL es requerida`;
  readonly warnEventsRequired = $localize`:@@supervisorWebhooks.warnEventsRequired:Indica al menos un evento`;
  readonly testLabel = $localize`:@@supervisorWebhooks.testLabel:Probar`;
  readonly deleteLabel = $localize`:@@supervisorWebhooks.deleteLabel:Eliminar`;
  readonly testOk = $localize`:@@supervisorWebhooks.testOk:Webhook probado`;
  readonly errTest = $localize`:@@supervisorWebhooks.errTest:Error al probar el webhook`;
  readonly deleteOk = $localize`:@@supervisorWebhooks.deleteOk:Webhook eliminado`;
  readonly errDelete = $localize`:@@supervisorWebhooks.errDelete:Error al eliminar el webhook`;
  readonly activeLabel = $localize`:@@supervisorWebhooks.activeLabel:Activo`;
  readonly inactiveLabel = $localize`:@@supervisorWebhooks.inactiveLabel:Inactivo`;
  readonly deleteConfirm = $localize`:@@supervisorWebhooks.deleteConfirm:¿Eliminar este webhook? Esta acción no se puede deshacer.`;

  constructor(
    private supervisorService: SupervisorService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadWebhooks();
  }

  loadWebhooks(): void {
    this.loading = true;
    forkJoin({
      hooks: this.supervisorService.listWebhooks(),
      catalog: this.supervisorService.listWebhookEvents(),
    }).subscribe({
      next: ({ hooks, catalog }) => {
        const { webhooks } = hooks;
        this.webhooks = webhooks ?? [];
        this.availableEvents = catalog.events ?? [];
        this.loading = false;
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errLoad;
        this.toastService.error(msg);
        this.webhooks = [];
        this.loading = false;
      },
    });
  }

  toggleEvent(event: string, checked: boolean): void {
    if (checked) this.selectedEvents.add(event);
    else this.selectedEvents.delete(event);
  }

  registerWebhook(): void {
    if (this.registering) return;

    const url = this.formUrl.trim();
    if (!url) {
      this.toastService.warning(this.warnUrlRequired);
      return;
    }

    const events = [...this.selectedEvents];
    if (events.length === 0) {
      this.toastService.warning(this.warnEventsRequired);
      return;
    }

    this.registering = true;
    this.supervisorService.registerWebhook(url, events, this.formSecret).subscribe({
      next: () => {
        this.toastService.success(this.registerOk);
        this.registering = false;
        this.formUrl = '';
        this.selectedEvents.clear();
        this.formSecret = '';
        this.loadWebhooks();
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errRegister;
        this.toastService.error(msg);
        this.registering = false;
      },
    });
  }

  testWebhook(webhook: SupervisorWebhook): void {
    if (this.busyId) return;
    this.busyId = webhook.id;
    this.supervisorService.testWebhook(webhook.id).subscribe({
      next: () => {
        this.toastService.success(this.testOk);
        this.busyId = null;
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errTest;
        this.toastService.error(msg);
        this.busyId = null;
      },
    });
  }

  deleteWebhook(webhook: SupervisorWebhook): void {
    if (this.busyId) return;
    if (!window.confirm(this.deleteConfirm)) {
      return;
    }
    this.busyId = webhook.id;
    this.supervisorService.deleteWebhook(webhook.id).subscribe({
      next: () => {
        this.toastService.success(this.deleteOk);
        this.busyId = null;
        this.loadWebhooks();
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errDelete;
        this.toastService.error(msg);
        this.busyId = null;
      },
    });
  }
}
