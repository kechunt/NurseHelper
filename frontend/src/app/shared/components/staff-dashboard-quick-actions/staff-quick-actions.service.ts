import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService } from '../../../services/admin.service';
import { ReportService, ComplianceStats, MedicationReport } from '../../../services/report.service';
import { ToastService } from '../../../services/toast.service';
import { HandoverShiftSlot } from '../../../services/nurse.service';

/**
 * Estado y acciones de Coordinación + Reportes (admin / supervisor).
 * Se provee en el componente padre para que la barra (p. ej. dentro del nav)
 * y los modales (fuera del nav, sin `transform` ancestro) compartan instancia.
 */
@Injectable()
export class StaffQuickActionsService {
  private readonly adminService = inject(AdminService);
  private readonly reportService = inject(ReportService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly showTeamHandover = signal(false);
  readonly handoverDate = signal('');
  readonly handoverShift = signal<HandoverShiftSlot>('morning');
  readonly handoverBody = signal('');
  readonly handoverSaving = signal(false);
  readonly teamHandoverPendingNotice = signal(false);
  readonly handoverCanAcknowledge = signal(false);
  private handoverReadKeyForCurrentNote: string | null = null;

  readonly showReports = signal(false);
  readonly reportsLoading = signal(false);
  readonly reportsExporting = signal(false);
  readonly reportsError = signal<string | null>(null);
  readonly reportsMedication = signal<MedicationReport[] | null>(null);
  readonly reportsCompliance = signal<ComplianceStats | null>(null);
  readonly reportsStart = signal<Date | null>(null);
  readonly reportsEnd = signal<Date | null>(null);
  readonly nursesForReports = signal<{ id: number; name: string }[]>([]);
  readonly reportNurseUserId = signal<number | null>(null);

  readonly reportsPeriodLabel = computed(() => {
    const start = this.reportsStart();
    const end = this.reportsEnd();
    if (!start || !end) {
      return '';
    }
    const o: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${start.toLocaleDateString('es-ES', o)} → ${end.toLocaleDateString('es-ES', o)}`;
  });

  /** Llamar al montar la barra (p. ej. ngOnInit del toolbar o del wrapper). */
  initPendingNotice(): void {
    this.refreshTeamHandoverPendingNotice();
  }

  private currentShiftSlotFallback(): HandoverShiftSlot {
    const h = new Date().getHours();
    if (h >= 6 && h < 14) return 'morning';
    if (h >= 14 && h < 22) return 'afternoon';
    return 'night';
  }

  private previousShiftTarget(baseDateYmd: string, currentShift: HandoverShiftSlot): { date: string; shift: HandoverShiftSlot } {
    if (currentShift === 'afternoon') return { date: baseDateYmd, shift: 'morning' };
    if (currentShift === 'night') return { date: baseDateYmd, shift: 'afternoon' };
    const d = new Date(`${baseDateYmd}T12:00:00`);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { date: `${y}-${m}-${day}`, shift: 'night' };
  }

  openTeamHandover(): void {
    this.showTeamHandover.set(true);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prev = this.previousShiftTarget(`${y}-${m}-${day}`, this.currentShiftSlotFallback());
    this.handoverDate.set(prev.date);
    this.handoverShift.set(prev.shift);
    this.handoverBody.set('');
    this.reloadAdminHandover();
  }

  closeTeamHandover(): void {
    this.showTeamHandover.set(false);
    this.handoverSaving.set(false);
    this.handoverCanAcknowledge.set(false);
    this.handoverReadKeyForCurrentNote = null;
  }

  onHandoverDateCommitted(): void {
    this.reloadAdminHandover();
  }

  onHandoverShiftCommitted(): void {
    this.reloadAdminHandover();
  }

  setHandoverDate(v: string): void {
    this.handoverDate.set(v);
  }

  setHandoverShift(v: HandoverShiftSlot): void {
    this.handoverShift.set(v);
  }

  setHandoverBody(v: string): void {
    this.handoverBody.set(v);
  }

  private reloadAdminHandover(): void {
    const date = this.handoverDate();
    if (!date) {
      return;
    }
    const shift = this.handoverShift();
    this.adminService.getAdminHandoverNote(date, shift).subscribe({
      next: (res) => {
        this.handoverBody.set(res.note?.body ?? '');
        const n = res.note;
        if (n?.id && n?.updatedAt) {
          const key = this.handoverReadStorageKey(date, shift, n.id, n.updatedAt);
          this.handoverReadKeyForCurrentNote = key;
          this.handoverCanAcknowledge.set(!this.isHandoverRead(key));
        } else {
          this.handoverReadKeyForCurrentNote = null;
          this.handoverCanAcknowledge.set(false);
        }
      },
      error: () => {
        this.handoverBody.set('');
        this.handoverReadKeyForCurrentNote = null;
        this.handoverCanAcknowledge.set(false);
        this.toast.warning('No se pudo cargar la nota de coordinación.');
      },
    });
  }

  acknowledgeTeamHandoverRead(): void {
    if (!this.handoverReadKeyForCurrentNote) {
      return;
    }
    this.markHandoverRead(this.handoverReadKeyForCurrentNote);
    this.handoverCanAcknowledge.set(false);
    this.refreshTeamHandoverPendingNotice();
    this.toast.success('Nota marcada como leída.');
  }

  private handoverReadStorageKey(noteDate: string, shift: HandoverShiftSlot, noteId: number, updatedAt: string): string {
    return `handover_read:staff:${noteDate}:${shift}:${String(noteId)}:${updatedAt}`;
  }

  private isHandoverRead(key: string): boolean {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }

  private markHandoverRead(key: string): void {
    try {
      localStorage.setItem(key, '1');
    } catch {
      // noop
    }
  }

  private refreshTeamHandoverPendingNotice(): void {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prev = this.previousShiftTarget(`${y}-${m}-${day}`, this.currentShiftSlotFallback());
    this.adminService.getAdminHandoverNote(prev.date, prev.shift).subscribe({
      next: (res) => {
        const n = res.note;
        if (!n?.body?.trim() || !n?.id || !n?.updatedAt) {
          this.teamHandoverPendingNotice.set(false);
          return;
        }
        const key = this.handoverReadStorageKey(prev.date, prev.shift, n.id, n.updatedAt);
        this.teamHandoverPendingNotice.set(!this.isHandoverRead(key));
      },
      error: () => {
        this.teamHandoverPendingNotice.set(false);
      },
    });
  }

  saveTeamHandover(): void {
    const date = this.handoverDate();
    const body = this.handoverBody().trim();
    if (!date || !body) {
      this.toast.warning('Escribe un contenido antes de guardar.');
      return;
    }
    this.handoverSaving.set(true);
    this.adminService.putAdminHandoverNote(date, body, this.handoverShift()).subscribe({
      next: () => {
        this.handoverSaving.set(false);
        this.toast.success('Nota de coordinación guardada.');
        this.refreshTeamHandoverPendingNotice();
        this.closeTeamHandover();
      },
      error: (err) => {
        this.handoverSaving.set(false);
        const msg = err?.error?.message || 'No se pudo guardar la nota.';
        this.toast.error(msg);
      },
    });
  }

  openReports(): void {
    this.showReports.set(true);
    this.reportsLoading.set(true);
    this.reportsExporting.set(false);
    this.reportsError.set(null);
    this.reportsMedication.set(null);
    this.reportsCompliance.set(null);
    this.reportNurseUserId.set(null);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    this.reportsStart.set(start);
    this.reportsEnd.set(end);

    this.adminService
      .getUsersPaginated({ page: 1, limit: 400, role: 'nurse' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ users }) => {
          this.nursesForReports.set(
            (users || [])
              .filter((u) => u.id != null)
              .map((u) => ({
                id: u.id as number,
                name: `${(u.firstName || '').trim()} ${(u.lastName || '').trim()}`.trim() || (u.username ?? `ID ${u.id}`),
              }))
              .sort((a, b) => a.name.localeCompare(b.name, 'es'))
          );
          this.loadReportsData();
        },
        error: () => {
          this.nursesForReports.set([]);
          this.toast.warning('No se pudo cargar el listado de enfermeras; los reportes serán globales.');
          this.loadReportsData();
        },
      });
  }

  closeReports(): void {
    this.showReports.set(false);
    this.reportsLoading.set(false);
    this.reportsExporting.set(false);
    this.reportsError.set(null);
    this.reportsMedication.set(null);
    this.reportsCompliance.set(null);
    this.reportsStart.set(null);
    this.reportsEnd.set(null);
  }

  onReportNurseFilterChange(id: number | null): void {
    this.reportNurseUserId.set(id);
    this.loadReportsData();
  }

  private loadReportsData(): void {
    const start = this.reportsStart();
    const end = this.reportsEnd();
    if (!start || !end) {
      return;
    }
    this.reportsLoading.set(true);
    this.reportsError.set(null);
    const nurseId = this.reportNurseUserId();
    forkJoin({
      med: this.reportService.generateMedicationReport(start, end, undefined, nurseId),
      comp: this.reportService.generateComplianceStats(start, end, undefined, nurseId),
    }).subscribe({
      next: ({ med, comp }) => {
        this.reportsMedication.set(med.report || []);
        this.reportsCompliance.set(comp.stats);
        this.reportsLoading.set(false);
      },
      error: (err) => {
        this.reportsLoading.set(false);
        const msg = err?.error?.message || 'Error al cargar reportes';
        this.reportsError.set(msg);
        this.toast.error(msg);
      },
    });
  }

  downloadCsv(kind: 'compliance' | 'medication'): void {
    const start = this.reportsStart();
    const end = this.reportsEnd();
    if (!start || !end) {
      return;
    }
    this.reportsExporting.set(true);
    const nurseId = this.reportNurseUserId();
    const slug = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
    this.reportService.exportReport(kind, 'csv', start, end, undefined, nurseId).subscribe({
      next: (blob) => {
        this.reportsExporting.set(false);
        if (!blob?.size) {
          this.toast.warning('CSV vacío con los filtros actuales.');
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-admin-${kind}-${slug}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.toast.success('CSV descargado');
      },
      error: () => {
        this.reportsExporting.set(false);
        this.toast.error('No se pudo descargar el CSV');
      },
    });
  }

  downloadExcel(kind: 'compliance' | 'medication'): void {
    const start = this.reportsStart();
    const end = this.reportsEnd();
    if (!start || !end) {
      return;
    }
    this.reportsExporting.set(true);
    const nurseId = this.reportNurseUserId();
    const slug = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
    this.reportService.exportReport(kind, 'excel', start, end, undefined, nurseId).subscribe({
      next: (blob) => {
        this.reportsExporting.set(false);
        if (!blob?.size) {
          this.toast.warning('Excel vacío con los filtros actuales.');
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-admin-${kind}-${slug}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.toast.success('Excel descargado');
      },
      error: () => {
        this.reportsExporting.set(false);
        this.toast.error('No se pudo descargar el Excel');
      },
    });
  }
}
