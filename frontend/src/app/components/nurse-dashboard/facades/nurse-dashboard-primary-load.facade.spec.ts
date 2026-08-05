import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';
import { NurseDashboardPrimaryLoadFacade } from './nurse-dashboard-primary-load.facade';

describe('NurseDashboardPrimaryLoadFacade', () => {
  let getNurseStats: jasmine.Spy;
  let getMyBeds: jasmine.Spy;
  let getMyPatients: jasmine.Spy;

  beforeEach(() => {
    getNurseStats = jasmine.createSpy('getNurseStats').and.returnValue(of({ assignedArea: 'A', maxPatients: 10 }));
    getMyBeds = jasmine.createSpy('getMyBeds').and.returnValue(of([]));
    getMyPatients = jasmine.createSpy('getMyPatients').and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardPrimaryLoadFacade,
        {
          provide: NurseService,
          useValue: {
            getNurseStats,
            getMyBeds,
            getMyPatients,
          },
        },
      ],
    });
  });

  it('loadPrimaryBundle llama a stats, beds y patients', (done) => {
    const facade = TestBed.inject(NurseDashboardPrimaryLoadFacade);
    facade.loadPrimaryBundle().subscribe((res) => {
      expect(res.stats).toEqual(jasmine.objectContaining({ assignedArea: 'A' }));
      expect(res.beds).toEqual([]);
      expect(res.patients).toEqual([]);
      expect(getNurseStats).toHaveBeenCalledWith(false);
      expect(getMyBeds).toHaveBeenCalledWith(false);
      expect(getMyPatients).toHaveBeenCalledWith(undefined, false);
      done();
    });
  });

  it('loadPrimaryBundle(true) propaga refresh a NurseService', (done) => {
    const facade = TestBed.inject(NurseDashboardPrimaryLoadFacade);
    facade.loadPrimaryBundle(true).subscribe(() => {
      expect(getNurseStats).toHaveBeenCalledWith(true);
      expect(getMyBeds).toHaveBeenCalledWith(true);
      expect(getMyPatients).toHaveBeenCalledWith(undefined, true);
      done();
    });
  });
});
