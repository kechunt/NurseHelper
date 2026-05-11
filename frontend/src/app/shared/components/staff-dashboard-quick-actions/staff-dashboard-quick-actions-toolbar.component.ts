import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaffQuickActionsService } from './staff-quick-actions.service';

@Component({
  selector: 'app-staff-dashboard-quick-actions-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-dashboard-quick-actions-toolbar.component.html',
  styleUrl: './staff-dashboard-quick-actions-toolbar.component.css',
})
export class StaffDashboardQuickActionsToolbarComponent implements OnInit {
  readonly qa = inject(StaffQuickActionsService);

  ngOnInit(): void {
    this.qa.initPendingNotice();
  }
}
