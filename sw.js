/* 理论题库 · 离线缓存 Service Worker
 * 策略：缓存优先 + 后台更新（stale-while-revalidate）
 * 首次打开页面后，断网/服务器关闭也能正常刷题 */
var CACHE = 'shuatibank-v1';
var ASSETS = ['./', './index.html', './sw.js', './manifest.webmanifest', './icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (a) {
        return c.add(a).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; /* 不拦截跨域请求 */
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var network = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function () {
        return cached;
      });
      return cached || network; /* 有缓存先用缓存（离线可用），后台静默更新 */
    })
  );
});
