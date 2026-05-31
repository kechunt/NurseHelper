import { Component, OnDestroy, OnInit, OnChanges, SimpleChanges, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminService, Area, Bed, Patient } from '../../../services/admin.service';
import { User } from '../../../services/auth.service';
import { ShiftsService } from '../../../services/shifts.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import {
  adminConfirmRemovePatientAssignmentMessage,
  ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_TITLE,
  ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_YES,
} from '../admin-confirmation-copy.helpers';
import { ToastService } from '../../../services/toast.service';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { AdminToggleButtonComponent } from '../../../shared/components/admin-toggle-button/admin-toggle-button.component';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';

interface NurseWithPatients extends User {
  assignedPatients: Patient[];
  assignedPatientsCount: number;
  onCurrentShift?: boolean;
  currentShiftStatus?: 'present' | 'late' | 'justified' | 'missing' | 'absent' | 'unknown';
}

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminTableRowActionsModalComponent,
    AdminToggleButtonComponent,
    BootstrapIconComponent,
    ModalShellComponent,
  ],
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css',
})
export class StaffManagementComponent implements OnInit, OnDestroy, OnChanges {
  @Input() tabActive = false;

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
  private operationalStatusTimer: ReturnType<typeof setInterval> | null = null;
  /** Detalle expandido solo para enfermeras en turno actual (mapa id → visible). */
  nurseDetailExpanded: Record<number, boolean> = {};

  /** Paciente (+ contexto): acciones en hoja desde tablas internas. */
  staffPatientSheet:
    | { kind: 'card-assigned'; nurse: NurseWithPatients; patient: Patient }
    | { kind: 'modal-assigned'; patient: Patient }
    | { kind: 'modal-available'; patient: Patient }
    | null = null;

  readonly staffMgmtNoActiveShift = $localize`:@@staffMgmt.noActiveShift:Sin turno activo`;
  readonly staffMgmtOpPresent = $localize`:@@staffMgmt.opPresent:En turno`;
  readonly staffMgmtOpLate = $localize`:@@staffMgmt.opLate:En turno (tarde)`;
  readonly staffMgmtOpJustified = $localize`:@@staffMgmt.opJustified:Ausencia justificada`;
  readonly staffMgmtOpMissing = $localize`:@@staffMgmt.opMissing:Ausente (falta en turno)`;
  readonly staffMgmtOpAbsent = $localize`:@@staffMgmt.opAbsent:Fuera de turno`;
  readonly staffMgmtOpUnknown = $localize`:@@staffMgmt.opUnknown:Sin registro de turno`;
  readonly staffMgmtPhoneNotRegistered = $localize`:@@staffMgmt.phoneNotRegistered:No registrado`;

  readonly staffMgmtWarnAreaInvalid = $localize`:@@staffMgmt.warnAreaInvalid:El área seleccionada no es válida`;
  readonly staffMgmtWarnAreaMissing = $localize`:@@staffMgmt.warnAreaMissing:El área seleccionada no existe`;
  readonly staffMgmtWarnRouteAreaInactive = $localize`:@@staffMgmt.warnRouteAreaInactive:El área indicada no existe o está inactiva.`;
  readonly staffMgmtWarnPhoneTooLong = $localize`:@@staffMgmt.warnPhoneTooLong:El teléfono no puede superar 30 caracteres`;
  readonly staffToastNurseUpdated = $localize`:@@staffMgmt.toastNurseUpdated:Enfermera actualizada correctamente`;
  readonly staffMgmtErrUnknown = $localize`:@@staffMgmt.errUnknown:Error desconocido`;
  readonly staffWarnSelectNurseModal = $localize`:@@staffMgmt.warnSelectNurseModal:Selecciona una enfermera`;
  readonly staffWarnDestAreaInvalid = $localize`:@@staffMgmt.warnDestAreaInvalid:El área de destino no es válida`;
  readonly staffToastNurseAreaAssigned = $localize`:@@staffMgmt.toastNurseAreaAssigned:Enfermera asignada al área`;
  readonly staffToastNurseAreaUpdated = $localize`:@@staffMgmt.toastNurseAreaUpdated:Área de la enfermera actualizada`;
  readonly staffWarnPatientAlreadyAssigned = $localize`:@@staffMgmt.warnPatientAlreadyAssigned:Este paciente ya está asignado a esta enfermera.`;
  readonly staffWarnNurseNoArea = $localize`:@@staffMgmt.warnNurseNoArea:La enfermera no tiene área asignada. Asigna un área antes de asignar pacientes.`;
  readonly staffErrLoadBedsArea = $localize`:@@staffMgmt.errLoadBedsArea:Error cargando camas del área`;
  readonly staffWarnSelectBed = $localize`:@@staffMgmt.warnSelectBed:Selecciona una cama para continuar.`;
  readonly staffWarnAssignInvalidData = $localize`:@@staffMgmt.warnAssignInvalidData:Datos inválidos para asignación.`;
  readonly staffToastPatientBedOk = $localize`:@@staffMgmt.toastPatientBedOk:Paciente asignado con cama correctamente.`;
  readonly staffErrAssignBedFailed = $localize`:@@staffMgmt.errAssignBedFailed:No se pudo asignar cama`;
  readonly staffConfirmCancel = $localize`:@@staffMgmt.confirmCancel:Cancelar`;
  readonly staffToastPatientUnassigned = $localize`:@@staffMgmt.toastPatientUnassigned:Paciente desasignado de la enfermera.`;
  readonly staffWarnNoBedToRelease = $localize`:@@staffMgmt.warnNoBedToRelease:No hay cama en el área de esta enfermera para liberar.`;
  readonly staffWarnPatientWrongArea = $localize`:@@staffMgmt.warnPatientWrongArea:Este paciente no está en el área de esta enfermera.`;
  readonly staffToastPatientRemovedArea = $localize`:@@staffMgmt.toastPatientRemovedArea:Paciente removido del área (cama liberada).`;

