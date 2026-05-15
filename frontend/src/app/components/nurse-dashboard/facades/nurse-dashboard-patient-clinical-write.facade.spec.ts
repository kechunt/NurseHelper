import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NurseDashboardPatientClinicalWriteFacade } from './nurse-dashboard-patient-clinical-write.facade';
import { NurseService } from '../../../services/nurse.service';

describe('NurseDashboardPatientClinicalWriteFacade', () => {
  const nurseServiceMock = {
    saveObservation: jasmine.createSpy('saveObservation').and.returnValue(of({})),
    updateMedicalObservations: jasmine.createSpy('updateMedicalObservations').and.returnValue(of({})),
    updateAllergies: jasmine.createSpy('updateAllergies').and.returnValue(of({})),
    updateSpecialNeeds: jasmine.createSpy('updateSpecialNeeds').and.returnValue(of({})),
    updateMedicalHistory: jasmine.createSpy('updateMedicalHistory').and.returnValue(of({})),
    replaceGeneralObservations: jasmine.createSpy('replaceGeneralObservations').and.returnValue(of({})),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NurseDashboardPatientClinicalWriteFacade,
        { provide: NurseService, useValue: nurseServiceMock },
      ],
    });
  });

  it('delegates saveObservation', () => {
    const facade = TestBed.inject(NurseDashboardPatientClinicalWriteFacade);
    facade.appendObservation(1, 'nota', 'medical').subscribe();
    expect(nurseServiceMock.saveObservation).toHaveBeenCalledWith(1, 'nota', 'medical');
  });

  it('delegates updateAllergies', () => {
    const facade = TestBed.inject(NurseDashboardPatientClinicalWriteFacade);
    facade.updateAllergies(2, 'polen').subscribe();
    expect(nurseServiceMock.updateAllergies).toHaveBeenCalledWith(2, 'polen');
  });

  it('delegates replaceGeneralObservations', () => {
    const facade = TestBed.inject(NurseDashboardPatientClinicalWriteFacade);
    facade.replaceGeneralObservations(3, 'gen').subscribe();
    expect(nurseServiceMock.replaceGeneralObservations).toHaveBeenCalledWith(3, 'gen');
  });
});
