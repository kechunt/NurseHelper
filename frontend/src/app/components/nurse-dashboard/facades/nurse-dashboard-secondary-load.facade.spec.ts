import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';
import { NurseDashboardSecondaryLoadFacade } from './nurse-dashboard-secondary-load.facade';

describe('NurseDashboardSecondaryLoadFacade', () => {
  let getTodayTasks: jasmine.Spy;
  let getMedicationsForPharmacy: jasmine.Spy;
  let getShiftContext: jasmine.Spy;

  beforeEach(() => {
    getTodayTasks = jasmine.createSpy('getTodayTasks').and.returnValue(of([]));
    getMedicationsForPharmacy = jasmine
      .createSpy('getMedicationsForPharmacy')
      .and.returnValue(of({ medications: [], pharmacyContactsByShift: [] }));
    getShiftContext = jasmine.createSpy('getShiftContext').and.returnValue(of(null));

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardSecondaryLoadFacade,
        {
          provide: NurseService,
          useValue: {
            getTodayTasks,
            getMedicationsForPharmacy,
            getShiftContext,
          },
        },
      ],
    });
  });

  it('loadBundle llama a los tres endpoints del nurse', (done) => {
    const facade = TestBed.inject(NurseDashboardSecondaryLoadFacade);
    facade.loadBundle().subscribe((res) => {
      expect(res.tasks).toEqual([]);
      expect(res.medications).toEqual(jasmine.objectContaining({ medications: [] }));
      expect(getTodayTasks).toHaveBeenCalledWith(false);
      expect(getMedicationsForPharmacy).toHaveBeenCalledWith(false);
      expect(getShiftContext).toHaveBeenCalledWith(false);
      done();
    });
  });

  it('loadBundle(true) propaga refresh a NurseService', (done) => {
    const facade = TestBed.inject(NurseDashboardSecondaryLoadFacade);
    facade.loadBundle(true).subscribe(() => {
      expect(getTodayTasks).toHaveBeenCalledWith(true);
      expect(getMedicationsForPharmacy).toHaveBeenCalledWith(true);
      expect(getShiftContext).toHaveBeenCalledWith(true);
      done();
    });
  });
});
