// Service hors ligne de l'outil Organisateur.
// Pages : réseau d'abord, copie gardée en secours. Bibliothèques et cartes : copie d'abord.
// Les données (serveur, IGN, météo) ne passent jamais par le cache : l'application les garde elle-même.
const APP = 'orga-app-v3', LIBS = 'orga-libs-v1', TILES = 'orga-tiles';
const SHELL = ['./', 'benevole.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const LIBHOSTS = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const TILEHOST = /(^|\.)tile\.openstreetmap\.org$|^data\.geopf\.fr$/;

self.addEventListener('install', e => { e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('orga-app-') && k !== APP).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(APP).then(x => x.put(r, c)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./'))));
    return;
  }
  if (LIBHOSTS.includes(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const c = res.clone(); caches.open(LIBS).then(x => x.put(r, c)); return res; })));
    return;
  }
  if (TILEHOST.test(u.hostname) && (u.pathname.startsWith('/wmts') || /\/\d+\/\d+\/\d+\.png$/.test(u.pathname)) && (u.searchParams.get('REQUEST') === 'GetTile' || u.hostname.endsWith('openstreetmap.org'))) {
    e.respondWith(caches.open(TILES).then(c => c.match(r.url).then(m => m || fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r.url, res.clone()); return res; }).catch(() => new Response('', { status: 504 })))));
  }
});
