import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardPatientScheduleWriteFacade } from './nurse-dashboard-patient-schedule-write.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardPatientScheduleWriteFacade', () => {
  it('delegates deletePatientSchedule', () => {
    const nurseServiceMock = {
      deletePatientSchedule: jasmine.createSpy('deletePatientSchedule').and.returnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardPatientScheduleWriteFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardPatientScheduleWriteFacade);
    facade.deleteSchedule(3, 99).subscribe();
    expect(nurseServiceMock.deletePatientSchedule).toHaveBeenCalledWith(3, 99);
  });
});
