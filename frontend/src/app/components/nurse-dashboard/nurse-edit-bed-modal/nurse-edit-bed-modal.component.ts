import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { AdminService, Patient as AdminPatient } from '../../../services/admin.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ToastService } from '../../../services/toast.service';
import { HeroIconComponent } from '../../../shared/components/hero-icon/hero-icon.component';
import {
  NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_MESSAGE,
  NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_OK,
  NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_TITLE,
  NURSE_MODAL_EDIT_BED_ERR_INVALID_BED,
  NURSE_MODAL_EDIT_BED_ERR_UPDATE_FALLBACK,
  NURSE_MODAL_EDIT_BED_SUCCESS_UPDATED,
  NURSE_MODAL_EDIT_BED_WARN_LOAD_NURSES,
  NURSE_MODAL_EDIT_BED_WARN_LOAD_PATIENTS,
  NURSE_MODAL_EDIT_BED_WARN_NUMBER_REQUIRED,
  NURSE_MODAL_EDIT_BED_WARN_SELECT_NURSE,
} from '../nurse-modal-component-toasts.helpers';

/** Cama que se edita (compatible con `BedDisplay` del dashboard). */
export interface NurseEditBedModalBed {
  id: number;
  bedNumber: string;
  patientId?: number | null;
  isActive?: boolean;
  areaId?: number | null;
}

/** Filas de `myBeds` para resolver en qué cama está un paciente. */
export interface NurseEditBedModalBedRow {
  id?: number;
  bedNumber?: string;
  patientId?: number | null;
}

export type NurseEditBedPatientScope = 'this-area' | 'other-areas' | 'all';

interface AreaNurseRow {
  id: number;
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-nurse-edit-bed-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective, HeroIconComponent],
  templateUrl: './nurse-edit-bed-modal.component.html',
  styleUrls: ['../nurse-neomorphic-modal.shared.css', './nurse-edit-bed-modal.component.css'],
})
export class NurseEditBedModalComponent implements OnChanges {
  @Input({ required: true }) bed!: NurseEditBedModalBed;
  @Input({ required: true }) myBeds!: NurseEditBedModalBedRow[];

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();
  /** Tras error de guardado: el padre puede refrescar listas sin cerrar el modal (mismo criterio que antes). */
  @Output() readonly reloadRequested = new EventEmitter<void>();

  editBedForm: {
    bedNumber: string;
    patientId: number | null;
    isActive: boolean;
    areaId: number | null;
  } = {
    bedNumber: '',
    patientId: null,
    isActive: true,
    areaId: null,
  };

  patientSearchTerm = '';
  patientScope: NurseEditBedPatientScope = 'this-area';

  /** Pacientes activos (lista base); el alcance y la búsqueda filtran en cliente. */
  allPatientsPool: AdminPatient[] = [];
  filteredPatientsForBed: AdminPatient[] = [];

  areaNurses: AreaNurseRow[] = [];
  nursesLoadFailed = false;

  /** Tras elegir enfermera explícita (varias en el área); null = auto-asignación en servidor. */
  pendingAssignedToId: number | null = null;

  nursePickPatient: AdminPatient | null = null;
  selectedNurseIdForPick: number | null = null;

