// ---------------------------------------------------------------- the page: a summary table, then every option's sheet
// Ranked by results.json (RESULTS) once the options are graded; until then in number order, as the progress view.
// Each sheet is <section class="sheet" id="oNN" data-k="oNN">, with a <div class="diagrams" data-opt="oNN"> that
// diagrams.js draws into; this code never touches it.
const REG = PAGE.registry || [];
const ranked = () => { const R = RES(); return Object.keys(OPT).sort((a, b) => {
  const ra = R && R.options[a] && R.options[a].rank, rb = R && R.options[b] && R.options[b].rank;
  if(ra && rb) return ra - rb; if(ra) return -1; if(rb) return 1; return a < b ? -1 : 1; }); };
const oneLine = k => { const r = REG.find(e => 'o'+e[0] === k); return r ? r[2] : ''; };
const FOUND_SHORT = {slab:'slab', crawl:'crawl', piers:'piers'};
let order = [];

function progress(){
  const n = REG.filter(r => OPT['o'+r[0]]).length, left = REG.filter(r => !OPT['o'+r[0]]), R = RES();
  const done = REG.length && n===REG.length;
  document.getElementById('progress').innerHTML = !REG.length ? '<b>'+Object.keys(OPT).length+'</b> options drawn.'
    : done ? '<b>'+(PAGE.card && PAGE.card.allDrawn || 'All drawn.')+'</b>'+(R ? ' Graded '+(R.graded ? new Date(R.graded).toLocaleDateString('en-US', {month:'long', day:'numeric'}) : '')+'.' : ' Grading comes next.')
    : '<b>'+n+' of '+REG.length+'</b> drawn so far.';
  document.getElementById('todo-sec').hidden = !left.length;
  document.getElementById('todo').innerHTML = left.map(r => '<li><b>'+r[0]+'</b>'+esc(r[1])+(r[2] ? '<span class="q">'+esc(r[2])+'</span>' : '')+'</li>').join('');
  return done;
}

function summary(){
  const R = RES(), crit = (R && R.criteria) || BR().criteria || [], wts = (R && R.weights) || BR().weights || [];
  document.getElementById('summary-h').textContent = R ? 'The options, ranked' : 'The options';
  document.getElementById('summary-p').innerHTML = R
    ? 'Ranked by '+crit.map((c, i) => critName(c).toLowerCase()+' ('+wts[i]+')').join(', ')+': each criterion scored 0 to 100 by '+(R.graders===1 ? 'one grader' : R.graders+' graders')+', weighted as you chose. Click a name to go to its sheet.'
    : 'In number order until every option is drawn and graded. Click a name to go to its sheet.';
  const head = (R ? ['Rank'] : ['No.']).concat(['', 'Option'], R ? ['Score'] : [], ['Rough cost', 'Against budget', 'Wishes met', 'Storeys', 'Floor area']);
  document.getElementById('summary').innerHTML = '<thead><tr>'+head.map(h => '<th>'+h+'</th>').join('')+'</tr></thead><tbody>'
    + order.map(k => { const o = OPT[k], r = resOf(k), c = costOf(o), wt = wishTally(k);
      return '<tr class="'+(c.gap>0 ? 'over' : '')+'"><td>'+(R ? (r && r.rank || '—') : o.no)+'</td><td class="thumb"><canvas data-k="'+k+'"></canvas></td>'
        + '<td><a href="#'+k+'"><b>'+esc(o.name)+'</b></a>'+(R ? ' <span class="q">option '+o.no+'</span>' : '')+'<span class="q">'+esc(oneLine(k))+'</span></td>'
        + (R ? '<td class="score"><b>'+(r && r.total!=null ? r.total.toFixed(1) : '—')+'</b></td>' : '')
        + '<td>'+costTxt(k)+'</td><td class="gap">'+gapTxt(k)+'</td><td>'+wt.txt+(wt.judged ? '<span class="q">'+wt.judged+' judged</span>' : '')+'</td>'
        + '<td>'+storeysTxt(o.storeys||1)+'<span class="q">'+FOUND_SHORT[foundOf(o)]+'</span></td><td>'+num(o.q.cond)+' sf</td></tr>'; }).join('')+'</tbody>';
}

