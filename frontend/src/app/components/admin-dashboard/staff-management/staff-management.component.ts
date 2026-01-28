import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminService, Area, Bed, Patient } from '../../../services/admin.service';
import { AuthService, User } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';

interface NurseWithPatients extends User {
  assignedPatients: Patient[];
  assignedPatientsCount: number;
}

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css',
})
export class StaffManagementComponent implements OnInit {
  nurses: NurseWithPatients[] = [];
  areas: Area[] = [];
  beds: Bed[] = [];
  patients: Patient[] = [];
  loading = false;
  error: string | null = null;

  // Modales
  showEditModal = false;
  showPatientsModal = false;
  
  selectedNurse: NurseWithPatients | null = null;
  selectedNursePatients: Patient[] = [];
  availablePatients: Patient[] = [];

  // Formularios
  editForm: Partial<User> = {};

  // Filtros
  searchQuery: string = '';
  selectedArea: number | null = null;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('🚀 Staff Management Component inicializado');
    console.log('🌐 API URL:', environment.apiUrl);
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.nurses = []; // Limpiar datos anteriores

    console.log('🔄 Iniciando carga de datos...');
    console.log('🌐 Endpoints que se llamarán:');
    console.log('  - Areas:', `${environment.apiUrl}/areas`);
    console.log('  - Beds:', `${environment.apiUrl}/beds`);
    console.log('  - Patients:', `${environment.apiUrl}/patients?limit=1000`);
    console.log('  - Users:', `${environment.apiUrl}/users?page=1&limit=200`);