  constructor(
    private readonly adminService: AdminService,
    private readonly confirmationService: ConfirmationService,
    private readonly toast: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bed'] && this.bed?.id) {
      this.editBedForm = {
        bedNumber: this.bed.bedNumber || '',
        patientId: this.bed.patientId ?? null,
        isActive: this.bed.isActive !== undefined ? !!this.bed.isActive : true,
        areaId: this.bed.areaId ?? null,
      };
      this.patientSearchTerm = '';
      this.patientScope = 'this-area';
      this.allPatientsPool = [];
      this.filteredPatientsForBed = [];
      this.pendingAssignedToId = null;
      this.nursePickPatient = null;
      this.selectedNurseIdForPick = null;
      this.nursesLoadFailed = false;
      this.loadPatientsPool();
      this.loadAreaNurses();
    }
  }

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  private bedAreaId(): number | null {
    const a = this.bed?.areaId ?? this.editBedForm.areaId;
    return a != null && !Number.isNaN(Number(a)) ? Number(a) : null;
  }

  /** Área efectiva del paciente (cama ocupa prioridad sobre `patient.areaId`). */
  effectivePatientAreaId(p: AdminPatient): number | null {
    const fromBed = p.bed?.areaId ?? p.bed?.area?.id;
    if (fromBed != null && !Number.isNaN(Number(fromBed))) {
      return Number(fromBed);
    }
    if (p.areaId != null && !Number.isNaN(Number(p.areaId))) {
      return Number(p.areaId);
    }
    return null;
  }

  patientIsOtherArea(p: AdminPatient): boolean {
    const aid = this.bedAreaId();
    if (aid == null) {
      return false;
    }
    const eff = this.effectivePatientAreaId(p);
    return eff != null && eff !== aid;
  }

  loadPatientsPool(): void {
    const areaId = this.bedAreaId();
    if (!areaId) {
      this.allPatientsPool = [];
      this.applyPatientFilters();
      return;
    }
    this.adminService
      .getPatientsPage({ page: 1, limit: 500, isActive: true })
      .subscribe({
        next: (page) => {
          this.allPatientsPool = page.items || [];
          this.applyPatientFilters();
        },
        error: () => {
          this.allPatientsPool = [];
          this.filteredPatientsForBed = [];
          this.toast.warning(NURSE_MODAL_EDIT_BED_WARN_LOAD_PATIENTS);
        },
      });
  }

  loadAreaNurses(): void {
    const areaId = this.bedAreaId();
    if (!areaId) {
      this.areaNurses = [];
      return;
    }
    this.adminService.getNursesByArea(areaId).subscribe({
      next: (nurses) => {
        this.areaNurses = nurses || [];
        this.nursesLoadFailed = false;
      },
      error: () => {
        this.areaNurses = [];
        this.nursesLoadFailed = true;
        this.toast.warning(NURSE_MODAL_EDIT_BED_WARN_LOAD_NURSES);
      },
    });
  }

  onPatientScopeChange(): void {
    this.applyPatientFilters();
  }

  applyPatientFilters(): void {
    const areaId = this.bedAreaId();
    let base = this.allPatientsPool;
    if (areaId != null) {
      if (this.patientScope === 'this-area') {
        base = base.filter((p) => this.effectivePatientAreaId(p) === areaId);
      } else if (this.patientScope === 'other-areas') {
        base = base.filter((p) => {
          const eff = this.effectivePatientAreaId(p);
          return eff != null && eff !== areaId;
        });
      }
    }
    if (this.patientSearchTerm.trim()) {
      const q = this.patientSearchTerm.toLowerCase().trim();
      base = base.filter((patient: AdminPatient) => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const identification = (patient.identificationNumber || '').toLowerCase();
        return fullName.includes(q) || identification.includes(q);
      });
    }
    this.filteredPatientsForBed = base;
  }

  filterPatientsForBed(): void {
    this.applyPatientFilters();
  }

  startPatientAssignment(patient: AdminPatient): void {
    if (this.nursesLoadFailed || !this.areaNurses.length) {
      this.confirmPatientAssignment(patient, null);
      return;
    }
    if (this.areaNurses.length > 1) {
      this.nursePickPatient = patient;
      this.selectedNurseIdForPick = null;
      return;
    }
    this.confirmPatientAssignment(patient, null);
  }

  cancelNursePick(): void {
    this.nursePickPatient = null;
    this.selectedNurseIdForPick = null;
  }

  confirmNursePick(): void {
    if (!this.nursePickPatient) {
      return;
    }
    const nid = this.selectedNurseIdForPick != null ? Number(this.selectedNurseIdForPick) : NaN;
    if (!Number.isFinite(nid)) {
      this.toast.warning(NURSE_MODAL_EDIT_BED_WARN_SELECT_NURSE);
      return;
    }
    this.confirmPatientAssignment(this.nursePickPatient, nid);
  }

  private confirmPatientAssignment(patient: AdminPatient, assignedToId: number | null): void {
    this.editBedForm.patientId = patient.id ? Number(patient.id) : null;
    this.pendingAssignedToId = assignedToId;
    this.nursePickPatient = null;
    this.selectedNurseIdForPick = null;
    this.patientSearchTerm = '';
    this.applyPatientFilters();
  }

  releaseBed(): void {
    this.confirmationService
      .confirm({
        title: NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_TITLE,
        message: NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_MESSAGE,
        confirmText: NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_OK,
        type: 'warning',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.editBedForm.patientId = null;
          this.pendingAssignedToId = null;
        }
      });
  }

  getCurrentPatientName(): string {
    if (!this.editBedForm.patientId) {
      return '';
    }
    const patient = this.allPatientsPool.find((p: AdminPatient) => {
      const pId = p.id ? Number(p.id) : null;
      return pId === this.editBedForm.patientId;
    });
    return patient ? `${patient.firstName} ${patient.lastName}` : '';
  }

  getPatientBed(patientId: number | string | null | undefined): NurseEditBedModalBedRow | null {
    if (patientId === null || patientId === undefined) {
      return null;
    }
    const idNum = typeof patientId === 'string' ? parseInt(patientId, 10) : patientId;
    if (isNaN(idNum)) {
      return null;
    }
    return this.myBeds.find((b) => b.patientId === idNum) || null;
  }

  saveBedChanges(): void {
    if (!this.bed?.id) {
      this.toast.error(NURSE_MODAL_EDIT_BED_ERR_INVALID_BED);
      return;
    }
    if (!this.editBedForm.bedNumber.trim()) {
      this.toast.warning(NURSE_MODAL_EDIT_BED_WARN_NUMBER_REQUIRED);
      return;
    }

    const updateData: {
      bedNumber: string;
      isActive: boolean;
      patientId?: number | null;
      assignedToId?: number | null;
    } = {
      bedNumber: this.editBedForm.bedNumber.trim(),
      isActive: this.editBedForm.isActive,
    };

    if (this.editBedForm.patientId) {
      updateData.patientId = this.editBedForm.patientId;
      if (this.pendingAssignedToId != null) {
        updateData.assignedToId = this.pendingAssignedToId;
      }
    } else {
      updateData.patientId = null;
    }

    this.adminService.updateBed(this.bed.id, updateData).subscribe({
      next: () => {
        this.toast.success(NURSE_MODAL_EDIT_BED_SUCCESS_UPDATED);
        this.saved.emit();
      },
      error: (error) => {
        const errorMsg =
          error?.error?.message || error?.message || NURSE_MODAL_EDIT_BED_ERR_UPDATE_FALLBACK;
        this.toast.error(errorMsg);
        setTimeout(() => this.reloadRequested.emit(), 500);
      },
    });
  }
}
