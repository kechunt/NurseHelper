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
import {
  NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_MESSAGE,
  NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_OK,
  NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_TITLE,
  NURSE_MODAL_EDIT_BED_ERR_INVALID_BED,
  NURSE_MODAL_EDIT_BED_ERR_UPDATE_FALLBACK,
  NURSE_MODAL_EDIT_BED_SUCCESS_UPDATED,
  NURSE_MODAL_EDIT_BED_WARN_LOAD_PATIENTS,
  NURSE_MODAL_EDIT_BED_WARN_NUMBER_REQUIRED,
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

@Component({
  selector: 'app-nurse-edit-bed-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective],
  templateUrl: './nurse-edit-bed-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './nurse-edit-bed-modal.component.css',
  ],
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
  filteredPatientsForBed: AdminPatient[] = [];
  allPatientsForBed: AdminPatient[] = [];

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
      this.filteredPatientsForBed = [];
      this.allPatientsForBed = [];
      this.loadPatientsForBedArea(this.bed.areaId);
    }
  }

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  loadPatientsForBedArea(areaId: number | null | undefined): void {
    if (!areaId) {
      this.filteredPatientsForBed = [];
      return;
    }
    this.adminService.getPatients().subscribe({
      next: (patients) => {
        this.allPatientsForBed = patients.filter((p: AdminPatient) => {
          if (p.isActive === false) {
            return false;
          }
          return p.areaId === areaId || !p.bedId;
        });
        this.filteredPatientsForBed = [...this.allPatientsForBed];
      },
      error: () => {
        this.filteredPatientsForBed = [];
        this.toast.warning(NURSE_MODAL_EDIT_BED_WARN_LOAD_PATIENTS);
      },
    });
  }

  filterPatientsForBed(): void {
    if (this.patientSearchTerm.trim()) {
      const searchLower = this.patientSearchTerm.toLowerCase();
      this.filteredPatientsForBed = this.allPatientsForBed.filter((patient: AdminPatient) => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const identification = (patient.identificationNumber || '').toLowerCase();
        return fullName.includes(searchLower) || identification.includes(searchLower);
      });
    } else {
      this.filteredPatientsForBed = [...this.allPatientsForBed];
    }
  }

  selectPatientForBed(patient: AdminPatient): void {
    this.editBedForm.patientId = patient.id ? Number(patient.id) : null;
    this.patientSearchTerm = '';
    this.filteredPatientsForBed = [];
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
        }
      });
  }

  getCurrentPatientName(): string {
    if (!this.editBedForm.patientId) {
      return '';
    }
    const patient = this.allPatientsForBed.find((p: AdminPatient) => {
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

    const updateData: { bedNumber: string; isActive: boolean; patientId?: number | null } = {
      bedNumber: this.editBedForm.bedNumber.trim(),
      isActive: this.editBedForm.isActive,
    };
    if (this.editBedForm.patientId) {
      updateData.patientId = this.editBedForm.patientId;
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
