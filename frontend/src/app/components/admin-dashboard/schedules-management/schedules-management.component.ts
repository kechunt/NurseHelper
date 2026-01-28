import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { AuthService, User } from '../../../services/auth.service';
import { ShiftsService, Shift as ShiftInterface, WeeklySchedule as WeeklyScheduleInterface } from '../../../services/shifts.service';

type Shift = ShiftInterface & { id: string };
type WeeklySchedule = WeeklyScheduleInterface;

@Component({
  selector: 'app-schedules-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedules-management.component.html',
  styleUrl: './schedules-management.component.css',
})
export class SchedulesManagementComponent implements OnInit {
  nurses: User[] = [];
  areas: any[] = [];
  patients: any[] = [];
  beds: any[] = [];
  loading = false;
  
  // Turnos predefinidos (incluyendo descanso)
  shifts: any[] = [
    { id: 'morning', name: 'Matutino', startTime: '07:00', endTime: '15:00', type: 'morning', icon: '🌅' },
    { id: 'afternoon', name: 'Vespertino', startTime: '15:00', endTime: '23:00', type: 'afternoon', icon: '🌆' },
    { id: 'night', name: 'Nocturno', startTime: '23:00', endTime: '07:00', type: 'night', icon: '🌙' },
    { id: 'off', name: 'Descanso', startTime: '--:--', endTime: '--:--', type: 'off', icon: '🏖️' }
  ];
  
