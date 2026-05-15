import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardAdministrationHistoryWriteFacade } from './nurse-dashboard-administration-history-write.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardAdministrationHistoryWriteFacade', () => {
  it('delegates deleteAdministrationHistory', () => {
    const nurseServiceMock = {
      deleteAdministrationHistory: jasmine
        .createSpy('deleteAdministrationHistory')
        .and.returnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardAdministrationHistoryWriteFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardAdministrationHistoryWriteFacade);
    facade.deleteHistory(9, 44).subscribe();
    expect(nurseServiceMock.deleteAdministrationHistory).toHaveBeenCalledWith(9, 44);
  });
});
