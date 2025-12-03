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

    const shiftRepo = AppDataSource.getRepository(Shift);
    const shift = await shiftRepo.findOne({ where: { id: parseInt(id) } });

    if (!shift) {
      return res.status(404).json({ message: 'Turno no encontrado' });
    }

    if (startTime) shift.startTime = startTime;
    if (endTime) shift.endTime = endTime;

    await shiftRepo.save(shift);
    res.json({ message: 'Turno actualizado exitosamente', shift });
  } catch (error) {
    console.error('Error al actualizar turno:', error);
    res.status(500).json({ message: 'Error al actualizar turno' });
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
      if (dayName) {
        groupedByNurse[ns.nurseId][dayName] = ns.shift.type;
      }
    });

    res.json(Object.values(groupedByNurse));
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

    const weekStart = weekStartDate ? new Date(weekStartDate + 'T12:00:00') : getMonday(new Date());

    const allShifts = await shiftRepo.find();
    console.log('📋 Turnos disponibles:', allShifts.map(s => ({ id: s.id, type: s.type, name: s.name })));

    const shiftIdMap: { [key: string]: number } = {};
    allShifts.forEach(shift => {
      shiftIdMap[shift.type] = shift.id;
    });

    const savedShifts = [];
    
    for (const nurseSchedule of schedules) {
      const { nurseId, shifts: nurseShifts } = nurseSchedule;
      
      console.log(`👤 Procesando enfermera ID ${nurseId}:`, nurseShifts);
      
      try {
        const deleted = await nurseShiftRepo
          .createQueryBuilder()
          .delete()
          .from(NurseShift)
          .where('nurseId = :nurseId', { nurseId })
          .andWhere('DATE(weekStartDate) = DATE(:weekStartDate)', { weekStartDate: weekStart })
          .execute();
        
        console.log(`  🗑️ Eliminados ${deleted.affected || 0} turnos anteriores`);
      } catch (deleteError) {
        console.error(`  ⚠️ Error eliminando turnos anteriores:`, deleteError);
      }

      for (const shiftData of nurseShifts) {
        const { dayOfWeek, shiftId } = shiftData;
        
        console.log(`  📅 Procesando: día ${dayOfWeek}, turno ${shiftId}`);
        
        // Si shiftId es string (tipo), convertir a ID numérico
        let actualShiftId = shiftId;
        if (typeof shiftId === 'string') {
          actualShiftId = shiftIdMap[shiftId];
          console.log(`  🔄 Convertido '${shiftId}' → ID ${actualShiftId}`);
        }
        
        // Ignorar si es 'off' (descanso) - no se guarda en BD
        if (shiftId === 'off' || !actualShiftId) {
          console.log(`  ⏭️ Saltando: ${shiftId} (no se guarda en BD)`);
          continue;
        }
        
        const nurseShift = new NurseShift();
        nurseShift.nurseId = nurseId;
        nurseShift.shiftId = actualShiftId;
        nurseShift.dayOfWeek = dayOfWeek;
        nurseShift.weekStartDate = weekStart;
        
        console.log(`  💾 Guardando:`, { nurseId, shiftId: actualShiftId, dayOfWeek, weekStartDate: weekStart });
        
        const saved = await nurseShiftRepo.save(nurseShift);
        savedShifts.push(saved);
      }
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