  selectedShift: any = null;
  showEditShiftModal = false;
  
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

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private shiftsService: ShiftsService
  ) {}

  ngOnInit(): void {
    this.initializeWeek();
    this.loadShifts(); // Cargar turnos del backend primero
    this.loadNurses();
    this.generateNursesByAreaAndShift();
  }

  loadShifts(): void {
    console.log('🔄 Cargando turnos del backend...');
    this.shiftsService.getAllShifts().subscribe({
      next: (backendShifts) => {
        console.log('📥 Turnos recibidos del backend:', backendShifts);
        
        // Mapear turnos del backend a formato del componente
        // Mantener el formato con iconos y agregar el ID numérico del backend
        const shiftMap: { [key: string]: any } = {
          'morning': { icon: '🌅', name: 'Matutino' },
          'afternoon': { icon: '🌆', name: 'Vespertino' },
          'night': { icon: '🌙', name: 'Nocturno' }
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
          icon: '🏖️' 
        });
        
        console.log('✅ Turnos procesados:', this.shifts);
      },
      error: (error) => {
        console.error('❌ Error cargando turnos:', error);
        // Mantener turnos por defecto si falla la carga
        console.warn('⚠️ Usando turnos por defecto');
      }
    });
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
        
        console.log('📥 Datos cargados:', {
          areas: this.areas.length,
          nurses: this.nurses.length,
          patients: this.patients.length,
          beds: this.beds.length
        });
        
        this.loadWeeklySchedules();
      },
      error: (error: any) => {
        console.error('❌ Error loading data:', error);
        this.loading = false;
      },
    });
  }

  loadWeeklySchedules(): void {
    console.log('🔄 ========== CARGANDO TURNOS DESDE BD ==========');
    console.log('📅 Semana:', this.weekStartDate);
    
    this.loading = true;
    this.shiftsService.getWeeklySchedule(this.weekStartDate).subscribe({
      next: (schedules) => {
        console.log('✅ ========== TURNOS RECIBIDOS ==========');
        console.log(`Total recibidos: ${schedules.length}`);
        
        if (schedules.length > 0) {
          console.log('Ejemplos:', schedules.slice(0, 3));
        }
        
        // Inicializar schedules con los datos recibidos
        this.initializeWeeklySchedules(schedules);
        
        // Aplicar filtros
        this.applyFilters();
        
        // Generar resumen
        this.generateNursesByAreaAndShift();
        
        this.loading = false;
        
        console.log('✅ ========== CARGA COMPLETA ==========');
        console.log(`Schedules en memoria: ${this.weeklySchedules.length}`);
        console.log(`Schedules filtrados: ${this.filteredSchedules.length}`);
        
        // Verificar que los turnos se muestren
        const schedulesWithShifts = this.weeklySchedules.filter(s => {
          return this.days.some(day => (s as any)[day]);
        });
        console.log(`Schedules con turnos asignados: ${schedulesWithShifts.length}`);
      },
      error: (error) => {
        console.error('❌ ========== ERROR CARGANDO TURNOS ==========');
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('Error:', error.error);
        
        this.initializeWeeklySchedules([]);
        this.applyFilters();
        this.loading = false;
        
        alert('⚠️ Error al cargar los turnos. Revisa la consola para más detalles.');
      }
    });
  }

  initializeWeeklySchedules(savedSchedules: any[] = []): void {
    console.log('🔄 ========== INICIALIZANDO SCHEDULES ==========');
    console.log(`Enfermeras totales: ${this.nurses.length}`);
    console.log(`Schedules guardados recibidos: ${savedSchedules.length}`);
    
    // Crear un mapa de schedules por nurseId para acceso rápido
    const schedulesMap = new Map<number, any>();
    savedSchedules.forEach((s: any) => {
      const nurseId = typeof s.nurseId === 'number' ? s.nurseId : parseInt(String(s.nurseId));
      if (!isNaN(nurseId)) {
        schedulesMap.set(nurseId, s);
      }
    });
    
    console.log(`Mapa de schedules creado: ${schedulesMap.size} entradas`);
    
    // Inicializar schedule para cada enfermera
    this.weeklySchedules = this.nurses.map((nurse) => {
      const nurseId = typeof nurse.id === 'number' ? nurse.id : parseInt(String(nurse.id));
      
      if (isNaN(nurseId)) {
        console.warn(`⚠️ Enfermera con ID inválido:`, nurse);
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
        console.log(`\n✅ ${nurse.firstName} ${nurse.lastName} (ID: ${nurseId}) - Tiene turnos:`);
        this.days.forEach(day => {
          const shiftType = (saved as any)[day];
          // El backend devuelve el tipo del turno ('morning', 'afternoon', 'night')
          if (shiftType && shiftType !== '') {
            // Guardar el tipo directamente para que coincida con las opciones
            nurseSchedule[day] = shiftType;
            console.log(`  ${day}: ${shiftType} (guardado como tipo)`);
          } else {
            nurseSchedule[day] = '';
          }
        });
      } else {
        console.log(`⚠️ ${nurse.firstName} ${nurse.lastName} (ID: ${nurseId}) - Sin turnos`);
      }

      return nurseSchedule;
    }).filter(s => s !== null);
    
    console.log(`\n✅ Schedules inicializados: ${this.weeklySchedules.length}`);
    
    // Contar schedules con turnos
    const schedulesWithShifts = this.weeklySchedules.filter(s => {
      return this.days.some(day => {
        const value = (s as any)[day];
        return value && value !== '';
      });
    });
    console.log(`📊 Schedules con turnos: ${schedulesWithShifts.length}`);
    
    if (schedulesWithShifts.length > 0) {
      console.log('Ejemplos de schedules con turnos:');
      schedulesWithShifts.slice(0, 2).forEach(s => {
        console.log(`  ${s.nurseName}:`, {
          monday: (s as any).monday,
          tuesday: (s as any).tuesday,
          wednesday: (s as any).wednesday,
          thursday: (s as any).thursday,
          friday: (s as any).friday,
          saturday: (s as any).saturday,
          sunday: (s as any).sunday
        });
      });
    }
  }

  openEditShiftModal(shift: any): void {
    this.selectedShift = { ...shift };
    this.showEditShiftModal = true;
  }

  closeEditShiftModal(): void {
    this.showEditShiftModal = false;
    this.selectedShift = null;
  }

  saveShiftTimes(): void {
    if (!this.selectedShift) return;
    
    console.log('💾 Guardando horario de turno:', {
      shift: this.selectedShift,
      id: this.selectedShift.id,
      startTime: this.selectedShift.startTime,
      endTime: this.selectedShift.endTime
    });
    
    if (!this.selectedShift.startTime || !this.selectedShift.endTime) {
      alert('⚠️ Las horas de inicio y fin son requeridas');
      return;
    }

    // Validar que el ID sea numérico (no 'off' u otro string)
    const shiftId = typeof this.selectedShift.id === 'number' 
      ? this.selectedShift.id 
      : parseInt(String(this.selectedShift.id));
    
    if (isNaN(shiftId)) {
      console.error('❌ ID de turno inválido:', this.selectedShift.id);
      alert('⚠️ Error: ID de turno inválido. Por favor, recarga la página.');
      return;
    }

    console.log('🔄 Llamando a updateShift con:', {
      shiftId,
      startTime: this.selectedShift.startTime,
      endTime: this.selectedShift.endTime
    });

    this.shiftsService.updateShift(
      shiftId,
      this.selectedShift.startTime,
      this.selectedShift.endTime
    ).subscribe({
      next: (response) => {
        console.log('✅ Turno actualizado exitosamente:', response);
        
        // Actualizar el turno en el array local
        const index = this.shifts.findIndex(s => s.id === shiftId);
        if (index > -1) {
          this.shifts[index] = { 
            ...this.shifts[index],
            startTime: this.selectedShift!.startTime,
            endTime: this.selectedShift!.endTime
          };
        }
        
        alert(`✅ Horario de ${this.selectedShift!.name} actualizado exitosamente`);
        this.closeEditShiftModal();
        
        // Limpiar caché para recargar turnos actualizados
        this.shiftsService.clearShiftsCache();
      },
      error: (error) => {
        console.error('❌ Error actualizando turno:', error);
        console.error('Detalles del error:', {
          status: error.status,
          message: error.error?.message || error.message,
          error: error.error,
          shiftId,
          startTime: this.selectedShift.startTime,
          endTime: this.selectedShift.endTime
        });
        alert(`Error al actualizar el horario del turno: ${error.error?.message || error.message || 'Error desconocido'}`);
      }
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
        console.log(`✅ getShiftValueForSelect: ${day} = ${shiftValue} → ${result} (shift encontrado: ${shift.name})`);
        return result;
      }
      // Si no se encuentra pero es un tipo válido, devolverlo directamente
      console.log(`⚠️ getShiftValueForSelect: ${day} = ${shiftValue} pero no se encontró en shifts`);
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
        console.log(`✅ getShiftValueForSelect: ${day} = ID ${shiftId} → ${result}`);
        return result;
      }
    }
    
    console.log(`❌ getShiftValueForSelect: ${day} = ${shiftValue} (tipo: ${typeof shiftValue}) - no reconocido`);
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
    console.log('🔄 Asignando turno a día:', { day, shiftValue, schedule });
    
    // El shiftValue puede ser un ID numérico o un tipo de turno
    // Necesitamos convertirlo al tipo de turno para que funcione correctamente
    let shiftIdToAssign = shiftValue || '';
    
    if (shiftValue && shiftValue !== '') {
      // Si es un ID numérico, buscar el tipo correspondiente
      if (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2)) {
        const shift = this.shifts.find(s => s.id === parseInt(String(shiftValue)));
        if (shift && shift.type) {
          shiftIdToAssign = shift.type;
          console.log(`  🔄 Convertido ID ${shiftValue} → tipo ${shift.type}`);
        } else if (shift && shift.id === 'off') {
          shiftIdToAssign = 'off';
        }
      } else if (shiftValue === 'off') {
        shiftIdToAssign = 'off';
      }
      // Si ya es un tipo ('morning', 'afternoon', 'night'), mantenerlo
    }
    
    schedule[day] = shiftIdToAssign;
    console.log(`  ✅ Asignado ${shiftIdToAssign} a ${day}`);
    this.generateNursesByAreaAndShift();
  }

  /**
   * Asigna el mismo turno a toda la semana (L-D) con día de descanso
   */
  assignWeekShift(schedule: any, shiftValue: any): void {
    if (!shiftValue) return;
    
    console.log('🔄 Asignando turno semanal:', { shiftValue, schedule });
    
    // Convertir ID numérico a tipo de turno si es necesario
    let shiftId = shiftValue;
    if (typeof shiftValue === 'number' || (!isNaN(parseInt(String(shiftValue))) && String(shiftValue).length <= 2)) {
      const shift = this.shifts.find(s => s.id === parseInt(String(shiftValue)));
      if (shift && shift.type) {
        shiftId = shift.type;
        console.log(`  🔄 Convertido ID ${shiftValue} → tipo ${shift.type}`);
      } else if (shift && shift.id === 'off') {
        shiftId = 'off';
      }
    }
    
    const nurse = this.nurses.find(n => n.id === schedule.nurseId);
    const shiftName = this.getShiftName(shiftId);
    
    if (!confirm(`¿Asignar ${shiftName} de Lunes a Domingo para ${nurse?.firstName} ${nurse?.lastName}?`)) {
      return;
    }
    
    // Preguntar por día de descanso (solo si no es "Descanso" el turno)
    let dayOffOption = '';
    if (shiftId !== 'off') {
      const dayOffConfirm = confirm('¿Deseas asignar un día de descanso?');
      
      if (dayOffConfirm) {
        const dayOffChoice = prompt(
          'Selecciona el día de descanso:\n' +
          '1 - Lunes\n' +
          '2 - Martes\n' +
          '3 - Miércoles\n' +
          '4 - Jueves\n' +
          '5 - Viernes\n' +
          '6 - Sábado\n' +
          '7 - Domingo',
          '7'
        );
        
        if (dayOffChoice) {
          const dayIndex = parseInt(dayOffChoice) - 1;
          if (dayIndex >= 0 && dayIndex < 7) {
            dayOffOption = this.days[dayIndex];
          }
        }
      }
    }
    
    this.days.forEach(day => {
      if (day === dayOffOption) {
        schedule[day] = 'off'; // Día de descanso
      } else {
        schedule[day] = shiftId; // Usar el tipo de turno
      }
    });
    
    console.log('✅ Turno semanal asignado:', schedule);
    this.generateNursesByAreaAndShift();
    const dayOffText = dayOffOption ? ` (con ${this.dayNames[dayOffOption]} de descanso)` : '';
    alert(`✅ ${shiftName} asignado de Lunes a Domingo${dayOffText}`);
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

  clearAllSchedules(): void {
    if (!confirm('¿Estás seguro de limpiar TODOS los turnos programados?')) {
        return;
      }

    this.weeklySchedules.forEach(schedule => {
      this.days.forEach(day => {
        (schedule as any)[day] = '';
      });
    });
    
    this.generateNursesByAreaAndShift();
    alert('✅ Todos los turnos han sido limpiados');
  }

  clearNurseSchedule(nurseId: number): void {
    const nurse = this.nurses.find(n => n.id === nurseId);
    if (!confirm(`¿Limpiar todos los turnos de ${nurse?.firstName} ${nurse?.lastName}?`)) {
      return;
    }

    const schedule = this.weeklySchedules.find(s => s.nurseId === nurseId);
    if (schedule) {
      this.days.forEach(day => {
        (schedule as any)[day] = '';
      });
      this.generateNursesByAreaAndShift();
      alert(`✅ Turnos de ${nurse?.firstName} ${nurse?.lastName} limpiados`);
    }
  }

  /**
   * Guarda los turnos de una enfermera específica
   */
  saveNurseSchedule(nurseId: number): void {
    const nurse = this.nurses.find(n => n.id === nurseId);
    if (!nurse) {
      alert('⚠️ Enfermera no encontrada');
      return;
    }

    const schedule = this.weeklySchedules.find(s => {
      const scheduleNurseId = typeof s.nurseId === 'number' ? s.nurseId : parseInt(String(s.nurseId));
      const nurseIdNum = typeof nurseId === 'number' ? nurseId : parseInt(String(nurseId));
      return scheduleNurseId === nurseIdNum;
    });

    if (!schedule) {
      alert('⚠️ No se encontró la programación de esta enfermera');
      return;
    }

    const weekStartDate = this.weekStartDate;
    
    console.log(`💾 Guardando turnos de ${nurse.firstName} ${nurse.lastName} (ID: ${nurseId})`);
    
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
            console.warn(`  ⚠️ ${day}: Turno con ID ${shiftId} no encontrado`);
            return;
          }
        } else {
          console.warn(`  ⚠️ ${day}: Valor inválido: ${shiftValue}`);
          return;
        }
        
        // Obtener número del día
        const dayNumber = this.dayToNumber[day];
        if (dayNumber !== undefined && shiftType) {
          nurseSchedule.shifts.push({
            dayOfWeek: dayNumber,
            shiftId: shiftType // SIEMPRE enviar el tipo ('morning', 'afternoon', 'night')
          });
          console.log(`  ✅ ${day} (día ${dayNumber}): ${shiftType}`);
        }
      }
    });
    
    if (nurseSchedule.shifts.length === 0) {
      alert(`⚠️ No hay turnos asignados para ${nurse.firstName} ${nurse.lastName}.\n\nPor favor, asigna turnos antes de guardar.`);
      return;
    }
    
    console.log(`📤 Enviando al servidor:`, nurseSchedule);
    
    this.loading = true;
    this.shiftsService.saveWeeklySchedule([nurseSchedule], weekStartDate).subscribe({
      next: (response) => {
        console.log('✅ Turnos guardados exitosamente:', response);
        this.loading = false;
        alert(`✅ Turnos de ${nurse.firstName} ${nurse.lastName} guardados exitosamente!\n\n${response.shiftsCreated || nurseSchedule.shifts.length} turnos guardados en la base de datos.`);
        
        // Recargar los schedules después de guardar
        setTimeout(() => {
          console.log('🔄 Recargando turnos desde BD...');
          this.loadWeeklySchedules();
        }, 300);
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error al guardar turnos:', error);
        const errorMsg = error.error?.message || error.message || 'Error desconocido';
        alert(`❌ Error al guardar los turnos de ${nurse.firstName} ${nurse.lastName}:\n\n${errorMsg}\n\nRevisa la consola (F12) para más detalles.`);
      }
    });
  }

  saveAllSchedules(): void {
    const weekStartDate = this.weekStartDate;
    
    console.log('💾 ========== GUARDANDO PROGRAMACIÓN ==========');
    console.log('📅 Semana:', weekStartDate);
    console.log('📋 Total schedules en memoria:', this.weeklySchedules.length);
    
    // Preparar datos para enviar al backend - SIMPLIFICADO
    const schedulesToSave: any[] = [];
    
    this.weeklySchedules.forEach(schedule => {
      const nurseId = typeof schedule.nurseId === 'number' ? schedule.nurseId : parseInt(String(schedule.nurseId));
      
      if (isNaN(nurseId)) {
        console.warn(`⚠️ Schedule con nurseId inválido:`, schedule);
        return;
      }
      
      const nurseSchedule: any = {
        nurseId: nurseId,
        shifts: []
      };
      
      console.log(`\n👤 Enfermera ID ${nurseId}:`);
      
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
              console.warn(`  ⚠️ ${day}: Turno con ID ${shiftId} no encontrado`);
              return;
            }
          } else {
            console.warn(`  ⚠️ ${day}: Valor inválido: ${shiftValue}`);
            return;
          }
          
          // Obtener número del día
          const dayNumber = this.dayToNumber[day];
          if (dayNumber !== undefined && shiftType) {
            nurseSchedule.shifts.push({
              dayOfWeek: dayNumber,
              shiftId: shiftType // SIEMPRE enviar el tipo ('morning', 'afternoon', 'night')
            });
            console.log(`  ✅ ${day} (día ${dayNumber}): ${shiftType}`);
          }
        }
      });
      
      if (nurseSchedule.shifts.length > 0) {
        schedulesToSave.push(nurseSchedule);
        console.log(`  📊 Total: ${nurseSchedule.shifts.length} turnos`);
      }
    });
    
    console.log('\n📤 ========== ENVIANDO AL SERVIDOR ==========');
    console.log(`Enfermeras con turnos: ${schedulesToSave.length}`);
    console.log('Datos completos:', JSON.stringify(schedulesToSave, null, 2));
    
    if (schedulesToSave.length === 0) {
      alert('⚠️ No hay turnos asignados para guardar.\n\nPor favor, asigna turnos a las enfermeras antes de guardar.');
      return;
    }
    
    this.loading = true;
    this.shiftsService.saveWeeklySchedule(schedulesToSave, weekStartDate).subscribe({
      next: (response) => {
        console.log('✅ ========== RESPUESTA EXITOSA ==========');
        console.log('Respuesta:', response);
        console.log(`Turnos guardados en BD: ${response.shiftsCreated}`);
        
        this.loading = false;
        alert(`✅ ¡Programación guardada exitosamente!\n\n${response.shiftsCreated} turnos guardados en la base de datos.`);
        
        // Recargar inmediatamente
        setTimeout(() => {
          console.log('🔄 Recargando turnos desde BD...');
          this.loadWeeklySchedules();
        }, 300);
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ ========== ERROR AL GUARDAR ==========');
        console.error('HTTP Status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        console.error('Datos enviados:', schedulesToSave);
        
        const errorMsg = error.error?.message || error.message || 'Error desconocido';
        alert(`❌ Error al guardar:\n\n${errorMsg}\n\nRevisa la consola (F12) para más detalles.`);
      }
    });
  }

  changeWeek(dateValue: string): void {
    if (!dateValue) return;
    
    // Asegurarse de que la fecha sea un lunes
    const selectedDate = new Date(dateValue + 'T00:00:00');
    const monday = this.getMondayDate(selectedDate);
    this.weekStartDate = monday.toISOString().split('T')[0];
    
    console.log('📅 Cambiando semana a:', this.weekStartDate);
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
        areaName: 'Sin Área Asignada',
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
    if (!areaId) return 'Sin área';
    const area = this.areas.find(a => a.id === areaId);
    return area?.name || 'Desconocida';
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

  applyQuickAssignment(): void {
    if (!this.quickAssignShift) {
      return;
    }

    if (this.selectedNurses.size === 0) {
      alert('⚠️ Por favor, selecciona al menos una enfermera');
      return;
    }

    const shiftName = this.getShiftName(this.quickAssignShift);
    const nurseCount = this.selectedNurses.size;

    if (!confirm(`¿Asignar turno ${shiftName} a las ${nurseCount} enfermera(s) seleccionada(s)?`)) {
      return;
    }

    // Preguntar por día de descanso
    let dayOffOption = '';
    if (this.quickAssignShift !== 'off') {
      const dayOffConfirm = confirm('¿Deseas asignar un día de descanso automáticamente?');
      
      if (dayOffConfirm) {
        const dayOffChoice = prompt(
          'Selecciona el día de descanso:\n' +
          '1 - Lunes\n' +
          '2 - Martes\n' +
          '3 - Miércoles\n' +
          '4 - Jueves\n' +
          '5 - Viernes\n' +
          '6 - Sábado\n' +
          '7 - Domingo',
          '7'
        );
        
        if (dayOffChoice) {
          const dayIndex = parseInt(dayOffChoice) - 1;
          if (dayIndex >= 0 && dayIndex < 7) {
            dayOffOption = this.days[dayIndex];
          }
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
    const dayOffText = dayOffOption ? ` (con ${this.dayNames[dayOffOption]} de descanso)` : '';
    alert(`✅ Turno ${shiftName} asignado a ${nurseCount} enfermera(s)${dayOffText}`);
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
