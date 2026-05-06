import type { NurseAddTreatmentModalMode } from './nurse-add-treatment-modal/nurse-add-treatment-modal.component';

export type AddTreatmentModalState = {
  addTreatmentModalOpen: boolean;
  addTreatmentMode: NurseAddTreatmentModalMode;
  addTreatmentFromPatientContext: { id: string; name: string; bedNumber: string } | null;
  addTreatmentInitialPatientId: string;
};

export type AddMedicationModalState = {
  addMedicationModalOpen: boolean;
  addMedicationLockPatientSelect: boolean;
  addMedicationInitialPatientId: string;
  selectedPatientId: string | null;
};

export function openAddTreatmentModalFromTasksState(tasksPatientFilter: string): AddTreatmentModalState {
  return {
    addTreatmentModalOpen: true,
    addTreatmentMode: 'global',
    addTreatmentFromPatientContext: null,
    addTreatmentInitialPatientId: tasksPatientFilter ? String(tasksPatientFilter) : '',
  };
}

export function closeAddTreatmentModalState(): AddTreatmentModalState {
  return {
    addTreatmentModalOpen: false,
    addTreatmentMode: 'global',
    addTreatmentFromPatientContext: null,
    addTreatmentInitialPatientId: '',
  };
}

export function openAddMedicationModalFromTasksState(tasksPatientFilter: string): AddMedicationModalState {
  return {
    addMedicationModalOpen: true,
    addMedicationLockPatientSelect: false,
    addMedicationInitialPatientId: tasksPatientFilter ? String(tasksPatientFilter) : '',
    selectedPatientId: null,
  };
}

export function openAddMedicationModalFromPatientState(
  selectedPatientId: string | null | undefined
): AddMedicationModalState {
  return {
    addMedicationModalOpen: true,
    addMedicationLockPatientSelect: !!selectedPatientId,
    addMedicationInitialPatientId: selectedPatientId || '',
    selectedPatientId: selectedPatientId || null,
  };
}

export function closeAddMedicationModalState(): AddMedicationModalState {
  return {
    addMedicationModalOpen: false,
    addMedicationLockPatientSelect: false,
    addMedicationInitialPatientId: '',
    selectedPatientId: null,
  };
}
