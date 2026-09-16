/* ═══ 吉比找一樣的 ═══
   跟吉比共用同一套地基：關卡標題、時鐘、工具列、彈窗、排行榜
   都由 core/frame.js 提供，這裡只寫這個遊戲自己的規則。 */

import { buildBoard, findPath, anyMove, reshuffle, FACES, EMPTY } from './levels.js';
import { store } from '../../core/storage.js';
import { sfx } from '../../core/audio.js';
import * as board from '../../core/leaderboard.js';

const PATCH = ['var(--r1)','var(--r2)','var(--r3)','var(--r4)','var(--r5)',
               'var(--r6)','var(--r7)','var(--r8)','var(--r9)'];
const HINTS = 3, SHUFFLES = 3;

const COACH = {
  1:'點兩個一樣的東西，牠們就會消失',
  2:'連過去的路不能被擋住，最多只能轉兩個彎',
  3:'路可以繞到盤面外面喔',
};

export const meta = {
  id: 'match',
  title: '吉比找一樣的',
  tagline: '幫吉比把一樣的東西配成對',
  music: ['assets/music1.mp3', 'assets/music2.mp3', 'assets/music3.mp3'],
  intro: {
    title: '吉比<br>找一樣的',
    art: ['🐟','🧶','🎀','🐟','🧶','🎀']
           .map(f => `<div class="intro-tile">${f}</div>`).join(''),
  },
  frame: {
    countIcon: '🧩',
    lives: 0,                 // 這個遊戲不扣愛心，點錯只是重選
    aspect: 1,                // 每關不同，開關時再用 setAspect 調整
    rules: [
      { icon:'🔍', text:'找出兩個<br>一樣的' },
      { icon:'↩︎', text:'最多只能<br>轉兩個彎' },
      { icon:'🚪', text:'可以繞到<br>外面' },
    ],
    tools: [                  // 只有三個，地基會自己排好
      { id:'hint',    icon:'💡', label:'提示', badge:true },
      { id:'shuffle', icon:'🔀', label:'洗牌', badge:true },
      { id:'board',   icon:'🏆', label:'排行榜' },
    ],
  },
};

