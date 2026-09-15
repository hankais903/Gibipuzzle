/* ═══ 開場畫面 ═══
   之後這裡會變成「選遊戲的首頁」，現在先直接進入唯一的遊戲。
   它也負責在使用者的第一個手勢裡解鎖音訊（瀏覽器的規定）。 */

import { $, el } from './util.js';
import * as audio from './audio.js';
import * as board from './leaderboard.js';

export function showIntro(root, spec, onStart){
  root.insertAdjacentHTML('beforeend', `
    <div class="intro" id="intro">
      <div class="intro-stage">${spec.art || ''}</div>
      <h1 class="intro-title">${spec.title || ''}</h1>
      <p class="intro-sub" id="introSub">${spec.tagline || ''}</p>
      <div class="nickbox intro-nick" id="introNickBox" hidden>
        <input id="introNick" maxlength="10" placeholder="輸入暱稱">
      </div>
      <button class="intro-go" id="introGo">開始玩</button>
      <div class="game-switch" id="gameSwitch"></div>
      <div class="ver intro-ver" id="verIntro">${spec.version || ''}</div>
    </div>`);

  /* 暫時的遊戲切換。第三階段會換成正式的首頁 */
  if (spec.others && spec.others.length){
    $('gameSwitch').innerHTML = '換個遊戲玩：' + spec.others
      .map(g => `<a href="?g=${g.id}">${g.title}</a>`).join('');
  }

  /* 有排行榜才需要暱稱 */
  if (board.enabled){
    const nick = board.getNick();
    if (nick){
      $('introSub').textContent = `歡迎回來，${nick}`;
      $('introSub').classList.add('tappable');       // 點名字就能改
      $('introSub').onclick = () => {
        $('introNickBox').hidden = false;
        $('introNick').value = nick;
        $('introSub').textContent = '要改成什麼名字呢？';
        $('introSub').classList.remove('tappable');
        $('introSub').onclick = null;
        $('introNick').focus();
      };
    } else {
      $('introNickBox').hidden = false;
    }
  }

  $('intro').addEventListener('pointerdown',
    () => $('intro').classList.add('fast'), { once:true });   // 等不及就跳過動畫

  $('introNick').addEventListener('keydown',
    e => { if (e.key === 'Enter') $('introGo').click(); });

  $('introGo').onclick = () => {
    if (!$('introNickBox').hidden){
      const v = board.setNick($('introNick').value);
      if (!v){ $('introNick').focus(); return; }     // 要填了才放行
    }
    const box = $('intro');
    box.classList.add('gone');
    setTimeout(() => box.remove(), 400);

    audio.unlock();                                  // 必須在使用者手勢裡
    audio.playMusic();
    board.prefetch();
    onStart?.();
  };
}
