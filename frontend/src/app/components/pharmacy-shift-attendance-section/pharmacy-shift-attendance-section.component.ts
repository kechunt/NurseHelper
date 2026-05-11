import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PharmacyService,
  PharmacyShiftAttendanceRow,
  PharmacyShiftCoverageSummaryShift,
} from '../../services/pharmacy.service';
import type { Shift } from '../../services/shifts.service';
import { ShiftRealtimeService } from '../../shared/services/shift-realtime.service';
import { formatLocalDateIsoYmd } from '../nurse-dashboard/nurse-dashboard-local-date.helpers';
import { ToastService } from '../../services/toast.service';
import { HeroIconComponent } from '../../shared/components/hero-icon/hero-icon.component';

@Component({
  selector: 'app-pharmacy-shift-attendance-section',
  standalone: true,
  imports: [CommonModule, FormsModule, HeroIconComponent],
  templateUrl: './pharmacy-shift-attendance-section.component.html',
  styleUrls: [
    '../../shared/styles/admin-table-unified.css',
    './pharmacy-shift-attendance-section.component.css',
  ],
})
export class PharmacyShiftAttendanceSectionComponent implements OnInit {
  pharmacyWorkShifts: Shift[] = [];
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
        this.pharmacyAttendanceLoadError =
          err?.error?.message || 'No se pudieron cargar los turnos para asistencia';
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
        this.pharmacyCoverageError =
          err?.error?.message || 'No se pudo cargar el resumen de cobertura por turno';
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
        this.pharmacyAttendanceLoadError =
          err?.error?.message || 'No se pudo cargar la asistencia de farmacia';
      },
    });
  }

  savePharmacyShiftAttendance(): void {
    const sid = this.pharmacyAttendanceShiftId;
    const date = (this.pharmacyAttendanceDate || '').trim();
    if (!sid || !date) {
      this.toastService.warning('Selecciona fecha y turno');
      return;
    }
    const hasOnDuty = this.pharmacyAttendanceRows.some(
      (r) => r.status === 'present' || r.status === 'late'
    );
    if (this.pharmacyAttendanceRows.length > 0 && !hasOnDuty) {
      this.toastService.warning('Debe haber al menos un encargado presente o tarde antes de guardar.');
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
        this.toastService.success(res.message || 'Asistencia guardada');
        this.loadPharmacyAttendanceRows();
        this.loadPharmacyCoverageSummary();
      },
      error: (err) => {
        this.pharmacyAttendanceSaving = false;
        const msg = err?.error?.message || 'No se pudo guardar la asistencia';
        this.toastService.error(msg);
      },
    });
  }
}
