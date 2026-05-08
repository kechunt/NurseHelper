import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService } from '../../../services/admin.service';
import { ReportService, ComplianceStats, MedicationReport } from '../../../services/report.service';
import { ToastService } from '../../../services/toast.service';
import { HandoverShiftSlot } from '../../../services/nurse.service';
import { AdminTeamHandoverModalComponent } from '../admin-team-handover-modal/admin-team-handover-modal.component';
import { NurseReportsModalComponent } from '../../../components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component';
import { HeroIconComponent } from '../hero-icon/hero-icon.component';

@Component({
  selector: 'app-staff-dashboard-quick-actions',
  standalone: true,
  imports: [CommonModule, AdminTeamHandoverModalComponent, NurseReportsModalComponent, HeroIconComponent],
  templateUrl: './staff-dashboard-quick-actions.component.html',
  styleUrl: './staff-dashboard-quick-actions.component.css',
})
export class StaffDashboardQuickActionsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly reportService = inject(ReportService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  showTeamHandover = false;
  handoverDate = '';
  handoverShift: HandoverShiftSlot = 'morning';
  handoverBody = '';
  handoverSaving = false;
  teamHandoverPendingNotice = false;
  handoverCanAcknowledge = false;
  private handoverReadKeyForCurrentNote: string | null = null;

  showReports = false;
  reportsLoading = false;
  reportsExporting = false;
  reportsError: string | null = null;
  reportsMedication: MedicationReport[] | null = null;
  reportsCompliance: ComplianceStats | null = null;
  reportsStart: Date | null = null;
  reportsEnd: Date | null = null;
  nursesForReports: { id: number; name: string }[] = [];
  reportNurseUserId: number | null = null;

  ngOnInit(): void {
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
    this.showTeamHandover = true;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prev = this.previousShiftTarget(`${y}-${m}-${day}`, this.currentShiftSlotFallback());
    this.handoverDate = prev.date;
    this.handoverShift = prev.shift;
    this.handoverBody = '';
    this.reloadAdminHandover();
  }

  closeTeamHandover(): void {
    this.showTeamHandover = false;
    this.handoverSaving = false;
    this.handoverCanAcknowledge = false;
    this.handoverReadKeyForCurrentNote = null;
  }

  onHandoverDateCommitted(): void {
    this.reloadAdminHandover();
  }

  onHandoverShiftCommitted(): void {
    this.reloadAdminHandover();
  }

  private reloadAdminHandover(): void {
    if (!this.handoverDate) {
      return;
    }
    this.adminService.getAdminHandoverNote(this.handoverDate, this.handoverShift).subscribe({
      next: (res) => {
        this.handoverBody = res.note?.body ?? '';
        const n = res.note;
        if (n?.id && n?.updatedAt) {
          const key = this.handoverReadStorageKey(
            n.noteDate || this.handoverDate,
            this.handoverShift,
            n.id,
            n.updatedAt
          );
          this.handoverReadKeyForCurrentNote = key;
          this.handoverCanAcknowledge = !this.isHandoverRead(key);
        } else {
          this.handoverReadKeyForCurrentNote = null;
          this.handoverCanAcknowledge = false;
        }
      },
      error: () => {
        this.handoverBody = '';
        this.handoverReadKeyForCurrentNote = null;
        this.handoverCanAcknowledge = false;
        this.toast.warning('No se pudo cargar la nota de coordinación.');
      },
    });
  }

  acknowledgeTeamHandoverRead(): void {
    if (!this.handoverReadKeyForCurrentNote) {
      return;
    }
    this.markHandoverRead(this.handoverReadKeyForCurrentNote);
    this.handoverCanAcknowledge = false;
    this.refreshTeamHandoverPendingNotice();
    this.toast.success('Nota marcada como leída.');
  }

  private handoverReadStorageKey(
    noteDate: string,
    shift: HandoverShiftSlot,
    noteId: number,
    updatedAt: string
  ): string {
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
          this.teamHandoverPendingNotice = false;
          return;
        }
        const key = this.handoverReadStorageKey(prev.date, prev.shift, n.id, n.updatedAt);
        this.teamHandoverPendingNotice = !this.isHandoverRead(key);
      },
      error: () => {
        this.teamHandoverPendingNotice = false;
      },
    });
  }

  saveTeamHandover(): void {
    if (!this.handoverDate || !this.handoverBody.trim()) {
      this.toast.warning('Escribe un contenido antes de guardar.');
      return;
    }
    this.handoverSaving = true;
    this.adminService.putAdminHandoverNote(this.handoverDate, this.handoverBody.trim(), this.handoverShift).subscribe({
      next: () => {
        this.handoverSaving = false;
        this.toast.success('Nota de coordinación guardada.');
        this.refreshTeamHandoverPendingNotice();
        this.closeTeamHandover();
      },
      error: (err) => {
        this.handoverSaving = false;
        const msg = err?.error?.message || 'No se pudo guardar la nota.';
        this.toast.error(msg);
      },
    });
  }

  openReports(): void {
    this.showReports = true;
    this.reportsLoading = true;
    this.reportsExporting = false;
    this.reportsError = null;
    this.reportsMedication = null;
    this.reportsCompliance = null;
    this.reportNurseUserId = null;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    this.reportsStart = start;
    this.reportsEnd = end;

    this.adminService
      .getUsersPaginated({ page: 1, limit: 400, role: 'nurse' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ users }) => {
          this.nursesForReports = (users || [])
            .filter((u) => u.id != null)
            .map((u) => ({
              id: u.id as number,
              name: `${(u.firstName || '').trim()} ${(u.lastName || '').trim()}`.trim() || (u.username ?? `ID ${u.id}`),
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es'));
          this.loadReportsData();
        },
        error: () => {
          this.nursesForReports = [];
          this.toast.warning('No se pudo cargar el listado de enfermeras; los reportes serán globales.');
          this.loadReportsData();
        },
      });
  }

  closeReports(): void {
    this.showReports = false;
    this.reportsLoading = false;
    this.reportsExporting = false;
    this.reportsError = null;
    this.reportsMedication = null;
    this.reportsCompliance = null;
    this.reportsStart = null;
    this.reportsEnd = null;
  }

  onReportNurseFilterChange(id: number | null): void {
    this.reportNurseUserId = id;
    this.loadReportsData();
  }

  private loadReportsData(): void {
    if (!this.reportsStart || !this.reportsEnd) {
      return;
    }
    this.reportsLoading = true;
    this.reportsError = null;
    const start = this.reportsStart;
    const end = this.reportsEnd;
    const nurseId = this.reportNurseUserId;
    forkJoin({
      med: this.reportService.generateMedicationReport(start, end, undefined, nurseId),
      comp: this.reportService.generateComplianceStats(start, end, undefined, nurseId),
    }).subscribe({
      next: ({ med, comp }) => {
        this.reportsMedication = med.report || [];
        this.reportsCompliance = comp.stats;
        this.reportsLoading = false;
      },
      error: (err) => {
        this.reportsLoading = false;
        const msg = err?.error?.message || 'Error al cargar reportes';
        this.reportsError = msg;
        this.toast.error(msg);
      },
    });
  }

  get reportsPeriodLabel(): string {
    if (!this.reportsStart || !this.reportsEnd) {
      return '';
    }
    const o: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${this.reportsStart.toLocaleDateString('es-ES', o)} → ${this.reportsEnd.toLocaleDateString('es-ES', o)}`;
  }

  downloadCsv(kind: 'compliance' | 'medication'): void {
    if (!this.reportsStart || !this.reportsEnd) {
      return;
    }
    this.reportsExporting = true;
    const start = this.reportsStart;
    const end = this.reportsEnd;
    const nurseId = this.reportNurseUserId;
    const slug = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
    this.reportService.exportReport(kind, 'csv', start, end, undefined, nurseId).subscribe({
      next: (blob) => {
        this.reportsExporting = false;
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
        this.reportsExporting = false;
        this.toast.error('No se pudo descargar el CSV');
      },
    });
  }

  downloadExcel(kind: 'compliance' | 'medication'): void {
    if (!this.reportsStart || !this.reportsEnd) {
      return;
    }
    this.reportsExporting = true;
    const start = this.reportsStart;
    const end = this.reportsEnd;
    const nurseId = this.reportNurseUserId;
    const slug = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
    this.reportService.exportReport(kind, 'excel', start, end, undefined, nurseId).subscribe({
      next: (blob) => {
        this.reportsExporting = false;
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
        this.reportsExporting = false;
        this.toast.error('No se pudo descargar el Excel');
      },
    });
  }
}
