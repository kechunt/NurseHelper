import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminService, Area, Bed, Patient } from '../../../services/admin.service';
import { User } from '../../../services/auth.service';
import { ShiftsService } from '../../../services/shifts.service';
import { environment } from '../../../../environments/environment';
import { ConfirmationService } from '../../../services/confirmation.service';
import {
  adminConfirmRemovePatientAssignmentMessage,
  ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_TITLE,
  ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_YES,
} from '../admin-confirmation-copy.helpers';
import { ToastService } from '../../../services/toast.service';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { AdminToggleButtonComponent } from '../../../shared/components/admin-toggle-button/admin-toggle-button.component';
import { HeroIconComponent } from '../../../shared/components/hero-icon/hero-icon.component';

interface NurseWithPatients extends User {
  assignedPatients: Patient[];
  assignedPatientsCount: number;
  onCurrentShift?: boolean;
  currentShiftStatus?: 'present' | 'late' | 'justified' | 'missing' | 'absent' | 'unknown';
}

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableRowActionsModalComponent, AdminToggleButtonComponent, HeroIconComponent],
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css',
})
export class StaffManagementComponent implements OnInit, OnDestroy {
  nurses: NurseWithPatients[] = [];
  areas: Area[] = [];
  beds: Bed[] = [];
  patients: Patient[] = [];
  loading = false;
  error: string | null = null;

  // Modales
  showEditModal = false;
  showPatientsModal = false;
  showAssignBedModal = false;
  showChangeAreaModal = false;

  selectedNurse: NurseWithPatients | null = null;
  selectedNursePatients: Patient[] = [];
  availablePatients: Patient[] = [];
  patientPendingAssign: Patient | null = null;
  bedsForPendingAssign: Bed[] = [];
  selectedBedIdForAssign: number | null = null;
  /** Enfermera cuyo área se edita en el modal dedicado (reutiliza updateUser + misma lista de áreas que Editar). */
  changeAreaNurse: NurseWithPatients | null = null;
  changeAreaSelectedId: number | null = null;
  savingChangeArea = false;

  /** Modal rápido: asignar una enfermera al área (desde aviso de cobertura en Camas/Áreas). */
  showAssignNurseToAreaModal = false;
  assignNurseToAreaTargetAreaId: number | null = null;
  assignNurseToAreaSelectedNurseId: number | null = null;
  savingAssignNurseToArea = false;
  private assignAreaRoutePending: number | null = null;
  private assignAreaRouteSub?: Subscription;

  // Formularios
  editForm: Partial<User> = {};

  // Filtros
  searchQuery: string = '';
  /** `null` = todas; `'unassigned'` = sin área asignada; número = id de área. */
  selectedArea: number | null | 'unassigned' = null;
  selectedShiftPresenceFilter: 'all' | 'onShift' | 'offShift' = 'all';
  liveShiftName = 'Sin turno activo';
  private operationalStatusTimer: ReturnType<typeof setInterval> | null = null;
  /** Detalle expandido solo para enfermeras en turno actual (mapa id → visible). */
  nurseDetailExpanded: Record<number, boolean> = {};

  /** Paciente (+ contexto): acciones en hoja desde tablas internas. */
  staffPatientSheet:
    | { kind: 'card-assigned'; nurse: NurseWithPatients; patient: Patient }
    | { kind: 'modal-assigned'; patient: Patient }
    | { kind: 'modal-available'; patient: Patient }
    | null = null;

  constructor(
    private adminService: AdminService,
    private shiftsService: ShiftsService,
    private router: Router,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private toastService: ToastService
  ) {}

