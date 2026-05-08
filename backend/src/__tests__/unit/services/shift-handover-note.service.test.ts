/**
 * Tests unitarios del servicio de notas de entrega (sin BD real).
 */

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { AppDataSource } from '../../../data-source';
import { ShiftHandoverNote } from '../../../entities/ShiftHandoverNote';
import { ShiftType } from '../../../entities/Shift';
import {
  findHandoverNoteForAreaDateAndShift,
  upsertHandoverNoteForArea,
} from '../../../services/shift-handover-note.service';

describe('shift-handover-note.service', () => {
  let mockRepo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockQb: { where: jest.Mock; getOne: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQb = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      create: jest.fn(),
      save: jest.fn().mockImplementation((n: unknown) => Promise.resolve(n)),
    };
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === ShiftHandoverNote) {
        return mockRepo;
      }
      throw new Error('unexpected entity');
    });
  });

  describe('findHandoverNoteForAreaDateAndShift', () => {
    it('devuelve null si no hay nota', async () => {
      mockQb.getOne.mockResolvedValue(null);
      await expect(findHandoverNoteForAreaDateAndShift(3, '2026-05-10', ShiftType.MORNING)).resolves.toBeNull();
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('n');
    });

    it('mapea la fila al DTO', async () => {
      const updatedAt = new Date('2026-05-01T10:00:00Z');
      mockQb.getOne.mockResolvedValue({
        id: 7,
        areaId: 3,
        shiftSlot: ShiftType.AFTERNOON,
        body: 'Contenido',
        authorUserId: 12,
        updatedAt,
      });
      const dto = await findHandoverNoteForAreaDateAndShift(3, '2026-05-10', ShiftType.AFTERNOON);
      expect(dto).toEqual({
        id: 7,
        areaId: 3,
        noteDate: '2026-05-10',
        shiftSlot: ShiftType.AFTERNOON,
        body: 'Contenido',
        authorUserId: 12,
        updatedAt,
      });
    });
  });

  describe('upsertHandoverNoteForArea', () => {
    it('crea una nota si no existe', async () => {
      mockQb.getOne.mockResolvedValue(null);
      const created = {
        id: 100,
        areaId: 2,
        shiftSlot: ShiftType.NIGHT,
        body: 'nuevo',
        authorUserId: 5,
        updatedAt: undefined as Date | undefined,
      };
      mockRepo.create.mockReturnValue(created);

      const dto = await upsertHandoverNoteForArea({
        areaId: 2,
        authorUserId: 5,
        noteDate: '2026-06-01',
        shiftSlot: ShiftType.NIGHT,
        body: 'nuevo',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          areaId: 2,
          body: 'nuevo',
          authorUserId: 5,
          shiftSlot: ShiftType.NIGHT,
        })
      );
      expect(mockRepo.save).toHaveBeenCalledWith(created);
      expect(dto).toEqual({
        id: 100,
        areaId: 2,
        noteDate: '2026-06-01',
        shiftSlot: ShiftType.NIGHT,
        body: 'nuevo',
        authorUserId: 5,
        updatedAt: undefined,
      });
    });

    it('actualiza cuerpo y autor si ya existe', async () => {
      const existing = {
        id: 1,
        areaId: 2,
        shiftSlot: ShiftType.MORNING,
        body: 'viejo',
        authorUserId: 1,
        updatedAt: new Date('2026-01-01'),
      };
      mockQb.getOne.mockResolvedValue(existing);

      const dto = await upsertHandoverNoteForArea({
        areaId: 2,
        authorUserId: 99,
        noteDate: '2026-06-01',
        shiftSlot: ShiftType.MORNING,
        body: 'actualizado',
      });

      expect(existing.body).toBe('actualizado');
      expect(existing.authorUserId).toBe(99);
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalledWith(existing);
      expect(dto.body).toBe('actualizado');
      expect(dto.authorUserId).toBe(99);
    });
  });
});
