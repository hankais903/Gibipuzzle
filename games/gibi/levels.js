/* ═══ 亂數（同一關永遠是同一張圖） ═══ */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function shuffle(arr,rnd){for(let i=arr.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

/* ═══ 產生解答：每行每列<br>一隻貓，且上下行不相鄰 ═══ */
function makeSolution(n,rnd){
  const cols=new Array(n).fill(-1),used=new Array(n).fill(false);
  (function place(r){
    if(r===n)return true;
    for(const c of shuffle([...Array(n).keys()],rnd)){
      if(used[c])continue;
      if(r>0&&Math.abs(cols[r-1]-c)<=1)continue;
      used[c]=true;cols[r]=c;
      if(place(r+1))return true;
      used[c]=false;cols[r]=-1;
    }
    return false;
  })(0);
  return cols[n-1]<0?null:cols;
}

/* ═══ 由每隻貓長出一塊拼布 ═══ */
function growRegions(n,cols,rnd){
  const reg=new Array(n*n).fill(-1);
  for(let r=0;r<n;r++)reg[r*n+cols[r]]=r;
  const nb=i=>{const r=(i/n)|0,c=i%n,o=[];if(r>0)o.push(i-n);if(r<n-1)o.push(i+n);if(c>0)o.push(i-1);if(c<n-1)o.push(i+1);return o;};
  let pairs=[],left=n*n-n,guard=0;
  for(let r=0;r<n;r++)nb(r*n+cols[r]).forEach(i=>pairs.push([r,i]));
  while(left>0&&guard++<n*n*80){
    pairs=pairs.filter(p=>reg[p[1]]===-1);
    if(!pairs.length)return null;
    const[g,idx]=pairs[Math.floor(rnd()*pairs.length)];
    reg[idx]=g;left--;
    nb(idx).forEach(i=>{if(reg[i]===-1)pairs.push([g,i]);});
  }
  return left>0?null:reg;
}

/* ═══ 檢查是否只有唯一解 ═══ */
function countSolutions(n,reg,limit){
  let count=0;const uc=new Array(n).fill(false),ug=new Array(n).fill(false);
  (function rec(r,prev){
    if(count>=limit)return;
    if(r===n){count++;return;}
    for(let c=0;c<n;c++){
      if(uc[c])continue;
      if(r>0&&Math.abs(prev-c)<=1)continue;
      const g=reg[r*n+c];if(ug[g])continue;
      uc[c]=ug[g]=true;rec(r+1,c);uc[c]=ug[g]=false;
      if(count>=limit)return;
    }
  })(0,-5);
  return count;
}

/* ═══ 難度評估：模擬人的推理 ═══
   A 級＝某行/列/色塊只剩一格能放貓（初學者看得懂）
   B 級＝色塊與行列互相排除（進階）
   C 級＝以上都不夠，得試誤（挑戰）                        ═══ */
function solveLike(n,reg,givens,allowB){
  const cand=new Array(n*n).fill(true);
  const hasRow=new Array(n).fill(false),hasCol=new Array(n).fill(false),hasReg=new Array(n).fill(false);
  let placed=0,ok=true;
  const rowCells=r=>[...Array(n).keys()].map(c=>r*n+c);
  const colCells=c=>[...Array(n).keys()].map(r=>r*n+c);
  const regCells=g=>[...Array(n*n).keys()].filter(i=>reg[i]===g);
  const cellsOf={row:rowCells,col:colCells,reg:regCells};
  function place(i){
    const r=(i/n)|0,c=i%n,g=reg[i];
    hasRow[r]=hasCol[c]=hasReg[g]=true;placed++;
    for(let k=0;k<n;k++){cand[r*n+k]=false;cand[k*n+c]=false;}
    for(let k=0;k<n*n;k++)if(reg[k]===g)cand[k]=false;
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n)cand[rr*n+cc]=false;
    }
  }
  givens.forEach(place);
  let progress=true;
  while(progress&&placed<n){
    progress=false;
    for(const[kind,has]of[['row',hasRow],['col',hasCol],['reg',hasReg]]){
      for(let k=0;k<n;k++){
        if(has[k])continue;
        const cs=cellsOf[kind](k).filter(i=>cand[i]);
        if(cs.length===0){ok=false;break;}
        if(cs.length===1){place(cs[0]);progress=true;}
      }
    }
    if(!ok)break;
    if(progress||!allowB)continue;
    for(let g=0;g<n&&!progress;g++){
      if(hasReg[g])continue;
      const cs=regCells(g).filter(i=>cand[i]);
      const rows=new Set(cs.map(i=>(i/n)|0)),cols=new Set(cs.map(i=>i%n));
      if(rows.size===1){const r=[...rows][0];
        rowCells(r).forEach(i=>{if(cand[i]&&reg[i]!==g){cand[i]=false;progress=true;}});}
      if(cols.size===1){const c=[...cols][0];
        colCells(c).forEach(i=>{if(cand[i]&&reg[i]!==g){cand[i]=false;progress=true;}});}
    }
    for(const kind of['row','col']){
      for(let k=0;k<n&&!progress;k++){
        const has=kind==='row'?hasRow:hasCol;
        if(has[k])continue;
        const cs=cellsOf[kind](k).filter(i=>cand[i]);
        const gs=new Set(cs.map(i=>reg[i]));
        if(gs.size===1){const g=[...gs][0];
          regCells(g).forEach(i=>{
            const kk=kind==='row'?((i/n)|0):(i%n);
            if(cand[i]&&kk!==k){cand[i]=false;progress=true;}});}
      }
    }
  }
  return ok&&placed===n;
}
function rateLevel(n,reg,givens){
  if(solveLike(n,reg,givens,false))return 1;
  if(solveLike(n,reg,givens,true))return 2;
  return 3;
}

