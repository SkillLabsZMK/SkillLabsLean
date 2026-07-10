'use strict';

// Einfacher Cache-first-Service-Worker für die statische Kaffeekasse-PWA.
// Bei jeder inhaltlichen Änderung an den App-Dateien CACHE_VERSION erhöhen,
// damit Geräte den neuen App-Shell-Cache laden.
const CACHE_VERSION = 'kaffeekasse-v18';

const APP_SHELL = [
  './kaffeekasse.html',
  './manifest.json',
  './styles.css',
  './app.js',
  './vendor/qrcode.js',
  './vendor/qrcode_UTF8.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
