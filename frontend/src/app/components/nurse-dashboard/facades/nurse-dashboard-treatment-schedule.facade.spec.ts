import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardTreatmentScheduleFacade } from './nurse-dashboard-treatment-schedule.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardTreatmentScheduleFacade', () => {
  it('delegates patchTreatmentScheduleAction', () => {
    const nurseServiceMock = {
      patchTreatmentScheduleAction: jasmine
        .createSpy('patchTreatmentScheduleAction')
        .and.returnValue(of({ ok: true })),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardTreatmentScheduleFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardTreatmentScheduleFacade);
    const body = { action: 'accept' as const };
    facade.patchAction(5, 12, body).subscribe();
    expect(nurseServiceMock.patchTreatmentScheduleAction).toHaveBeenCalledWith(5, 12, body);
  });
});
