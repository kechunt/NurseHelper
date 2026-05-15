import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardPatientCareCreateFacade } from './nurse-dashboard-patient-care-create.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardPatientCareCreateFacade', () => {
  const nurseServiceMock = {
    addMedication: jasmine.createSpy('addMedication').and.returnValue(of({ schedulesCreated: 1 })),
    addTreatment: jasmine.createSpy('addTreatment').and.returnValue(of({ count: 2 })),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NurseDashboardPatientCareCreateFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });
  });

  it('delegates addMedication', () => {
    const facade = TestBed.inject(NurseDashboardPatientCareCreateFacade);
    const data = {
      patientId: 1,
      medication: 'A',
      dosage: '10mg',
      frequency: 'daily',
      times: ['08:00'],
    };
    facade.addMedication(data).subscribe();
    expect(nurseServiceMock.addMedication).toHaveBeenCalledWith(data);
  });

  it('delegates addTreatment', () => {
    const facade = TestBed.inject(NurseDashboardPatientCareCreateFacade);
    const data = {
      patientId: 2,
      description: 'T',
      scheduleType: 'single' as const,
      date: '2026-05-14',
      time: '09:00',
    };
    facade.addTreatment(data).subscribe();
    expect(nurseServiceMock.addTreatment).toHaveBeenCalledWith(data);
  });
});
