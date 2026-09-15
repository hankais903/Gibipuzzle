/* ═══ 聲音 ═══
   音效是當場合成的，不需要音檔。背景音樂才用 mp3。 */

import { core } from './storage.js';

const MUSIC_VOL = 0.22;          // 壓低，才不會蓋掉音效
let AC = null, muted = core.get('mute') === '1';
let BGM = null, fadeTimer = null, playlist = [], trackNo = 0;

function ac(){
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
  } catch(e){ AC = null; }
  return AC;
}

/* 在使用者的手勢裡呼叫一次，才能解鎖瀏覽器的音訊 */
export function unlock(){ ac(); }

export function beep(freq, dur, type, vol, delay, slideTo){
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + (delay || 0);
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol || .12, t + .012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + .03);
}

/* 通用的一組音效，每個遊戲都能直接用 */
export const sfx = {
  tap  : () => beep(620, .06, 'sine', .07),
  untap: () => beep(440, .05, 'sine', .055),
  place: () => { beep(784, .12, 'sine', .13); beep(1175, .22, 'sine', .1, .07); },
  error: () => { beep(392, .14, 'sine', .1);  beep(294, .2,  'sine', .09, .1); },
  win  : () => [523, 659, 784, 1047].forEach((f, i) => beep(f, .26, 'triangle', .12, i * .09)),
  lose : () => [523, 440, 349].forEach((f, i) => beep(f, .3, 'sine', .1, i * .14)),
};

export function initMusic(tracks){
  if (!tracks || !tracks.length) return;
  playlist = tracks.slice().sort(() => Math.random() - 0.5);   // 每次開啟順序都不一樣
  BGM = new Audio();
  BGM.preload = 'auto';
  BGM.volume = 0;
  BGM.addEventListener('error', () => { BGM = null; });        // 檔案不在就當作沒這功能
  BGM.addEventListener('ended', () => {                        // 一首播完接下一首
    trackNo = (trackNo + 1) % playlist.length;
    BGM.src = playlist[trackNo];
    BGM.play().catch(() => {});
  });
  BGM.src = playlist[0];
}

function fadeTo(target, ms){
  if (!BGM) return;
  clearInterval(fadeTimer);
  const from = BGM.volume, steps = Math.max(1, Math.round((ms || 1200) / 50));
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    BGM.volume = Math.max(0, Math.min(1, from + (target - from) * i / steps));
    if (i >= steps){ clearInterval(fadeTimer); if (target === 0) BGM.pause(); }
  }, 50);
}

export function playMusic(){
  if (!BGM || muted) return;
  BGM.play().then(() => fadeTo(MUSIC_VOL, 1500)).catch(() => {});
}

export function isMuted(){ return muted; }

export function setMuted(v){
  muted = !!v;
  core.set('mute', muted ? '1' : '0');
  if (muted) fadeTo(0, 400);
  else { sfx.tap(); playMusic(); }
  return muted;
}

document.addEventListener('visibilitychange', () => {   // 切到別的分頁就停
  if (!BGM) return;
  if (document.hidden) BGM.pause();
  else if (!muted) BGM.play().catch(() => {});
});
