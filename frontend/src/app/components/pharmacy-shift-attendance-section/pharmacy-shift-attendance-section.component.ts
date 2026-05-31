import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PharmacyService,
  PharmacyShiftAttendanceRow,
  PharmacyShiftCoverageSummaryShift,
} from '../../services/pharmacy.service';
import type { Shift, ShiftAttendanceStatus } from '../../services/shifts.service';
import { ShiftRealtimeService } from '../../shared/services/shift-realtime.service';
import { formatLocalDateIsoYmd } from '../nurse-dashboard/nurse-dashboard-local-date.helpers';
import { ToastService } from '../../services/toast.service';
import { BootstrapIconComponent } from '../../shared/components/bootstrap-icon/bootstrap-icon.component';
import {
  SchedAttendanceAssignModalComponent,
  type AttendanceMarkActionItem,
} from '../admin-dashboard/sched-attendance-assign-modal/sched-attendance-assign-modal.component';

@Component({
  selector: 'app-pharmacy-shift-attendance-section',
  standalone: true,
  imports: [CommonModule, FormsModule, BootstrapIconComponent, SchedAttendanceAssignModalComponent],
  templateUrl: './pharmacy-shift-attendance-section.component.html',
  styleUrls: [
    '../../shared/styles/admin-table-unified.css',
    './pharmacy-shift-attendance-section.component.css',
  ],
})
export class PharmacyShiftAttendanceSectionComponent implements OnInit {
  readonly pharmacyAttendanceErrLoadShifts = $localize`:@@pharmacyAttendance.errLoadShifts:No se pudieron cargar los turnos para asistencia`;
  readonly pharmacyAttendanceErrCoverageSummary = $localize`:@@pharmacyAttendance.errCoverageSummary:No se pudo cargar el resumen de cobertura por turno`;
  readonly pharmacyAttendanceErrLoadRows = $localize`:@@pharmacyAttendance.errLoadRows:No se pudo cargar la asistencia de farmacia`;
  readonly pharmacyAttendanceWarnPickDateShift = $localize`:@@pharmacyAttendance.warnPickDateShift:Selecciona fecha y turno`;
  readonly pharmacyAttendanceWarnNeedOnDuty = $localize`:@@pharmacyAttendance.warnNeedOnDuty:Debe haber al menos un encargado presente o tarde antes de guardar.`;
  readonly pharmacyAttendanceToastSavedOk = $localize`:@@pharmacyAttendance.toastSavedOk:Asistencia guardada`;
  readonly pharmacyAttendanceErrSave = $localize`:@@pharmacyAttendance.errSave:No se pudo guardar la asistencia`;

  readonly pharmacyAttendanceCoverageLoading = $localize`:@@pharmacyAttendance.coverageLoading:Cargando resumen…`;
  readonly pharmacyAttendanceNoPhone = $localize`:@@pharmacyAttendance.noPhone:Sin teléfono registrado`;
  readonly pharmacyAttendanceNoContactOnShift = $localize`:@@pharmacyAttendance.noContactOnShift:Sin encargado en turno`;
  readonly pharmacyAttendanceSectionTitle = $localize`:@@pharmacyAttendance.shiftSectionTitle:Asistencia del turno`;
  readonly pharmacyAttendanceLabelDate = $localize`:@@pharmacyAttendance.labelDate:Fecha`;
  readonly pharmacyAttendanceLabelShift = $localize`:@@pharmacyAttendance.labelShift:Turno`;
  readonly pharmacyAttendanceRowsLoading = $localize`:@@pharmacyAttendance.rowsLoading:Cargando asistencia…`;
  readonly pharmacyAttendanceThStaff = $localize`:@@pharmacyAttendance.thStaff:Personal`;
  readonly pharmacyAttendanceThStatus = $localize`:@@pharmacyAttendance.thStatus:Estado`;
  readonly pharmacyAttendanceStatusPresent = $localize`:@@pharmacyAttendance.statusPresent:Presente`;
  readonly pharmacyAttendanceStatusLate = $localize`:@@pharmacyAttendance.statusLate:Tarde`;
  readonly pharmacyAttendanceStatusAbsent = $localize`:@@pharmacyAttendance.statusAbsent:Ausente`;
  readonly pharmacyAttendanceStatusJustified = $localize`:@@pharmacyAttendance.statusJustified:Justificada`;
  readonly pharmacyAttendanceStatusMissing = $localize`:@@pharmacyAttendance.statusMissing:Falta`;
  readonly pharmacyAttendanceSaveSaving = $localize`:@@pharmacyAttendance.saveSaving:Guardando…`;
  readonly pharmacyAttendanceSaveIdle = $localize`:@@pharmacyAttendance.saveIdle:Guardar asistencia`;
  readonly pharmacyAttendanceModalFallback = $localize`:@@pharmacyAttendance.modalFallback:Asistencia`;
  readonly pharmacyAttendanceModalIntro = $localize`:@@pharmacyAttendance.modalIntro:Marca la asistencia del personal de farmacia en el turno seleccionado.`;
  readonly pharmacyAttendancePersonRoleLabel = $localize`:@@pharmacyAttendance.summaryStaff:Personal:`;
  readonly pharmacyAttendanceSummaryCheckIn = $localize`:@@pharmacyAttendance.summaryCheckIn:Entrada:`;

