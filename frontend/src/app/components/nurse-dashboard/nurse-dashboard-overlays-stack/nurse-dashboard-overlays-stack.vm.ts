import type {
  HandoverShiftSlot,
  MedicationForPharmacy,
  TaskItem,
} from '../../../services/nurse.service';
import type { MedicationReport, ComplianceStats } from '../../../services/report.service';
import type { TreatmentRecord } from '../nurse-treatment-record.model';
import type { MedicationTodaySlot } from '../medication-today-slot.model';
import type { TreatmentTodayItem } from '../treatment-today-item.model';
import type { HistoryOutcomeFilter, HistoryPeriodFilter } from '../nurse-patient-history.helpers';
import type { NurseScheduleEditContext } from '../nurse-schedule-edit-modal/nurse-schedule-edit-modal.component';
import type { BedDisplay, Medication, Patient } from '../nurse-dashboard.types';
import type { ScheduleSlotsModalViewPayload } from '../nurse-dashboard-schedule-slots.helpers';
import type { NurseAddTreatmentModalMode } from '../nurse-add-treatment-modal/nurse-add-treatment-modal.component';
import type { NurseTasksQuickHourGroup } from '../nurse-tasks-quick-modal/nurse-tasks-quick-modal.component';

/** Estado de modales y vistas del stack de overlays del dashboard enfermería (una sola referencia estable en el padre). */
export interface NurseDashboardOverlaysStackVm {
  pharmacyPatientsModalMed: MedicationForPharmacy | null;
  selectedTaskForNotCompleted: any;
  selectedPatientNameFallback: string | null;
  showPatientModal: boolean;
  selectedPatient: Patient | null;
  activeTab: string;
  clinicalNotesListScopeToOpen: import('../nurse-clinical-notes-pin.helpers').ClinicalNotesPinScope | null;
  newDiagnosisNote: string;
  newMedicalObservationNote: string;
  newAllergiesNote: string;
  newSpecialNeedsNote: string;
  newGeneralObservationNote: string;
  isSavingObservation: boolean;
  historyFilter: HistoryPeriodFilter;
  historyOutcomeFilter: HistoryOutcomeFilter;
  historyEditRecord: TreatmentRecord | null;
  scheduleEditContext: NurseScheduleEditContext | null;
  medicationsSlots: MedicationTodaySlot[];
  treatmentsSlots: TreatmentTodayItem[];
  historyRecords: TreatmentRecord[];
  historyDetailRecord: TreatmentRecord | null;
  medicationDayDetailView: {
    slot: MedicationTodaySlot;
    patientName: string | null;
    pauta: Medication | null;
  } | null;
  pendingTaskDetailModalOpen: boolean;
  pendingTaskDetail: TaskItem | null;
  showHandoverModal: boolean;
  handoverDate: string;
  handoverShift: HandoverShiftSlot;
  handoverBody: string;
  handoverSaving: boolean;
  handoverCanAcknowledge: boolean;
  showNurseReportsModal: boolean;
  nurseReportsPeriodLabel: string;
  nurseReportsStartDate: string;
  nurseReportsEndDate: string;
  nurseReportsLoading: boolean;
  nurseReportsExporting: boolean;
  nurseReportsMedication: MedicationReport[] | null;
  nurseReportsCompliance: ComplianceStats | null;
  nurseReportsError: string | null;
  tasksQuickModalOpen: boolean;
  patients: Patient[];
  tasksPatientFilter: string;
  tasksHourFilter: string;
  tasksGroupedByHour: NurseTasksQuickHourGroup[];
  medicationsForPharmacy: MedicationForPharmacy[];
  uniqueMedicationsCount: number;
  totalDosesToday: number;
  scheduleSlotsView: ScheduleSlotsModalViewPayload | null;
  addMedicationModalOpen: boolean;
  addMedicationLockPatientSelect: boolean;
  addMedicationInitialPatientId: string;
  medicationToSuspend: any;
  medicationToDelete: any;
  medicationToReactivate: any;
  selectedPatientNameForMedicationModals: string | null;
  addTreatmentModalOpen: boolean;
  addTreatmentMode: NurseAddTreatmentModalMode;
  addTreatmentFromPatientContext: { id: string; name: string; bedNumber: string } | null;
  addTreatmentInitialPatientId: string;
  treatmentPostponeItem: TreatmentTodayItem | null;
  taskToPostpone: any;
  editBedModalBed: (BedDisplay & { id: number }) | null;
  myBeds: BedDisplay[];
}

export function createEmptyNurseDashboardOverlaysStackVm(): NurseDashboardOverlaysStackVm {
  return {
    pharmacyPatientsModalMed: null,
    selectedTaskForNotCompleted: null,
    selectedPatientNameFallback: null,
    showPatientModal: false,
    selectedPatient: null,
    activeTab: 'medications',
    clinicalNotesListScopeToOpen: null,
    newDiagnosisNote: '',
    newMedicalObservationNote: '',
    newAllergiesNote: '',
    newSpecialNeedsNote: '',
    newGeneralObservationNote: '',
    isSavingObservation: false,
    historyFilter: 'all',
    historyOutcomeFilter: 'all',
    historyEditRecord: null,
    scheduleEditContext: null,
    medicationsSlots: [],
    treatmentsSlots: [],
    historyRecords: [],
    historyDetailRecord: null,
    medicationDayDetailView: null,
    pendingTaskDetailModalOpen: false,
    pendingTaskDetail: null,
    showHandoverModal: false,
    handoverDate: '',
    handoverShift: 'morning',
    handoverBody: '',
    handoverSaving: false,
    handoverCanAcknowledge: false,
    showNurseReportsModal: false,
    nurseReportsPeriodLabel: '',
    nurseReportsStartDate: '',
    nurseReportsEndDate: '',
    nurseReportsLoading: false,
    nurseReportsExporting: false,
    nurseReportsMedication: null,
    nurseReportsCompliance: null,
    nurseReportsError: null,
    tasksQuickModalOpen: false,
    patients: [],
    tasksPatientFilter: '',
    tasksHourFilter: '',
    tasksGroupedByHour: [],
    medicationsForPharmacy: [],
    uniqueMedicationsCount: 0,
    totalDosesToday: 0,
    scheduleSlotsView: null,
    addMedicationModalOpen: false,
    addMedicationLockPatientSelect: false,
    addMedicationInitialPatientId: '',
    medicationToSuspend: null,
    medicationToDelete: null,
    medicationToReactivate: null,
    selectedPatientNameForMedicationModals: null,
    addTreatmentModalOpen: false,
    addTreatmentMode: 'global',
    addTreatmentFromPatientContext: null,
    addTreatmentInitialPatientId: '',
    treatmentPostponeItem: null,
    taskToPostpone: null,
    editBedModalBed: null,
    myBeds: [],
  };
}

/** Base para tests del stack: merge sobre valores por defecto. */
export function nurseDashboardOverlaysStackVmForTesting(
  overrides: Partial<NurseDashboardOverlaysStackVm> = {}
): NurseDashboardOverlaysStackVm {
  return { ...createEmptyNurseDashboardOverlaysStackVm(), ...overrides };
}
