import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { User } from '../../../services/auth.service';
import { ExportService } from '../../../shared/services/export.service';
import {
  ShiftsService,
  Shift as ShiftInterface,
  WeeklySchedule as WeeklyScheduleInterface,
  ShiftAttendanceItem,
  ShiftAttendanceStatus,
  ShiftAttendanceHistoryItem,
} from '../../../services/shifts.service';
import { ShiftRealtimeService } from '../../../shared/services/shift-realtime.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ToastService } from '../../../services/toast.service';
import {
  adminConfirmScheduleAssignWeekMessage,
  adminConfirmScheduleBulkAssignMessage,
  adminConfirmScheduleClearNurseMessage,
  ADMIN_CONFIRM_SCHEDULE_ASSIGN_WEEK_TITLE,
  ADMIN_CONFIRM_SCHEDULE_BULK_ASSIGN_TITLE,
  ADMIN_CONFIRM_SCHEDULE_CLEAR_ALL_MESSAGE,
  ADMIN_CONFIRM_SCHEDULE_CLEAR_ALL_TITLE,
  ADMIN_CONFIRM_SCHEDULE_CLEAR_NURSE_TITLE,
  ADMIN_CONFIRM_SCHEDULE_DAY_OFF_BULK_MESSAGE,
  ADMIN_CONFIRM_SCHEDULE_DAY_OFF_MESSAGE,
  ADMIN_CONFIRM_SCHEDULE_DAY_OFF_TITLE,
  ADMIN_CONFIRM_SCHEDULE_YES_ASSIGN,
  ADMIN_CONFIRM_SCHEDULE_YES_CLEAR_ALL,
  ADMIN_CONFIRM_SCHEDULE_YES_CLEAR_NURSE,
} from '../admin-confirmation-copy.helpers';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { AdminToggleButtonComponent } from '../../../shared/components/admin-toggle-button/admin-toggle-button.component';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';

type Shift = ShiftInterface & { id: string };
type WeeklySchedule = WeeklyScheduleInterface;

@Component({
  selector: 'app-schedules-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminTableRowActionsModalComponent,
    AdminToggleButtonComponent,
    BootstrapIconComponent,
    ModalShellComponent,
  ],
  templateUrl: './schedules-management.component.html',
  styleUrl: './schedules-management.component.css',
})
export class SchedulesManagementComponent implements OnInit, OnDestroy {
  nurses: User[] = [];
  areas: any[] = [];
  patients: any[] = [];
  beds: any[] = [];
  loading = false;
  
  // Turnos predefinidos (incluyendo descanso)
  shifts: any[] = [
    { id: 'morning', name: 'Matutino', startTime: '07:00', endTime: '15:00', type: 'morning', icon: 'clock' },
    { id: 'afternoon', name: 'Vespertino', startTime: '15:00', endTime: '23:00', type: 'afternoon', icon: 'clock' },
    { id: 'night', name: 'Nocturno', startTime: '23:00', endTime: '07:00', type: 'night', icon: 'clock' },
    { id: 'off', name: 'Descanso', startTime: '--:--', endTime: '--:--', type: 'off', icon: 'calendar-days' }
  ];
  
  selectedShift: any = null;
  showEditShiftModal = false;
  showSummarySection = true;
  showManagementSection = true;
  showEditNurseSummaryModal = false;
  selectedNurseForSummaryEdit: User | null = null;
  nurseSummaryEditForm: { assignedAreaId: number | null; defaultShift: string } = {
    assignedAreaId: null,
    defaultShift: '',
  };
  
  // Programación semanal
  weeklySchedules: WeeklySchedule[] = [];
  filteredSchedules: WeeklySchedule[] = [];
  
  // Vista por áreas y turnos
  nursesByAreaAndShift: any[] = [];
  
  // Semana actual
  weekStartDate: string = '';
  
  // Filtros y selección
  selectedAreaFilter: string = '';
  quickAssignShift: string = '';
  selectedNurses: Set<number> = new Set();

  // Nuevo flujo: toma de lista por turno (sin planear semanalmente)
  attendanceDate = '';
  selectedShiftAttendanceId: number | null = null;
  attendanceItems: ShiftAttendanceItem[] = [];
  savingAttendance = false;
  /** Coalesce varios clics seguidos en una sola petición de guardado. */
  private attendancePersistTimer: ReturnType<typeof setTimeout> | null = null;
  liveDateTimeLabel = '';
  liveCurrentShiftLabel = '';
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  showShiftConfigSection = false;
  /** Por defecto: solo presentes en la tabla resumen (no todas como ausentes). */
  attendanceSummaryFilter: ShiftAttendanceStatus | 'all' = 'present';
  attendanceSearchQuery = '';
  /** Listado completo con acciones de toma de lista: visible solo si el usuario lo pide. */
  showAttendanceNurseList = false;
  /** Configuración de turnos: fila → acciones en modal. */
  shiftConfigActionsRow: any = null;
  /** Tabla resumen asistencia: fila → acciones en modal. */
  summaryAttendanceActionsItem: ShiftAttendanceItem | null = null;
  /** Listado toma de lista: fila → acciones en modal. */
  attendanceListActionsItem: ShiftAttendanceItem | null = null;
  attendanceAreaFilter: number | null = null;
  /** Deep link desde aviso de cobertura (Camas/Áreas): filtrar toma de lista por área. */
  private attendanceAreaRoutePending: number | null = null;
  private attendanceAreaRouteConsumed = false;
  private attendanceAreaRouteSub?: Subscription;
  showHistoryModal = false;
  attendanceHistory: ShiftAttendanceHistoryItem[] = [];
  loadingHistory = false;
  historyDateFrom = '';
  historyDateTo = '';
  historyShiftId: number | null = null;

  /** Sustituye `prompt()` al elegir día de descanso en asignación semanal / rápida. */
  showDayOffPickerModal = false;
  private dayOffPickerResolve: ((value: string | null) => void) | null = null;

  /** Modal: asignar una o más enfermeras a un área sin cobertura (desde aviso en toma de lista). */
  showAssignAreaCoverageModal = false;
  assignCoverageAreaId: number | null = null;
  assignCoverageSelectedNurseIds = new Set<number>();
  /** Enfermeras sugeridas por área/turno (historial o asignación actual). */
  assignCoverageDefaultNurseIds = new Set<number>();
  assignCoverageSaving = false;
  assignCoverageLoadingDefaults = false;
  
  days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  dayNames: { [key: string]: string } = {
    'monday': 'Lunes',
    'tuesday': 'Martes',
    'wednesday': 'Miércoles',
    'thursday': 'Jueves',
    'friday': 'Viernes',
    'saturday': 'Sábado',
    'sunday': 'Domingo'
  };

  dayToNumber: { [key: string]: number } = {
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 0
  };

  readonly schedMgmtWarnAreaNotExists = $localize`:@@schedMgmt.warnAreaNotExists:El área indicada no existe.`;
  readonly schedToastAttendanceAreaHint = $localize`:@@schedMgmt.toastAttendanceAreaHint:Toma de lista filtrada por esta área. Marca «Presente» o «Tarde» a quien cubra el turno.`;
  readonly schedToastAreaCoverageAssigned = $localize`:@@schedMgmt.toastAreaCoverageAssigned:Enfermeras asignadas al área. Márcalas presentes en la toma de lista si aún no lo están.`;
  readonly schedErrLoadWeekly = $localize`:@@schedMgmt.errLoadWeekly:Error al cargar los turnos. Revisa la consola para más detalles.`;
  readonly schedToastNurseSummaryOk = $localize`:@@schedMgmt.toastNurseSummaryOk:Área y turno base actualizados para la enfermera`;
  readonly schedMgmtErrUnknown = $localize`:@@schedMgmt.errUnknown:Error desconocido`;
  readonly schedWarnShiftTimesRequired = $localize`:@@schedMgmt.warnShiftTimesRequired:Las horas de inicio y fin son requeridas`;
  readonly schedWarnInvalidTimeFormat = $localize`:@@schedMgmt.warnInvalidTimeFormat:Formato de hora inválido. Usa HH:MM`;
  readonly schedWarnInvalidShiftId = $localize`:@@schedMgmt.warnInvalidShiftId:ID de turno inválido. Recarga la página.`;
  readonly schedWarnNoCurrentShift = $localize`:@@schedMgmt.warnNoCurrentShift:No se pudo detectar el turno actual del sistema`;
  readonly schedAttendanceSavedDefault = $localize`:@@schedMgmt.attendanceSavedDefault:Asistencia guardada`;
  readonly schedWarnHistoryEmpty = $localize`:@@schedMgmt.warnHistoryEmpty:No hay datos en el historial para exportar`;
  readonly schedConfirmCancel = $localize`:@@schedMgmt.confirmCancel:Cancelar`;
  readonly schedConfirmYes = $localize`:@@schedMgmt.confirmYes:Sí`;
  readonly schedConfirmNo = $localize`:@@schedMgmt.confirmNo:No`;
  readonly schedToastAllSchedulesCleared = $localize`:@@schedMgmt.toastAllSchedulesCleared:Todos los turnos han sido limpiados`;
  readonly schedWarnNurseNotFound = $localize`:@@schedMgmt.warnNurseNotFound:Enfermera no encontrada`;
  readonly schedWarnScheduleNotFound = $localize`:@@schedMgmt.warnScheduleNotFound:No se encontró la programación de esta enfermera`;
  readonly schedWarnNoSchedulesToSave = $localize`:@@schedMgmt.warnNoSchedulesToSave:No hay turnos asignados para guardar. Asigna turnos antes de guardar.`;
  readonly schedWarnSelectNurses = $localize`:@@schedMgmt.warnSelectNurses:Selecciona al menos una enfermera`;
  readonly schedNoArea = $localize`:@@schedMgmt.noArea:Sin área`;
  readonly schedUnknownArea = $localize`:@@schedMgmt.unknownArea:Desconocida`;
  readonly schedNoAreaAssignedGroup = $localize`:@@schedMgmt.noAreaAssignedGroup:Sin área asignada`;
  readonly schedHistorySheetName = $localize`:@@schedMgmt.historySheetName:Historial turnos`;
  /** Textos enlazados desde la plantilla (interpolación / ARIA / títulos de modal). */
  readonly schedHtmlNoActiveShift = $localize`:@@schedMgmtHtml.noActiveShift:Sin turno activo`;
  readonly schedHtmlModalShiftFallback = $localize`:@@schedMgmtHtml.modalShiftFallback:Turno`;
  readonly schedHtmlModalAttendanceFallback = $localize`:@@schedMgmtHtml.modalAttendanceFallback:Asistencia`;
  readonly schedHtmlModalListFallback = $localize`:@@schedMgmtHtml.modalListFallback:Toma de lista`;
  readonly schedHtmlHistoryModalTitle = $localize`:@@schedMgmtHtml.historyModalTitle:Historial de turnos y asistencia`;
  readonly schedHtmlDayOffModalTitle = $localize`:@@schedMgmtHtml.dayOffModalTitle:Día de descanso`;
  readonly schedHtmlSaving = $localize`:@@schedMgmtHtml.savingLabel:Guardando…`;
  readonly schedHtmlSaveCoverageAssign = $localize`:@@schedMgmtHtml.saveCoverageAssign:Asignar al área`;

