import { Injectable, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { PharmacyService } from '../../../services/pharmacy.service';
import type { PharmacyMedicationRequestPayload } from '../nurse-dashboard-pharmacy-requests.helpers';

/**
 * Envío en paralelo de varias solicitudes de medicación a farmacia.
 */
@Injectable()
export class NurseDashboardPharmacyBulkFacade {
  private readonly pharmacyService = inject(PharmacyService);

  sendMedicationRequests(requests: PharmacyMedicationRequestPayload[]) {
    if (requests.length === 0) {
      return of([] as unknown[]);
    }
    return forkJoin(requests.map((req) => this.pharmacyService.createMedicationRequest(req)));
  }
}
