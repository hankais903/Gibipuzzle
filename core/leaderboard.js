/* ═══ 排行榜 ═══
   接 Google Apps Script。API 留空就只是本機遊玩，不會連線。 */

import { core } from './storage.js';
import { esc } from './util.js';

const API = 'https://script.google.com/macros/s/AKfycbxjpwQWb2meoYzsMGOU4nizvCbSrujvpx-ErVgArDkJdmUXjFxVqRYRKoHFPlcPd9M6lA/exec';

export const enabled = !!API;

export function getNick(){ return core.get('nick'); }
export function setNick(v){
  const clean = String(v || '').trim().slice(0, 10);
  if (clean) core.set('nick', clean);
  return clean;
}

export async function submit(entry){
  const nick = getNick();
  if (!API || !nick) return false;
  const body = JSON.stringify({ name: nick, ...entry });
  try { await fetch(API, { method:'POST', body }); return true; }
  catch(e){
    try { await fetch(API, { method:'POST', body, mode:'no-cors' }); return true; }
    catch(_){ return false; }
  }
}

/* JSONP：不受跨網域限制 */
function jsonp(url){
  return new Promise((res, rej) => {
    const cb = 'lb_cb_' + Date.now();
    const sc = document.createElement('script');
    const done = () => { clearTimeout(timer); delete window[cb]; sc.remove(); };
    const timer = setTimeout(() => { done(); rej(new Error('timeout')); }, 10000);
    window[cb] = d => { done(); res(d); };
    sc.onerror = () => { done(); rej(new Error('load')); };
    sc.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.body.appendChild(sc);
  });
}

let cache = { data: null, at: 0 };

export function invalidate(){ cache.at = 0; }

export async function fetchBoard(force){
  if (!API) return null;
  if (!force && cache.data && Date.now() - cache.at < 60000) return cache.data;
  let d = null;
  try { d = await jsonp(API); }
  catch(e){
    try { d = await (await fetch(API)).json(); }
    catch(_){ d = null; }
  }
  if (d) cache = { data: d, at: Date.now() };
  return d;
}

/* 一進遊戲就背景抓，順便讓後端保持熱機 */
export function prefetch(){
  if (API) setTimeout(() => fetchBoard(true).catch(() => {}), 200);
}

export function hasCache(){ return !!cache.data; }

/* 名字是別人送上來的，一律當成純文字處理，不能直接當 HTML 塞進畫面 */
export function renderInto(box, d){
  if (!API){
    box.innerHTML = '<div class="empty">還沒設定排行榜網址</div>';
    return;
  }
  if (!d){
    box.innerHTML = '<div class="empty">連不上排行榜<br>部署權限要選「任何人」</div>';
    return;
  }
  const me = getNick();
  const rows = (d.overall || []).map((x, i) => {
    const mine = x.name === me ? ' me' : '';
    return `<div class="row${mine}"><b>${i + 1}</b><span>${esc(x.name)}</span><em>${esc(x.cleared)} 關</em></div>`;
  });
  box.innerHTML = rows.length ? rows.join('') : '<div class="empty">還沒有人通關</div>';
}
