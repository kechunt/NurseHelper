import { cacheService } from './cache.service';
import {
  emitNurseDashboardInvalidate,
  type NurseDashboardInvalidateScope,
} from './realtime.service';

/** TTL en segundos para lecturas del panel enfermería. */
export const NURSE_DASHBOARD_CACHE_TTL_SEC = 60;

export type NurseDashboardCachePart =
  | 'stats'
  | 'beds'
  | 'patients'
  | 'tasks'
  | 'pharmacy'
  | 'shift-context';

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function nurseDashboardCacheKey(
  part: NurseDashboardCachePart,
  nurseId: number,
  extra?: string,
): string {
  return cacheService.generateKey('nurse', part, nurseId, extra ?? todayIso());
}

export function wantsRefreshQuery(query: Record<string, unknown>): boolean {
  const raw = query.refresh ?? query.force;
  if (raw === '1' || raw === 'true') {
    return true;
  }
  return false;
}

/** Lee del caché o ejecuta fetcher; `refresh` fuerza miss. */
export async function getNurseDashboardCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { refresh?: boolean; ttlSeconds?: number },
): Promise<T> {
  if (!options?.refresh) {
    const cached = await cacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  } else {
    await cacheService.delete(key);
  }

  const data = await fetcher();
  await cacheService.set(key, data, options?.ttlSeconds ?? NURSE_DASHBOARD_CACHE_TTL_SEC);
  return data;
}

/** Invalida cachés de lectura del panel para una enfermera. */
export async function invalidateNurseDashboardCache(
  nurseId: number,
  scope: NurseDashboardInvalidateScope = 'all',
): Promise<void> {
  const date = todayIso();
  const parts: NurseDashboardCachePart[] = [
    'stats',
    'beds',
    'patients',
    'tasks',
    'pharmacy',
    'shift-context',
  ];
  for (const part of parts) {
    await cacheService.delete(cacheService.generateKey('nurse', part, nurseId, date));
    await cacheService.delete(cacheService.generateKey('nurse', part, nurseId));
  }
  emitNurseDashboardInvalidate(nurseId, scope);
}
