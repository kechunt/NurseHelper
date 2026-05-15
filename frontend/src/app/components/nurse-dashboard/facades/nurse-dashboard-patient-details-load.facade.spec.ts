import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardPatientDetailsLoadFacade } from './nurse-dashboard-patient-details-load.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardPatientDetailsLoadFacade', () => {
  it('delegates getPatientDetails', () => {
    const mockDetail = { id: 42 } as import('../../../services/nurse.service').PatientDetail;
    const nurseServiceMock = {
      getPatientDetails: jasmine.createSpy('getPatientDetails').and.returnValue(of(mockDetail)),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardPatientDetailsLoadFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardPatientDetailsLoadFacade);
    facade.loadDetails(42).subscribe((res) => {
      expect(res).toBe(mockDetail);
    });

    expect(nurseServiceMock.getPatientDetails).toHaveBeenCalledWith(42);
  });
});
