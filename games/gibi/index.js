/* ═══ 吉比不能跟吉比坐一起 ═══
   這個檔案只管「這個遊戲的規則」。
   關卡標題、時鐘、愛心、工具列、彈窗都由 core/frame.js 提供。 */

import { buildLevel } from './levels.js';
import { store } from '../../core/storage.js';
import { sfx } from '../../core/audio.js';
import * as board from '../../core/leaderboard.js';

const EMPTY = 0, MARK = 1, CAT = 2, WRONG = 3;
const PATCH = ['var(--r1)','var(--r2)','var(--r3)','var(--r4)','var(--r5)',
               'var(--r6)','var(--r7)','var(--r8)','var(--r9)'];
const LIVES = 3, HINTS = 3;
const GAP = 3;                    // 跟 style.css 的 .grid gap 一致

/* 前幾關的引導：一次只教一件事 */
const COACH = {
  1:'先找最小的顏色，只有一格的話，貓咪一定在那裡',
  2:'放好貓咪後，把牠的整排和旁邊的格子都打叉',
  3:'打完叉，如果一排只剩一格空的，那就是貓咪的位子',
  4:'每個顏色都要有一隻貓咪，先從格子少的顏色開始',
  5:'卡住的話換個方向看看：直的排，或是同顏色'
};

/* 規則卡的順序，要跟下面 meta.rules 一致 */
const R_COLOR = 0, R_LINE = 1, R_NEAR = 2;

export const meta = {
  id: 'gibi',
  title: '吉比不能跟吉比坐一起',
  frame: {
    countIcon: '<i class="catmini"></i>',
    rules: [
      { icon:'🧶', text:'每色一隻貓' },
      { icon:'↕',  text:'每行每列<br>一隻貓' },
      { icon:'🚫', text:'貓咪不能<br>靠在一起' },
    ],
    tools: [
      { id:'undo',  icon:'↩︎', label:'回上一步' },
      { id:'hint',  icon:'💡', label:'提示', badge:true },
      { id:'clear', icon:'🧹', label:'全部清空' },
      { id:'board', icon:'🏆', label:'排行榜' },
    ],
  },
};

