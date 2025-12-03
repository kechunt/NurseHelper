import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Patient, Area, Bed } from '../../../services/admin.service';

// Interfaces para el formulario extendido
interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  schedules: string;
  notes: string;
}

interface TreatmentRecord {
  date: string;
  time: string;
  type: string;
  nurseName: string;
  description: string;
}

interface PendingTask {
  title: string;
  type: string;
  scheduledDate: string;
  description: string;
  assignedTo: string;
  priority: string;
  completed: boolean;
}

@Component({
  selector: 'app-patients-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-management.component.html',
  styleUrl: './patients-management.component.css',
})
export class PatientsManagementComponent implements OnInit {
  // Listado de pacientes
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  loading = false;
  
  // Filtros
  searchTerm: string = '';
  selectedAreaFilter: string = '';
  selectedNurseFilter: string = '';
  selectedStatusFilter: string = '';
  selectedBedFilter: string = '';
  
  // Formulario de ingreso
  wizardForm: any = {
    firstName: '',
    lastName: '',
    identificationNumber: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    emergencyRelation: '',
    selectedAreaId: '',
    selectedBedId: ''
  };
  
  // Datos para el wizard y modal
  areas: Area[] = [];
  availableBeds: Bed[] = [];
  allBeds: Bed[] = [];
  nurses: any[] = [];
  
  // Modal de edición
  showEditModal = false;
  selectedPatient: Patient | null = null;
  activeTab: string = 'personal';
  
  // Control de secciones colapsables
  showIngresoForm = false;
  showPatientsList = true;
  
  editForm: any = {
    firstName: '',
    lastName: '',
    identificationNumber: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    emergencyRelation: '',
    areaId: '',
    bedId: '',
    medicalObservations: '',
    specialNeeds: '',
    allergies: '',
    medicalHistory: '',
    generalObservations: '',
    medications: [] as Medication[],
    treatmentHistory: [] as TreatmentRecord[],
    pendingTasks: [] as PendingTask[]
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadPatients();
    this.loadAreas();
    this.loadBeds();
    this.loadNurses();
  }

  // ========== CARGA DE DATOS ==========
  loadPatients(): void {
    this.loading = true;
    this.adminService.getPatients().subscribe({
      next: (patients) => {
        // Enriquecer datos de pacientes con información de área y cama
        this.patients = patients.map(patient => {
          if (patient.bed) {
            const bed = patient.bed;
            const area = this.areas.find(a => a.id === bed.areaId);
            return {
              ...patient,
              areaId: bed.areaId,
              bedId: bed.id,
              areaName: area?.name || 'Sin área',
              bedNumber: bed.bedNumber
            };
          }
          return patient;
        });
        this.filteredPatients = this.patients;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading patients:', error);
        this.loading = false;
      },
    });
  }

  loadAreas(): void {
    this.adminService.getAreas().subscribe({
      next: (areas) => {
        this.areas = areas.filter(a => a.isActive);
      },
      error: (error) => {
        console.error('Error loading areas:', error);
        // Fallback a áreas de ejemplo
        this.areas = [
          { id: 1, name: 'Cuidados Intensivos', description: 'UCI - Pacientes críticos' },
          { id: 2, name: 'Medicina General', description: 'Área de medicina general' },
          { id: 3, name: 'Geriatría', description: 'Cuidados para adultos mayores' },
          { id: 4, name: 'Rehabilitación', description: 'Área de fisioterapia y rehabilitación' },
        ];
      },
    });
  }

  loadBeds(): void {
    this.adminService.getBeds().subscribe({
      next: (beds) => {
        this.allBeds = beds;
      },
      error: (error) => {
        console.error('Error loading beds:', error);
      },
    });
  }

