import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import type { MedicationTodaySlot } from '../medication-today-slot.model';
import { medicationSlotStatusLabel } from '../nurse-patient-medication-helpers';
import { nurseUiEmDash } from '../nurse-dashboard-ui-i18n.helpers';

/** Fila de medicación del día (misma idea que `MedicationTodaySlot` en el dashboard). */
export interface MedicationDayDetailSlot {
  name: string;
  medication?: string;
  dosage: string;
  notes: string;
  time: string;
  scheduledTime: string;
  status: string;
  completed?: boolean;
  notCompleted?: boolean;
  cancelled?: boolean;
}

export interface MedicationDayDetailPautaSlot {
  scheduledTime?: string;
  timeLabel?: string;
}

/** Fragmento de `medicationsDetail` para frecuencia, notas de pauta y vista semanal. */
export interface MedicationDayDetailPauta {
  frequency?: string;
  schedules?: string;
  notes?: string;
  scheduleSlots?: MedicationDayDetailPautaSlot[];
}

@Component({
  selector: 'app-nurse-medication-day-detail-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective],
  templateUrl: './nurse-medication-day-detail-modal.component.html',
  styleUrls: [
    '../nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component.css',
    './nurse-medication-day-detail-modal.component.css',
  ],
})
export class NurseMedicationDayDetailModalComponent {
  @Input({ required: true }) slot!: MedicationDayDetailSlot;
  @Input() patientName: string | null = null;
  @Input() pauta: MedicationDayDetailPauta | null = null;

  @Output() readonly dismissed = new EventEmitter<void>();

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onClose(): void {
    this.dismissed.emit();
  }

  scheduledLabel(s: MedicationDayDetailSlot): string {
    try {
      return new Date(s.scheduledTime).toLocaleString('es-ES', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
    } catch {
      return s.scheduledTime || nurseUiEmDash();
    }
  }

  statusLabel(slot: MedicationDayDetailSlot): string {
    return medicationSlotStatusLabel(slot as MedicationTodaySlot);
  }

  private localYmd(input: string | Date): string {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) {
      return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  selectedDayLabel(slot: MedicationDayDetailSlot): string {
    const d = new Date(slot.scheduledTime);
    if (isNaN(d.getTime())) {
      return nurseUiEmDash();
    }
    return d.toLocaleDateString('es-ES', { dateStyle: 'full' });
  }

  selectedDayTimes(
    med: MedicationDayDetailPauta | null | undefined,
    slot: MedicationDayDetailSlot
  ): string[] {
    const targetYmd = this.localYmd(slot.scheduledTime);
    if (!targetYmd) {
      return slot.time ? [slot.time] : [];
    }

    const times = (med?.scheduleSlots || [])
      .filter((s) => this.localYmd(s.scheduledTime || '') === targetYmd)
      .map((s) => (s.timeLabel || '').trim())
      .filter((t) => !!t);

    const unique = Array.from(new Set(times)).sort();
    if (unique.length > 0) {
      return unique;
    }
    return slot.time ? [slot.time] : [];
  }
}
