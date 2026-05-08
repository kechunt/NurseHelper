import { AppDataSource } from '../data-source';
import { AdminHandoverNote } from '../entities/AdminHandoverNote';
import { ShiftType } from '../entities/Shift';

export interface AdminHandoverNoteDto {
  id: number;
  noteDate: string;
  shiftSlot: string;
  body: string;
  authorUserId: number | null | undefined;
  updatedAt: Date | undefined;
}

export async function findAdminHandoverNote(dateStr: string, shiftSlot: ShiftType): Promise<AdminHandoverNoteDto | null> {
  const repo = AppDataSource.getRepository(AdminHandoverNote);
  const note = await repo
    .createQueryBuilder('n')
    .where('DATE(n.note_date) = :d AND n.shiftSlot = :shift', { d: dateStr, shift: shiftSlot })
    .getOne();

  if (!note) {
    return null;
  }
  return {
    id: note.id,
    noteDate: dateStr,
    shiftSlot: note.shiftSlot,
    body: note.body,
    authorUserId: note.authorUserId,
    updatedAt: note.updatedAt,
  };
}

export async function upsertAdminHandoverNote(params: {
  authorUserId: number;
  noteDate: string;
  shiftSlot: ShiftType;
  body: string;
}): Promise<AdminHandoverNoteDto> {
  const { authorUserId, noteDate, body, shiftSlot } = params;
  const repo = AppDataSource.getRepository(AdminHandoverNote);
  let note = await repo
    .createQueryBuilder('n')
    .where('DATE(n.note_date) = :d AND n.shiftSlot = :shift', { d: noteDate, shift: shiftSlot })
    .getOne();

  if (!note) {
    note = repo.create({
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

  return {
    id: note.id,
    noteDate,
    shiftSlot: note.shiftSlot,
    body: note.body,
    authorUserId: note.authorUserId,
    updatedAt: note.updatedAt,
  };
}
