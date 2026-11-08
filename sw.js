/* FarmaDM2: caché de recursos propios. Red primero, respaldo offline. */
const CACHE = 'farmadm2-6-6-1-bloque-comparativo-desplegable-20261108';
const CACHE_PREFIX = 'farmadm2-';
const ASSETS = ['./', './index.html', './style.css', './app.js', './medicamentos.json', './marcas_isp.json', './manifest.webmanifest', './icon.svg'];
const assetUrls = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(ASSETS))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const requestUrl = new URL(request.url);
  // Mantener el ámbito estrictamente limitado a los recursos de esta PWA.
  const canonicalUrl = requestUrl.origin + requestUrl.pathname;
  if (!assetUrls.has(canonicalUrl)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') {
        // Actualizar el respaldo offline tras una respuesta válida online.
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(canonicalUrl, copy)).catch(() => {}));
      }
      return response;
    } catch (error) {
      return (await caches.open(CACHE).then(cache => cache.match(canonicalUrl))) || Response.error();
    }
  })());
});
