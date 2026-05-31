import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Shift } from '../entities/Shift';
import { NurseShift } from '../entities/NurseShift';
import { ShiftAttendance, ShiftAttendanceStatus } from '../entities/ShiftAttendance';
import { User, UserRole } from '../entities/User';
import { logger } from '../utils/logger';
import { patientAssignmentService } from '../services/patient-assignment.service';

export const getShifts = async (req: Request, res: Response) => {
  try {
    const shiftRepo = AppDataSource.getRepository(Shift);
    const shifts = await shiftRepo.find({
      where: { isActive: true },
      order: { id: 'ASC' }
    });
    res.json(shifts);
  } catch (error) {
    logger.error('Error al obtener turnos:', error);
    res.status(500).json({ message: 'Error al obtener turnos' });
  }
};

export const updateShift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    logger.info('🔄 Actualizando turno:', {
      id,
      startTime,
      endTime
    });

    const shiftId = parseInt(id);
    if (isNaN(shiftId)) {
      logger.error('❌ ID de turno inválido:', id);
      return res.status(400).json({ message: 'ID de turno inválido' });
    }

    const shiftRepo = AppDataSource.getRepository(Shift);
    const shift = await shiftRepo.findOne({ where: { id: shiftId } });

    if (!shift) {
      logger.error('❌ Turno no encontrado:', shiftId);
      return res.status(404).json({ message: 'Turno no encontrado' });
    }

    logger.info('📋 Turno encontrado:', {
      id: shift.id,
      type: shift.type,
      name: shift.name,
      startTimeActual: shift.startTime,
      endTimeActual: shift.endTime
    });

    // Validar formato de tiempo (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      logger.error('❌ Formato de hora de inicio inválido:', startTime);
      return res.status(400).json({ message: 'Formato de hora de inicio inválido. Use HH:MM' });
    }
    if (endTime && !timeRegex.test(endTime)) {
      logger.error('❌ Formato de hora de fin inválido:', endTime);
      return res.status(400).json({ message: 'Formato de hora de fin inválido. Use HH:MM' });
    }

    if (startTime) {
      shift.startTime = startTime;
      logger.info(`  ✏️ Hora de inicio actualizada: ${shift.startTime} → ${startTime}`);
    }
    if (endTime) {
      shift.endTime = endTime;
      logger.info(`  ✏️ Hora de fin actualizada: ${shift.endTime} → ${endTime}`);
    }

    await shiftRepo.save(shift);
    logger.info('✅ Turno guardado exitosamente:', {
      id: shift.id,
      type: shift.type,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime
    });

    res.json({ message: 'Turno actualizado exitosamente', shift });
  } catch (error) {
    logger.error('❌ Error al actualizar turno:', error);
    logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      message: 'Error al actualizar turno',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const { weekStartDate } = req.query;
    
    logger.info('📅 Buscando horarios para semana:', weekStartDate);
    
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
    
    logger.info(`📊 Encontrados ${nurseShifts.length} turnos asignados`);
    
    if (nurseShifts.length > 0) {
      logger.info(
        '📋 Primeros turnos encontrados:',
        nurseShifts.slice(0, 5).map(ns => ({
          nurseId: ns.nurseId,
          nurseName: ns.nurse
            ? `${ns.nurse.firstName} ${ns.nurse.lastName}`
            : '(sin enfermera)',
          dayOfWeek: ns.dayOfWeek,
          shiftType: ns.shift?.type,
          shiftId: ns.shiftId,
          weekStartDate: ns.weekStartDate,
        }))
      );
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
        logger.warn(`⚠️ Turno sin enfermera asociada:`, ns);
        return;
      }
      
      if (!ns.shift) {
        logger.warn(`⚠️ Turno sin shift asociado:`, ns);
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
        logger.info(`  📅 ${ns.nurse.firstName} ${ns.nurse.lastName} - ${dayName}: ${ns.shift.type} (shiftId: ${ns.shiftId})`);
      }
    });

    const result = Object.values(groupedByNurse);
    logger.info(`✅ Programación semanal procesada: ${result.length} enfermeras con turnos`);
    
    if (result.length > 0) {
      logger.info('📋 Primeros schedules procesados:', result.slice(0, 3));
    }
    
    res.json(result);
  } catch (error) {
    logger.error('Error al obtener programación semanal:', error);
    res.status(500).json({ message: 'Error al obtener programación semanal' });
  }
};

