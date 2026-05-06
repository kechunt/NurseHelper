import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { FormsModule } from '@angular/forms';
import { NurseService } from '../../../services/nurse.service';
import { ToastService } from '../../../services/toast.service';
import type { NurseAddMedicationPatientOption } from '../nurse-add-medication-modal/nurse-add-medication-modal.component';
import { nurseWeekdaySelectOptionsMondayFirst } from '../nurse-dashboard-ui-i18n.helpers';
import { NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN } from '../nurse-dashboard-http-fallback-messages.helpers';
import {
  NURSE_MODAL_ADD_TRT_ERR_CREATE_FALLBACK,
  NURSE_MODAL_ADD_TRT_ERR_INVALID_DAYS,
  NURSE_MODAL_ADD_TRT_WARN_ADD_SCHEDULE,
  NURSE_MODAL_ADD_TRT_WARN_REQUIRED_FIELDS,
  NURSE_MODAL_ADD_TRT_WARN_SELECT_DATE,
  NURSE_MODAL_ADD_TRT_WARN_SELECT_WEEKDAY,
  nurseModalAddTreatmentErrorToast,
  nurseModalAddTreatmentSuccessRecurringToast,
  nurseModalAddTreatmentSuccessSingleToast,
} from '../nurse-modal-component-toasts.helpers';

export type NurseAddTreatmentModalMode = 'global' | 'fromPatient';

@Component({
  selector: 'app-nurse-add-treatment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective],
  templateUrl: './nurse-add-treatment-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    '../nurse-add-medication-modal/nurse-add-medication-modal.component.css',
    './nurse-add-treatment-modal.component.css',
  ],
})
export class NurseAddTreatmentModalComponent implements OnInit {
  @Input({ required: true }) patients!: NurseAddMedicationPatientOption[];

  @Input() mode: NurseAddTreatmentModalMode = 'global';

  /** En modo `fromPatient`, cabecera con nombre y cama. */
  @Input() fromPatientContext: { id: string; name: string; bedNumber: string } | null = null;

  /** En modo `global`, paciente preseleccionado (p. ej. filtro de tareas). */
  @Input() initialPatientId = '';

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<{ patientId: number }>();

  isAdding = false;

  newTreatment: {
    patientId: string;
    description: string;
    scheduleType: 'single' | 'recurring';
    date: string;
    times: string[];
    time: string;
    daysOfWeek: number[];
    duration: number;
    durationUnit: string;
    notes: string;
  } = {
    patientId: '',
    description: '',
    scheduleType: 'recurring',
    date: '',
    times: ['08:00'],
    time: '08:00',
    daysOfWeek: [],
    duration: 4,
    durationUnit: 'weeks',
    notes: '',
  };

  readonly daysOfWeek = nurseWeekdaySelectOptionsMondayFirst();

