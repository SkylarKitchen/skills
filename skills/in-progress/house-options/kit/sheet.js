// ---------------------------------------------------------------- one option's sheet (shared by the page and shoot.cjs's preview)
// Reads OPT, BRIEF, COSTS and, on the page, RESULTS (results.json, BRIEF.md "Added by playbook"); lib.js loads first.
const bathsTxt = b => { const f = Math.floor(b+1e-6), p = b-f > 0.2; return (f ? f+' full' : '') + (p ? (f?' + ':'')+'powder' : '') || 'none'; };
const k$ = v => (v<0 ? '−' : '')+'$'+Math.round(Math.abs(v)/1000)+'k';
const money = v => (v<0 ? '−' : '')+'$'+num(Math.abs(v));
const esc = t => String(t==null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const RES = () => (typeof RESULTS !== 'undefined' && RESULTS && RESULTS.options) ? RESULTS : null;
const resOf = k => { const R = RES(); return R ? R.options[k] || null : null; };
const storeysTxt = n => n===1.5 ? '1½ storeys' : n>1 ? n+' storeys' : '1 storey';
const FOUND_TXT = {slab:'slab on grade', crawl:'crawlspace', piers:'piers'};
const CRIT = {wishes:'Your wishes', sun:'Sun and climate', cost:'Cost against budget', life:'Daily life', idea:'Strength of the idea'};
const critName = c => CRIT[c] || c;
// a + marks work the cost table cannot see (an option's `unpriced`, named on its sheet)
const costTxt = k => k$(costOf(OPT[k]).total) + (OPT[k].unpriced ? '+' : '');
const gapTxt = k => { const c = costOf(OPT[k]); if(c.gap==null) return '—'; return Math.abs(c.gap)<5000 ? 'on budget' : k$(Math.abs(c.gap))+(c.gap>0 ? ' over' : ' under'); };
const wishTally = k => { const w = evalWishes(OPT[k]), y = w.filter(e => e.result==='yes').length, m = w.filter(e => e.result!=='judged').length;
  return {w, y, m, judged: w.length-m, txt: m ? y+' of '+m : '—'}; };

function kvRows(k){
  const o = OPT[k], q = o.q, r = rotOf(o);
  const rows = [['Conditioned', num(q.cond)+' sf'+(o.storeys>1 ? ' on '+storeysTxt(o.storeys) : '')],
    ['Foundation', FOUND_TXT[foundOf(o)]], ['On the lot', r ? 'turned '+Math.abs(r)+'° '+(r>0 ? 'counter-clockwise' : 'clockwise')+'; plan north points '+bearingTxt(trueBearing(o,0)) : 'plan north is true north'],
    ['Roof', num(q.roofPlan)+' sf'], ['Exterior wall', num(q.perim)+' ft, '+num(q.wallArea)+' sf net of glass'], ['Glass', num(q.glass)+' sf'],
    ['Porch and deck', num(q.porch)+' sf'+(q.porch ? ', '+(q.porchRoofed>=q.porch ? 'all roofed' : num(q.porchRoofed||0)+' roofed') : '')],
    ['Baths', bathsTxt(q.baths)], ['Way to bed', esc(o.bed||'—')]];
  return rows.map(r => '<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>').join('');
}

// the rough cost by category, with the location factor, the builder's overhead, the contingency and the gap to the budget
function costHTML(k){
  const o = OPT[k], c = costOf(o), L = c.location;
  const row = (a, b, cls) => '<tr'+(cls ? ' class="'+cls+'"' : '')+'><td>'+a+'</td><td>'+b+'</td></tr>';
  const qty = l => l.unit==='house' || l.unit==='allowance' ? '' : ' <span class="q">'+num(l.qty)+' × $'+num(l.rate)+'</span>';
  return '<table class="cost"><tbody>'
    + c.lines.filter(l => l.amount>0).map(l => row(esc(l.label)+qty(l), money(l.amount))).join('')
    + row('National average', money(c.sub), 'sub')
    + row('Location factor, '+esc(L.name)+' × '+L.factor.toFixed(2), money(c.local-c.sub))
    + row('Builder overhead and profit, '+Math.round(c.rates.overhead*100)+'%', money(c.overhead))
    + row('Contingency, '+Math.round(c.rates.contingency*100)+'%', money(c.contingency))
    + row('Rough total'+(o.unpriced ? ', not counting '+esc(o.unpriced) : ''), money(c.total), 'total')
    + row('Per conditioned sf', c.perSf ? money(c.perSf) : '—')
    + (c.budget ? row('Against the budget of '+money(c.budget), (c.gap>0 ? '+' : '')+money(c.gap), c.gap>0 ? 'over' : 'under') : '')
    + '</tbody></table><p class="fine">Rough: national averages times this plan\'s measured quantities, adjusted for the region. For comparing plans, not a bid.</p>';
}

// each wish, measured from the plan (yes or no, with the numbers), or judged by the graders
function wishesHTML(k){
  const w = evalWishes(OPT[k]);
  if(!w.length) return '<p class="fine">The brief lists no wishes.</p>';
  const tag = r => '<span class="res '+r+'">'+(r==='yes' ? 'Yes' : r==='no' ? 'No' : 'Judged')+'</span>';
  return '<ul class="wishes">'+w.map(e => '<li>'+tag(e.result)+'<span><b>'+esc(e.text)+'</b><br>'+esc(e.says)+'</span></li>').join('')+'</ul>';
}

// the graders' scores by criterion, in the person's order, with each grader's reason
function ratingHTML(k){
  const r = resOf(k), R = RES();
  if(!r) return '<h3>Rating</h3><p class="fine">Not graded yet. Two graders score each option on your five criteria once every option is drawn.</p>';
  const crit = R.criteria || BR().criteria || [], wts = R.weights || BR().weights || [];
  return '<h3>Rating: '+(r.total!=null ? r.total.toFixed(1) : '—')+' of 100'+(r.rank ? ', ranked '+r.rank : '')+'</h3><table class="rating"><tbody>'
    + crit.map((c, i) => { const e = (r.criteria||{})[c] || {}, pts = e.score!=null && wts[i]!=null ? e.score*wts[i]/100 : null;
      return '<tr><td><b>'+esc(critName(c))+'</b><span class="q">'+(wts[i]!=null ? wts[i]+' pts' : '')+'</span></td><td class="sc">'+(e.score!=null ? e.score : '—')+'<span class="q">'+(pts!=null ? pts.toFixed(1)+' pts' : '')+'</span></td><td>'
        + (e.grades||[]).filter(g => g && g.reason).map(g => '<p>'+esc(g.reason)+'</p>').join('')+'</td></tr>'; }).join('')
    + '</tbody></table>';
}

function siteCap(o){
  const r = rotOf(o);
  return 'North up. The lot, its setback line (dashed) and the house'+(r ? ', turned so plan north points '+bearingTxt(trueBearing(o,0)) : '')
    + '. Ground-floor rooms are solid, porches and decks outlined, roof edges dotted'+(o.levels && o.levels.length ? ', the upper floor dashed' : '')
    + '. The block arrow is the arrival'+(((BR().site||{}).known||[]).includes('views') && (BR().site.views||[]).length ? '; the red rays are the views' : '')+'.';
}

function sheetHTML(k){
  const o = OPT[k], lv = levelsOf(o), r = resOf(k), c = costOf(o), wt = wishTally(k);
  // the kit's site plan; on the page it gives way to diagrams.js's own, and the preview keeps it for the checkers' eyes
  const kitSite = !(typeof PAGE !== 'undefined' && PAGE.diagrams);
  const plans = lv.map((l,i)=>'<div class="plan-cell"><div class="draw"><canvas class="plan" data-lvl="'+i+'"></canvas></div><div class="tb"><span><b>'+o.no+'</b> '+esc(o.name)+'</span><span>'+l.label+'</span><span>Same scale on every sheet</span></div><p class="roomkey" hidden></p></div>').join('');
  const li = (arr, cls) => (arr||[]).map(t=>'<li'+(cls?' class="'+cls+'"':'')+'>'+t+'</li>').join('');
  const meta = [storeysTxt(o.storeys||1), FOUND_TXT[foundOf(o)], num(o.q.cond)+' sf', 'rough '+costTxt(k)+(c.gap!=null ? ', '+gapTxt(k) : ''), 'wishes met '+wt.txt+(wt.judged ? ', '+wt.judged+' judged' : '')]
    .concat(r && r.total!=null ? ['score '+r.total.toFixed(1)] : []);
  return '<div class="sheet-head"><span class="tag">'+(r && r.rank ? r.rank : o.no)+'</span><h2>'+esc(o.name)+(r && r.rank ? ' <span class="no">option '+o.no+'</span>' : '')+'</h2><p class="sub">'+o.sub+'</p><p class="meta">'+meta.join(' · ')+'</p></div>'
    + '<div class="diagrams" data-opt="'+k+'"></div>'
    + '<div class="plans">'+plans+'</div>'
    + '<div class="pair"><figure><div class="draw"><canvas class="sect"></canvas></div><figcaption>'+(o.sectCap||'')+'</figcaption></figure>'
    + '<figure><div class="draw"><canvas class="axon"></canvas></div><figcaption>From the house\'s own south-west corner, which faces '+bearingTxt(trueBearing(o,225))+'.</figcaption></figure></div>'
    + '<div class="pair site-row'+(kitSite ? '' : ' nosite')+'">'+(kitSite ? '<figure><div class="draw"><canvas class="site"></canvas></div><figcaption>'+siteCap(o)+'</figcaption></figure>' : '')
    + '<div class="rate">'+ratingHTML(k)+'</div></div>'
    + '<div class="pair2"><div><h3>Your wishes, measured from the plan</h3>'+wishesHTML(k)+'</div><div><h3>Rough cost</h3>'+costHTML(k)+'</div></div>'
    + '<div class="notes"><div>'+(o.change?'<p class="change">'+o.change+'</p>':'')+'<h3>The plan</h3>'+(o.plan||[]).map(p=>'<p>'+p+'</p>').join('')+'</div>'
    + '<div><h3>Borrowed from</h3><ul>'+(o.borrowed||[]).map(b=>'<li><b>'+b[0]+'</b>: '+b[1]+'.</li>').join('')+'</ul></div>'
    + '<div><h3>For and against</h3><ul>'+li(o.pros,'plus')+li(o.cons,'minus')+'</ul><dl class="kv">'+kvRows(k)+'</dl></div></div>';
}

// the largest scales, in px per ft, a sheet is drawn at when its column is wide enough; the site plan fits SITE_MAX px
const CAP = {plan:9, sect:10, axon:5}, SITE_MAX = 360;
// the site plan's scale: the lot inside a box w px wide (at most SITE_MAX) and SITE_MAX tall
const siteScale = w => { const b = siteBox(), [pw, ph] = siteSize(0); return Math.max(0.2, Math.min((Math.min(w, SITE_MAX)-pw)/((b[2]-b[0])||1), (SITE_MAX-ph)/((b[3]-b[1])||1))); };
// sc = {plan, sect, axon, site} scales in px per ft, shared by every sheet so the drawings compare directly; sc.z = {plan,
// sect} how much smaller each kind is shown than drawn, and sc.narrow a screen under 768 px, both for placing the labels; a
// kind drawn within a tenth of its cap has its labels where they were authored unless they run into each other or off the paper
function drawSheet(el, k, sc){
  const o = OPT[k], lv = levelsOf(o), z = sc.z||{}, words = LAB.roomWords(o);
  // rooms numbered on the plans (on a phone, a room whose name fits nowhere in it), one run of numbers across the sheet,
  // each plan's listed in the key under it
  let n = 1;
  el.querySelectorAll('canvas.plan').forEach(cv => {
    const key = drawPlan(cv, lv[+cv.dataset.lvl], sc.plan, {z:z.plan, narrow:sc.narrow, full:sc.plan>=0.9*CAP.plan, words, n0:n}) || [];
    n += key.length;
    const rk = cv.closest('.plan-cell').querySelector('.roomkey');
    if(rk){ rk.innerHTML = key.map(e => '<span><b>'+e.n+'</b> '+e.name+'</span>').join(' '); rk.hidden = !key.length; }
  });
  const cs = el.querySelector('canvas.sect'); if(cs) drawSect(cs, o, sc.sect, {z:z.sect, narrow:sc.narrow, full:sc.sect>=0.9*CAP.sect});
  const ca = el.querySelector('canvas.axon'); if(ca) drawAxon(ca, o, sc.axon);
  const ct = el.querySelector('canvas.site'); if(ct) drawSite(ct, o, sc.site);
}

// tight plan bounds for thumbnails: rooms, outdoor floors, stairs and roof outlines, with a 2 ft margin
function thumbView(o){
  let b = [1e9,1e9,-1e9,-1e9];
  const add = (x,y) => { b[0]=Math.min(b[0],x); b[1]=Math.min(b[1],y); b[2]=Math.max(b[2],x); b[3]=Math.max(b[3],y); };
  for(const l of levelsOf(o)){
    for(const r of l.vols||[]) { add(r[0],r[1]); add(r[2],r[3]); }
    for(const f of l.floors||[]) { add(f.r[0],f.r[1]); add(f.r[2],f.r[3]); }
    for(const s of l.stairs||[]) { add(s.r[0],s.r[1]); add(s.r[2],s.r[3]); }
    for(const p of (l.roofs||[]).concat(l.monitor||[])) for(let i=0;i<p.length;i+=2) add(p[i],p[i+1]);
  }
  return {x0:b[0]-2, y0:b[1]-2, x1:b[2]+2, y1:b[3]+2};
}
// legend swatches, drawn with the same tokens as the plans
const LEG = [
  ['Exterior wall', c=>{ c.fillStyle=C.ink; c.fillRect(0,3.5,26,5); }],
  ['Partition', c=>{ c.fillStyle=C.ink; c.fillRect(0,5,26,2); }],
  ['Glass', c=>{ c.strokeStyle=C.ink; c.lineWidth=0.6; c.strokeRect(0.5,3,25,6); c.lineWidth=1; c.beginPath(); c.moveTo(0,6); c.lineTo(26,6); c.stroke(); }],
  ['Screen', c=>{ c.strokeStyle=C.ink2; c.setLineDash([4,3]); c.beginPath(); c.moveTo(0,6); c.lineTo(26,6); c.stroke(); }],
  ['Roof edge above', c=>{ c.strokeStyle=C.ink2; c.lineWidth=0.75; c.setLineDash([7,4]); c.beginPath(); c.moveTo(0,6); c.lineTo(26,6); c.stroke(); }],
  ['Monitor above', c=>{ c.strokeStyle=C.ink2; c.lineWidth=0.75; c.setLineDash([10,3,2,3]); c.beginPath(); c.moveTo(0,6); c.lineTo(26,6); c.stroke(); }],
  ['Deck or porch', c=>{ c.strokeStyle=C.rule; c.lineWidth=0.6; for(let y=2;y<12;y+=2.4){ c.beginPath(); c.moveTo(0,y); c.lineTo(26,y); c.stroke(); } c.strokeStyle=C.ink2; c.lineWidth=0.75; c.strokeRect(0.5,0.5,25,11); }],
  ['Court at grade', c=>{ const r=rng(7); c.fillStyle=C.ink2; c.globalAlpha=0.35; for(let i=0;i<40;i++) c.fillRect(r()*26,r()*12,1,1); c.globalAlpha=1; c.strokeStyle=C.rule; c.setLineDash([2,3]); c.strokeRect(0.5,0.5,25,11); }],
  ['Open to below', c=>{ c.strokeStyle=C.ink2; c.lineWidth=0.6; c.setLineDash([5,3]); c.beginPath(); c.moveTo(0,0.5); c.lineTo(26,11.5); c.moveTo(0,11.5); c.lineTo(26,0.5); c.stroke(); }],
  ['Setback line', c=>{ c.strokeStyle=C.ink2; c.lineWidth=0.8; c.setLineDash([5,3]); c.beginPath(); c.moveTo(0,6); c.lineTo(26,6); c.stroke(); }],
  ['Noon sun, 21 Dec', c=>{ c.strokeStyle=C.pencil; c.lineWidth=1.1; c.beginPath(); c.moveTo(0,2); c.lineTo(24,10); c.stroke(); }],
  ['Noon sun, 21 Jun', c=>{ c.strokeStyle=C.pencil; c.lineWidth=1.1; c.setLineDash([5,3]); c.beginPath(); c.moveTo(0,2); c.lineTo(24,10); c.stroke(); }]];
function buildLegend(){
  const el = document.getElementById('legend'); if(!el || el.childElementCount) return;
  el.innerHTML = LEG.map(l=>'<span><canvas></canvas>'+l[0]+'</span>').join('');
}
function drawLegend(){
  document.querySelectorAll('#legend canvas').forEach((cv,i)=>{ const c = setup(cv,26,12); c.save(); LEG[i][1](c); c.restore(); });
}
