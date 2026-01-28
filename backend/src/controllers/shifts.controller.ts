import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Shift } from '../entities/Shift';
import { NurseShift } from '../entities/NurseShift';

export const getShifts = async (req: Request, res: Response) => {
  try {
    const shiftRepo = AppDataSource.getRepository(Shift);
    const shifts = await shiftRepo.find({
      where: { isActive: true },
      order: { id: 'ASC' }
    });
    res.json(shifts);
  } catch (error) {
    console.error('Error al obtener turnos:', error);
    res.status(500).json({ message: 'Error al obtener turnos' });
  }
};

export const updateShift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    console.log('🔄 Actualizando turno:', {
      id,
      startTime,
      endTime
    });

    const shiftId = parseInt(id);
    if (isNaN(shiftId)) {
      console.error('❌ ID de turno inválido:', id);
      return res.status(400).json({ message: 'ID de turno inválido' });
    }

    const shiftRepo = AppDataSource.getRepository(Shift);
    const shift = await shiftRepo.findOne({ where: { id: shiftId } });

    if (!shift) {
      console.error('❌ Turno no encontrado:', shiftId);
      return res.status(404).json({ message: 'Turno no encontrado' });
    }

    console.log('📋 Turno encontrado:', {
      id: shift.id,
      type: shift.type,
      name: shift.name,
      startTimeActual: shift.startTime,
      endTimeActual: shift.endTime
    });

    // Validar formato de tiempo (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      console.error('❌ Formato de hora de inicio inválido:', startTime);
      return res.status(400).json({ message: 'Formato de hora de inicio inválido. Use HH:MM' });
    }
    if (endTime && !timeRegex.test(endTime)) {
      console.error('❌ Formato de hora de fin inválido:', endTime);
      return res.status(400).json({ message: 'Formato de hora de fin inválido. Use HH:MM' });
    }

    if (startTime) {
      shift.startTime = startTime;
      console.log(`  ✏️ Hora de inicio actualizada: ${shift.startTime} → ${startTime}`);
    }
    if (endTime) {
      shift.endTime = endTime;
      console.log(`  ✏️ Hora de fin actualizada: ${shift.endTime} → ${endTime}`);
    }

    await shiftRepo.save(shift);
    console.log('✅ Turno guardado exitosamente:', {
      id: shift.id,
      type: shift.type,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime
    });

    res.json({ message: 'Turno actualizado exitosamente', shift });
  } catch (error) {
    console.error('❌ Error al actualizar turno:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Error al actualizar turno',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const { weekStartDate } = req.query;
    
    console.log('📅 Buscando horarios para semana:', weekStartDate);
    
    const nurseShiftRepo = AppDataSource.getRepository(NurseShift);
    const query = nurseShiftRepo.createQueryBuilder('ns')
      .leftJoinAndSelect('ns.nurse', 'nurse')
      .leftJoinAndSelect('ns.shift', 'shift');

    if (weekStartDate) {
      // Buscar por rango de semana completa para evitar problemas de zona horaria
      const startDate = new Date(weekStartDate as string + 'T00:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      
      query.where('ns.weekStartDate >= :startDate AND ns.weekStartDate < :endDate', { 
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
    }

    const nurseShifts = await query.getMany();
    
    console.log(`📊 Encontrados ${nurseShifts.length} turnos asignados`);
    
    if (nurseShifts.length > 0) {
      console.log('📋 Primeros turnos encontrados:', nurseShifts.slice(0, 5).map(ns => ({
        nurseId: ns.nurseId,
        nurseName: `${ns.nurse.firstName} ${ns.nurse.lastName}`,
        dayOfWeek: ns.dayOfWeek,
        shiftType: ns.shift?.type,
        shiftId: ns.shiftId,
        weekStartDate: ns.weekStartDate
      })));
    }

    const dayMap: { [key: number]: string } = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
      0: 'sunday'
    };

    const groupedByNurse: any = {};
    nurseShifts.forEach(ns => {
      if (!ns.nurse) {
        console.warn(`⚠️ Turno sin enfermera asociada:`, ns);
        return;
      }
      
      if (!ns.shift) {
        console.warn(`⚠️ Turno sin shift asociado:`, ns);
        return;
      }
      
      if (!groupedByNurse[ns.nurseId]) {
        groupedByNurse[ns.nurseId] = {
          nurseId: ns.nurseId,
          nurseName: `${ns.nurse.firstName} ${ns.nurse.lastName}`,
          monday: '',
          tuesday: '',
          wednesday: '',
          thursday: '',
          friday: '',
          saturday: '',
          sunday: ''
        };
      }
      const dayName = dayMap[ns.dayOfWeek];
      if (dayName && ns.shift) {
        // Devolver el tipo del turno ('morning', 'afternoon', 'night')
        groupedByNurse[ns.nurseId][dayName] = ns.shift.type;
        console.log(`  📅 ${ns.nurse.firstName} ${ns.nurse.lastName} - ${dayName}: ${ns.shift.type} (shiftId: ${ns.shiftId})`);
      }
    });

    const result = Object.values(groupedByNurse);
    console.log(`✅ Programación semanal procesada: ${result.length} enfermeras con turnos`);
    
    if (result.length > 0) {
      console.log('📋 Primeros schedules procesados:', result.slice(0, 3));
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error al obtener programación semanal:', error);
    res.status(500).json({ message: 'Error al obtener programación semanal' });
  }
};

export const saveWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const { schedules, weekStartDate } = req.body;

    console.log('📥 Recibiendo programación semanal:', { schedules, weekStartDate });

    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({ message: 'Datos de programación inválidos' });
    }

    const nurseShiftRepo = AppDataSource.getRepository(NurseShift);
    const shiftRepo = AppDataSource.getRepository(Shift);

    // Normalizar fecha de inicio de semana
    let weekStart: Date;
    if (weekStartDate) {
      weekStart = new Date(weekStartDate + 'T12:00:00');
      // Asegurarse de que sea lunes
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diff);
      weekStart.setHours(12, 0, 0, 0);
    } else {
      weekStart = getMonday(new Date());
    }
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    console.log('📅 Semana normalizada:', weekStartStr);

    const allShifts = await shiftRepo.find();
    console.log('📋 Turnos disponibles en BD:', allShifts.map(s => ({ id: s.id, type: s.type, name: s.name })));

    const shiftIdMap: { [key: string]: number } = {};
    allShifts.forEach(shift => {
      shiftIdMap[shift.type] = shift.id;
    });
    console.log('📋 Mapa de tipos a IDs:', shiftIdMap);

    const savedShifts = [];
    
    for (const nurseSchedule of schedules) {
      const { nurseId, shifts: nurseShifts } = nurseSchedule;
      
      if (!nurseId) {
        console.warn('⚠️ Schedule sin nurseId, saltando...');
        continue;
      }
      
      console.log(`\n👤 Procesando enfermera ID ${nurseId}:`);
      console.log(`  Turnos a asignar: ${nurseShifts.length}`);
      
      try {
        // Eliminar turnos anteriores de esta enfermera para esta semana
        const weekStartDateOnly = weekStartStr;
        const deleted = await nurseShiftRepo
          .createQueryBuilder()
          .delete()
          .from(NurseShift)
          .where('nurseId = :nurseId', { nurseId })
          .andWhere('DATE(weekStartDate) = DATE(:weekStartDate)', { weekStartDate: weekStartDateOnly })
          .execute();
        
        console.log(`  🗑️ Eliminados ${deleted.affected || 0} turnos anteriores para esta semana`);
      } catch (deleteError) {
        console.error(`  ⚠️ Error eliminando turnos anteriores:`, deleteError);
        // Continuar aunque falle la eliminación
      }

      for (const shiftData of nurseShifts) {
        const { dayOfWeek, shiftId } = shiftData;
        
        console.log(`  📅 Día ${dayOfWeek}, turno recibido: ${shiftId} (tipo: ${typeof shiftId})`);
        
        // Validar dayOfWeek primero
        if (dayOfWeek === undefined || dayOfWeek === null || isNaN(parseInt(String(dayOfWeek)))) {
          console.warn(`  ⚠️ dayOfWeek inválido: ${dayOfWeek}`);
          continue;
        }
        
        const dayOfWeekNum = parseInt(String(dayOfWeek));
        if (dayOfWeekNum < 0 || dayOfWeekNum > 6) {
          console.warn(`  ⚠️ dayOfWeek fuera de rango (0-6): ${dayOfWeekNum}`);
          continue;
        }
        
        // Si shiftId es string (tipo como 'morning', 'afternoon', 'night'), convertir a ID numérico
        let actualShiftId: number | null = null;
        
        if (typeof shiftId === 'string') {
          // Buscar en el mapa de tipos a IDs
          actualShiftId = shiftIdMap[shiftId];
          if (actualShiftId) {
            console.log(`  🔄 Convertido tipo '${shiftId}' → ID ${actualShiftId}`);
          } else {
            console.warn(`  ⚠️ Tipo de turno '${shiftId}' no encontrado en el mapa. Turnos disponibles:`, Object.keys(shiftIdMap));
            continue; // Saltar este turno si no se encuentra
          }
        } else if (typeof shiftId === 'number') {
          // Si ya es un número, verificar que exista
          const shiftExists = allShifts.find(s => s.id === shiftId);
          if (shiftExists) {
            actualShiftId = shiftId;
            console.log(`  ✅ ID numérico ${shiftId} válido`);
          } else {
            console.warn(`  ⚠️ ID de turno ${shiftId} no existe en BD`);
            continue;
          }
        } else {
          console.warn(`  ⚠️ shiftId tiene tipo inválido: ${typeof shiftId}`);
          continue;
        }
        
        // Ignorar si es 'off' (descanso) o si no se pudo obtener un ID válido
        if (shiftId === 'off' || !actualShiftId) {
          console.log(`  ⏭️ Saltando: ${shiftId} (descanso o inválido)`);
          continue;
        }
        
        const nurseShift = new NurseShift();
        nurseShift.nurseId = nurseId;
        nurseShift.shiftId = actualShiftId;
        nurseShift.dayOfWeek = dayOfWeekNum;
        nurseShift.weekStartDate = weekStart;
        
        console.log(`  💾 Guardando: enfermera ${nurseId}, turno ${actualShiftId}, día ${dayOfWeekNum}, semana ${weekStartStr}`);
        
        try {
          const saved = await nurseShiftRepo.save(nurseShift);
          savedShifts.push(saved);
          console.log(`  ✅ Turno guardado (ID BD: ${saved.id})`);
        } catch (saveError) {
          console.error(`  ❌ Error guardando turno:`, saveError);
          console.error(`  Detalles:`, {
            nurseId,
            shiftId: actualShiftId,
            dayOfWeek: dayOfWeekNum,
            weekStartDate: weekStartStr,
            error: saveError instanceof Error ? saveError.message : 'Error desconocido'
          });
          // Continuar con el siguiente turno en lugar de fallar completamente
        }
      }
      
      console.log(`  ✅ Enfermera ${nurseId}: ${savedShifts.length} turnos guardados hasta ahora`);
    }

    console.log(`✅ Guardados ${savedShifts.length} turnos en base de datos`);

    res.json({ 
      message: 'Programación semanal guardada exitosamente',
      shiftsCreated: savedShifts.length,
      weekStartDate: weekStart
    });
  } catch (error) {
    console.error('❌ Error al guardar programación semanal:', error);
    res.status(500).json({ message: 'Error al guardar programación semanal' });
  }
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