  /**
   * Normaliza `assignedAreaId` para guardar: `null` sin área, o id numérico existente en `areas`.
   * Si la selección es inválida, muestra aviso y devuelve `false`.
   */
  private parseAndValidateAssignedAreaId(raw: number | null | undefined): number | null | false {
    if (raw === null || raw === undefined || raw === ('' as any)) {
      return null;
    }
    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (isNaN(n)) {
      this.toastService.warning('El área seleccionada no es válida');
      return false;
    }
    if (!this.areas.some((a) => a.id === n)) {
      this.toastService.warning('El área seleccionada no existe');
      return false;
    }
    return n;
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private resolvePatientBedInfo(patient: any): { bedId: number | null; bedNumber: string | null } {
    const fromRelationId = this.toNumber(patient?.bed?.id);
    const fromColumnId = this.toNumber(patient?.bedId);
    const resolvedBedId = fromRelationId ?? fromColumnId;

    if (patient?.bed?.bedNumber) {
      return { bedId: resolvedBedId, bedNumber: patient.bed.bedNumber };
    }
    if (resolvedBedId) {
      const bed = this.beds.find((b: any) => this.toNumber(b.id) === resolvedBedId);
      return { bedId: resolvedBedId, bedNumber: bed?.bedNumber || null };
    }
    return { bedId: null, bedNumber: null };
  }

  /** Paciente con cama asignada en el sistema (no listar en “disponibles” para esta enfermera). */
  patientHasBedAssigned(patient: any): boolean {
    return this.resolvePatientBedInfo(patient).bedId != null;
  }

  ngOnInit(): void {
    console.log(' Staff Management Component inicializado');
    console.log(' API URL:', environment.apiUrl);
    this.assignAreaRouteSub = this.route.queryParamMap.subscribe(() => {
      this.captureAssignAreaRouteIntent();
    });
    this.captureAssignAreaRouteIntent();
    this.loadData();
    this.startOperationalStatusPolling();
  }

  ngOnDestroy(): void {
    this.assignAreaRouteSub?.unsubscribe();
    this.assignAreaRouteSub = undefined;
    if (this.operationalStatusTimer) {
      clearInterval(this.operationalStatusTimer);
      this.operationalStatusTimer = null;
    }
  }

  private captureAssignAreaRouteIntent(): void {
    const raw = this.route.snapshot.queryParamMap.get('assignAreaId');
    if (!raw) {
      return;
    }
    const id = parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      return;
    }
    this.assignAreaRoutePending = id;
    this.tryConsumeAssignAreaRouteIntent();
  }

  private stripAssignAreaQueryParam(): void {
    if (!this.route.snapshot.queryParamMap.has('assignAreaId')) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { assignAreaId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private tryConsumeAssignAreaRouteIntent(): void {
    if (this.assignAreaRoutePending == null) {
      return;
    }
    if (!this.areas.length) {
      return;
    }
    const id = this.assignAreaRoutePending;
    const exists = this.areas.some((a) => this.toNumber(a.id) === id);
    if (!exists) {
      this.assignAreaRoutePending = null;
      this.stripAssignAreaQueryParam();
      this.toastService.warning('El área indicada no existe o está inactiva.');
      return;
    }
    this.assignAreaRoutePending = null;
    this.stripAssignAreaQueryParam();
    this.openAssignNurseToAreaModal(id);
  }

  loadData(onComplete?: () => void): void {
    this.loading = true;
    this.error = null;
    this.nurses = []; // Limpiar datos anteriores

    console.log(' Iniciando carga de datos...');
    console.log(' Endpoints que se llamarán:');
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
        console.log(' Datos recibidos RAW:', {
          areas: areas,
          beds: beds,
          patients: patients,
          users: users,
        });
        
        console.log(' Datos recibidos (resumen):', {
          areas: Array.isArray(areas) ? areas.length : 0,
          beds: Array.isArray(beds) ? beds.length : 0,
          patients: Array.isArray(patients) ? patients.length : 0,
          users: users.users?.length || 0,
        });
        
        // Debug: Ver estructura de users
        if (users && users.users) {
          console.log(' Usuarios recibidos:', users.users.map((u: any) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            role: u.role,
            isActive: u.isActive
          })));
        }

        // Procesar áreas - USAR LAS MISMAS ÁREAS QUE NURSE-DASHBOARD
        // Las áreas vienen de la misma BD y API, solo filtrar activas
        this.areas = Array.isArray(areas) ? areas.filter((a: any) => a.isActive !== false) : [];
        
        console.log(' Áreas cargadas (mismas que nurse-dashboard):', this.areas.map((a: any) => ({
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
        this.patients = processedPatients
          .map((p: any) => {
            const normalizedId = this.toNumber(p.id);
            const bedInfo = this.resolvePatientBedInfo(p);
            return {
              ...p,
              id: normalizedId,
              bedId: bedInfo.bedId,
              bedNumber: bedInfo.bedNumber,
            };
          })
          .filter((p: any) => p.id !== null);

        // Filtrar solo enfermeras activas
        const allUsers = Array.isArray(users.users) ? users.users : (Array.isArray(users) ? users : []);
        console.log(' Total usuarios recibidos:', allUsers.length);
        
        const allNurses = allUsers.filter((u: any) => {
          const isNurse = u.role === 'nurse';
          const isActive = u.isActive !== false && u.isActive !== 0;
          console.log(`  - ${u.firstName} ${u.lastName}: role=${u.role}, isActive=${u.isActive}, esEnfermera=${isNurse}, activo=${isActive}`);
          return isNurse && isActive;
        });
        
        console.log(' Enfermeras encontradas:', allNurses.length);
        console.log(' Enfermeras detalle:', allNurses.map((n: any) => ({
          id: n.id,
          name: `${n.firstName} ${n.lastName}`,
          role: n.role,
          isActive: n.isActive,
          maxPatients: n.maxPatients,
          assignedAreaId: n.assignedAreaId
        })));
        console.log(' Pacientes encontrados:', this.patients.length);
        console.log(' Camas encontradas:', this.beds.length);
        
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
            console.warn(` Enfermera sin ID válido:`, nurse);
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
            `   ${nurse.firstName} ${nurse.lastName} (ID: ${nurseId}): asignados por BD=${byNurseColumn.length}, por área=${byArea.length}, total=${assignedPatients.length}`
          );

          return {
            ...nurse,
            id: nurseId,
            assignedAreaId: nurseAreaId,
            assignedPatients: assignedPatients || [],
            assignedPatientsCount: assignedPatients.length,
          } as NurseWithPatients;
        });

        console.log(' Datos procesados exitosamente:', {
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
          console.warn(' No se encontraron enfermeras. Verifica:');
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

        this.loadOperationalShiftStatus();
        this.loading = false;
        this.tryConsumeAssignAreaRouteIntent();
        onComplete?.();
      },
      error: (error) => {
        console.error(' Error cargando datos:', error);
        this.error = 'Error al cargar los datos. Por favor, recarga la página.';
        this.loading = false;
        onComplete?.();
      },
    });
  }

