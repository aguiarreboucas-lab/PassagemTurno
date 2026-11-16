// Cache para uso offline. Rede primeiro (pega atualizações), cache se estiver sem internet.
// A versão vem de version.js: trocar o número lá faz o app instalado se atualizar sozinho.
try { importScripts('version.js'); } catch (e) {}
var CACHE = 'passagem-turno-' + (self.APP_VERSION || 'x');
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'logo.jpg', 'config.js', 'version.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(FILES.map(function (f) {
        return fetch(new Request(f, { cache: 'reload' })).then(function (r) { if (r && r.ok) return c.put(f, r); }).catch(function () {});
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  // Só apaga caches de versões antigas do app. Os dados do usuário (localStorage) não são tocados.
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin !== location.origin) return; // planilha e fontes do Google não passam pelo cache
  if (u.search) return;                      // consultas com parâmetro (ex.: checagem de versão) vão direto à rede
  var opt = req.mode === 'navigate' ? undefined : { cache: 'no-cache' };
  e.respondWith(
    fetch(req, opt).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) {
        return r || (req.mode === 'navigate' ? (caches.match('index.html') || caches.match('./')) : undefined);
      });
    })
  );
});
