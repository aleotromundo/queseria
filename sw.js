// sw.js - Service Worker Mejorado para Quesería V&C
const CACHE_NAME = 'vyc-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './jingle.mp3',        // Tu audio local
  './nosotros.mp4',      // Tu video local (opcional, si es pequeño)
  // Agrega otros assets locales si los tienes: favicon.ico, offline.html, etc.
];

// 🚫 URLs que NO deben cachearse (evita problemas con APIs externas)
const EXTERNAL_URLS = [
  'supabase.co',
  'googleapis.com',
  'wa.me',
  'google.com/maps'
];

// Instalación
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('[SW] Caché inicial listo ✅');
            self.skipWaiting(); // Activa inmediatamente
          })
          .catch(err => {
            console.warn('[SW] Algunos recursos no se pudieron cachear:', err);
          });
      })
  );
});

// Activación: limpia cachés antiguos
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Borrando caché antiguo:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Listo para manejar solicitudes ✅');
      return self.clients.claim(); // Toma control de las pestañas abiertas
    })
  );
});

// Estrategia de red: **Network First**, con caché como fallback
self.addEventListener('fetch', event => {
  const { url } = event.request;

  // ❌ No interceptar solicitudes a APIs externas ni recursos dinámicos
  if (EXTERNAL_URLS.some(domain => url.includes(domain))) {
    return; // Dejar pasar directamente
  }

  // ❌ No cachear solicitudes no-GET (POST, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  // ✅ Aplicar estrategia solo a recursos locales
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar en caché solo respuestas válidas (status 200)
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone))
            .catch(err => console.warn('[SW] No se pudo cachear:', err));
        }
        return response;
      })
      .catch(() => {
        // 🔄 Si falla la red, intentar desde caché
        return caches.match(event.request)
          .then(cached => {
            if (cached) {
              console.log('[SW] Sirviendo desde caché:', event.request.url);
              return cached;
            }
            // Si ni siquiera hay en caché, dejar que la app muestre "offline"
            throw new Error('No hay conexión ni caché disponible');
          });
      })
  );
});