  pharmacyWorkShifts: Shift[] = [];
  pharmacyAttendanceActionsRow: PharmacyShiftAttendanceRow | null = null;
  private pharmacyAttendancePersistTimer: ReturnType<typeof setTimeout> | null = null;
  pharmacyAttendanceDate = formatLocalDateIsoYmd(new Date());
  pharmacyAttendanceShiftId: number | null = null;
  pharmacyAttendanceRows: PharmacyShiftAttendanceRow[] = [];
  pharmacyAttendanceLoading = false;
  pharmacyAttendanceSaving = false;
  pharmacyAttendanceLoadError: string | null = null;
  pharmacyAttendanceCurrentLabel = '';
  private pharmacyAttendanceShiftBootstrapped = false;

  pharmacyCoverageShifts: PharmacyShiftCoverageSummaryShift[] = [];
  pharmacyCoverageLoading = false;
  pharmacyCoverageError: string | null = null;

  constructor(
    private pharmacyService: PharmacyService,
    private toastService: ToastService,
    private shiftRealtime: ShiftRealtimeService
  ) {}

  ngOnInit(): void {
    this.bootstrapPharmacyShiftAttendance();
  }

  pharmacyCoverageTitle(): string {
    return $localize`:@@pharmacyAttendance.coverageTitle:Cobertura farmacia por turno (${this.pharmacyAttendanceDate}:date:)`;
  }

  pharmacyCoverageMetaLine(s: PharmacyShiftCoverageSummaryShift): string {
    const n = this.pharmacyCoveragePresentCount(s);
    return $localize`:@@pharmacyAttendance.coverageMeta:En turno: ${n}:count: · Pulsa para editar asistencia`;
  }

  pharmacyAttendanceCurrentShiftHint(): string {
    return $localize`:@@pharmacyAttendance.currentShiftHint:Turno según hora actual: ${this.pharmacyAttendanceCurrentLabel}:label:`;
  }

  pharmacyAttendanceSaveButtonLabel(): string {
    return this.pharmacyAttendanceSaving ? this.pharmacyAttendanceSaveSaving : this.pharmacyAttendanceSaveIdle;
  }

  private bootstrapPharmacyShiftAttendance(): void {
    this.pharmacyService.getWorkShifts().subscribe({
      next: (shifts) => {
        this.pharmacyWorkShifts = shifts || [];
        if (!this.pharmacyAttendanceShiftBootstrapped && this.pharmacyWorkShifts.length > 0) {
          const cur = this.shiftRealtime.resolveCurrentShift(this.pharmacyWorkShifts, new Date(), true);
          this.pharmacyAttendanceShiftId = cur?.id != null ? Number(cur.id) : this.pharmacyWorkShifts[0].id;
          this.pharmacyAttendanceShiftBootstrapped = true;
        }
        this.refreshPharmacyAttendanceCurrentLabel();
        this.loadPharmacyAttendanceRows();
        this.loadPharmacyCoverageSummary();
      },
      error: (err) => {
        this.pharmacyAttendanceLoadError = err?.error?.message || this.pharmacyAttendanceErrLoadShifts;
      },
    });
  }