  getFilteredNurses(): NurseWithPatients[] {
    if (!Array.isArray(this.nurses)) {
      console.warn(' nurses no es un array:', this.nurses);
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

    if (this.selectedArea === 'unassigned') {
      filtered = filtered.filter((n) => !this.nurseHasAssignedArea(n));
    } else if (this.selectedArea !== null && this.selectedArea !== undefined) {
      filtered = filtered.filter((n) => n.assignedAreaId === this.selectedArea);
    }

    if (this.selectedShiftPresenceFilter === 'onShift') {
      filtered = filtered.filter((n) => n.onCurrentShift === true);
    }
    if (this.selectedShiftPresenceFilter === 'offShift') {
      filtered = filtered.filter((n) => n.onCurrentShift !== true);
    }

    return filtered;
  }

  private loadOperationalShiftStatus(): void {
    this.shiftsService.getAllShifts().subscribe({
      next: (shifts) => {
        const currentShift = this.getCurrentShift(shifts || []);
        const currentShiftId = currentShift ? this.toNumber(currentShift.id) : null;
        this.liveShiftName = currentShift ? `${currentShift.name} (${currentShift.startTime} - ${currentShift.endTime})` : 'Sin turno activo';
        if (!currentShiftId) {
          this.applyUnknownOperationalStatus();
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        this.shiftsService.getShiftAttendance(today, currentShiftId).subscribe({
          next: (rows) => {
            const statusByNurse = new Map<number, string>();
            (rows || []).forEach((row: any) => {
              const nurseId = this.toNumber(row?.nurseId);
              if (!nurseId) return;
              statusByNurse.set(nurseId, String(row?.status || 'absent'));
            });

            this.nurses = this.nurses.map((nurse) => {
              const status = (statusByNurse.get(nurse.id!) || 'absent') as NurseWithPatients['currentShiftStatus'];
              const onCurrentShift = status === 'present' || status === 'late';
              return {
                ...nurse,
                currentShiftStatus: status,
                onCurrentShift,
              };
            });
          },
          error: () => {
            this.applyUnknownOperationalStatus();
          },
        });
      },
      error: () => {
        this.applyUnknownOperationalStatus();
      },
    });
  }

  private applyUnknownOperationalStatus(): void {
    this.nurses = this.nurses.map((nurse) => ({
      ...nurse,
      currentShiftStatus: 'unknown',
      onCurrentShift: false,
    }));
  }

  private getCurrentShift(shifts: any[]): any | null {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const shift of shifts) {
      const [startH, startM] = String(shift.startTime || '00:00').split(':').map(Number);
      const [endH, endM] = String(shift.endTime || '00:00').split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;

      if (start < end && currentMinutes >= start && currentMinutes < end) {
        return shift;
      }

      if (start > end && (currentMinutes >= start || currentMinutes < end)) {
        return shift;
      }
    }

    return null;
  }

  private startOperationalStatusPolling(): void {
    if (this.operationalStatusTimer) {
      clearInterval(this.operationalStatusTimer);
    }
    this.operationalStatusTimer = setInterval(() => {
      if (!this.loading && this.nurses.length > 0) {
        this.loadOperationalShiftStatus();
      }
    }, 30000);
  }

  getOperationalStatusLabel(nurse: NurseWithPatients): string {
    if (nurse.currentShiftStatus === 'present') return 'En turno';
    if (nurse.currentShiftStatus === 'late') return 'En turno (tarde)';
    if (nurse.currentShiftStatus === 'justified') return 'Ausencia justificada';
    if (nurse.currentShiftStatus === 'missing') return 'Ausente (falta en turno)';
    if (nurse.currentShiftStatus === 'absent') return 'Fuera de turno';
    return 'Sin registro de turno';
  }

  /** Texto corto para la pastilla (mismo rol visual que antes “Activo/Inactivo”). */
  getShiftPresenceBadgeLabel(nurse: NurseWithPatients): string {
    return this.getOperationalStatusLabel(nurse);
  }

  /** Clases CSS para la pastilla de turno (misma base que .nurse-status). */
  getShiftPresenceBadgeClass(nurse: NurseWithPatients): string {
    const s = nurse.currentShiftStatus;
    if (s === 'present' || s === 'late') return 'nurse-shift-status on-shift';
    if (s === 'justified') return 'nurse-shift-status justified';
    if (s === 'missing') return 'nurse-shift-status absent-shift';
    if (s === 'absent') return 'nurse-shift-status off-shift';
    return 'nurse-shift-status unknown-shift';
  }

  getNursePhoneDisplay(nurse: NurseWithPatients): string {
    const raw = (nurse as any)?.phone;
    const s = raw != null ? String(raw).trim() : '';
    return s.length > 0 ? s : 'No registrado';
  }

  isNurseDetailExpanded(nurse: NurseWithPatients): boolean {
    const id = nurse.id;
    return id != null && !!this.nurseDetailExpanded[id];
  }

  toggleNurseDetail(nurse: NurseWithPatients): void {
    const id = nurse.id;
    if (id == null) return;
    const next = !this.nurseDetailExpanded[id];
    this.nurseDetailExpanded = { ...this.nurseDetailExpanded, [id]: next };
  }

  canShowDetailToggle(nurse: NurseWithPatients): boolean {
    return nurse.onCurrentShift === true;
  }

  // ========== GESTIÓN DE ENFERMERA ==========
  openEditModal(nurse: NurseWithPatients): void {
    this.selectedNurse = nurse;
    this.editForm = {
      firstName: nurse.firstName,
      lastName: nurse.lastName,
      email: nurse.email,
      username: nurse.username,
      phone: (nurse as any).phone ?? '',
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

    const parsedArea = this.parseAndValidateAssignedAreaId(this.editForm.assignedAreaId as number | null | undefined);
    if (parsedArea === false) {
      return;
    }
    this.editForm.assignedAreaId = parsedArea;

    const phoneTrim = String(this.editForm.phone ?? '').trim();
    if (phoneTrim.length > 30) {
      this.toastService.warning('El teléfono no puede superar 30 caracteres');
      return;
    }
    const payload = { ...this.editForm, phone: phoneTrim.length > 0 ? phoneTrim : null };

    console.log(' Guardando enfermera:', {
      id: this.selectedNurse.id,
      formData: payload,
    });

    this.adminService.updateUser(this.selectedNurse.id, payload).subscribe({
      next: () => {
        console.log(' Enfermera actualizada exitosamente');
        this.toastService.success('Enfermera actualizada correctamente');
        this.closeEditModal();
        this.loadData(); // Recargar para actualizar todo (incluyendo pacientes asignados)
      },
      error: (error) => {
        console.error('Error actualizando enfermera:', error);
        this.toastService.error(
          `Error al actualizar la enfermera: ${error.error?.message || error.message || 'Error desconocido'}`
        );
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
      if (this.patientHasBedAssigned(p)) {
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

  openChangeAreaModal(nurse: NurseWithPatients | null | undefined): void {
    if (!nurse?.id) {
      return;
    }
    this.changeAreaNurse = nurse;
    this.changeAreaSelectedId = this.toNumber(nurse.assignedAreaId);
    this.savingChangeArea = false;
    this.showChangeAreaModal = true;
  }

  openAssignNurseToAreaModal(areaId: number): void {
    const parsed = this.parseAndValidateAssignedAreaId(areaId);
    if (parsed === false) {
      return;
    }
    this.assignNurseToAreaTargetAreaId = parsed;
    this.assignNurseToAreaSelectedNurseId = null;
    this.savingAssignNurseToArea = false;
    this.showAssignNurseToAreaModal = true;
  }

  closeAssignNurseToAreaModal(): void {
    this.showAssignNurseToAreaModal = false;
    this.assignNurseToAreaTargetAreaId = null;
    this.assignNurseToAreaSelectedNurseId = null;
    this.savingAssignNurseToArea = false;
  }

  saveAssignNurseToAreaModal(): void {
    const nurseId = this.toNumber(this.assignNurseToAreaSelectedNurseId);
    if (!nurseId) {
      this.toastService.warning('Selecciona una enfermera');
      return;
    }
    const parsedArea = this.parseAndValidateAssignedAreaId(this.assignNurseToAreaTargetAreaId);
    if (parsedArea === false) {
      return;
    }
    if (parsedArea === null) {
      this.toastService.warning('El área de destino no es válida');
      return;
    }

    this.savingAssignNurseToArea = true;
    this.adminService.updateUser(nurseId, { assignedAreaId: parsedArea }).subscribe({
      next: () => {
        this.savingAssignNurseToArea = false;
        this.toastService.success('Enfermera asignada al área');
        this.closeAssignNurseToAreaModal();
        this.loadData();
      },
      error: (error) => {
        this.savingAssignNurseToArea = false;
        this.toastService.error(
          `Error al asignar área: ${error.error?.message || error.message || 'Error desconocido'}`
        );
      },
    });
  }

  closeChangeAreaModal(): void {
    this.showChangeAreaModal = false;
    this.changeAreaNurse = null;
    this.changeAreaSelectedId = null;
    this.savingChangeArea = false;
  }

  /** Misma API que Editar enfermera (`updateUser` solo `assignedAreaId`). */
  saveChangeAreaModal(): void {
    if (!this.changeAreaNurse?.id) {
      return;
    }
    const parsedArea = this.parseAndValidateAssignedAreaId(this.changeAreaSelectedId);
    if (parsedArea === false) {
      return;
    }
    const nurseId = this.toNumber(this.changeAreaNurse.id);
    if (!nurseId) {
      return;
    }

    const patientsModalOpen = this.showPatientsModal;
    const patientsModalNurseId =
      this.selectedNurse?.id != null ? this.toNumber(this.selectedNurse.id) : null;

    this.savingChangeArea = true;
    this.adminService.updateUser(nurseId, { assignedAreaId: parsedArea }).subscribe({
      next: () => {
        this.savingChangeArea = false;
        this.toastService.success('Área de la enfermera actualizada');
        this.closeChangeAreaModal();
        this.loadData(() => {
          if (patientsModalOpen && patientsModalNurseId != null && patientsModalNurseId === nurseId) {
            const n = this.nurses.find((x) => this.toNumber(x.id) === nurseId);
            if (n) {
              this.openPatientsModal(n);
            }
          }
        });
      },
      error: (error) => {
        this.savingChangeArea = false;
        this.toastService.error(
          `Error al actualizar el área: ${error.error?.message || error.message || 'Error desconocido'}`
        );
      },
    });
  }

  /** Abre la pestaña Camas del panel admin (asignación paciente–cama por área). */
  goToAdminBedsTab(): void {
    this.closeAssignBedModal();
    this.closePatientsModal();
    this.router.navigate(['/admin'], { queryParams: { tab: 'beds' } });
  }

  openStaffPatientSheet(
    ctx:
      | { kind: 'card-assigned'; nurse: NurseWithPatients; patient: Patient }
      | { kind: 'modal-assigned'; patient: Patient }
      | { kind: 'modal-available'; patient: Patient }
  ): void {
    this.staffPatientSheet = ctx;
  }

  closeStaffPatientSheet(): void {
    this.staffPatientSheet = null;
  }

  onStaffPatientRowKeydown(
    ctx:
      | { kind: 'card-assigned'; nurse: NurseWithPatients; patient: Patient }
      | { kind: 'modal-assigned'; patient: Patient }
      | { kind: 'modal-available'; patient: Patient },
    event: KeyboardEvent
  ): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openStaffPatientSheet(ctx);
    }
  }

  staffPatientSheetTitle(): string {
    const s = this.staffPatientSheet;
    if (!s) {
      return '';
    }
    return `${s.patient.firstName} ${s.patient.lastName}`;
  }

  staffPatientSheetSummary(): string[] {
    const s = this.staffPatientSheet;
    if (!s) {
      return [];
    }
    const bed = this.getPatientBed(s.patient);
    if (s.kind === 'modal-available') {
      return ['Sin cama en el listado de “disponibles”', 'Se asignará a la enfermera del modal con flujo de cama'];
    }
    if (s.kind === 'card-assigned') {
      return [`Cama: ${bed}`, `Enfermera: ${s.nurse.firstName} ${s.nurse.lastName}`];
    }
    return [`Cama: ${bed}`, 'Asignado a la enfermera del modal'];
  }

  execStaffPatientRemove(): void {
    const s = this.staffPatientSheet;
    if (!s || s.kind === 'modal-available') {
      return;
    }
    void (s.kind === 'card-assigned'
      ? this.removePatientFromNurse(s.patient, s.nurse)
      : this.removePatientFromNurse(s.patient));
    this.closeStaffPatientSheet();
  }

  execStaffPatientAssign(): void {
    const s = this.staffPatientSheet;
    if (s?.kind !== 'modal-available') {
      return;
    }
    this.assignPatientToNurse(s.patient);
    this.closeStaffPatientSheet();
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
      this.toastService.warning('Este paciente ya está asignado a esta enfermera.');
      return;
    }
    if (
      this.selectedNurse.maxPatients &&
      this.selectedNursePatients.length >= this.selectedNurse.maxPatients
    ) {
      this.toastService.warning(
        `La enfermera ya tiene el máximo de pacientes asignados (${this.selectedNurse.maxPatients})`
      );
      return;
    }

    const nurseAreaId = this.toNumber(this.selectedNurse.assignedAreaId);
    if (!nurseAreaId) {
      this.toastService.warning(
        'La enfermera no tiene área asignada. Asigna un área antes de asignar pacientes.'
      );
      return;
    }

    this.patientPendingAssign = patient;
    this.selectedBedIdForAssign = null;
    this.bedsForPendingAssign = [];

    this.adminService.getBedsByArea(nurseAreaId).subscribe({
      next: (beds) => {
        const pid = this.toNumber(patient.id);
        this.bedsForPendingAssign = (beds || []).filter((bed: any) => {
          const bedPatientId = this.toNumber(bed.patientId);
          return bed.isActive !== false && (bedPatientId === null || bedPatientId === pid);
        });

        const currentBedId = this.toNumber((patient as any).bedId);
        if (
          currentBedId &&
          this.bedsForPendingAssign.some((bed: any) => this.toNumber(bed.id) === currentBedId)
        ) {
          this.selectedBedIdForAssign = currentBedId;
        }

        this.showAssignBedModal = true;
      },
      error: (error) => {
        const msg = error.error?.message || error.message || 'Error cargando camas del área';
        this.toastService.error(msg);
      },
    });
  }

  closeAssignBedModal(): void {
    this.showAssignBedModal = false;
    this.patientPendingAssign = null;
    this.bedsForPendingAssign = [];
    this.selectedBedIdForAssign = null;
  }

  confirmAssignPatientToNurseWithBed(): void {
    if (!this.selectedNurse?.id || !this.patientPendingAssign?.id || !this.selectedBedIdForAssign) {
      this.toastService.warning('Selecciona una cama para continuar.');
      return;
    }

    const nurseId = this.toNumber(this.selectedNurse.id);
    const patientId = this.toNumber(this.patientPendingAssign.id);
    const bedId = this.toNumber(this.selectedBedIdForAssign);
    if (!nurseId || !patientId || !bedId) {
      this.toastService.warning('Datos inválidos para asignación.');
      return;
    }

    this.adminService.assignPatientToBed(bedId, patientId, nurseId).subscribe({
      next: () => {
        this.toastService.success('Paciente asignado con cama correctamente.');
        this.closeAssignBedModal();
        this.loadData();
        this.closePatientsModal();
      },
      error: (error) => {
        const msg = error.error?.message || error.message || 'No se pudo asignar cama';
        this.toastService.error(`No se pudo guardar la cama seleccionada: ${msg}`);
      },
    });
  }

  async removePatientFromNurse(patient: Patient, nurse?: NurseWithPatients): Promise<void> {
    const targetNurse = nurse || this.selectedNurse;
    if (!targetNurse?.id || !patient.id) {
      return;
    }

    const ok = await this.confirmationService.confirm({
      title: ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_TITLE,
      message: adminConfirmRemovePatientAssignmentMessage(
        patient.firstName || '',
        patient.lastName || '',
        targetNurse.firstName || '',
        targetNurse.lastName || ''
      ),
      type: 'warning',
      confirmText: ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_YES,
      cancelText: 'Cancelar',
    });
    if (!ok) {
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
          this.toastService.success('Paciente desasignado de la enfermera.');
          this.loadData();
          if (this.showPatientsModal) {
            this.closePatientsModal();
          }
        },
        error: (error) => {
          const msg = error.error?.message || error.message || 'Error desconocido';
          this.toastService.error(`Error al quitar la asignación: ${msg}`);
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
      this.toastService.warning('No hay cama en el área de esta enfermera para liberar.');
      return;
    }

    const bedAreaId =
      typeof patientBed.areaId === 'number'
        ? patientBed.areaId
        : parseInt(String(patientBed.areaId), 10);

    if (bedAreaId !== nurseAreaId) {
      this.toastService.warning('Este paciente no está en el área de esta enfermera.');
      return;
    }

    this.adminService.assignPatientToBed(patientBed.id!, null).subscribe({
      next: () => {
        this.toastService.success('Paciente removido del área (cama liberada).');
        this.loadData();
        if (this.showPatientsModal) {
          this.closePatientsModal();
        }
      },
      error: (error) => {
        const msg = error.error?.message || error.message || 'Error desconocido';
        this.toastService.error(`Error al liberar la cama: ${msg}`);
      },
    });
  }

  // ========== HELPERS ==========
  getAreaName(areaId: number | null | undefined): string {
    if (!areaId) return 'Sin área asignada';
    const area = this.areas.find((a) => a.id === areaId);
    return area?.name || 'Área desconocida';
  }

  nurseHasAssignedArea(nurse: NurseWithPatients): boolean {
    return this.toNumber(nurse.assignedAreaId) != null;
  }

  /** Nombre del área para la tarjeta compacta (solo si tiene id válido). */
  getNurseCardAreaLine(nurse: NurseWithPatients): string {
    const id = this.toNumber(nurse.assignedAreaId);
    if (id == null) {
      return '';
    }
    const area = this.areas.find((a) => this.toNumber(a.id) === id);
    return area?.name || 'Área desconocida';
  }

  getPatientBed(patient: Patient | undefined): string {
    if (!patient) return 'Sin cama';

    const fromPatient = (patient as any).bedNumber || (patient as any).bed?.bedNumber;
    if (fromPatient) {
      return fromPatient;
    }

    const patientId = this.toNumber((patient as any).id);
    if (!patientId) return 'Sin cama';

    const bed = this.beds.find((b: any) => this.toNumber(b.patientId) === patientId);
    return bed?.bedNumber || 'Sin cama';
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedArea = null;
    this.selectedShiftPresenceFilter = 'all';
    this.nurseDetailExpanded = {};
  }

  trackByNurseId(index: number, nurse: NurseWithPatients): any {
    return nurse.id || index;
  }
}
