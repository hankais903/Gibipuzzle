/* ═══ 遊戲櫃 ═══
   首頁與遊戲頁共用這一份清單。新增遊戲時只要在這裡加一筆，
   首頁自動就會多一張卡片。
   封面是純 CSS 畫的，不依賴各遊戲的樣式表，首頁才不用先載入遊戲。 */

export const CATALOG = [
  {
    id: 'gibi',
    title: '吉比不能跟吉比坐一起',
    tagline: '每個顏色、每行每列只能坐一隻貓',
    kind: '邏輯推理',
    cover: '<i class="q" style="--c:var(--r1)"></i><i class="q" style="--c:var(--r6)"></i><i class="q" style="--c:var(--r2)"></i>'
         + '<i class="q" style="--c:var(--r4)"></i><i class="q kitty"></i><i class="q" style="--c:var(--r5)"></i>'
         + '<i class="q" style="--c:var(--r8)"></i><i class="q" style="--c:var(--r3)"></i><i class="q" style="--c:var(--r7)"></i>',
    coverClass: 'cover-grid',
  },
  {
    id: 'match',
    title: '吉比找一樣的',
    tagline: '找出兩個一樣的，路不能被擋住',
    kind: '配對消除',
    cover: ['🐟','🧶','🎀','🧶','🎀','🐟'].map(f => `<i class="q">${f}</i>`).join(''),
    coverClass: 'cover-grid cover-tiles',
  },
  {
    id: 'push',
    title: '吉比推毛線球',
    tagline: '把毛線球推回窩裡，只能推不能拉',
    kind: '空間思考',
    cover: '<i class="q kitty big"></i><i class="q">🧶</i><i class="q nest"></i>',
    coverClass: 'cover-row',
  },
];

export const findGame = id => CATALOG.find(g => g.id === id);
