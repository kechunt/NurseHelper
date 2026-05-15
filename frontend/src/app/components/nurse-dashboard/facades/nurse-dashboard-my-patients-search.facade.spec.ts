import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardMyPatientsSearchFacade } from './nurse-dashboard-my-patients-search.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardMyPatientsSearchFacade', () => {
  it('delegates getMyPatients with query', () => {
    const mockList: import('../../../services/nurse.service').PatientDetail[] = [];
    const nurseServiceMock = {
      getMyPatients: jasmine.createSpy('getMyPatients').and.returnValue(of(mockList)),
    };

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardMyPatientsSearchFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });

    const facade = TestBed.inject(NurseDashboardMyPatientsSearchFacade);
    facade.searchByQuery('Ana').subscribe((res) => {
      expect(res).toBe(mockList);
    });

    expect(nurseServiceMock.getMyPatients).toHaveBeenCalledWith('Ana');
  });
});
