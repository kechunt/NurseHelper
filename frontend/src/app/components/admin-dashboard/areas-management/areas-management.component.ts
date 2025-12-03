import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Area, Bed } from '../../../services/admin.service';

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
  loading = false;
  showModal = false;
  showBedsSelectionModal = false;
  showEditBedModal = false;
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

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadAreas();
    this.loadBeds();
    this.loadPatients();
  }

  loadPatients(): void {
    this.adminService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients.filter((p: any) => p.isActive);
      },
      error: (error) => {
        console.error('Error loading patients:', error);
      },
    });
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
      alert('El nombre del área es requerido');
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
          alert(error.error?.message || 'Error al actualizar el área');
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
          alert(error.error?.message || 'Error al crear el área');
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
      alert('Error: Área no seleccionada');
      return;
    }

    // Filtrar números de cama válidos (no vacíos)
    const validBedNumbers = this.customBedNumbers
      .map((num) => num.trim())
      .filter((num) => num.length > 0);

    if (validBedNumbers.length === 0) {
      alert('Debes ingresar al menos un número de cama');
      return;
    }

    // Verificar duplicados en la lista de entrada
    const duplicates = validBedNumbers.filter((num, index) => validBedNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      alert(`Hay números de cama duplicados: ${duplicates.join(', ')}`);
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
              alert(`Se crearon ${created} de ${bedsToCreate.length} camas.\nErrores: ${errorMessages.join(', ')}`);
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
              alert(`Se crearon ${created} de ${bedsToCreate.length} camas.\nErrores: ${errorMessages.join(', ')}`);
            } else {
              alert(`Error al crear las camas:\n${errorMessages.join('\n')}`);
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
      alert('La cantidad de camas debe ser mayor a las actuales para agregar nuevas camas.');
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

  saveBedChanges(): void {
    if (!this.selectedBed?.id || !this.editBedForm.bedNumber.trim()) {
      alert('El número de cama es requerido');
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
              alert(error.error?.message || 'Error al actualizar la asignación de paciente');
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
        alert(error.error?.message || 'Error al actualizar la cama');
      },
    });
  }

  removeBedFromArea(bed: Bed): void {
    if (!confirm(`¿Estás seguro de eliminar la cama ${bed.bedNumber} de esta área?`)) {
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
        alert(error.error?.message || 'Error al eliminar la cama');
      },
    });
  }

  deleteArea(area: Area): void {
    if (!confirm(`¿Estás seguro de eliminar el área "${area.name}"?`)) {
      return;
    }

    this.adminService.deleteArea(area.id!).subscribe({
      next: () => {
        this.loadAreas();
      },
      error: (error) => {
        alert(error.error?.message || 'Error al eliminar el área');
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

  getValidBedNumbersCount(): number {
    return this.customBedNumbers.filter((num) => num && num.trim().length > 0).length;
  }

  hasValidBedNumbers(): boolean {
    return this.customBedNumbers.some((num) => num && num.trim().length > 0);
  }
}