    // Cargar datos en paralelo con manejo de errores mejorado
    forkJoin({
      areas: this.adminService.getAreas(false).pipe(
        catchError((err) => {
          console.error('Error cargando áreas:', err);
          return of([]);
        })
      ),
      beds: this.adminService.getBeds(false).pipe(
        catchError((err) => {
          console.error('Error cargando camas:', err);
          return of([]);
        })
      ),
      patients: this.http.get<any>(`${environment.apiUrl}/patients?limit=1000`).pipe(
        map((response) => {
          // Manejar respuesta paginada o array directo
          return response.items || response || [];
        }),
        catchError((err) => {
          console.error('Error cargando pacientes:', err);
          return of([]);
        })
      ),
      users: this.adminService.getUsersPaginated({ page: 1, limit: 200 }).pipe(
        catchError((err) => {
          console.error('Error cargando usuarios:', err);
          return of({ users: [], total: 0 });
        })
      ),
    }).subscribe({
      next: ({ areas, beds, patients, users }) => {
        console.log('📥 Datos recibidos RAW:', {
          areas: areas,
          beds: beds,
          patients: patients,
          users: users,
        });
        
        console.log('📥 Datos recibidos (resumen):', {
          areas: Array.isArray(areas) ? areas.length : 0,
          beds: Array.isArray(beds) ? beds.length : 0,
          patients: Array.isArray(patients) ? patients.length : 0,
          users: users.users?.length || 0,
        });
        
        // Debug: Ver estructura de users
        if (users && users.users) {
          console.log('👥 Usuarios recibidos:', users.users.map((u: any) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            role: u.role,
            isActive: u.isActive
          })));
        }

        // Procesar áreas - USAR LAS MISMAS ÁREAS QUE NURSE-DASHBOARD
        // Las áreas vienen de la misma BD y API, solo filtrar activas
        this.areas = Array.isArray(areas) ? areas.filter((a: any) => a.isActive !== false) : [];
        
        console.log('📍 Áreas cargadas (mismas que nurse-dashboard):', this.areas.map((a: any) => ({
          id: a.id,
          name: a.name,
          isActive: a.isActive
        })));
        
        // Procesar camas
        this.beds = Array.isArray(beds) ? beds : [];
        
        // Procesar pacientes - asegurar que sean arrays y tengan la estructura correcta
        const processedPatients = Array.isArray(patients) 
          ? patients.filter((p: any) => p.isActive !== false)
          : [];
        
        // Normalizar pacientes para asegurar que tengan id numérico
        this.patients = processedPatients.map((p: any) => ({
          ...p,
          id: p.id ? (typeof p.id === 'number' ? p.id : parseInt(p.id)) : null,
        })).filter((p: any) => p.id !== null);

        // Filtrar solo enfermeras activas
        const allUsers = Array.isArray(users.users) ? users.users : (Array.isArray(users) ? users : []);
        console.log('👥 Total usuarios recibidos:', allUsers.length);
        
        const allNurses = allUsers.filter((u: any) => {
          const isNurse = u.role === 'nurse';
          const isActive = u.isActive !== false && u.isActive !== 0;
          console.log(`  - ${u.firstName} ${u.lastName}: role=${u.role}, isActive=${u.isActive}, esEnfermera=${isNurse}, activo=${isActive}`);
          return isNurse && isActive;
        });
        
        console.log('🔍 Enfermeras encontradas:', allNurses.length);
        console.log('🔍 Enfermeras detalle:', allNurses.map((n: any) => ({
          id: n.id,
          name: `${n.firstName} ${n.lastName}`,
          role: n.role,
          isActive: n.isActive,
          maxPatients: n.maxPatients,
          assignedAreaId: n.assignedAreaId
        })));
        console.log('🔍 Pacientes encontrados:', this.patients.length);
        console.log('🔍 Camas encontradas:', this.beds.length);
        
        // Procesar cada enfermera y obtener sus pacientes asignados
        // USAR LA MISMA LÓGICA QUE NURSE-DASHBOARD: relación por área
        this.nurses = allNurses.map((nurse: any) => {
          // Normalizar ID de enfermera
          const nurseId = typeof nurse.id === 'number' ? nurse.id : parseInt(nurse.id);
          const nurseAreaId = nurse.assignedAreaId 
            ? (typeof nurse.assignedAreaId === 'number' 
                ? nurse.assignedAreaId 
                : parseInt(String(nurse.assignedAreaId)))
            : null;
          
          if (isNaN(nurseId)) {
            console.warn(`⚠️ Enfermera sin ID válido:`, nurse);
            return {
              ...nurse,
              assignedPatients: [],
              assignedPatientsCount: 0,
            } as NurseWithPatients;
          }

          // LÓGICA IGUAL QUE NURSE-DASHBOARD: pacientes asignados por área
          // Si la enfermera tiene un área asignada, buscar pacientes en camas de esa área
          let assignedPatients: Patient[] = [];
          
          if (nurseAreaId && !isNaN(nurseAreaId)) {
            // Buscar camas del área de la enfermera que tienen pacientes
            const bedsInNurseArea = this.beds.filter((bed: any) => {
              const bedAreaId = typeof bed.areaId === 'number' ? bed.areaId : parseInt(bed.areaId);
              return !isNaN(bedAreaId) && bedAreaId === nurseAreaId && bed.patientId && bed.isActive !== false;
            });
            
            console.log(`  🛏️ Camas en área ${nurseAreaId} para ${nurse.firstName} ${nurse.lastName}:`, bedsInNurseArea.length);
            
            // Obtener IDs de pacientes de esas camas
            const assignedPatientIds = new Set(
              bedsInNurseArea
                .map((bed: any) => {
                  const patientId = typeof bed.patientId === 'number' ? bed.patientId : parseInt(bed.patientId);
                  return isNaN(patientId) ? null : patientId;
                })
                .filter((id: any) => id !== null)
            );
            
            // Filtrar pacientes que están en esas camas y están activos
            assignedPatients = this.patients.filter((p: any) => {
              const patientId = typeof p.id === 'number' ? p.id : parseInt(p.id);
              return !isNaN(patientId) && assignedPatientIds.has(patientId) && p.isActive !== false;
            });
            
            console.log(`  👩‍⚕️ ${nurse.firstName} ${nurse.lastName} (ID: ${nurseId}, Área: ${nurseAreaId}):`, {
              camasEnArea: bedsInNurseArea.length,
              patientIds: Array.from(assignedPatientIds),
              pacientes: assignedPatients.length,
              pacientesDetalle: assignedPatients.map((p: any) => `${p.firstName} ${p.lastName} (ID: ${p.id})`),
            });
          } else {
            console.log(`  ⚠️ ${nurse.firstName} ${nurse.lastName} no tiene área asignada`);
          }

          return {
            ...nurse,
            id: nurseId,
            assignedAreaId: nurseAreaId,
            assignedPatients: assignedPatients || [],
            assignedPatientsCount: assignedPatients.length,
          } as NurseWithPatients;
        });

        console.log('✅ Datos procesados exitosamente:', {
          enfermeras: this.nurses.length,
          areas: this.areas.length,
          camas: this.beds.length,
          pacientes: this.patients.length,
        });
        
        // Log detallado de cada enfermera procesada
        this.nurses.forEach((nurse, index) => {
          console.log(`  ${index + 1}. ${nurse.firstName} ${nurse.lastName} (ID: ${nurse.id}):`, {
            area: this.getAreaName(nurse.assignedAreaId),
            capacidad: `${nurse.assignedPatientsCount}/${nurse.maxPatients || 0}`,
            pacientes: nurse.assignedPatients.map((p: any) => `${p.firstName} ${p.lastName}`),
          });
        });

        // Si no hay enfermeras, mostrar mensaje detallado
        if (this.nurses.length === 0) {
          console.warn('⚠️ No se encontraron enfermeras. Verifica:');
          console.warn('  - Total usuarios recibidos:', allUsers.length);
          console.warn('  - Usuarios por rol:', {
            admin: allUsers.filter((u: any) => u.role === 'admin').length,
            nurse: allUsers.filter((u: any) => u.role === 'nurse').length,
            supervisor: allUsers.filter((u: any) => u.role === 'supervisor').length,
            pharmacy: allUsers.filter((u: any) => u.role === 'pharmacy').length,
          });
          console.warn('  - Enfermeras inactivas:', allUsers.filter((u: any) => u.role === 'nurse' && (u.isActive === false || u.isActive === 0)).length);
          console.warn('  - Que haya usuarios con role="nurse"');
          console.warn('  - Que los usuarios estén activos (isActive=true)');
          console.warn('  - Que la respuesta del backend tenga el formato correcto');
          
          // Mostrar error más descriptivo
          if (allUsers.length === 0) {
            this.error = 'No se pudieron cargar los usuarios. Verifica la conexión con el backend.';
          } else {
            const nursesFound = allUsers.filter((u: any) => u.role === 'nurse').length;
            if (nursesFound === 0) {
              this.error = 'No hay usuarios con rol "enfermera" en la base de datos.';
            } else {
              this.error = `Se encontraron ${nursesFound} enfermera(s), pero ninguna está activa.`;
            }
          }
        } else {
          this.error = null; // Limpiar error si hay enfermeras
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando datos:', error);
        this.error = 'Error al cargar los datos. Por favor, recarga la página.';
        this.loading = false;
      },
    });
  }

  getFilteredNurses(): NurseWithPatients[] {
    if (!Array.isArray(this.nurses)) {
      console.warn('⚠️ nurses no es un array:', this.nurses);
      return [];
    }

    let filtered = [...this.nurses];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          (n.firstName || '').toLowerCase().includes(query) ||
          (n.lastName || '').toLowerCase().includes(query) ||
          (n.username || '').toLowerCase().includes(query) ||
          (n.email || '').toLowerCase().includes(query)
      );
    }

    if (this.selectedArea !== null && this.selectedArea !== undefined) {
      filtered = filtered.filter((n) => n.assignedAreaId === this.selectedArea);
    }

    return filtered;
  }

  // ========== GESTIÓN DE ENFERMERA ==========
  openEditModal(nurse: NurseWithPatients): void {
    this.selectedNurse = nurse;
    this.editForm = {
      firstName: nurse.firstName,
      lastName: nurse.lastName,
      email: nurse.email,
      username: nurse.username,
      maxPatients: nurse.maxPatients || 0,
      assignedAreaId: nurse.assignedAreaId || null,
      isActive: nurse.isActive,
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedNurse = null;
    this.editForm = {};
  }

  saveNurse(): void {
    if (!this.selectedNurse?.id) return;

    // Validar que el área sea válida si está asignada
    if (this.editForm.assignedAreaId !== null && this.editForm.assignedAreaId !== undefined) {
      const areaId = typeof this.editForm.assignedAreaId === 'number' 
        ? this.editForm.assignedAreaId 
        : parseInt(String(this.editForm.assignedAreaId));
      
      if (isNaN(areaId)) {
        alert('⚠️ El área seleccionada no es válida');
        return;
      }
      
      // Verificar que el área existe
      const areaExists = this.areas.some((a) => a.id === areaId);
      if (!areaExists) {
        alert('⚠️ El área seleccionada no existe');
        return;
      }
      
      this.editForm.assignedAreaId = areaId;
    }

    console.log('💾 Guardando enfermera:', {
      id: this.selectedNurse.id,
      formData: this.editForm
    });

    this.adminService.updateUser(this.selectedNurse.id, this.editForm).subscribe({
      next: () => {
        console.log('✅ Enfermera actualizada exitosamente');
        alert('✅ Enfermera actualizada exitosamente');
        this.closeEditModal();
        this.loadData(); // Recargar para actualizar todo (incluyendo pacientes asignados)
      },
      error: (error) => {
        console.error('Error actualizando enfermera:', error);
        alert(`Error al actualizar la enfermera: ${error.error?.message || error.message || 'Error desconocido'}`);
      },
    });
  }

  // ========== GESTIÓN DE PACIENTES ==========
  openPatientsModal(nurse: NurseWithPatients): void {
    this.selectedNurse = nurse;
    this.selectedNursePatients = [...(nurse.assignedPatients || [])];
    
    // Obtener pacientes disponibles (no están en el área de esta enfermera)
    const nurseAreaId = nurse.assignedAreaId 
      ? (typeof nurse.assignedAreaId === 'number' 
          ? nurse.assignedAreaId 
          : parseInt(String(nurse.assignedAreaId)))
      : null;
    
    if (nurseAreaId && !isNaN(nurseAreaId)) {
      // Pacientes que están en otras áreas o sin cama
      const assignedIds = new Set(this.selectedNursePatients.map((p) => p.id).filter((id) => id !== null && id !== undefined));
      
      this.availablePatients = (this.patients || []).filter((p: any) => {
        const patientId = typeof p.id === 'number' ? p.id : parseInt(p.id);
        if (!patientId || assignedIds.has(patientId)) return false;
        
        // Verificar si el paciente está en otra área
        const patientBed = this.beds.find((bed: any) => bed.patientId === patientId);
        if (!patientBed) return true; // Paciente sin cama, disponible
        
        const bedAreaId = typeof patientBed.areaId === 'number' ? patientBed.areaId : parseInt(patientBed.areaId);
        return bedAreaId !== nurseAreaId; // Paciente en otra área
      });
    } else {
      // Si la enfermera no tiene área, mostrar todos los pacientes disponibles
      const assignedIds = new Set(this.selectedNursePatients.map((p) => p.id).filter((id) => id !== null && id !== undefined));
      this.availablePatients = (this.patients || []).filter((p) => p.id && !assignedIds.has(p.id));
    }
    
    this.showPatientsModal = true;
  }

  closePatientsModal(): void {
    this.showPatientsModal = false;
    this.selectedNurse = null;
    this.selectedNursePatients = [];
    this.availablePatients = [];
  }

  assignPatientToNurse(patient: Patient): void {
    if (!this.selectedNurse?.id || !patient.id) {
      console.error('❌ Datos inválidos:', { nurseId: this.selectedNurse?.id, patientId: patient.id });
      return;
    }

    console.log('🔄 Iniciando asignación de paciente:', {
      paciente: `${patient.firstName} ${patient.lastName} (ID: ${patient.id})`,
      enfermera: `${this.selectedNurse.firstName} ${this.selectedNurse.lastName} (ID: ${this.selectedNurse.id})`,
      areaEnfermera: this.selectedNurse.assignedAreaId
    });

    // Verificar que la enfermera tenga un área asignada
    if (!this.selectedNurse.assignedAreaId) {
      alert('⚠️ La enfermera debe tener un área asignada antes de asignar pacientes. Por favor, edita la enfermera y asigna un área primero.');
      return;
    }

    // Verificar capacidad máxima
    if (
      this.selectedNurse.maxPatients &&
      this.selectedNursePatients.length >= this.selectedNurse.maxPatients
    ) {
      alert(
        `La enfermera ya tiene el máximo de pacientes asignados (${this.selectedNurse.maxPatients})`
      );
      return;
    }

    // Normalizar área de la enfermera
    const nurseAreaId = this.selectedNurse.assignedAreaId 
      ? (typeof this.selectedNurse.assignedAreaId === 'number' 
          ? this.selectedNurse.assignedAreaId 
          : parseInt(String(this.selectedNurse.assignedAreaId)))
      : null;
    
    if (!nurseAreaId || isNaN(nurseAreaId)) {
      console.error('❌ Área de enfermera inválida:', this.selectedNurse.assignedAreaId);
      alert('⚠️ La enfermera no tiene un área válida asignada');
      return;
    }

    console.log('📍 Área de enfermera normalizada:', nurseAreaId);

    // LÓGICA IGUAL QUE NURSE-DASHBOARD: asignar paciente moviendo su cama al área de la enfermera
    // Buscar la cama actual del paciente
    const patientBed = this.beds.find((bed: any) => {
      const bedPatientId = typeof bed.patientId === 'number' ? bed.patientId : parseInt(String(bed.patientId));
      const patientIdNum = typeof patient.id === 'number' ? patient.id : parseInt(String(patient.id));
      return bedPatientId === patientIdNum;
    });
    
    console.log('🛏️ Cama del paciente encontrada:', patientBed ? {
      id: patientBed.id,
      bedNumber: patientBed.bedNumber,
      areaId: patientBed.areaId,
      patientId: patientBed.patientId
    } : 'No tiene cama');
    
    if (patientBed) {
      // El paciente ya tiene una cama
      const currentBedAreaId = typeof patientBed.areaId === 'number' 
        ? patientBed.areaId 
        : parseInt(String(patientBed.areaId));
      
      console.log('🔄 Paciente tiene cama. Comparando áreas:', {
        areaCama: currentBedAreaId,
        areaEnfermera: nurseAreaId
      });
      
      if (currentBedAreaId === nurseAreaId) {
        alert('✅ Este paciente ya está asignado a esta enfermera (está en el mismo área)');
        return;
      }
      
      // Confirmar reasignación si está en otra área
      if (
        !confirm(
          `Este paciente está en otra área. ¿Deseas moverlo al área de ${this.selectedNurse.firstName} ${this.selectedNurse.lastName}?`
        )
      ) {
        return;
      }
      
      console.log('🔄 Moviendo cama al área de la enfermera:', {
        bedId: patientBed.id,
        newAreaId: nurseAreaId
      });
      
      // Mover la cama al área de la enfermera
      this.adminService.updateBed(patientBed.id!, {
        areaId: nurseAreaId
      }).subscribe({
        next: (response) => {
          console.log('✅ Cama actualizada exitosamente:', response);
          alert('✅ Paciente reasignado exitosamente');
          this.loadData();
          this.closePatientsModal();
        },
        error: (error) => {
          console.error('❌ Error reasignando paciente:', error);
          console.error('Detalles del error:', {
            status: error.status,
            message: error.error?.message || error.message,
            error: error.error
          });
          alert(`Error al reasignar el paciente: ${error.error?.message || error.message || 'Error desconocido'}`);
        },
      });
    } else {
      // El paciente no tiene cama, buscar una cama disponible en el área de la enfermera
      console.log('🔍 Buscando camas disponibles en área:', nurseAreaId);
      
      const availableBeds = this.beds.filter((bed: any) => {
        const bedAreaId = typeof bed.areaId === 'number' 
          ? bed.areaId 
          : parseInt(String(bed.areaId));
        const hasPatient = bed.patientId !== null && bed.patientId !== undefined;
        const isActive = bed.isActive !== false;
        
        const isAvailable = !isNaN(bedAreaId) && bedAreaId === nurseAreaId && !hasPatient && isActive;
        
        if (isAvailable) {
          console.log('  ✅ Cama disponible encontrada:', {
            id: bed.id,
            bedNumber: bed.bedNumber,
            areaId: bed.areaId
          });
        }
        
        return isAvailable;
      });
      
      console.log(`📊 Camas disponibles encontradas: ${availableBeds.length}`);
      
      if (availableBeds.length === 0) {
        alert('⚠️ No hay camas disponibles en el área de la enfermera. Por favor, crea una cama primero.');
        return;
      }
      
      // Asignar paciente a la primera cama disponible
      const bedToAssign = availableBeds[0];
      console.log('🔄 Asignando paciente a cama:', {
        bedId: bedToAssign.id,
        bedNumber: bedToAssign.bedNumber,
        patientId: patient.id,
        areaId: nurseAreaId
      });
      
      this.adminService.assignPatientToBed(bedToAssign.id!, patient.id).subscribe({
        next: (response) => {
          console.log('✅ Paciente asignado exitosamente:', response);
          alert('✅ Paciente asignado exitosamente');
          this.loadData();
          this.closePatientsModal();
        },
        error: (error) => {
          console.error('❌ Error asignando paciente:', error);
          console.error('Detalles del error:', {
            status: error.status,
            message: error.error?.message || error.message,
            error: error.error,
            bedId: bedToAssign.id,
            patientId: patient.id
          });
          alert(`Error al asignar el paciente: ${error.error?.message || error.message || 'Error desconocido'}`);
        },
      });
    }
  }

  removePatientFromNurse(patient: Patient, nurse?: NurseWithPatients): void {
    const targetNurse = nurse || this.selectedNurse;
    if (!targetNurse?.id || !patient.id) return;

    if (!confirm(`¿Estás seguro de que deseas remover a ${patient.firstName} ${patient.lastName} del área de ${targetNurse.firstName} ${targetNurse.lastName}? Esto liberará la cama del paciente.`)) {
      return;
    }

    // LÓGICA IGUAL QUE NURSE-DASHBOARD: remover paciente liberando su cama
    const patientBed = this.beds.find((bed: any) => bed.patientId === patient.id);
    
    if (!patientBed) {
      alert('⚠️ No se encontró la cama del paciente');
      return;
    }

    // Verificar que el paciente esté en el área de la enfermera
    const bedAreaId = typeof patientBed.areaId === 'number' 
      ? patientBed.areaId 
      : parseInt(String(patientBed.areaId));
    const nurseAreaId = targetNurse.assignedAreaId 
      ? (typeof targetNurse.assignedAreaId === 'number' 
          ? targetNurse.assignedAreaId 
          : parseInt(String(targetNurse.assignedAreaId)))
      : null;
    
    if (!nurseAreaId || bedAreaId !== nurseAreaId) {
      alert('⚠️ Este paciente no está en el área de esta enfermera');
      return;
    }

    // Liberar la cama del paciente
    this.adminService.assignPatientToBed(patientBed.id!, null).subscribe({
      next: () => {
        alert('✅ Paciente removido exitosamente (cama liberada)');
        this.loadData();
        if (this.showPatientsModal) {
          this.closePatientsModal();
        }
      },
      error: (error) => {
        console.error('Error removiendo paciente:', error);
        alert('Error al remover el paciente');
      },
    });
  }

  // ========== HELPERS ==========
  getAreaName(areaId: number | null | undefined): string {
    if (!areaId) return 'Sin área asignada';
    const area = this.areas.find((a) => a.id === areaId);
    return area?.name || 'Área desconocida';
  }

  getPatientBed(patientId: number | undefined): string {
    if (!patientId) return 'Sin cama';
    const bed = this.beds.find((b) => b.patientId === patientId);
    return bed?.bedNumber || 'Sin cama';
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedArea = null;
  }

  trackByNurseId(index: number, nurse: NurseWithPatients): any {
    return nurse.id || index;
  }
}
