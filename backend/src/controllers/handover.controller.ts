import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { isValidHandoverShiftSlot } from '../services/shift-handover-note.service';
import {
  findAdminHandoverNote,
  upsertAdminHandoverNote,
} from '../services/admin-handover-note.service';
import { ShiftType } from '../entities/Shift';

export const getAdminHandoverNote = async (req: AuthRequest, res: Response) => {
  try {
    const raw =
      typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : new Date().toISOString().split('T')[0];
    const shiftRaw = typeof req.query.shift === 'string' ? req.query.shift : ShiftType.MORNING;
    const shiftSlot = isValidHandoverShiftSlot(shiftRaw) ? shiftRaw : ShiftType.MORNING;

    const note = await findAdminHandoverNote(raw, shiftSlot);
    return res.json({ note });
  } catch (error) {
    logger.error('getAdminHandoverNote:', error);
    return res.status(500).json({ message: 'Error al leer la nota de coordinación' });
  }
};

export const putAdminHandoverNote = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user;
    if (!me?.id) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { noteDate, shiftSlot: shiftBody, body } = req.body as {
      noteDate?: string;
      shiftSlot?: string;
      body?: string;
    };
    if (!noteDate || typeof body !== 'string') {
      return res.status(400).json({ message: 'noteDate y body son requeridos' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
      return res.status(400).json({ message: 'noteDate debe ser YYYY-MM-DD' });
    }
    const shiftSlotParsed =
      typeof shiftBody === 'string' && isValidHandoverShiftSlot(shiftBody) ? shiftBody : ShiftType.MORNING;
    const trimmed = body.trim();
    if (!trimmed.length) {
      return res.status(400).json({ message: 'El texto no puede estar vacío' });
    }
    if (trimmed.length > 8000) {
      return res.status(400).json({ message: 'Texto demasiado largo (máx. 8000 caracteres)' });
    }

    const note = await upsertAdminHandoverNote({
      authorUserId: me.id,
      noteDate,
      shiftSlot: shiftSlotParsed,
      body: trimmed,
    });
    return res.json({ note });
  } catch (error) {
    logger.error('putAdminHandoverNote:', error);
    return res.status(500).json({ message: 'Error al guardar la nota de coordinación' });
  }
};
