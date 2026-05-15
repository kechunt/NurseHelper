import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardCompleteTaskFacade } from './nurse-dashboard-complete-task.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardCompleteTaskFacade', () => {
  it('delegates completeTask', () => {
    const nurseServiceMock = {
      completeTask: jasmine.createSpy('completeTask').and.returnValue(of({ ok: true })),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardCompleteTaskFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardCompleteTaskFacade);
    facade.completeByScheduleId(555).subscribe((res) => {
      expect(res).toEqual({ ok: true });
    });

    expect(nurseServiceMock.completeTask).toHaveBeenCalledWith(555);
  });
});
