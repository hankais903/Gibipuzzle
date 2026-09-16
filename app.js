/* ═══ 平台入口 ═══
   現在只有切換連結；之後首頁會用同一份 CATALOG 列出所有遊戲。 */

import { createFrame } from './core/frame.js';
import { showIntro } from './core/intro.js';
import * as audio from './core/audio.js';

const VERSION = 'Beta v1.7';

const CATALOG = [
  { id:'gibi',  title:'吉比不能跟吉比坐一起' },
  { id:'match', title:'吉比找一樣的' },
  { id:'push',  title:'吉比推毛線球' },
];

const pick = new URLSearchParams(location.search).get('g');
const id = CATALOG.some(g => g.id === pick) ? pick : CATALOG[0].id;

/* 平台共用的貓咪圖。
   CSS 變數裡如果放相對路徑，瀏覽器會以「使用它的那份樣式表」為基準去算，
   而各遊戲的樣式表在 games/xxx/ 底下，算出來一定是錯的。
   所以這裡先換算成完整網址再交給 CSS。 */
for (const [name, file] of [['--cat','cat.webp'], ['--cat-win','cat-win.webp']]){
  const url = new URL(`assets/art/${file}`, document.baseURI).href;
  document.documentElement.style.setProperty(name, `url("${url}")`);
}

/* 只載入這一個遊戲：程式與樣式同時抓，不要一個等一個。
   以前是三個遊戲全部先載入，開場動畫要等十幾個檔案，慢的網路上
   要兩秒半才看得到。 */
const cssReady = new Promise(done => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `games/${id}/style.css`;
  link.onload = link.onerror = done;
  document.head.appendChild(link);
});
const [mod] = await Promise.all([ import(`./games/${id}/index.js`), cssReady ]);
const game = mod;
document.documentElement.dataset.game = id;

audio.initMusic(game.meta.music);

const frame = createFrame(document.getElementById('app'), game.meta.frame);
frame.setVersion(VERSION);

const session = game.start(frame);

showIntro(document.body, {
  ...game.meta.intro,
  tagline: game.meta.tagline,
  version: VERSION,
  others: CATALOG.filter(g => g.id !== id),
}, () => session.resetClock());            // 看標題的時間不算進成績

/* 離線支援：第一次開啟後就把遊戲存在裝置裡 */
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});   // 不支援就當作沒這功能
  });
}