function drawThumbs(){
  const cvs = [...document.querySelectorAll('#summary canvas[data-k]')]; if(!cvs.length) return;
  const views = Object.keys(OPT).map(k => thumbView(OPT[k])), tw = 88, th = 58;
  const s = Math.min(tw/Math.max(...views.map(v => v.x1-v.x0)), th/Math.max(...views.map(v => v.y1-v.y0)));
  for(const c of cvs){ const o = OPT[c.dataset.k]; drawPlan(c, Object.assign({}, o, {view:thumbView(o)}), s, {thumb:true}); }
}

function sheets(){
  document.getElementById('sheets').innerHTML = order.map(k => '<section class="sheet" id="'+k+'" data-k="'+k+'">'+sheetHTML(k)+'</section>').join('');
}

// One scale per kind of drawing on every sheet, set so the widest of the kind across all options fills its column.
// Labels are drawn at fixed px sizes, so no kind is drawn below its floor: there it is drawn at the floor, and every
// canvas of the kind is shown smaller by z.
function sheetScales(){
  const el = document.querySelector('#sheets .sheet'); if(!el) return null;
  const w = e => e ? Math.floor(e.getBoundingClientRect().width) : 0, bw = w(el.querySelector('.plans'));
  // the section's and axon's grid columns as laid out; once the pair stacks, the full width
  const cols = getComputedStyle(el.querySelector('.pair')).gridTemplateColumns.split(' ').map(parseFloat), [sw, aw] = cols.length>1 ? cols : [bw, bw];
  const site = w(el.querySelector('canvas.site') && el.querySelector('canvas.site').closest('figure'));
  const ks = Object.keys(OPT);
  const mp = Math.max(...ks.map(k => Math.max(...levelsOf(OPT[k]).map(l => l.view.x1-l.view.x0))));
  const ms = Math.max(...ks.map(k => OPT[k].sect.view.y1-OPT[k].sect.view.y0));
  const ma = Math.max(...ks.map(k => { const b = axonBounds(OPT[k]); return b[1]-b[0]; }));
  // [px per ft, z] for column w, widest drawing e ft, floor lo, cap hi, and the px the canvas adds (drawAxon pads 8 a side)
  const fit = (w, e, lo, hi, pad) => { w = Math.floor(w); const f = (w-pad)/e; return f<lo ? [lo, w/(e*lo+pad)] : [Math.min(f, hi), 1]; };
  const [plan, zp] = fit(bw, mp, 4, CAP.plan, 0), [sect, zs] = fit(sw, ms, 4, CAP.sect, 0), [axon, za] = fit(aw, ma, 2.5, CAP.axon, 16);
  return {plan, sect, axon, site: siteScale(site), z:{plan:zp, sect:zs, axon:za}, narrow: window.innerWidth < 768};
}
// a canvas shown smaller keeps its drawn backing store, so it stays sharp
function drawAll(){
  const sc = sheetScales(); if(!sc) return;
  for(const el of document.querySelectorAll('#sheets .sheet')){
    drawSheet(el, el.dataset.k, sc);
    for(const cv of el.querySelectorAll('canvas')){ const z = sc.z[cv.className]; if(z<1) for(const d of ['width','height']) cv.style[d] = Math.round(parseFloat(cv.style[d])*z)+'px'; }
  }
}

function redraw(){ readTokens(); drawLegend(); drawThumbs(); drawAll(); window.__drawn = true; document.dispatchEvent(new CustomEvent('houseoptions:drawn')); }
// what diagrams.js and the checkers read; the kit's functions too, for any script that wants the same geometry
window.OPT = OPT;
window.HOKIT = {levelsOf, massOf, rotOf, trueBearing, toLot, footprints, buildable, foundOf, gradeOf, sunProfile, costOf, evalWishes, roomsOf};
order = ranked();
readTokens(); buildLegend();
const allDrawn = progress(); summary(); sheets(); redraw();
if(document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
let rt, lastW = window.innerWidth;
window.addEventListener('resize', () => { if(window.innerWidth===lastW) return; lastW = window.innerWidth; clearTimeout(rt); rt = setTimeout(redraw, 150); });
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw); } catch(e){}
new MutationObserver(redraw).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
// the progress view reloads itself each minute, so a person watching sees each option as it is accepted; never in a test browser
if(!(allDrawn && RES()) && !navigator.webdriver) setTimeout(() => location.reload(), 60000);
