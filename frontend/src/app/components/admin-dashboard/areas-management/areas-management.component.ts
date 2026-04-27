import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Area, Bed } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';

@Component({
  selector: 'app-areas-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './areas-management.component.html',
  styleUrl: './areas-management.component.css',
})
export class AreasManagementComponent implements OnInit {
  areas: Area[] = [];
  beds: Bed[] = [];
  patients: any[] = [];
  rawPatients: any[] = [];
  loading = false;
  showModal = false;
  showBedsSelectionModal = false;
  showEditBedModal = false;
  showCreateBedModal = false;
  selectedArea: Area | null = null;
  selectedBed: Bed | null = null;
  areaForm: Partial<Area & { bedsCount: number }> = {};
  customBedNumbers: string[] = [];
  bedsToAddCount: number = 0;
  editBedForm: { bedNumber: string; patientId: number | null; isActive: boolean } = { 
    bedNumber: '', 
    patientId: null,
    isActive: true
  };
  createBedForm: { bedNumber: string; areaId: number | null; notes: string } = {
    bedNumber: '',
    areaId: null,
    notes: ''
  };

  // Nuevas propiedades para gestión de pacientes por área
  patientsWithoutArea: any[] = [];
  showPatientsWithoutAreaSection = true;
  showPatientsByAreaSection = true;
  expandedAreas: Set<number> = new Set();
  showAssignAreaModal = false;
  selectedPatientForArea: any = null;
  assignAreaForm: { areaId: number | null; bedId: number | null } = {
    areaId: null,
    bedId: null
  };
  availableBedsForAssignment: Bed[] = [];
  showChangeAreaModal = false;
  changeAreaForm: { areaId: number | null; bedId: number | null } = {
    areaId: null,
    bedId: null
  };
  showAreaBedsModal = false;
  selectedAreaForBeds: Area | null = null;
  showAreaPatientsModal = false;
  selectedAreaForPatients: Area | null = null;

  constructor(
    private adminService: AdminService,
    private toastService: ToastService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadAreas();
    this.loadBeds();
    this.loadPatients();
  }

  loadPatients(): void {
    this.adminService.getPatients(false).subscribe({
      next: (patients) => {
        this.rawPatients = patients.filter((p: any) => p.isActive);
        this.normalizePatientsData();
      },
      error: (error) => {
        console.error('Error loading patients:', error);
      },
    });
  }

  normalizePatientsData(): void {
    this.patients = this.rawPatients.map((patient: any) => {
      const bedFromBedsList = this.beds.find((bed) => bed.patientId === patient.id);
      const bedFromPatient = patient.bed || null;

      const resolvedBedId =
        bedFromBedsList?.id ??
        patient.bedId ??
        bedFromPatient?.id ??
        null;

      const resolvedAreaId =
        bedFromBedsList?.areaId ??
        bedFromPatient?.areaId ??
        patient.areaId ??
        null;

      const resolvedBedNumber =
        bedFromBedsList?.bedNumber ??
        bedFromPatient?.bedNumber ??
        null;

      const resolvedAreaName = resolvedAreaId
        ? this.areas.find((a) => a.id === resolvedAreaId)?.name || patient.area?.name || 'Sin área'
        : 'Sin área';

      return {
        ...patient,
        bedId: resolvedBedId,
        areaId: resolvedAreaId,
        bedNumber: resolvedBedNumber,
        areaName: resolvedAreaName
      };
    });

    this.patientsWithoutArea = this.patients.filter((p) => !p.areaId);
  }

  getPatientsForBedSelection(): any[] {
    return this.patients;
  }

  trackByIndex(index: number): number {
    return index;
  }

