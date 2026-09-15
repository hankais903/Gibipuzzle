/* ═══ 平台入口 ═══
   現在只有一個遊戲，所以直接進吉比。
   之後這裡會變成首頁：列出所有遊戲，選了才載入對應的那一個。 */

import { createFrame } from './core/frame.js';
import { showIntro } from './core/intro.js';
import * as audio from './core/audio.js';
import * as gibi from './games/gibi/index.js';
import * as match from './games/match/index.js';
import * as push  from './games/push/index.js';

const VERSION = 'Beta v1.6';
const GAMES = { gibi, match, push };

/* 之後首頁會讓玩家選；現在先用網址決定，方便測試：
   index.html?g=match 就會開連連看 */
const pick = new URLSearchParams(location.search).get('g');
const game = GAMES[pick] || gibi;

/* 平台共用的貓咪圖。
   CSS 變數裡如果放相對路徑，瀏覽器會以「使用它的那份樣式表」為基準去算，
   而各遊戲的樣式表在 games/xxx/ 底下，算出來一定是錯的。
   所以這裡先換算成完整網址再交給 CSS。 */
for (const [name, file] of [['--cat','cat.webp'], ['--cat-win','cat-win.webp']]){
  const url = new URL(`assets/art/${file}`, document.baseURI).href;
  document.documentElement.style.setProperty(name, `url("${url}")`);
}

/* 只載入這個遊戲的樣式，各遊戲的 CSS 才不會互相蓋掉 */
await new Promise(done => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `games/${game.meta.id}/style.css`;
  link.onload = link.onerror = done;
  document.head.appendChild(link);
});
document.documentElement.dataset.game = game.meta.id;

audio.initMusic(game.meta.music);

const frame = createFrame(document.getElementById('app'), game.meta.frame);
frame.setVersion(VERSION);

const session = game.start(frame);

showIntro(document.body, {
  ...game.meta.intro,
  tagline: game.meta.tagline,
  version: VERSION,
  others: Object.values(GAMES)
    .filter(g => g.meta.id !== game.meta.id)
    .map(g => ({ id: g.meta.id, title: g.meta.title })),
}, () => session.resetClock());            // 看標題的時間不算進成績

/* 離線支援：第一次開啟後就把遊戲存在裝置裡 */
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});   // 不支援就當作沒這功能
  });
}
