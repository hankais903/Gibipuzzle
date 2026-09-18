/* ═══ 首頁 ═══
   列出所有遊戲、各自玩到第幾關，以及暱稱與音效設定。 */

import { $, el, esc } from './util.js';
import { store } from './storage.js';
import * as audio from './audio.js';
import * as board from './leaderboard.js';
import { CATALOG } from './catalog.js';

export function showHome(root, { version, onPick }){
  const nick = board.getNick();

  // 用附加的，不能覆蓋整個外殼——遊戲畫面的 #app 也在裡面
  const view = document.createElement('div');
  view.className = 'home-view';
  view.innerHTML = `
    <div class="home">
      <header class="home-top">
        <div class="home-cat"></div>
        <h1>吉比的遊戲間</h1>
        <p>三個慢慢想的小遊戲</p>
      </header>

      <div class="home-list">
        ${CATALOG.map(g => {
          const lv = store(g.id).num('lv', 0);
          return `
          <button class="game-card" data-id="${g.id}">
            <span class="cover ${g.coverClass}">${g.cover}</span>
            <span class="card-text">
              <b>${esc(g.title)}</b>
              <em>${esc(g.tagline)}</em>
              <span class="card-foot">
                <span class="kind">${esc(g.kind)}</span>
                <span class="prog">${lv > 1 ? `玩到第 ${lv} 關` : lv === 1 ? '已開始' : '還沒玩過'}</span>
              </span>
            </span>
          </button>`;
        }).join('')}
      </div>

      <footer class="home-foot">
        <button class="foot-btn" id="homeMute" aria-label="音效開關"></button>
        <button class="foot-btn wide" id="homeNick">${nick ? `暱稱：${esc(nick)}` : '設定暱稱'}</button>
        <button class="foot-btn" id="homeBoard" aria-label="排行榜">🏆</button>
      </footer>
      <div class="ver">${esc(version)}</div>
    </div>

    <div class="done-card" id="homeDialog">
      <div class="card">
        <h2 id="hdTitle"></h2>
        <div class="nickbox" id="hdNickBox" hidden><input id="hdNick" maxlength="10" placeholder="輸入暱稱"></div>
        <div class="list" id="hdList" hidden></div>
        <div id="hdActions"></div>
      </div>
    </div>`;
  root.appendChild(view);

  /* 卡片：點了就進遊戲 */
  view.querySelectorAll('.game-card').forEach(b => {
    b.onclick = () => { audio.unlock(); audio.playMusic(); onPick(b.dataset.id); };
  });

  /* 靜音 */
  const paintMute = () => {
    const m = audio.isMuted();
    $('homeMute').textContent = m ? '🔇' : '🔊';
    $('homeMute').classList.toggle('off', m);
  };
  $('homeMute').onclick = () => { audio.unlock(); audio.setMuted(!audio.isMuted()); paintMute(); };
  paintMute();

  /* 共用的小彈窗 */
  const dlg = (title, { nickbox, list, actions }) => {
    $('hdTitle').textContent = title;
    $('hdNickBox').hidden = !nickbox;
    $('hdList').hidden = !list;
    const box = $('hdActions'); box.innerHTML = '';
    actions.forEach(a => {
      const b = el('button', { className: a.ghost ? 'ghost' : '' }, a.label);
      b.onclick = () => { if (a.close !== false) $('homeDialog').classList.remove('show'); a.onClick?.(); };
      box.appendChild(b);
    });
    $('homeDialog').classList.add('show');
  };

  $('homeNick').onclick = () => {
    dlg('你叫什麼名字？', {
      nickbox: true,
      actions: [
        { label:'存起來', onClick: () => {
            const v = board.setNick($('hdNick').value);
            if (v) $('homeNick').textContent = `暱稱：${v}`;
          }, close:true },
        { label:'算了', ghost:true },
      ],
    });
    $('hdNick').value = board.getNick();
    $('hdNick').focus();
  };

  $('homeBoard').onclick = async () => {
    dlg('排行榜', { list:true, actions:[{ label:'關閉', ghost:true }] });
    $('hdList').innerHTML = '<div class="empty">載入中…</div>';
    board.renderInto($('hdList'), await board.fetchBoard());
  };

  audio.unlock();
  board.prefetch();
}