  loadAreas(): void {
    this.loading = true;
    this.adminService.getAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
        this.normalizePatientsData();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading areas:', error);
        this.loading = false;
      },
    });
  }

  loadBeds(): void {
    this.adminService.getBeds().subscribe({
      next: (beds) => {
        this.beds = beds;
        this.normalizePatientsData();
      },
      error: (error) => {
        console.error('Error loading beds:', error);
      },
    });
  }

  openModal(area?: Area): void {
    if (area) {
      this.selectedArea = area;
      const currentBedsCount = this.getBedsForArea(area.id).length;
      this.areaForm = {
        name: area.name,
        description: area.description,
        isActive: area.isActive,
        bedsCount: currentBedsCount,
      };
    } else {
      this.selectedArea = null;
      this.areaForm = { name: '', description: '', isActive: true, bedsCount: 0 };
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedArea = null;
    this.areaForm = {};
  }

  closeBedsSelectionModal(): void {
    this.showBedsSelectionModal = false;
    this.customBedNumbers = [];
    this.bedsToAddCount = 0;
  }

  saveArea(): void {
    if (!this.areaForm.name) {
      this.toastService.warning('El nombre del área es requerido');
      return;
    }

    const bedsCount = this.areaForm.bedsCount || 0;
    const currentBedsCount = this.selectedArea?.id 
      ? this.getBedsForArea(this.selectedArea.id).length 
      : 0;
    const bedsToAdd = bedsCount > currentBedsCount ? bedsCount - currentBedsCount : 0;

    if (this.selectedArea?.id) {
      // Actualizar área
      const { bedsCount, ...areaData } = this.areaForm;
      this.adminService.updateArea(this.selectedArea.id, areaData).subscribe({
        next: () => {
          if (bedsToAdd > 0) {
            // Si necesita agregar camas, abrir modal de selección
            this.loadAllBedsForSelection(this.selectedArea!.id!, bedsToAdd);
            this.showModal = false; // Cerrar modal de área temporalmente
          } else {
            this.loadAreas();
            this.loadBeds();
            this.closeModal();
          }
        },
        error: (error) => {
          this.toastService.error(error.error?.message || 'Error al actualizar el área');
        },
      });
    } else {
      const { bedsCount, ...areaData } = this.areaForm;
      const bedsCountValue = bedsCount || 0;
      this.adminService.createArea(areaData as Area).subscribe({
        next: (response: any) => {
          const newAreaId = response.area?.id || response.id;
          if (newAreaId && bedsCountValue > 0) {
            this.loadAllBedsForSelection(newAreaId, bedsCountValue);
            this.showModal = false; // Cerrar modal de área temporalmente
          } else {
            this.loadAreas();
            this.closeModal();
          }
        },
        error: (error) => {
          this.toastService.error(error.error?.message || 'Error al crear el área');
        },
      });
    }
  }

  loadAllBedsForSelection(areaId: number, bedsCount: number): void {
    this.bedsToAddCount = bedsCount;
    this.customBedNumbers = Array(bedsCount).fill('');
    this.selectedArea = { id: areaId } as Area;
    this.showModal = false;
    this.showBedsSelectionModal = true;
  }

  onBedNumberChange(index: number, value: string): void {
    if (this.customBedNumbers[index] !== undefined) {
      this.customBedNumbers[index] = value;
    }
  }

  addBedInput(): void {
    this.customBedNumbers.push('');
    this.bedsToAddCount++;
  }

  removeBedInput(index: number): void {
    if (this.customBedNumbers.length > 1) {
      this.customBedNumbers.splice(index, 1);
      this.bedsToAddCount--;
    }
  }

  createSelectedBeds(): void {
    if (!this.selectedArea?.id) {
      this.toastService.error('Error: Área no seleccionada');
      return;
    }

    // Filtrar números de cama válidos (no vacíos)
    const validBedNumbers = this.customBedNumbers
      .map((num) => num.trim())
      .filter((num) => num.length > 0);

    if (validBedNumbers.length === 0) {
      this.toastService.warning('Debes ingresar al menos un número de cama');
      return;
    }

    // Verificar duplicados en la lista de entrada
    const duplicates = validBedNumbers.filter((num, index) => validBedNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      this.toastService.warning(`Hay números de cama duplicados: ${duplicates.join(', ')}`);
      return;
    }

    const bedsToCreate: Bed[] = validBedNumbers.map((bedNumber) => ({
      bedNumber,
      areaId: this.selectedArea!.id!,
      isActive: true,
    }));

    let created = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    bedsToCreate.forEach((bed) => {
      this.adminService.createBed(bed).subscribe({
        next: () => {
          created++;
          if (created + errors === bedsToCreate.length) {
            this.loadBeds();
            this.loadAreas();
            this.closeBedsSelectionModal();
            if (errors > 0) {
              this.toastService.warning(`Se crearon ${created} de ${bedsToCreate.length} camas. Errores: ${errorMessages.join(', ')}`);
            } else {
              this.toastService.success(`Se crearon ${created} camas exitosamente`);
            }
          }
        },
        error: (error) => {
          console.error('Error creating bed:', error);
          errors++;
          errorMessages.push(`${bed.bedNumber}: ${error.error?.message || 'Error desconocido'}`);
          if (created + errors === bedsToCreate.length) {
            this.loadBeds();
            this.loadAreas();
            this.closeBedsSelectionModal();
            if (created > 0) {
              this.toastService.warning(`Se crearon ${created} de ${bedsToCreate.length} camas. Errores: ${errorMessages.join(', ')}`);
            } else {
              this.toastService.error(`Error al crear las camas: ${errorMessages.join(', ')}`);
            }
          }
        },
      });
    });
  }

  openBedsManager(): void {
    if (!this.selectedArea?.id) return;
    
    const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length;
    const bedsCount = this.areaForm.bedsCount || 0;
    const bedsToAdd = bedsCount > currentBedsCount ? bedsCount - currentBedsCount : 0;
    
    if (bedsToAdd > 0) {
      this.loadAllBedsForSelection(this.selectedArea.id, bedsToAdd);
      this.showModal = false;
    } else {
      this.toastService.warning('La cantidad de camas debe ser mayor a las actuales para agregar nuevas camas.');
    }
  }

  openEditBedModal(bed: Bed): void {
    this.selectedBed = bed;
    this.editBedForm = {
      bedNumber: bed.bedNumber || '',
      patientId: bed.patientId || null,
      isActive: bed.isActive !== undefined ? bed.isActive : true,
    };
    this.showEditBedModal = true;
  }

  closeEditBedModal(): void {
    this.showEditBedModal = false;
    this.selectedBed = null;
    this.editBedForm = { bedNumber: '', patientId: null, isActive: true };
  }

  openCreateBedModal(area?: Area): void {
    const areaId = area?.id || this.selectedArea?.id || null;
    this.createBedForm = {
      bedNumber: '',
      areaId,
      notes: ''
    };
    this.showCreateBedModal = true;
  }

  closeCreateBedModal(): void {
    this.showCreateBedModal = false;
    this.createBedForm = {
      bedNumber: '',
      areaId: null,
      notes: ''
    };
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

    const createdAreaId = this.createBedForm.areaId;

    this.adminService.createBed(newBed as Bed).subscribe({
      next: () => {
        this.toastService.success(`Cama ${newBed.bedNumber} creada exitosamente`);
        this.closeCreateBedModal();
        this.loadBeds();
        this.loadAreas();
        this.loadPatients();

        // Si estamos editando esta área, refrescar contador de camas del formulario
        if (this.showModal && this.selectedArea?.id === createdAreaId) {
          const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length + 1;
          this.areaForm.bedsCount = currentBedsCount;
        }
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al crear la cama');
      }
    });
  }

  saveBedChanges(): void {
    if (!this.selectedBed?.id || !this.editBedForm.bedNumber.trim()) {
      this.toastService.warning('El número de cama es requerido');
      return;
    }

    const bedUpdate: Partial<Bed> = {
      bedNumber: this.editBedForm.bedNumber.trim(),
      isActive: this.editBedForm.isActive,
    };

    // Actualizar nombre y estado disponible/no disponible
    this.adminService.updateBed(this.selectedBed.id, bedUpdate).subscribe({
      next: () => {
        // Si cambió el paciente, actualizar la asignación
        if (this.editBedForm.patientId !== (this.selectedBed?.patientId || null)) {
          this.adminService.assignPatientToBed(this.selectedBed!.id!, this.editBedForm.patientId).subscribe({
            next: () => {
              this.loadBeds();
              this.loadAreas();
              // Si el modal de área está abierto, refrescar el formulario para mostrar los cambios
              if (this.showModal && this.selectedArea) {
                const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length;
                this.areaForm.bedsCount = currentBedsCount;
              }
              this.closeEditBedModal();
            },
            error: (error) => {
              this.toastService.error(error.error?.message || 'Error al actualizar la asignación de paciente');
              this.loadBeds();
              this.loadAreas();
              // Si el modal de área está abierto, refrescar el formulario para mostrar los cambios
              if (this.showModal && this.selectedArea) {
                const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length;
                this.areaForm.bedsCount = currentBedsCount;
              }
              this.closeEditBedModal();
            },
          });
        } else {
          this.loadBeds();
          this.loadAreas();
          // Si el modal de área está abierto, refrescar el formulario para mostrar los cambios
          if (this.showModal && this.selectedArea) {
            const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length;
            this.areaForm.bedsCount = currentBedsCount;
          }
          this.closeEditBedModal();
        }
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al actualizar la cama');
      },
    });
  }

  async removeBedFromArea(bed: Bed): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar cama',
      message: `¿Estás seguro de eliminar la cama ${bed.bedNumber} de esta área?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.adminService.deleteBed(bed.id!).subscribe({
      next: () => {
        this.loadBeds();
        const currentBedsCount = this.selectedArea?.id 
          ? this.getBedsForArea(this.selectedArea.id).length 
          : 0;
        this.areaForm.bedsCount = currentBedsCount - 1;
        this.loadAreas();
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al eliminar la cama');
      },
    });
  }

  async deleteArea(area: Area): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar área',
      message: `¿Estás seguro de eliminar el área "${area.name}"? Esta acción eliminará todas las camas asociadas.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.adminService.deleteArea(area.id!).subscribe({
      next: () => {
        this.toastService.success(`Área ${area.name} eliminada exitosamente`);
        this.loadAreas();
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error al eliminar el área';
        this.toastService.error(errorMessage);
      },
    });
  }

  getBedsForArea(areaId?: number): Bed[] {
    if (!areaId) return [];
    return this.beds.filter((bed) => bed.areaId === areaId);
  }

  getOccupiedBedsForArea(areaId?: number): number {
    if (!areaId) return 0;
    return this.beds.filter((bed) => bed.areaId === areaId && bed.patientId).length;
  }

  getPatientsCountForArea(areaId?: number): number {
    if (!areaId) return 0;
    return this.getPatientsByArea(areaId).length;
  }

  openAreaBedsModal(area: Area): void {
    this.selectedAreaForBeds = area;
    this.showAreaBedsModal = true;
  }

  closeAreaBedsModal(): void {
    this.showAreaBedsModal = false;
    this.selectedAreaForBeds = null;
  }

  openAreaPatientsModal(area: Area): void {
    this.selectedAreaForPatients = area;
    this.showAreaPatientsModal = true;
  }

  closeAreaPatientsModal(): void {
    this.showAreaPatientsModal = false;
    this.selectedAreaForPatients = null;
  }

  getBedsDetailsForArea(areaId?: number): Array<{
    bed: Bed;
    patient: any | null;
  }> {
    if (!areaId) return [];
    const bedsForArea = this.getBedsForArea(areaId);
    return bedsForArea
      .map((bed) => {
        const patient =
          this.patients.find((p: any) => p.id === bed.patientId) ||
          (bed as any).patient ||
          null;
        return { bed, patient };
      })
      .sort((a, b) => (a.bed.bedNumber || '').localeCompare(b.bed.bedNumber || ''));
  }

  releasePatientFromBed(bed: Bed): void {
    if (!bed.id || !bed.patientId) {
      this.toastService.warning('Esta cama no tiene paciente asignado');
      return;
    }

    this.adminService.assignPatientToBed(bed.id, null).subscribe({
      next: () => {
        this.toastService.success(`Paciente liberado de la cama ${bed.bedNumber}`);
        this.loadBeds();
        this.loadPatients();
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al liberar cama');
      }
    });
  }

  getValidBedNumbersCount(): number {
    return this.customBedNumbers.filter((num) => num && num.trim().length > 0).length;
  }

  hasValidBedNumbers(): boolean {
    return this.customBedNumbers.some((num) => num && num.trim().length > 0);
  }

  // ========== GESTIÓN DE PACIENTES POR ÁREA ==========

  /**
   * Obtiene pacientes de un área específica
   */
  getPatientsByArea(areaId: number): any[] {
    return this.patients.filter(p => p.areaId === areaId);
  }

  togglePatientsWithoutAreaSection(): void {
    this.showPatientsWithoutAreaSection = !this.showPatientsWithoutAreaSection;
  }

  togglePatientsByAreaSection(): void {
    this.showPatientsByAreaSection = !this.showPatientsByAreaSection;
  }

  /**
   * Alterna la expansión de un área en la tabla desplegable
   */
  toggleAreaExpansion(areaId: number): void {
    if (this.expandedAreas.has(areaId)) {
      this.expandedAreas.delete(areaId);
    } else {
      this.expandedAreas.add(areaId);
    }
  }

  /**
   * Verifica si un área está expandida
   */
  isAreaExpanded(areaId: number): boolean {
    return this.expandedAreas.has(areaId);
  }

  /**
   * Abre modal para asignar área y cama a un paciente sin área
   */
  openAssignAreaModal(patient: any): void {
    this.selectedPatientForArea = patient;
    this.assignAreaForm = {
      areaId: null,
      bedId: null
    };
    this.availableBedsForAssignment = [];
    this.showAssignAreaModal = true;
  }

  /**
   * Cierra modal de asignación de área
   */
  closeAssignAreaModal(): void {
    this.showAssignAreaModal = false;
    this.selectedPatientForArea = null;
    this.assignAreaForm = { areaId: null, bedId: null };
    this.availableBedsForAssignment = [];
  }

  /**
   * Carga camas disponibles cuando se selecciona un área
   */
  onAreaSelectedForAssignment(): void {
    const areaId = this.assignAreaForm.areaId;
    if (areaId) {
      this.adminService.getBedsByArea(areaId).subscribe({
        next: (beds) => {
          // Mostrar camas disponibles (sin paciente asignado) y la cama actual si existe
          this.availableBedsForAssignment = beds.filter(bed => 
            !bed.patientId || bed.id === this.selectedPatientForArea?.bedId
          );
          this.assignAreaForm.bedId = null;
        },
        error: (error) => {
          console.error('Error loading beds:', error);
          this.availableBedsForAssignment = [];
        },
      });
    } else {
      this.availableBedsForAssignment = [];
      this.assignAreaForm.bedId = null;
    }
  }

  /**
   * Asigna área y cama a un paciente sin área
   */
  assignAreaToPatient(): void {
    if (!this.selectedPatientForArea?.id) {
      this.toastService.error('Error: Paciente no seleccionado');
      return;
    }

    if (!this.assignAreaForm.areaId) {
      this.toastService.warning('Por favor selecciona un área');
      return;
    }

    if (!this.assignAreaForm.bedId) {
      this.toastService.warning('Por favor selecciona una cama');
      return;
    }

    // Asignar paciente a la cama seleccionada
    this.adminService.assignPatientToBed(this.assignAreaForm.bedId, this.selectedPatientForArea.id).subscribe({
      next: () => {
        this.toastService.success(`Paciente ${this.selectedPatientForArea.firstName} ${this.selectedPatientForArea.lastName} asignado al área exitosamente`);
        this.closeAssignAreaModal();
        this.loadBeds();
        this.loadPatients();
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al asignar paciente al área');
      },
    });
  }

  /**
   * Abre modal para cambiar área y cama de un paciente
   */
  openChangeAreaModal(patient: any): void {
    this.selectedPatientForArea = patient;
    this.changeAreaForm = {
      areaId: patient.areaId || null,
      bedId: patient.bedId || null
    };
    this.availableBedsForAssignment = [];
    
    // Cargar camas del área actual si existe
    if (this.changeAreaForm.areaId) {
      this.onAreaSelectedForChange();
    }
    
    this.showChangeAreaModal = true;
  }

  /**
   * Cierra modal de cambio de área
   */
  closeChangeAreaModal(): void {
    this.showChangeAreaModal = false;
    this.selectedPatientForArea = null;
    this.changeAreaForm = { areaId: null, bedId: null };
    this.availableBedsForAssignment = [];
  }

  /**
   * Carga camas disponibles cuando se selecciona un área para cambio
   */
  onAreaSelectedForChange(): void {
    const areaId = this.changeAreaForm.areaId;
    if (areaId) {
      this.adminService.getBedsByArea(areaId).subscribe({
        next: (beds) => {
          // Mostrar camas disponibles y la cama actual del paciente
          this.availableBedsForAssignment = beds.filter(bed => 
            !bed.patientId || bed.id === this.selectedPatientForArea?.bedId
          );
          // Si el área cambió, resetear la cama seleccionada
          if (this.changeAreaForm.areaId !== this.selectedPatientForArea?.areaId) {
            this.changeAreaForm.bedId = null;
          }
        },
        error: (error) => {
          console.error('Error loading beds:', error);
          this.availableBedsForAssignment = [];
        },
      });
    } else {
      this.availableBedsForAssignment = [];
      this.changeAreaForm.bedId = null;
    }
  }

  /**
   * Cambia el área y cama de un paciente
   */
  changePatientArea(): void {
    if (!this.selectedPatientForArea?.id) {
      this.toastService.error('Error: Paciente no seleccionado');
      return;
    }

    if (!this.changeAreaForm.areaId) {
      this.toastService.warning('Por favor selecciona un área');
      return;
    }

    if (!this.changeAreaForm.bedId) {
      this.toastService.warning('Por favor selecciona una cama');
      return;
    }

    const oldBedId = this.selectedPatientForArea.bedId;
    const newBedId = this.changeAreaForm.bedId;

    // Si cambió la cama, primero liberar la anterior y luego asignar la nueva
    if (oldBedId && oldBedId !== newBedId) {
      // Liberar cama anterior
      this.adminService.assignPatientToBed(oldBedId, null).subscribe({
        next: () => {
          // Asignar nueva cama
          this.adminService.assignPatientToBed(newBedId, this.selectedPatientForArea.id).subscribe({
            next: () => {
              this.toastService.success(`Paciente ${this.selectedPatientForArea.firstName} ${this.selectedPatientForArea.lastName} movido al área exitosamente`);
              this.closeChangeAreaModal();
              this.loadBeds();
              this.loadPatients();
            },
            error: (error) => {
              this.toastService.error(error.error?.message || 'Error al asignar nueva cama');
            },
          });
        },
        error: (error) => {
          this.toastService.error('Error al liberar cama anterior');
        },
      });
    } else if (!oldBedId) {
      // Solo asignar nueva cama
      this.adminService.assignPatientToBed(newBedId, this.selectedPatientForArea.id).subscribe({
        next: () => {
          this.toastService.success(`Paciente ${this.selectedPatientForArea.firstName} ${this.selectedPatientForArea.lastName} asignado al área exitosamente`);
          this.closeChangeAreaModal();
          this.loadBeds();
          this.loadPatients();
        },
        error: (error) => {
          this.toastService.error(error.error?.message || 'Error al asignar cama');
        },
      });
    } else {
      // Misma cama, solo cerrar modal
      this.closeChangeAreaModal();
    }
  }
}

