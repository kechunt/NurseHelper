import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminService, Area, Bed, Patient } from '../../../services/admin.service';
import { User } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

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

  constructor(private adminService: AdminService) {}

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
    console.log('  - Patients:', `${environment.apiUrl}/patients (página admin)`);
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
      patients: this.adminService.getPatients(false).pipe(
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

          // Pacientes con assignedToId = enfermera (persistido en BD)
          const byNurseColumn = this.patients.filter((p: any) => {
            const patientId = typeof p.id === 'number' ? p.id : parseInt(p.id, 10);
            const raw = p.assignedToId ?? p.assignedTo?.id;
            const aid =
              raw == null || raw === ''
                ? NaN
                : typeof raw === 'number'
                  ? raw
                  : parseInt(String(raw), 10);
            return (
              !isNaN(patientId) &&
              !isNaN(aid) &&
              aid === nurseId &&
              p.isActive !== false
            );
          });

          // Compatibilidad: pacientes en camas del área de la enfermera (sin assignedToId previo)
          let byArea: Patient[] = [];
          if (nurseAreaId && !isNaN(nurseAreaId)) {
            const bedsInNurseArea = this.beds.filter((bed: any) => {
              const bedAreaId = typeof bed.areaId === 'number' ? bed.areaId : parseInt(bed.areaId, 10);
              return (
                !isNaN(bedAreaId) &&
                bedAreaId === nurseAreaId &&
                bed.patientId &&
                bed.isActive !== false
              );
            });
            const areaPatientIds = new Set<number>();
            bedsInNurseArea.forEach((bed: any) => {
              const pid =
                typeof bed.patientId === 'number'
                  ? bed.patientId
                  : parseInt(String(bed.patientId), 10);
              if (!isNaN(pid)) {
                areaPatientIds.add(pid);
              }
            });
            byArea = this.patients.filter((p: any) => {
              const patientId = typeof p.id === 'number' ? p.id : parseInt(p.id, 10);
              const raw = p.assignedToId ?? p.assignedTo?.id;
              const hasNurse =
                raw != null &&
                String(raw) !== '' &&
                !isNaN(parseInt(String(raw), 10));
              return (
                !isNaN(patientId) &&
                areaPatientIds.has(patientId) &&
                p.isActive !== false &&
                !hasNurse
              );
            });
          }

          const merged = new Map<number, Patient>();
          byNurseColumn.forEach((p) => {
            if (p.id != null) merged.set(Number(p.id), p);
          });
          byArea.forEach((p) => {
            if (p.id != null) merged.set(Number(p.id), p);
          });
          const assignedPatients = Array.from(merged.values());

          console.log(
            `  👩‍⚕️ ${nurse.firstName} ${nurse.lastName} (ID: ${nurseId}): asignados por BD=${byNurseColumn.length}, por área=${byArea.length}, total=${assignedPatients.length}`
          );

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
    
    const assignedIds = new Set(
      this.selectedNursePatients
        .map((p) => (typeof p.id === 'number' ? p.id : parseInt(String(p.id), 10)))
        .filter((id) => !isNaN(id))
    );
    const nurseIdNum =
      typeof nurse.id === 'number' ? nurse.id : parseInt(String(nurse.id), 10);

    this.availablePatients = (this.patients || []).filter((p: any) => {
      const patientId = typeof p.id === 'number' ? p.id : parseInt(String(p.id), 10);
      if (!patientId || isNaN(patientId) || assignedIds.has(patientId)) {
        return false;
      }
      if (p.isActive === false || p.isActive === 0) {
        return false;
      }
      const aidRaw = p.assignedToId ?? p.assignedTo?.id;
      if (aidRaw != null && String(aidRaw) !== '') {
        const aid = typeof aidRaw === 'number' ? aidRaw : parseInt(String(aidRaw), 10);
        if (!isNaN(aid) && aid === nurseIdNum) {
          return false;
        }
      }
      return true;
    });

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
      return;
    }
    const nurseId =
      typeof this.selectedNurse.id === 'number'
        ? this.selectedNurse.id
        : parseInt(String(this.selectedNurse.id), 10);
    const patientId =
      typeof patient.id === 'number' ? patient.id : parseInt(String(patient.id), 10);
    const rawAid = (patient as any).assignedToId ?? (patient as any).assignedTo?.id;
    const currentAid =
      rawAid == null || rawAid === ''
        ? NaN
        : typeof rawAid === 'number'
          ? rawAid
          : parseInt(String(rawAid), 10);
    if (!isNaN(currentAid) && currentAid === nurseId) {
      alert('Este paciente ya está asignado a esta enfermera.');
      return;
    }
    if (
      this.selectedNurse.maxPatients &&
      this.selectedNursePatients.length >= this.selectedNurse.maxPatients
    ) {
      alert(
        `La enfermera ya tiene el máximo de pacientes asignados (${this.selectedNurse.maxPatients})`
      );
      return;
    }

    this.adminService.updatePatient(patientId, { assignedToId: nurseId }).subscribe({
      next: () => {
        alert('Paciente asignado a la enfermera correctamente.');
        this.loadData();
        this.closePatientsModal();
      },
      error: (error) => {
        const msg = error.error?.message || error.message || 'Error desconocido';
        alert(`No se pudo guardar la asignación: ${msg}`);
      },
    });
  }

  removePatientFromNurse(patient: Patient, nurse?: NurseWithPatients): void {
    const targetNurse = nurse || this.selectedNurse;
    if (!targetNurse?.id || !patient.id) {
      return;
    }

    if (
      !confirm(
        `¿Quitar a ${patient.firstName} ${patient.lastName} como paciente asignado a ${targetNurse.firstName} ${targetNurse.lastName}?`
      )
    ) {
      return;
    }

    const nurseId =
      typeof targetNurse.id === 'number' ? targetNurse.id : parseInt(String(targetNurse.id), 10);
    const patientId =
      typeof patient.id === 'number' ? patient.id : parseInt(String(patient.id), 10);
    const rawAid = (patient as any).assignedToId ?? (patient as any).assignedTo?.id;
    const currentAid =
      rawAid == null || rawAid === ''
        ? NaN
        : typeof rawAid === 'number'
          ? rawAid
          : parseInt(String(rawAid), 10);

    if (!isNaN(currentAid) && currentAid === nurseId) {
      this.adminService.updatePatient(patientId, { assignedToId: null }).subscribe({
        next: () => {
          alert('Paciente desasignado de la enfermera.');
          this.loadData();
          if (this.showPatientsModal) {
            this.closePatientsModal();
          }
        },
        error: (error) => {
          const msg = error.error?.message || error.message || 'Error desconocido';
          alert(`Error al quitar la asignación: ${msg}`);
        },
      });
      return;
    }

    const patientBed = this.beds.find((bed: any) => {
      const bid =
        typeof bed.patientId === 'number'
          ? bed.patientId
          : parseInt(String(bed.patientId), 10);
      return bid === patientId;
    });

    const nurseAreaId = targetNurse.assignedAreaId
      ? typeof targetNurse.assignedAreaId === 'number'
        ? targetNurse.assignedAreaId
        : parseInt(String(targetNurse.assignedAreaId), 10)
      : NaN;

    if (!patientBed || isNaN(nurseAreaId)) {
      alert('No hay cama en el área de esta enfermera para liberar.');
      return;
    }

    const bedAreaId =
      typeof patientBed.areaId === 'number'
        ? patientBed.areaId
        : parseInt(String(patientBed.areaId), 10);

    if (bedAreaId !== nurseAreaId) {
      alert('Este paciente no está en el área de esta enfermera.');
      return;
    }

    this.adminService.assignPatientToBed(patientBed.id!, null).subscribe({
      next: () => {
        alert('Paciente removido del área (cama liberada).');
        this.loadData();
        if (this.showPatientsModal) {
          this.closePatientsModal();
        }
      },
      error: (error) => {
        const msg = error.error?.message || error.message || 'Error desconocido';
        alert(`Error al liberar la cama: ${msg}`);
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
