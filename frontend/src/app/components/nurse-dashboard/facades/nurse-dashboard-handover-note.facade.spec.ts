import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardHandoverNoteFacade } from './nurse-dashboard-handover-note.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardHandoverNoteFacade', () => {
  it('delegates getHandoverNote in NurseService', () => {
    const nurseServiceMock = {
      getHandoverNote: jasmine.createSpy('getHandoverNote').and.returnValue(of({ note: null })),
      putHandoverNote: jasmine.createSpy('putHandoverNote').and.returnValue(of({ note: {} as any })),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardHandoverNoteFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardHandoverNoteFacade);
    facade.fetchNote('2026-05-13', 'morning').subscribe();

    expect(nurseServiceMock.getHandoverNote).toHaveBeenCalledWith('2026-05-13', 'morning');
  });

  it('delegates putHandoverNote in NurseService', () => {
    const nurseServiceMock = {
      getHandoverNote: jasmine.createSpy('getHandoverNote').and.returnValue(of({ note: null })),
      putHandoverNote: jasmine.createSpy('putHandoverNote').and.returnValue(of({ note: {} as any })),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardHandoverNoteFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardHandoverNoteFacade);
    facade.saveNote('2026-05-13', 'Hola', 'night').subscribe();

    expect(nurseServiceMock.putHandoverNote).toHaveBeenCalledWith('2026-05-13', 'Hola', 'night');
  });
});
