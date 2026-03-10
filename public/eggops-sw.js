const STATIC_CACHE = 'eggops-static-v1';
const API_CACHE = 'eggops-api-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(['/drift/egg-ops']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/admin/eggs/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (url.pathname.startsWith('/drift/egg-ops')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const cloned = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
