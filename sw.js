// オフラインでも開けるようにするための仕組み。
// 通信できるときは常に最新のファイルを取りに行き、できないときだけ保存済みのものを使う。
// ファイルを追加・削除したら ASSETS を直し、CACHE の番号を上げる。
const CACHE = 'event-cho-v115';
const ASSETS = [
  './',
  'index.html',
  'dist/app.min.js',
  'dist/app.min.css',
  'fonts/BarlowCondensed-500.woff',
  'fonts/BarlowCondensed-600.woff',
  'fonts/BarlowCondensed-700.woff',
  'fonts/CormorantGaramond-500-italic.woff',
  'js/boot-css.js',
  'js/boot-splash.js',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'img/splash-plane.png',
  'img/splash-car.png',
  'img/splash-train.png'
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

// アプリ本体（画面を作るファイル）は、保存済みのものをすぐ出し、裏で最新を取りに行く（次の起動で反映）。
// 起動のたびに通信を待たないので、最初の画面が早く出る。
// 日程データ（json）は、保存せず、いつも通信で最新を読む。
// （読み込みのたびに付く印つきのアドレスで保存すると、使われない保存分が増え続けるため。通信できないときは、アプリ側が「読めない」と扱うだけで困らない）
const LIVE = ['feed.json', 'updates.json', 'watchlist.json'];

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (LIVE.some((n) => url.pathname.endsWith('/' + n))) return; // 何もせず、そのまま通信する（保存しない）
  const fresh = () => fetch(req).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  });
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fresh().catch(() => hit || caches.match('index.html'));
      if (hit) { e.waitUntil(net); return hit; }
      return net;
    })
  );
});
