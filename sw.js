/* Tempo — service worker (offline app shell) */
const CACHE = 'tempo-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/tokens.css',
  './styles/app.css',
  './js/app.js',
  './js/data.js',
  './js/time.js',
  './js/icons.js',
  './js/store.js',
  './js/ui.js',
  './js/notifications.js',
  './js/gcal.js',
  './js/views/today.js',
  './js/views/week.js',
  './js/views/reminders.js',
  './js/views/settings.js',
  './js/views/timeline.js',
  './js/views/periodEditor.js',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/fonts/inter-latin-wght-normal.woff2',
  './assets/fonts/inter-latin-wght-italic.woff2',
  './assets/fonts/instrument-serif-latin-400-normal.woff2',
  './assets/fonts/instrument-serif-latin-400-italic.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
