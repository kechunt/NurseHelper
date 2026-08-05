import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupervisorService, SupervisorWebhook } from '../../../services/supervisor.service';
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
  registering = false;
  busyId: number | null = null;

  formUrl = '';
  formEvents = '';
  formSecret = '';

  readonly title = $localize`:@@supervisorWebhooks.title:Webhooks`;
  readonly refreshLabel = $localize`:@@supervisorWebhooks.refresh:Actualizar`;
  readonly loadingLabel = $localize`:@@supervisorWebhooks.loading:Cargando webhooks...`;
  readonly emptyLabel = $localize`:@@supervisorWebhooks.empty:No hay webhooks registrados`;
  readonly errLoad = $localize`:@@supervisorWebhooks.errLoad:Error al cargar los webhooks`;
  readonly registerTitle = $localize`:@@supervisorWebhooks.registerTitle:Registrar nuevo webhook`;
  readonly urlLabel = $localize`:@@supervisorWebhooks.urlLabel:URL de destino`;
  readonly eventsLabel = $localize`:@@supervisorWebhooks.eventsLabel:Eventos (separados por coma)`;
  readonly eventsHint = $localize`:@@supervisorWebhooks.eventsHint:Ej: patient.created, medication.administered`;
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
    this.supervisorService.listWebhooks().subscribe({
      next: ({ webhooks }) => {
        this.webhooks = webhooks ?? [];
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

  private parseEvents(): string[] {
    return this.formEvents
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  }

  registerWebhook(): void {
    if (this.registering) return;

    const url = this.formUrl.trim();
    if (!url) {
      this.toastService.warning(this.warnUrlRequired);
      return;
    }

    const events = this.parseEvents();
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
        this.formEvents = '';
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
