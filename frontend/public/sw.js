/**
 * Success Mantra Offline Portal Service Worker
 * Caches static application shell so the app can load completely offline without any internet / WiFi.
 */

const CACHE_NAME = 'success-mantra-app-v1';
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
        console.warn('Initial SW precache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not intercept non-GET requests or backend API requests
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Stale-While-Revalidate / Cache-First strategy for static assets & pages
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for an HTML page/navigation, serve cached index.html or /offline
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/offline');
          }
          return null;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