/* ═══ 難度曲線：盤面一格一格長大，推理一層一層加深 ═══ */
function plan(level){
  if(level<=2) return{n:4,maxTier:1,tiny:true};   // 教規則
  if(level<=4) return{n:5,maxTier:1,tiny:true};   // 從單格色塊起手
  if(level<=7) return{n:5,maxTier:1};
  if(level<=11)return{n:6,maxTier:1};
  if(level<=15)return{n:6,maxTier:2};             // 開始需要色塊與行列互推
  if(level<=20)return{n:7,maxTier:1};
  if(level<=26)return{n:7,maxTier:2};
  if(level<=33)return{n:8,maxTier:2};
  if(level<=40)return{n:8,maxTier:3};
  return{n:9,baked:true};                         // 9×9 太慢，改用預先算好的盤面
}
const BAKED9=[{"c":[0,7,5,3,8,4,2,6,1],"r":[0,3,3,3,3,1,1,1,4,3,3,3,3,3,2,2,1,4,3,3,3,3,3,2,2,2,4,3,3,3,3,3,3,3,4,4,5,5,5,5,5,3,4,4,4,5,5,5,5,5,5,4,4,4,6,6,6,5,5,7,4,4,4,8,6,6,6,5,7,7,4,4,8,8,6,6,5,7,7,4,4],"l":73,"t":1},{"c":[0,2,4,1,5,8,6,3,7],"r":[0,1,1,1,4,4,4,4,4,3,3,1,1,1,4,4,4,4,3,3,3,2,2,4,4,5,5,3,3,3,7,4,4,4,5,5,3,3,3,7,4,4,4,5,5,7,7,7,7,4,4,4,5,5,7,7,7,7,7,4,6,5,5,7,7,7,7,7,8,8,8,8,7,7,7,7,7,8,8,8,8],"l":66,"t":1},{"c":[0,7,1,4,2,8,6,3,5],"r":[0,2,2,2,2,3,1,1,1,2,2,2,2,2,3,3,1,1,2,2,2,3,3,3,3,1,1,2,2,2,3,3,3,3,5,5,2,2,4,3,3,3,3,5,5,3,3,3,3,7,3,3,3,5,3,3,3,7,7,7,6,6,5,3,3,7,7,7,7,6,6,6,3,7,7,7,7,8,6,6,6],"l":53,"t":2},{"c":[6,0,3,1,8,4,7,2,5],"r":[2,2,2,2,2,2,0,0,2,1,2,2,2,2,2,2,2,2,3,3,2,2,2,2,2,2,4,3,3,2,2,2,2,2,2,4,3,2,2,2,5,5,4,4,4,7,2,7,2,5,5,4,4,4,7,7,7,7,7,5,4,6,4,7,7,7,7,7,7,8,4,4,7,7,7,7,7,8,8,8,4],"l":44,"t":1},{"c":[8,3,6,4,2,5,1,7,0],"r":[3,3,1,1,1,3,3,2,0,3,3,3,1,3,3,2,2,3,3,3,3,1,3,3,2,2,3,3,3,3,3,3,3,3,3,3,3,3,4,3,3,3,3,3,5,3,6,4,3,3,5,5,5,5,6,6,6,6,5,5,7,7,5,6,6,6,5,5,5,5,7,7,8,6,6,6,5,5,7,7,7],"l":12,"t":2},{"c":[0,6,1,3,5,7,4,8,2],"r":[0,2,2,2,3,1,1,1,1,2,2,2,2,3,3,1,1,3,2,2,2,2,3,3,3,3,3,2,2,3,3,3,3,3,3,3,3,3,3,3,4,4,4,3,3,3,3,3,4,4,4,4,5,5,8,3,3,4,6,6,6,6,7,8,8,8,8,6,6,6,6,7,8,8,8,8,8,6,6,6,6],"l":74,"t":2},{"c":[6,4,7,2,5,1,3,0,8],"r":[1,1,1,1,1,1,0,2,2,1,1,1,1,1,1,2,2,2,1,3,1,1,1,1,2,2,2,7,3,3,3,3,3,2,2,2,7,7,3,3,4,4,2,2,2,7,5,6,6,4,4,2,2,2,7,7,7,6,4,4,2,6,2,7,7,7,6,6,6,6,6,6,7,7,7,6,6,6,6,6,8],"l":63,"t":3},{"c":[3,5,7,0,2,4,1,8,6],"r":[1,1,1,0,1,1,2,2,2,1,1,1,1,1,1,2,2,2,4,4,1,4,4,2,2,2,2,3,4,4,4,4,2,2,2,2,4,4,4,5,5,5,2,2,2,4,4,5,5,5,5,5,2,2,6,6,5,5,5,5,8,8,7,5,5,5,5,5,8,8,8,7,5,5,5,5,5,8,8,8,8],"l":55,"t":3},{"c":[4,7,5,8,0,2,6,3,1],"r":[5,5,5,0,0,2,1,1,1,5,5,5,2,2,2,1,1,1,5,5,5,2,2,2,2,1,1,4,5,5,5,2,2,2,1,3,4,5,5,5,2,2,2,2,2,5,5,5,5,5,6,6,6,6,5,5,5,5,5,6,6,6,6,5,5,5,7,6,6,6,6,6,8,8,5,5,6,6,6,6,6],"l":35,"t":3},{"c":[8,5,7,1,6,4,2,0,3],"r":[3,3,3,3,3,1,1,1,0,3,3,3,3,1,1,1,2,2,3,3,3,3,1,1,2,2,2,3,3,3,3,4,1,2,2,2,3,3,3,3,4,4,4,2,2,3,7,6,6,5,2,2,2,2,7,7,6,6,6,6,6,2,2,7,7,6,6,6,6,6,6,6,7,7,8,8,6,6,6,6,6],"l":25,"t":3},{"c":[5,8,6,4,2,0,7,1,3],"r":[3,2,2,2,0,0,1,1,1,3,3,3,2,2,0,0,1,1,3,3,3,2,2,2,2,1,1,3,3,3,3,3,3,2,2,2,3,3,4,4,3,3,2,2,2,5,7,4,4,3,6,6,2,6,5,7,4,4,4,4,6,6,6,5,7,7,8,4,6,6,6,6,8,8,8,8,6,6,6,6,6],"l":17,"t":3},{"c":[7,2,0,8,6,4,1,5,3],"r":[1,1,1,1,3,3,3,0,3,1,1,1,1,3,3,3,3,3,2,1,1,1,4,4,4,4,3,1,1,6,1,5,4,4,4,3,6,6,6,6,5,4,4,4,7,6,6,6,6,5,4,7,7,7,6,6,6,6,6,7,7,7,7,6,6,6,6,7,7,7,7,7,6,6,6,8,7,7,7,7,7],"l":7,"t":3}];
function buildLevel(level){
  const p=plan(level),n=p.n;
  if(p.baked){
    const b=BAKED9[(level-41)%BAKED9.length];
    return{n:9,cols:b.c,reg:b.r,locked:b.l,tier:b.t};
  }
  const rnd=mulberry32((level*2654435761)>>>0);
  for(let a=0;a<8000;a++){
    const relax=a>900;                             // 真的找不到就放寬，不讓玩家空等
    const cap=a<500?(n<=4?0.45:0.28):1;
    const cols=makeSolution(n,rnd);if(!cols)continue;
    for(let k=0;k<25;k++){
      const reg=growRegions(n,cols,rnd);if(!reg)continue;
      const size=new Array(n).fill(0);reg.forEach(g=>size[g]++);
      if(Math.max(...size)>cap*n*n)continue;
      if(p.tiny&&!relax&&Math.min(...size)>2)continue;
      if(countSolutions(n,reg,2)!==1)continue;
      const first=(level*7919)%n,locked=first*n+cols[first];
      const tier=rateLevel(n,reg,[locked]);
      if(tier>(relax?3:p.maxTier))continue;
      return{n,cols,reg,locked,tier};
    }
  }
  return null;
}

export { buildLevel, plan, rateLevel };
