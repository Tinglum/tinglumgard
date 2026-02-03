/**
 * Simple in-memory cache for pricing and configuration
 * Reduces database queries for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ConfigCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or fetch data with caching
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

export const configCache = new ConfigCache();

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  PRICING: 'pricing_config',
  APP_CONFIG: 'app_config',
  BOX_8KG: 'box_config_8',
  BOX_12KG: 'box_config_12',
  EXTRAS: 'extras_catalog',
  CUTOFF: 'cutoff_date',
} as const;

/**
 * Helper functions for common cached data
 */
export async function getCachedPricing(fetcher: () => Promise<any>) {
  return configCache.getOrFetch(CACHE_KEYS.PRICING, fetcher, 10 * 60 * 1000); // 10 min cache
}

export async function getCachedAppConfig(fetcher: () => Promise<any>) {
  return configCache.getOrFetch(CACHE_KEYS.APP_CONFIG, fetcher, 5 * 60 * 1000); // 5 min cache
}

export async function getCachedExtras(fetcher: () => Promise<any>) {
  return configCache.getOrFetch(CACHE_KEYS.EXTRAS, fetcher, 15 * 60 * 1000); // 15 min cache
}

/**
 * Invalidate config-related caches (call after admin updates)
 */
export function invalidateConfigCache(): void {
  configCache.invalidate(CACHE_KEYS.PRICING);
  configCache.invalidate(CACHE_KEYS.APP_CONFIG);
  configCache.invalidate(CACHE_KEYS.BOX_8KG);
  configCache.invalidate(CACHE_KEYS.BOX_12KG);
  configCache.invalidate(CACHE_KEYS.EXTRAS);
}
