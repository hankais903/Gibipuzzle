/* ═══ 平台入口 ═══
   開場畫面要「馬上」出現，不能等遊戲程式載完——
   拼布動畫只有一秒，等下去就整段錯過了。
   所以流程是：先顯示開場 → 玩家在看動畫時背景載入遊戲 → 按下開始才接手。 */

import { showIntro } from './core/intro.js';
import * as audio from './core/audio.js';

const VERSION = 'Beta v1.8';
const MUSIC = ['assets/music1.mp3', 'assets/music2.mp3', 'assets/music3.mp3'];

/* 遊戲櫃：開場畫面需要的資料都在這裡，不必先載入遊戲程式。
   之後的首頁會用同一份清單。 */
const CATALOG = [
  { id:'gibi',  title:'吉比不能跟吉比坐一起', tagline:'貓咪們要坐開一點喔',
    introTitle:'吉比不能<br>跟吉比坐一起',
    art:'<i class="patch"></i>'.repeat(9) + '<div class="intro-face"></div>' },
  { id:'match', title:'吉比找一樣的', tagline:'幫吉比把一樣的東西配成對',
    introTitle:'吉比<br>找一樣的',
    art:['🐟','🧶','🎀','🐟','🧶','🎀'].map(f => `<div class="intro-tile">${f}</div>`).join('') },
  { id:'push',  title:'吉比推毛線球', tagline:'幫吉比把毛線球推回窩裡',
    introTitle:'吉比<br>推毛線球',
    art:'<div class="intro-kitty"></div><div class="intro-ball">🧶</div><div class="intro-nest"></div>' },
];

const pick = new URLSearchParams(location.search).get('g');
const entry = CATALOG.find(g => g.id === pick) || CATALOG[0];

/* 平台共用的貓咪圖。
   CSS 變數裡如果放相對路徑，瀏覽器會以「使用它的那份樣式表」為基準去算，
   而各遊戲的樣式表在 games/xxx/ 底下，算出來一定是錯的。
   所以這裡先換算成完整網址再交給 CSS。 */
for (const [name, file] of [['--cat','cat.webp'], ['--cat-win','cat-win.webp']]){
  const url = new URL(`assets/art/${file}`, document.baseURI).href;
  document.documentElement.style.setProperty(name, `url("${url}")`);
}
document.documentElement.dataset.game = entry.id;

/* 樣式很小，等它；遊戲程式比較大，不等，讓它在背景載 */
const cssReady = new Promise(done => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `games/${entry.id}/style.css`;
  link.onload = link.onerror = done;
  document.head.appendChild(link);
});
const gameReady = import(`./games/${entry.id}/index.js`);

audio.initMusic(MUSIC);

await cssReady;

showIntro(document.getElementById('shell'), {
  title: entry.introTitle,
  tagline: entry.tagline,
  art: entry.art,
  version: VERSION,
  others: CATALOG.filter(g => g.id !== entry.id),
}, async () => {
  const game = await gameReady;               // 看動畫的時間通常已經載好了
  const { createFrame } = await import('./core/frame.js');
  const frame = createFrame(document.getElementById('app'), game.meta.frame);
  frame.setVersion(VERSION);
  game.start(frame);
});

/* 離線支援：第一次開啟後就把遊戲存在裝置裡 */
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});   // 不支援就當作沒這功能
  });
}
