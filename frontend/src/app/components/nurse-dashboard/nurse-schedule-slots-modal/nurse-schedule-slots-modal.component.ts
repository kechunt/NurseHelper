import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { treatmentTypeLabel as treatmentTypeLabelFromHelper } from '../nurse-treatments-today.helpers';
import { scheduleModalSlotStatusLabel } from '../nurse-schedule-modal-slot-status.helpers';
import { nurseWeekdayShortLabelsMondayFirst } from '../nurse-dashboard-ui-i18n.helpers';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

export interface ScheduleSlotsModalRow {
  scheduledTime: string;
  timeLabel: string;
  dateLabel: string;
  status: string;
  scheduleType?: string;
  notes?: string | null;
}

@Component({
  selector: 'app-nurse-schedule-slots-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective, BootstrapIconComponent],
  templateUrl: './nurse-schedule-slots-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    '../../../shared/styles/admin-table-unified.css',
    '../../../shared/styles/admin-panel-responsive.css',
    './nurse-schedule-slots-modal.component.css',
  ],
})
export class NurseScheduleSlotsModalComponent {
  @Input({ required: true }) kind!: 'medication' | 'treatment';
  @Input({ required: true }) title!: string;
  /** Notas/observaciones generales de la pauta (si existen). */
  @Input() notes: string | null = null;
  @Input({ required: true }) todaySlots!: ScheduleSlotsModalRow[];
  @Input({ required: true }) otherSlots!: ScheduleSlotsModalRow[];
  @Input({ required: true }) allSlots!: ScheduleSlotsModalRow[];

  @Output() readonly dismissed = new EventEmitter<void>();

  showAllOtherSlots = false;

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onClose(): void {
    this.dismissed.emit();
  }

  slotStatusLabel(status: string): string {
    return scheduleModalSlotStatusLabel(status);
  }

  treatmentTypeLabel(st: string): string {
    return treatmentTypeLabelFromHelper(st);
  }

  private weekdayMonFirst(d: Date): number {
    return (d.getDay() + 6) % 7;
  }

  weeklyGridFromSlots(
    slots: Array<{ scheduledTime?: string; timeLabel?: string }> | null | undefined
  ): { label: string; times: string[]; hasData: boolean }[] {
    const labels = nurseWeekdayShortLabelsMondayFirst();
    const byDay: string[][] = Array.from({ length: 7 }, () => []);
    for (const s of slots || []) {
      if (!s?.scheduledTime) {
        continue;
      }
      const d = new Date(s.scheduledTime);
      if (isNaN(d.getTime())) {
        continue;
      }
      const idx = this.weekdayMonFirst(d);
      const tl = (s.timeLabel || '').trim();
      if (tl && !byDay[idx].includes(tl)) {
        byDay[idx].push(tl);
      }
    }
    byDay.forEach((arr) => arr.sort());
    return labels.map((label, i) => ({
      label,
      times: byDay[i],
      hasData: byDay[i].length > 0,
    }));
  }

  weeklyColumns(): { label: string; times: string[]; hasData: boolean }[] {
    return this.weeklyGridFromSlots(this.allSlots);
  }

  weeklyHasAny(): boolean {
    return this.weeklyColumns().some((c) => c.hasData);
  }

  hasNotes(s: ScheduleSlotsModalRow): boolean {
    return Boolean(s?.notes && String(s.notes).trim());
  }

  otherSlotsVisible(): ScheduleSlotsModalRow[] {
    return this.showAllOtherSlots ? this.otherSlots : this.otherSlots.slice(0, 5);
  }

  otherSlotsHiddenCount(): number {
    return Math.max(0, this.otherSlots.length - 5);
  }

  toggleShowAllOtherSlots(): void {
    this.showAllOtherSlots = !this.showAllOtherSlots;
  }

  hasAnyNotes(): boolean {
    const base = (this.notes || '').trim();
    if (base) {
      return true;
    }
    return (this.allSlots || []).some((s) => this.hasNotes(s));
  }

  slotNotesList(limit = 8): Array<{ when: string; body: string }> {
    const out: Array<{ when: string; body: string }> = [];
    const seen = new Set<string>();
    for (const s of this.allSlots || []) {
      const body = String((s as any)?.notes || '').trim();
      if (!body) {
        continue;
      }
      const when = `${(s as any)?.dateLabel || ''} ${String((s as any)?.timeLabel || '').trim()}`.trim();
      const key = `${when}::${body}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({ when: when || $localize`:@@nurseScheduleSlotsModal.slotNoteWhenFallback:Horario`, body });
      if (out.length >= limit) {
        break;
      }
    }
    return out;
  }
}
