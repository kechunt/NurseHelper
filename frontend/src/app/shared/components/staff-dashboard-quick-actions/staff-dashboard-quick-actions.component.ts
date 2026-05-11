import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaffQuickActionsService } from './staff-quick-actions.service';
import { StaffDashboardQuickActionsToolbarComponent } from './staff-dashboard-quick-actions-toolbar.component';
import { StaffDashboardQuickActionsModalsComponent } from './staff-dashboard-quick-actions-modals.component';

/**
 * Agrupa barra + modales con un único `StaffQuickActionsService` (supervisor:
 * bloque entre cabecera y cuerpo). En admin se usan toolbar y modales por separado.
 */
@Component({
  selector: 'app-staff-dashboard-quick-actions',
  standalone: true,
  imports: [CommonModule, StaffDashboardQuickActionsToolbarComponent, StaffDashboardQuickActionsModalsComponent],
  templateUrl: './staff-dashboard-quick-actions.component.html',
  styleUrl: './staff-dashboard-quick-actions.component.css',
  providers: [StaffQuickActionsService],
})
export class StaffDashboardQuickActionsComponent {}
