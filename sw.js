/* ═══ 離線用的快取 ═══
   第一次打開時把遊戲整包存起來，之後沒網路也能玩，
   音樂也不用每次重抓。改版時把 VERSION 加一，舊的會自動清掉。 */

const VERSION = 'gibi-v2';
const SHELL = [
  './', './index.html', './app.js', './manifest.json',
  './core/theme.css', './core/util.js', './core/storage.js',
  './core/audio.js', './core/leaderboard.js', './core/frame.js', './core/intro.js',
  './games/gibi/index.js', './games/gibi/levels.js', './games/gibi/style.css',
  './games/match/index.js', './games/match/levels.js', './games/match/style.css',
  './assets/music1.mp3', './assets/music2.mp3', './assets/music3.mp3',
  './assets/icons/icon-32.png', './assets/icons/icon-180.png',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // 一個檔案抓不到不該讓整包失敗，所以逐個抓
    await Promise.all(SHELL.map(u => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 排行榜一定要即時，不能用快取
  if (url.hostname.endsWith('script.google.com')) return;

  // 開啟 App 本身：先給快取的畫面，沒網路也進得去
  if (req.mode === 'navigate'){
    e.respondWith((async () => {
      try { return await fetch(req); }
      catch(err){ return (await caches.match('./index.html')) || Response.error(); }
    })());
    return;
  }

  // 其他：有快取就先用，同時在背景更新
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')){
        caches.open(VERSION).then(c => c.put(req, res.clone()));
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
