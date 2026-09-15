/* ═══ 推箱子的關卡生成 ═══
   保證有解的作法：從「已經完成」的狀態倒著走。
   讓吉比反向拉毛線球，拉到一半停下來，那就是題目——
   玩家只要把這段過程倒回去就解開了，所以一定有解。 */

export const FLOOR = 0, WALL = 1;

/* 亂數：同一關永遠是同一張圖，排行榜才公平 */
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function plan(level){
  //  rounds = 要反向拉幾輪（每輪拉 0~3 步）　minMove = 球至少要被拉多遠
  if (level <= 3)  return { cols:7, rows:7, boxes:2, walls:2, rounds:8,  minMove:4  };
  if (level <= 8)  return { cols:8, rows:7, boxes:2, walls:3, rounds:12, minMove:7  };
  if (level <= 14) return { cols:8, rows:8, boxes:3, walls:4, rounds:16, minMove:10 };
  if (level <= 22) return { cols:9, rows:8, boxes:3, walls:6, rounds:22, minMove:13 };
  return                  { cols:9, rows:9, boxes:4, walls:7, rounds:28, minMove:16 };
}

function pick(arr, rnd){ return arr[Math.floor(rnd() * arr.length)]; }

/* 房間：外圍一圈牆，裡面放幾塊障礙，但地板必須全部相連 */
function makeRoom(cols, rows, extra, rnd){
  for (let attempt = 0; attempt < 60; attempt++){
    const g = new Uint8Array(cols * rows);
    for (let c = 0; c < cols; c++){ g[c] = WALL; g[(rows - 1) * cols + c] = WALL; }
    for (let r = 0; r < rows; r++){ g[r * cols] = WALL; g[r * cols + cols - 1] = WALL; }

    const inner = [];
    for (let r = 1; r < rows - 1; r++)
      for (let c = 1; c < cols - 1; c++) inner.push(r * cols + c);

    for (let k = 0; k < extra; k++) g[pick(inner, rnd)] = WALL;

    const open = inner.filter(i => !g[i]);
    if (open.length < 8) continue;

    // 地板要全部走得到，不然會有玩家碰不到的角落
    const seen = new Set([open[0]]);
    const queue = [open[0]];
    while (queue.length){
      const i = queue.pop();
      for (const d of [-cols, cols, -1, 1]){
        const n = i + d;
        if (!g[n] && !seen.has(n)){ seen.add(n); queue.push(n); }
      }
    }
    if (seen.size === open.length) return { g, open };
  }
  return null;
}

/* 一步：吉比往 d 走。前面有毛線球就推，推不動就不能走 */
export function step(walls, cat, boxes, d){
  const n = cat + d;
  if (walls[n]) return null;
  const bi = boxes.indexOf(n);
  if (bi < 0) return { cat:n, boxes, pushed:-1 };
  const nn = n + d;
  if (walls[nn] || boxes.includes(nn)) return null;
  const nb = boxes.slice();
  nb[bi] = nn;
  return { cat:n, boxes:nb, pushed:bi };
}

export function solved(boxes, targets){
  return boxes.every(b => targets.includes(b));
}

/* 吉比能不能走到某格（只能走地板，不能穿過毛線球） */
function reachable(g, cols, boxes, from, to){
  if (from === to) return true;
  const seen = new Set([from]), q = [from];
  const blocked = new Set(boxes);
  while (q.length){
    const i = q.shift();
    for (const d of [-cols, cols, -1, 1]){
      const n = i + d;
      if (g[n] || blocked.has(n) || seen.has(n)) continue;
      if (n === to) return true;
      seen.add(n); q.push(n);
    }
  }
  return false;
}

export function buildLevel(level){
  const p = plan(level);
  const { cols, rows } = p;
  const D = [-cols, cols, -1, 1];
  const rnd = mulberry32((level * 2654435761) >>> 0);

  for (let attempt = 0; attempt < 120; attempt++){
    // 真的湊不出夠繞的題目就放寬，不讓玩家空等
    const need = attempt < 50 ? p.minMove : Math.max(3, Math.round(p.minMove * 0.6));
    const room = makeRoom(cols, rows, p.walls, rnd);
    if (!room) continue;
    const { g, open } = room;

    // 完成狀態：毛線球剛好都在貓窩上
    const pool = open.slice(), targets = [];
    for (let k = 0; k < p.boxes && pool.length; k++)
      targets.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    if (targets.length < p.boxes || !pool.length) continue;

    const boxes = targets.slice();
    let cat = pick(pool, rnd);
    let moved = 0;

    // 倒著拉：挑一顆球，把吉比帶到能拉的位置，往同一個方向連拉幾步
    for (let round = 0; round < p.rounds; round++){
      const bi = Math.floor(rnd() * boxes.length);
      const d = pick(D, rnd);
      const times = 1 + Math.floor(rnd() * 3);
      for (let s = 0; s < times; s++){
        const cur = boxes[bi];
        const stand = cur + d;        // 拉之前吉比站這裡，也是球要去的地方
        const after = cur + 2 * d;    // 拉之後吉比退到這裡
        if (g[stand] || boxes.includes(stand)) break;
        if (g[after] || boxes.includes(after)) break;
        if (!reachable(g, cols, boxes, cat, stand)) break;
        boxes[bi] = stand;
        cat = after;
        moved++;
      }
    }

    const off = boxes.filter(b => !targets.includes(b)).length;
    // 只有一顆球在外面的題目太好猜，至少要兩顆（除非這關只有兩顆球的前幾關）
    const needOff = level <= 3 ? 1 : Math.min(p.boxes, 2);
    if (off < needOff || moved < need) continue;    // 太簡單，重做

    return { cols, rows, walls:g, targets, boxes, cat, difficulty:moved };
  }
  return null;
}

/* 驗證用：真的把題目解一遍（只適合小盤面，會限制搜尋量） */
export function solve(lv, cap = 400000){
  const { cols, walls, targets } = lv;
  const D = [-cols, cols, -1, 1];
  const key = (cat, boxes) => cat + '|' + boxes.slice().sort((a,b)=>a-b).join(',');
  const startKey = key(lv.cat, lv.boxes);
  const seen = new Set([startKey]);
  let frontier = [{ cat:lv.cat, boxes:lv.boxes }];
  let depth = 0;
  while (frontier.length && seen.size < cap){
    const next = [];
    for (const st of frontier){
      if (solved(st.boxes, targets)) return depth;
      for (const d of D){
        const r = step(walls, st.cat, st.boxes, d);
        if (!r) continue;
        const k = key(r.cat, r.boxes);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ cat:r.cat, boxes:r.boxes });
      }
    }
    frontier = next;
    depth++;
    if (depth > 200) break;
  }
  return -1;
}
