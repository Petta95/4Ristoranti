// ============================================================================
// service-worker.js — cache dell'app shell per installabilità PWA e
// caricamento istantaneo. Le chiamate a Supabase (dati e foto) vanno SEMPRE
// in rete: qui non mettiamo mai in cache dati che devono restare aggiornati.
// ============================================================================

const CACHE_VERSION = 'v1';
const CACHE_NAME = `4ristoranti-${CACHE_VERSION}`;

const APP_SHELL = [
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/supabase-config.js',
  'js/auth.js',
  'js/db.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Mai intercettare Supabase (dati e foto devono sempre arrivare dalla rete)
  if (url.hostname.endsWith('supabase.co')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
