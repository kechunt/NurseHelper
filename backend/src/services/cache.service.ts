/**
 * Servicio de caché
 * Preparado para Redis pero funciona con memoria en desarrollo
 */

import { logger } from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL: number = 300000; // 5 minutos por defecto

  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
    
    // Limpiar entrada expirada después del TTL
    setTimeout(() => {
      if (this.cache.has(key)) {
        const entry = this.cache.get(key);
        if (entry && entry.expiresAt < Date.now()) {
          this.cache.delete(key);
        }
      }
    }, ttl || this.defaultTTL);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

// Instancia de caché en memoria
const memoryCache = new MemoryCache();

/**
 * Servicio de caché
 * En producción, puede ser reemplazado por Redis
 */
export class CacheService {
  private cache: MemoryCache;

  constructor() {
    this.cache = memoryCache;
  }

  /**
   * Obtener valor del caché
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = this.cache.get<T>(key);
      if (data) {
        logger.debug(`Cache hit: ${key}`);
      } else {
        logger.debug(`Cache miss: ${key}`);
      }
      return data;
    } catch (error) {
      logger.error('Error getting from cache', { key, error });
      return null;
    }
  }

  /**
   * Guardar valor en caché
   */
  async set<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds ? ttlSeconds * 1000 : undefined;
      this.cache.set(key, data, ttl);
      logger.debug(`Cache set: ${key}`, { ttl: ttlSeconds || 'default' });
    } catch (error) {
      logger.error('Error setting cache', { key, error });
    }
  }

  /**
   * Eliminar valor del caché
   */
  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      logger.debug(`Cache delete: ${key}`);
    } catch (error) {
      logger.error('Error deleting from cache', { key, error });
    }
  }

  /**
   * Generar clave de caché con prefijo
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }
}

// Instancia singleton
export const cacheService = new CacheService();
