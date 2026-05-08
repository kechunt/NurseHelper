import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Desde avisos de cobertura de turno (camas/áreas): abre el flujo correcto en el panel admin.
 * — Sin presentes en todo el turno → Horarios + filtro de área en toma de lista.
 * — Presentes en otro lado pero no en esta área → Gestión de enfermeras + modal de asignación al área.
 */
@Injectable({ providedIn: 'root' })
export class AdminShiftCoverageAlertNavigationService {
  constructor(private router: Router) {}

  openResolveShiftCoverageForArea(
    areaId: number,
    options: { hasGlobalCoverageMessage: boolean; hasActiveShift: boolean }
  ): void {
    if (!Number.isFinite(areaId)) {
      return;
    }
    if (options.hasGlobalCoverageMessage) {
      this.router.navigate(['/admin'], {
        queryParams: { tab: 'schedules', attendanceAreaId: areaId },
      });
      return;
    }
    if (options.hasActiveShift) {
      this.router.navigate(['/admin'], {
        queryParams: { tab: 'staff', assignAreaId: areaId },
      });
      return;
    }
    this.router.navigate(['/admin'], { queryParams: { tab: 'schedules' } });
  }
}
