/* ═══ 吉比推毛線球 ═══
   跟前兩個遊戲共用同一套地基。這個遊戲比較不一樣的是
   操作方式：滑動、方向鍵、點格子都可以，而且可以一路回上一步。 */

import { buildLevel, step, solved } from './levels.js';
import { store } from '../../core/storage.js';
import { sfx } from '../../core/audio.js';
import * as board from '../../core/leaderboard.js';

const COACH = {
  1:'滑動畫面來移動吉比，把毛線球推進圈圈裡',
  2:'吉比只能「推」，不能拉，所以別把球推進角落',
  3:'推錯了不要緊，「回上一步」可以一直退回去',
};

export const meta = {
  id: 'push',
  title: '吉比推毛線球',
  tagline: '幫吉比把毛線球推回窩裡',
  music: ['assets/music1.mp3', 'assets/music2.mp3', 'assets/music3.mp3'],
  intro: {
    title: '吉比<br>推毛線球',
    art: '<div class="intro-kitty"></div><div class="intro-ball">🧶</div><div class="intro-nest"></div>',
  },
  frame: {
    countIcon: '🧶',
    chromeHeight: 296,
    lives: 0,                 // 推錯不扣血，回上一步就好
    aspect: 1,
    rules: [
      { icon:'👆', text:'滑動<br>移動吉比' },
      { icon:'➡️', text:'只能推<br>不能拉' },
      { icon:'⭕', text:'推進圈圈<br>就完成' },
    ],
    tools: [
      { id:'undo',    icon:'↩︎', label:'回上一步' },
      { id:'restart', icon:'🔄', label:'重來' },
      { id:'board',   icon:'🏆', label:'排行榜' },
    ],
  },
};

