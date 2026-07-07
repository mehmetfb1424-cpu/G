/* Turanlar Fiyat Sorgu — Service Worker
   Uygulamayı çevrimdışı açılabilir yapar. Sürüm değişince CACHE adını artır. */
const CACHE = "fiyat-sorgu-v1";

// İlk yüklemede saklanacak uygulama dosyaları (app shell).
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Kurulumda shell'i önbelleğe al.
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

// Eski sürüm önbelleklerini temizle.
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// İstekleri karşıla:
// - urunler.json (fiyat verisi): önce ağ, olmazsa önbellek (network-first) -> hep güncel.
// - diğer her şey: önce önbellek, olmazsa ağ (cache-first) -> hızlı ve çevrimdışı.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  if (url.pathname.endsWith("urunler.json")) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        // Aynı origin dosyalarını çalışırken de önbelleğe ekle.
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit)
    )
  );
});