  constructor(
    private adminService: AdminService,
    private shiftsService: ShiftsService,
    private exportService: ExportService,
    private shiftRealtimeService: ShiftRealtimeService,
    private confirmationService: ConfirmationService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  /** Promise resuelta al elegir día (`monday`…`sunday`) o cancelar. */
  private pickDayOffDayAsync(): Promise<string | null> {
    return new Promise((resolve) => {
      this.dayOffPickerResolve = resolve;
      this.showDayOffPickerModal = true;
    });
  }

  confirmDayOffChoice(dayKey: string): void {
    this.showDayOffPickerModal = false;
    const r = this.dayOffPickerResolve;
    this.dayOffPickerResolve = null;
    r?.(dayKey);
  }

  cancelDayOffPicker(): void {
    this.showDayOffPickerModal = false;
    const r = this.dayOffPickerResolve;
    this.dayOffPickerResolve = null;
    r?.(null);
  }

  ngOnInit(): void {
    this.attendanceAreaRouteSub = this.route.queryParamMap.subscribe(() => {
      this.captureAttendanceAreaRouteIntent();
    });
    this.captureAttendanceAreaRouteIntent();
    this.initializeWeek();
    this.initializeAttendanceDate();
    this.loadShifts(); // Cargar turnos del backend primero
    this.loadNurses();
    this.generateNursesByAreaAndShift();
    this.startLiveClock();
  }

  ngOnDestroy(): void {
    this.attendanceAreaRouteSub?.unsubscribe();
    this.attendanceAreaRouteSub = undefined;
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    if (this.attendancePersistTimer) {
      clearTimeout(this.attendancePersistTimer);
      this.attendancePersistTimer = null;
    }
  }

  private captureAttendanceAreaRouteIntent(): void {
    const raw = this.route.snapshot.queryParamMap.get('attendanceAreaId');
    if (!raw) {
      return;
    }
    const id = parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      return;
    }
    this.attendanceAreaRoutePending = id;
    this.attendanceAreaRouteConsumed = false;
    this.tryApplyAttendanceAreaRouteIntent();
  }

