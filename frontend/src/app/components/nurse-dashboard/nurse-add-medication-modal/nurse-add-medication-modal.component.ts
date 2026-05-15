import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { FormsModule } from '@angular/forms';
import { NurseDashboardPatientCareCreateFacade } from '../facades/nurse-dashboard-patient-care-create.facade';
import { ToastService } from '../../../services/toast.service';
import { nurseWeekdaySelectOptionsMondayFirst } from '../nurse-dashboard-ui-i18n.helpers';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import {
  NURSE_MODAL_ADD_MED_ERR_FALLBACK,
  NURSE_MODAL_ADD_MED_WARN_COMPLETE_FIELDS,
  NURSE_MODAL_ADD_MED_WARN_SELECT_WEEKDAY,
  nurseModalAddMedicationSuccessToast,
} from '../nurse-modal-component-toasts.helpers';

/** Fila mínima para el desplegable de pacientes (misma forma que `Patient` del dashboard). */
export interface NurseAddMedicationPatientOption {
  id: string;
  name: string;
  bedNumber?: string;
}

@Component({
  selector: 'app-nurse-add-medication-modal',
  standalone: true,
  providers: [NurseDashboardPatientCareCreateFacade],
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective, BootstrapIconComponent],
  templateUrl: './nurse-add-medication-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './nurse-add-medication-modal.component.css',
  ],
})
export class NurseAddMedicationModalComponent implements OnInit {
  @Input({ required: true }) patients!: NurseAddMedicationPatientOption[];

  /** Si es true, el paciente no se puede cambiar (apertura desde ficha de paciente). */
  @Input() lockPatientSelect = false;

  /** Id de paciente preseleccionado al abrir. */
  @Input() initialPatientId = '';

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<{ patientId: number }>();

  selectedPatientId = '';
  isAdding = false;

  newMedication: {
    medication: string;
    dosage: string;
    frequency: string;
    times: string[];
    /** `'all'` o lista de claves tipo `monday`. */
    days: 'all' | string[];
    duration: number;
    durationUnit: 'days' | 'weeks' | 'months';
    notes: string;
  } = {
    medication: '',
    dosage: '',
    frequency: '',
    times: ['08:00'],
    days: 'all',
    duration: 30,
    durationUnit: 'days',
    notes: '',
  };

  suggestedTimes = '';

  readonly daysOfWeek = nurseWeekdaySelectOptionsMondayFirst();

  selectedDays: string[] = [];

  constructor(
    private readonly careCreate: NurseDashboardPatientCareCreateFacade,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.resetForm();
    this.selectedPatientId = this.initialPatientId || '';
  }

  private resetForm(): void {
    this.newMedication = {
      medication: '',
      dosage: '',
      frequency: '',
      times: ['08:00'],
      days: 'all',
      duration: 30,
      durationUnit: 'days',
      notes: '',
    };
    this.selectedDays = [];
    this.suggestedTimes = '';
    this.isAdding = false;
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

  getSelectedPatientName(): string {
    if (!this.selectedPatientId) {
      return '';
    }
    const patient = this.patients.find((p) => p.id === this.selectedPatientId);
    return patient ? patient.name : '';
  }

  updateTimeSuggestions(): void {
    const suggestions: Record<string, string> = {
      once: '08:00',
      twice: '08:00, 20:00',
      three_times: '08:00, 14:00, 20:00',
      four_times: '06:00, 12:00, 18:00, 00:00',
      every_6h: '00:00, 06:00, 12:00, 18:00',
      every_8h: '08:00, 16:00, 00:00',
      every_12h: '08:00, 20:00',
      every_24h: '08:00',
    };

    this.suggestedTimes = suggestions[this.newMedication.frequency] || 'Personalizado';

    if (this.newMedication.frequency && this.newMedication.frequency !== 'custom') {
      this.newMedication.times = this.suggestedTimes.split(', ');
    }
  }

  addTime(): void {
    this.newMedication.times.push('12:00');
  }

  removeTime(index: number): void {
    this.newMedication.times.splice(index, 1);
  }

  isDaySelected(day: string): boolean {
    if (this.newMedication.days === 'all') {
      return true;
    }
    return this.selectedDays.includes(day);
  }

  toggleDay(day: string): void {
    if (this.newMedication.days === 'all') {
      this.newMedication.days = [];
      this.selectedDays = [day];
    } else {
      const index = this.selectedDays.indexOf(day);
      if (index > -1) {
        this.selectedDays.splice(index, 1);
      } else {
        this.selectedDays.push(day);
      }
    }
    this.newMedication.days = this.selectedDays.length === 7 ? 'all' : this.selectedDays;
  }

  selectAllDays(): void {
    this.newMedication.days = 'all';
    this.selectedDays = [];
  }

  private getLocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  confirmAdd(): void {
    if (this.isAdding) {
      return;
    }

    if (
      !this.selectedPatientId ||
      !this.newMedication.medication ||
      !this.newMedication.dosage ||
      this.newMedication.times.length === 0
    ) {
      this.toast.warning(NURSE_MODAL_ADD_MED_WARN_COMPLETE_FIELDS);
      return;
    }

    if (this.newMedication.days !== 'all' && (!this.selectedDays || this.selectedDays.length === 0)) {
      this.toast.warning(NURSE_MODAL_ADD_MED_WARN_SELECT_WEEKDAY);
      return;
    }

    this.isAdding = true;

    let daysToSend: string[] | 'all';
    if (this.newMedication.days === 'all') {
      daysToSend = 'all';
    } else {
      daysToSend = this.selectedDays.length > 0 ? this.selectedDays : (this.newMedication.days as string[]);
    }

    const medicationData = {
      patientId: parseInt(this.selectedPatientId, 10),
      medication: this.newMedication.medication,
      dosage: this.newMedication.dosage,
      frequency: this.newMedication.frequency,
      times: this.newMedication.times,
      days: daysToSend,
      duration: this.newMedication.duration,
      durationUnit: this.newMedication.durationUnit,
      notes: this.newMedication.notes,
      startDate: this.getLocalYmd(new Date()),
    };

    const patientIdNum = medicationData.patientId;

    this.careCreate.addMedication(medicationData).subscribe({
      next: (response) => {
        const r = response as { schedulesCreated?: number };
        this.toast.success(nurseModalAddMedicationSuccessToast(r.schedulesCreated || 0));
        this.isAdding = false;
        this.saved.emit({ patientId: patientIdNum });
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || NURSE_MODAL_ADD_MED_ERR_FALLBACK;
        this.toast.error(msg);
        this.isAdding = false;
      },
    });
  }
}
