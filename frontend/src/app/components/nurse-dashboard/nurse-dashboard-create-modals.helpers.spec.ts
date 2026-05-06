import {
  closeAddMedicationModalState,
  closeAddTreatmentModalState,
  openAddMedicationModalFromPatientState,
  openAddMedicationModalFromTasksState,
  openAddTreatmentModalFromTasksState,
} from './nurse-dashboard-create-modals.helpers';

describe('nurse-dashboard-create-modals.helpers', () => {
  it('openAddTreatmentModalFromTasksState y closeAddTreatmentModalState', () => {
    const opened = openAddTreatmentModalFromTasksState('12');
    expect(opened.addTreatmentModalOpen).toBeTrue();
    expect(opened.addTreatmentInitialPatientId).toBe('12');
    const closed = closeAddTreatmentModalState();
    expect(closed.addTreatmentModalOpen).toBeFalse();
    expect(closed.addTreatmentInitialPatientId).toBe('');
  });

  it('openAddMedicationModalFromTasksState y openAddMedicationModalFromPatientState', () => {
    const fromTasks = openAddMedicationModalFromTasksState('7');
    expect(fromTasks.addMedicationModalOpen).toBeTrue();
    expect(fromTasks.addMedicationLockPatientSelect).toBeFalse();
    expect(fromTasks.selectedPatientId).toBeNull();

    const fromPatient = openAddMedicationModalFromPatientState('3');
    expect(fromPatient.addMedicationLockPatientSelect).toBeTrue();
    expect(fromPatient.addMedicationInitialPatientId).toBe('3');
  });

  it('closeAddMedicationModalState limpia estado', () => {
    const closed = closeAddMedicationModalState();
    expect(closed.addMedicationModalOpen).toBeFalse();
    expect(closed.addMedicationInitialPatientId).toBe('');
    expect(closed.selectedPatientId).toBeNull();
  });
});
