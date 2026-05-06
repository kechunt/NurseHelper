import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Area, Bed } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import {
  ADMIN_CONFIRM_RELEASE_BED_MESSAGE,
  ADMIN_CONFIRM_RELEASE_BED_TITLE,
  ADMIN_CONFIRM_RELEASE_BED_YES,
} from '../admin-confirmation-copy.helpers';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';

@Component({
  selector: 'app-beds-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableRowActionsModalComponent],
  templateUrl: './beds-management.component.html',
  styleUrl: './beds-management.component.css',
})
export class BedsManagementComponent implements OnInit {
  showOccupiedPatientModal = false;
  showPatientDetailModal = false;
  selectedBedForPatientInfo: Bed | null = null;
  selectedPatientSummary: any | null = null;
  detailedPatient: any | null = null;
  patientDetailTab: 'personal' | 'medical' | 'medications' | 'history' | 'tasks' = 'personal';
  patientDetailForm: {
    medications: any[];
    treatmentHistory: any[];
    pendingTasks: any[];
  } = {
    medications: [],
    treatmentHistory: [],
    pendingTasks: []
  };

  beds: Bed[] = [];
  areas: Area[] = [];
  patients: any[] = [];
  loading = false;
  filterStatus: 'all' | 'occupied' | 'available' | 'unavailable' = 'all';
  selectedAreaId: number | null = null;
  showEditBedModal = false;
  selectedBed: Bed | null = null;
  /** Tarjeta de cama: acciones en hoja inferior. */
  bedCardActionsTarget: Bed | null = null;
  editBedForm: { bedNumber: string; patientId: number | null; isActive: boolean; areaId: number | null } = { 
    bedNumber: '', 
    patientId: null,
    isActive: true,
    areaId: null
  };
  patientSearchTerm: string = '';
  filteredPatients: any[] = [];
  patientsFromCurrentArea: any[] = [];
  showCreateBedModal = false;
  showAssignPatientModal = false;
  assignPatientSearchTerm: string = '';
  assignablePatients: any[] = [];
  selectedPatientToAssign: number | null = null;
  createBedForm: { bedNumber: string; areaId: number | null; notes: string } = {
    bedNumber: '',
    areaId: null,
    notes: ''
  };

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
    private confirmationService: ConfirmationService
  ) {}

  private toId(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private isBedOccupied(bed: Bed): boolean {
    return this.toId((bed as any).patientId) !== null;
  }

  private syncBedsOccupancyFromPatients(): void {
    const bedById = new Map<number, Bed>();
    this.beds.forEach((bed) => {
      const bedId = this.toId((bed as any).id);
      if (bedId !== null) {
        (bed as any).patientId = this.toId((bed as any).patientId);
        bedById.set(bedId, bed);
      }
    });

    this.patients.forEach((patient: any) => {
      const bedId = this.toId(patient?.bed?.id) ?? this.toId(patient?.bedId);
      if (bedId === null) return;
      const bed = bedById.get(bedId);
      if (!bed) return;
      (bed as any).patientId = this.toId(patient.id);
      (bed as any).patient = {
        id: this.toId(patient.id),
        firstName: patient.firstName,
        lastName: patient.lastName,
        identificationNumber: patient.identificationNumber ?? null,
      };
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    // Cargar camas primero, luego pacientes para poder relacionarlos
    this.adminService.getBeds(false).subscribe({
      next: (beds) => {
        this.beds = beds.map(bed => {
          let isActiveValue: boolean;
          if (bed.isActive === false) {
            isActiveValue = false;
          } else if (bed.isActive === true || bed.isActive === 1 || bed.isActive === 'true') {
            isActiveValue = true;
          } else {
            isActiveValue = true;
          }
          
          return {
            ...bed,
            isActive: isActiveValue,
            patientId: this.toId((bed as any).patientId) ?? this.toId((bed as any).patient?.id),
            patient: (bed as any).patient ?? null
          };
        });
        
        // Después de cargar camas, cargar pacientes para poder relacionarlos
        this.loadPatientsWithBedInfo();
        
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading beds:', error);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });

    this.adminService.getAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
      },
      error: (error) => {
        console.error('Error loading areas:', error);
      },
    });
  }

  /**
   * Carga pacientes y los relaciona con sus camas para obtener el área
   */
  private loadPatientsWithBedInfo(): void {
    this.adminService.getPatients(false).subscribe({
      next: (patients) => {
        // Cargar pacientes activos con información de su cama y área
        this.patients = patients
          .filter((p: any) => p.isActive)
          .map((patient: any) => {
            const patientId = this.toId(patient.id);
            const patientBedId = this.toId(patient?.bed?.id) ?? this.toId(patient?.bedId);
            const patientBed = patientBedId
              ? this.beds.find(bed => this.toId(bed.id) === patientBedId)
              : this.beds.find(bed => this.toId((bed as any).patientId) === patientId);
            return {
              ...patient,
              id: patientId,
              bedId: patientBed?.id || null,
              areaId: patientBed?.areaId || null,
              bedNumber: patientBed?.bedNumber || null
            };
          });

        this.syncBedsOccupancyFromPatients();
        
        // Si hay un modal abierto, recargar los pacientes filtrados
        if (this.showEditBedModal && this.editBedForm.areaId) {
          this.loadPatientsForBedArea(this.editBedForm.areaId);
        }
      },
      error: (error) => {
        console.error('Error loading patients:', error);
      },
    });
  }

  get filteredBeds(): Bed[] {
    let filtered = this.beds;

    // Filtrar por área
    if (this.selectedAreaId) {
      filtered = filtered.filter((bed) => bed.areaId === this.selectedAreaId);
    }

    // Filtrar por estado
    if (this.filterStatus === 'occupied') {
      filtered = filtered.filter((bed) => this.isBedOccupied(bed) && bed.isActive !== false);
    } else if (this.filterStatus === 'available') {
      filtered = filtered.filter((bed) => !this.isBedOccupied(bed) && bed.isActive !== false);
    } else if (this.filterStatus === 'unavailable') {
      filtered = filtered.filter((bed) => bed.isActive === false);
    }

    return filtered.sort((a, b) => {
      // Primero por área, luego por número de cama
      if (a.areaId !== b.areaId) {
        return (a.areaId || 0) - (b.areaId || 0);
      }
      return (a.bedNumber || '').localeCompare(b.bedNumber || '');
    });
  }

  getBedsByArea(areaId: number): Bed[] {
    return this.filteredBeds.filter((bed) => bed.areaId === areaId);
  }

  getAreaName(areaId?: number): string {
    if (!areaId) return 'Sin área';
    const area = this.areas.find((a) => a.id === areaId);
    return area?.name || 'Área desconocida';
  }

  getUniqueAreas(): Area[] {
    const areaIds = new Set(this.filteredBeds.map((bed) => bed.areaId).filter((id): id is number => id !== undefined && id !== null));
    return this.areas.filter((area) => area.id !== undefined && areaIds.has(area.id!));
  }

  openBedCardActionsSheet(bed: Bed): void {
    this.bedCardActionsTarget = bed;
    this.cdr.markForCheck();
  }

  closeBedCardActionsSheet(): void {
    this.bedCardActionsTarget = null;
    this.cdr.markForCheck();
  }

  onBedCardKeydown(bed: Bed, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openBedCardActionsSheet(bed);
    }
  }

  bedCardActionsSummary(b: Bed): string[] {
    return [
      `Cama: ${b.bedNumber || '—'}`,
      this.getAreaName(b.areaId),
      this.getBedStatusLabel(b),
      this.getBedStatusLabel(b) === 'Ocupada' ? `Paciente: ${this.getPatientNameForBed(b)}` : 'Sin paciente asignado',
    ];
  }

  fromBedSheetViewPatient(): void {
    const b = this.bedCardActionsTarget;
    if (!b || this.getBedStatusLabel(b) !== 'Ocupada') {
      return;
    }
    this.closeBedCardActionsSheet();
    this.openOccupiedPatientModal(b);
  }

  fromBedSheetEdit(): void {
    const b = this.bedCardActionsTarget;
    if (!b) {
      return;
    }
    this.closeBedCardActionsSheet();
    this.openEditBedModal(b);
  }

  async fromBedSheetDelete(): Promise<void> {
    const b = this.bedCardActionsTarget;
    if (!b) {
      return;
    }
    this.closeBedCardActionsSheet();
    await this.deleteBed(b);
  }

  openEditBedModal(bed: Bed): void {
    this.selectedBed = { ...bed };
    const isActiveValue = bed.isActive !== undefined && bed.isActive !== null 
      ? Boolean(bed.isActive) 
      : true;
    
    this.editBedForm = {
      bedNumber: bed.bedNumber || '',
      patientId: bed.patientId || null,
      isActive: isActiveValue,
      areaId: bed.areaId || null
    };
    
    // Cargar pacientes del área específica de esta cama
    if (bed.areaId) {
      this.loadPatientsForBedArea(bed.areaId);
    } else {
      this.filteredPatients = [];
    }
    
    this.patientSearchTerm = '';
    this.showEditBedModal = true;
  }

  closeEditBedModal(): void {
    this.showEditBedModal = false;
    this.selectedBed = null;
    this.editBedForm = { bedNumber: '', patientId: null, isActive: true, areaId: null };
    this.patientSearchTerm = '';
    this.filteredPatients = [];
    this.patientsFromCurrentArea = [];
  }

  openCreateBedModal(): void {
    this.createBedForm = {
      bedNumber: '',
      areaId: this.selectedAreaId || null,
      notes: ''
    };
    this.showCreateBedModal = true;
  }

  closeCreateBedModal(): void {
    this.showCreateBedModal = false;
    this.createBedForm = { bedNumber: '', areaId: null, notes: '' };
  }

  createBed(): void {
    if (!this.createBedForm.bedNumber.trim() || !this.createBedForm.areaId) {
      this.toastService.warning('El número de cama y el área son requeridos');
      return;
    }

    const newBed: Partial<Bed> = {
      bedNumber: this.createBedForm.bedNumber.trim(),
      areaId: this.createBedForm.areaId,
      notes: this.createBedForm.notes || '',
      isActive: true
    };

    this.adminService.createBed(newBed as Bed).subscribe({
      next: () => {
        this.closeCreateBedModal();
        this.loadData();
        setTimeout(() => {
          this.cdr.detectChanges();
          this.toastService.success(`Cama ${newBed.bedNumber} creada correctamente`);
        }, 200);
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al crear la cama');
      }
    });
  }

  /**
   * Carga los pacientes del área de la cama que se está editando
   * SOLO muestra pacientes cuya cama pertenece al mismo área específica
   */
  loadPatientsForBedArea(areaId: number | null | undefined): void {
    if (!areaId) {
      this.filteredPatients = [];
      this.patientsFromCurrentArea = [];
      return;
    }
    this.adminService.getPatientsPage({
      areaId,
      isActive: true,
      page: 1,
      limit: 1000
    }).subscribe({
      next: (res) => {
        const responsePatients = (res.items || []).filter((patient: any) => patient.isActive !== false);
        const fallbackPatients = this.patients.filter((patient: any) => {
          const patientAreaId = this.toId(patient?.areaId);
          return patient.isActive !== false && patientAreaId === this.toId(areaId);
        });

        const mergedById = new Map<number, any>();
        [...responsePatients, ...fallbackPatients].forEach((patient: any) => {
          const patientId = this.toId(patient?.id);
          if (patientId === null) return;
          mergedById.set(patientId, patient);
        });

        const areaPatients = Array.from(mergedById.values());
        this.patientsFromCurrentArea = areaPatients.sort((a: any, b: any) => {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        this.filteredPatients = [...this.patientsFromCurrentArea];
      },
      error: () => {
        this.filteredPatients = [];
        this.patientsFromCurrentArea = [];
      }
    });
  }

  /**
   * Filtra pacientes por término de búsqueda dentro del área específica
   */
  filterPatients(): void {
    if (this.patientSearchTerm.trim()) {
      const searchLower = this.patientSearchTerm.toLowerCase();
      
      // Primero cargar todos los pacientes del área
      const areaId = this.editBedForm.areaId;
      if (!areaId) {
        this.filteredPatients = [];
        return;
      }
      
      // Luego filtrar por búsqueda
      this.filteredPatients = this.patientsFromCurrentArea.filter(patient => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const identification = (patient.identificationNumber || '').toLowerCase();
        return fullName.includes(searchLower) || identification.includes(searchLower);
      });
      
      // Ordenar resultados
      this.filteredPatients.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      // Sin búsqueda, mostrar todos los pacientes del área
      this.loadPatientsForBedArea(this.editBedForm.areaId);
    }
  }

  selectPatient(patient: any): void {
    this.editBedForm.patientId = patient.id;
    this.patientSearchTerm = '';
    this.filteredPatients = [];
  }

  openAssignPatientModal(): void {
    if (!this.editBedForm.areaId || !this.selectedBed?.id) {
      this.toastService.warning('No se pudo identificar el área o cama');
      return;
    }

    this.assignPatientSearchTerm = '';
    this.selectedPatientToAssign = null;
    this.assignablePatients = [...this.patientsFromCurrentArea];
    this.showAssignPatientModal = true;
  }

  closeAssignPatientModal(): void {
    this.showAssignPatientModal = false;
    this.assignPatientSearchTerm = '';
    this.selectedPatientToAssign = null;
    this.assignablePatients = [];
  }

  filterAssignablePatients(): void {
    const search = this.assignPatientSearchTerm.trim().toLowerCase();
    if (!search) {
      this.assignablePatients = [...this.patientsFromCurrentArea];
      return;
    }
    this.assignablePatients = this.patientsFromCurrentArea.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const identification = (patient.identificationNumber || '').toLowerCase();
      return fullName.includes(search) || identification.includes(search);
    });
  }

  assignPatientToCurrentBed(): void {
    if (!this.selectedBed?.id || !this.selectedPatientToAssign) {
      this.toastService.warning('Selecciona un paciente para asignar');
      return;
    }

    this.adminService.assignPatientToBed(this.selectedBed.id, this.selectedPatientToAssign).subscribe({
      next: () => {
        const patient = this.patientsFromCurrentArea.find((p) => p.id === this.selectedPatientToAssign);
        this.editBedForm.patientId = this.selectedPatientToAssign;
        this.toastService.success(`Paciente ${patient?.firstName || ''} ${patient?.lastName || ''} asignado a la cama`);
        this.closeAssignPatientModal();
        this.loadData();
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al asignar el paciente a la cama');
      }
    });
  }

  async releaseBed(): Promise<void> {
    const ok = await this.confirmationService.confirm({
      title: ADMIN_CONFIRM_RELEASE_BED_TITLE,
      message: ADMIN_CONFIRM_RELEASE_BED_MESSAGE,
      type: 'warning',
      confirmText: ADMIN_CONFIRM_RELEASE_BED_YES,
      cancelText: 'Cancelar',
    });
    if (!ok) {
      return;
    }
    this.editBedForm.patientId = null;
  }

  getCurrentPatientName(): string {
    const currentPatientId = this.toId(this.editBedForm.patientId);
    if (!currentPatientId) return '';
    const patient = this.patients.find(p => this.toId((p as any).id) === currentPatientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : '';
  }

  getPatientNameForBed(bed: Bed): string {
    const patientId = this.toId((bed as any).patientId);
    if (!patientId) {
      return 'Sin paciente';
    }
    const patientFromList = this.patients.find((p) => this.toId((p as any).id) === patientId);
    if (patientFromList) {
      return `${patientFromList.firstName} ${patientFromList.lastName}`;
    }
    if (bed.patient?.firstName || bed.patient?.lastName) {
      return `${bed.patient.firstName || ''} ${bed.patient.lastName || ''}`.trim();
    }
    return `Paciente #${patientId}`;
  }

  openOccupiedPatientModal(bed: Bed): void {
    if (!this.isBedOccupied(bed)) {
      this.toastService.warning('Esta cama no tiene paciente asignado');
      return;
    }

    this.selectedBedForPatientInfo = bed;
    const patientId = this.toId((bed as any).patientId);
    const patientFromList = this.patients.find((p) => this.toId((p as any).id) === patientId) || null;
    this.selectedPatientSummary = patientFromList || (bed as any).patient || { id: patientId };
    this.showOccupiedPatientModal = true;
  }

  closeOccupiedPatientModal(): void {
    this.showOccupiedPatientModal = false;
    this.selectedBedForPatientInfo = null;
    this.selectedPatientSummary = null;
  }

  openPatientDetailModalFromBed(): void {
    const patientId = this.selectedPatientSummary?.id || this.selectedBedForPatientInfo?.patientId;
    if (!patientId) {
      this.toastService.warning('No se pudo identificar el paciente de esta cama');
      return;
    }

    this.adminService.getPatient(patientId).subscribe({
      next: (patient) => {
        this.detailedPatient = patient;
        this.patientDetailForm = {
          medications: this.parseJsonArray(patient?.medications),
          treatmentHistory: this.parseJsonArray(patient?.treatmentHistory),
          pendingTasks: this.parseJsonArray(patient?.pendingTasks)
        };
        this.patientDetailTab = 'personal';
        this.showPatientDetailModal = true;
      },
      error: (error) => {
        const errorMessage = error.error?.message || 'No se pudo cargar la información detallada del paciente';
        this.toastService.error(errorMessage);
      }
    });
  }

  closePatientDetailModal(): void {
    this.showPatientDetailModal = false;
    this.detailedPatient = null;
    this.patientDetailForm = {
      medications: [],
      treatmentHistory: [],
      pendingTasks: []
    };
  }

  private parseJsonArray(value: any): any[] {
    if (!value) {
      return [];
    }
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Obtiene la cama asignada a un paciente
   */
  getPatientBed(patientId: number | null | undefined): Bed | undefined {
    const normalizedPatientId = this.toId(patientId);
    if (!normalizedPatientId) return undefined;
    return this.beds.find(bed => this.toId((bed as any).patientId) === normalizedPatientId);
  }

  saveBedChanges(): void {
    if (!this.selectedBed?.id || !this.editBedForm.bedNumber.trim()) {
      this.toastService.warning('El número de cama es requerido');
      return;
    }

    const originalPatientId = this.selectedBed.patientId ?? null;
    const newPatientId = this.editBedForm.patientId ?? null;
    const hasPatientChanged = newPatientId !== originalPatientId;
    const hasStateChanged = this.editBedForm.isActive !== this.selectedBed.isActive;
    
    this.adminService.assignPatientToBed(this.selectedBed.id, newPatientId).subscribe({
      next: () => {
        const formValue: any = this.editBedForm.isActive;
        let isActiveBoolean: boolean;
        
        if (formValue === false || formValue === 0 || formValue === 'false' || formValue === '0') {
          isActiveBoolean = false;
        } else if (formValue === true || formValue === 1 || formValue === 'true' || formValue === '1') {
          isActiveBoolean = true;
        } else {
          isActiveBoolean = Boolean(formValue);
        }
        
        const bedUpdate: Partial<Bed> = {
          bedNumber: this.editBedForm.bedNumber.trim(),
          isActive: isActiveBoolean,
        };
        
        this.adminService.updateBed(this.selectedBed!.id!, bedUpdate).subscribe({
          next: (response2) => {
            const bedIndex = this.beds.findIndex(b => b.id === this.selectedBed?.id);
            if (bedIndex !== -1 && response2.bed) {
              this.beds[bedIndex] = {
                ...this.beds[bedIndex],
                ...response2.bed,
                isActive: response2.bed.isActive === false ? false : true
              };
            }
            
            let message = 'Cama actualizada correctamente';
            if (newPatientId === null && originalPatientId !== null) {
              message = `Cama ${this.editBedForm.bedNumber} liberada correctamente`;
            } else if (newPatientId !== null && originalPatientId === null) {
              message = `Paciente asignado a cama ${this.editBedForm.bedNumber}`;
            } else if (hasStateChanged) {
              const estado = isActiveBoolean ? 'disponible' : 'no disponible';
              message = `Cama ${this.editBedForm.bedNumber} marcada como ${estado}`;
            }
            
            this.closeEditBedModal();
            this.cdr.detectChanges();
            
            setTimeout(() => {
              this.loadData();
              setTimeout(() => {
                this.toastService.success(message);
              }, 200);
            }, 100);
          },
          error: (error) => {
            this.toastService.error(error.error?.message || 'Error al actualizar la cama');
            this.loadData();
            this.closeEditBedModal();
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al actualizar la asignación de paciente');
        this.loadData();
        this.closeEditBedModal();
        this.cdr.detectChanges();
      },
    });
  }

  async deleteBed(bed: Bed): Promise<void> {
    if (this.isBedOccupied(bed)) {
      this.toastService.warning('No se puede eliminar una cama que tiene un paciente asignado. Por favor, libera primero la cama.');
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar cama',
      message: `¿Estás seguro de eliminar la cama ${bed.bedNumber}?\n\nEsta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'warning'
    });

    if (!confirmed) {
      return;
    }

    this.adminService.deleteBed(bed.id!).subscribe({
      next: () => {
        this.toastService.success(`Cama ${bed.bedNumber} eliminada exitosamente`);
        this.loadData();
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 200);
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error al eliminar la cama';
        this.toastService.error(errorMessage);
      },
    });
  }

  getPatientsForBedSelection(): any[] {
    return this.patients;
  }

  /**
   * Obtiene la clase CSS para el estado de la cama
   */
  getBedClass(bed: Bed): string {
    const isUnavailable = bed.isActive === false;
    const isOccupied = this.isBedOccupied(bed);
    
    return isUnavailable ? 'unavailable' : isOccupied ? 'occupied' : 'available';
  }

  /**
   * Obtiene la etiqueta de texto para el estado de la cama
   */
  getBedStatusLabel(bed: Bed): string {
    if (bed.isActive === false) {
      return 'No Disponible';
    }
    if (this.isBedOccupied(bed)) {
      return 'Ocupada';
    }
    return 'Disponible';
  }
}

