/* ═══ 平台入口 ═══
   現在只有一個遊戲，所以直接進吉比。
   之後這裡會變成首頁：列出所有遊戲，選了才載入對應的那一個。 */

import { createFrame } from './core/frame.js';
import { showIntro } from './core/intro.js';
import * as audio from './core/audio.js';
import * as gibi from './games/gibi/index.js';

const VERSION = 'Beta v1.4';
const game = gibi;                         // 之後改成由首頁決定要載入哪個遊戲

audio.initMusic(game.meta.music);

const frame = createFrame(document.getElementById('app'), game.meta.frame);
frame.setVersion(VERSION);

const session = game.start(frame);

showIntro(document.body, {
  ...game.meta.intro,
  tagline: game.meta.tagline,
  version: VERSION,
}, () => session.resetClock());            // 看標題的時間不算進成績

/* 離線支援：第一次開啟後就把遊戲存在裝置裡 */
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});   // 不支援就當作沒這功能
  });
}
