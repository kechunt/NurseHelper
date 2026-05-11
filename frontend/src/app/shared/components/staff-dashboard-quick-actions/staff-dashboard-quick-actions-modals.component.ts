import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminTeamHandoverModalComponent } from '../admin-team-handover-modal/admin-team-handover-modal.component';
import { NurseReportsModalComponent } from '../../../components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component';
import { StaffQuickActionsService } from './staff-quick-actions.service';

/** Modales fuera del nav (evita `position:fixed` dentro de un ancestro con `transform`). */
@Component({
  selector: 'app-staff-dashboard-quick-actions-modals',
  standalone: true,
  imports: [CommonModule, AdminTeamHandoverModalComponent, NurseReportsModalComponent],
  templateUrl: './staff-dashboard-quick-actions-modals.component.html',
  styleUrl: './staff-dashboard-quick-actions-modals.component.css',
  host: { class: 'staff-dashboard-quick-actions-modals-host' },
})
export class StaffDashboardQuickActionsModalsComponent {
  readonly qa = inject(StaffQuickActionsService);
}
