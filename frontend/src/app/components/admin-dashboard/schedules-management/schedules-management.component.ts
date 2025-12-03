import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    this.loadNurses();
    this.generateNursesByAreaAndShift();
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
    
    this.adminService.getAreas().subscribe({
      next: (areas) => {
        this.areas = areas.filter((a) => a.isActive);
      },
      error: (error) => {
        console.error('Error loading areas:', error);
      }
    });
    
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.nurses = users.filter((u) => u.role === 'nurse' && u.isActive);
        this.loadWeeklySchedules();
      },
      error: (error) => {
        console.error('Error loading nurses:', error);
        this.loading = false;
      },
    });
  }

  loadWeeklySchedules(): void {
    this.shiftsService.getWeeklySchedule(this.weekStartDate).subscribe({
      next: (schedules) => {
        this.initializeWeeklySchedules(schedules);
        this.applyFilters();
        this.generateNursesByAreaAndShift();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.initializeWeeklySchedules([]);
        this.applyFilters();
        this.loading = false;
      }
    });
  }

  initializeWeeklySchedules(savedSchedules: any[] = []): void {
    this.weeklySchedules = this.nurses.map((nurse) => {
      const nurseSchedule: any = {
        nurseId: nurse.id!,
        nurseName: `${nurse.firstName} ${nurse.lastName}`,
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
        sunday: '',
      };

      const saved = savedSchedules.find((s: any) => s.nurseId === nurse.id);
      if (saved) {
        this.days.forEach(day => {
          nurseSchedule[day] = (saved as any)[day] || '';
        });
      }

      return nurseSchedule;
    });
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
    
    if (!this.selectedShift.startTime || !this.selectedShift.endTime) {
      alert('⚠️ Las horas de inicio y fin son requeridas');
      return;
    }

    this.shiftsService.updateShift(
      this.selectedShift.id,
      this.selectedShift.startTime,
      this.selectedShift.endTime
    ).subscribe({
      next: () => {
        const index = this.shifts.findIndex(s => s.id === this.selectedShift!.id);
        if (index > -1) {
          this.shifts[index] = { ...this.selectedShift! };
        }
        alert(`✅ Horario de ${this.selectedShift!.name} actualizado`);
        this.closeEditShiftModal();
      },
      error: (error) => {
        console.error('Error actualizando turno:', error);
        alert('Error al actualizar el horario del turno');
      }
    });
  }

  // ========== GESTIÓN DE PROGRAMACIÓN SEMANAL ==========

  getShiftForNurseDay(nurseId: number, day: string): string {
    const schedule = this.weeklySchedules.find(s => s.nurseId === nurseId);
    return schedule ? (schedule as any)[day] || '' : '';
  }

  /**
   * Asigna un turno a un día específico
   */
  assignShiftToDay(schedule: any, day: string, shiftId: string): void {
    schedule[day] = shiftId || '';
    this.generateNursesByAreaAndShift();
  }

  /**
   * Asigna el mismo turno a toda la semana (L-D) con día de descanso
   */
  assignWeekShift(schedule: any, shiftId: string): void {
    if (!shiftId) return;
    
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
        schedule[day] = shiftId;
      }
    });
    
    this.generateNursesByAreaAndShift();
    const dayOffText = dayOffOption ? ` (con ${this.dayNames[dayOffOption]} de descanso)` : '';
    alert(`✅ ${shiftName} asignado de Lunes a Domingo${dayOffText}`);
  }

  getShiftName(shiftId: string): string {
    if (!shiftId) return 'Libre';
    const shift = this.shifts.find(s => s.id === shiftId);
    return shift?.name || 'Desconocido';
  }

  getShiftColor(shiftId: string): string {
    if (!shiftId) return 'transparent';
    const colors: { [key: string]: string } = {
      'morning': '#FFE082',
      'afternoon': '#FFB74D',
      'night': '#9575CD',
      'off': '#81C784'
    };
    return colors[shiftId] || '#e0e5ec';
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

  saveAllSchedules(): void {
    const weekStartDate = this.weekStartDate;
    
    console.log('💾 Guardando programación para la semana:', weekStartDate);
    console.log('📋 Datos actuales:', this.weeklySchedules);
    
    // Preparar datos para enviar al backend
    const schedulesToSave = this.weeklySchedules.map(schedule => {
      const nurseSchedule: any = {
        nurseId: schedule.nurseId,
        shifts: []
      };
      
      // Convertir cada día a un objeto con dayOfWeek y shiftId
      this.days.forEach(day => {
        const shiftId = (schedule as any)[day];
        if (shiftId) {
          nurseSchedule.shifts.push({
            dayOfWeek: this.dayToNumber[day],
            shiftId: shiftId,
            weekStartDate: weekStartDate
          });
        }
      });
      
      return nurseSchedule;
    });
    
    // Filtrar solo enfermeras que tienen turnos asignados
    const schedulesWithShifts = schedulesToSave.filter(s => s.shifts.length > 0);
    
    console.log('📤 Enviando al servidor:', {
      totalEnfermeras: schedulesToSave.length,
      conTurnos: schedulesWithShifts.length,
      datos: schedulesWithShifts
    });
    
    if (schedulesWithShifts.length === 0) {
      alert('⚠️ No hay turnos asignados para guardar');
      return;
    }
    
    this.shiftsService.saveWeeklySchedule(schedulesWithShifts, weekStartDate).subscribe({
      next: (response) => {
        console.log('✅ Respuesta exitosa:', response);
        alert(`✅ Programación guardada: ${response.shiftsCreated} turnos creados`);
        this.generateNursesByAreaAndShift();
      },
      error: (error) => {
        console.error('❌ Error completo:', error);
        console.error('❌ Estado:', error.status);
        console.error('❌ Mensaje:', error.message);
        alert(`❌ Error al guardar: ${error.error?.message || error.message || 'No se pudo conectar con el servidor'}`);
      }
    });
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
          const shiftId = (schedule as any)[day];
          if (shiftId && shiftCounts[shiftId] !== undefined) {
            shiftCounts[shiftId]++;
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
          areaData.shifts[primaryShift].push({
            ...nurse,
            daysCount: maxCount,
            totalHours: this.getTotalHoursForNurse(nurse.id!)
          });
        } else {
          areaData.shifts.unassigned.push({
            ...nurse,
            daysCount: 0,
            totalHours: 0
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
        
        if (!schedule) {
          noAreaData.shifts.unassigned.push({
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
          const shiftId = (schedule as any)[day];
          if (shiftId && shiftCounts[shiftId] !== undefined) {
            shiftCounts[shiftId]++;
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
            totalHours: this.getTotalHoursForNurse(nurse.id!)
          });
        } else {
          noAreaData.shifts.unassigned.push({
            ...nurse,
            daysCount: 0,
            totalHours: 0
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

  getNurseArea(nurseId: number): any {
    const nurse = this.nurses.find(n => n.id === nurseId);
    if (!nurse?.assignedAreaId) return null;
    return this.areas.find(a => a.id === nurse.assignedAreaId);
  }
}
