// sw.js - Versión mejorada para contenido dinámico
const CACHE_NAME = 'catalogo-cell-phone-snoopy-notificaciones-v1';
const STATIC_URLS = [
  './',
  './index.html', 
  './css/style.css',
  './js/app.js',
  './js/drive-config.js',
  './manifest.json',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/screenshot-mobile.png',
  './images/screenshot-desktop.png',
  './images/placeholder.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_URLS))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Estrategia Network First para Google Drive
  if (url.href.includes('drive.google.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Actualizar cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache First para recursos locales
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
  }
});