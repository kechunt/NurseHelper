import { resolve } from 'path';

const readdirSyncMock = jest.fn();
const existsSyncMock = jest.fn();

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readdirSync: (...args: Parameters<typeof actual.readdirSync>) => readdirSyncMock(...args) as ReturnType<
      typeof actual.readdirSync
    >,
    existsSync: (...args: Parameters<typeof actual.existsSync>) => existsSyncMock(...args),
  };
});

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn() },
}));

import * as dotenv from 'dotenv';
import { loadEnv } from '../../../utils/env';
import { MigrationHelper } from '../../../utils/migration-helper';

const utilsDir = resolve(__dirname, '../../../utils');
const paths = {
  backendLocal: resolve(utilsDir, '../../.env.local'),
  rootLocal: resolve(utilsDir, '../../../.env.local'),
};

describe('loadEnv', () => {
  beforeEach(() => {
    delete process.env.ENV_LOADED;
    jest.clearAllMocks();
    (dotenv.config as jest.Mock).mockReturnValue({ error: undefined });
    readdirSyncMock.mockReset();
    existsSyncMock.mockReset();
  });

  it('no hace nada si ENV_LOADED ya es true', () => {
    process.env.ENV_LOADED = 'true';
    loadEnv();
    expect(existsSyncMock).not.toHaveBeenCalled();
    expect(dotenv.config).not.toHaveBeenCalled();
  });

  it('prioriza backend/.env.local cuando existe y dotenv responde sin error', () => {
    existsSyncMock.mockImplementation((p) => String(p) === paths.backendLocal);
    loadEnv();
    expect(dotenv.config).toHaveBeenCalledWith({ path: paths.backendLocal });
    expect(process.env.ENV_LOADED).toBe('true');
  });

  it('si backend .env.local falla, intenta .env.local en raíz del repo', () => {
    existsSyncMock.mockImplementation(
      (p) => String(p) === paths.backendLocal || String(p) === paths.rootLocal
    );
    (dotenv.config as jest.Mock)
      .mockReturnValueOnce({ error: new Error('no leer') })
      .mockReturnValueOnce({ error: undefined });
    loadEnv();
    expect(dotenv.config).toHaveBeenNthCalledWith(1, { path: paths.backendLocal });
    expect(dotenv.config).toHaveBeenNthCalledWith(2, { path: paths.rootLocal });
    expect(process.env.ENV_LOADED).toBe('true');
  });

  it('sin archivos conocidos llama dotenv.config() sin path y marca ENV_LOADED', () => {
    existsSyncMock.mockReturnValue(false);
    loadEnv();
    expect(dotenv.config).toHaveBeenCalledWith();
    expect(process.env.ENV_LOADED).toBe('true');
  });
});

describe('MigrationHelper', () => {
  let helper: MigrationHelper;

  beforeEach(() => {
    helper = new MigrationHelper();
    readdirSyncMock.mockReset();
    existsSyncMock.mockReset();
  });

  describe('getMigrationInfo', () => {
    it('parsea solo .ts con patrón timestamp-nombre y ordena por timestamp', async () => {
      readdirSyncMock.mockReturnValue(['200-b.ts', '100-a.ts', 'readme.txt', 'no-match.ts']);
      const list = await helper.getMigrationInfo();
      expect(list.map((m) => m.timestamp)).toEqual([100, 200]);
      expect(list[0].name).toBe('a');
      expect(list[1].name).toBe('b');
      expect(list.every((m) => m.file.endsWith('.ts'))).toBe(true);
    });
  });

  describe('validateMigrations', () => {
    it('detecta timestamps duplicados', async () => {
      readdirSyncMock.mockReturnValue(['100-x.ts', '100-y.ts']);
      existsSyncMock.mockReturnValue(true);
      const v = await helper.validateMigrations();
      expect(v.valid).toBe(false);
      expect(v.errors).toContain('Duplicate timestamp: 100');
    });

    it('detecta archivo ausente en disco', async () => {
      readdirSyncMock.mockReturnValue(['999-missing.ts']);
      existsSyncMock.mockReturnValue(false);
      const v = await helper.validateMigrations();
      expect(v.valid).toBe(false);
      expect(v.errors.some((e) => e.includes('not found'))).toBe(true);
    });

    it('es válido cuando no hay duplicados y existen los archivos', async () => {
      readdirSyncMock.mockReturnValue(['100-ok.ts', '200-ok2.ts']);
      existsSyncMock.mockReturnValue(true);
      const v = await helper.validateMigrations();
      expect(v.valid).toBe(true);
      expect(v.errors).toHaveLength(0);
    });
  });
});
