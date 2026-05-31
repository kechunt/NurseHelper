import type { Request, Response } from 'express';

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { Shift } from '../../../entities/Shift';
import { NurseShift } from '../../../entities/NurseShift';
import { User, UserRole } from '../../../entities/User';
import { ShiftAttendance, ShiftAttendanceStatus } from '../../../entities/ShiftAttendance';
import { AppDataSource } from '../../../data-source';
import { logger } from '../../../utils/logger';
import {
  getPresentNursesByShift,
  getShiftAttendance,
  getShiftAttendanceHistory,
  getShifts,
  getWeeklySchedule,
  saveShiftAttendance,
  saveWeeklySchedule,
  updateShift,
} from '../../../controllers/shifts.controller';

describe(
  'shifts.controller (getShifts / updateShift / getWeeklySchedule / save / asistencia lectura+escritura)',
  () => {
  const shiftRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    shiftRepo.find.mockResolvedValue([]);
    shiftRepo.findOne.mockResolvedValue(null);
    shiftRepo.save.mockImplementation((s: unknown) => Promise.resolve(s));
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === Shift) return shiftRepo;
      return shiftRepo;
    });
  });

  function resMocks(): { json: jest.Mock; status: jest.Mock; res: Response } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status, res: { status, json } as unknown as Response };
  }

  describe('getShifts', () => {
    it('devuelve turnos activos ordenados por id', async () => {
      const shifts = [{ id: 1, name: 'Mañana', isActive: true }];
      shiftRepo.find.mockResolvedValueOnce(shifts);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getShifts({} as Request, res);
      expect(shiftRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { id: 'ASC' },
      });
      expect(json).toHaveBeenCalledWith(shifts);
    });

    it('responde 500 si find falla', async () => {
      shiftRepo.find.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getShifts({} as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener turnos' });
    });
  });

  describe('updateShift', () => {
    it('responde 400 si id no es numérico', async () => {
      const { status, json, res } = resMocks();
      await updateShift({ params: { id: 'abc' }, body: {} } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'ID de turno inválido' });
      expect(shiftRepo.save).not.toHaveBeenCalled();
    });

    it('responde 404 si el turno no existe', async () => {
      const { status, json, res } = resMocks();
      await updateShift({ params: { id: '99' }, body: { startTime: '08:00' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith({ message: 'Turno no encontrado' });
    });

    it('responde 400 si startTime no cumple HH:MM', async () => {
      shiftRepo.findOne.mockResolvedValueOnce({
        id: 1,
        name: 'T',
        type: 'morning',
        startTime: '07:00',
        endTime: '15:00',
      });
      const { status, json, res } = resMocks();
      await updateShift(
        { params: { id: '1' }, body: { startTime: '25:99' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        message: 'Formato de hora de inicio inválido. Use HH:MM',
      });
    });

    it('responde 400 si endTime no cumple HH:MM', async () => {
      shiftRepo.findOne.mockResolvedValueOnce({
        id: 1,
        name: 'T',
        type: 'morning',
        startTime: '07:00',
        endTime: '15:00',
      });
      const { status, json, res } = resMocks();
      await updateShift({ params: { id: '1' }, body: { endTime: 'bad' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        message: 'Formato de hora de fin inválido. Use HH:MM',
      });
    });

    it('actualiza horas y responde JSON', async () => {
      const shift = {
        id: 2,
        name: 'Tarde',
        type: 'afternoon',
        startTime: '14:00',
        endTime: '22:00',
      };
      shiftRepo.findOne.mockResolvedValueOnce({ ...shift });
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await updateShift(
        {
          params: { id: '2' },
          body: { startTime: '15:30', endTime: '23:00' },
        } as unknown as Request,
        res
      );
      expect(shiftRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 2,
          startTime: '15:30',
          endTime: '23:00',
        })
      );
      expect(json).toHaveBeenCalledWith({
        message: 'Turno actualizado exitosamente',
        shift: expect.objectContaining({ startTime: '15:30', endTime: '23:00' }),
      });
    });

    it('responde 500 si save falla en updateShift', async () => {
      shiftRepo.findOne.mockResolvedValueOnce({
        id: 2,
        name: 'Tarde',
        type: 'afternoon',
        startTime: '14:00',
        endTime: '22:00',
      });
      shiftRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await updateShift(
        {
          params: { id: '2' },
          body: { startTime: '15:30' },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        message: 'Error al actualizar turno',
        error: 'db',
      });
    });
  });

  describe('getWeeklySchedule', () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    const nurseShiftRepo = {
      createQueryBuilder: jest.fn(() => qb),
    };

    beforeEach(() => {
      qb.leftJoinAndSelect.mockClear();
      qb.where.mockClear();
      qb.getMany.mockReset();
      qb.leftJoinAndSelect.mockReturnThis();
      qb.where.mockReturnThis();
      qb.getMany.mockResolvedValue([]);
      nurseShiftRepo.createQueryBuilder.mockReturnValue(qb);
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
        if (entity === NurseShift) return nurseShiftRepo;
        if (entity === Shift) return shiftRepo;
        return shiftRepo;
      });
    });

    it('construye query con joins y sin filtro de semana si no hay weekStartDate', async () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getWeeklySchedule({ query: {} } as unknown as Request, res);
      expect(nurseShiftRepo.createQueryBuilder).toHaveBeenCalledWith('ns');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('ns.nurse', 'nurse');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('ns.shift', 'shift');
      expect(qb.where).not.toHaveBeenCalled();
      expect(qb.getMany).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith([]);
    });

    it('aplica filtro de rango de semana cuando weekStartDate está en query', async () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getWeeklySchedule({ query: { weekStartDate: '2026-01-06' } } as unknown as Request, res);
      expect(qb.where).toHaveBeenCalledWith(
        'ns.weekStartDate >= :startDate AND ns.weekStartDate < :endDate',
        { startDate: '2026-01-06', endDate: '2026-01-13' }
      );
      expect(json).toHaveBeenCalledWith([]);
    });

    it('agrupa por enfermera y día con tipo de turno', async () => {
      qb.getMany.mockResolvedValueOnce([
        {
          nurseId: 1,
          dayOfWeek: 1,
          shiftId: 10,
          nurse: { firstName: 'Ana', lastName: 'López' },
          shift: { type: 'morning' },
        },
      ]);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getWeeklySchedule({ query: {} } as unknown as Request, res);
      expect(json).toHaveBeenCalledWith([
        expect.objectContaining({
          nurseId: 1,
          nurseName: 'Ana López',
          monday: 'morning',
          tuesday: '',
          wednesday: '',
          thursday: '',
          friday: '',
          saturday: '',
          sunday: '',
        }),
      ]);
    });

    it('no rellena día si dayOfWeek no está en el mapa (aunque nurse y shift existan)', async () => {
      qb.getMany.mockResolvedValueOnce([
        {
          nurseId: 1,
          dayOfWeek: 9,
          shiftId: 1,
          nurse: { firstName: 'Ana', lastName: 'López' },
          shift: { type: 'morning' },
        },
      ]);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getWeeklySchedule({ query: {} } as unknown as Request, res);
      expect(json).toHaveBeenCalledWith([
        expect.objectContaining({
          nurseId: 1,
          nurseName: 'Ana López',
          monday: '',
          tuesday: '',
          wednesday: '',
          thursday: '',
          friday: '',
          saturday: '',
          sunday: '',
        }),
      ]);
    });

    it('omite filas sin nurse o sin shift en la agrupación', async () => {
      qb.getMany.mockResolvedValueOnce([
        { nurseId: 1, dayOfWeek: 1, nurse: null, shift: { type: 'morning' } },
        {
          nurseId: 2,
          dayOfWeek: 2,
          nurse: { firstName: 'B', lastName: 'C' },
          shift: null,
        },
      ]);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getWeeklySchedule({ query: {} } as unknown as Request, res);
      expect(json).toHaveBeenCalledWith([]);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('responde 500 si getMany falla', async () => {
      qb.getMany.mockRejectedValueOnce(new Error('db'));
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      await getWeeklySchedule({ query: {} } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener programación semanal' });
    });
  });

  describe('saveWeeklySchedule', () => {
    const qbDel = {
      delete: jest.fn(),
      from: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      execute: jest.fn(),
    };
    const nurseShiftRepoSave = {
      createQueryBuilder: jest.fn(() => qbDel),
      save: jest.fn(),
    };

    beforeEach(() => {
      qbDel.delete.mockReturnValue(qbDel);
      qbDel.from.mockReturnValue(qbDel);
      qbDel.where.mockReturnValue(qbDel);
      qbDel.andWhere.mockReturnValue(qbDel);
      qbDel.execute.mockResolvedValue({ affected: 0 });
      nurseShiftRepoSave.save.mockImplementation((row: Record<string, unknown>) =>
        Promise.resolve({ ...row, id: 42 })
      );
      shiftRepo.find.mockResolvedValue([{ id: 10, type: 'morning', name: 'Mañana' }]);
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
        if (entity === NurseShift) return nurseShiftRepoSave;
        if (entity === Shift) return shiftRepo;
        return shiftRepo;
      });
    });

    it('responde 400 si schedules no es un array', async () => {
      const { status, json, res } = resMocks();
      await saveWeeklySchedule({ body: { schedules: null } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'Datos de programación inválidos' });
    });

    it('responde 400 si schedules no está definido', async () => {
      const { status, json, res } = resMocks();
      await saveWeeklySchedule({ body: {} } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'Datos de programación inválidos' });
    });

    it('lista vacía: guarda 0 turnos y responde éxito', async () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await saveWeeklySchedule({ body: { schedules: [] } } as unknown as Request, res);
      expect(shiftRepo.find).toHaveBeenCalled();
      expect(nurseShiftRepoSave.save).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        message: 'Programación semanal guardada exitosamente',
        shiftsCreated: 0,
        weekStartDate: expect.any(Date),
      });
    });

    it('persiste turno cuando shiftId es tipo string conocido', async () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await saveWeeklySchedule(
        {
          body: {
            weekStartDate: '2026-01-06',
            schedules: [{ nurseId: 7, shifts: [{ dayOfWeek: 1, shiftId: 'morning' }] }],
          },
        } as unknown as Request,
        res
      );
      expect(nurseShiftRepoSave.createQueryBuilder).toHaveBeenCalled();
      expect(qbDel.execute).toHaveBeenCalled();
      expect(nurseShiftRepoSave.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nurseId: 7,
          shiftId: 10,
          dayOfWeek: 1,
        })
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ shiftsCreated: 1, message: expect.any(String) })
      );
    });

    it('responde 500 si shiftRepo.find falla', async () => {
      shiftRepo.find.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await saveWeeklySchedule({ body: { schedules: [] } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al guardar programación semanal' });
    });
  });

  describe('getShiftAttendance', () => {
    const userRepo = { find: jest.fn() };
    const attendanceRepo = { find: jest.fn() };

    beforeEach(() => {
      userRepo.find.mockResolvedValue([
        { id: 1, firstName: 'Ana', lastName: 'López', assignedAreaId: 3 },
      ]);
      attendanceRepo.find.mockResolvedValue([]);
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
        if (entity === User) return userRepo;
        if (entity === ShiftAttendance) return attendanceRepo;
        if (entity === Shift) return shiftRepo;
        return shiftRepo;
      });
    });

    it('responde 400 si falta date o shiftId', async () => {
      const { status, json, res } = resMocks();
      await getShiftAttendance({ query: { date: '2026-06-01' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'date y shiftId son requeridos' });
    });

    it('responde 400 si shiftId no es numérico', async () => {
      const { status, json, res } = resMocks();
      await getShiftAttendance(
        { query: { date: '2026-06-01', shiftId: 'x' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'shiftId inválido' });
    });

    it('lista enfermeras activas y marca ausente si no hay fila de asistencia', async () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getShiftAttendance(
        { query: { date: '2026-06-01', shiftId: '2' } } as unknown as Request,
        res
      );
      expect(userRepo.find).toHaveBeenCalledWith({
        where: { role: UserRole.NURSE, isActive: true },
        order: { firstName: 'ASC', lastName: 'ASC' },
      });
      expect(attendanceRepo.find).toHaveBeenCalledWith({
        where: {
          date: expect.any(Date),
          shiftId: 2,
        },
      });
      expect(json).toHaveBeenCalledWith([
        expect.objectContaining({
          nurseId: 1,
          nurseName: 'Ana López',
          status: ShiftAttendanceStatus.ABSENT,
          checkInAt: null,
          checkOutAt: null,
          notes: null,
          assignedAreaId: 3,
        }),
      ]);
    });

    it('usa estado y horas de la fila de asistencia cuando existe', async () => {
      const checkIn = new Date('2026-06-01T08:15:00.000Z');
      attendanceRepo.find.mockResolvedValueOnce([
        {
          nurseId: 1,
          status: ShiftAttendanceStatus.PRESENT,
          checkInAt: checkIn,
          checkOutAt: null,
          notes: 'OK',
        },
      ]);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getShiftAttendance(
        { query: { date: '2026-06-01', shiftId: '2' } } as unknown as Request,
        res
      );
      expect(json).toHaveBeenCalledWith([
        expect.objectContaining({
          nurseId: 1,
          status: ShiftAttendanceStatus.PRESENT,
          checkInAt: checkIn,
          notes: 'OK',
        }),
      ]);
    });

    it('responde 500 si find de asistencia falla', async () => {
      attendanceRepo.find.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getShiftAttendance(
        { query: { date: '2026-06-01', shiftId: '2' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener asistencia del turno' });
    });

    it('responde 500 si find de enfermeras falla', async () => {
      userRepo.find.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getShiftAttendance(
        { query: { date: '2026-06-01', shiftId: '2' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener asistencia del turno' });
    });
  });

  describe('saveShiftAttendance', () => {
    const attendanceRepoMut = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    beforeEach(() => {
      attendanceRepoMut.findOne.mockResolvedValue(null);
      attendanceRepoMut.create.mockImplementation((o: Record<string, unknown>) => ({ ...o }));
      attendanceRepoMut.save.mockImplementation((row: Record<string, unknown>) =>
        Promise.resolve({ ...row, id: 99 })
      );
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
        if (entity === ShiftAttendance) return attendanceRepoMut;
        if (entity === Shift) return shiftRepo;
        return shiftRepo;
      });
    });

    it('responde 400 si falta date, shiftId o attendance no es array', async () => {
      const { status, json, res } = resMocks();
      await saveShiftAttendance(
        { body: { date: '2026-06-01', shiftId: 1 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        message: 'date, shiftId y attendance son requeridos',
      });
    });

    it('responde 400 si shiftId no es numérico', async () => {
      const { status, json, res } = resMocks();
      await saveShiftAttendance(
        {
          body: { date: '2026-06-01', shiftId: 'no', attendance: [] },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'shiftId inválido' });
    });

    it('attendance vacío: saved 0 sin llamar a save', async () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await saveShiftAttendance(
        { body: { date: '2026-06-01', shiftId: '2', attendance: [] } } as unknown as Request,
        res
      );
      expect(attendanceRepoMut.save).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        message: 'Asistencia guardada exitosamente',
        saved: 0,
      });
    });

    it('omite ítems con nurseId o status inválidos', async () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await saveShiftAttendance(
        {
          body: {
            date: '2026-06-01',
            shiftId: '2',
            attendance: [
              { nurseId: 'xx', status: 'present' },
              { nurseId: 1, status: 'not-a-status' },
            ],
          },
        } as unknown as Request,
        res
      );
      expect(attendanceRepoMut.save).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ saved: 0, message: expect.any(String) })
      );
    });

    it('crea fila nueva con recordedBy cuando no existe registro', async () => {
      attendanceRepoMut.findOne.mockResolvedValueOnce(null);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await saveShiftAttendance(
        {
          body: {
            date: '2026-06-10',
            shiftId: '4',
            attendance: [{ nurseId: 8, status: 'absent', notes: 'Baja' }],
          },
          user: { id: 200 },
        } as unknown as Request,
        res
      );
      expect(attendanceRepoMut.create).toHaveBeenCalledWith({
        date: expect.any(Date),
        shiftId: 4,
        nurseId: 8,
      });
      expect(attendanceRepoMut.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nurseId: 8,
          status: ShiftAttendanceStatus.ABSENT,
          checkInAt: null,
          checkOutAt: null,
          notes: 'Baja',
          recordedBy: 200,
        })
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ saved: 1, message: expect.any(String) })
      );
    });

    it('actualiza fila existente sin create', async () => {
      const existing = {
        nurseId: 8,
        shiftId: 4,
        date: new Date('2026-06-10T00:00:00'),
        status: ShiftAttendanceStatus.ABSENT,
        checkInAt: null as Date | null,
        checkOutAt: null as Date | null,
      };
      attendanceRepoMut.findOne.mockResolvedValueOnce(existing);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await saveShiftAttendance(
        {
          body: {
            date: '2026-06-10',
            shiftId: '4',
            attendance: [{ nurseId: 8, status: 'present', checkInAt: '2026-06-10T09:00:00.000Z' }],
          },
          user: { id: 1 },
        } as unknown as Request,
        res
      );
      expect(attendanceRepoMut.create).not.toHaveBeenCalled();
      expect(attendanceRepoMut.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ShiftAttendanceStatus.PRESENT,
          checkInAt: new Date('2026-06-10T09:00:00.000Z'),
          checkOutAt: null,
          recordedBy: 1,
        })
      );
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ saved: 1 }));
    });

    it('responde 500 si save falla', async () => {
      attendanceRepoMut.findOne.mockResolvedValueOnce(null);
      attendanceRepoMut.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await saveShiftAttendance(
        {
          body: {
            date: '2026-06-01',
            shiftId: '2',
            attendance: [{ nurseId: 1, status: 'late' }],
          },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al guardar asistencia del turno' });
    });

    it('responde 500 si findOne falla', async () => {
      attendanceRepoMut.findOne.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await saveShiftAttendance(
        {
          body: {
            date: '2026-06-01',
            shiftId: '2',
            attendance: [{ nurseId: 1, status: 'late' }],
          },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al guardar asistencia del turno' });
    });
  });

  describe('getPresentNursesByShift', () => {
    const attendanceRepoPresent = { find: jest.fn() };

    beforeEach(() => {
      attendanceRepoPresent.find.mockResolvedValue([]);
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
        if (entity === ShiftAttendance) return attendanceRepoPresent;
        if (entity === Shift) return shiftRepo;
        return shiftRepo;
      });
    });

    it('responde 400 si falta date o shiftId', async () => {
      const { status, json, res } = resMocks();
      await getPresentNursesByShift({ query: { date: '2026-06-01' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'date y shiftId son requeridos' });
    });

    it('responde 400 si shiftId no es numérico', async () => {
      const { status, json, res } = resMocks();
      await getPresentNursesByShift(
        { query: { date: '2026-06-01', shiftId: 'bad' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'shiftId inválido' });
    });

    it('solo incluye enfermeras activas con estado present o late', async () => {
      attendanceRepoPresent.find.mockResolvedValueOnce([
        {
          nurseId: 1,
          status: ShiftAttendanceStatus.PRESENT,
          nurse: {
            id: 1,
            firstName: 'Ana',
            lastName: 'López',
            isActive: true,
            role: UserRole.NURSE,
            assignedAreaId: 9,
          },
        },
        {
          nurseId: 2,
          status: ShiftAttendanceStatus.ABSENT,
          nurse: {
            id: 2,
            firstName: 'B',
            lastName: 'C',
            isActive: true,
            role: UserRole.NURSE,
            assignedAreaId: null,
          },
        },
        {
          nurseId: 3,
          status: ShiftAttendanceStatus.LATE,
          nurse: {
            id: 3,
            firstName: 'D',
            lastName: 'E',
            isActive: false,
            role: UserRole.NURSE,
            assignedAreaId: 1,
          },
        },
      ]);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getPresentNursesByShift(
        { query: { date: '2026-06-10', shiftId: '2' } } as unknown as Request,
        res
      );
      expect(attendanceRepoPresent.find).toHaveBeenCalledWith({
        where: {
          date: expect.any(Date),
          shiftId: 2,
        },
        relations: ['nurse'],
      });
      expect(json).toHaveBeenCalledWith([
        {
          nurseId: 1,
          nurseName: 'Ana López',
          status: ShiftAttendanceStatus.PRESENT,
          assignedAreaId: 9,
        },
      ]);
    });

    it('responde 500 si find falla', async () => {
      attendanceRepoPresent.find.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getPresentNursesByShift(
        { query: { date: '2026-06-01', shiftId: '1' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener enfermeras presentes' });
    });
  });

  describe('getShiftAttendanceHistory', () => {
    const qbHist = {
      leftJoinAndSelect: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      addOrderBy: jest.fn(),
      andWhere: jest.fn(),
      take: jest.fn(),
      getMany: jest.fn(),
    };
    const attendanceRepoHist = {
      createQueryBuilder: jest.fn(() => qbHist),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      [
        qbHist.leftJoinAndSelect,
        qbHist.where,
        qbHist.orderBy,
        qbHist.addOrderBy,
        qbHist.andWhere,
        qbHist.take,
      ].forEach((m) => (m as jest.Mock).mockReturnValue(qbHist));
      qbHist.getMany.mockResolvedValue([]);
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
        if (entity === ShiftAttendance) return attendanceRepoHist;
        if (entity === Shift) return shiftRepo;
        return shiftRepo;
      });
    });

    it('construye query base, take por defecto 200 y devuelve items mapeados', async () => {
      const updatedAt = new Date('2026-01-15T10:00:00.000Z');
      qbHist.getMany.mockResolvedValueOnce([
        {
          id: 11,
          date: new Date('2026-01-10'),
          shiftId: 2,
          nurseId: 5,
          status: ShiftAttendanceStatus.LATE,
          checkInAt: null,
          checkOutAt: null,
          notes: 'Tarde',
          updatedAt,
          shift: { name: 'Mañana', startTime: '08:00', endTime: '16:00' },
          nurse: { firstName: 'Ana', lastName: 'Ruiz' },
          recordedByUser: { firstName: 'Sup', lastName: 'Uno' },
        },
      ]);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getShiftAttendanceHistory({ query: {} } as unknown as Request, res);
      expect(attendanceRepoHist.createQueryBuilder).toHaveBeenCalledWith('att');
      expect(qbHist.leftJoinAndSelect).toHaveBeenCalledWith('att.nurse', 'nurse');
      expect(qbHist.take).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith([
        {
          id: 11,
          date: expect.any(Date),
          shiftId: 2,
          shiftName: 'Mañana',
          shiftTime: '08:00 - 16:00',
          nurseId: 5,
          nurseName: 'Ana Ruiz',
          assignedAreaId: null,
          status: ShiftAttendanceStatus.LATE,
          checkInAt: null,
          checkOutAt: null,
          notes: 'Tarde',
          recordedBy: 'Sup Uno',
          recordedAt: updatedAt,
        },
      ]);
    });

    it('añade andWhere para dateFrom, dateTo y shiftId numérico', async () => {
      qbHist.getMany.mockResolvedValueOnce([]);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getShiftAttendanceHistory(
        {
          query: { dateFrom: '2026-01-01', dateTo: '2026-01-31', shiftId: '3', limit: '50' },
        } as unknown as Request,
        res
      );
      expect(qbHist.andWhere).toHaveBeenCalledWith('att.date >= :dateFrom', { dateFrom: '2026-01-01' });
      expect(qbHist.andWhere).toHaveBeenCalledWith('att.date <= :dateTo', { dateTo: '2026-01-31' });
      expect(qbHist.andWhere).toHaveBeenCalledWith('att.shiftId = :shiftId', { shiftId: 3 });
      expect(qbHist.take).toHaveBeenCalledWith(50);
      expect(json).toHaveBeenCalledWith([]);
    });

    it('acota limit al máximo 1000', async () => {
      qbHist.getMany.mockResolvedValueOnce([]);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getShiftAttendanceHistory({ query: { limit: '9999' } } as unknown as Request, res);
      expect(qbHist.take).toHaveBeenCalledWith(1000);
      expect(json).toHaveBeenCalledWith([]);
    });

    it('mapea enfermera ausente en join como etiqueta por id', async () => {
      qbHist.getMany.mockResolvedValueOnce([
        {
          id: 2,
          date: new Date('2026-02-01'),
          shiftId: 1,
          nurseId: 99,
          status: ShiftAttendanceStatus.JUSTIFIED,
          checkInAt: null,
          checkOutAt: null,
          notes: null,
          updatedAt: new Date(),
          shift: null,
          nurse: null,
          recordedByUser: null,
        },
      ]);
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await getShiftAttendanceHistory({ query: {} } as unknown as Request, res);
      expect(json).toHaveBeenCalledWith([
        expect.objectContaining({
          nurseId: 99,
          nurseName: 'Enfermera #99',
          shiftName: '',
          shiftTime: '',
          recordedBy: null,
        }),
      ]);
    });

    it('responde 500 si getMany falla', async () => {
      qbHist.getMany.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getShiftAttendanceHistory({ query: {} } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener historial de turnos' });
    });
  });
});
