import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Area, Bed } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';

@Component({
  selector: 'app-beds-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
            patientId:
              bed.patientId !== undefined && bed.patientId !== null
                ? bed.patientId
                : (bed as any).patient?.id ?? null,
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
    this.adminService.getPatients().subscribe({
      next: (patients) => {
        // Cargar pacientes activos con información de su cama y área
        this.patients = patients
          .filter((p: any) => p.isActive)
          .map((patient: any) => {
            // Encontrar la cama del paciente si tiene una asignada
            const patientBed = this.beds.find(bed => bed.patientId === patient.id);
            return {
              ...patient,
              bedId: patientBed?.id || null,
              areaId: patientBed?.areaId || null,
              bedNumber: patientBed?.bedNumber || null
            };
          });
        
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
      filtered = filtered.filter((bed) => bed.patientId && bed.isActive !== false);
    } else if (this.filterStatus === 'available') {
      filtered = filtered.filter((bed) => !bed.patientId && bed.isActive !== false);
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
      alert('El número de cama y el área son requeridos');
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
          alert(`✅ Cama ${newBed.bedNumber} creada exitosamente`);
        }, 200);
      },
      error: (error) => {
        alert(error.error?.message || 'Error al crear la cama');
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
      limit: 500
    }).subscribe({
      next: (res) => {
        const areaPatients = (res.items || []).filter((patient: any) => patient.isActive !== false);
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

  releaseBed(): void {
    if (confirm('¿Estás seguro de liberar esta cama? El paciente quedará sin cama asignada.')) {
      this.editBedForm.patientId = null;
    }
  }

  getCurrentPatientName(): string {
    if (!this.editBedForm.patientId) return '';
    const patient = this.patients.find(p => p.id === this.editBedForm.patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : '';
  }

  getPatientNameForBed(bed: Bed): string {
    if (!bed.patientId) {
      return 'Sin paciente';
    }
    const patientFromList = this.patients.find((p) => p.id === bed.patientId);
    if (patientFromList) {
      return `${patientFromList.firstName} ${patientFromList.lastName}`;
    }
    if (bed.patient?.firstName || bed.patient?.lastName) {
      return `${bed.patient.firstName || ''} ${bed.patient.lastName || ''}`.trim();
    }
    return `Paciente #${bed.patientId}`;
  }

  openOccupiedPatientModal(bed: Bed): void {
    if (!bed.patientId) {
      this.toastService.warning('Esta cama no tiene paciente asignado');
      return;
    }

    this.selectedBedForPatientInfo = bed;
    const patientFromList = this.patients.find((p) => p.id === bed.patientId) || null;
    this.selectedPatientSummary = patientFromList || bed.patient || { id: bed.patientId };
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
    if (!patientId) return undefined;
    return this.beds.find(bed => bed.patientId === patientId);
  }

  saveBedChanges(): void {
    if (!this.selectedBed?.id || !this.editBedForm.bedNumber.trim()) {
      alert('El número de cama es requerido');
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
            
            let message = '✅ Cama actualizada exitosamente';
            if (newPatientId === null && originalPatientId !== null) {
              message = `✅ Cama ${this.editBedForm.bedNumber} liberada exitosamente`;
            } else if (newPatientId !== null && originalPatientId === null) {
              message = `✅ Paciente asignado a cama ${this.editBedForm.bedNumber}`;
            } else if (hasStateChanged) {
              const estado = isActiveBoolean ? 'disponible' : 'no disponible';
              message = `✅ Cama ${this.editBedForm.bedNumber} marcada como ${estado}`;
            }
            
            this.closeEditBedModal();
            this.cdr.detectChanges();
            
            setTimeout(() => {
              this.loadData();
              setTimeout(() => {
                alert(message);
              }, 200);
            }, 100);
          },
          error: (error) => {
            alert(error.error?.message || 'Error al actualizar la cama');
            this.loadData();
            this.closeEditBedModal();
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        alert(error.error?.message || 'Error al actualizar la asignación de paciente');
        this.loadData();
        this.closeEditBedModal();
        this.cdr.detectChanges();
      },
    });
  }

  async deleteBed(bed: Bed): Promise<void> {
    if (bed.patientId) {
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
    const isOccupied = bed.patientId !== null && bed.patientId !== undefined;
    
    return isUnavailable ? 'unavailable' : isOccupied ? 'occupied' : 'available';
  }

  /**
   * Obtiene la etiqueta de texto para el estado de la cama
   */
  getBedStatusLabel(bed: Bed): string {
    if (bed.isActive === false) {
      return 'No Disponible';
    }
    if (bed.patientId !== null && bed.patientId !== undefined) {
      return 'Ocupada';
    }
    return 'Disponible';
  }
}