export function start(frame){
  const save = store('push');
  const S = { level:1, L:null, cat:0, boxes:[], history:[], moves:0, solved:false, sec:0 };
  let ballEls = [], catEl = null, D = [];

  /* ══ 開一關 ══ */
  function newLevel(level){
    S.level = level; S.solved = false; S.history = []; S.moves = 0;
    frame.setLevel(level);
    save.set('lv', level);
    frame.setLoading(true);
    frame.hideDialog();
    frame.stopClock();

    setTimeout(() => {
      const L = buildLevel(level);
      if (!L){                                  // 理論上不會發生，但不能讓玩家卡住
        frame.say('這一關出了點狀況，幫你換下一關', true);
        newLevel(level + 1);
        return;
      }
      S.L = L;
      S.cat = L.cat;
      S.boxes = L.boxes.slice();
      D = [-L.cols, L.cols, -1, 1];

      frame.setAspect(L.cols / L.rows);
      drawRoom();
      frame.setGrade(`${L.cols - 2}×${L.rows - 2}・${L.boxes.length} 顆`);
      frame.setLoading(false);
      frame.startClock();
      refresh();
      frame.say(COACH[level] || '把毛線球推進圈圈裡');
    }, 30);
  }

  /* ══ 畫房間 ══ */
  function drawRoom(){
    const { cols, rows, walls, targets } = S.L;
    const el = frame.boardEl;
    el.style.gridTemplateColumns = `repeat(${cols},1fr)`;
    el.style.gridTemplateRows    = `repeat(${rows},1fr)`;
    el.innerHTML = '';

    for (let i = 0; i < cols * rows; i++){
      const d = document.createElement('div');
      d.className = 'pcell ' + (walls[i] ? 'wall' : 'floor') + (targets.includes(i) ? ' target' : '');
      el.appendChild(d);
    }

    // 毛線球與吉比疊在房間上面，用位移動畫移動
    ballEls = S.boxes.map(() => {
      const b = document.createElement('div');
      b.className = 'piece ball';
      el.appendChild(b);
      return b;
    });
    catEl = document.createElement('div');
    catEl.className = 'piece kitty';
    catEl.style.setProperty('--face', 1);
    el.appendChild(catEl);

    el.setAttribute('role', 'application');
    el.setAttribute('aria-label', '推毛線球的房間，用方向鍵移動吉比');
    el.tabIndex = 0;
    measure();
  }

  function measure(){
    const rect = frame.stageEl.getBoundingClientRect();
    frame.stageEl.style.setProperty('--cell', ((rect.width || 300) / S.L.cols) + 'px');
  }
  window.addEventListener('resize', () => { if (S.L) measure(); });

  function place(el, idx){
    el.style.setProperty('--x', idx % S.L.cols);
    el.style.setProperty('--y', (idx / S.L.cols) | 0);
  }

  function refresh(){
    const { targets } = S.L;
    S.boxes.forEach((b, i) => {
      place(ballEls[i], b);
      ballEls[i].classList.toggle('home', targets.includes(b));
    });
    place(catEl, S.cat);
    const done = S.boxes.filter(b => targets.includes(b)).length;
    frame.setCount(done, S.boxes.length);
    frame.setToolEnabled('undo', S.history.length > 0);
  }

  /* ══ 移動 ══ */
  function move(d){
    if (S.solved) return;
    const r = step(S.L.walls, S.cat, S.boxes, d);
    if (!r){                                     // 推不動
      frame.boardEl.classList.remove('bump');
      void frame.boardEl.offsetWidth;
      frame.boardEl.classList.add('bump');
      sfx.untap();
      return;
    }
    S.history.push({ cat:S.cat, boxes:S.boxes.slice() });
    if (S.history.length > 400) S.history.shift();

    if (d === -1 || d === 1) catEl.style.setProperty('--face', d === -1 ? -1 : 1);
    S.cat = r.cat;
    S.boxes = r.boxes;
    S.moves++;
    r.pushed >= 0 ? sfx.tap() : sfx.untap();
    refresh();

    if (solved(S.boxes, S.L.targets)) win();
    else frame.say(`走了 ${S.moves} 步`);
  }

  /* 滑動 */
  let sw = null;
  frame.boardEl.addEventListener('pointerdown', e => {
    sw = { x:e.clientX, y:e.clientY };
    frame.boardEl.focus({ preventScroll:true });
  });
  frame.boardEl.addEventListener('pointerup', e => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    sw = null;
    const cell = parseFloat(getComputedStyle(frame.stageEl).getPropertyValue('--cell')) || 40;
    if (Math.hypot(dx, dy) < cell * 0.35){        // 沒滑動，當作點某一格
      tapAt(e.clientX, e.clientY);
      return;
    }
    const [cols] = [S.L.cols];
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? cols : -cols));
  });
  window.addEventListener('touchmove', e => { if (sw) e.preventDefault(); }, { passive:false });

  /* 點一格：往那一格的方向走一步 */
  function tapAt(x, y){
    const rect = frame.boardEl.getBoundingClientRect();
    const cw = rect.width / S.L.cols, ch = rect.height / S.L.rows;
    const c = Math.floor((x - rect.left) / cw), r = Math.floor((y - rect.top) / ch);
    if (c < 0 || r < 0 || c >= S.L.cols || r >= S.L.rows) return;
    const dc = c - S.cat % S.L.cols, dr = r - ((S.cat / S.L.cols) | 0);
    if (!dc && !dr) return;
    move(Math.abs(dc) > Math.abs(dr) ? (dc > 0 ? 1 : -1) : (dr > 0 ? S.L.cols : -S.L.cols));
  }

  /* 鍵盤 */
  window.addEventListener('keydown', e => {
    if (S.solved || !S.L) return;
    const map = { ArrowUp:-S.L.cols, ArrowDown:S.L.cols, ArrowLeft:-1, ArrowRight:1,
                  w:-S.L.cols, s:S.L.cols, a:-1, d:1 };
    const d = map[e.key];
    if (d === undefined) return;
    e.preventDefault();
    move(d);
  });

  /* ══ 過關 ══ */
  function win(){
    S.solved = true;
    frame.stopClock();
    sfx.win();
    S.sec = frame.elapsed();
    frame.say('毛線球都回家了，好棒！');

    setTimeout(() => frame.showDialog({
      art:'<div class="pushwin"></div>',
      title:'恭喜過關！', big:true,
      sub:`第 ${S.level} 關　用時 ${frame.clockText()}　走了 ${S.moves} 步`,
      actions:[
        { label:'下一關', onClick:() => newLevel(S.level + 1) },
        { label:'再玩一次', ghost:true, onClick:() => newLevel(S.level) },
      ],
    }), 600);

    if (board.enabled){
      board.invalidate();
      board.submit({ game:'push', level:S.level, sec:S.sec,
                     miss:S.moves, hint:0 }).then(ok => {
        if (!board.getNick()) frame.appendDialogSub('　（設定暱稱才能上榜）');
        else if (ok) frame.appendDialogSub('　成績已上傳');
      });
    }
  }

  /* ══ 工具列 ══ */
  frame.onTool('undo', () => {
    if (!S.history.length || S.solved) return;
    const prev = S.history.pop();
    S.cat = prev.cat;
    S.boxes = prev.boxes;
    S.moves = Math.max(0, S.moves - 1);
    refresh();
    frame.say(`退回到第 ${S.moves} 步`);
  });

  frame.onTool('restart', () => {
    if (S.solved) return;
    S.cat = S.L.cat;
    S.boxes = S.L.boxes.slice();
    S.history = [];
    S.moves = 0;
    refresh();
    frame.say('重新開始這一關');
  });

  frame.onTool('board');

  newLevel(Math.max(1, save.num('lv', 1)));

  return { resetClock: () => frame.resetClockStart() };
}
