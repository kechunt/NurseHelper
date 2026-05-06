import type { Response } from 'express';

jest.mock('../../../services/backup.service', () => ({
  backupService: {
    createBackup: jest.fn(),
    listBackups: jest.fn(),
    restoreBackup: jest.fn(),
    verifyBackup: jest.fn(),
    testRestore: jest.fn(),
  },
}));

import type { AuthRequest } from '../../../middleware/auth.middleware';
import { backupService } from '../../../services/backup.service';
import { BackupController } from '../../../controllers/backup.controller';

describe('BackupController', () => {
  let ctrl: BackupController;

  /** `asyncHandler` no devuelve la promesa interna; dejar vaciar la cola de microtareas antes de asserts. */
  async function flush(): Promise<void> {
    await new Promise<void>((r) => setImmediate(r));
  }

  const backupRow = {
    filename: 'snap.sql.gz',
    path: '/data/backups/snap.sql.gz',
    size: 2048,
    createdAt: new Date('2026-03-01'),
    type: 'full' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new BackupController();
    (backupService.createBackup as jest.Mock).mockResolvedValue({
      filename: 'out.sql.gz',
      path: '/out/out.sql.gz',
      size: 512,
      createdAt: new Date('2026-04-01'),
      type: 'full',
    });
    (backupService.listBackups as jest.Mock).mockResolvedValue([backupRow]);
    (backupService.restoreBackup as jest.Mock).mockResolvedValue(undefined);
    (backupService.verifyBackup as jest.Mock).mockResolvedValue(true);
    (backupService.testRestore as jest.Mock).mockResolvedValue(true);
  });

  function authReq(): AuthRequest {
    return { user: { id: 1, email: 'a@test', role: 'admin' as const } } as AuthRequest;
  }

  function mockRes(): { json: jest.Mock; status: jest.Mock; res: Response } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status, res: { status, json } as unknown as Response };
  }

  it('createBackup delega type full por defecto', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.createBackup({ ...authReq(), body: {} } as AuthRequest, res, jest.fn());
    await flush();
    expect(backupService.createBackup).toHaveBeenCalledWith('full');
    expect(json).toHaveBeenCalledWith({
      message: 'Backup creado exitosamente',
      backup: {
        filename: 'out.sql.gz',
        size: 512,
        createdAt: new Date('2026-04-01'),
      },
    });
  });

  it('createBackup pasa type incremental si viene en body', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.createBackup({ ...authReq(), body: { type: 'incremental' } } as AuthRequest, res, jest.fn());
    await flush();
    expect(backupService.createBackup).toHaveBeenCalledWith('incremental');
  });

  it('listBackups devuelve lista del servicio', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.listBackups(authReq(), res, jest.fn());
    await flush();
    expect(backupService.listBackups).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ backups: [backupRow] });
  });

  it('restoreBackup responde 400 sin filename', async () => {
    const { json, status, res } = mockRes();
    await ctrl.restoreBackup({ ...authReq(), body: {} } as AuthRequest, res, jest.fn());
    await flush();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_ERROR', message: 'filename es requerido' })
    );
    expect(backupService.listBackups).not.toHaveBeenCalled();
  });

  it('restoreBackup responde 404 si el archivo no está en listBackups', async () => {
    const { json, status, res } = mockRes();
    await ctrl.restoreBackup(
      { ...authReq(), body: { filename: 'otro.sql' } } as AuthRequest,
      res,
      jest.fn()
    );
    await flush();
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NOT_FOUND', message: 'Backup no encontrado' })
    );
    expect(backupService.restoreBackup).not.toHaveBeenCalled();
  });

  it('restoreBackup llama restoreBackup con path cuando existe', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.restoreBackup(
      { ...authReq(), body: { filename: 'snap.sql.gz' } } as AuthRequest,
      res,
      jest.fn()
    );
    await flush();
    expect(backupService.restoreBackup).toHaveBeenCalledWith('/data/backups/snap.sql.gz');
    expect(json).toHaveBeenCalledWith({ message: 'Backup restaurado exitosamente' });
  });

  it('verifyBackup responde 400 sin filename en query', async () => {
    const { json, status, res } = mockRes();
    await ctrl.verifyBackup({ ...authReq(), query: {} } as AuthRequest, res, jest.fn());
    await flush();
    expect(status).toHaveBeenCalledWith(400);
    expect(backupService.verifyBackup).not.toHaveBeenCalled();
  });

  it('verifyBackup responde 404 si no hay coincidencia', async () => {
    const { json, status, res } = mockRes();
    await ctrl.verifyBackup(
      { ...authReq(), query: { filename: 'missing.gz' } } as unknown as AuthRequest,
      res,
      jest.fn()
    );
    await flush();
    expect(status).toHaveBeenCalledWith(404);
    expect(backupService.verifyBackup).not.toHaveBeenCalled();
  });

  it('verifyBackup llama verifyBackup y devuelve valid + metadatos', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.verifyBackup(
      { ...authReq(), query: { filename: 'snap.sql.gz' } } as unknown as AuthRequest,
      res,
      jest.fn()
    );
    await flush();
    expect(backupService.verifyBackup).toHaveBeenCalledWith('/data/backups/snap.sql.gz');
    expect(json).toHaveBeenCalledWith({
      valid: true,
      backup: {
        filename: 'snap.sql.gz',
        size: 2048,
        createdAt: new Date('2026-03-01'),
      },
    });
  });

  it('testRestore responde 400 sin filename', async () => {
    const { json, status, res } = mockRes();
    await ctrl.testRestore({ ...authReq(), body: {} } as AuthRequest, res, jest.fn());
    await flush();
    expect(status).toHaveBeenCalledWith(400);
    expect(backupService.testRestore).not.toHaveBeenCalled();
  });

  it('testRestore responde 404 si backup no listado', async () => {
    const { json, status, res } = mockRes();
    await ctrl.testRestore({ ...authReq(), body: { filename: 'x.sql' } } as AuthRequest, res, jest.fn());
    await flush();
    expect(status).toHaveBeenCalledWith(404);
    expect(backupService.testRestore).not.toHaveBeenCalled();
  });

  it('testRestore delega con path y nombre test_restore_*', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.testRestore(
      { ...authReq(), body: { filename: 'snap.sql.gz' } } as AuthRequest,
      res,
      jest.fn()
    );
    await flush();
    expect(backupService.testRestore).toHaveBeenCalledWith(
      '/data/backups/snap.sql.gz',
      'test_restore_1700000000000'
    );
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: 'Restauración de prueba exitosa',
    });
    jest.restoreAllMocks();
  });

  it('testRestore mensaje de error si success false', async () => {
    (backupService.testRestore as jest.Mock).mockResolvedValueOnce(false);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.testRestore(
      { ...authReq(), body: { filename: 'snap.sql.gz' } } as AuthRequest,
      res,
      jest.fn()
    );
    await flush();
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Error en restauración de prueba',
    });
  });
});
