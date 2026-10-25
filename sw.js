// オフラインでも開けるようにするための仕組み。
// 通信できるときは常に最新のファイルを取りに行き、できないときだけ保存済みのものを使う。
// ファイルを追加・削除したら ASSETS を直し、CACHE の番号を上げる。
const CACHE = 'event-cho-v48';
const ASSETS = [
  './',
  'index.html',
  'js/ui/motion.js',
  'js/ui/splash.js',
  'js/ui/splash-art.js',
  'js/ui/pin-close.js',
  'js/ui/tab-swipe.js',
  'js/data/updates.js',
  'js/ui/updates-sheet.js',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'img/splash-plane.png',
  'img/splash-car.png',
  'img/splash-train.png',
  'icons/icon-512.png',
  'css/tokens.css',
  'css/base.css',
  'css/header.css',
  'css/list.css',
  'css/next.css',
  'css/sheets.css',
  'css/settings.css',
  'css/splash.css',
  'js/main.js',
  'js/config.js',
  'js/state.js',
  'js/util/dom.js',
  'js/util/date.js',
  'js/util/text.js',
  'js/data/schema.js',
  'js/data/storage.js',
  'js/data/store.js',
  'js/data/tabs.js',
  'js/data/watchlist.js',
  'js/data/events.js',
  'js/data/import.js',
  'js/data/feed.js',
  'js/data/samples.js',
  'js/data/backup.js',
  'js/services/ics.js',
  'js/services/files.js',
  'js/services/calendar.js',
  'js/services/cloud.js',
  'js/ui/toast.js',
  'js/ui/sheet.js',
  'js/ui/header.js',
  'js/ui/tabs-bar.js',
  'js/ui/event-list.js',
  'js/ui/next-card.js',
  'js/ui/import-sheet.js',
  'js/ui/event-sheet.js',
  'js/ui/tab-manager.js',
  'js/ui/settings-page.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
