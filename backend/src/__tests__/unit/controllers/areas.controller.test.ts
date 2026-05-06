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

import { AppDataSource } from '../../../data-source';
import { AreasController } from '../../../controllers/areas.controller';

describe('AreasController', () => {
  let ctrl: AreasController;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.find.mockResolvedValue([]);
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.save.mockImplementation((a: unknown) => Promise.resolve(a));
    mockRepo.remove.mockResolvedValue(undefined);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);
    ctrl = new AreasController();
  });

  function resMocks(): { json: jest.Mock; status: jest.Mock; res: Response } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status, res: { status, json } as unknown as Response };
  }

  it('getAll devuelve JSON con áreas ordenadas por nombre', async () => {
    const areas = [{ id: 1, name: 'UCI' }];
    mockRepo.find.mockResolvedValueOnce(areas);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.getAll({} as Request, res);
    expect(AppDataSource.getRepository).toHaveBeenCalled();
    expect(mockRepo.find).toHaveBeenCalledWith({
      relations: ['beds'],
      order: { name: 'ASC' },
    });
    expect(json).toHaveBeenCalledWith(areas);
  });

  it('getAll responde 500 si find falla', async () => {
    mockRepo.find.mockRejectedValueOnce(new Error('db down'));
    const { json, status, res } = resMocks();
    await ctrl.getAll({} as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });

  it('getById responde 404 si no hay área', async () => {
    const { json, status, res } = resMocks();
    await ctrl.getById({ params: { id: '99' } } as unknown as Request, res);
    expect(mockRepo.findOne).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ message: 'Área no encontrada' });
  });

  it('getById devuelve el área cuando existe', async () => {
    const area = { id: 3, name: 'Plant', beds: [] };
    mockRepo.findOne.mockResolvedValueOnce(area);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.getById({ params: { id: '3' } } as unknown as Request, res);
    expect(json).toHaveBeenCalledWith(area);
  });

  it('getById reintenta sin patients si ER_BAD_FIELD_ERROR menciona Patient', async () => {
    const err = Object.assign(new Error('bad Patient col'), {
      code: 'ER_BAD_FIELD_ERROR',
      message: 'Unknown Patient',
    });
    const area = { id: 2, name: 'X', beds: [{ id: 1 }] };
    mockRepo.findOne.mockRejectedValueOnce(err).mockResolvedValueOnce(area);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.getById({ params: { id: '2' } } as unknown as Request, res);
    expect(mockRepo.findOne).toHaveBeenCalledTimes(2);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        beds: expect.arrayContaining([expect.objectContaining({ id: 1, patients: [] })]),
      })
    );
  });

  it('getById propaga a 500 si el error no es de columna conocida', async () => {
    mockRepo.findOne.mockRejectedValueOnce(new Error('timeout'));
    const { json, status, res } = resMocks();
    await ctrl.getById({ params: { id: '1' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });

  it('create responde 400 sin nombre', async () => {
    const { json, status, res } = resMocks();
    await ctrl.create({ body: {} } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'El nombre del área es requerido' });
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('create guarda y responde 201', async () => {
    const { json, status, res } = resMocks();
    await ctrl.create({ body: { name: 'Nueva', description: 'Desc' } } as Request, res);
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nueva',
        description: 'Desc',
        isActive: true,
      })
    );
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Área creada exitosamente', area: expect.anything() })
    );
  });

  it('create responde 500 si save falla', async () => {
    mockRepo.save.mockRejectedValueOnce(new Error('db'));
    const { json, status, res } = resMocks();
    await ctrl.create({ body: { name: 'Nueva' } } as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });

  it('update responde 404 si el id no existe', async () => {
    const { json, status, res } = resMocks();
    await ctrl.update({ params: { id: '0' }, body: { name: 'x' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(404);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('update aplica cambios y responde JSON', async () => {
    const area = { id: 1, name: 'Old', description: 'd', isActive: true };
    mockRepo.findOne.mockResolvedValueOnce({ ...area });
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.update(
      { params: { id: '1' }, body: { name: 'New', description: 'x', isActive: false } } as unknown as Request,
      res
    );
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'New', description: 'x', isActive: false })
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Área actualizada exitosamente' })
    );
  });

  it('update responde 500 si findOne falla', async () => {
    mockRepo.findOne.mockRejectedValueOnce(new Error('db'));
    const { json, status, res } = resMocks();
    await ctrl.update({ params: { id: '1' }, body: { name: 'x' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });

  it('delete responde 404 si no hay área', async () => {
    const { json, status, res } = resMocks();
    await ctrl.delete({ params: { id: '5' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(404);
    expect(mockRepo.remove).not.toHaveBeenCalled();
  });

  it('delete responde 400 si hay camas', async () => {
    mockRepo.findOne.mockResolvedValueOnce({ id: 1, beds: [{ id: 10 }] });
    const { json, status, res } = resMocks();
    await ctrl.delete({ params: { id: '1' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'No se puede eliminar un área que tiene camas asignadas',
    });
    expect(mockRepo.remove).not.toHaveBeenCalled();
  });

  it('delete elimina si no hay camas', async () => {
    const area = { id: 2, beds: [] };
    mockRepo.findOne.mockResolvedValueOnce(area);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.delete({ params: { id: '2' } } as unknown as Request, res);
    expect(mockRepo.remove).toHaveBeenCalledWith(area);
    expect(json).toHaveBeenCalledWith({ message: 'Área eliminada exitosamente' });
  });

  it('delete responde 500 si remove falla', async () => {
    const area = { id: 2, beds: [] };
    mockRepo.findOne.mockResolvedValueOnce(area);
    mockRepo.remove.mockRejectedValueOnce(new Error('db'));
    const { json, status, res } = resMocks();
    await ctrl.delete({ params: { id: '2' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });
});
