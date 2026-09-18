/* ═══ 平台入口 ═══
   沒有指定遊戲就進首頁；選了遊戲才把那個遊戲載進來。
   首頁與遊戲之間切換不重新整理網頁，所以背景音樂不會斷。 */

import { showHome } from './core/home.js';
import { CATALOG, findGame } from './core/catalog.js';
import * as audio from './core/audio.js';

const VERSION = 'Beta v2.0';
const MUSIC = ['assets/music1.mp3', 'assets/music2.mp3', 'assets/music3.mp3'];

const shell = document.getElementById('shell');
const app   = document.getElementById('app');

/* 平台共用的貓咪圖。
   CSS 變數裡如果放相對路徑，瀏覽器會以「使用它的那份樣式表」為基準去算，
   而各遊戲的樣式表在 games/xxx/ 底下，算出來一定是錯的。
   所以這裡先換算成完整網址再交給 CSS。 */
for (const [name, file] of [['--cat','cat.webp'], ['--cat-win','cat-win.webp']]){
  const url = new URL(`assets/art/${file}`, document.baseURI).href;
  document.documentElement.style.setProperty(name, `url("${url}")`);
}

audio.initMusic(MUSIC);

/* 每個遊戲的樣式只載入一次，回頭再玩就不用重抓 */
const cssLoaded = new Map();
function loadGameCss(id){
  if (!cssLoaded.has(id)){
    cssLoaded.set(id, new Promise(done => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `games/${id}/style.css`;
      link.onload = link.onerror = done;
      document.head.appendChild(link);
    }));
  }
  return cssLoaded.get(id);
}

let session = null;          // 目前這一局，離開時整個收掉

function closeGame(){
  session?.abort();          // 遊戲掛的全域事件一次清乾淨
  session = null;
  app.innerHTML = '';
  document.documentElement.removeAttribute('data-game');
}

async function openGame(id){
  const entry = findGame(id);
  if (!entry) return goHome();

  closeGame();
  document.documentElement.dataset.game = id;
  shell.querySelector('.home-view')?.remove();
  app.innerHTML = '<div class="loading">準備中…</div>';

  const [mod] = await Promise.all([ import(`./games/${id}/index.js`), loadGameCss(id) ]);
  const { createFrame } = await import('./core/frame.js');

  const ctrl = new AbortController();
  session = ctrl;
  app.innerHTML = '';
  const frame = createFrame(app, mod.meta.frame, { signal: ctrl.signal, onBack: goHome });
  frame.setVersion(VERSION);
  mod.start(frame, { signal: ctrl.signal });
}

function goHome(){
  closeGame();
  history.pushState({ view:'home' }, '', location.pathname);
  render('home');
}

function render(view, id){
  if (view === 'game') return openGame(id);
  shell.querySelector('.home-view')?.remove();
  showHome(shell, { version: VERSION, onPick: id => {
    history.pushState({ view:'game', id }, '', `?g=${id}`);
    render('game', id);
  }});
}

/* 手機的返回手勢、瀏覽器的上一頁 */
addEventListener('popstate', e => {
  const s = e.state || {};
  if (s.view === 'game' && findGame(s.id)) render('game', s.id);
  else { closeGame(); render('home'); }
});

const start = new URLSearchParams(location.search).get('g');
if (findGame(start)){
  history.replaceState({ view:'game', id:start }, '', `?g=${start}`);
  render('game', start);
} else {
  history.replaceState({ view:'home' }, '', location.pathname);
  render('home');
}

/* 離線支援：第一次開啟後就把遊戲存在裝置裡 */
if ('serviceWorker' in navigator){
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});   // 不支援就當作沒這功能
  });
}