  readonly staffMgmtNoAreaAssigned = $localize`:@@staffMgmt.noAreaAssigned:Sin área asignada`;
  readonly staffMgmtUnknownArea = $localize`:@@staffMgmt.unknownArea:Área desconocida`;
  readonly staffMgmtNoBed = $localize`:@@staffMgmt.noBed:Sin cama`;
  readonly staffMgmtDefaultPatient = $localize`:@@staffMgmt.defaultPatient:Paciente`;

  readonly staffSheetAvailNoBedLine1 = $localize`:@@staffMgmt.sheetAvailNoBedLine1:Sin cama en el listado de “disponibles”`;
  readonly staffSheetAvailNoBedLine2 = $localize`:@@staffMgmt.sheetAvailNoBedLine2:Se asignará a la enfermera del modal con flujo de cama`;
  readonly staffSheetAssignedToModalNurse = $localize`:@@staffMgmt.sheetAssignedToModalNurse:Asignado a la enfermera del modal`;

  readonly staffHtmlSaving = $localize`:@@staffMgmtHtml.saving:Guardando…`;
  readonly staffHtmlSave = $localize`:@@staffMgmtHtml.save:Guardar`;

  liveShiftName = this.staffMgmtNoActiveShift;

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
      this.toastService.warning(this.staffMgmtWarnAreaInvalid);
      return false;
    }
    if (!this.areas.some((a) => a.id === n)) {
      this.toastService.warning(this.staffMgmtWarnAreaMissing);
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
    this.assignAreaRouteSub = this.route.queryParamMap.subscribe(() => {
      this.captureAssignAreaRouteIntent();
    });
    this.captureAssignAreaRouteIntent();
    this.loadData();
    if (this.tabActive) {
      this.startOperationalStatusPolling();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('tabActive' in changes) {
      if (this.tabActive) {
        this.startOperationalStatusPolling();
      } else {
        this.stopOperationalStatusPolling();
      }
    }
  }

  ngOnDestroy(): void {
    this.assignAreaRouteSub?.unsubscribe();
    this.assignAreaRouteSub = undefined;
    this.stopOperationalStatusPolling();
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
      this.toastService.warning(this.staffMgmtWarnRouteAreaInactive);
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

    // Cargar datos en paralelo con manejo de errores mejorado
    forkJoin({
      areas: this.adminService.getAreas(false).pipe(
        catchError((err) => {
          this.toastService.error(err.error?.message || 'Error cargando áreas');
          return of([]);
        })
      ),
      beds: this.adminService.getBeds(false).pipe(
        catchError((err) => {
          this.toastService.error(err.error?.message || 'Error cargando camas');
          return of([]);
        })
      ),
      patients: this.adminService.getPatients(false).pipe(
        catchError((err) => {
          this.toastService.error(err.error?.message || 'Error cargando pacientes');
          return of([]);
        })
      ),
      users: this.adminService.getUsersPaginated({ page: 1, limit: 200 }).pipe(
        catchError((err) => {
          this.toastService.error(err.error?.message || 'Error cargando usuarios');
          return of({ users: [], total: 0 });
        })
      ),
    }).subscribe({
      next: ({ areas, beds, patients, users }) => {
        // Procesar áreas - USAR LAS MISMAS ÁREAS QUE NURSE-DASHBOARD
        // Las áreas vienen de la misma BD y API, solo filtrar activas
        this.areas = Array.isArray(areas) ? areas.filter((a: any) => a.isActive !== false) : [];

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

        const allNurses = allUsers.filter((u: any) => {
          const isNurse = u.role === 'nurse';
          const isActive = u.isActive !== false && u.isActive !== 0;
          return isNurse && isActive;
        });

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

          return {
            ...nurse,
            id: nurseId,
            assignedAreaId: nurseAreaId,
            assignedPatients: assignedPatients || [],
            assignedPatientsCount: assignedPatients.length,
          } as NurseWithPatients;
        });

        // Si no hay enfermeras, mostrar mensaje descriptivo en UI
        if (this.nurses.length === 0) {
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
        this.toastService.error(error.error?.message || 'Error cargando datos');
        this.error = 'Error al cargar los datos. Por favor, recarga la página.';
        this.loading = false;
        onComplete?.();
      },
    });
  }

  getFilteredNurses(): NurseWithPatients[] {
    if (!Array.isArray(this.nurses)) {
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
        this.liveShiftName = currentShift
          ? `${currentShift.name} (${currentShift.startTime} - ${currentShift.endTime})`
          : this.staffMgmtNoActiveShift;
        if (!currentShiftId) {
          this.applyUnknownOperationalStatus();
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        this.shiftsService.getShiftAttendance(today, currentShiftId, { background: true }).subscribe({
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

  private stopOperationalStatusPolling(): void {
    if (this.operationalStatusTimer) {
      clearInterval(this.operationalStatusTimer);
      this.operationalStatusTimer = null;
    }
  }

  private startOperationalStatusPolling(): void {
    this.stopOperationalStatusPolling();
    if (!this.tabActive) {
      return;
    }
    this.operationalStatusTimer = setInterval(() => {
      if (!this.loading && this.nurses.length > 0) {
        this.loadOperationalShiftStatus();
      }
    }, 30000);
  }

  getOperationalStatusLabel(nurse: NurseWithPatients): string {
    if (nurse.currentShiftStatus === 'present') return this.staffMgmtOpPresent;
    if (nurse.currentShiftStatus === 'late') return this.staffMgmtOpLate;
    if (nurse.currentShiftStatus === 'justified') return this.staffMgmtOpJustified;
    if (nurse.currentShiftStatus === 'missing') return this.staffMgmtOpMissing;
    if (nurse.currentShiftStatus === 'absent') return this.staffMgmtOpAbsent;
    return this.staffMgmtOpUnknown;
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
    return s.length > 0 ? s : this.staffMgmtPhoneNotRegistered;
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
      role: nurse.role || 'nurse',
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

    if (!this.editForm.username?.trim() || !this.editForm.email?.trim() || !this.editForm.firstName?.trim() || !this.editForm.lastName?.trim()) {
      this.toastService.warning($localize`:@@staffMgmt.warnCompleteRequired:Completa todos los campos requeridos`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(this.editForm.email))) {
      this.toastService.warning($localize`:@@staffMgmt.warnInvalidEmail:Ingresa un email válido`);
      return;
    }

    const phoneTrim = String(this.editForm.phone ?? '').trim();
    if (phoneTrim.length > 30) {
      this.toastService.warning(this.staffMgmtWarnPhoneTooLong);
      return;
    }

    const payload: Record<string, unknown> = {
      username: this.editForm.username,
      email: this.editForm.email,
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      phone: phoneTrim.length > 0 ? phoneTrim : null,
      role: this.editForm.role,
      isActive: this.editForm.isActive,
    };

    if (this.editForm.role === 'nurse') {
      const parsedArea = this.parseAndValidateAssignedAreaId(this.editForm.assignedAreaId as number | null | undefined);
      if (parsedArea === false) {
        return;
      }
      payload['assignedAreaId'] = parsedArea;
      payload['maxPatients'] = this.editForm.maxPatients ?? 0;
    }

    this.adminService.updateUser(this.selectedNurse.id, payload).subscribe({
      next: () => {
        this.toastService.success(this.staffToastNurseUpdated);
        this.closeEditModal();
        this.loadData(); // Recargar para actualizar todo (incluyendo pacientes asignados)
      },
      error: (error) => {
        const detail = error.error?.message || error.message || this.staffMgmtErrUnknown;
        this.toastService.error(
          $localize`:@@staffMgmt.errUpdateNurse:Error al actualizar la enfermera: ${detail}:msg:`
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
      this.toastService.warning(this.staffWarnSelectNurseModal);
      return;
    }
    const parsedArea = this.parseAndValidateAssignedAreaId(this.assignNurseToAreaTargetAreaId);
    if (parsedArea === false) {
      return;
    }
    if (parsedArea === null) {
      this.toastService.warning(this.staffWarnDestAreaInvalid);
      return;
    }

    this.savingAssignNurseToArea = true;
    this.adminService.updateUser(nurseId, { assignedAreaId: parsedArea }).subscribe({
      next: () => {
        this.savingAssignNurseToArea = false;
        this.toastService.success(this.staffToastNurseAreaAssigned);
        this.closeAssignNurseToAreaModal();
        this.loadData();
      },
      error: (error) => {
        this.savingAssignNurseToArea = false;
        const detail = error.error?.message || error.message || this.staffMgmtErrUnknown;
        this.toastService.error($localize`:@@staffMgmt.errAssignArea:Error al asignar área: ${detail}:msg:`);
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
        this.toastService.success(this.staffToastNurseAreaUpdated);
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
        const detail = error.error?.message || error.message || this.staffMgmtErrUnknown;
        this.toastService.error($localize`:@@staffMgmt.errUpdateNurseArea:Error al actualizar el área: ${detail}:msg:`);
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

  getAriaLabelAssignAreaToNurse(nurse: NurseWithPatients): string {
    const fn = nurse.firstName ?? '';
    const ln = nurse.lastName ?? '';
    return nurse.onCurrentShift
      ? $localize`:@@staffMgmtHtml.ariaAssignAreaOnShift:Asignar área a ${fn}:fn: ${ln}:ln: (en turno)`
      : $localize`:@@staffMgmtHtml.ariaAssignArea:Asignar área a ${fn}:fn: ${ln}:ln:`;
  }

  getNurseAreaAlertMainText(nurse: NurseWithPatients): string {
    return nurse.onCurrentShift
      ? $localize`:@@staffMgmtHtml.noAreaOnShiftTap:Sin área asignada · está en turno — pulse para asignar`
      : $localize`:@@staffMgmtHtml.noAreaTap:Sin área asignada — pulse para asignar`;
  }

  getAriaLabelPatientRow(patient: Patient): string {
    return $localize`:@@staffMgmtHtml.ariaPatientRow:Acciones paciente ${patient.firstName ?? ''}:name:`;
  }

  getEditUserModalTitle(): string {
    const fn = this.selectedNurse?.firstName ?? '';
    const ln = this.selectedNurse?.lastName ?? '';
    return $localize`:@@staffMgmtHtml.editUserModalTitle:Editar Usuario: ${fn}:fn: ${ln}:ln:`;
  }

  getManagePatientsModalTitle(): string {
    const fn = this.selectedNurse?.firstName ?? '';
    const ln = this.selectedNurse?.lastName ?? '';
    return $localize`:@@staffMgmtHtml.managePatientsModalTitle:Gestionar Pacientes: ${fn}:fn: ${ln}:ln:`;
  }

  getChangeAreaModalTitle(): string {
    const fn = this.changeAreaNurse?.firstName ?? '';
    const ln = this.changeAreaNurse?.lastName ?? '';
    return $localize`:@@staffMgmtHtml.changeAreaModalTitle:Cambiar área: ${fn}:fn: ${ln}:ln:`;
  }

  getAssignNurseToAreaModalTitle(): string {
    const areaName = this.getAreaName(this.assignNurseToAreaTargetAreaId);
    return $localize`:@@staffMgmtHtml.assignNurseToAreaTitle:Asignar enfermera · ${areaName}:area:`;
  }

  getSelectBedModalTitle(): string {
    const p = this.patientPendingAssign;
    const fn = p?.firstName ?? '';
    const ln = p?.lastName ?? '';
    return $localize`:@@staffMgmtHtml.selectBedModalTitle:Seleccionar cama para ${fn}:fn: ${ln}:ln:`;
  }

  formatBedOptionLabel(bed: Bed): string {
    const num = bed?.bedNumber != null ? String(bed.bedNumber) : String(bed?.id ?? '');
    if ((bed as any).patientId) {
      return $localize`:@@staffMgmtHtml.bedOptionPatientBed:${num}:num: (actual del paciente)`;
    }
    return $localize`:@@staffMgmtHtml.bedOptionAvailable:${num}:num: (disponible)`;
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
      return [this.staffSheetAvailNoBedLine1, this.staffSheetAvailNoBedLine2];
    }
    if (s.kind === 'card-assigned') {
      const nurseName = `${s.nurse.firstName ?? ''} ${s.nurse.lastName ?? ''}`.trim();
      return [
        $localize`:@@staffMgmt.sheetBedLine:Cama: ${bed}:bed:`,
        $localize`:@@staffMgmt.sheetNurseLine:Enfermera: ${nurseName}:name:`,
      ];
    }
    return [$localize`:@@staffMgmt.sheetBedLine:Cama: ${bed}:bed:`, this.staffSheetAssignedToModalNurse];
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
      this.toastService.warning(this.staffWarnPatientAlreadyAssigned);
      return;
    }
    if (
      this.selectedNurse.maxPatients &&
      this.selectedNursePatients.length >= this.selectedNurse.maxPatients
    ) {
      const max = String(this.selectedNurse.maxPatients);
      this.toastService.warning(
        $localize`:@@staffMgmt.warnMaxPatients:La enfermera ya tiene el máximo de pacientes asignados (${max}:max:)`
      );
      return;
    }

    const nurseAreaId = this.toNumber(this.selectedNurse.assignedAreaId);
    if (!nurseAreaId) {
      this.toastService.warning(this.staffWarnNurseNoArea);
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
        const msg = error.error?.message || error.message || this.staffErrLoadBedsArea;
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
      this.toastService.warning(this.staffWarnSelectBed);
      return;
    }

    const nurseId = this.toNumber(this.selectedNurse.id);
    const patientId = this.toNumber(this.patientPendingAssign.id);
    const bedId = this.toNumber(this.selectedBedIdForAssign);
    if (!nurseId || !patientId || !bedId) {
      this.toastService.warning(this.staffWarnAssignInvalidData);
      return;
    }

    this.adminService.assignPatientToBed(bedId, patientId, nurseId).subscribe({
      next: () => {
        this.toastService.success(this.staffToastPatientBedOk);
        this.closeAssignBedModal();
        this.loadData();
        this.closePatientsModal();
      },
      error: (error) => {
        const msg = error.error?.message || error.message || this.staffErrAssignBedFailed;
        this.toastService.error($localize`:@@staffMgmt.errSaveSelectedBed:No se pudo guardar la cama seleccionada: ${msg}:msg:`);
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
      cancelText: this.staffConfirmCancel,
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
          this.toastService.success(this.staffToastPatientUnassigned);
          this.loadData();
          if (this.showPatientsModal) {
            this.closePatientsModal();
          }
        },
        error: (error) => {
          const msg = error.error?.message || error.message || this.staffMgmtErrUnknown;
          this.toastService.error($localize`:@@staffMgmt.errRemoveAssignment:Error al quitar la asignación: ${msg}:msg:`);
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
      this.toastService.warning(this.staffWarnNoBedToRelease);
      return;
    }

    const bedAreaId =
      typeof patientBed.areaId === 'number'
        ? patientBed.areaId
        : parseInt(String(patientBed.areaId), 10);

    if (bedAreaId !== nurseAreaId) {
      this.toastService.warning(this.staffWarnPatientWrongArea);
      return;
    }

    this.adminService.assignPatientToBed(patientBed.id!, null).subscribe({
      next: () => {
        this.toastService.success(this.staffToastPatientRemovedArea);
        this.loadData();
        if (this.showPatientsModal) {
          this.closePatientsModal();
        }
      },
      error: (error) => {
        const msg = error.error?.message || error.message || this.staffMgmtErrUnknown;
        this.toastService.error($localize`:@@staffMgmt.errReleaseBed:Error al liberar la cama: ${msg}:msg:`);
      },
    });
  }

  // ========== HELPERS ==========
  getAreaName(areaId: number | null | undefined): string {
    if (!areaId) return this.staffMgmtNoAreaAssigned;
    const area = this.areas.find((a) => a.id === areaId);
    return area?.name || this.staffMgmtUnknownArea;
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
    return area?.name || this.staffMgmtUnknownArea;
  }

  getPatientBed(patient: Patient | undefined): string {
    if (!patient) return this.staffMgmtNoBed;

    const fromPatient = (patient as any).bedNumber || (patient as any).bed?.bedNumber;
    if (fromPatient) {
      return fromPatient;
    }

    const patientId = this.toNumber((patient as any).id);
    if (!patientId) return this.staffMgmtNoBed;

    const bed = this.beds.find((b: any) => this.toNumber(b.patientId) === patientId);
    return bed?.bedNumber || this.staffMgmtNoBed;
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