  constructor(
    private readonly nurseService: NurseService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.mode === 'fromPatient' && this.fromPatientContext) {
      this.newTreatment = {
        patientId: this.fromPatientContext.id,
        description: '',
        scheduleType: 'recurring',
        date: this.getTodayDate(),
        times: ['08:00'],
        time: '08:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        duration: 4,
        durationUnit: 'weeks',
        notes: '',
      };
    } else {
      this.newTreatment = {
        patientId: this.initialPatientId || '',
        description: '',
        scheduleType: 'recurring',
        date: '',
        times: ['08:00'],
        time: '08:00',
        daysOfWeek: [],
        duration: 4,
        durationUnit: 'weeks',
        notes: '',
      };
    }
    this.isAdding = false;
  }

  get isFromPatient(): boolean {
    return this.mode === 'fromPatient';
  }

  onBackdrop(): void {
    if (!this.isAdding) {
      this.dismissed.emit();
    }
  }

  onCancel(): void {
    if (!this.isAdding) {
      this.dismissed.emit();
    }
  }

  getTodayDate(): string {
    return this.getLocalYmd(new Date());
  }

  private getLocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onScheduleTypeChange(): void {
    if (this.newTreatment.scheduleType === 'single') {
      this.newTreatment.date = this.newTreatment.date || this.getTodayDate();
      this.newTreatment.time = this.newTreatment.time || this.newTreatment.times?.[0] || '08:00';
      return;
    }
    if (!this.newTreatment.times || this.newTreatment.times.length === 0) {
      this.newTreatment.times = [this.newTreatment.time || '08:00'];
    }
    if (!Array.isArray(this.newTreatment.daysOfWeek) || this.newTreatment.daysOfWeek.length === 0) {
      this.newTreatment.daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    }
  }

  addTreatmentTime(): void {
    if (!this.newTreatment.times) {
      this.newTreatment.times = ['08:00'];
    }
    this.newTreatment.times.push('08:00');
  }

  removeTreatmentTime(index: number): void {
    if (this.newTreatment.times && this.newTreatment.times.length > 1) {
      this.newTreatment.times.splice(index, 1);
    }
  }

  isTreatmentDaySelected(dayValue: string): boolean {
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return this.newTreatment.daysOfWeek.includes(dayMap[dayValue]);
  }

  toggleTreatmentDay(dayValue: string): void {
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const dayIndex = dayMap[dayValue];
    const index = this.newTreatment.daysOfWeek.indexOf(dayIndex);

    if (index > -1) {
      this.newTreatment.daysOfWeek.splice(index, 1);
    } else {
      this.newTreatment.daysOfWeek.push(dayIndex);
    }

    this.newTreatment.daysOfWeek.sort((a: number, b: number) => a - b);
  }

  selectAllTreatmentDays(): void {
    this.newTreatment.daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
  }

  confirmAdd(): void {
    if (this.isAdding) {
      return;
    }

    if (!this.newTreatment.patientId || !this.newTreatment.description) {
      this.toast.warning(NURSE_MODAL_ADD_TRT_WARN_REQUIRED_FIELDS);
      return;
    }

    const timesToUse =
      this.newTreatment.times && this.newTreatment.times.length > 0
        ? this.newTreatment.times
        : this.newTreatment.time
          ? [this.newTreatment.time]
          : [];

    if (timesToUse.length === 0) {
      this.toast.warning(NURSE_MODAL_ADD_TRT_WARN_ADD_SCHEDULE);
      return;
    }

    if (this.newTreatment.scheduleType === 'single' && !this.newTreatment.date) {
      this.toast.warning(NURSE_MODAL_ADD_TRT_WARN_SELECT_DATE);
      return;
    }

    if (
      this.newTreatment.scheduleType === 'recurring' &&
      (!this.newTreatment.daysOfWeek || this.newTreatment.daysOfWeek.length === 0)
    ) {
      this.toast.warning(NURSE_MODAL_ADD_TRT_WARN_SELECT_WEEKDAY);
      return;
    }

    if (this.newTreatment.scheduleType === 'recurring' && !Array.isArray(this.newTreatment.daysOfWeek)) {
      this.toast.error(NURSE_MODAL_ADD_TRT_ERR_INVALID_DAYS);
      return;
    }

    this.isAdding = true;

    const treatmentData: {
      patientId: number;
      description: string;
      scheduleType: 'single' | 'recurring';
      notes: string;
      date?: string;
      time?: string;
      times?: string[];
      daysOfWeek?: number[];
      duration?: number;
      durationUnit?: string;
    } = {
      patientId: parseInt(this.newTreatment.patientId, 10),
      description: this.newTreatment.description,
      scheduleType: this.newTreatment.scheduleType,
      notes: this.newTreatment.notes || '',
    };

    if (this.newTreatment.scheduleType === 'single') {
      treatmentData.date = this.newTreatment.date;
      treatmentData.time = timesToUse[0];
      treatmentData.times = timesToUse;
    } else {
      treatmentData.times = timesToUse;
      treatmentData.time = timesToUse[0];
      treatmentData.daysOfWeek = Array.isArray(this.newTreatment.daysOfWeek)
        ? this.newTreatment.daysOfWeek.map((d) => (typeof d === 'number' ? d : parseInt(String(d), 10)))
        : [];
      treatmentData.duration = this.newTreatment.duration || 4;
      treatmentData.durationUnit = this.newTreatment.durationUnit || 'weeks';
    }

    const savedTreatmentPatientId = treatmentData.patientId;

    this.nurseService.addTreatment(treatmentData).subscribe({
      next: (response) => {
        const n = response.count ?? response.schedules?.length ?? 0;
        const msg =
          this.newTreatment.scheduleType === 'single'
            ? nurseModalAddTreatmentSuccessSingleToast(n)
            : nurseModalAddTreatmentSuccessRecurringToast(n);
        this.toast.success(msg);
        this.isAdding = false;
        this.saved.emit({ patientId: savedTreatmentPatientId });
      },
      error: (error) => {
        const errorMessage =
          error?.error?.message || error?.error?.error || NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN;
        this.toast.error(nurseModalAddTreatmentErrorToast(errorMessage));
        this.isAdding = false;
      },
    });
  }
}
