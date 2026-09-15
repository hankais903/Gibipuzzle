/* ═══ 共用小工具 ═══ */

export const $ = id => document.getElementById(id);

/* 把玩家或後端給的文字變成安全的純文字，避免被當成程式碼執行 */
export function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}

export function mmss(sec){
  const s = Math.max(0, Math.floor(sec));
  return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
}

/* 建立元素：el('div', {className:'x'}, [子元素或字串]) */
export function el(tag, props = {}, kids = []){
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)){
    if (k === 'html') n.innerHTML = v;
    else if (k in n) n[k] = v;
    else n.setAttribute(k, v);
  }
  for (const kid of [].concat(kids)){
    n.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return n;
}
