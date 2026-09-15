/* ═══ 遊戲外框 ═══
   每個遊戲共用的那一圈：關卡標題、時鐘、規則卡、狀態列、工具列、彈窗。
   遊戲只負責中間那塊盤面，其他都交給這裡。 */

import { $, el, esc, mmss } from './util.js';
import * as audio from './audio.js';
import * as board from './leaderboard.js';

export function createFrame(root, spec = {}){
  const rules = spec.rules || [];
  const tools = spec.tools || [];

  root.innerHTML = `
    <div class="wrap">
      <div class="topbar">
        <div class="lvl"><h1>第<span id="lvlNum">1</span>關</h1></div>
        <div class="meta">
          <div class="grade" id="grade">&nbsp;</div>
          <div class="metarow">
            <button class="mute" id="mute" aria-label="音效開關">🔊</button>
            <div class="clock" id="clock">00:00</div>
          </div>
        </div>
      </div>

      <div class="rules">
        ${rules.map((r, i) => `<div class="rule" id="rule${i}"><b>${r.icon}</b>${r.text}</div>`).join('')}
      </div>

      <div class="status">
        <div class="count">${spec.countIcon || ''} <em id="placed">0</em>/<em id="total">0</em></div>
        <div class="lives" id="lives" aria-label="剩下幾次機會"${spec.lives === 0 ? " hidden" : ""}></div>
        <div class="hint-line" id="msg" role="status" aria-live="polite"></div>
      </div>

      <div class="stage" id="stage" style="--chrome-h:${spec.chromeHeight || 296}px;--stage-aspect:${spec.aspect || 1}">
        <div class="grid" id="grid"></div>
        <div class="loading" id="loading">準備中…</div>
      </div>

      <div class="tools" style="--tool-count:${tools.length}">
        ${tools.map(t => `<button class="tool" id="tool-${t.id}"><span>${t.icon}</span>${t.label}` +
          (t.badge ? `<i class="badge" id="badge-${t.id}"></i>` : '') + `</button>`).join('')}
      </div>

      <div class="ver" id="ver"></div>
    </div>

    <div class="done-card" id="dialogCard">
      <div class="card">
        <div class="cats" id="dlgArt"></div>
        <h2 id="dlgTitle"></h2>
        <p id="dlgSub"></p>
        <div id="dlgActions"></div>
      </div>
    </div>

    <div class="done-card" id="boardCard">
      <div class="card board">
        <h2>排行榜</h2>
        <div class="list" id="boardList">載入中…</div>
        <button class="ghost" id="boardClose">關閉</button>
      </div>
    </div>`;

  /* ── 時鐘 ── */
  let t0 = 0, timer = null;
  const tick = () => { $('clock').textContent = mmss((Date.now() - t0) / 1000); };

  /* ── 靜音鈕 ── */
  const paintMute = () => {
    const m = audio.isMuted();
    $('mute').classList.toggle('off', m);
    $('mute').textContent = m ? '🔇' : '🔊';
  };
  $('mute').onclick = () => { audio.setMuted(!audio.isMuted()); paintMute(); };
  paintMute();

  /* ── 排行榜彈窗 ── */
  async function openBoard(){
    $('boardCard').classList.add('show');
    if (board.hasCache()) board.renderInto($('boardList'), await board.fetchBoard());
    else $('boardList').innerHTML = '<div class="empty">載入中…</div>';
    board.renderInto($('boardList'), await board.fetchBoard());
  }
  $('boardClose').onclick = () => $('boardCard').classList.remove('show');

  const frame = {
    boardEl: $('grid'),
    stageEl: $('stage'),

    setLoading: on => { $('loading').style.display = on ? 'grid' : 'none'; },
    setLevel:   n  => { $('lvlNum').textContent = n; },
    setGrade:   s  => { $('grade').textContent = s; },
    setCount:   (a, b) => { $('placed').textContent = a; $('total').textContent = b; },
    setVersion: v  => { $('ver').textContent = v; },
    /* 盤面寬高比，連連看每關不一樣 */
    setAspect: a => { $('stage').style.setProperty('--stage-aspect', a); },

    say(text, bad){
      const m = $('msg');
      m.textContent = text;
      m.classList.toggle('bad', !!bad);
    },

    setLives(used, max = 3, losing = false){
      const box = $('lives');
      box.innerHTML = '';
      for (let k = 0; k < max; k++){
        const f = el('span', {}, '💗');
        if (k < used) f.classList.add('gone');
        if (losing && k === used - 1) f.classList.add('losing');
        box.appendChild(f);
      }
    },

    /* 規則卡閃紅。傳 null 就全部熄掉 */
    warnRule(i){
      rules.forEach((_, k) => $('rule' + k).classList.toggle('warn', k === i));
    },

    onTool(id, fn){
      if (id === 'board'){ $('tool-board').onclick = openBoard; return; }
      $('tool-' + id).onclick = fn;
    },
    setToolEnabled(id, on){ $('tool-' + id).disabled = !on; },
    setToolBadge(id, n){ const b = $('badge-' + id); if (b) b.textContent = n; },

    startClock(){ t0 = Date.now(); clearInterval(timer); timer = setInterval(tick, 1000); tick(); },
    stopClock(){ clearInterval(timer); },
    resetClockStart(){ t0 = Date.now(); },
    elapsed(){ return Math.floor((Date.now() - t0) / 1000); },
    clockText(){ return $('clock').textContent; },

    showDialog({ art = '', title = '', big = false, sub = '', actions = [] }){
      $('dlgArt').innerHTML = art;
      $('dlgTitle').textContent = title;
      $('dlgTitle').classList.toggle('big', big);
      $('dlgSub').textContent = sub;
      const box = $('dlgActions');
      box.innerHTML = '';
      actions.forEach(a => {
        const b = el('button', { className: a.ghost ? 'ghost' : '' }, a.label);
        b.onclick = () => { if (a.close !== false) frame.hideDialog(); a.onClick?.(); };
        box.appendChild(b);
      });
      $('dialogCard').classList.add('show');
    },
    appendDialogSub(text){ $('dlgSub').textContent += text; },
    hideDialog(){ $('dialogCard').classList.remove('show'); },
    openBoard,
  };

  return frame;
}
