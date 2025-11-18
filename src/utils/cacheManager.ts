// Simple in-memory cache for static data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Get data from cache if not expired
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set data in cache with TTL
 */
export function setCache<T>(key: string, data: T, ttl: number = 300000): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * Clear specific cache entry or all cache
 */
export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 300000
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fn();
  setCache(key, data, ttl);
  return data;
}

export async function checkAndClearCache() {
  try {
    // Vérifier uniquement toutes les 5 minutes (pas à chaque chargement)
    const lastCheck = localStorage.getItem('last_version_check');
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (lastCheck && (now - parseInt(lastCheck)) < fiveMinutes) {
      // Pas besoin de vérifier, c'est trop récent
      return;
    }

    // Mettre à jour le timestamp de dernière vérification
    localStorage.setItem('last_version_check', now.toString());

    const response = await fetch('/version.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      console.warn('Unable to fetch version file');
      return;
    }

    const serverVersion = await response.json();
    const cachedVersion = localStorage.getItem('app_version');

    if (!cachedVersion) {
      localStorage.setItem('app_version', serverVersion.version);
      return;
    }

    if (cachedVersion !== serverVersion.version) {
      console.log('New version detected, clearing cache...');

      // Clear localStorage (keep only essential items)
      const keysToKeep = ['supabase.auth.token', 'last_version_check'];
      const storage: { [key: string]: string } = {};

      keysToKeep.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          storage[key] = value;
        }
      });

      localStorage.clear();

      Object.keys(storage).forEach(key => {
        localStorage.setItem(key, storage[key]);
      });

      localStorage.setItem('app_version', serverVersion.version);

      // Clear service worker cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }

      console.log('Cache cleared successfully');

      // Force reload without cache
      window.location.reload();
    }
  } catch (error) {
    console.error('Error checking version:', error);
  }
}
