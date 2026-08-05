jest.mock('../../../services/cache.service', () => ({
  cacheService: {
    generateKey: jest.fn((...parts: string[]) => parts.join(':')),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));

import { cacheService } from '../../../services/cache.service';
import {
  getNurseDashboardCached,
  invalidateNurseDashboardCache,
  nurseDashboardCacheKey,
  wantsRefreshQuery,
} from '../../../services/nurse-dashboard-cache.service';

describe('nurse-dashboard-cache.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (cacheService.set as jest.Mock).mockResolvedValue(undefined);
    (cacheService.delete as jest.Mock).mockResolvedValue(undefined);
  });

  it('wantsRefreshQuery detecta refresh=1 y force=true', () => {
    expect(wantsRefreshQuery({ refresh: '1' })).toBe(true);
    expect(wantsRefreshQuery({ force: 'true' })).toBe(true);
    expect(wantsRefreshQuery({})).toBe(false);
  });

  it('nurseDashboardCacheKey incluye parte, enfermera y fecha', () => {
    const key = nurseDashboardCacheKey('stats', 42);
    expect(key).toContain('nurse');
    expect(key).toContain('stats');
    expect(key).toContain('42');
  });

  it('getNurseDashboardCached devuelve caché si existe', async () => {
    (cacheService.get as jest.Mock).mockResolvedValue({ pending: 3 });
    const fetcher = jest.fn();

    const result = await getNurseDashboardCached('nurse:stats:1', fetcher);

    expect(result).toEqual({ pending: 3 });
    expect(fetcher).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('getNurseDashboardCached ejecuta fetcher y guarda si no hay caché', async () => {
    const fetcher = jest.fn().mockResolvedValue({ beds: 2 });

    const result = await getNurseDashboardCached('nurse:beds:1', fetcher);

    expect(result).toEqual({ beds: 2 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cacheService.set).toHaveBeenCalledWith('nurse:beds:1', { beds: 2 }, 60);
  });

  it('getNurseDashboardCached con refresh invalida y vuelve a fetcher', async () => {
    (cacheService.get as jest.Mock).mockResolvedValue({ stale: true });
    const fetcher = jest.fn().mockResolvedValue({ fresh: true });

    const result = await getNurseDashboardCached('nurse:tasks:1', fetcher, { refresh: true });

    expect(result).toEqual({ fresh: true });
    expect(cacheService.delete).toHaveBeenCalledWith('nurse:tasks:1');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('invalidateNurseDashboardCache borra todas las partes', async () => {
    await invalidateNurseDashboardCache(7);

    expect(cacheService.delete).toHaveBeenCalled();
    expect((cacheService.delete as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(6);
  });
});
