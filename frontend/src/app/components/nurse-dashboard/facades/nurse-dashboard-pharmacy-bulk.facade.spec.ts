import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PharmacyService } from '../../../services/pharmacy.service';
import { NurseDashboardPharmacyBulkFacade } from './nurse-dashboard-pharmacy-bulk.facade';
import type { PharmacyMedicationRequestPayload } from '../nurse-dashboard-pharmacy-requests.helpers';

describe('NurseDashboardPharmacyBulkFacade', () => {
  let createMedicationRequest: jasmine.Spy;

  beforeEach(() => {
    createMedicationRequest = jasmine.createSpy('createMedicationRequest').and.returnValue(of({ ok: true }));

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardPharmacyBulkFacade,
        {
          provide: PharmacyService,
          useValue: { createMedicationRequest },
        },
      ],
    });
  });

  it('sendMedicationRequests vacío devuelve observable vacío sin llamar al servicio', (done) => {
    const facade = TestBed.inject(NurseDashboardPharmacyBulkFacade);
    facade.sendMedicationRequests([]).subscribe((res) => {
      expect(res).toEqual([]);
      expect(createMedicationRequest).not.toHaveBeenCalled();
      done();
    });
  });

  it('sendMedicationRequests dispara createMedicationRequest por cada payload', (done) => {
    const payloads: PharmacyMedicationRequestPayload[] = [
      {
        medicationName: 'A',
        dosage: '10mg',
        quantity: 1,
        patientsInfo: [],
        priority: 'normal',
        notes: '',
      },
      {
        medicationName: 'B',
        dosage: '5mg',
        quantity: 2,
        patientsInfo: [
          { patientName: 'P', bedNumber: '1', areaName: 'X', doses: [] },
        ],
        priority: 'normal',
        notes: 'n',
      },
    ];
    const facade = TestBed.inject(NurseDashboardPharmacyBulkFacade);
    facade.sendMedicationRequests(payloads).subscribe((res) => {
      expect(res.length).toBe(2);
      expect(createMedicationRequest).toHaveBeenCalledTimes(2);
      expect(createMedicationRequest).toHaveBeenCalledWith(payloads[0]);
      expect(createMedicationRequest).toHaveBeenCalledWith(payloads[1]);
      done();
    });
  });
});
