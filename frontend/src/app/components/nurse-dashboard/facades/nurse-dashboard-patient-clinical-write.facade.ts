import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  NurseService,
  type ClinicalObservationAppendScope,
} from '../../../services/nurse.service';

/**
 * Observaciones y campos clínicos del paciente (append + PATCH parciales).
 */
@Injectable()
export class NurseDashboardPatientClinicalWriteFacade {
  private readonly nurseService = inject(NurseService);

  appendObservation(
    patientId: number,
    observation: string,
    scope: ClinicalObservationAppendScope = 'general'
  ): Observable<unknown> {
    return this.nurseService.saveObservation(patientId, observation, scope);
  }

  updateMedicalObservations(patientId: number, medicalObservations: string): Observable<unknown> {
    return this.nurseService.updateMedicalObservations(patientId, medicalObservations);
  }

  updateAllergies(patientId: number, allergies: string): Observable<unknown> {
    return this.nurseService.updateAllergies(patientId, allergies);
  }

  updateSpecialNeeds(patientId: number, specialNeeds: string): Observable<unknown> {
    return this.nurseService.updateSpecialNeeds(patientId, specialNeeds);
  }

  updateMedicalHistory(patientId: number, medicalHistory: string): Observable<unknown> {
    return this.nurseService.updateMedicalHistory(patientId, medicalHistory);
  }

  replaceGeneralObservations(patientId: number, generalObservations: string): Observable<unknown> {
    return this.nurseService.replaceGeneralObservations(patientId, generalObservations);
  }
}
