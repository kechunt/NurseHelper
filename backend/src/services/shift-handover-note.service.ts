import { AppDataSource } from '../data-source';
import { ShiftHandoverNote } from '../entities/ShiftHandoverNote';

export interface HandoverNoteDto {
  id: number;
  areaId: number;
  noteDate: string;
  body: string;
  authorUserId: number | null | undefined;
  updatedAt: Date | undefined;
}

export async function findHandoverNoteForAreaAndDate(
  areaId: number,
  dateStr: string
): Promise<HandoverNoteDto | null> {
  const repo = AppDataSource.getRepository(ShiftHandoverNote);
  const note = await repo
    .createQueryBuilder('n')
    .where('n.areaId = :areaId AND DATE(n.note_date) = :d', { areaId, d: dateStr })
    .getOne();

  if (!note) {
    return null;
  }
  return {
    id: note.id,
    areaId: note.areaId,
    noteDate: dateStr,
    body: note.body,
    authorUserId: note.authorUserId,
    updatedAt: note.updatedAt,
  };
}

export async function upsertHandoverNoteForArea(params: {
  areaId: number;
  authorUserId: number;
  noteDate: string;
  body: string;
}): Promise<HandoverNoteDto> {
  const { areaId, authorUserId, noteDate, body } = params;
  const repo = AppDataSource.getRepository(ShiftHandoverNote);
  let note = await repo
    .createQueryBuilder('n')
    .where('n.areaId = :areaId AND DATE(n.note_date) = :d', { areaId, d: noteDate })
    .getOne();

  if (!note) {
    note = repo.create({
      areaId,
      noteDate: new Date(`${noteDate}T12:00:00`),
      body,
      authorUserId,
    });
  } else {
    note.body = body;
    note.authorUserId = authorUserId;
  }
  await repo.save(note);

  return {
    id: note.id,
    areaId: note.areaId,
    noteDate,
    body: note.body,
    authorUserId: note.authorUserId,
    updatedAt: note.updatedAt,
  };
}
