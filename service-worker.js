
const CACHE_NAME = 'meu-foco-v1.4';

// Only local files here. If one fails, we warn but don't crash everything if possible.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// External assets (CDNs) - These need 'no-cors' to avoid installation failures
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap',
  'https://aistudiocdn.com/date-fns@^4.1.0/',
  'https://aistudiocdn.com/lucide-react@^0.555.0',
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://aistudiocdn.com/react-router-dom@^7.9.6',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/recharts@^3.5.0',
  'https://cdn-icons-png.flaticon.com/512/4825/4825038.png' // Moved here to use no-cors
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Cache Local Assets (Try/Catch wrapper to prevent installation failure on dev envs)
      const localPromises = ASSETS_TO_CACHE.map(async (url) => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            return cache.put(url, res);
          }
        } catch (error) {
          console.warn('⚠️ [SW] Failed to cache local asset (non-critical in dev):', url, error);
        }
      });
      
      // 2. Cache External Assets (CDN) with no-cors
      const externalPromises = EXTERNAL_ASSETS.map(async (url) => {
        try {
          const res = await fetch(url, { mode: 'no-cors' });
          return cache.put(url, res);
        } catch (error) {
          console.warn('⚠️ [SW] Failed to cache external asset:', url);
        }
      });

      // Wait for all, but don't fail the installation if one fails (Promise.allSettled logic manually)
      await Promise.all([...localPromises, ...externalPromises]);
      console.log('✅ [SW] Install complete');
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 [SW] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Strategy: Network First for HTML (Navigation)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Strategy: Cache First for assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        return networkResponse;
      }).catch(err => {
         // Silently fail for non-critical fetches
         // console.log('Fetch failed:', request.url);
      });
    })
  );
});
