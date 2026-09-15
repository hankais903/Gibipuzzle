/* ═══ 存檔 ═══
   每個遊戲有自己的命名空間，資料不會互相蓋掉。
   localStorage 不能用時（無痕模式等）自動退回記憶體，遊戲照常能玩。 */

const MEM = {};

function raw(k){
  try { return localStorage.getItem(k) || MEM[k] || ''; }
  catch(e){ return MEM[k] || ''; }
}
function put(k, v){
  MEM[k] = v;
  try { localStorage.setItem(k, v); } catch(e){}
}

/* 舊版把資料存在沒有前綴的 key，搬一次家，老玩家的進度不會不見 */
(function migrate(){
  if (raw('core:migrated')) return;
  for (const [from, to] of [['lv','gibi:lv'], ['nick','core:nick'], ['mute','core:mute']]){
    const v = raw(from);
    if (v && !raw(to)) put(to, v);
  }
  put('core:migrated', '1');
})();

export function store(ns){
  const key = k => ns + ':' + k;
  return {
    get: (k, dflt = '') => raw(key(k)) || dflt,
    num: (k, dflt = 0) => Number(raw(key(k))) || dflt,
    set: (k, v) => put(key(k), String(v)),
  };
}

export const core = store('core');