export const saveWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const { schedules, weekStartDate } = req.body;

    logger.info('📥 Recibiendo programación semanal:', { schedules, weekStartDate });

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
    logger.info('📅 Semana normalizada:', weekStartStr);

    const allShifts = await shiftRepo.find();
    logger.info('📋 Turnos disponibles en BD:', allShifts.map(s => ({ id: s.id, type: s.type, name: s.name })));

    const shiftIdMap: { [key: string]: number } = {};
    allShifts.forEach(shift => {
      shiftIdMap[shift.type] = shift.id;
    });
    logger.info('📋 Mapa de tipos a IDs:', shiftIdMap);

    const savedShifts = [];
    
    for (const nurseSchedule of schedules) {
      const { nurseId, shifts: nurseShifts } = nurseSchedule;
      
      if (!nurseId) {
        logger.warn('⚠️ Schedule sin nurseId, saltando...');
        continue;
      }
      
      logger.info(`\n👤 Procesando enfermera ID ${nurseId}:`);
      logger.info(`  Turnos a asignar: ${nurseShifts.length}`);
      
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
        
        logger.info(`  🗑️ Eliminados ${deleted.affected || 0} turnos anteriores para esta semana`);
      } catch (deleteError) {
        logger.error(`  ⚠️ Error eliminando turnos anteriores:`, deleteError);
        // Continuar aunque falle la eliminación
      }

      for (const shiftData of nurseShifts) {
        const { dayOfWeek, shiftId } = shiftData;
        
        logger.info(`  📅 Día ${dayOfWeek}, turno recibido: ${shiftId} (tipo: ${typeof shiftId})`);
        
        // Validar dayOfWeek primero
        if (dayOfWeek === undefined || dayOfWeek === null || isNaN(parseInt(String(dayOfWeek)))) {
          logger.warn(`  ⚠️ dayOfWeek inválido: ${dayOfWeek}`);
          continue;
        }
        
        const dayOfWeekNum = parseInt(String(dayOfWeek));
        if (dayOfWeekNum < 0 || dayOfWeekNum > 6) {
          logger.warn(`  ⚠️ dayOfWeek fuera de rango (0-6): ${dayOfWeekNum}`);
          continue;
        }
        
        // Si shiftId es string (tipo como 'morning', 'afternoon', 'night'), convertir a ID numérico
        let actualShiftId: number | null = null;
        
        if (typeof shiftId === 'string') {
          // Buscar en el mapa de tipos a IDs
          actualShiftId = shiftIdMap[shiftId];
          if (actualShiftId) {
            logger.info(`  🔄 Convertido tipo '${shiftId}' → ID ${actualShiftId}`);
          } else {
            logger.warn(`  ⚠️ Tipo de turno '${shiftId}' no encontrado en el mapa. Turnos disponibles:`, Object.keys(shiftIdMap));
            continue; // Saltar este turno si no se encuentra
          }
        } else if (typeof shiftId === 'number') {
          // Si ya es un número, verificar que exista
          const shiftExists = allShifts.find(s => s.id === shiftId);
          if (shiftExists) {
            actualShiftId = shiftId;
            logger.info(`  ✅ ID numérico ${shiftId} válido`);
          } else {
            logger.warn(`  ⚠️ ID de turno ${shiftId} no existe en BD`);
            continue;
          }
        } else {
          logger.warn(`  ⚠️ shiftId tiene tipo inválido: ${typeof shiftId}`);
          continue;
        }
        
        // Ignorar si es 'off' (descanso) o si no se pudo obtener un ID válido
        if (shiftId === 'off' || !actualShiftId) {
          logger.info(`  ⏭️ Saltando: ${shiftId} (descanso o inválido)`);
          continue;
        }
        
        const nurseShift = new NurseShift();
        nurseShift.nurseId = nurseId;
        nurseShift.shiftId = actualShiftId;
        nurseShift.dayOfWeek = dayOfWeekNum;
        nurseShift.weekStartDate = weekStart;
        
        logger.info(`  💾 Guardando: enfermera ${nurseId}, turno ${actualShiftId}, día ${dayOfWeekNum}, semana ${weekStartStr}`);
        
        try {
          const saved = await nurseShiftRepo.save(nurseShift);
          savedShifts.push(saved);
          logger.info(`  ✅ Turno guardado (ID BD: ${saved.id})`);
        } catch (saveError) {
          logger.error(`  ❌ Error guardando turno:`, saveError);
          logger.error(`  Detalles:`, {
            nurseId,
            shiftId: actualShiftId,
            dayOfWeek: dayOfWeekNum,
            weekStartDate: weekStartStr,
            error: saveError instanceof Error ? saveError.message : 'Error desconocido'
          });
          // Continuar con el siguiente turno en lugar de fallar completamente
        }
      }
      
      logger.info(`  ✅ Enfermera ${nurseId}: ${savedShifts.length} turnos guardados hasta ahora`);
    }

    logger.info(`✅ Guardados ${savedShifts.length} turnos en base de datos`);

    res.json({ 
      message: 'Programación semanal guardada exitosamente',
      shiftsCreated: savedShifts.length,
      weekStartDate: weekStart
    });
  } catch (error) {
    logger.error('❌ Error al guardar programación semanal:', error);
    res.status(500).json({ message: 'Error al guardar programación semanal' });
  }
};

