/**
 * PRAVAH Offline Service Worker
 * Implements Stale-While-Revalidate strategy for mission continuity in NER mountain dead-zones.
 */

const CACHE_NAME = 'pravah-v1.1-cache';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// 1. Install: Precache shell assets and take immediate control
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate: Clean up deprecated cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch: Stale-While-Revalidate for static assets; network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass dev server internals and chrome extensions
  if (
    url.pathname.includes('/@vite') ||
    url.pathname.includes('/@react-refresh') ||
    url.pathname.includes('hot-update') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // Handle navigation (HTML shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return caches.match('/');
        })
    );
    return;
  }

  // Stale-While-Revalidate for assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, return cached response if present
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
