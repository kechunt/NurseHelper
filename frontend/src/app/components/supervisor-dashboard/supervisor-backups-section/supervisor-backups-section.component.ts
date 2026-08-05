import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackupListItem, SupervisorService } from '../../../services/supervisor.service';
import { ToastService } from '../../../services/toast.service';

/** Gestión de respaldos: crear, listar, verificar, probar restauración y restaurar. */
@Component({
  selector: 'app-supervisor-backups-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervisor-backups-section.component.html',
  styleUrl: './supervisor-backups-section.component.css',
})
export class SupervisorBackupsSectionComponent implements OnInit {
  backups: BackupListItem[] = [];
  lastBackupFilename: string | null = null;

  loadingBackups = false;
  creatingBackup = false;
  backupName = '';

  /** Nombre del archivo con una operación en curso (verificar / probar / restaurar). */
  busyFilename: string | null = null;

  readonly title = $localize`:@@supervisorBackups.title:Respaldos de base de datos`;
  readonly refreshLabel = $localize`:@@supervisorBackups.refresh:Actualizar`;
  readonly createLabel = $localize`:@@supervisorBackups.create:Crear respaldo`;
  readonly creatingLabel = $localize`:@@supervisorBackups.creating:Creando…`;
  readonly nameLabel = $localize`:@@supervisorBackups.nameLabel:Nombre del respaldo (opcional)`;
  readonly nameHint = $localize`:@@supervisorBackups.nameHint:Ej: prod_mayo, bdresp1. Si lo dejas vacío se genera automáticamente.`;
  readonly productionNote = $localize`:@@supervisorBackups.productionNote:Recomendado antes de despliegues o cambios en producción. Guarda una copia del estado actual de la base de datos en el servidor.`;
  readonly lastLabel = $localize`:@@supervisorBackups.last:Último respaldo`;
  readonly emptyLabel = $localize`:@@supervisorBackups.empty:No hay respaldos disponibles`;
  readonly loadingLabel = $localize`:@@supervisorBackups.loading:Cargando respaldos...`;
  readonly createdOk = $localize`:@@supervisorBackups.createdOk:Respaldo creado correctamente`;
  readonly createdAs = $localize`:@@supervisorBackups.createdAs:Archivo generado`;
  readonly errLoad = $localize`:@@supervisorBackups.errLoad:Error al cargar respaldos`;
  readonly errCreate = $localize`:@@supervisorBackups.errCreate:Error al crear respaldo`;
  readonly verifyLabel = $localize`:@@supervisorBackups.verify:Verificar`;
  readonly testRestoreLabel = $localize`:@@supervisorBackups.testRestore:Probar restauración`;
  readonly restoreLabel = $localize`:@@supervisorBackups.restore:Restaurar`;
  readonly verifyOkPrefix = $localize`:@@supervisorBackups.verifyOkPrefix:Respaldo íntegro`;
  readonly verifyBadPrefix = $localize`:@@supervisorBackups.verifyBadPrefix:El respaldo no pasó la verificación`;
  readonly errVerify = $localize`:@@supervisorBackups.errVerify:Error al verificar el respaldo`;
  readonly errTestRestore = $localize`:@@supervisorBackups.errTestRestore:Error al probar la restauración`;
  readonly errRestore = $localize`:@@supervisorBackups.errRestore:Error al restaurar el respaldo`;
  readonly restoreOk = $localize`:@@supervisorBackups.restoreOk:Respaldo restaurado correctamente`;
  readonly restoreConfirm = $localize`:@@supervisorBackups.restoreConfirm:¿Restaurar la base de datos desde este respaldo? Esta acción sobrescribirá los datos actuales y no se puede deshacer.`;

  constructor(
    private supervisorService: SupervisorService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadBackups();
  }

  loadBackups(): void {
    this.loadingBackups = true;
    this.supervisorService.listBackups().subscribe({
      next: ({ backups, lastBackup }) => {
        this.backups = backups ?? [];
        this.lastBackupFilename = lastBackup?.filename ?? this.backups[0]?.filename ?? null;
        this.loadingBackups = false;
      },
      error: () => {
        this.toastService.error(this.errLoad);
        this.backups = [];
        this.loadingBackups = false;
      },
    });
  }

  createBackup(): void {
    if (this.creatingBackup) return;
    this.creatingBackup = true;
    this.supervisorService.createBackup('full', this.backupName).subscribe({
      next: (response) => {
        const filename = response.backup?.filename;
        this.lastBackupFilename = filename ?? this.lastBackupFilename;
        const detail = filename ? `${this.createdAs}: ${filename}` : this.createdOk;
        this.toastService.success(detail);
        this.creatingBackup = false;
        this.backupName = '';
        this.loadBackups();
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errCreate;
        this.toastService.error(msg);
        this.creatingBackup = false;
      },
    });
  }

  verifyBackup(backup: BackupListItem): void {
    if (this.busyFilename) return;
    this.busyFilename = backup.filename;
    this.supervisorService.verifyBackup(backup.filename).subscribe({
      next: ({ valid }) => {
        if (valid) {
          this.toastService.success(`${this.verifyOkPrefix}: ${backup.filename}`);
        } else {
          this.toastService.warning(`${this.verifyBadPrefix}: ${backup.filename}`);
        }
        this.busyFilename = null;
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errVerify;
        this.toastService.error(msg);
        this.busyFilename = null;
      },
    });
  }

  testRestore(backup: BackupListItem): void {
    if (this.busyFilename) return;
    this.busyFilename = backup.filename;
    this.supervisorService.testRestore(backup.filename).subscribe({
      next: ({ success, message }) => {
        if (success) {
          this.toastService.success(message);
        } else {
          this.toastService.warning(message);
        }
        this.busyFilename = null;
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errTestRestore;
        this.toastService.error(msg);
        this.busyFilename = null;
      },
    });
  }

  restoreBackup(backup: BackupListItem): void {
    if (this.busyFilename) return;
    if (!window.confirm(`${this.restoreConfirm}\n\n${backup.filename}`)) {
      return;
    }
    this.busyFilename = backup.filename;
    this.supervisorService.restoreBackup(backup.filename).subscribe({
      next: () => {
        this.toastService.success(this.restoreOk);
        this.busyFilename = null;
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || this.errRestore;
        this.toastService.error(msg);
        this.busyFilename = null;
      },
    });
  }

  formatBackupSize(bytes: number): string {
    if (!bytes) return '0 B';
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
