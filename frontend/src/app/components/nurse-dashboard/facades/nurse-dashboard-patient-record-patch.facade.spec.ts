import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardPatientRecordPatchFacade } from './nurse-dashboard-patient-record-patch.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardPatientRecordPatchFacade', () => {
  const nurseServiceMock = {
    patchAdministrationHistory: jasmine.createSpy('patchAdministrationHistory').and.returnValue(of({})),
    patchPatientSchedule: jasmine.createSpy('patchPatientSchedule').and.returnValue(of({})),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NurseDashboardPatientRecordPatchFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });
  });

  it('delegates patchAdministrationHistory', () => {
    const facade = TestBed.inject(NurseDashboardPatientRecordPatchFacade);
    const body = { description: 'x' };
    facade.patchAdministrationHistory(1, 99, body).subscribe();
    expect(nurseServiceMock.patchAdministrationHistory).toHaveBeenCalledWith(1, 99, body);
  });

  it('delegates patchPatientSchedule', () => {
    const facade = TestBed.inject(NurseDashboardPatientRecordPatchFacade);
    const body = { description: 'd', notes: 'n' };
    facade.patchPatientSchedule(2, 88, body).subscribe();
    expect(nurseServiceMock.patchPatientSchedule).toHaveBeenCalledWith(2, 88, body);
  });
});