  loadPharmacyCoverageSummary(): void {
    const date = (this.pharmacyAttendanceDate || '').trim();
    if (!date) {
      this.pharmacyCoverageShifts = [];
      return;
    }
    this.pharmacyCoverageLoading = true;
    this.pharmacyCoverageError = null;
    this.pharmacyService.getPharmacyShiftAttendanceSummary(date).subscribe({
      next: (res) => {
        this.pharmacyCoverageShifts = res?.shifts ?? [];
        this.pharmacyCoverageLoading = false;
      },
      error: (err) => {
        this.pharmacyCoverageLoading = false;
        this.pharmacyCoverageShifts = [];
        this.pharmacyCoverageError = err?.error?.message || this.pharmacyAttendanceErrCoverageSummary;
      },
    });
  }

  selectPharmacyCoverageShift(shiftId: number): void {
    this.pharmacyAttendanceShiftId = shiftId;
    this.loadPharmacyAttendanceRows();
  }

  pharmacyCoveragePresentCount(s: PharmacyShiftCoverageSummaryShift): number {
    return (s.attendance || []).filter((r) => r.status === 'present' || r.status === 'late').length;
  }

  private refreshPharmacyAttendanceCurrentLabel(): void {
    const cur = this.shiftRealtime.resolveCurrentShift(this.pharmacyWorkShifts, new Date(), false);
    this.pharmacyAttendanceCurrentLabel = this.shiftRealtime.formatShiftLabel(cur);
  }

  onPharmacyAttendanceDateOrShiftChange(): void {
    this.loadPharmacyAttendanceRows();
    this.loadPharmacyCoverageSummary();
  }

  loadPharmacyAttendanceRows(): void {
    const sid = this.pharmacyAttendanceShiftId;
    const date = (this.pharmacyAttendanceDate || '').trim();
    if (!sid || !date) {
      this.pharmacyAttendanceRows = [];
      return;
    }
    this.pharmacyAttendanceLoading = true;
    this.pharmacyAttendanceLoadError = null;
    this.pharmacyService.getPharmacyShiftAttendance(date, sid).subscribe({
      next: (rows) => {
        this.pharmacyAttendanceRows = rows.map((r) => ({ ...r }));
        this.pharmacyAttendanceLoading = false;
      },
      error: (err) => {
        this.pharmacyAttendanceLoading = false;
        this.pharmacyAttendanceRows = [];
        this.pharmacyAttendanceLoadError = err?.error?.message || this.pharmacyAttendanceErrLoadRows;
      },
    });
  }

  openPharmacyAttendanceSheet(row: PharmacyShiftAttendanceRow): void {
    this.pharmacyAttendanceActionsRow = row;
  }

  closePharmacyAttendanceSheet(): void {
    this.pharmacyAttendanceActionsRow = null;
  }

