import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupervisorPlatformInfo, SupervisorService } from '../../../services/supervisor.service';
import { ToastService } from '../../../services/toast.service';

/** Vista de solo lectura de los metadatos de plataforma (`/api/supervisor/platform`). */
@Component({
  selector: 'app-supervisor-platform-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supervisor-platform-section.component.html',
  styleUrl: './supervisor-platform-section.component.css',
})
export class SupervisorPlatformSectionComponent implements OnInit {
  loading = true;
  platform: SupervisorPlatformInfo | null = null;

  readonly title = $localize`:@@supervisorPlatform.title:Información de la plataforma`;
  readonly refreshLabel = $localize`:@@supervisorPlatform.refresh:Actualizar`;
  readonly loadingLabel = $localize`:@@supervisorPlatform.loading:Cargando información de la plataforma...`;
  readonly errLoad = $localize`:@@supervisorPlatform.errLoad:Error al cargar la información de la plataforma`;
  readonly environmentLabel = $localize`:@@supervisorPlatform.environmentLabel:Entorno`;
  readonly publicOriginLabel = $localize`:@@supervisorPlatform.publicOriginLabel:Origen público`;
  readonly smtpLabel = $localize`:@@supervisorPlatform.smtpLabel:SMTP`;
  readonly emailFromLabel = $localize`:@@supervisorPlatform.emailFromLabel:Correo remitente`;
  readonly timezoneLabel = $localize`:@@supervisorPlatform.timezoneLabel:Zona horaria`;
  readonly backupEnabledLabel = $localize`:@@supervisorPlatform.backupEnabledLabel:Respaldos automáticos`;
  readonly backupRetentionLabel = $localize`:@@supervisorPlatform.backupRetentionLabel:Retención de respaldos`;
  readonly smtpOkLabel = $localize`:@@supervisorPlatform.smtpOk:Configurado`;
  readonly smtpMissingLabel = $localize`:@@supervisorPlatform.smtpMissing:No configurado`;
  readonly enabledLabel = $localize`:@@supervisorPlatform.enabled:Habilitado`;
  readonly disabledLabel = $localize`:@@supervisorPlatform.disabled:Deshabilitado`;
  readonly notConfiguredLabel = $localize`:@@supervisorPlatform.notConfigured:No configurado`;
  readonly daysSuffix = $localize`:@@supervisorPlatform.daysSuffix:días`;

  constructor(
    private supervisorService: SupervisorService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadPlatform();
  }

  loadPlatform(): void {
    this.loading = true;
    this.supervisorService.getPlatformInfo().subscribe({
      next: (platform) => {
        this.platform = platform;
        this.loading = false;
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errLoad;
        this.toastService.error(msg);
        this.loading = false;
      },
    });
  }
}