  private stripAttendanceAreaQueryParam(): void {
    if (!this.route.snapshot.queryParamMap.has('attendanceAreaId')) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { attendanceAreaId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private tryApplyAttendanceAreaRouteIntent(): void {
    if (this.attendanceAreaRouteConsumed || this.attendanceAreaRoutePending == null) {
      return;
    }
    if (!this.areas.length) {
      return;
    }
    const id = this.attendanceAreaRoutePending;
    const exists = this.areas.some((a: any) => Number(a.id) === id);
    if (!exists) {
      this.attendanceAreaRoutePending = null;
      this.stripAttendanceAreaQueryParam();
      this.toastService.warning(this.schedMgmtWarnAreaNotExists);
      return;
    }
    this.attendanceAreaRouteConsumed = true;
    this.attendanceAreaRoutePending = null;
    this.stripAttendanceAreaQueryParam();
    this.attendanceAreaFilter = id;
    this.showAttendanceNurseList = true;
    this.attendanceSummaryFilter = 'all';
    this.toastService.success(this.schedToastAttendanceAreaHint);
  }

  initializeAttendanceDate(): void {
    const today = new Date().toISOString().split('T')[0];
    this.attendanceDate = today;
    this.historyDateFrom = today;
    this.historyDateTo = today;
  }

  loadShifts(): void {
    this.shiftsService.getAllShifts().subscribe({
      next: (backendShifts) => {
        
        // Mapear turnos del backend a formato del componente
        // Mantener el formato con iconos y agregar el ID numérico del backend
        const shiftMap: { [key: string]: any } = {
          'morning': { icon: 'clock', name: 'Matutino' },
          'afternoon': { icon: 'clock', name: 'Vespertino' },
          'night': { icon: 'clock', name: 'Nocturno' }
        };
        
        // Actualizar turnos con datos del backend
        this.shifts = backendShifts.map((backendShift: any) => {
          const shiftInfo = shiftMap[backendShift.type] || { icon: '⏰', name: backendShift.name };
          return {
            id: backendShift.id, // ID numérico del backend
            type: backendShift.type, // 'morning', 'afternoon', 'night'
            name: backendShift.name || shiftInfo.name,
            startTime: backendShift.startTime,
            endTime: backendShift.endTime,
            icon: shiftInfo.icon,
            isActive: backendShift.isActive
          };
        });
        
        // Agregar turno de descanso (no viene del backend)
        this.shifts.push({ 
          id: 'off', 
          name: 'Descanso', 
          startTime: '--:--', 
          endTime: '--:--', 
          type: 'off', 
          icon: 'calendar-days'
        });
        
        this.ensureSelectedAttendanceShift();
        this.tryApplyAttendanceAreaRouteIntent();
      },
      error: (error) => {
        console.error(' Error cargando turnos:', error);
        // Mantener turnos por defecto si falla la carga
        this.ensureSelectedAttendanceShift();
        this.tryApplyAttendanceAreaRouteIntent();
      }
    });
  }

  ensureSelectedAttendanceShift(): void {
    const selectableShift = this.getCurrentSystemShift() || this.shifts.find((s) => typeof s.id === 'number');
    if (!selectableShift) {
      return;
    }
    this.attendanceDate = new Date().toISOString().split('T')[0];
    const numericShiftId = Number(selectableShift.id);
    this.selectedShiftAttendanceId = Number.isFinite(numericShiftId) ? numericShiftId : null;
    this.loadShiftAttendance();
  }

  private resolveCurrentShiftId(): number | null {
    const currentShift = this.getCurrentSystemShift();
    const currentShiftId = Number(currentShift?.id);
    if (Number.isFinite(currentShiftId) && currentShiftId > 0) {
      return currentShiftId;
    }

    const selectedId = Number(this.selectedShiftAttendanceId);
    if (Number.isFinite(selectedId) && selectedId > 0) {
      return selectedId;
    }

    return null;
  }

  private getCurrentSystemShift(): any | null {
    const now = new Date();
    const activeShifts = this.getEditableShifts();
    return this.shiftRealtimeService.resolveCurrentShift(activeShifts, now, true);
  }

  private startLiveClock(): void {
    const updateClock = () => {
      const now = new Date();
      this.liveDateTimeLabel = this.shiftRealtimeService.formatDateTimeLabel(now);

      const currentShift = this.getCurrentSystemShift();
      this.liveCurrentShiftLabel = this.shiftRealtimeService.formatShiftLabel(currentShift);
    };

    updateClock();
    this.clockTimer = setInterval(updateClock, 1000);
  }

  initializeWeek(): void {
    const today = new Date();
    const monday = this.getMondayDate(today);
    this.weekStartDate = monday.toISOString().split('T')[0];
  }

  getEditableShifts(): any[] {
    return this.shifts.filter(s => s.id !== 'off');
  }

  loadNurses(): void {
    this.loading = true;
    
    // Cargar datos en paralelo
    forkJoin({
      areas: this.adminService.getAreas(),
      users: this.adminService.getUsers(),
      patients: this.adminService.getPatients(),
      beds: this.adminService.getBeds()
    }).subscribe({
      next: ({ areas, users, patients, beds }: { areas: any[], users: any[], patients: any[], beds: any[] }) => {
        this.areas = areas.filter((a: any) => a.isActive);
        this.nurses = users.filter((u: any) => u.role === 'nurse' && u.isActive);
        this.patients = Array.isArray(patients) ? patients : [];
        this.beds = Array.isArray(beds) ? beds : [];
        
        this.loading = false;
        if (this.selectedShiftAttendanceId) {
          this.loadShiftAttendance();
        }
        this.tryApplyAttendanceAreaRouteIntent();
      },
      error: (error: any) => {
        console.error(' Error loading data:', error);
        this.loading = false;
      },
    });
  }

  loadWeeklySchedules(): void {
    this.loading = true;
    this.shiftsService.getWeeklySchedule(this.weekStartDate).subscribe({
      next: (schedules) => {
        // Inicializar schedules con los datos recibidos
        this.initializeWeeklySchedules(schedules);
        
        // Aplicar filtros
        this.applyFilters();
        
        // Generar resumen
        this.generateNursesByAreaAndShift();
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando turnos semanales:', error);
        this.initializeWeeklySchedules([]);
        this.applyFilters();
        this.loading = false;

        this.toastService.error(this.schedErrLoadWeekly);
      }
    });
  }

  initializeWeeklySchedules(savedSchedules: any[] = []): void {
    // Crear un mapa de schedules por nurseId para acceso rápido
    const schedulesMap = new Map<number, any>();
    savedSchedules.forEach((s: any) => {
      const nurseId = typeof s.nurseId === 'number' ? s.nurseId : parseInt(String(s.nurseId));
      if (!isNaN(nurseId)) {
        schedulesMap.set(nurseId, s);
      }
    });

    // Inicializar schedule para cada enfermera
    this.weeklySchedules = this.nurses.map((nurse) => {
      const nurseId = typeof nurse.id === 'number' ? nurse.id : parseInt(String(nurse.id));

      if (isNaN(nurseId)) {
        return null;
      }

      const nurseSchedule: any = {
        nurseId: nurseId,
        nurseName: `${nurse.firstName} ${nurse.lastName}`,
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
        sunday: '',
      };

      // Buscar schedule guardado para esta enfermera
      const saved = schedulesMap.get(nurseId);

      if (saved) {
        this.days.forEach(day => {
          const shiftType = (saved as any)[day];
          // El backend devuelve el tipo del turno ('morning', 'afternoon', 'night')
          if (shiftType && shiftType !== '') {
            // Guardar el tipo directamente para que coincida con las opciones
            nurseSchedule[day] = shiftType;
          } else {
            nurseSchedule[day] = '';
          }
        });
      }

      return nurseSchedule;
    }).filter(s => s !== null);
  }

  openEditShiftModal(shift: any): void {
    this.selectedShift = { ...shift };
    this.showEditShiftModal = true;
  }

  closeEditShiftModal(): void {
    this.showEditShiftModal = false;
    this.selectedShift = null;
  }

  toggleSummarySection(): void {
    this.showSummarySection = !this.showSummarySection;
  }

  toggleManagementSection(): void {
    this.showManagementSection = !this.showManagementSection;
  }

  openEditNurseSummaryModal(nurse: User): void {
    this.selectedNurseForSummaryEdit = nurse;
    this.nurseSummaryEditForm = {
      assignedAreaId: nurse.assignedAreaId || null,
      defaultShift: '',
    };
    this.showEditNurseSummaryModal = true;
  }

  closeEditNurseSummaryModal(): void {
    this.showEditNurseSummaryModal = false;
    this.selectedNurseForSummaryEdit = null;
    this.nurseSummaryEditForm = { assignedAreaId: null, defaultShift: '' };
  }

  saveNurseSummaryChanges(): void {
    if (!this.selectedNurseForSummaryEdit?.id) {
      return;
    }

    const nurseId = this.selectedNurseForSummaryEdit.id;
    const updatePayload: Partial<User> = {
      assignedAreaId: this.nurseSummaryEditForm.assignedAreaId ?? null,
    };

    this.loading = true;
    this.adminService.updateUser(nurseId, updatePayload).subscribe({
      next: () => {
        const nurseRef = this.nurses.find((n) => n.id === nurseId);
        if (nurseRef) {
          nurseRef.assignedAreaId = this.nurseSummaryEditForm.assignedAreaId ?? null;
        }

        if (this.nurseSummaryEditForm.defaultShift) {
          const schedule = this.weeklySchedules.find((s) => s.nurseId === nurseId);
          if (schedule) {
            this.days.forEach((day) => {
              (schedule as any)[day] = this.nurseSummaryEditForm.defaultShift;
            });
          }
        }

        this.applyFilters();
        this.generateNursesByAreaAndShift();
        this.loading = false;
        this.toastService.success(this.schedToastNurseSummaryOk);
        this.closeEditNurseSummaryModal();
      },
      error: (error) => {
        this.loading = false;
        const detail = error.error?.message || error.message || this.schedMgmtErrUnknown;
        this.toastService.error($localize`:@@schedMgmt.errUpdateNurseDetail:Error al actualizar enfermera: ${detail}:msg:`);
      },
    });
  }

  saveShiftTimes(): void {
    if (!this.selectedShift) return;

    if (!this.selectedShift.startTime || !this.selectedShift.endTime) {
      this.toastService.warning(this.schedWarnShiftTimesRequired);
      return;
    }

    const normalizedStartTime = this.normalizeTimeToHHMM(this.selectedShift.startTime);
    const normalizedEndTime = this.normalizeTimeToHHMM(this.selectedShift.endTime);
    if (!normalizedStartTime || !normalizedEndTime) {
      this.toastService.warning(this.schedWarnInvalidTimeFormat);
      return;
    }
    this.selectedShift.startTime = normalizedStartTime;
    this.selectedShift.endTime = normalizedEndTime;

    // Validar que el ID sea numérico (no 'off' u otro string)
    const shiftId = typeof this.selectedShift.id === 'number' 
      ? this.selectedShift.id 
      : parseInt(String(this.selectedShift.id));
    
    if (isNaN(shiftId)) {
      console.error(' ID de turno inválido:', this.selectedShift.id);
      this.toastService.warning(this.schedWarnInvalidShiftId);
      return;
    }

    this.shiftsService.updateShift(
      shiftId,
      normalizedStartTime,
      normalizedEndTime
    ).subscribe({
      next: () => {
        // Actualizar el turno en el array local
        const index = this.shifts.findIndex(s => s.id === shiftId);
        if (index > -1) {
          this.shifts[index] = { 
            ...this.shifts[index],
            startTime: this.selectedShift!.startTime,
            endTime: this.selectedShift!.endTime
          };
        }
        
        this.toastService.success(
          $localize`:@@schedMgmt.toastShiftTimesUpdated:Horario de ${this.selectedShift!.name}:name: actualizado`
        );
        this.closeEditShiftModal();
        
        // Limpiar caché para recargar turnos actualizados
        this.shiftsService.clearShiftsCache();
      },
      error: (error) => {
        console.error('Error actualizando turno:', error);
        const detail = error.error?.message || error.message || this.schedMgmtErrUnknown;
        this.toastService.error(
          $localize`:@@schedMgmt.errUpdateShiftTimes:Error al actualizar el horario del turno: ${detail}:msg:`
        );
      }
    });
  }

  adjustShiftTime(field: 'startTime' | 'endTime', deltaMinutes: number): void {
    if (!this.selectedShift || !this.selectedShift[field]) {
      return;
    }

    const [h, m] = String(this.selectedShift[field]).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) {
      return;
    }

    const totalMinutes = ((h * 60 + m + deltaMinutes) % (24 * 60) + (24 * 60)) % (24 * 60);
    const nextHour = Math.floor(totalMinutes / 60);
    const nextMinute = totalMinutes % 60;
    this.selectedShift[field] = `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
  }

  private normalizeTimeToHHMM(value: string): string | null {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const parts = raw.split(':');
    if (parts.length < 2) return null;

    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  // ========== TOMA DE LISTA POR TURNO ==========

  loadShiftAttendance(options?: { silent?: boolean }): void {
    if (!this.attendanceDate || !this.selectedShiftAttendanceId) {
      this.attendanceItems = [];
      return;
    }

    const silent = options?.silent === true;
    if (!silent) {
      this.loading = true;
    }
    this.shiftsService.getShiftAttendance(this.attendanceDate, this.selectedShiftAttendanceId).subscribe({
      next: (items) => {
        this.attendanceItems = (items && items.length > 0) ? items : this.buildFallbackAttendanceItems();
        if (!silent) {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error cargando asistencia de turno:', error);
        this.attendanceItems = this.buildFallbackAttendanceItems();
        if (!silent) {
          this.loading = false;
        }
      },
    });
  }

  private buildFallbackAttendanceItems(): ShiftAttendanceItem[] {
    return (this.nurses || []).map((nurse) => ({
      nurseId: nurse.id!,
      nurseName: `${nurse.firstName} ${nurse.lastName}`,
      status: 'absent',
      assignedAreaId: nurse.assignedAreaId || null,
      checkInAt: null,
      checkOutAt: null,
      notes: null,
    }));
  }

  /**
   * Actualiza estado en memoria y programa guardado en BD (mismo flujo para present, late, justified, missing, absent).
   */
  setAttendanceStatus(item: ShiftAttendanceItem, status: ShiftAttendanceStatus): void {
    const currentShiftId = this.resolveCurrentShiftId();
    if (!currentShiftId) {
      this.toastService.warning(this.schedWarnNoCurrentShift);
      return;
    }
    this.attendanceDate = new Date().toISOString().split('T')[0];
    this.selectedShiftAttendanceId = currentShiftId;

    item.status = status;
    const nowIso = new Date().toISOString();
    if (status === 'present' || status === 'late') {
      item.checkInAt = item.checkInAt || nowIso;
      item.checkOutAt = null;
    } else {
      item.checkInAt = null;
      item.checkOutAt = null;
    }

    this.schedulePersistAttendance();
  }

  markPresent(item: ShiftAttendanceItem): void {
    this.setAttendanceStatus(item, 'present');
  }

  markLate(item: ShiftAttendanceItem): void {
    this.setAttendanceStatus(item, 'late');
  }

  markJustified(item: ShiftAttendanceItem): void {
    this.setAttendanceStatus(item, 'justified');
  }

  markMissing(item: ShiftAttendanceItem): void {
    this.setAttendanceStatus(item, 'missing');
  }

  markAbsent(item: ShiftAttendanceItem): void {
    this.setAttendanceStatus(item, 'absent');
  }

  openShiftConfigRowSheet(shift: any): void {
    this.shiftConfigActionsRow = shift;
  }

  closeShiftConfigRowSheet(): void {
    this.shiftConfigActionsRow = null;
  }

  onShiftConfigRowKeydown(shift: any, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openShiftConfigRowSheet(shift);
    }
  }

  fromShiftConfigSheetEdit(): void {
    const s = this.shiftConfigActionsRow;
    if (!s) {
      return;
    }
    this.closeShiftConfigRowSheet();
    this.openEditShiftModal(s);
  }

  openSummaryAttendanceSheet(item: ShiftAttendanceItem): void {
    this.summaryAttendanceActionsItem = item;
  }

  closeSummaryAttendanceSheet(): void {
    this.summaryAttendanceActionsItem = null;
  }

  onSummaryAttendanceKeydown(item: ShiftAttendanceItem, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openSummaryAttendanceSheet(item);
    }
  }

  openAttendanceListSheet(item: ShiftAttendanceItem): void {
    this.attendanceListActionsItem = item;
  }

  closeAttendanceListSheet(): void {
    this.attendanceListActionsItem = null;
  }

  onAttendanceListKeydown(item: ShiftAttendanceItem, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openAttendanceListSheet(item);
    }
  }

  summaryAttendanceSheetSummary(item: ShiftAttendanceItem): string[] {
    return [
      item.nurseName,
      `${this.getAreaName(item.assignedAreaId)}`,
      `${this.getAttendanceStatusLabel(item.status)}`,
      this.formatDateTime(item.checkInAt),
    ];
  }

  attendanceListSheetSummary(item: ShiftAttendanceItem): string[] {
    return [
      item.nurseName,
      `${this.getAreaName(item.assignedAreaId)}`,
      `${this.getAttendanceStatusLabel(item.status)}`,
    ];
  }

  getResolvedShiftLabelForDisplay(): string {
    return this.liveCurrentShiftLabel || this.schedHtmlNoActiveShift;
  }

  getAriaLabelSummaryAttendance(item: ShiftAttendanceItem): string {
    return $localize`:@@schedMgmtHtml.ariaSummaryAttendance:Registrar asistencia: ${item.nurseName}:nurse:`;
  }

  getAriaLabelAttendanceListRow(item: ShiftAttendanceItem): string {
    return $localize`:@@schedMgmtHtml.ariaAttendanceListRow:Toma de lista: ${item.nurseName}:nurse:`;
  }

  getAriaLabelShiftConfigRow(shift: { name?: string }): string {
    return $localize`:@@schedMgmtHtml.ariaShiftConfigRow:Acciones para turno ${shift.name ?? ''}:shift:`;
  }

  getEditShiftModalTitle(): string {
    const name = this.selectedShift?.name ?? '';
    return $localize`:@@schedMgmtHtml.editShiftModalTitle:Editar horario: ${name}:name:`;
  }

  getShiftConfigModalTitle(row: { name?: string }): string {
    return $localize`:@@schedMgmtHtml.shiftConfigModalTitle:Turno: ${row.name ?? ''}:name:`;
  }

  getShiftConfigSummaryLines(row: { startTime?: string; endTime?: string }): string[] {
    return [
      $localize`:@@schedMgmtHtml.shiftSummaryStart:Inicio: ${row.startTime ?? ''}:time:`,
      $localize`:@@schedMgmtHtml.shiftSummaryEnd:Fin: ${row.endTime ?? ''}:time:`,
    ];
  }

  getSummaryAttendanceModalTitle(): string {
    return this.summaryAttendanceActionsItem?.nurseName ?? this.schedHtmlModalAttendanceFallback;
  }

  getAttendanceListModalTitle(): string {
    return this.attendanceListActionsItem?.nurseName ?? this.schedHtmlModalListFallback;
  }

  /** Agrupa cambios rápidos y persiste la lista completa en la BD (mismo endpoint que antes el botón Guardar). */
  private schedulePersistAttendance(): void {
    if (this.attendancePersistTimer) {
      clearTimeout(this.attendancePersistTimer);
    }
    this.attendancePersistTimer = setTimeout(() => {
      this.attendancePersistTimer = null;
      this.persistAttendanceList();
    }, 450);
  }

  private persistAttendanceList(): void {
    const currentShiftId = this.resolveCurrentShiftId();
    if (!currentShiftId || !this.attendanceItems.length) {
      return;
    }

    this.attendanceDate = new Date().toISOString().split('T')[0];
    this.selectedShiftAttendanceId = currentShiftId;

    const nowIso = new Date().toISOString();
    const payload = this.attendanceItems.map((item) => {
      if ((item.status === 'present' || item.status === 'late') && !item.checkInAt) {
        return { ...item, checkInAt: nowIso };
      }
      return item;
    });

    this.savingAttendance = true;
    this.shiftsService.saveShiftAttendance(this.attendanceDate, currentShiftId, payload, { autoHandoff: true }).subscribe({
      next: (response) => {
        this.savingAttendance = false;
        const saveMsg = response?.message || this.schedAttendanceSavedDefault;
        const handoff = response?.handoff;
        if (handoff) {
          const processed = handoff.processed ?? 0;
          const assigned = handoff.assigned ?? 0;
          const pending = handoff.pending ?? 0;
          const reasonSamples = (handoff.details || [])
            .filter((d) => d.status === 'pending' && d.reason)
            .slice(0, 4)
            .map((d) => `#${d.patientId}: ${d.reason}`)
            .join(' · ');
          const reparto = $localize`:@@schedMgmt.handoffReparto:Reparto tras lista: ${String(processed)}:processed: revisados, ${String(assigned)}:assigned: asignados, ${String(pending)}:pending: pendientes.`;
          const detailSuffix = reasonSamples
            ? $localize`:@@schedMgmt.handoffExamplesSuffix: Ejemplos: ${reasonSamples}:examples:`
            : '';
          if (pending > 0) {
            this.toastService.warning(`${saveMsg} ${reparto}${detailSuffix}`);
          } else {
            this.toastService.success(`${saveMsg} ${reparto}`);
          }
        } else {
          this.toastService.success(saveMsg);
        }
        this.loadShiftAttendance({ silent: true });
      },
      error: (error) => {
        this.savingAttendance = false;
        const detail = error.error?.message || error.message || this.schedMgmtErrUnknown;
        this.toastService.error(
          $localize`:@@schedMgmt.errSaveAttendanceServer:No se pudo guardar en el servidor: ${detail}:msg:`
        );
        this.loadShiftAttendance({ silent: true });
      },
    });
  }

  getAttendanceCount(status: ShiftAttendanceStatus): number {
    return this.attendanceItems.filter((item) => item.status === status).length;
  }

  setAttendanceSummaryFilter(status: ShiftAttendanceStatus): void {
    this.attendanceSummaryFilter = this.attendanceSummaryFilter === status ? 'all' : status;
    this.summaryAttendanceActionsItem = null;
  }

  toggleShiftConfigSection(): void {
    this.showShiftConfigSection = !this.showShiftConfigSection;
  }

  toggleAttendanceNurseList(): void {
    this.showAttendanceNurseList = !this.showAttendanceNurseList;
  }

  /** Título de la tabla resumen según la pastilla de estado activa. */
  getAttendanceTableTitle(): string {
    switch (this.attendanceSummaryFilter) {
      case 'present':
        return $localize`:@@schedMgmt.attendanceTitlePresent:Presentes en este turno`;
      case 'late':
        return $localize`:@@schedMgmt.attendanceTitleLate:Llegadas tarde en este turno`;
      case 'justified':
        return $localize`:@@schedMgmt.attendanceTitleJustified:Ausencias justificadas`;
      case 'absent':
        return $localize`:@@schedMgmt.attendanceTitleAbsent:Ausentes en este turno`;
      case 'missing':
        return $localize`:@@schedMgmt.attendanceTitleMissing:Faltas en este turno`;
      default:
        return $localize`:@@schedMgmt.attendanceTitleAll:Todas las enfermeras en este turno`;
    }
  }

  clearAttendanceFilters(): void {
    this.attendanceSearchQuery = '';
    this.attendanceAreaFilter = null;
  }

  getAttendanceStatusLabel(status: ShiftAttendanceStatus): string {
    switch (status) {
      case 'present':
        return $localize`:@@schedMgmt.statusPresent:Presente`;
      case 'late':
        return $localize`:@@schedMgmt.statusLate:Tarde`;
      case 'justified':
        return $localize`:@@schedMgmt.statusJustified:Justificada`;
      case 'missing':
        return $localize`:@@schedMgmt.statusMissing:Falta`;
      case 'absent':
        return $localize`:@@schedMgmt.statusAbsent:Ausente`;
      default:
        return $localize`:@@schedMgmt.statusAbsentDefault:Ausente`;
    }
  }

  get nursesInCurrentShift(): ShiftAttendanceItem[] {
    if (this.attendanceSummaryFilter === 'all') {
      return this.attendanceItems;
    }
    return this.attendanceItems.filter((item) => item.status === this.attendanceSummaryFilter);
  }

  get filteredAttendanceItems(): ShiftAttendanceItem[] {
    let items = [...this.attendanceItems];

    if (this.attendanceSearchQuery.trim()) {
      const query = this.attendanceSearchQuery.trim().toLowerCase();
      items = items.filter((item) => (item.nurseName || '').toLowerCase().includes(query));
    }

    if (this.attendanceAreaFilter !== null) {
      items = items.filter((item) => (item.assignedAreaId || null) === this.attendanceAreaFilter);
    }

    return items;
  }

  get uncoveredAreasInCurrentShift(): Array<{ id: number; name: string }> {
    const activeStatuses = new Set<ShiftAttendanceStatus>(['present', 'late']);
    const activeAreaIds = new Set<number>();

    for (const item of this.attendanceItems) {
      if (item.assignedAreaId && activeStatuses.has(item.status)) {
        activeAreaIds.add(item.assignedAreaId);
      }
    }

    return (this.areas || [])
      .filter((area) => area?.isActive !== false)
      .filter((area) => area?.id != null && !activeAreaIds.has(area.id))
      .map((area) => ({ id: area.id as number, name: String(area.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }

  get uncoveredAreasLabel(): string {
    return this.uncoveredAreasInCurrentShift.map((a) => a.name).join(', ');
  }

  openAssignAreaCoverageModal(areaId: number): void {
    const parsed = parseInt(String(areaId), 10);
    if (!Number.isFinite(parsed)) {
      return;
    }
    this.assignCoverageAreaId = parsed;
    this.assignCoverageSelectedNurseIds = new Set();
    this.assignCoverageDefaultNurseIds = new Set();
    this.assignCoverageSaving = false;
    this.assignCoverageLoadingDefaults = true;
    this.showAssignAreaCoverageModal = true;

    const shiftId = this.selectedShiftAttendanceId;
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const dateFrom = from.toISOString().split('T')[0];

    this.shiftsService
      .getShiftAttendanceHistory({
        dateFrom,
        shiftId: shiftId ?? undefined,
        limit: 400,
      })
      .subscribe({
        next: (history) => this.applyCoverageModalDefaults(parsed, history || []),
        error: () => this.applyCoverageModalDefaults(parsed, []),
      });
  }

  private applyCoverageModalDefaults(areaId: number, history: ShiftAttendanceHistoryItem[]): void {
    const defaults = this.resolveDefaultNurseIdsForArea(areaId, history);
    this.assignCoverageDefaultNurseIds = new Set(defaults);
    this.assignCoverageSelectedNurseIds = new Set(defaults);
    this.assignCoverageLoadingDefaults = false;
  }

  private resolveDefaultNurseIdsForArea(
    areaId: number,
    history: ShiftAttendanceHistoryItem[],
  ): number[] {
    const ids = new Set<number>();
    const activeStatuses = new Set<ShiftAttendanceStatus>(['present', 'late']);
    const shiftId = this.selectedShiftAttendanceId;

    for (const nurse of this.nurses) {
      if (nurse.id != null && nurse.assignedAreaId === areaId) {
        ids.add(nurse.id as number);
      }
    }

    if (shiftId && history.length) {
      for (const row of history) {
        if (row.shiftId !== shiftId || !activeStatuses.has(row.status)) {
          continue;
        }
        const nurseArea =
          row.assignedAreaId ?? this.nurses.find((n) => n.id === row.nurseId)?.assignedAreaId ?? null;
        if (nurseArea === areaId) {
          ids.add(row.nurseId);
        }
      }

      if (ids.size === 0) {
        const sorted = [...history]
          .filter((row) => row.shiftId === shiftId && activeStatuses.has(row.status))
          .sort((a, b) => String(b.date).localeCompare(String(a.date)));
        for (const row of sorted) {
          const nurseArea =
            row.assignedAreaId ?? this.nurses.find((n) => n.id === row.nurseId)?.assignedAreaId ?? null;
          if (nurseArea === areaId) {
            ids.add(row.nurseId);
            break;
          }
        }
      }
    }

    return [...ids];
  }

  closeAssignAreaCoverageModal(): void {
    this.showAssignAreaCoverageModal = false;
    this.assignCoverageAreaId = null;
    this.assignCoverageSelectedNurseIds = new Set();
    this.assignCoverageDefaultNurseIds = new Set();
    this.assignCoverageSaving = false;
    this.assignCoverageLoadingDefaults = false;
  }

  getAssignAreaCoverageModalTitle(): string {
    const areaName = this.getAreaName(this.assignCoverageAreaId);
    const shiftLabel = this.getResolvedShiftLabelForDisplay();
    return $localize`:@@schedMgmtHtml.assignAreaCoverageTitle:Asignar enfermeras · ${areaName}:area: · ${shiftLabel}:shift:`;
  }

  getCoverageAreaAssignAria(areaName: string): string {
    return $localize`:@@schedMgmtHtml.coverageAreaAssignAria:Asignar enfermeras al área ${areaName}:area:`;
  }

  getCoverageAssignNurseLabel(nurse: User): string {
    const name = `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim() || nurse.username || `#${nurse.id}`;
    const area = nurse.assignedAreaId ? this.getAreaName(nurse.assignedAreaId) : this.schedNoArea;
    return `${name} · ${area}`;
  }

  isCoverageNurseSelected(nurseId: number | undefined | null): boolean {
    return nurseId != null && this.assignCoverageSelectedNurseIds.has(nurseId);
  }

  isCoverageDefaultNurse(nurseId: number | undefined | null): boolean {
    return nurseId != null && this.assignCoverageDefaultNurseIds.has(nurseId);
  }

  toggleCoverageNurse(nurseId: number | undefined | null, checked: boolean): void {
    if (nurseId == null) {
      return;
    }
    const next = new Set(this.assignCoverageSelectedNurseIds);
    if (checked) {
      next.add(nurseId);
    } else {
      next.delete(nurseId);
    }
    this.assignCoverageSelectedNurseIds = next;
  }

  saveAssignAreaCoverageModal(): void {
    const areaId = this.assignCoverageAreaId;
    if (areaId == null || this.assignCoverageSelectedNurseIds.size === 0) {
      this.toastService.warning(this.schedWarnSelectNurses);
      return;
    }

    this.assignCoverageSaving = true;
    const updates = [...this.assignCoverageSelectedNurseIds].map((nurseId) =>
      this.adminService.updateUser(nurseId, { assignedAreaId: areaId }),
    );

    forkJoin(updates).subscribe({
      next: () => {
        this.assignCoverageSaving = false;
        this.toastService.success(this.schedToastAreaCoverageAssigned);
        this.closeAssignAreaCoverageModal();
        this.loadNurses();
      },
      error: (error) => {
        this.assignCoverageSaving = false;
        const detail = error?.error?.message || error?.message || this.schedMgmtErrUnknown;
        this.toastService.error(
          $localize`:@@schedMgmt.errAssignAreaCoverage:Error al asignar enfermeras al área: ${detail}:msg:`,
        );
      },
    });
  }

  formatDateTime(value?: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('es-MX', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  openHistoryModal(): void {
    this.showHistoryModal = true;
    this.loadShiftAttendanceHistory();
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.attendanceHistory = [];
  }

  loadShiftAttendanceHistory(): void {
    this.loadingHistory = true;
    this.shiftsService.getShiftAttendanceHistory({
      dateFrom: this.historyDateFrom,
      dateTo: this.historyDateTo,
      shiftId: this.historyShiftId,
      limit: 500,
    }).subscribe({
      next: (items) => {
        this.attendanceHistory = items || [];
        this.loadingHistory = false;
      },
      error: () => {
        this.attendanceHistory = [];
        this.loadingHistory = false;
      },
    });
  }

  private buildAttendanceHistoryExportRows(): Record<string, string>[] {
    return this.attendanceHistory.map((row) => ({
      Fecha: row.date || '-',
      Turno: row.shiftName || '-',
      Horario: row.shiftTime || '-',
      Enfermera: row.nurseName || '-',
      Estado: this.getAttendanceStatusLabel(row.status),
      Entrada: this.formatDateTime(row.checkInAt),
    }));
  }

  exportAttendanceHistoryCsv(): void {
    if (!this.attendanceHistory.length) {
      this.toastService.warning(this.schedWarnHistoryEmpty);
      return;
    }

    const rows = this.buildAttendanceHistoryExportRows();
    this.exportService.exportToCSV(rows, {
      filename: `historial_turnos_${new Date().toISOString().split('T')[0]}.csv`,
      headers: ['Fecha', 'Turno', 'Horario', 'Enfermera', 'Estado', 'Entrada'],
    });
  }

  exportAttendanceHistoryPdf(): void {
    if (!this.attendanceHistory.length) {
      this.toastService.warning(this.schedWarnHistoryEmpty);
      return;
    }

    const rows = this.buildAttendanceHistoryExportRows();
    this.exportService.exportToPdf(rows, {
      title: $localize`:@@schedMgmt.pdfAttendanceTitle:Historial de asistencia`,
      filename: `historial_turnos_${new Date().toISOString().split('T')[0]}.pdf`,
      headers: ['Fecha', 'Turno', 'Horario', 'Enfermera', 'Estado', 'Entrada'],
      orientation: 'landscape',
    });
  }

  // ========== GESTIÓN DE PROGRAMACIÓN SEMANAL ==========

  getShiftForNurseDay(nurseId: number, day: string): string {
    const schedule = this.weeklySchedules.find(s => {
      const scheduleNurseId = typeof s.nurseId === 'number' ? s.nurseId : parseInt(String(s.nurseId));
      const nurseIdNum = typeof nurseId === 'number' ? nurseId : parseInt(String(nurseId));
      return scheduleNurseId === nurseIdNum;
    });
    
    if (!schedule) {
      return '';
    }
    
    const shiftValue = (schedule as any)[day];
    if (!shiftValue || shiftValue === '') {
      return '';
    }
    
    // Si es un tipo de turno ('morning', 'afternoon', 'night', 'off'), devolverlo tal cual
    if (typeof shiftValue === 'string' && ['morning', 'afternoon', 'night', 'off'].includes(shiftValue)) {
      return shiftValue;
    }
    
    // Si es un ID numérico, convertir a tipo
    if (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2)) {
      const shift = this.shifts.find(s => {
        const shiftId = typeof s.id === 'number' ? s.id : parseInt(String(s.id));
        return shiftId === parseInt(String(shiftValue));
      });
      if (shift && shift.type) {
        return shift.type;
      }
    }
    
    return '';
  }

  /**
   * Obtiene el valor correcto para el select (debe coincidir con el value de las opciones)
   */
  getShiftValueForSelect(nurseId: number, day: string): string {
    const schedule = this.weeklySchedules.find(s => {
      const scheduleNurseId = typeof s.nurseId === 'number' ? s.nurseId : parseInt(String(s.nurseId));
      const nurseIdNum = typeof nurseId === 'number' ? nurseId : parseInt(String(nurseId));
      return scheduleNurseId === nurseIdNum;
    });
    
    if (!schedule) {
      return '';
    }
    
    const shiftValue = (schedule as any)[day];
    if (!shiftValue || shiftValue === '') {
      return '';
    }
    
    // Si es un tipo de turno ('morning', 'afternoon', 'night', 'off')
    if (typeof shiftValue === 'string' && ['morning', 'afternoon', 'night', 'off'].includes(shiftValue)) {
      // Buscar el turno que tenga este tipo
      const shift = this.shifts.find(s => s.type === shiftValue);
      if (shift) {
        // IMPORTANTE: Las opciones usan [value]="shift.type || shift.id"
        // Como shift.type siempre existe para los turnos válidos, devolver shift.type
        const result = shift.type || String(shift.id);
        return result;
      }
      // Si no se encuentra pero es un tipo válido, devolverlo directamente
      return shiftValue;
    }
    
    // Si es un ID numérico, buscar el turno y devolver su tipo
    if (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2)) {
      const shiftId = parseInt(String(shiftValue));
      const shift = this.shifts.find(s => {
        const sId = typeof s.id === 'number' ? s.id : parseInt(String(s.id));
        return sId === shiftId;
      });
      if (shift) {
        const result = shift.type || String(shift.id);
        return result;
      }
    }

    return '';
  }

  /**
   * Obtiene los pacientes asignados a una enfermera (basándose en su área)
   */
  getNursePatients(nurseId: number): any[] {
    const nurse = this.nurses.find(n => n.id === nurseId);
    if (!nurse || !nurse.assignedAreaId) {
      return [];
    }
    
    // Buscar camas del área de la enfermera que tienen pacientes
    const bedsInNurseArea = this.beds.filter((bed: any) => {
      const bedAreaId = typeof bed.areaId === 'number' ? bed.areaId : parseInt(String(bed.areaId));
      return !isNaN(bedAreaId) && bedAreaId === nurse.assignedAreaId && bed.patientId && bed.isActive !== false;
    });
    
    // Obtener IDs de pacientes de esas camas
    const patientIds = new Set(
      bedsInNurseArea
        .map((bed: any) => {
          const patientId = typeof bed.patientId === 'number' ? bed.patientId : parseInt(String(bed.patientId));
          return isNaN(patientId) ? null : patientId;
        })
        .filter((id: any) => id !== null)
    );
    
    // Filtrar pacientes que están en esas camas y están activos
    return this.patients.filter((p: any) => {
      const patientId = typeof p.id === 'number' ? p.id : parseInt(String(p.id));
      return !isNaN(patientId) && patientIds.has(patientId) && p.isActive !== false;
    });
  }

  /**
   * Asigna un turno a un día específico
   */
  assignShiftToDay(schedule: any, day: string, shiftValue: any): void {
    // El shiftValue puede ser un ID numérico o un tipo de turno
    // Necesitamos convertirlo al tipo de turno para que funcione correctamente
    let shiftIdToAssign = shiftValue || '';
    
    if (shiftValue && shiftValue !== '') {
      // Si es un ID numérico, buscar el tipo correspondiente
      if (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2)) {
        const shift = this.shifts.find(s => s.id === parseInt(String(shiftValue)));
        if (shift && shift.type) {
          shiftIdToAssign = shift.type;
        } else if (shift && shift.id === 'off') {
          shiftIdToAssign = 'off';
        }
      } else if (shiftValue === 'off') {
        shiftIdToAssign = 'off';
      }
      // Si ya es un tipo ('morning', 'afternoon', 'night'), mantenerlo
    }
    
    schedule[day] = shiftIdToAssign;
    this.generateNursesByAreaAndShift();
  }

  /**
   * Asigna el mismo turno a toda la semana (L-D) con día de descanso
   */
  async assignWeekShift(schedule: any, shiftValue: any): Promise<void> {
    if (!shiftValue) return;

    // Convertir ID numérico a tipo de turno si es necesario
    let shiftId = shiftValue;
    if (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2)) {
      const shift = this.shifts.find(s => s.id === parseInt(String(shiftValue)));
      if (shift && shift.type) {
        shiftId = shift.type;
      } else if (shift && shift.id === 'off') {
        shiftId = 'off';
      }
    }
    
    const nurse = this.nurses.find(n => n.id === schedule.nurseId);
    const shiftName = this.getShiftName(shiftId);
    
    const proceed = await this.confirmationService.confirm({
      title: ADMIN_CONFIRM_SCHEDULE_ASSIGN_WEEK_TITLE,
      message: adminConfirmScheduleAssignWeekMessage(
        shiftName,
        nurse?.firstName,
        nurse?.lastName
      ),
      type: 'warning',
      confirmText: ADMIN_CONFIRM_SCHEDULE_YES_ASSIGN,
      cancelText: this.schedConfirmCancel,
    });
    if (!proceed) {
      return;
    }

    // Preguntar por día de descanso (solo si no es "Descanso" el turno)
    let dayOffOption = '';
    if (shiftId !== 'off') {
      const dayOffConfirm = await this.confirmationService.confirm({
        title: ADMIN_CONFIRM_SCHEDULE_DAY_OFF_TITLE,
        message: ADMIN_CONFIRM_SCHEDULE_DAY_OFF_MESSAGE,
        type: 'info',
        confirmText: this.schedConfirmYes,
        cancelText: this.schedConfirmNo,
      });

      if (dayOffConfirm) {
        const picked = await this.pickDayOffDayAsync();
        if (picked) {
          dayOffOption = picked;
        }
      }
    }

    this.days.forEach((day) => {
      if (day === dayOffOption) {
        schedule[day] = 'off'; // Día de descanso
      } else {
        schedule[day] = shiftId; // Usar el tipo de turno
      }
    });

    this.generateNursesByAreaAndShift();
    const toastMsg = dayOffOption
      ? $localize`:@@schedMgmt.weekAssignWithDayOff:${shiftName}:shift: asignado de lunes a domingo (con ${this.dayNames[dayOffOption]}:day: de descanso).`
      : $localize`:@@schedMgmt.weekAssignNoDayOff:${shiftName}:shift: asignado de lunes a domingo.`;
    this.toastService.success(toastMsg);
  }

  getShiftName(shiftType: string | number): string {
    if (!shiftType || shiftType === '') return '';
    
    // Si es un tipo de turno ('morning', 'afternoon', 'night', 'off')
    if (typeof shiftType === 'string' && ['morning', 'afternoon', 'night', 'off'].includes(shiftType)) {
      const shift = this.shifts.find(s => s.type === shiftType || s.id === shiftType);
      if (shift) {
        return shift.name || shiftType;
      }
      // Fallback a nombres por defecto
      switch (shiftType) {
        case 'morning':
          return 'Matutino';
        case 'afternoon':
          return 'Vespertino';
        case 'night':
          return 'Nocturno';
        case 'off':
          return 'Descanso';
        default:
          return shiftType;
      }
    }
    
    // Si es un ID numérico, buscar el turno
    if (typeof shiftType === 'number' || (!isNaN(parseInt(String(shiftType))) && String(shiftType).length <= 2)) {
      const shiftId = parseInt(String(shiftType));
      const shift = this.shifts.find(s => {
        const sId = typeof s.id === 'number' ? s.id : parseInt(String(s.id));
        return sId === shiftId;
      });
      if (shift && shift.name) {
        return shift.name;
      }
    }
    
    return '';
  }

  getShiftColor(shiftId: string | number): string {
    if (!shiftId) return 'transparent';
    if (shiftId === 'off') return '#81C784';
    
    // Obtener el tipo del turno si es un ID numérico
    let shiftType = shiftId;
    if (typeof shiftId === 'number' || (!isNaN(parseInt(String(shiftId))) && String(shiftId).length <= 2)) {
      const shift = this.shifts.find(s => s.id === parseInt(String(shiftId)));
      if (shift && shift.type) {
        shiftType = shift.type;
      }
    }
    
    const colors: { [key: string]: string } = {
      'morning': '#FFE082',
      'afternoon': '#FFB74D',
      'night': '#9575CD',
      'off': '#81C784'
    };
    return colors[String(shiftType)] || '#e0e5ec';
  }

  async clearAllSchedules(): Promise<void> {
    const ok = await this.confirmationService.confirm({
      title: ADMIN_CONFIRM_SCHEDULE_CLEAR_ALL_TITLE,
      message: ADMIN_CONFIRM_SCHEDULE_CLEAR_ALL_MESSAGE,
      type: 'danger',
      confirmText: ADMIN_CONFIRM_SCHEDULE_YES_CLEAR_ALL,
      cancelText: this.schedConfirmCancel,
    });
    if (!ok) {
      return;
    }

    this.weeklySchedules.forEach(schedule => {
      this.days.forEach(day => {
        (schedule as any)[day] = '';
      });
    });
    
    this.generateNursesByAreaAndShift();
    this.toastService.success(this.schedToastAllSchedulesCleared);
  }

  async clearNurseSchedule(nurseId: number): Promise<void> {
    const nurse = this.nurses.find(n => n.id === nurseId);
    const ok = await this.confirmationService.confirm({
      title: ADMIN_CONFIRM_SCHEDULE_CLEAR_NURSE_TITLE,
      message: adminConfirmScheduleClearNurseMessage(nurse?.firstName, nurse?.lastName),
      type: 'warning',
      confirmText: ADMIN_CONFIRM_SCHEDULE_YES_CLEAR_NURSE,
      cancelText: this.schedConfirmCancel,
    });
    if (!ok) {
      return;
    }

    const schedule = this.weeklySchedules.find(s => s.nurseId === nurseId);
    if (schedule) {
      this.days.forEach(day => {
        (schedule as any)[day] = '';
      });
      this.generateNursesByAreaAndShift();
      this.toastService.success(
        $localize`:@@schedMgmt.toastNurseSchedulesCleared:Turnos de ${nurse?.firstName ?? ''}:fn: ${nurse?.lastName ?? ''}:ln: limpiados`
      );
    }
  }

  /**
   * Guarda los turnos de una enfermera específica
   */
  saveNurseSchedule(nurseId: number): void {
    const nurse = this.nurses.find(n => n.id === nurseId);
    if (!nurse) {
      this.toastService.warning(this.schedWarnNurseNotFound);
      return;
    }

    const schedule = this.weeklySchedules.find(s => {
      const scheduleNurseId = typeof s.nurseId === 'number' ? s.nurseId : parseInt(String(s.nurseId));
      const nurseIdNum = typeof nurseId === 'number' ? nurseId : parseInt(String(nurseId));
      return scheduleNurseId === nurseIdNum;
    });

    if (!schedule) {
      this.toastService.warning(this.schedWarnScheduleNotFound);
      return;
    }

    const weekStartDate = this.weekStartDate;

    // Preparar datos para esta enfermera
    const nurseSchedule: any = {
      nurseId: nurseId,
      shifts: []
    };
    
    // Convertir cada día a un objeto con dayOfWeek y shiftId
    this.days.forEach(day => {
      const shiftValue = (schedule as any)[day];
      
      // Solo procesar si hay un valor válido
      if (shiftValue && shiftValue !== '' && shiftValue !== null && shiftValue !== undefined && shiftValue !== 'off') {
        // Normalizar a tipo de turno
        let shiftType = '';
        
        // Si ya es un tipo válido
        if (typeof shiftValue === 'string' && ['morning', 'afternoon', 'night'].includes(shiftValue)) {
          shiftType = shiftValue;
        }
        // Si es un ID numérico, buscar el tipo
        else if (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2)) {
          const shiftId = parseInt(String(shiftValue));
          const shift = this.shifts.find(s => {
            const sId = typeof s.id === 'number' ? s.id : parseInt(String(s.id));
            return sId === shiftId;
          });
          if (shift && shift.type) {
            shiftType = shift.type;
          } else {
            return;
          }
        } else {
          return;
        }
        
        // Obtener número del día
        const dayNumber = this.dayToNumber[day];
        if (dayNumber !== undefined && shiftType) {
          nurseSchedule.shifts.push({
            dayOfWeek: dayNumber,
            shiftId: shiftType // SIEMPRE enviar el tipo ('morning', 'afternoon', 'night')
          });
        }
      }
    });
    
    if (nurseSchedule.shifts.length === 0) {
      this.toastService.warning(
        $localize`:@@schedMgmt.warnNoShiftsForNurse:No hay turnos asignados para ${nurse.firstName}:fn: ${nurse.lastName}:ln:. Asigna turnos antes de guardar.`
      );
      return;
    }

    this.loading = true;
    this.shiftsService.saveWeeklySchedule([nurseSchedule], weekStartDate).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastService.success(
          $localize`:@@schedMgmt.toastNurseShiftsSaved:Turnos guardados (${nurse.firstName}:fn: ${nurse.lastName}:ln:): ${response.shiftsCreated || nurseSchedule.shifts.length}:count: en base de datos`
        );
        
        // Recargar los schedules después de guardar
        setTimeout(() => {
          this.loadWeeklySchedules();
        }, 300);
      },
      error: (error) => {
        this.loading = false;
        console.error(' Error al guardar turnos:', error);
        const errorMsg = error.error?.message || error.message || this.schedMgmtErrUnknown;
        this.toastService.error(
          $localize`:@@schedMgmt.errSaveNurseShifts:Error al guardar turnos (${nurse.firstName}:fn: ${nurse.lastName}:ln:): ${errorMsg}:msg:`
        );
      }
    });
  }

  saveAllSchedules(): void {
    const weekStartDate = this.weekStartDate;

    // Preparar datos para enviar al backend - SIMPLIFICADO
    const schedulesToSave: any[] = [];

    this.weeklySchedules.forEach(schedule => {
      const nurseId = typeof schedule.nurseId === 'number' ? schedule.nurseId : parseInt(String(schedule.nurseId));

      if (isNaN(nurseId)) {
        return;
      }

      const nurseSchedule: any = {
        nurseId: nurseId,
        shifts: []
      };

      // Convertir cada día a un objeto con dayOfWeek y shiftId
      this.days.forEach(day => {
        const shiftValue = (schedule as any)[day];
        
        // Solo procesar si hay un valor válido
        if (shiftValue && shiftValue !== '' && shiftValue !== null && shiftValue !== undefined && shiftValue !== 'off') {
          // Normalizar a tipo de turno
          let shiftType = '';
          
          // Si ya es un tipo válido
          if (typeof shiftValue === 'string' && ['morning', 'afternoon', 'night'].includes(shiftValue)) {
            shiftType = shiftValue;
          }
          // Si es un ID numérico, buscar el tipo
          else if (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2)) {
            const shiftId = parseInt(String(shiftValue));
            const shift = this.shifts.find(s => {
              const sId = typeof s.id === 'number' ? s.id : parseInt(String(s.id));
              return sId === shiftId;
            });
            if (shift && shift.type) {
              shiftType = shift.type;
            } else {
              return;
            }
          } else {
            return;
          }
          
          // Obtener número del día
          const dayNumber = this.dayToNumber[day];
          if (dayNumber !== undefined && shiftType) {
            nurseSchedule.shifts.push({
              dayOfWeek: dayNumber,
              shiftId: shiftType // SIEMPRE enviar el tipo ('morning', 'afternoon', 'night')
            });
          }
        }
      });
      
      if (nurseSchedule.shifts.length > 0) {
        schedulesToSave.push(nurseSchedule);
      }
    });
    
    if (schedulesToSave.length === 0) {
      this.toastService.warning(this.schedWarnNoSchedulesToSave);
      return;
    }
    
    this.loading = true;
    this.shiftsService.saveWeeklySchedule(schedulesToSave, weekStartDate).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastService.success(
          $localize`:@@schedMgmt.toastScheduleSavedBulk:Programación guardada: ${response.shiftsCreated}:count: turnos en base de datos`
        );
        
        // Recargar inmediatamente
        setTimeout(() => {
          this.loadWeeklySchedules();
        }, 300);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al guardar programación:', error);
        
        const errorMsg = error.error?.message || error.message || this.schedMgmtErrUnknown;
        this.toastService.error(
          $localize`:@@schedMgmt.errSaveScheduleBulk:Error al guardar programación: ${errorMsg}:msg:`
        );
      }
    });
  }

  changeWeek(dateValue: string): void {
    if (!dateValue) return;
    
    // Asegurarse de que la fecha sea un lunes
    const selectedDate = new Date(dateValue + 'T00:00:00');
    const monday = this.getMondayDate(selectedDate);
    this.weekStartDate = monday.toISOString().split('T')[0];

    this.loadWeeklySchedules();
  }

  getNurseArea(nurseId: number): any {
    const nurse = this.nurses.find(n => n.id === nurseId);
    if (!nurse || !nurse.assignedAreaId) return null;
    return this.areas.find(a => a.id === nurse.assignedAreaId);
  }

  getTotalHoursForNurse(nurseId: number): number {
    const schedule = this.weeklySchedules.find(s => s.nurseId === nurseId);
    if (!schedule) return 0;
    
    return this.days.reduce((total, day) => {
      const shiftId = (schedule as any)[day];
      return total + (shiftId && shiftId !== 'off' ? 8 : 0);
    }, 0);
  }

  getMondayDate(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Genera vista de enfermeras agrupadas por área y turno
   */
  generateNursesByAreaAndShift(): void {
    const result: any[] = [];
    
    this.areas.forEach(area => {
      // Filtrar enfermeras de esta área
      const nursesInArea = this.nurses.filter(n => n.assignedAreaId === area.id);
      
      if (nursesInArea.length === 0) {
        return;
      }
      
      const areaData: any = {
        areaName: area.name,
        shifts: {
          morning: [],
          afternoon: [],
          night: [],
          off: [],
          unassigned: []
        }
      };
      
      nursesInArea.forEach(nurse => {
        const schedule = this.weeklySchedules.find(s => s.nurseId === nurse.id);
        
        if (!schedule) {
          areaData.shifts.unassigned.push({
            ...nurse,
            daysCount: 0,
            totalHours: 0
          });
          return;
        }
        
        const shiftCounts: any = {
          morning: 0,
          afternoon: 0,
          night: 0,
          off: 0
        };
        
        this.days.forEach(day => {
          const shiftValue = (schedule as any)[day];
          // El shiftValue puede ser un tipo ('morning', 'afternoon', 'night') o un ID numérico
          let shiftType = shiftValue;
          
          // Si es un ID numérico, convertir a tipo
          if (shiftValue && (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2))) {
            const shift = this.shifts.find(s => s.id === parseInt(String(shiftValue)));
            if (shift && shift.type) {
              shiftType = shift.type;
            }
          }
          
          if (shiftType && shiftCounts[shiftType] !== undefined) {
            shiftCounts[shiftType]++;
          }
        });
        
        let primaryShift = 'unassigned';
        let maxCount = 0;
        
        Object.keys(shiftCounts).forEach(shift => {
          if (shiftCounts[shift] > maxCount) {
            maxCount = shiftCounts[shift];
            primaryShift = shift;
          }
        });
        
        // Obtener pacientes asignados a esta enfermera (por área)
        const assignedPatients = this.getNursePatients(nurse.id!);
        
        if (maxCount > 0) {
          areaData.shifts[primaryShift].push({
            ...nurse,
            daysCount: maxCount,
            totalHours: this.getTotalHoursForNurse(nurse.id!),
            patients: assignedPatients,
            patientsCount: assignedPatients.length
          });
        } else {
          areaData.shifts.unassigned.push({
            ...nurse,
            daysCount: 0,
            totalHours: 0,
            patients: assignedPatients,
            patientsCount: assignedPatients.length
          });
        }
      });
      
      result.push(areaData);
    });
    
    const nursesWithoutArea = this.nurses.filter(n => !n.assignedAreaId);
    if (nursesWithoutArea.length > 0) {
      const noAreaData: any = {
        areaName: this.schedNoAreaAssignedGroup,
        shifts: {
          morning: [],
          afternoon: [],
          night: [],
          off: [],
          unassigned: []
        }
      };
      
      nursesWithoutArea.forEach(nurse => {
        const schedule = this.weeklySchedules.find(s => s.nurseId === nurse.id);
        
        const assignedPatients = this.getNursePatients(nurse.id!);
        
        if (!schedule) {
          noAreaData.shifts.unassigned.push({
            ...nurse,
            daysCount: 0,
            totalHours: 0,
            patients: assignedPatients,
            patientsCount: assignedPatients.length
          });
          return;
        }
        
        const shiftCounts: any = {
          morning: 0,
          afternoon: 0,
          night: 0,
          off: 0
        };
        
        this.days.forEach(day => {
          const shiftValue = (schedule as any)[day];
          // El shiftValue puede ser un tipo ('morning', 'afternoon', 'night') o un ID numérico
          let shiftType = shiftValue;
          
          // Si es un ID numérico, convertir a tipo
          if (shiftValue && (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2))) {
            const shift = this.shifts.find(s => s.id === parseInt(String(shiftValue)));
            if (shift && shift.type) {
              shiftType = shift.type;
            }
          }
          
          if (shiftType && shiftCounts[shiftType] !== undefined) {
            shiftCounts[shiftType]++;
          }
        });
        
        let primaryShift = 'unassigned';
        let maxCount = 0;
        
        Object.keys(shiftCounts).forEach(shift => {
          if (shiftCounts[shift] > maxCount) {
            maxCount = shiftCounts[shift];
            primaryShift = shift;
          }
        });
        
        if (maxCount > 0) {
          noAreaData.shifts[primaryShift].push({
            ...nurse,
            daysCount: maxCount,
            totalHours: this.getTotalHoursForNurse(nurse.id!),
            patients: assignedPatients,
            patientsCount: assignedPatients.length
          });
        } else {
          noAreaData.shifts.unassigned.push({
            ...nurse,
            daysCount: 0,
            totalHours: 0,
            patients: assignedPatients,
            patientsCount: assignedPatients.length
          });
        }
      });
      
      result.push(noAreaData);
    }
    
    this.nursesByAreaAndShift = result;
  }
  
  getAreaName(areaId: number | null | undefined): string {
    if (!areaId) return this.schedNoArea;
    const area = this.areas.find((a) => a.id === areaId);
    return area?.name || this.schedUnknownArea;
  }

  // ========== FILTROS Y ASIGNACIÓN RÁPIDA ==========

  applyFilters(): void {
    if (!this.selectedAreaFilter) {
      this.filteredSchedules = [...this.weeklySchedules];
    } else {
      const areaId = parseInt(this.selectedAreaFilter);
      this.filteredSchedules = this.weeklySchedules.filter(schedule => {
        const nurse = this.nurses.find(n => n.id === schedule.nurseId);
        return nurse?.assignedAreaId === areaId;
      });
    }
  }

  async applyQuickAssignment(): Promise<void> {
    if (!this.quickAssignShift) {
      return;
    }

    if (this.selectedNurses.size === 0) {
      this.toastService.warning(this.schedWarnSelectNurses);
      return;
    }

    const shiftName = this.getShiftName(this.quickAssignShift);
    const nurseCount = this.selectedNurses.size;

    const proceed = await this.confirmationService.confirm({
      title: ADMIN_CONFIRM_SCHEDULE_BULK_ASSIGN_TITLE,
      message: adminConfirmScheduleBulkAssignMessage(shiftName, nurseCount),
      type: 'warning',
      confirmText: ADMIN_CONFIRM_SCHEDULE_YES_ASSIGN,
      cancelText: this.schedConfirmCancel,
    });
    if (!proceed) {
      return;
    }

    // Preguntar por día de descanso
    let dayOffOption = '';
    if (this.quickAssignShift !== 'off') {
      const dayOffConfirm = await this.confirmationService.confirm({
        title: ADMIN_CONFIRM_SCHEDULE_DAY_OFF_TITLE,
        message: ADMIN_CONFIRM_SCHEDULE_DAY_OFF_BULK_MESSAGE,
        type: 'info',
        confirmText: this.schedConfirmYes,
        cancelText: this.schedConfirmNo,
      });
      
      if (dayOffConfirm) {
        const picked = await this.pickDayOffDayAsync();
        if (picked) {
          dayOffOption = picked;
        }
      }
    }

    // Aplicar solo a las enfermeras seleccionadas
    this.weeklySchedules.forEach(schedule => {
      if (this.selectedNurses.has(schedule.nurseId)) {
        this.days.forEach(day => {
          if (day === dayOffOption) {
            (schedule as any)[day] = 'off';
          } else {
            (schedule as any)[day] = this.quickAssignShift;
          }
        });
      }
    });

    this.generateNursesByAreaAndShift();
    const toastMsg = dayOffOption
      ? $localize`:@@schedMgmt.quickAssignWithDayOff:Turno ${shiftName}:shift: asignado a ${String(nurseCount)}:count: enfermera(s) (con ${this.dayNames[dayOffOption]}:day: de descanso).`
      : $localize`:@@schedMgmt.quickAssignNoDayOff:Turno ${shiftName}:shift: asignado a ${String(nurseCount)}:count: enfermera(s).`;
    this.toastService.success(toastMsg);
    this.quickAssignShift = '';
    this.selectedNurses.clear();
  }

  // Control de selección de enfermeras
  toggleNurseSelection(nurseId: number): void {
    if (this.selectedNurses.has(nurseId)) {
      this.selectedNurses.delete(nurseId);
    } else {
      this.selectedNurses.add(nurseId);
    }
  }

  isNurseSelected(nurseId: number): boolean {
    return this.selectedNurses.has(nurseId);
  }

  selectAllNurses(): void {
    this.filteredSchedules.forEach(schedule => {
      this.selectedNurses.add(schedule.nurseId);
    });
  }

  clearSelection(): void {
    this.selectedNurses.clear();
  }
}