export function start(frame){
  const save = store('gibi');
  const S = { level:1, n:6, reg:[], cols:[], cells:[], history:[],
              hints:HINTS, solved:false, over:false, locked:-1, mistakes:0, sec:0 };

  /* ══ 開一關 ══ */
  function newLevel(level){
    S.level = level; S.solved = false; S.over = false;
    S.history = []; S.hints = HINTS; S.mistakes = 0;
    frame.setLives(0, LIVES);
    frame.setLevel(level);
    save.set('lv', level);
    frame.setLoading(true);
    frame.hideDialog();
    frame.stopClock();

    setTimeout(() => {
      const lv = buildLevel(level);
      if (!lv){                                   // 真的生不出來就跳過，不讓玩家卡死
        frame.say('這一關出了點狀況，幫你換下一關', true);
        newLevel(level + 1);
        return;
      }
      S.n = lv.n; S.reg = lv.reg; S.cols = lv.cols;
      S.cells = new Array(lv.n * lv.n).fill(EMPTY);
      S.locked = lv.locked;
      S.cells[S.locked] = CAT;

      frame.setCount(0, lv.n);
      drawBoard();
      frame.setLoading(false);
      frame.startClock();
      refresh();
      frame.setGrade(`${lv.n}×${lv.n}・${['','簡單','要想一下','有點難'][lv.tier]}`);
      frame.say(COACH[level] || '第一隻貓咪幫你放好囉');
    }, 30);
  }

  /* ══ 畫盤面 ══ */
  function drawBoard(){
    const n = S.n, g = frame.boardEl;
    g.style.gridTemplateColumns = `repeat(${n},1fr)`;
    g.style.gridTemplateRows    = `repeat(${n},1fr)`;
    g.innerHTML = '';
    for (let i = 0; i < n * n; i++){
      const b = document.createElement('button');
      b.className = 'cell';
      b.dataset.i = i;
      b.style.background = PATCH[S.reg[i] % 9];
      b.setAttribute('aria-label', `第${Math.floor(i / n) + 1}行 第${i % n + 1}列`);
      b.appendChild(Object.assign(document.createElement('div'), { className:'glyph' }));
      b.addEventListener('click', () => {
        if (D.suppress){ D.suppress = false; return; }   // 剛剛是拖曳，不算點擊
        tap(i);
      });
      g.appendChild(b);
    }
    cellEls = [...g.children];
    measure();
  }
  let cellEls = [];

  /* 量出一格多大，讓貓咪跟著格子縮放 */
  function measure(){
    const g = frame.boardEl;
    const w = g.getBoundingClientRect().width || 300;
    g.style.setProperty('--cell', ((w - (S.n + 1) * GAP) / S.n) + 'px');
  }
  window.addEventListener('resize', () => { if (S.reg.length) measure(); });

  /* ══ 拖曳連續畫叉 ══ */
  const D = { on:false, mode:null, start:-1, moved:false, suppress:false, last:-1 };
  function cellAt(x, y){
    const el = document.elementFromPoint(x, y);
    const c = el && el.closest ? el.closest('.cell') : null;
    return c ? +c.dataset.i : -1;
  }
  function paint(i){
    if (i < 0 || S.cells[i] === CAT || S.cells[i] === WRONG) return;
    if (D.mode === 'mark'  && S.cells[i] === EMPTY) S.cells[i] = MARK;
    else if (D.mode === 'erase' && S.cells[i] === MARK) S.cells[i] = EMPTY;
  }
  frame.boardEl.addEventListener('pointerdown', e => {
    D.suppress = false;
    if (S.solved || S.over) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i < 0) return;
    D.on = true; D.moved = false; D.start = i; D.last = i;
    D.mode = S.cells[i] === MARK ? 'erase' : 'mark';   // 從自己畫的叉起手＝擦掉
  });
  frame.boardEl.addEventListener('pointermove', e => {
    if (!D.on) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i < 0 || i === D.last) return;
    if (!D.moved){                                     // 真的移動了才算拖曳，並存檔一次
      D.moved = true;
      pushHistory();
      paint(D.start);
    }
    D.last = i; paint(i); refresh();
  });
  const endDrag = () => {
    if (!D.on) return;
    D.on = false;
    if (D.moved){
      D.suppress = true;
      refresh();
      frame.say(D.mode === 'erase' ? '擦掉一整排叉叉' : '打好一整排叉叉');
    }
  };
  window.addEventListener('touchmove', e => { if (D.on) e.preventDefault(); }, { passive:false });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  function pushHistory(){
    S.history.push(S.cells.slice());
    if (S.history.length > 80) S.history.shift();
  }

  /* ══ 點一格 ══ */
  let lastTap = { i:-1, t:0 };
  function tap(i){
    if (S.solved || S.over) return;
    if (S.cells[i] === CAT)  { frame.say('這隻貓咪坐好了，不要吵牠～'); return; }
    if (S.cells[i] === WRONG){ frame.say('這裡已經確定不行囉'); return; }

    const now = Date.now(), quick = (i === lastTap.i && now - lastTap.t < 300);
    lastTap = { i, t:now };
    if (!quick) pushHistory();          // 連點兩下算同一個動作，只留一筆回上一步

    let wrong = null;
    if (quick){                         // 連點兩下 → 放貓；放錯就變紅叉
      if (S.cols[(i / S.n) | 0] === i % S.n){ S.cells[i] = CAT; sfx.place(); }
      else { S.cells[i] = WRONG; S.mistakes++; wrong = whyNot(i); sfx.error(); }
    } else {                            // 單點 → 空格畫叉，已有叉就清掉
      const was = S.cells[i];
      S.cells[i] = was === EMPTY ? MARK : EMPTY;
      was === EMPTY ? sfx.tap() : sfx.untap();
    }

    refresh();
    if (wrong){
      frame.setLives(S.mistakes, LIVES, true);
      frame.warnRule(wrong.rule);
      if (S.mistakes >= LIVES) gameOver(wrong.msg);
      else frame.say(`${wrong.msg}　還有 ${LIVES - S.mistakes} 顆愛心`, true);
    }
  }

  /* 這一格為什麼不行：先找出跟哪一條規則打架 */
  function whyNot(i){
    const n = S.n, r = (i / n) | 0, c = i % n;
    for (let j = 0; j < n * n; j++){
      if (S.cells[j] !== CAT) continue;
      const rr = (j / n) | 0, cc = j % n;
      if (rr === r) return { rule:R_LINE,  msg:'這一橫排已經有貓咪了' };
      if (cc === c) return { rule:R_LINE,  msg:'這一直排已經有貓咪了' };
      if (S.reg[j] === S.reg[i]) return { rule:R_COLOR, msg:'這個顏色已經有貓咪了' };
      if (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1)
        return { rule:R_NEAR, msg:'貓咪貼太近，牠們會打架' };
    }
    return { rule:R_COLOR, msg:'這裡放了，後面就放不下了' };
  }

  /* ══ 重畫狀態 ══ */
  function refresh(){
    const n = S.n, cells = S.cells;
    const cats = [];
    cells.forEach((v, i) => { if (v === CAT) cats.push(i); });
    const filled = new Set(cats.map(i => S.reg[i]));

    cellEls.forEach((el, i) => {
      const v = cells[i], gl = el.firstChild;
      if (el.dataset.v !== String(v)){
        el.dataset.v = v;
        gl.innerHTML = '';
        if (v === CAT){
          gl.appendChild(Object.assign(document.createElement('div'), { className:'cat' }));
        }
        if (v === MARK || v === WRONG){
          gl.appendChild(Object.assign(document.createElement('div'),
            { className: v === WRONG ? 'mark wrong' : 'mark' }));
        }
      }
      el.classList.toggle('locked', v === CAT);
      el.classList.toggle('done', filled.has(S.reg[i]));
    });

    frame.setCount(cats.length, n);
    frame.setLives(S.mistakes, LIVES);
    frame.setToolEnabled('undo', !!S.history.length);
    frame.setToolEnabled('hint', S.hints > 0);
    frame.setToolBadge('hint', S.hints);

    if (cats.length === n) win();
    else frame.say(cats.length ? `還差 ${n - cats.length} 隻貓咪` : '點一下打叉，點兩下放貓咪');
  }

  /* ══ 結束 ══ */
  function gameOver(reason){
    S.over = true;
    frame.stopClock();
    sfx.lose();
    frame.say('愛心用完了，再試一次吧', true);
    setTimeout(() => frame.showDialog({
      art:'🙀',
      title:'再試一次！',
      sub:`${reason}　沒關係，重來一次就好`,
      actions:[
        { label:'再玩一次', onClick:() => newLevel(S.level) },
        { label:'留在這一關', ghost:true },
      ],
    }), 650);
  }

  function win(){
    S.solved = true;
    frame.stopClock();
    sfx.win();
    S.sec = frame.elapsed();
    frame.say('貓咪都坐好了，好棒！');
    cellEls.forEach(el => { if (el.dataset.v === '2') el.classList.add('done'); });

    const notes = [`第 ${S.level} 關　用時 ${frame.clockText()}`];
    notes.push(S.mistakes ? `放錯 ${S.mistakes} 次` : '全部一次就對');
    if (S.hints < HINTS) notes.push(`用了 ${HINTS - S.hints} 次提示`);

    setTimeout(() => frame.showDialog({
      art:'<div class="winface"></div>',
      title:'恭喜過關！', big:true,
      sub:notes.join('　'),
      actions:[
        { label:'下一關', onClick:() => newLevel(S.level + 1) },
        { label:'留在這一關', ghost:true },
      ],
    }), 700);

    if (board.enabled){
      board.invalidate();
      board.submit({ game:'gibi', level:S.level, sec:S.sec,
                     miss:S.mistakes, hint:HINTS - S.hints }).then(ok => {
        if (!board.getNick()) frame.appendDialogSub('　（設定暱稱才能上榜）');
        else if (ok) frame.appendDialogSub('　成績已上傳');
      });
    }
  }

  /* ══ 工具列 ══ */
  frame.onTool('undo', () => {
    if (!S.history.length || S.solved || S.over) return;
    const prev = S.history.pop();
    S.cells = S.cells.map((v, i) => (v === CAT || v === WRONG) ? v : prev[i]);  // 貓和紅叉留著
    refresh();
  });
  frame.onTool('clear', () => {
    if (S.solved || S.over) return;
    pushHistory();
    S.cells = S.cells.map(v => (v === CAT || v === WRONG) ? v : EMPTY);
    refresh();
    frame.say('自己畫的叉叉清掉囉，貓和紅叉留著');
  });
  frame.onTool('hint', () => {
    if (S.hints <= 0 || S.solved || S.over) return;
    const missing = [];
    for (let r = 0; r < S.n; r++){
      const i = r * S.n + S.cols[r];
      if (S.cells[i] !== CAT) missing.push(i);
    }
    if (!missing.length) return;
    pushHistory();
    S.cells[missing[Math.floor(Math.random() * missing.length)]] = CAT;
    S.hints--;
    refresh();
    if (!S.solved) frame.say('幫你放好一隻貓咪');
  });
  frame.onTool('board');

  /* 接著上次的關卡 */
  newLevel(Math.max(1, save.num('lv', 1)));

  return { resetClock: () => frame.resetClockStart() };
}
