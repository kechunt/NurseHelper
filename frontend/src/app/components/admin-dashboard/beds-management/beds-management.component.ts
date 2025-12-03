import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Area, Bed } from '../../../services/admin.service';

@Component({
  selector: 'app-beds-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './beds-management.component.html',
  styleUrl: './beds-management.component.css',
})
export class BedsManagementComponent implements OnInit {
  beds: Bed[] = [];
  areas: Area[] = [];
  patients: any[] = [];
  loading = false;
  filterStatus: 'all' | 'occupied' | 'available' | 'unavailable' = 'all';
  selectedAreaId: number | null = null;
  showEditBedModal = false;
  selectedBed: Bed | null = null;
  editBedForm: { bedNumber: string; patientId: number | null; isActive: boolean } = { 
    bedNumber: '', 
    patientId: null,
    isActive: true
  };
  patientSearchTerm: string = '';
  filteredPatients: any[] = [];

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    this.adminService.getBeds(false).subscribe({
      next: (beds) => {
        this.beds = [...beds];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading beds:', error);
        this.loading = false;
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

    this.adminService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients.filter((p: any) => p.isActive);
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
    this.patientSearchTerm = '';
    this.filteredPatients = [];
  }

  filterPatients(): void {
    if (!this.patientSearchTerm.trim()) {
      this.filteredPatients = [];
      return;
    }

    const searchLower = this.patientSearchTerm.toLowerCase();
    
    // Buscar por nombre o cédula
    this.filteredPatients = this.patients.filter(patient => {
      // Solo pacientes sin cama asignada
      const hasBed = this.beds.some(bed => bed.patientId === patient.id);
      if (hasBed && patient.id !== this.editBedForm.patientId) {
        return false;
      }

      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const identification = (patient.identificationNumber || '').toLowerCase();
      
      return fullName.includes(searchLower) || identification.includes(searchLower);
    });
  }

  selectPatient(patient: any): void {
    this.editBedForm.patientId = patient.id;
    this.patientSearchTerm = '';
    this.filteredPatients = [];
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

  saveBedChanges(): void {
    if (!this.selectedBed?.id || !this.editBedForm.bedNumber.trim()) {
      alert('El número de cama es requerido');
      return;
    }

    // Normalizar valores para comparación (null vs undefined)
    const originalPatientId = this.selectedBed.patientId ?? null;
    const newPatientId = this.editBedForm.patientId ?? null;
    
    console.log('💾 Guardando cambios de cama:', {
      bedId: this.selectedBed.id,
      bedNumber: this.editBedForm.bedNumber,
      isActive: this.editBedForm.isActive,
      patientIdOriginal: originalPatientId,
      patientIdNuevo: newPatientId
    });

    const hasPatientChanged = newPatientId !== originalPatientId;
    const hasStateChanged = this.editBedForm.isActive !== this.selectedBed.isActive;

    console.log('🔍 Cambios detectados:', {
      pacientesCambiaron: hasPatientChanged,
      estadoCambio: hasStateChanged
    });

    // SIEMPRE actualizar en ambos endpoints para asegurar sincronización
    console.log('📞 1. Actualizando asignación de paciente...');
    
    this.adminService.assignPatientToBed(this.selectedBed.id, newPatientId).subscribe({
      next: (response) => {
        console.log('✅ Paciente actualizado:', response);
        
        // 2. Actualizar nombre y estado
        const bedUpdate: Partial<Bed> = {
          bedNumber: this.editBedForm.bedNumber.trim(),
          isActive: this.editBedForm.isActive,
        };
        
        console.log('📞 2. Actualizando estado de cama...');
        
          this.adminService.updateBed(this.selectedBed!.id!, bedUpdate).subscribe({
            next: (response2) => {
              console.log('✅ Cama actualizada:', response2);
              
              let message = '✅ Cama actualizada exitosamente';
              if (newPatientId === null && originalPatientId !== null) {
                message = `✅ Cama ${this.editBedForm.bedNumber} liberada exitosamente`;
              } else if (newPatientId !== null && originalPatientId === null) {
                message = `✅ Paciente asignado a cama ${this.editBedForm.bedNumber}`;
              }
              
              // Cerrar modal primero
              this.closeEditBedModal();
              
              // Luego recargar y mostrar mensaje
              this.loadData();
              
              // Mostrar mensaje después de un pequeño delay para asegurar que la UI se actualice
              setTimeout(() => {
                alert(message);
              }, 100);
            },
          error: (error) => {
            console.error('❌ Error al actualizar estado:', error);
            alert(error.error?.message || 'Error al actualizar la cama');
            this.loadData();
            this.closeEditBedModal();
          }
        });
      },
      error: (error) => {
        console.error('❌ Error al asignar paciente:', error);
        alert(error.error?.message || 'Error al actualizar la asignación de paciente');
        this.loadData();
        this.closeEditBedModal();
      },
    });
  }

  deleteBed(bed: Bed): void {
    if (!confirm(`¿Estás seguro de eliminar la cama ${bed.bedNumber}?`)) {
      return;
    }

    this.adminService.deleteBed(bed.id!).subscribe({
      next: () => {
        this.loadData();
      },
      error: (error) => {
        alert(error.error?.message || 'Error al eliminar la cama');
      },
    });
  }

  getPatientsForBedSelection(): any[] {
    return this.patients;
  }

  getBedClass(bed: Bed): string {
    // Determinar la clase correcta basándose en el estado
    const bedClass = bed.isActive === false 
      ? 'unavailable' 
      : (bed.patientId && bed.patientId !== null) 
        ? 'occupied' 
        : 'available';
    
    // Log cada cama para debug
    console.log(`🛏️ ${bed.bedNumber}:`, {
      isActive: bed.isActive,
      patientId: bed.patientId,
      clase: bedClass
    });
    
    return bedClass;
  }

  getBedStatusLabel(bed: Bed): string {
    if (bed.isActive === false) {
      return 'No Disponible';
    }
    if (bed.patientId && bed.patientId !== null) {
      return 'Ocupada';
    }
    return 'Disponible';
  }
}

