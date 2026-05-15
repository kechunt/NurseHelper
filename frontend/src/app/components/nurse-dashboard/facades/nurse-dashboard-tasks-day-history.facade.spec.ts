import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardTasksDayHistoryFacade } from './nurse-dashboard-tasks-day-history.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardTasksDayHistoryFacade', () => {
  it('delegates getTasksDayHistory', () => {
    const mockRes: import('../../../services/nurse.service').NurseDayHistoryResponse = {
      date: '2026-05-14',
      items: [],
    };
    const nurseServiceMock = {
      getTasksDayHistory: jasmine.createSpy('getTasksDayHistory').and.returnValue(of(mockRes)),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardTasksDayHistoryFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardTasksDayHistoryFacade);
    facade.loadHistory('2026-05-14').subscribe((res) => {
      expect(res).toEqual(mockRes);
    });

    expect(nurseServiceMock.getTasksDayHistory).toHaveBeenCalledWith('2026-05-14');
  });
});