export const getShiftAttendance = async (req: Request, res: Response) => {
  try {
    const { date, shiftId } = req.query;

    if (!date || !shiftId) {
      return res.status(400).json({ message: 'date y shiftId son requeridos' });
    }

    const attendanceRepo = AppDataSource.getRepository(ShiftAttendance);
    const nurseRepo = AppDataSource.getRepository(User);

    const shiftIdNumber = parseInt(String(shiftId), 10);
    if (Number.isNaN(shiftIdNumber)) {
      return res.status(400).json({ message: 'shiftId inválido' });
    }

    const nurses = await nurseRepo.find({
      where: { role: UserRole.NURSE, isActive: true },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });

    const attendance = await attendanceRepo.find({
      where: {
        date: new Date(`${date}T00:00:00`),
        shiftId: shiftIdNumber,
      },
    });

    const attendanceMap = new Map<number, ShiftAttendance>();
    attendance.forEach((row) => attendanceMap.set(row.nurseId, row));

    const items = nurses.map((nurse) => {
      const row = attendanceMap.get(nurse.id);
      return {
        nurseId: nurse.id,
        nurseName: `${nurse.firstName} ${nurse.lastName}`,
        status: row?.status || ShiftAttendanceStatus.ABSENT,
        checkInAt: row?.checkInAt || null,
        checkOutAt: row?.checkOutAt || null,
        notes: row?.notes || null,
        assignedAreaId: nurse.assignedAreaId || null,
      };
    });

    res.json(items);
  } catch (error) {
    logger.error('Error al obtener asistencia del turno:', error);
    res.status(500).json({ message: 'Error al obtener asistencia del turno' });
  }
};

export const saveShiftAttendance = async (req: Request, res: Response) => {
  try {
    const { date, shiftId, attendance, autoHandoff } = req.body;
    const authReq = req as any;
    const recordedBy = authReq.user?.id || null;

    if (!date || !shiftId || !Array.isArray(attendance)) {
      return res.status(400).json({ message: 'date, shiftId y attendance son requeridos' });
    }

    const shiftIdNumber = parseInt(String(shiftId), 10);
    if (Number.isNaN(shiftIdNumber)) {
      return res.status(400).json({ message: 'shiftId inválido' });
    }

    const validStatuses = new Set(Object.values(ShiftAttendanceStatus));
    const attendanceRepo = AppDataSource.getRepository(ShiftAttendance);
    const dateValue = new Date(`${date}T00:00:00`);

    const savedRows: ShiftAttendance[] = [];
    for (const item of attendance) {
      const nurseId = parseInt(String(item?.nurseId), 10);
      const status = String(item?.status || '').toLowerCase() as ShiftAttendanceStatus;

      if (Number.isNaN(nurseId) || !validStatuses.has(status)) {
        continue;
      }

      let row = await attendanceRepo.findOne({
        where: { date: dateValue, shiftId: shiftIdNumber, nurseId },
      });

      if (!row) {
        row = attendanceRepo.create({
          date: dateValue,
          shiftId: shiftIdNumber,
          nurseId,
        });
      }

      const now = new Date();
      row.status = status;
      if (status === ShiftAttendanceStatus.PRESENT || status === ShiftAttendanceStatus.LATE) {
        row.checkInAt = item?.checkInAt ? new Date(item.checkInAt) : row.checkInAt || now;
        row.checkOutAt = null;
      } else {
        row.checkInAt = null;
        row.checkOutAt = null;
      }
      row.notes = item?.notes || null;
      row.recordedBy = recordedBy;
      savedRows.push(await attendanceRepo.save(row));
    }

    const response: any = {
      message: 'Asistencia guardada exitosamente',
      saved: savedRows.length,
    };

    if (autoHandoff === true) {
      response.handoff = await patientAssignmentService.autoAssignForShift({
        date: String(date),
        shiftId: shiftIdNumber,
      });
    }

    void import('../services/notification-jobs.service').then(({ runInAppNotificationJobs }) =>
      runInAppNotificationJobs(),
    );

    res.json(response);
  } catch (error) {
    logger.error('Error al guardar asistencia del turno:', error);
    res.status(500).json({ message: 'Error al guardar asistencia del turno' });
  }
};

