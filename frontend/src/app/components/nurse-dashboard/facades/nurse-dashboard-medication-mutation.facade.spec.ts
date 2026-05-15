import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardMedicationMutationFacade } from './nurse-dashboard-medication-mutation.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardMedicationMutationFacade', () => {
  const nurseServiceMock = {
    suspendMedication: jasmine.createSpy('suspendMedication').and.returnValue(of({ dosesAffected: 1 })),
    deleteMedication: jasmine.createSpy('deleteMedication').and.returnValue(of({ dosesDeleted: 2 })),
    reactivateMedication: jasmine.createSpy('reactivateMedication').and.returnValue(of({ dosesReactivated: 3 })),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NurseDashboardMedicationMutationFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });
  });

  it('delegates suspendMedication', () => {
    const facade = TestBed.inject(NurseDashboardMedicationMutationFacade);
    const until = new Date('2026-06-01');
    facade.suspend(1, 'MedA', 'razón', until).subscribe();
    expect(nurseServiceMock.suspendMedication).toHaveBeenCalledWith(1, 'MedA', 'razón', until);
  });

  it('delegates deleteMedication', () => {
    const facade = TestBed.inject(NurseDashboardMedicationMutationFacade);
    facade.deleteMedication(2, 'MedB', 'motivo').subscribe();
    expect(nurseServiceMock.deleteMedication).toHaveBeenCalledWith(2, 'MedB', 'motivo');
  });

  it('delegates reactivateMedication', () => {
    const facade = TestBed.inject(NurseDashboardMedicationMutationFacade);
    facade.reactivateMedication(3, 'MedC').subscribe();
    expect(nurseServiceMock.reactivateMedication).toHaveBeenCalledWith(3, 'MedC');
  });
});