export function start(frame){
  const save = store('match');
  const S = { level:1, B:null, picked:-1, busy:false, solved:false,
              hints:HINTS, shuffles:SHUFFLES, matched:0, autoShuffles:0, sec:0 };
  let tileEls = [], link = null;

  const rnd = Math.random;

  /* ══ 開一關 ══ */
  function newLevel(level){
    S.level = level; S.solved = false; S.picked = -1; S.busy = false;
    S.hints = HINTS; S.shuffles = SHUFFLES; S.matched = 0; S.autoShuffles = 0;
    frame.setLevel(level);
    save.set('lv', level);
    frame.setLoading(true);
    frame.hideDialog();
    frame.stopClock();

    setTimeout(() => {
      S.B = buildBoard(level, rnd);
      frame.setAspect(S.B.cols / S.B.rows);     // 盤面是橫的，不是正方形
      drawBoard();
      frame.setCount(0, S.B.pairs);
      frame.setGrade(`${S.B.cols}×${S.B.rows}・${S.B.pairs} 對`);
      frame.setLoading(false);
      frame.startClock();
      syncTools();
      frame.say(COACH[level] || '找出兩個一樣的，點一下就好');
    }, 30);
  }

  /* ══ 畫盤面 ══ */
  function drawBoard(){
    const { cols, rows, W, g } = S.B;
    const el = frame.boardEl;
    el.style.gridTemplateColumns = `repeat(${cols},1fr)`;
    el.style.gridTemplateRows    = `repeat(${rows},1fr)`;
    el.innerHTML = '';
    tileEls = [];

    for (let r = 0; r < rows; r++){
      for (let c = 0; c < cols; c++){
        const idx = (r + 1) * W + (c + 1);          // 對應到有外框的座標
        const b = document.createElement('button');
        b.className = 'tile';
        b.dataset.idx = idx;
        const face = g[idx];
        b.style.background = PATCH[face % 9];
        b.textContent = FACES[face];
        b.setAttribute('aria-label', `第${r + 1}行 第${c + 1}列 ${FACES[face]}`);
        b.addEventListener('click', () => pick(idx));
        el.appendChild(b);
        tileEls[idx] = b;
      }
    }

    // 連線用的圖層，蓋在盤面上，可以畫到盤面外一格
    link = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    link.setAttribute('class', 'link');
    link.setAttribute('viewBox', `0 0 ${S.B.W} ${S.B.H}`);
    link.setAttribute('preserveAspectRatio', 'none');
    frame.stageEl.appendChild(link);

    measure();
  }

  /* 量出一格多大，讓圖案與連線跟著格子縮放 */
  function measure(){
    const rect = frame.stageEl.getBoundingClientRect();
    frame.stageEl.style.setProperty('--cell', ((rect.width || 300) / S.B.cols) + 'px');
  }
  window.addEventListener('resize', () => { if (S.B) measure(); });

  /* ══ 點一張 ══ */
  function pick(idx){
    if (S.busy || S.solved) return;
    const g = S.B.g;
    if (g[idx] === EMPTY) return;

    if (S.picked === idx){                 // 再點一次＝取消
      setPicked(-1); sfx.untap(); return;
    }
    if (S.picked < 0){
      setPicked(idx); sfx.tap(); return;
    }

    const a = S.picked;
    if (g[a] !== g[idx]){                  // 不一樣，改選新的那張
      setPicked(idx); sfx.tap();
      frame.say('這兩個不一樣喔');
      return;
    }

    const path = findPath(g, S.B.W, S.B.H, a, idx);
    if (!path){
      setPicked(idx); sfx.error();
      frame.say('一樣，但是路被擋住了', true);
      return;
    }
    clear(a, idx, path);
  }

  function setPicked(idx){
    if (S.picked >= 0 && tileEls[S.picked]) tileEls[S.picked].classList.remove('picked');
    S.picked = idx;
    if (idx >= 0) tileEls[idx].classList.add('picked');
  }

  /* ══ 消掉一對 ══ */
  function clear(a, b, path){
    S.busy = true;
    setPicked(-1);
    sfx.place();
    drawLink(path);

    tileEls[a].classList.add('gone');
    tileEls[b].classList.add('gone');
    S.B.g[a] = EMPTY; S.B.g[b] = EMPTY;
    S.matched++;
    frame.setCount(S.matched, S.B.pairs);

    setTimeout(() => {
      [a, b].forEach(i => {
        tileEls[i].classList.remove('gone');
        tileEls[i].classList.add('empty');
      });
      link.innerHTML = '';
      S.busy = false;

      if (S.matched === S.B.pairs){ win(); return; }

      if (!anyMove(S.B.g, S.B.W, S.B.H)){       // 卡住了，免費幫玩家洗牌
        if (reshuffle(S.B.g, S.B.W, S.B.H, rnd)){
          S.autoShuffles++;
          repaint();
          frame.say('沒得消了，幫你洗牌囉');
        }
      } else {
        frame.say(`還剩 ${S.B.pairs - S.matched} 對`);
      }
    }, 260);
  }

  /* 洗牌之後把圖案重畫一次 */
  function repaint(){
    const g = S.B.g;
    tileEls.forEach((el, idx) => {
      if (!el) return;
      const face = g[idx];
      if (face === EMPTY){ el.classList.add('empty'); return; }
      el.classList.remove('empty');
      el.style.background = PATCH[face % 9];
      el.textContent = FACES[face];
      el.setAttribute('aria-label', FACES[face]);
    });
    setPicked(-1);
  }

  function drawLink(path){
    const pts = path.map(i => {
      const r = (i / S.B.W) | 0, c = i % S.B.W;
      return `${c + 0.5},${r + 0.5}`;
    }).join(' ');
    link.innerHTML = `<polyline points="${pts}" />`;
  }

  function syncTools(){
    frame.setToolEnabled('hint', S.hints > 0);
    frame.setToolBadge('hint', S.hints);
    frame.setToolEnabled('shuffle', S.shuffles > 0);
    frame.setToolBadge('shuffle', S.shuffles);
  }

  /* ══ 過關 ══ */
  function win(){
    S.solved = true;
    frame.stopClock();
    sfx.win();
    S.sec = frame.elapsed();
    frame.say('全部配對完成，好棒！');

    const notes = [`第 ${S.level} 關　用時 ${frame.clockText()}`];
    if (S.hints < HINTS) notes.push(`用了 ${HINTS - S.hints} 次提示`);
    if (S.shuffles < SHUFFLES) notes.push(`洗牌 ${SHUFFLES - S.shuffles} 次`);
    if (S.hints === HINTS && S.shuffles === SHUFFLES) notes.push('沒用任何道具');

    setTimeout(() => frame.showDialog({
      art:'<div class="matchwin">🐟🧶🎀</div>',
      title:'恭喜過關！', big:true,
      sub:notes.join('　'),
      actions:[
        { label:'下一關', onClick:() => newLevel(S.level + 1) },
        { label:'再玩一次', ghost:true, onClick:() => newLevel(S.level) },
      ],
    }), 600);

    if (board.enabled){
      board.invalidate();
      board.submit({ game:'match', level:S.level, sec:S.sec,
                     miss:0, hint:HINTS - S.hints }).then(ok => {
        if (!board.getNick()) frame.appendDialogSub('　（設定暱稱才能上榜）');
        else if (ok) frame.appendDialogSub('　成績已上傳');
      });
    }
  }

  /* ══ 工具列 ══ */
  frame.onTool('hint', () => {
    if (S.hints <= 0 || S.busy || S.solved) return;
    const mv = anyMove(S.B.g, S.B.W, S.B.H);
    if (!mv) return;
    S.hints--; syncTools();
    mv.forEach(i => {
      tileEls[i].classList.remove('flash');
      void tileEls[i].offsetWidth;                 // 重新觸發動畫
      tileEls[i].classList.add('flash');
      setTimeout(() => tileEls[i].classList.remove('flash'), 1100);
    });
    frame.say('這兩個可以消');
  });

  frame.onTool('shuffle', () => {
    if (S.shuffles <= 0 || S.busy || S.solved) return;
    if (!reshuffle(S.B.g, S.B.W, S.B.H, rnd)) return;
    S.shuffles--; syncTools();
    repaint();
    frame.say('重新洗好了');
  });

  frame.onTool('board');

  newLevel(Math.max(1, save.num('lv', 1)));

  return { resetClock: () => frame.resetClockStart() };
}
