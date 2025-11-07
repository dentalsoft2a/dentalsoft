export async function checkAndClearCache() {
  try {
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
      const keysToKeep = ['supabase.auth.token'];
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
