const CACHE_NAME = 'media-cache-v1';

// Limpiar cachés viejos al activar el service worker
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
  // Reclamar el control de los clientes abiertos
  self.clients.claim();
});

self.addEventListener('install', (event) => {
  // Instalar sin esperar a que la pestaña anterior se cierre
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Verificar si es una imagen o video por su destino o URL
  const isImageOrVideo = 
    request.destination === 'image' || 
    request.destination === 'video' || 
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|avif)$/i);

  // Solo cachear peticiones GET de archivos multimedia
  if (request.method === 'GET' && isImageOrVideo) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Retornar de caché si existe
        if (cachedResponse) {
          return cachedResponse;
        }

        // Si no está en caché, traer de la red
        return fetch(request).then((networkResponse) => {
          // Solo almacenamos respuestas exitosas o opaque (en caso de cross-origin sin CORS)
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        }).catch((error) => {
          console.error("Fetch failed para media", error);
          // Si no hay red y no hay caché, tirará error el networkResponse
          throw error;
        });
      })
    );
  }
});
