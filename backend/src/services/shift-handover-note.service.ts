import { AppDataSource } from '../data-source';
import { ShiftHandoverNote } from '../entities/ShiftHandoverNote';
import { ShiftType } from '../entities/Shift';

export const HANDOVER_SHIFT_SLOT_VALUES = Object.values(ShiftType) as ShiftType[];

export function isValidHandoverShiftSlot(value: unknown): value is ShiftType {
  return typeof value === 'string' && (HANDOVER_SHIFT_SLOT_VALUES as string[]).includes(value);
}

export interface HandoverNoteDto {
  id: number;
  areaId: number;
  noteDate: string;
  shiftSlot: string;
  body: string;
  authorUserId: number | null | undefined;
  updatedAt: Date | undefined;
}

export async function findHandoverNoteForAreaDateAndShift(
  areaId: number,
  dateStr: string,
  shiftSlot: ShiftType
): Promise<HandoverNoteDto | null> {
  const repo = AppDataSource.getRepository(ShiftHandoverNote);
  const note = await repo
    .createQueryBuilder('n')
    .where('n.areaId = :areaId AND DATE(n.note_date) = :d AND n.shiftSlot = :shift', {
      areaId,
      d: dateStr,
      shift: shiftSlot,
    })
    .getOne();

  if (!note) {
    return null;
  }
  return mapEntityToDto(note, dateStr);
}

function mapEntityToDto(note: ShiftHandoverNote, dateStr: string): HandoverNoteDto {
  return {
    id: note.id,
    areaId: note.areaId,
    noteDate: dateStr,
    shiftSlot: note.shiftSlot,
    body: note.body,
    authorUserId: note.authorUserId,
    updatedAt: note.updatedAt,
  };
}

export async function upsertHandoverNoteForArea(params: {
  areaId: number;
  authorUserId: number;
  noteDate: string;
  shiftSlot: ShiftType;
  body: string;
}): Promise<HandoverNoteDto> {
  const { areaId, authorUserId, noteDate, body, shiftSlot } = params;
  const repo = AppDataSource.getRepository(ShiftHandoverNote);
  let note = await repo
    .createQueryBuilder('n')
    .where('n.areaId = :areaId AND DATE(n.note_date) = :d AND n.shiftSlot = :shift', {
      areaId,
      d: noteDate,
      shift: shiftSlot,
    })
    .getOne();

  if (!note) {
    note = repo.create({
      areaId,
      noteDate: new Date(`${noteDate}T12:00:00`),
      shiftSlot,
      body,
      authorUserId,
    });
  } else {
    note.body = body;
    note.authorUserId = authorUserId;
    note.shiftSlot = shiftSlot;
  }
  await repo.save(note);

  return mapEntityToDto(note, noteDate);
}