  onPharmacyAttendanceRowKeydown(row: PharmacyShiftAttendanceRow, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPharmacyAttendanceSheet(row);
    }
  }

  getPharmacyAttendanceModalTitle(): string {
    return this.pharmacyAttendanceActionsRow?.pharmacyUserName ?? this.pharmacyAttendanceModalFallback;
  }

  getPharmacyAttendanceShiftLabel(): string {
    const sid = this.pharmacyAttendanceShiftId;
    const shift =
      sid != null
        ? this.pharmacyWorkShifts.find((s) => Number(s.id) === Number(sid)) ?? null
        : null;
    return this.shiftRealtime.formatShiftLabel(shift) || '—';
  }

  getPharmacyAttendanceStatusActions(): AttendanceMarkActionItem[] {
    return [
      { status: 'present', label: this.pharmacyAttendanceStatusPresent, modifier: 'present' },
      { status: 'late', label: this.pharmacyAttendanceStatusLate, modifier: 'late' },
      { status: 'justified', label: this.pharmacyAttendanceStatusJustified, modifier: 'justified' },
      { status: 'missing', label: this.pharmacyAttendanceStatusMissing, modifier: 'missing' },
      { status: 'absent', label: this.pharmacyAttendanceStatusAbsent, modifier: 'absent' },
    ];
  }

  onPharmacyAttendanceModalMark(status: ShiftAttendanceStatus): void {
    const row = this.pharmacyAttendanceActionsRow;
    if (!row) {
      return;
    }
    switch (status) {
      case 'present':
        this.markPharmacyPresent(row);
        break;
      case 'late':
        this.markPharmacyLate(row);
        break;
      case 'justified':
        this.markPharmacyJustified(row);
        break;
      case 'missing':
        this.markPharmacyMissing(row);
        break;
      case 'absent':
        this.markPharmacyAbsent(row);
        break;
    }
    this.closePharmacyAttendanceSheet();
  }

  getPharmacyAttendanceRowAriaLabel(row: PharmacyShiftAttendanceRow): string {
    return $localize`:@@pharmacyAttendance.ariaRow:Toma de lista: ${row.pharmacyUserName}:name:`;
  }

  pharmacyAttendanceSheetSummary(row: PharmacyShiftAttendanceRow): string[] {
    return [
      row.pharmacyUserName,
      this.getPharmacyAttendanceStatusLabel(row.status),
      this.formatPharmacyCheckIn(row.checkInAt),
    ];
  }

  getPharmacyAttendanceStatusLabel(status: ShiftAttendanceStatus): string {
    switch (status) {
      case 'present':
        return this.pharmacyAttendanceStatusPresent;
      case 'late':
        return this.pharmacyAttendanceStatusLate;
      case 'justified':
        return this.pharmacyAttendanceStatusJustified;
      case 'missing':
        return this.pharmacyAttendanceStatusMissing;
      case 'absent':
        return this.pharmacyAttendanceStatusAbsent;
      default:
        return this.pharmacyAttendanceStatusAbsent;
    }
  }

  formatPharmacyCheckIn(value?: string | null): string {
    if (!value) {
      return '—';
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleString('es-MX', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  setPharmacyAttendanceStatus(row: PharmacyShiftAttendanceRow, status: ShiftAttendanceStatus): void {
    row.status = status;
    const nowIso = new Date().toISOString();
    if (status === 'present' || status === 'late') {
      row.checkInAt = row.checkInAt || nowIso;
      row.checkOutAt = null;
    } else {
      row.checkInAt = null;
      row.checkOutAt = null;
    }
    this.schedulePharmacyAttendancePersist();
  }

  markPharmacyPresent(row: PharmacyShiftAttendanceRow): void {
    this.setPharmacyAttendanceStatus(row, 'present');
  }

  markPharmacyLate(row: PharmacyShiftAttendanceRow): void {
    this.setPharmacyAttendanceStatus(row, 'late');
  }

  markPharmacyJustified(row: PharmacyShiftAttendanceRow): void {
    this.setPharmacyAttendanceStatus(row, 'justified');
  }

  markPharmacyMissing(row: PharmacyShiftAttendanceRow): void {
    this.setPharmacyAttendanceStatus(row, 'missing');
  }

  markPharmacyAbsent(row: PharmacyShiftAttendanceRow): void {
    this.setPharmacyAttendanceStatus(row, 'absent');
  }

  private schedulePharmacyAttendancePersist(): void {
    if (this.pharmacyAttendancePersistTimer) {
      clearTimeout(this.pharmacyAttendancePersistTimer);
    }
    this.pharmacyAttendancePersistTimer = setTimeout(() => {
      this.pharmacyAttendancePersistTimer = null;
      this.savePharmacyShiftAttendance();
    }, 450);
  }

  savePharmacyShiftAttendance(): void {
    const sid = this.pharmacyAttendanceShiftId;
    const date = (this.pharmacyAttendanceDate || '').trim();
    if (!sid || !date) {
      this.toastService.warning(this.pharmacyAttendanceWarnPickDateShift);
      return;
    }
    const hasOnDuty = this.pharmacyAttendanceRows.some(
      (r) => r.status === 'present' || r.status === 'late'
    );
    if (this.pharmacyAttendanceRows.length > 0 && !hasOnDuty) {
      this.toastService.warning(this.pharmacyAttendanceWarnNeedOnDuty);
      return;
    }
    this.pharmacyAttendanceSaving = true;
    const payload = this.pharmacyAttendanceRows.map((r) => ({
      pharmacyUserId: r.pharmacyUserId,
      status: r.status,
      checkInAt: r.checkInAt ?? null,
      checkOutAt: r.checkOutAt ?? null,
      notes: r.notes ?? null,
    }));
    this.pharmacyService.savePharmacyShiftAttendance(date, sid, payload).subscribe({
      next: (res) => {
        this.pharmacyAttendanceSaving = false;
        this.toastService.success(res.message || this.pharmacyAttendanceToastSavedOk);
        this.loadPharmacyAttendanceRows();
        this.loadPharmacyCoverageSummary();
      },
      error: (err) => {
        this.pharmacyAttendanceSaving = false;
        const msg = err?.error?.message || this.pharmacyAttendanceErrSave;
        this.toastService.error(msg);
      },
    });
  }
}