export const runShiftHandoff = async (req: Request, res: Response) => {
  try {
    const date = typeof req.body?.date === 'string' ? req.body.date : undefined;
    const shiftIdRaw = req.body?.shiftId;
    const shiftId =
      shiftIdRaw === null || shiftIdRaw === undefined || shiftIdRaw === ''
        ? undefined
        : parseInt(String(shiftIdRaw), 10);
    if (shiftIdRaw !== undefined && shiftIdRaw !== null && shiftIdRaw !== '' && Number.isNaN(shiftId)) {
      return res.status(400).json({ message: 'shiftId invalido' });
    }

    const result = await patientAssignmentService.autoAssignForShift({
      date,
      shiftId: shiftId ?? undefined,
    });
    res.json({
      message: 'Handoff ejecutado correctamente',
      ...result,
    });
  } catch (error) {
    logger.error('Error al ejecutar handoff de turno:', error);
    res.status(500).json({ message: 'Error al ejecutar handoff de turno' });
  }
};

export const getPresentNursesByShift = async (req: Request, res: Response) => {
  try {
    const { date, shiftId } = req.query;
    if (!date || !shiftId) {
      return res.status(400).json({ message: 'date y shiftId son requeridos' });
    }

    const shiftIdNumber = parseInt(String(shiftId), 10);
    if (Number.isNaN(shiftIdNumber)) {
      return res.status(400).json({ message: 'shiftId inválido' });
    }

    const attendanceRepo = AppDataSource.getRepository(ShiftAttendance);
    const presentRows = await attendanceRepo.find({
      where: {
        date: new Date(`${date}T00:00:00`),
        shiftId: shiftIdNumber,
      },
      relations: ['nurse'],
    });

    const activeStatuses = new Set<ShiftAttendanceStatus>([
      ShiftAttendanceStatus.PRESENT,
      ShiftAttendanceStatus.LATE,
    ]);

    const nurses = presentRows
      .filter((row) => activeStatuses.has(row.status) && row.nurse?.isActive && row.nurse?.role === UserRole.NURSE)
      .map((row) => ({
        nurseId: row.nurseId,
        nurseName: `${row.nurse.firstName} ${row.nurse.lastName}`,
        status: row.status,
        assignedAreaId: row.nurse.assignedAreaId || null,
      }));

    res.json(nurses);
  } catch (error) {
    logger.error('Error al obtener enfermeras presentes:', error);
    res.status(500).json({ message: 'Error al obtener enfermeras presentes' });
  }
};

export const getShiftAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, shiftId, limit } = req.query;
    const attendanceRepo = AppDataSource.getRepository(ShiftAttendance);

    const qb = attendanceRepo
      .createQueryBuilder('att')
      .leftJoinAndSelect('att.nurse', 'nurse')
      .leftJoinAndSelect('att.shift', 'shift')
      .leftJoinAndSelect('att.recordedByUser', 'recordedByUser')
      .where('att.status != :absentStatus', { absentStatus: ShiftAttendanceStatus.ABSENT })
      .orderBy('att.date', 'DESC')
      .addOrderBy('shift.id', 'ASC')
      .addOrderBy('nurse.firstName', 'ASC');

    if (dateFrom) {
      qb.andWhere('att.date >= :dateFrom', { dateFrom: String(dateFrom) });
    }
    if (dateTo) {
      qb.andWhere('att.date <= :dateTo', { dateTo: String(dateTo) });
    }
    if (shiftId) {
      const shiftIdNumber = parseInt(String(shiftId), 10);
      if (!Number.isNaN(shiftIdNumber)) {
        qb.andWhere('att.shiftId = :shiftId', { shiftId: shiftIdNumber });
      }
    }

    const take = Math.min(Math.max(parseInt(String(limit || '200'), 10), 1), 1000);
    qb.take(take);

    const rows = await qb.getMany();
    const items = rows.map((row) => ({
      id: row.id,
      date: row.date,
      shiftId: row.shiftId,
      shiftName: row.shift?.name || '',
      shiftTime: row.shift ? `${row.shift.startTime} - ${row.shift.endTime}` : '',
      nurseId: row.nurseId,
      nurseName: row.nurse ? `${row.nurse.firstName} ${row.nurse.lastName}` : `Enfermera #${row.nurseId}`,
      assignedAreaId: row.nurse?.assignedAreaId ?? null,
      status: row.status,
      checkInAt: row.checkInAt,
      checkOutAt: row.checkOutAt,
      notes: row.notes,
      recordedBy: row.recordedByUser
        ? `${row.recordedByUser.firstName} ${row.recordedByUser.lastName}`
        : null,
      recordedAt: row.updatedAt,
    }));

    res.json(items);
  } catch (error) {
    logger.error('Error al obtener historial de turnos:', error);
    res.status(500).json({ message: 'Error al obtener historial de turnos' });
  }
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

