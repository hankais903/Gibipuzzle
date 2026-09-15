/* ═══ 連連看的盤面與連線判定 ═══
   盤面外圍留一圈空格，所以連線可以繞到盤面外面。
   內部用「加了外框的格子陣列」：實際第 r 行第 c 列 = padded 的 (r+1, c+1)。 */

export const EMPTY = -1;

/* 貓咪世界裡的東西 */
export const FACES = ['🐟','🧶','🐭','🥛','🎀','⭐','🌙','🍰','🪴','🔔','🐾','🦋','🍡','☂️'];

export function plan(level){
  if (level <= 2)  return { cols:4,  rows:4, kinds:4  };   //  8 對
  if (level <= 5)  return { cols:6,  rows:4, kinds:6  };   // 12 對
  if (level <= 9)  return { cols:6,  rows:6, kinds:8  };   // 18 對
  if (level <= 14) return { cols:8,  rows:6, kinds:10 };   // 24 對
  if (level <= 20) return { cols:8,  rows:8, kinds:12 };   // 32 對
  return                  { cols:10, rows:8, kinds:14 };   // 40 對
}

function shuffleArr(a, rnd){
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* 兩格在同一行或同一列，而且中間全空 */
function lineClear(g, W, a, b){
  if (a === b) return false;
  const ar = (a / W) | 0, ac = a % W, br = (b / W) | 0, bc = b % W;
  if (ar === br){
    for (let c = Math.min(ac, bc) + 1; c < Math.max(ac, bc); c++)
      if (g[ar * W + c] !== EMPTY) return false;
    return true;
  }
  if (ac === bc){
    for (let r = Math.min(ar, br) + 1; r < Math.max(ar, br); r++)
      if (g[r * W + ac] !== EMPTY) return false;
    return true;
  }
  return false;
}

/* 一個轉彎：轉角必須是空格，兩段都要通 */
function oneTurn(g, W, a, b){
  const ar = (a / W) | 0, ac = a % W, br = (b / W) | 0, bc = b % W;
  for (const corner of [ar * W + bc, br * W + ac]){
    if (corner === a || corner === b || g[corner] !== EMPTY) continue;
    if (lineClear(g, W, a, corner) && lineClear(g, W, corner, b)) return corner;
  }
  return -1;
}

/* 找一條最多轉兩次的路。找到就回傳轉折點（含頭尾），找不到回傳 null */
export function findPath(g, W, H, a, b){
  if (lineClear(g, W, a, b)) return [a, b];

  const c1 = oneTurn(g, W, a, b);
  if (c1 >= 0) return [a, c1, b];

  // 兩個轉彎：從 a 往四個方向走，每個經過的空格再試一次「一個轉彎到 b」
  const ar = (a / W) | 0, ac = a % W;
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
    let r = ar + dr, c = ac + dc;
    while (r >= 0 && r < H && c >= 0 && c < W && g[r * W + c] === EMPTY){
      const p = r * W + c;
      const c2 = oneTurn(g, W, p, b);
      if (c2 >= 0) return [a, p, c2, b];
      r += dr; c += dc;
    }
  }
  return null;
}

/* 盤面上還有沒有可以消的一對 */
export function anyMove(g, W, H){
  const byFace = new Map();
  for (let i = 0; i < g.length; i++){
    if (g[i] === EMPTY) continue;
    if (!byFace.has(g[i])) byFace.set(g[i], []);
    byFace.get(g[i]).push(i);
  }
  for (const list of byFace.values()){
    for (let x = 0; x < list.length; x++)
      for (let y = x + 1; y < list.length; y++)
        if (findPath(g, W, H, list[x], list[y])) return [list[x], list[y]];
  }
  return null;
}

/* 把剩下的重新排一次，排到有得消為止 */
export function reshuffle(g, W, H, rnd){
  const pos = [], faces = [];
  for (let i = 0; i < g.length; i++)
    if (g[i] !== EMPTY){ pos.push(i); faces.push(g[i]); }
  if (pos.length < 2) return false;
  for (let guard = 0; guard < 80; guard++){
    shuffleArr(faces, rnd);
    pos.forEach((i, k) => { g[i] = faces[k]; });
    if (anyMove(g, W, H)) return true;
  }
  return false;                       // 理論上排不出來（例如只剩兩張被卡住）
}

export function buildBoard(level, rnd){
  const p = plan(level);
  const W = p.cols + 2, H = p.rows + 2;
  const g = new Int16Array(W * H).fill(EMPTY);

  const pairs = (p.cols * p.rows) / 2;
  const pool = [];
  for (let i = 0; i < pairs; i++){ const f = i % p.kinds; pool.push(f, f); }
  shuffleArr(pool, rnd);

  let k = 0;
  for (let r = 0; r < p.rows; r++)
    for (let c = 0; c < p.cols; c++)
      g[(r + 1) * W + (c + 1)] = pool[k++];

  if (!anyMove(g, W, H)) reshuffle(g, W, H, rnd);   // 開局就卡住的話先洗一次
  return { cols:p.cols, rows:p.rows, kinds:p.kinds, W, H, g, pairs };
}
