import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { NURSE_DASHBOARD_MAIN_VIEWS, type NurseDashboardMainView } from '../nurse-dashboard.types';

@Component({
  selector: 'app-nurse-dashboard-main-nav',
  standalone: true,
  imports: [CommonModule, BootstrapIconComponent],
  templateUrl: './nurse-dashboard-main-nav.component.html',
  styleUrl: './nurse-dashboard-main-nav.component.css',
})
export class NurseDashboardMainNavComponent {
  @Input({ required: true }) nurseMainView!: NurseDashboardMainView;
  @Input() handoverPendingNotice = false;

  @Output() readonly viewSelect = new EventEmitter<NurseDashboardMainView>();
  @Output() readonly entregaClick = new EventEmitter<void>();
  @Output() readonly reportesClick = new EventEmitter<void>();

  readonly mainViewTabOrder = NURSE_DASHBOARD_MAIN_VIEWS;

  select(view: NurseDashboardMainView): void {
    this.viewSelect.emit(view);
  }

  onMainViewTabKeydown(event: KeyboardEvent, currentView: NurseDashboardMainView): void {
    const key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return;
    }
    event.preventDefault();

    let idx = this.mainViewTabOrder.indexOf(currentView);
    if (idx < 0) {
      return;
    }

    if (key === 'Home') {
      idx = 0;
    } else if (key === 'End') {
      idx = this.mainViewTabOrder.length - 1;
    } else if (key === 'ArrowRight') {
      idx = Math.min(this.mainViewTabOrder.length - 1, idx + 1);
    } else {
      idx = Math.max(0, idx - 1);
    }

    const next = this.mainViewTabOrder[idx];
    this.select(next);
    queueMicrotask(() => {
      document.getElementById(`nurse-tab-${next}`)?.focus();
    });
  }
}