  loadNurses(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.nurses = users.filter(u => u.role === 'nurse' && u.isActive);
      },
      error: (error) => {
        console.error('Error loading nurses:', error);
      },
    });
  }

  // ========== FILTROS Y BÚSQUEDA ==========
  filterPatients(): void {
    this.filteredPatients = this.patients.filter(patient => {
      // Filtro de búsqueda por nombre o cédula
      const matchesSearch = !this.searchTerm || 
        `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (patient.identificationNumber && patient.identificationNumber.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      // Filtro por área
      const matchesArea = !this.selectedAreaFilter || 
        patient.areaId?.toString() === this.selectedAreaFilter;
      
      // Filtro por enfermera (basado en tareas asignadas - por ahora solo verificamos que tenga tareas)
      const matchesNurse = !this.selectedNurseFilter || this.patientHasNurse(patient, this.selectedNurseFilter);
      
      // Filtro por estado (activo/inactivo)
      const matchesStatus = !this.selectedStatusFilter ||
        (this.selectedStatusFilter === 'active' && patient.isActive) ||
        (this.selectedStatusFilter === 'inactive' && !patient.isActive);
      
      // Filtro por asignación de cama
      const matchesBed = !this.selectedBedFilter ||
        (this.selectedBedFilter === 'assigned' && patient.bedId) ||
        (this.selectedBedFilter === 'unassigned' && !patient.bedId);
      
      return matchesSearch && matchesArea && matchesNurse && matchesStatus && matchesBed;
    });
  }

  patientHasNurse(patient: Patient, nurseId: string): boolean {
    // Verificar si el paciente tiene tareas asignadas a esta enfermera
    try {
      if (patient.pendingTasks) {
        const tasks = typeof patient.pendingTasks === 'string' 
          ? JSON.parse(patient.pendingTasks) 
          : patient.pendingTasks;
        
        if (Array.isArray(tasks)) {
          const nurse = this.nurses.find(n => n.id?.toString() === nurseId);
          if (nurse) {
            const nurseName = `${nurse.firstName} ${nurse.lastName}`;
            return tasks.some((task: any) => task.assignedTo === nurseName);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing pending tasks:', error);
    }
    return false;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedAreaFilter = '';
    this.selectedNurseFilter = '';
    this.selectedStatusFilter = '';
    this.selectedBedFilter = '';
    this.filterPatients();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedAreaFilter || this.selectedNurseFilter || 
              this.selectedStatusFilter || this.selectedBedFilter);
  }

  // ========== FORMULARIO DE INGRESO ==========
  resetForm(): void {
    this.wizardForm = {
      firstName: '',
      lastName: '',
      identificationNumber: '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
      emergencyRelation: '',
      selectedAreaId: '',
      selectedBedId: ''
    };
    this.availableBeds = [];
  }

  onAreaChangeForm(): void {
    const areaId = parseInt(this.wizardForm.selectedAreaId);
    if (areaId) {
      this.loadBedsForArea(areaId);
    } else {
      this.availableBeds = [];
    }
    this.wizardForm.selectedBedId = '';
  }

  loadBedsForArea(areaId: number): void {
    this.adminService.getBedsByArea(areaId).subscribe({
      next: (beds) => {
        this.availableBeds = beds.filter(bed => !bed.patientId && bed.isActive);
      },
      error: (error) => {
        console.error('Error loading beds:', error);
        this.availableBeds = [];
      },
    });
  }

  quickSavePatient(): void {
    // Validar campos obligatorios
    if (!this.wizardForm.firstName || !this.wizardForm.lastName || 
        !this.wizardForm.identificationNumber || !this.wizardForm.dateOfBirth ||
        !this.wizardForm.emergencyContact || !this.wizardForm.emergencyPhone ||
        !this.wizardForm.selectedAreaId) {
      alert('⚠️ Por favor complete todos los campos obligatorios (*) y seleccione un área');
      return;
    }

    // Preparar datos del paciente
    const patientData: any = {
      firstName: this.wizardForm.firstName,
      lastName: this.wizardForm.lastName,
      identificationNumber: this.wizardForm.identificationNumber,
      dateOfBirth: this.wizardForm.dateOfBirth,
      gender: this.wizardForm.gender,
      phone: this.wizardForm.phone,
      address: this.wizardForm.address,
      emergencyContact: this.wizardForm.emergencyContact,
      emergencyPhone: this.wizardForm.emergencyPhone,
      emergencyRelation: this.wizardForm.emergencyRelation,
      isActive: true,
    };

    // Crear el paciente
    this.adminService.createPatient(patientData).subscribe({
      next: (response: any) => {
        const patientId = response.patient?.id || response.id;
        
        // Determinar qué cama asignar
        let bedIdToAssign = this.wizardForm.selectedBedId;
        
        // Si se seleccionó un área pero no una cama específica, asignar la primera cama disponible
        if (!bedIdToAssign && this.wizardForm.selectedAreaId && this.availableBeds.length > 0) {
          bedIdToAssign = this.availableBeds[0].id?.toString();
        }
        
        // Si hay una cama para asignar, asignar el paciente
        if (bedIdToAssign && patientId) {
          this.adminService.assignPatientToBed(parseInt(bedIdToAssign), patientId).subscribe({
            next: () => {
              alert(`✅ Paciente ${this.wizardForm.firstName} ${this.wizardForm.lastName} ingresado exitosamente`);
              this.resetForm();
              this.loadPatients();
              this.loadBeds();
            },
            error: (error) => {
              console.error('Error assigning bed:', error);
              alert('✅ Paciente creado pero sin cama asignada. Puede asignarla después.');
              this.resetForm();
              this.loadPatients();
            },
          });
        } else if (this.wizardForm.selectedAreaId && this.availableBeds.length === 0) {
          alert(`⚠️ Paciente ${this.wizardForm.firstName} ${this.wizardForm.lastName} creado, pero no hay camas disponibles en el área seleccionada. Puede asignar una cama después.`);
          this.resetForm();
          this.loadPatients();
        } else {
          alert(`✅ Paciente ${this.wizardForm.firstName} ${this.wizardForm.lastName} ingresado exitosamente (sin cama asignada)`);
          this.resetForm();
          this.loadPatients();
        }
      },
      error: (error) => {
        console.error('Error creating patient:', error);
        alert(error.error?.message || 'Error al crear el paciente');
      },
    });
  }

  // ========== MODAL DE EDICIÓN ==========
  openEditModal(patient: Patient): void {
    this.selectedPatient = patient;
    this.activeTab = 'personal';
    
    this.editForm = {
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      identificationNumber: patient.identificationNumber || '',
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
      gender: patient.gender || '',
      phone: patient.phone || '',
      address: patient.address || '',
      emergencyContact: patient.emergencyContact || '',
      emergencyPhone: patient.emergencyPhone || '',
      emergencyRelation: patient.emergencyRelation || '',
      areaId: patient.areaId || '',
      bedId: patient.bedId || '',
      medicalObservations: patient.medicalObservations || '',
      specialNeeds: patient.specialNeeds || '',
      allergies: patient.allergies || '',
      medicalHistory: patient.medicalHistory || '',
      generalObservations: patient.generalObservations || '',
      medications: this.loadMedications(patient),
      treatmentHistory: this.loadTreatmentHistory(patient),
      pendingTasks: this.loadPendingTasks(patient)
    };
    
    // Cargar camas disponibles del área seleccionada
    if (this.editForm.areaId) {
      this.loadBedsForAreaEdit(this.editForm.areaId);
    }
    
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedPatient = null;
  }

  loadBedsForAreaEdit(areaId: number): void {
    this.adminService.getBedsByArea(areaId).subscribe({
      next: (beds) => {
        // Incluir la cama actual del paciente y las camas disponibles
        this.availableBeds = beds.filter(bed => 
          !bed.patientId || bed.id === this.editForm.bedId
        );
      },
      error: (error) => {
        console.error('Error loading beds:', error);
      },
    });
  }

  onAreaChange(event: any): void {
    const areaId = event.target.value;
    if (areaId) {
      this.loadBedsForAreaEdit(parseInt(areaId));
      this.editForm.bedId = '';
    } else {
      this.availableBeds = [];
      this.editForm.bedId = '';
    }
  }

  savePatientChanges(): void {
    if (!this.selectedPatient?.id) return;

    // Preparar datos para actualizar
    const updateData: any = {
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      identificationNumber: this.editForm.identificationNumber,
      dateOfBirth: this.editForm.dateOfBirth,
      gender: this.editForm.gender,
      phone: this.editForm.phone,
      address: this.editForm.address,
      emergencyContact: this.editForm.emergencyContact,
      emergencyPhone: this.editForm.emergencyPhone,
      emergencyRelation: this.editForm.emergencyRelation,
      medicalObservations: this.editForm.medicalObservations,
      specialNeeds: this.editForm.specialNeeds,
      allergies: this.editForm.allergies,
      medicalHistory: this.editForm.medicalHistory,
      generalObservations: this.editForm.generalObservations,
      medications: JSON.stringify(this.editForm.medications),
      treatmentHistory: JSON.stringify(this.editForm.treatmentHistory),
      pendingTasks: JSON.stringify(this.editForm.pendingTasks),
    };

    // Actualizar el paciente
    this.adminService.updatePatient(this.selectedPatient.id, updateData).subscribe({
      next: () => {
        // Si cambió la cama, actualizar asignación
        const oldBedId = this.selectedPatient?.bedId;
        const newBedId = this.editForm.bedId;
        
        if (oldBedId !== newBedId) {
          // Primero liberar la cama anterior si existe
          if (oldBedId) {
            this.adminService.assignPatientToBed(oldBedId, null).subscribe({
              next: () => {
                // Luego asignar la nueva cama si existe
                if (newBedId) {
                  this.adminService.assignPatientToBed(newBedId, this.selectedPatient!.id!).subscribe({
                    next: () => {
                      alert('✅ Cambios guardados exitosamente');
                      this.closeEditModal();
                      this.loadPatients();
                      this.loadBeds();
                    },
                    error: (error) => {
                      alert('Datos actualizados pero error al asignar nueva cama');
                      this.closeEditModal();
                      this.loadPatients();
                    }
                  });
                } else {
                  alert('✅ Cambios guardados exitosamente');
                  this.closeEditModal();
                  this.loadPatients();
                  this.loadBeds();
                }
              },
              error: (error) => {
                console.error('Error liberando cama anterior:', error);
              }
            });
          } else if (newBedId) {
            // Solo asignar nueva cama
            this.adminService.assignPatientToBed(newBedId, this.selectedPatient!.id!).subscribe({
              next: () => {
                alert('✅ Cambios guardados exitosamente');
                this.closeEditModal();
                this.loadPatients();
                this.loadBeds();
              },
              error: (error) => {
                alert('Datos actualizados pero error al asignar cama');
                this.closeEditModal();
                this.loadPatients();
              }
            });
          }
        } else {
          alert('✅ Cambios guardados exitosamente');
          this.closeEditModal();
          this.loadPatients();
        }
      },
      error: (error) => {
        console.error('Error updating patient:', error);
        alert(error.error?.message || 'Error al guardar los cambios');
      },
    });
  }

  // ========== MEDICAMENTOS ==========
  loadMedications(patient: Patient): Medication[] {
    try {
      if (patient.medications) {
        const parsed = typeof patient.medications === 'string' 
          ? JSON.parse(patient.medications) 
          : patient.medications;
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error parsing medications:', error);
    }
    return [];
  }

  addMedication(): void {
    this.editForm.medications.push({
      name: '',
      dosage: '',
      frequency: '',
      schedules: '',
      notes: ''
    });
  }

  removeMedication(index: number): void {
    if (confirm('¿Eliminar este medicamento?')) {
      this.editForm.medications.splice(index, 1);
    }
  }

  // ========== HISTORIAL DE TRATAMIENTOS ==========
  loadTreatmentHistory(patient: Patient): TreatmentRecord[] {
    try {
      if (patient.treatmentHistory) {
        const parsed = typeof patient.treatmentHistory === 'string' 
          ? JSON.parse(patient.treatmentHistory) 
          : patient.treatmentHistory;
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error parsing treatment history:', error);
    }
    return [];
  }

  addTreatmentRecord(): void {
    const now = new Date();
    this.editForm.treatmentHistory.unshift({
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
      type: 'Tratamiento',
      nurseName: '',
      description: ''
    });
  }

  removeTreatment(index: number): void {
    if (confirm('¿Eliminar este registro?')) {
      this.editForm.treatmentHistory.splice(index, 1);
    }
  }

  // ========== TAREAS PENDIENTES ==========
  loadPendingTasks(patient: Patient): PendingTask[] {
    try {
      if (patient.pendingTasks) {
        const parsed = typeof patient.pendingTasks === 'string' 
          ? JSON.parse(patient.pendingTasks) 
          : patient.pendingTasks;
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error parsing pending tasks:', error);
    }
    return [];
  }

  addPendingTask(): void {
    this.editForm.pendingTasks.push({
      title: 'Nueva Tarea',
      type: 'treatment',
      scheduledDate: '',
      description: '',
      assignedTo: '',
      priority: 'medium',
      completed: false
    });
  }

  removeTask(index: number): void {
    if (confirm('¿Eliminar esta tarea?')) {
      this.editForm.pendingTasks.splice(index, 1);
    }
  }

  // ========== OTRAS FUNCIONES ==========
  toggleActive(patient: Patient): void {
    if (confirm(`¿${patient.isActive ? 'Desactivar' : 'Activar'} al paciente ${patient.firstName} ${patient.lastName}?`)) {
      console.log('Cambiando estado del paciente');
      // Aquí iría la llamada al servicio
      this.loadPatients();
    }
  }

  deletePatient(patient: Patient): void {
    if (!patient.id) {
      alert('Error: No se puede eliminar el paciente (ID no válido)');
      return;
    }

    const confirmMessage = `¿Está seguro de eliminar permanentemente al paciente ${patient.firstName} ${patient.lastName}?\n\nEsta acción no se puede deshacer y eliminará todos los datos relacionados.`;
    
    if (confirm(confirmMessage)) {
      this.loading = true;
      this.adminService.deletePatient(patient.id).subscribe({
        next: () => {
          alert(`✅ Paciente ${patient.firstName} ${patient.lastName} eliminado exitosamente`);
          this.loadPatients();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al eliminar paciente:', error);
          alert(error.error?.message || 'Error al eliminar el paciente. Por favor, intente nuevamente.');
          this.loading = false;
        },
      });
    }
  }
}

