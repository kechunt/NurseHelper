import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardTaskLifecycleFacade } from './nurse-dashboard-task-lifecycle.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardTaskLifecycleFacade', () => {
  it('delegates markTaskAsNotCompleted', () => {
    const nurseServiceMock = {
      markTaskAsNotCompleted: jasmine.createSpy('markTaskAsNotCompleted').and.returnValue(of({ ok: true })),
      postponeTask: jasmine.createSpy('postponeTask'),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardTaskLifecycleFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardTaskLifecycleFacade);
    facade.markNotCompleted(10, 'motivo').subscribe((res) => {
      expect(res).toEqual({ ok: true });
    });
    expect(nurseServiceMock.markTaskAsNotCompleted).toHaveBeenCalledWith(10, 'motivo');
  });

  it('delegates postponeTask', () => {
    const nurseServiceMock = {
      markTaskAsNotCompleted: jasmine.createSpy('markTaskAsNotCompleted'),
      postponeTask: jasmine.createSpy('postponeTask').and.returnValue(of({ ok: 1 })),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardTaskLifecycleFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardTaskLifecycleFacade);
    facade.postpone(20, '2026-05-14T10:00:00').subscribe();
    expect(nurseServiceMock.postponeTask).toHaveBeenCalledWith(20, '2026-05-14T10:00:00');
  });
});
