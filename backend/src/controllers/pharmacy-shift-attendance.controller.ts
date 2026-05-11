import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getPharmacyShiftAttendanceRows,
  getPharmacyShiftAttendanceSummaryForDate,
  listActiveShiftsForPharmacy,
  savePharmacyShiftAttendance,
} from '../services/pharmacy-shift-attendance.service';
import { logger } from '../utils/logger';

export const getPharmacyWorkShifts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const shifts = await listActiveShiftsForPharmacy();
    res.json(shifts);
  } catch (error) {
    logger.error('Error al listar turnos para farmacia:', error);
    res.status(500).json({ message: 'Error al obtener turnos' });
  }
};

export const getPharmacyShiftAttendanceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.query;
    if (!date) {
      res.status(400).json({ message: 'date es requerido (YYYY-MM-DD)' });
      return;
    }
    const summary = await getPharmacyShiftAttendanceSummaryForDate(String(date));
    res.json({ date: String(date), shifts: summary });
  } catch (error) {
    logger.error('Error al obtener resumen asistencia farmacia:', error);
    res.status(500).json({ message: 'Error al obtener resumen de farmacia por turno' });
  }
};

export const getPharmacyShiftAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, shiftId } = req.query;
    if (!date || !shiftId) {
      res.status(400).json({ message: 'date y shiftId son requeridos' });
      return;
    }
    const shiftIdNumber = parseInt(String(shiftId), 10);
    if (Number.isNaN(shiftIdNumber)) {
      res.status(400).json({ message: 'shiftId inválido' });
      return;
    }
    const items = await getPharmacyShiftAttendanceRows(String(date), shiftIdNumber);
    res.json(items);
  } catch (error) {
    logger.error('Error al obtener asistencia farmacia:', error);
    res.status(500).json({ message: 'Error al obtener asistencia de farmacia' });
  }
};

export const postPharmacyShiftAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, shiftId, attendance } = req.body;
    const recordedBy = req.user?.id ?? null;

    if (!date || !shiftId || !Array.isArray(attendance)) {
      res.status(400).json({ message: 'date, shiftId y attendance son requeridos' });
      return;
    }
    const shiftIdNumber = parseInt(String(shiftId), 10);
    if (Number.isNaN(shiftIdNumber)) {
      res.status(400).json({ message: 'shiftId inválido' });
      return;
    }

    const result = await savePharmacyShiftAttendance({
      date: String(date),
      shiftId: shiftIdNumber,
      attendance,
      recordedBy,
    });

    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }

    res.json({
      message: 'Asistencia de farmacia guardada',
      saved: result.saved,
    });
  } catch (error) {
    logger.error('Error al guardar asistencia farmacia:', error);
    res.status(500).json({ message: 'Error al guardar asistencia de farmacia' });
  }
};
