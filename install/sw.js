/* MuffinFlow v5.2.2 - launch installed PWA scope first for lock-screen push clicks. */
const NAME = 'muffinflow-install-v5-deeplink3';
const LOCAL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './badge-muffin-96.png', './activate.html'];
const INSTALL_URL = new URL('./', self.registration.scope);
const APP_URL = new URL('../app/', self.registration.scope);

// Only allow known routes and plain identifiers from notification payloads.
function destination(data) {
  // A launch must stay inside the installed WebAPK scope. The launcher
  // forwards to the GAS app afterward; this does not turn GAS into a PWA.
  const out = new URL(INSTALL_URL.href);
  out.searchParams.set('launch', '1');
  const go = String((data && data.go) || '').toLowerCase();
  if (!['chat', 'inbox', 'books'].includes(go)) return out;
  out.searchParams.set('go', go);
  const peer = String((data && data.peer) || '');
  const code = String((data && data.code) || '');
  const period = String((data && data.period) || '');
  if (go === 'chat' && /^[A-Za-z0-9_-]{1,50}$/.test(peer)) out.searchParams.set('peer', peer);
  if (/^[A-Za-z0-9][A-Za-z0-9-]{2,40}$/.test(code)) out.searchParams.set('code', code);
  if (period && period.length <= 100) out.searchParams.set('period', period);
  return out;
}

function clickedDestination(data) {
  // Convert both older /app/ links and /install/ links to the PWA scope.
  // This avoids opening an out-of-scope Chrome tab directly from Android lock screen.
  // Read their route but do not visit that installation page again.
  const previous = data && data.url;
  if (typeof previous === 'string') {
    try {
      const candidate = new URL(previous, INSTALL_URL);
      if (candidate.origin === self.location.origin &&
          (candidate.pathname === INSTALL_URL.pathname ||
           candidate.pathname === APP_URL.pathname ||
           candidate.pathname === APP_URL.pathname + 'index.html')) {
        return destination(routeFields(candidate.searchParams));
      }
    } catch (_) { /* Invalid or stale URL: open the main app. */ }
  }
  return destination(data && data.route ? data.route : data);
}

// Support objects and URLSearchParams using one route validator.
function routeFields(input) {
  if (input && typeof input.get === 'function') {
    return {go:input.get('go'),peer:input.get('peer'),code:input.get('code'),period:input.get('period')};
  }
  return input || {};
}

self.addEventListener('install', event => event.waitUntil(
  caches.open(NAME).then(cache => cache.addAll(LOCAL)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(names => Promise.all(names.filter(n => n.startsWith('muffinflow-install-') && n !== NAME).map(n => caches.delete(n))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(INSTALL_URL.pathname)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const clone = response.clone();
      event.waitUntil(caches.open(NAME).then(cache => cache.put(event.request, clone)));
    }
    return response;
  }).catch(() => caches.match(event.request).then(result => result || caches.match('./index.html'))));
});
self.addEventListener('push', event => event.waitUntil((async () => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (_) { payload = {body:event.data ? event.data.text() : ''}; }
  const data = payload && payload.data || {};
  const title = String(data.title || (payload.notification && payload.notification.title) || '🧁 MuffinFlow');
  const body = String(data.body || (payload.notification && payload.notification.body) || 'Ada pemberitahuan baru.');
  const target = destination(routeFields(data));
  await self.registration.showNotification(title, {
    body, icon:'./icon-192.png', badge:'./badge-muffin-96.png',
    tag:data.tag || 'mf-' + Date.now(),
    data:{url:target.href, route:routeFields(data)}, vibrate:[110, 70, 110]
  });
})()));
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = clickedDestination(event.notification.data);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    // Reuse only the MuffinFlow launcher; never hijack the pairing page.
    const existing = windows.find(client => {
      try {
        const page = new URL(client.url);
        return page.origin === self.location.origin &&
          (page.pathname === INSTALL_URL.pathname ||
           page.pathname === INSTALL_URL.pathname + 'index.html' ||
           page.pathname === APP_URL.pathname ||
           page.pathname === APP_URL.pathname + 'index.html');
      } catch (_) { return false; }
    });
    if (existing) {
      try {
        await existing.focus();
        await existing.navigate(target.href);
        return;
      } catch (_) { /* Open a fresh tab if the old window cannot navigate. */ }
    }
    const opened = await self.clients.openWindow(target.href);
    if (opened && typeof opened.focus === 'function') await opened.focus();
  })());
});