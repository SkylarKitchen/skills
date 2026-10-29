'use strict';
// House options drawing kit: plans, sections, axons and site plans on 2D canvas, the wish checks and the rough cost.
// Plan coordinates are in the house's own axes, in feet: x to plan east, y to plan south, z up; floor at z=0, grade at
// gradeOf(o). The option's `site` turns and places the house on the lot (site.lot: x east, y north, true). BRIEF
// (brief.json) and COSTS (costs.json) are globals set before this file loads; nothing here reads project.js.
const EXT = 0.667, POST = 0.43;
const OPT = {};
let C = {};
const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function readTokens(){ C = {paper:tok('--paper'), tint:tok('--paper-2'), ink:tok('--ink'), ink2:tok('--ink-2'), rule:tok('--rule'), pencil:tok('--pencil'), soft:tok('--pencil-soft')}; }
const FT = v => { v=Math.abs(v); let f=Math.floor(v+1e-6), i=Math.round((v-f)*12); if(i===12){f++;i=0;} return f+"'-"+i+'"'; };
const num = n => Math.round(n).toLocaleString('en-US');
const FONT = 'Geist, -apple-system, "Helvetica Neue", Arial, sans-serif';

function setup(canvas, w, h, dpr){
  dpr = dpr || Math.min(window.devicePixelRatio||1, 2);
  canvas.style.width = Math.round(w)+'px'; canvas.style.height = Math.round(h)+'px';
  canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle = C.paper; ctx.fillRect(0,0,w,h);
  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  return ctx;
}
// seeded random for stipple
function rng(seed){ let t = seed>>>0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t>>>15, 1|t); r ^= r + Math.imul(r ^ r>>>7, 61|r); return ((r ^ r>>>14)>>>0)/4294967296; }; }

// ---------------------------------------------------------------- label placement
// Labels are drawn at fixed px sizes while a plan or section shrinks to fit a narrow screen, so there a label grows
// against what it names and runs into its neighbours or off the paper. So each plan and section is drawn twice: its
// linework alone first, into a scratch canvas, for a map of the ink and the list of its labels (sites); then for real,
// each label where LAB.place put it. A label keeps its own position whenever that is on the paper and clear of the
// labels placed before it, so a drawing with room for its labels is drawn exactly as authored. Otherwise it tries
// positions nearby, then other line breaks, smaller sizes and a quarter turn, and takes the one that moves it least and
// covers least ink; a room name stays in its room. Order: 0 stair marks; 1 room names; 2 their areas; 3 dimensions, the
// north arrow, the scale bar and the section's N and S; 4 notes and section labels; 5 sun labels. Only on a screen under
// 768 px may a label that fits nowhere be left off, and never a room name. There, no plan note or room name crosses a
// wall: a note that would is broken onto two lines or left off, and a room whose name fits nowhere in it is numbered and
// listed in a key under its plan.
// A call is one fillText: {t, x, y (canvas px), size, w, ls (letter spacing px, or null to leave it), col, align, rot, halo}.
const LAB = (() => {
  let cv = null;
  const scratch = () => { if(!cv){ cv = document.createElement('canvas'); cv.getContext('2d', {willReadFrequently:true}); } return cv; };
  const fontOf = c => c.w+' '+c.size+'px '+FONT;
  function draw(ctx, c){
    ctx.save(); ctx.fillStyle = c.col; ctx.font = fontOf(c); ctx.textAlign = c.align; ctx.textBaseline = 'middle';
    if(c.ls!=null && 'letterSpacing' in ctx) ctx.letterSpacing = c.ls+'px';
    ctx.translate(c.x, c.y); if(c.rot) ctx.rotate(c.rot);
    if(c.halo){ ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = c.halo; ctx.strokeText(c.t,0,0); }
    ctx.fillText(c.t,0,0); ctx.restore();
  }
  // the ink under a box of the scratch drawing: .ink counts each px from 0 for paper, tint and the deck and court rules
  // up to 1 for ink; .solid counts only the px of solid ink, the walls, posts and cut slabs. Summed, so a box is four lookups.
  function inkMap(){
    const c = scratch(), W = c.width, H = c.height, d = c.getContext('2d').getImageData(0,0,W,H).data;
    const lum = h => { const m = /^#([0-9a-f]{6})$/i.exec(String(h||'').trim()); if(!m) return null; const n = parseInt(m[1],16); return 0.2126*(n>>16&255)+0.7152*(n>>8&255)+0.0722*(n&255); };
    const lp = lum(C.paper) ?? 242, li = lum(C.ink) ?? 27, span = Math.abs(li-lp) || 1;
    const base = Math.max(Math.abs((lum(C.rule) ?? lp)-lp), Math.abs((lum(C.tint) ?? lp)-lp))/span + 0.06;
    const S = new Float64Array((W+1)*(H+1)), T = new Float64Array((W+1)*(H+1));
    for(let y=0; y<H; y++){ let row = 0, rs = 0;
      for(let x=0; x<W; x++){ const i = (y*W+x)*4, k = Math.abs(0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]-lp)/span;
        if(k>base) row += Math.min(1, (k-base)/(1-base));
        if(k>0.85) rs++;
        const j = (y+1)*(W+1)+x+1; S[j] = S[j-W-1] + row; T[j] = T[j-W-1] + rs; } }
    const sum = A => b => { const q = v => Math.round(v), x0 = Math.max(0,Math.min(W,q(b[0]))), x1 = Math.max(0,Math.min(W,q(b[2]))), y0 = Math.max(0,Math.min(H,q(b[1]))), y1 = Math.max(0,Math.min(H,q(b[3])));
      return x1<=x0 || y1<=y0 ? 0 : A[y1*(W+1)+x1]-A[y0*(W+1)+x1]-A[y1*(W+1)+x0]+A[y0*(W+1)+x0]; };
    return {ink: sum(S), solid: sum(T)};
  }
  // offsets in px, nearest first
  const SPIRAL = []; for(let dy=-96; dy<=96; dy+=2) for(let dx=-96; dx<=96; dx+=2){ const d = Math.hypot(dx,dy); if(d<=96) SPIRAL.push([dx,dy,d]); }
  SPIRAL.sort((a,b) => a[2]-b[2]);
  const near = r => SPIRAL.filter(o => o[2]<=r);
  const OFF = {room:near(48), area:near(18), stair:near(40), dim:near(64), mark:near(12), note:near(40), sun:SPIRAL};
  const GAP = 2, END = 6;   // px kept clear between a moved label and its neighbours, and inside the paper's edge; END, end to end
  const SHRINK = 10;        // the cost of each px a label other than a room name is made smaller (a room name's, 6)
  const overlap = (a, b) => Math.max(0, Math.min(a[2],b[2])-Math.max(a[0],b[0])) * Math.max(0, Math.min(a[3],b[3])-Math.max(a[1],b[1]));
  const outside = (b, r) => (b[2]-b[0])*(b[3]-b[1]) - overlap(b, r);
  // distance from a box to a segment, 0 when they cross
  function segDist(b, s){
    const [x0,y0,x1,y1] = s, cl = (v,a,c) => Math.max(a,Math.min(c,v));
    let best = 1e9;
    for(let i=0;i<=24;i++){ const t = i/24, x = x0+(x1-x0)*t, y = y0+(y1-y0)*t; const dx = x<b[0]?b[0]-x:x>b[2]?x-b[2]:0, dy = y<b[1]?b[1]-y:y>b[3]?y-b[3]:0; best = Math.min(best, Math.hypot(dx,dy)); }
    for(const [x,y] of [[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]]){ const L2 = (x1-x0)**2+(y1-y0)**2 || 1, t = cl(((x-x0)*(x1-x0)+(y-y0)*(y1-y0))/L2, 0, 1); best = Math.min(best, Math.hypot(x-x0-t*(x1-x0), y-y0-t*(y1-y0))); }
    return best;
  }

  // sites: one drawing's labels in drawing order; env: {W, H, shown (the canvas's on-screen size over its drawn size),
  // narrow (a screen under 768 px), full (drawn at the full scale, as on the desktop sheet), plan (a plan canvas), words
  // (the option's room-name words), things (a plan's fixtures, wardrobes and stairs), walls (a plan's wall bands and
  // partitions), bars (those and its wardrobes: the walls no note or room name crosses on a phone), rays (a section's sun
  // rays), nums (site index -> number: the rooms numbered on an earlier run), last (the last run, where a room that fits
  // nowhere is placed as best it can)}.
  // Returns the calls to draw per site, and as .fail the rooms to number, whose names fit nowhere in them on a phone.
  function place(sites, env){
    const map = inkMap(), W = env.W, H = env.H, sh = env.shown||1, memo = new Map();
    const roomy = t => { const ws = String(t).split(/[\s,]+/).filter(Boolean); return !!env.plan && ws.every(w => env.words && env.words.has(w)); };
    // the test's on-screen floors: 6 px for a room name (a room site's name, or a label of the option's room words), 5 for any other label
    const floorOf = (t, name) => (name || roomy(t) ? 6 : 5)/sh + 0.02, up = v => Math.ceil(v*4-1e-9)/4;
    // a numbered room draws its number where its name was centred, at 8.5 px or a room name's floor
    if(env.nums) sites = sites.map((s,i) => { const n = env.nums.get(i); if(n==null) return s;
      return Object.assign({}, s, {kind:'num', n:1, calls:[Object.assign({}, s.calls[0], {t:String(n), x:s.cx, y:s.cy, size:Math.max(8.5, up(floorOf('', true))), w:500, col:C.ink, ls:0, align:'center', rot:0, halo:s.nhalo || s.calls[0].halo})]}); });
    const metrics = c => { const k = c.t+'\u0001'+fontOf(c)+'\u0001'+c.ls+'\u0001'+c.align; let m = memo.get(k);
      if(!m){ const x = scratch().getContext('2d'); x.save(); x.font = fontOf(c); x.textAlign = c.align; x.textBaseline = 'middle'; if('letterSpacing' in x) x.letterSpacing = (c.ls||0)+'px';
        const t = x.measureText(c.t); m = [t.actualBoundingBoxLeft, t.actualBoundingBoxAscent, t.actualBoundingBoxRight, t.actualBoundingBoxDescent]; x.restore(); memo.set(k, m); }
      return m; };
    // a call's box on the canvas, as the test reads it: the glyphs' extent through the rotation
    const boxOf = c => { const [L,A,R,D] = metrics(c);
      if(!c.rot) return [c.x-L, c.y-A, c.x+R, c.y+D];
      const co = Math.cos(c.rot), si = Math.sin(c.rot); let x0=1e9, y0=1e9, x1=-1e9, y1=-1e9;
      for(const [u,v] of [[-L,-A],[R,-A],[R,D],[-L,D]]){ const px = c.x+co*u-si*v, py = c.y+si*u+co*v; x0=Math.min(x0,px); y0=Math.min(y0,py); x1=Math.max(x1,px); y1=Math.max(y1,py); }
      return [x0,y0,x1,y1]; };
    const resize = (c, size) => Object.assign({}, c, {size, ls: c.ls==null ? null : c.ls*size/c.size});
    const sizes = (c, lo, step) => { const a = []; for(let v=c.size; v>=lo-1e-9; v-=step) a.push(+v.toFixed(2)); if(a[a.length-1]>lo+0.01 && lo<c.size) a.push(up(lo)); return a; };
    // a label the screen would show under its floor is drawn at the floor
    for(const s of sites) s.calls = s.calls.map((c,i) => { const f = floorOf(c.t, s.kind==='room' && i<s.n); return c.size<f ? resize(c, up(f)) : c; });

    const out = sites.map(() => []), placed = [];
    let soft = [];   // where the labels not yet placed were authored: a place to keep clear of, if it can
    sites.forEach((s,i) => { s.i = i; s.b0 = s.calls.map(boxOf); s.b0.forEach(b => soft.push({i, b})); });
    const inside = (b, t) => b[0]>=-t && b[1]>=-t && b[2]<=W+t && b[3]<=H+t;
    const hits = (b, g) => placed.some(p => Math.min(b[2],p[2])-Math.max(b[0],p[0]) > g && Math.min(b[3],p[3])-Math.max(b[1],p[1]) > g);
    // as authored: the test's own tolerance, 1 px of overlap or overrun; moved: GAP px clear
    // and moved, END px between two labels end to end, which would otherwise read as one line
    const wide = q => q[2]-q[0] > q[3]-q[1];
    const endTo = (b, p) => { const ix = Math.min(b[2],p[2])-Math.max(b[0],p[0]), iy = Math.min(b[3],p[3])-Math.max(b[1],p[1]);
      return wide(b) && wide(p) ? iy > 0 && ix > -END : !wide(b) && !wide(p) && ix > 0 && iy > -END; };
    const ends = b => placed.some(p => endTo(b, p));
    const clear = (bs, authored) => bs.every(b => authored ? inside(b, 1) && !hits(b, 1) : inside(b, -GAP) && !hits(b, -GAP) && !ends(b));
    const take = (s, calls, bs) => { out[s.i].push(...calls); placed.push(...bs); };
    const sum = (bs, f) => bs.reduce((a,b) => a+f(b), 0), areaOf = b => (b[2]-b[0])*(b[3]-b[1]);
    // the px of wall under a box: its solid ink (walls, posts, a section's cut), or on a plan the wall bands and partitions
    // it covers, their glass and doors included
    const wallOf = b => { let v = map.solid(b); if(env.walls){ let w = 0; for(const q of env.walls) w += overlap(b, q); v = Math.max(v, w); } return v; };
    // on a wall: at the full scale, more solid ink under it than any authored label covers on the desktop sheet; drawn
    // smaller, across a wall line
    const onWall = bs => env.full ? sum(bs, map.solid) > Math.max(20, 0.06*sum(bs, areaOf)) : sum(bs, wallOf) > Math.max(6, 0.01*sum(bs, areaOf));
    // a room name drawn smaller than the full scale that runs more than 2 px past its room's walls
    const spills = s => !env.full && s.kind==='room' && !!s.rb && s.b0.slice(0, s.n).some(b => b[0]<s.rb[0]-2 || b[1]<s.rb[1]-2 || b[2]>s.rb[2]+2 || b[3]>s.rb[3]+2);
    // a moved label keeps off the wall lines: strictly, no more wall under it than the edge of a line; loosely, a thin partition
    const offWall = (bs, strict) => sum(bs, wallOf) <= Math.max(3, (strict ? 0.004 : 0.02)*sum(bs, areaOf));
    // over where a label still to come was authored, past the test's 1 px
    const onSoft = (bs, i) => soft.some(e => e.i!==i && bs.some(b => Math.min(b[2],e.b[2])-Math.max(b[0],e.b[0]) > 1 && Math.min(b[3],e.b[3])-Math.max(b[1],e.b[1]) > 1));
    // a moved note keeps off the plan's things (fixtures, wardrobes and stairs): it covers none by more than a tenth of
    // itself or half of the thing, except the one it names if that is big enough to write on; and a moved section label
    // keeps off the sun rays other than its own
    const apart = (bs, s) => {
      if(env.things && s.kind==='note'){ let v = 0;
        for(const b of bs) env.things.forEach((t,j) => { if(j===s.thing) return; const ov = overlap(b, t); v += ov > 0.5*areaOf(t) ? 1e9 : ov; });
        if(v > 0.1*sum(bs, areaOf)) return false; }
      for(const r of env.rays||[]) if(r.r!==s.ray && bs.some(b => segDist(b, r.r) < 1.5)) return false;
      return true; };
    // crossed by a sun ray other than its own
    const onRay = (bs, s) => !!env.rays && env.rays.some(r => r.r!==s.ray && bs.some(b => segDist(b, r.r) < 1));
    // on a phone, across a wall: over a wall band, partition or wardrobe by more than the test's 1 px both ways. A plan's
    // note, room name, area or room number never is
    const hard = !!(env.narrow && env.bars), fail = [];
    const crosses = bs => hard && bs.some(b => env.bars.some(q => Math.min(b[2],q[2])-Math.max(b[0],q[0]) > 1 && Math.min(b[3],q[3])-Math.max(b[1],q[1]) > 1));
    const held = s => s.kind==='note' || s.kind==='room' || s.kind==='num';

    // a form: calls relative to an anchor (x, y), with a penalty, a cost per px moved, and a test of each offset
    const form = (calls, x, y, pen, dw, ok) => ({calls, rel: calls.map(boxOf), x, y, pen, dw: dw||1, ok});
    // the cheapest clear candidate: forms in order of penalty, each at offsets nearest first, until no candidate left can
    // beat the best. A candidate costs its penalty, the px it moved, the ink it covers (wall five times over), what
    // o.extra adds (null rules it out) and its overlap with where the labels still to come were authored, and 25 for
    // each of those it would run into end to end. o.gate is a
    // test a moved label must pass to count as placed; o.keep, the authored label, clear but on a wall, stands unless
    // something beats it. With nothing clear, the candidate that overlaps least, marked not ok.
    function search(s, forms, offs, o){
      o = o||{};
      forms.sort((a,b) => a.pen-b.pen);
      const costOf = (bs, base, ex) => { let c = base + ex; for(const b of bs){ c += 0.5*map.ink(b) + 2*wallOf(b); for(const e of soft) if(e.i!==s.i) c += 0.6*overlap(b, e.b) + (endTo(b, e.b) ? 25 : 0); } return c; };
      let best = null, least = null, n = 0;
      if(o.keep){ const ex = o.extra ? o.extra(o.keep.bs) : 0; best = {keep:true, bs:o.keep.bs, cost:costOf(o.keep.bs, o.keep.pen||0, ex==null ? 0 : ex)}; }
      for(const f of forms){
        if(best && f.pen>=best.cost) break;
        for(const q of offs){
          const base = f.pen + q[2]*f.dw; if(best && base>=best.cost) break;
          const dx = q[0], dy = q[1]; if(f.ok && !f.ok(dx, dy, f)) continue;
          const bs = f.rel.map(b => [b[0]+f.x+dx, b[1]+f.y+dy, b[2]+f.x+dx, b[3]+f.y+dy]);
          const ex = o.extra ? o.extra(bs) : 0; if(ex==null) continue;
          const cost = costOf(bs, base, ex);
          if(clear(bs, false) && (!o.gate || o.gate(bs, f))){ if(!best || cost<best.cost) best = {f, dx, dy, bs, cost}; }
          else if(n++ < 3000){ let v = 0; for(const b of bs){ v += areaOf(b) - overlap(b, [0,0,W,H]); for(const p of placed) v += overlap(b, p); }
            if(!least || v<least.v || (v===least.v && cost<least.cost)) least = {f, dx, dy, bs, cost, v}; }
        }
      }
      if(best && best.keep) return {calls: o.keep.calls, bs: o.keep.bs, ok: true, keep: true};
      const r = best || least; if(!r) return null;
      return {calls: r.f.calls.map(c => Object.assign({}, c, {x: c.x+r.f.x+r.dx, y: c.y+r.f.y+r.dy})), bs: r.bs, ok: !!best, f: r.f};
    }
    const at0 = c => Object.assign({}, c, {x:0, y:0});
    const within = (r, x, y) => r ? (dx,dy) => x+dx>=r[0] && x+dx<=r[2] && y+dy>=r[1] && y+dy<=r[3] : null;

    const deferred = [];
    function placeSite(s){
      soft = soft.filter(e => e.i!==s.i);
      if(s.calls.every(c => !c.t.trim())){ if(!env.narrow) out[s.i] = s.calls; return; }   // a blank mark: kept for the complete sheet
      const across = bs => held(s) && crosses(bs), fine = clear(s.b0, true) && !across(s.b0);
      // drawn smaller than the full scale, a label also steps off a sun ray and out of line with a label end to end, and a
      // room name, free to move in its room, comes back inside it and makes way for the labels still to come, pinned to
      // what they name; each moves only where it finds a better place
      const rayed = !env.full && onRay(s.b0, s), abuts = !env.full && s.b0.some(ends);
      if(fine && !onWall(s.b0) && !spills(s) && !rayed && !abuts && !(!env.full && s.kind==='room' && onSoft(s.b0, s.i))){ take(s, s.calls, s.b0); return; }
      // strictly clear of wall lines first, then with a thin partition under it; a note away from what it names only
      // where it may not be left off
      const keep = fine ? {calls:s.calls, bs:s.b0, pen: rayed || abuts ? 12 : 0} : null, kind = KIND[s.kind] || KIND.note;
      let r = kind(s, keep, bs => offWall(bs, true) && apart(bs, s) && !across(bs));
      if(!(r && r.ok) && s.kind!=='room') r = kind(s, keep, bs => offWall(bs, false) && apart(bs, s) && !across(bs)) || r;
      if(!(r && r.ok) && !env.narrow && s.kind==='note') r = kind(s, keep, bs => offWall(bs, false), true) || r;
      // on a phone, a room whose name fits nowhere in it is numbered instead: drawPlan places the plan again with it
      // numbered, unless this is the last run
      if(hard && s.kind==='room' && !(r && r.ok) && !env.last){ fail.push(s.i); const d = deferred.findIndex(u => u.s===s); if(d>=0) deferred.splice(d, 1); return; }
      if(r && (r.ok || !env.narrow || s.kind==='room' || s.kind==='num')) take(s, r.calls, r.bs);
      // else left off: only on a phone, and only when nothing fits
    }
    // two lines from one, broken at the space nearest its middle
    const halves = t => { const ws = t.split(' '); let k = 1, bd = 1e9;
      for(let j=1;j<ws.length;j++){ const g = Math.abs(ws.slice(0,j).join(' ').length-ws.slice(j).join(' ').length); if(g<bd){ bd = g; k = j; } }
      return [ws.slice(0,k).join(' '), ws.slice(k).join(' ')]; };
    // each kind: (site, the authored label to keep if nothing beats it, the gate a moved label must pass) -> placement
    const KIND = {
      // a room name keeps its point in its room; it may get smaller, leave its area to be placed after every room's name,
      // turn a quarter in a tall room, and on a phone break its lines another way
      room(s, keep){
        const n = s.n, nm = s.calls[0], ar = s.calls.length>n ? s.calls[n] : null, lines0 = s.calls.slice(0,n).map(c => c.t);
        const text = lines0.join(' '), wraps = [lines0];
        if(env.narrow){ if(n>1) wraps.push([text]); else if(text.includes(' ')) wraps.push(halves(text)); }
        const rb = s.rb, rot0 = nm.rot||0, tall = rb && (rb[3]-rb[1]) > (rb[2]-rb[0])*1.15, rots = [rot0];
        if(rot0) rots.push(0); else if(tall) rots.push(-Math.PI/2);
        const forms = [];
        for(const rot of rots) for(const lines of wraps) for(const size of sizes(nm, Math.max(floorOf(nm.t, true), Math.min(nm.size, 7)), 0.5)) for(const withArea of ar ? [true,false] : [false]){
          const lh = s.lh*size/nm.size, m = lines.length, top = -(m-1)*lh/2 - (withArea ? lh/2 : 0), co = Math.cos(rot), si = Math.sin(rot);
          const at = oy => [-si*oy, co*oy];
          const calls = lines.map((t,i) => { const [x,y] = at(top+i*lh); return Object.assign(resize(nm, size), {t, x, y, rot}); });
          if(withArea){ const [x,y] = at(top+m*lh); calls.push(Object.assign(resize(ar, Math.max(up(floorOf(ar.t)), ar.size-(nm.size-size))), {x, y, rot})); }
          const pen = (rot!==rot0 ? 16 : 0) + (lines!==lines0 ? 7 : 0) + (nm.size-size)*6 + (ar && !withArea ? 10 : 0);
          forms.push(Object.assign(form(calls, s.cx, s.cy, pen, 1, within(rb, s.cx, s.cy)), {area: withArea}));
        }
        const r = search(s, forms, OFF.room, {keep, gate: hard ? bs => !crosses(bs) : null, extra: rb ? bs => sum(bs, b => 0.3*outside(b, rb)) : null});
        if(r && ar && r.f && !r.f.area) deferred.push({s, nb: r.bs, ar});   // the area is placed after every room's name
        return r;
      },
      // a room's number stays in its room, near where its name was centred
      num(s, keep, gate){
        const c = s.calls[0], f = [form([at0(c)], c.x, c.y, 0, 1, within(s.rb, c.x, c.y))], r = search(s, f, OFF.mark, {keep, gate});
        return r && r.ok ? r : search(s, f, OFF.room, {keep, gate}) || r;
      },
      // a stair's mark slides along its stair
      stair(s, keep, gate){
        const c = s.calls[0], r = s.r;
        return search(s, [form([at0(c)], c.x, c.y, 0, 1, (dx,dy) => s.vert ? Math.abs(dx)<=2 && c.y+dy>=r[1] && c.y+dy<=r[3] : Math.abs(dy)<=2 && c.x+dx>=r[0] && c.x+dx<=r[2])], OFF.stair, {keep, gate});
      },
      // a dimension slides along its line, or crosses to the line's other side, or at the free end of its string stands
      // past the end, in line with it; crossing or past the end, never into the row of another string's figures, where it
      // would read as one of them
      dim(s, keep, gate){
        const c = s.calls[0], forms = [], dims = sites.filter(t => t.kind==='dim' && t!==s && t.hz===s.hz);
        const rows = dims.filter(t => Math.abs(t.at-s.at) > 1).flatMap(t => t.b0), tier = dims.filter(t => Math.abs(t.at-s.at) <= 1);
        // in another string's row: level with one of its figures or within END of its level, both along this line or within
        // 3 END of each other
        const along = q => s.hz ? q[2] > s.a && q[0] < s.b : q[3] > s.a && q[1] < s.b;
        const apartRow = bs => !bs.some(b => rows.some(p => { const ix = Math.min(b[2],p[2])-Math.max(b[0],p[0]), iy = Math.min(b[3],p[3])-Math.max(b[1],p[1]);
          return s.hz ? iy > -END && (ix > -3*END || along(b) && along(p)) : ix > -END && (iy > -3*END || along(b) && along(p)); }));
        const free = [!tier.some(t => Math.abs(t.a-s.b) < 1), !tier.some(t => Math.abs(t.b-s.a) < 1)], gap = (s.tk||2) + 3;
        for(const size of sizes(c, Math.max(floorOf(c.t), Math.min(c.size, 7)), 0.5)){
          const cc = at0(resize(c, size)), pen = (c.size-size)*SHRINK;
          for(const side of [0,1]){
            const x = s.hz ? c.x : side ? 2*s.at-c.x : c.x, y = s.hz ? (side ? 2*s.at-c.y : c.y) : c.y;
            forms.push(Object.assign(form([cc], x, y, side*6 + pen, 1, s.hz ? (dx,dy) => Math.abs(dy)<=2 && x+dx>=s.a && x+dx<=s.b : (dx,dy) => Math.abs(dx)<=2 && y+dy>=s.a && y+dy<=s.b), {row: side===1}));
          }
          const [x0,y0,x1,y1] = boxOf(cc);
          for(const end of [0,1]) if(free[end]){   // 0: past its far end (right or bottom), 1: before its near end
            const x = s.hz ? (end ? s.a-gap-x1 : s.b+gap-x0) : s.at-(x0+x1)/2, y = s.hz ? s.at-(y0+y1)/2 : (end ? s.a-gap-y1 : s.b+gap-y0);
            forms.push(Object.assign(form([cc], x, y, 14 + pen, 1, s.hz ? (dx,dy) => Math.abs(dy)<=3 && (end ? dx<=0 : dx>=0) && Math.abs(dx)<=8 : (dx,dy) => Math.abs(dx)<=3 && (end ? dy<=0 : dy>=0) && Math.abs(dy)<=8), {row: true}));
          }
        }
        return search(s, forms, OFF.dim, {keep, gate: (bs, f) => (!f.row || apartRow(bs)) && (!gate || gate(bs))});
      },
      // the north arrow's N, the scale bar's figures and the section's N and S stay by their marks, the scale bar's
      // unit past the bar's end and never above it
      mark(s, keep, gate){
        const c = s.calls[0], ok = c.align==='left' ? (dx,dy) => dx>=-1 && dy>=-1 : null;
        return search(s, sizes(c, Math.max(floorOf(c.t), c.size*0.85), 0.5).map(size => form([at0(resize(c, size))], c.x, c.y, (c.size-size)*SHRINK, 1, ok)), OFF.mark, {keep, gate});
      },
      // a note stays at what it names: it slides along its line or steps off it by about its height, so it still reaches its
      // point, and its point stays in its room; on a phone it may break onto two lines. far: anywhere near its point in its
      // room, for a sheet that may not leave it off
      note(s, keep, gate, far){
        const c = s.calls[0], R = Math.max(3, 0.6*c.size), inRoom = within(s.rb, c.x, c.y), wraps = [[c.t]], forms = [];
        if(env.narrow && !c.rot && c.t.includes(' ')) wraps.push(halves(c.t));
        const reach = (dx, dy, f) => { const px = -dx, py = -dy; return f.rel.some(b => Math.hypot(px<b[0] ? b[0]-px : px>b[2] ? px-b[2] : 0, py<b[1] ? b[1]-py : py>b[3] ? py-b[3] : 0) <= R); };
        for(const lines of wraps) for(const size of sizes(c, Math.max(floorOf(c.t), c.size*0.8), 0.5)){
          const lh = size*1.2, m = lines.length, calls = lines.map((t,i) => Object.assign(at0(resize(c, size)), {t, y:(i-(m-1)/2)*lh}));
          forms.push(form(calls, c.x, c.y, (c.size-size)*SHRINK + (m>1 ? 7 : 0), 1, (dx,dy,f) => (!inRoom || inRoom(dx,dy)) && (far || reach(dx,dy,f))));
        }
        return search(s, forms, OFF.note, {keep, gate});
      },
      // a sun label stays beside its ray, on either side of it and either side of its end, never across it
      sun(s, keep, gate){
        const c = s.calls[0], forms = [], ray = s.ray;
        for(const align of [c.align, c.align==='left' ? 'right' : 'left']) for(const size of sizes(c, Math.max(floorOf(c.t), Math.min(c.size, 7)), 0.5))
          forms.push(form([Object.assign(at0(resize(c, size)), {align})], c.x, c.y, (align!==c.align ? 3 : 0) + (c.size-size)*SHRINK, 0.35));
        return search(s, forms, OFF.sun, {keep, gate, extra: ray ? bs => { const g = segDist(bs[0], ray); return g<1.5 || g>14 ? null : 0; } : null});
      }
    };
    // an area left behind by its room's name: under the name, or above it, or beside it
    function placeArea(u){
      const {s, nb, ar} = u, b = nb.reduce((a,q) => [Math.min(a[0],q[0]), Math.min(a[1],q[1]), Math.max(a[2],q[2]), Math.max(a[3],q[3])], [1e9,1e9,-1e9,-1e9]);
      const cx = (b[0]+b[2])/2, cy = (b[1]+b[3])/2, forms = [];
      for(const size of sizes(ar, Math.max(floorOf(ar.t), Math.min(ar.size, 6.5)), 0.5)){
        const c = Object.assign(at0(resize(ar, size)), {rot:0}), [, A, , D] = metrics(c), pen = (ar.size-size)*6;
        forms.push(form([c], cx, b[3]+GAP+A, pen), form([c], cx, b[1]-GAP-D, pen+3),
          form([Object.assign({}, c, {align:'left'})], b[2]+4, cy, pen+5), form([Object.assign({}, c, {align:'right'})], b[0]-4, cy, pen+6));
      }
      let r = search(s, forms, OFF.area, {gate: bs => offWall(bs, true) && !crosses(bs)});
      if(!(r && r.ok)) r = search(s, forms, OFF.area, {gate: bs => offWall(bs, false) && !crosses(bs)}) || r;
      if(r && (r.ok || !env.narrow)) take(s, r.calls, r.bs);
    }
    const order = sites.slice().sort((a,b) => a.prio-b.prio || (a.key||0)-(b.key||0) || a.i-b.i);
    let areas = false;
    for(const s of order){ if(s.prio>=2 && !areas){ areas = true; deferred.forEach(placeArea); } placeSite(s); }
    if(!areas) deferred.forEach(placeArea);
    out.fail = fail;
    return out;
  }

  // the clear rectangle around a room's label point in a plan, in ft: as far as the nearest wall, partition, wardrobe,
  // door or screen to the left, right, above and below, and within the outdoor floor the point stands on, if any
  function roomBox(o, x, y){
    const v = o.view, obs = [];
    for(const [x0,y0,x1,y1] of o.vols||[]) obs.push([x0,y0,x1,y0+EXT],[x0,y1-EXT,x1,y1],[x0,y0,x0+EXT,y1],[x1-EXT,y0,x1,y1]);
    obs.push(...(o.parts||[]), ...(o.ward||[]), ...(o.idoors||[]).map(d => d.r));
    for(const [a,b,c,d] of o.screens||[]) obs.push([Math.min(a,c)-0.05, Math.min(b,d)-0.05, Math.max(a,c)+0.05, Math.max(b,d)+0.05]);
    let l = v.x0, r = v.x1, u = v.y0, dn = v.y1;
    if(!(o.vols||[]).some(q => x>q[0] && x<q[2] && y>q[1] && y<q[3])){
      const f = (o.floors||[]).find(f => f.k!=='void' && x>=f.r[0] && x<=f.r[2] && y>=f.r[1] && y<=f.r[3]);
      if(f){ l = f.r[0]; u = f.r[1]; r = f.r[2]; dn = f.r[3]; } }
    for(const q of obs){
      if(x>q[0] && x<q[2] && y>q[1] && y<q[3]) continue;
      if(y>=q[1] && y<=q[3]){ if(q[2]<=x) l = Math.max(l, q[2]); if(q[0]>=x) r = Math.min(r, q[0]); }
      if(x>=q[0] && x<=q[2]){ if(q[3]<=y) u = Math.max(u, q[3]); if(q[1]>=y) dn = Math.min(dn, q[1]); }
    }
    return [l,u,r,dn];
  }
  // the words of every room name on an option's plans, as the sheet test reads them
  const roomWords = o => new Set([o, ...(o.levels||[])].flatMap(l => (l.rooms||[]).flatMap(r => String(r[0]).split('|'))).flatMap(t => t.split(/[\s,]+/)).filter(Boolean));
  // a note that names a room, such as "powder" or "Pantry": one or two words, each a word of some room name in the
  // catalog and none a word of place ("porch roof", "gallery above" are notes), so it is placed as a room's name, never left off
  const PLACE = new Set(['above','below','beyond','the','to','of','roof','open','eave','roofed','covered','unheated']);
  let vocab = null;
  function namesRoom(t){
    const n = Object.keys(OPT).length;
    if(!vocab || vocab.n!==n){ vocab = new Set(Object.values(OPT).flatMap(o => [...roomWords(o)]).map(w => w.toLowerCase())); vocab.n = n; }
    const ws = String(t).split(/[\s,]+/).filter(Boolean).map(w => w.toLowerCase());
    return ws.length>0 && ws.length<=2 && ws.every(w => vocab.has(w) && !PLACE.has(w) && !/\d/.test(w));
  }
  // the on-screen size of a canvas drawn w px wide and shown z times smaller, as drawOpen rounds it
  const shownOf = (w, z) => z && z<1 ? Math.round(Math.round(w)*z)/Math.round(w) : 1;
  return {scratch, draw, place, roomBox, roomWords, namesRoom, shownOf};
})();

// ---------------------------------------------------------------- plan
// opt.thumb: walls, openings, floors and roofs only (no fixtures, labels, dims, arrow or scale bar)
// opt.z: the canvas is shown z times smaller than drawn; opt.narrow: a screen under 768 px; opt.full: drawn at the full
// scale, where every label stands as authored unless it runs into another or off the paper; opt.words: the option's room-name
// words; opt.n0: the first room number. Returns the plan's room key, [{n, name}], in number order.
function drawPlan(canvas, o, s, opt){
  opt = opt||{};
  if(opt.thumb) return paintPlan(canvas, o, s, opt, null);
  const v = o.view, W = (v.x1-v.x0)*s, H = (v.y1-v.y0)*s, lab = {sites:[]};
  paintPlan(LAB.scratch(), o, s, opt, lab);
  const env = {W:Math.round(W), H:Math.round(H), shown:LAB.shownOf(W, opt.z), narrow:!!opt.narrow, full:!!opt.full, plan:true, words:opt.words||LAB.roomWords(o), things:lab.things, walls:lab.walls, bars:lab.bars};
  let out = LAB.place(lab.sites, env), key = [];
  // on a phone, the rooms whose names fit nowhere in them are numbered, west to east and north to south from opt.n0, and
  // the labels placed again with the numbers; a room that fails only then joins them, until a fourth run places every
  // room as best it can
  for(let run = 1, fail = [], ss = lab.sites; out.fail.length && run <= 3; run++){
    fail = fail.concat(out.fail).sort((a,b) => Math.round(ss[a].rx/2)-Math.round(ss[b].rx/2) || ss[a].ry-ss[b].ry);
    const n0 = opt.n0||1;
    out = LAB.place(ss, Object.assign({}, env, {nums:new Map(fail.map((i,j) => [i, n0+j])), last:run===3}));
    key = fail.map((i,j) => ({n:n0+j, name:ss[i].name}));
  }
  paintPlan(canvas, o, s, opt, {out});
  return key;
}
// lab: {sites} to draw the linework into the scratch canvas and collect the labels; {out} to draw with the labels placed;
// null for a thumbnail, whose stair marks are drawn as authored
function paintPlan(canvas, o, s, opt, lab){
  const thumb = !!opt.thumb;
  const v = o.view, W = (v.x1-v.x0)*s, H = (v.y1-v.y0)*s;
  const ctx = setup(canvas, W, H, lab && lab.sites ? 1 : 0);
  const X = x => (x-v.x0)*s, Y = y => (y-v.y0)*s;
  const rect = (r, fill, stroke, lw, dash) => { ctx.save(); if(dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.rect(X(r[0]),Y(r[1]),(r[2]-r[0])*s,(r[3]-r[1])*s); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1;ctx.stroke();} ctx.restore(); };
  const line = (x1,y1,x2,y2,col,lw,dash) => { ctx.save(); if(dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(X(x1),Y(y1)); ctx.lineTo(X(x2),Y(y2)); ctx.strokeStyle=col; ctx.lineWidth=lw||1; ctx.stroke(); ctx.restore(); };
  const pl = (pts, col, lw, dash, close) => { ctx.save(); if(dash) ctx.setLineDash(dash); ctx.beginPath(); for(let i=0;i<pts.length;i+=2){ const px=X(pts[i]), py=Y(pts[i+1]); i?ctx.lineTo(px,py):ctx.moveTo(px,py); } if(close) ctx.closePath(); ctx.strokeStyle=col; ctx.lineWidth=lw||1; ctx.stroke(); ctx.restore(); };
  // one fillText as the plan draws it, at (x, y) in ft
  const call = (t, x, y, opt) => { opt=opt||{}; const size = opt.size||10; return {t:String(t), x:X(x), y:Y(y), size, w:opt.w||500, ls:(opt.ls==null?0.06:opt.ls)*size, col:opt.col||C.ink2, align:opt.align||'center', rot:opt.rot||0, halo:opt.halo||null}; };
  let li = 0;
  const put = site => { const i = li++; if(lab && lab.sites) lab.sites.push(site); else for(const c of (lab ? lab.out[i] : site.calls)) LAB.draw(ctx, c); };
  const rbox = (x, y) => { const b = LAB.roomBox(o, x, y); return [X(b[0]), Y(b[1]), X(b[2]), Y(b[3])]; };
  const words = opt.words || LAB.roomWords(o), roomy = t => { const ws = String(t).split(/[\s,]+/).filter(Boolean); return ws.length>0 && ws.every(w => words.has(w)); };
  const clipRect = (r, fn) => { ctx.save(); ctx.beginPath(); ctx.rect(X(r[0]),Y(r[1]),(r[2]-r[0])*s,(r[3]-r[1])*s); ctx.clip(); fn(); ctx.restore(); };

  // 1 outdoor floors
  for(const f of o.floors||[]){
    const r = f.r;
    if(f.k==='void') continue;   // open to below: drawn after the tint, see step 3
    if(f.k==='court' || f.k==='yard'){
      rect(r, null, C.rule, 0.75, [2,3]);
      if(f.k==='court'){ const rnd = rng(Math.round(r[0]*31+r[1]*17)); clipRect(r, () => { ctx.fillStyle=C.ink2; const n = Math.round((r[2]-r[0])*(r[3]-r[1])*0.9); for(let i=0;i<n;i++){ ctx.globalAlpha=0.35; ctx.fillRect(X(r[0]+rnd()*(r[2]-r[0])), Y(r[1]+rnd()*(r[3]-r[1])), 1, 1); } }); }
      continue;
    }
    if(f.k!=='bare') clipRect(r, () => { const step = 1.0; const along = f.dir || 'x';
      if(along==='x'){ for(let y=Math.ceil(r[1]/step)*step; y<r[3]; y+=step) line(r[0],y,r[2],y,C.rule,0.6); }
      else { for(let x=Math.ceil(r[0]/step)*step; x<r[2]; x+=step) line(x,r[1],x,r[3],C.rule,0.6); } });
    rect(r, null, C.ink2, 0.75);
  }
  // 2 conditioned tint, then open-to-below
  for(const vol of o.vols) rect(vol, C.tint);
  for(const f of o.floors||[]) if(f.k==='void'){ const r=f.r; rect(r, C.paper); line(r[0],r[1],r[2],r[3],C.ink2,0.6,[5,3]); line(r[0],r[3],r[2],r[1],C.ink2,0.6,[5,3]); }
  // 3 stairs, over the tint so interior stairs show
  for(const st of o.stairs||[]){
    const r = st.r; rect(r, C.paper, C.ink, 0.9);
    const n = st.n||4, vert = st.dir==='N'||st.dir==='S';
    for(let i=1;i<n;i++){ if(vert){ const y=r[1]+(r[3]-r[1])*i/n; line(r[0],y,r[2],y,C.ink,0.6); } else { const x=r[0]+(r[2]-r[0])*i/n; line(x,r[1],x,r[3],C.ink,0.6); } }
    const cx=(r[0]+r[2])/2, cy=(r[1]+r[3])/2;
    put({kind:'stair', prio:0, calls:[call(st.label||'DN', vert?cx:cx, vert?(st.dir==='S'?r[1]+0.9:r[3]-0.9):cy, {size:7.5, col:C.ink2, rot: vert?0:-Math.PI/2})], r:[X(r[0]),Y(r[1]),X(r[2]),Y(r[3])], vert});
  }
  // 4 fixtures
  if(!thumb) for(const f of o.fx||[]) fixture(ctx, f, X, Y, s);
  // 5 wardrobes and partitions
  for(const w of o.ward||[]){ rect(w, C.paper, C.ink, 0.9); const hz=(w[2]-w[0])>(w[3]-w[1]); if(hz) line(w[0]+0.3,(w[1]+w[3])/2,w[2]-0.3,(w[1]+w[3])/2,C.ink2,0.6,[3,2]); else line((w[0]+w[2])/2,w[1]+0.3,(w[0]+w[2])/2,w[3]-0.3,C.ink2,0.6,[3,2]); }
  for(const p of o.parts||[]) rect(p, C.ink);
  // 6 exterior walls
  for(const vol of o.vols){ const [x0,y0,x1,y1]=vol; rect([x0,y0,x1,y0+EXT],C.ink); rect([x0,y1-EXT,x1,y1],C.ink); rect([x0,y0,x0+EXT,y1],C.ink); rect([x1-EXT,y0,x1,y1],C.ink); }
  for(const c of o.cuts||[]) rect(c, C.tint);
  // 7 openings in exterior walls
  for(const op of o.open||[]){
    const vol = o.vols[op.v], [x0,y0,x1,y1] = vol, hz = op.w==='N'||op.w==='S';
    const g = op.w==='N'?[op.a,y0,op.b,y0+EXT]: op.w==='S'?[op.a,y1-EXT,op.b,y1]: op.w==='W'?[x0,op.a,x0+EXT,op.b]:[x1-EXT,op.a,x1,op.b];
    const inward = {N:1,S:-1,W:1,E:-1}[op.w];
    opening(g, hz, op.k, op.h||'a', op.s==='out'?-inward:inward);
  }
  // 8 interior doors
  for(const d of o.idoors||[]){ const hz=(d.r[2]-d.r[0])>(d.r[3]-d.r[1]); opening(d.r, hz, d.k||'door', d.h||'a', d.d||1, true); }
  // 9 screens and posts
  for(const sc of o.screens||[]) line(sc[0],sc[1],sc[2],sc[3],C.ink2,1,[4,3]);
  for(const p of o.posts||[]) rect([p[0]-POST/2,p[1]-POST/2,p[0]+POST/2,p[1]+POST/2],C.ink);
  // 10 roof edges above
  for(const r of o.roofs||[]) pl(r, C.ink2, 0.75, [7,4], true);
  for(const m of o.monitor||[]) pl(m, C.ink2, 0.75, [10,3,2,3], true);
  if(thumb) return;
  // 11 labels
  for(const rm of o.rooms||[]){
    const [name,x,y,area] = rm, lines = name.split('|'), fs = 9.5, lh = 11.5;
    const top = y - (lines.length-1)*lh/2/s - (area?lh/2/s:0);
    const halo = rm[4]===false ? null : rm[4]==='paper' ? C.paper : C.tint;
    const calls = lines.map((t,i)=>call(t, x, top + i*lh/s, {size:fs, col:C.ink, w:500, halo}));
    if(area) calls.push(call(num(area)+' sf', x, top + lines.length*lh/s, {size:9, col:C.ink2, w:400, ls:0, halo}));
    const rb = rbox(x, y);
    put({kind:'room', prio:1, calls, n:lines.length, lh, cx:X(x), cy:Y(y), rb, key:(rb[2]-rb[0])*(rb[3]-rb[1]), name:lines.join(' ')+(area ? ', '+num(area)+' sf' : ''), rx:x, ry:y});
  }
  // a note that names a room (every word of it a room-name word) is placed as a room name; any other note stays at what
  // it names and off the other things on the plan. It names the fixture, wardrobe or stair nearest its point (within
  // 1.5 ft), and may be written on it when that is at least 2.5 ft across both ways
  const things = [...(o.fx||[]).map(([k,x,y,w,d]) => k==='chain' ? [x-0.35,y-0.35,x+0.35,y+0.35] : k==='tank' ? [x,y+d/2-w/2,x+w,y+d/2+w/2] : k==='table' ? [x-1.1,y-1.1,x+w+1.1,y+d+1.1] : [x,y,x+w,y+d]),
    ...(o.ward||[]), ...(o.stairs||[]).map(st => st.r)];
  const nearest = (x, y) => { let j = -1, bd = 1.5; things.forEach((t,i) => { const d = Math.hypot(Math.max(t[0]-x, 0, x-t[2]), Math.max(t[1]-y, 0, y-t[3])); if(d<=bd){ bd = d; j = i; } });
    return j>=0 && Math.min(things[j][2]-things[j][0], things[j][3]-things[j][1]) >= 2.5 ? j : -1; };
  const onCanvas = r => [X(r[0]), Y(r[1]), X(r[2]), Y(r[3])];
  if(lab && lab.sites){ lab.things = things.map(onCanvas);
    lab.walls = [...o.vols.flatMap(([x0,y0,x1,y1]) => [[x0,y0,x1,y0+EXT],[x0,y1-EXT,x1,y1],[x0,y0,x0+EXT,y1],[x1-EXT,y0,x1,y1]]), ...(o.parts||[])].map(onCanvas);
    lab.bars = lab.walls.concat((o.ward||[]).map(onCanvas)); }
  for(const n of o.notes||[]){ const c = call(n[0], n[1], n[2], Object.assign({size:8.5, col:C.ink2, w:400, ls:0.02}, n[3]||{}));
    // numbered, it is keyed by its words, capitalised, and its number haloed in the tint of what it stands on
    if(roomy(n[0]) || LAB.namesRoom(n[0])){ const rb = rbox(n[1], n[2]); put({kind:'room', prio:1, calls:[c], n:1, lh:c.size*1.2, cx:c.x, cy:c.y, rb, key:(rb[2]-rb[0])*(rb[3]-rb[1]),
      name:n[0].charAt(0).toUpperCase()+n[0].slice(1), rx:n[1], ry:n[2], nhalo:o.vols.some(q => n[1]>=q[0] && n[1]<=q[2] && n[2]>=q[1] && n[2]<=q[3]) ? C.tint : C.paper}); }
    else put({kind:'note', prio:4, calls:[c], rb:rbox(n[1], n[2]), thing:nearest(n[1], n[2])}); }
  // 12 dimensions
  for(const d of o.dims||[]){
    const [ax,ay,bx,by,off] = d, hz = Math.abs(by-ay)<1e-6, len = hz?Math.abs(bx-ax):Math.abs(by-ay);
    const ox = hz?0:off, oy = hz?off:0;
    line(ax+ox,ay+oy,bx+ox,by+oy,C.ink2,0.75);
    [[ax,ay],[bx,by]].forEach(([px,py])=>{ line(px+ox-(hz?0:0.35),py+oy-(hz?0.35:0),px+ox+(hz?0:0.35),py+oy+(hz?0.35:0),C.ink2,0.75); line(px+ox-0.3,py+oy+0.3,px+ox+0.3,py+oy-0.3,C.ink2,1.1); });
    if(hz) put({kind:'dim', prio:3, calls:[call(FT(len),(ax+bx)/2,ay+oy-0.75,{size:9,col:C.ink2,w:400,ls:0})], hz, at:Y(ay+oy), a:X(Math.min(ax,bx)), b:X(Math.max(ax,bx)), tk:0.35*s});
    else put({kind:'dim', prio:3, calls:[call(FT(len),ax+ox-0.75,(ay+by)/2,{size:9,col:C.ink2,w:400,ls:0,rot:-Math.PI/2})], hz, at:X(ax+ox), a:Y(Math.min(ay,by)), b:Y(Math.max(ay,by)), tk:0.35*s});
  }
  // 13 north arrow and scale bar
  // the north arrow points to true north: the plan is drawn in the house's own axes, turned on the lot by o.site.rotation
  if(o.na){ const [nx,ny]=o.na, r=(o.rot!=null ? o.rot : rotOf(o))*Math.PI/180, ux=Math.sin(r), uy=-Math.cos(r), at=(t,n)=>[X(nx+ux*t)+n*uy, Y(ny+uy*t)-n*ux];
    ctx.save(); ctx.strokeStyle=C.ink2; ctx.fillStyle=C.ink2; ctx.lineWidth=0.9; ctx.beginPath(); ctx.moveTo(...at(-2.2,0)); ctx.lineTo(...at(1.2,0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...at(2,0)); ctx.lineTo(...at(0.6,-4)); ctx.lineTo(...at(0.6,4)); ctx.closePath(); ctx.fill(); ctx.restore();
    put({kind:'mark', prio:3, calls:[call('N',nx-ux*3.2,ny-uy*3.2,{size:9,col:C.ink2})]}); }
  if(o.sb){ const [sx,sy]=o.sb; const segs=[0,4,8,16]; for(let i=0;i<segs.length-1;i++){ rect([sx+segs[i],sy,sx+segs[i+1],sy+0.5], i%2?C.paper:C.ink2, C.ink2, 0.75); } segs.forEach(v=>put({kind:'mark', prio:3, calls:[call(String(v),sx+v,sy+1.4,{size:8.5,col:C.ink2,w:400,ls:0})]})); put({kind:'mark', prio:3, calls:[call('feet',sx+segs[3]+1.2,sy+0.25,{size:8.5,col:C.ink2,w:400,align:'left',ls:0})]}); }

  function opening(g, hz, k, hinge, dir, interior){
    rect(g, interior?C.tint:C.paper);
    const [gx0,gy0,gx1,gy1] = g;
    if(hz){ line(gx0,gy0,gx0,gy1,C.ink,0.75); line(gx1,gy0,gx1,gy1,C.ink,0.75); }
    else { line(gx0,gy0,gx1,gy0,C.ink,0.75); line(gx0,gy1,gx1,gy1,C.ink,0.75); }
    if(k==='glass'||k==='win'||k==='hi'){
      const dash = k==='hi'?[3,2]:null;
      if(hz){ line(gx0,gy0,gx1,gy0,C.ink,0.6,dash); line(gx0,gy1,gx1,gy1,C.ink,0.6,dash); line(gx0,(gy0+gy1)/2,gx1,(gy0+gy1)/2,C.ink,1,dash); }
      else { line(gx0,gy0,gx0,gy1,C.ink,0.6,dash); line(gx1,gy0,gx1,gy1,C.ink,0.6,dash); line((gx0+gx1)/2,gy0,(gx0+gx1)/2,gy1,C.ink,1,dash); }
    } else if(k==='screen'){
      if(hz) line(gx0,(gy0+gy1)/2,gx1,(gy0+gy1)/2,C.ink2,1,[4,3]); else line((gx0+gx1)/2,gy0,(gx0+gx1)/2,gy1,C.ink2,1,[4,3]);
    } else if(k==='slide'){
      const t = hz?(gy1-gy0):(gx1-gx0);
      if(hz){ const m=(gx0+gx1)/2; rect([gx0,gy0+t*0.2,m+0.25,gy0+t*0.45],C.paper,C.ink,0.75); rect([m-0.25,gy0+t*0.55,gx1,gy0+t*0.8],C.paper,C.ink,0.75); }
      else { const m=(gy0+gy1)/2; rect([gx0+t*0.2,gy0,gx0+t*0.45,m+0.25],C.paper,C.ink,0.75); rect([gx0+t*0.55,m-0.25,gx0+t*0.8,gy1],C.paper,C.ink,0.75); }
    } else if(k==='pocket'){
      if(hz) line(gx0,(gy0+gy1)/2,gx1,(gy0+gy1)/2,C.ink,0.75,[2,2]); else line((gx0+gx1)/2,gy0,(gx0+gx1)/2,gy1,C.ink,0.75,[2,2]);
    } else if(k==='door'){
      const len = hz?(gx1-gx0):(gy1-gy0);
      if(hz){ const wy = dir>0?gy1:gy0, hx = hinge==='a'?gx0:gx1, ox = hinge==='a'?gx1:gx0;
        line(hx,wy,hx,wy+dir*len,C.ink,1);
        const a0 = Math.atan2(dir*len,0), a1 = Math.atan2(0,ox-hx);
        arc(hx,wy,len,a0,a1);
      } else { const wx = dir>0?gx1:gx0, hy = hinge==='a'?gy0:gy1, oy = hinge==='a'?gy1:gy0;
        line(wx,hy,wx+dir*len,hy,C.ink,1);
        const a0 = Math.atan2(0,dir*len), a1 = Math.atan2(oy-hy,0);
        arc(wx,hy,len,a0,a1);
      }
    }
  }
  function arc(cx,cy,r,a0,a1){ let d=a1-a0; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; ctx.save(); ctx.beginPath(); ctx.arc(X(cx),Y(cy),r*s,a0,a0+d,d<0); ctx.strokeStyle=C.ink2; ctx.lineWidth=0.6; ctx.stroke(); ctx.restore(); }
}

function fixture(ctx, f, X, Y, s){
  const [k,x,y,w,d,o] = f;
  const R = (a,b,c,e,fill,col,lw) => { ctx.beginPath(); ctx.rect(X(a),Y(b),c*s,e*s); if(fill){ctx.fillStyle=fill;ctx.fill();} ctx.strokeStyle=col||C.ink; ctx.lineWidth=lw||0.75; ctx.stroke(); };
  const Lx = (a,b,c,e,col,lw) => { ctx.beginPath(); ctx.moveTo(X(a),Y(b)); ctx.lineTo(X(c),Y(e)); ctx.strokeStyle=col||C.ink; ctx.lineWidth=lw||0.5; ctx.stroke(); };
  const E = (cx,cy,rx,ry) => { ctx.beginPath(); ctx.ellipse(X(cx),Y(cy),rx*s,ry*s,0,0,Math.PI*2); ctx.strokeStyle=C.ink; ctx.lineWidth=0.6; ctx.stroke(); };
  const cx = x+w/2, cy = y+d/2;
  ctx.save();
  switch(k){
    case 'counter': R(x,y,w,d,C.paper); break;
    case 'sink': R(x,y,w,d,C.paper); R(x+0.25,y+0.3,w-0.5,d-0.6,null,C.ink,0.6); break;
    case 'range': R(x,y,w,d,C.paper); [[-0.5,-0.45],[0.5,-0.45],[-0.5,0.45],[0.5,0.45]].forEach(([a,b])=>{ ctx.beginPath(); ctx.arc(X(cx+a*w/2.5),Y(cy+b*d/2.2),0.28*s,0,Math.PI*2); ctx.strokeStyle=C.ink; ctx.lineWidth=0.6; ctx.stroke(); }); break;
    case 'fridge': case 'tall': R(x,y,w,d,C.paper); Lx(x,y,x+w,y+d); Lx(x+w,y,x,y+d); break;
    case 'dw': R(x,y,w,d,C.paper); break;
    case 'wd': R(x,y,w,d,C.paper); E(cx,cy,Math.min(w,d)*0.32,Math.min(w,d)*0.32); break;
    case 'shower': R(x,y,w,d,C.paper); Lx(x,y,x+w,y+d); Lx(x+w,y,x,y+d); E(cx,cy,0.18,0.18); break;
    case 'tub': R(x,y,w,d,C.paper); ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(X(x+0.3),Y(y+0.3),(w-0.6)*s,(d-0.6)*s,4); else ctx.rect(X(x+0.3),Y(y+0.3),(w-0.6)*s,(d-0.6)*s); ctx.strokeStyle=C.ink; ctx.lineWidth=0.6; ctx.stroke(); break;
    case 'basin': R(x,y,w,d,C.paper); E(cx,cy,w*0.3,d*0.3); break;
    case 'wc': { // tank against wall o
      const tank = 0.6, bw = 1.25, bl = 1.9;
      if(o==='N'||o==='S'){ const ty = o==='N'?y:y+d-tank; R(cx-0.85,ty,1.7,tank,C.paper); E(cx, o==='N'?y+tank+bl/2-0.1:y+d-tank-bl/2+0.1, bw/2, bl/2); }
      else { const tx = o==='W'?x:x+w-tank; R(tx,cy-0.85,tank,1.7,C.paper); E(o==='W'?x+tank+bl/2-0.1:x+w-tank-bl/2+0.1, cy, bl/2, bw/2); }
      break; }
    case 'bed': { R(x,y,w,d,C.paper,C.ink,0.75);
      if(o==='N'||o==='S'){ const py = o==='N'?y+0.35:y+d-1.35; R(x+0.35,py,w/2-0.5,1,null,C.ink,0.5); R(cx+0.15,py,w/2-0.5,1,null,C.ink,0.5); Lx(x, o==='N'?y+d*0.45:y+d*0.55, x+w, o==='N'?y+d*0.45:y+d*0.55, C.ink2, 0.5); }
      else { const px = o==='W'?x+0.35:x+w-1.35; R(px,y+0.35,1,d/2-0.5,null,C.ink,0.5); R(px,cy+0.15,1,d/2-0.5,null,C.ink,0.5); Lx(o==='W'?x+w*0.45:x+w*0.55, y, o==='W'?x+w*0.45:x+w*0.55, y+d, C.ink2, 0.5); }
      break; }
    case 'sofa': { R(x,y,w,d,C.paper); const t=0.7;
      if(o==='N') R(x,y,w,t,null); else if(o==='S') R(x,y+d-t,w,t,null); else if(o==='W') R(x,y,t,d,null); else R(x+w-t,y,t,d,null); break; }
    case 'chair': R(x,y,w,d,C.paper); break;
    case 'table': { R(x,y,w,d,C.paper,C.ink,0.75); const n = Math.max(1,Math.floor((o==='v'?d:w)/2.2));
      for(let i=0;i<n;i++){ const t=(i+0.5)/n; if(o==='v'){ R(x-1.1,y+d*t-0.7,0.9,1.4,C.paper,C.ink2,0.5); R(x+w+0.2,y+d*t-0.7,0.9,1.4,C.paper,C.ink2,0.5); } else { R(x+w*t-0.7,y-1.1,1.4,0.9,C.paper,C.ink2,0.5); R(x+w*t-0.7,y+d+0.2,1.4,0.9,C.paper,C.ink2,0.5); } }
      break; }
    case 'hearth': R(x,y,w,d,C.paper,C.ink,0.6); ctx.save(); ctx.beginPath(); ctx.rect(X(x),Y(y),w*s,d*s); ctx.clip(); for(let t=-d; t<w+d; t+=0.4){ Lx(x+t,y,x+t-d,y+d,C.ink2,0.4); } ctx.restore(); break;
    case 'stove': R(x,y,w,d,C.ink,C.ink,0.75); break;
    case 'desk': case 'bench': case 'shelf': R(x,y,w,d,C.paper); if(k==='shelf'){ if(w>d) Lx(x,cy,x+w,cy); else Lx(cx,y,cx,y+d); } break;
    case 'wood': { R(x,y,w,d,C.paper,C.ink2,0.6); for(let i=0.4;i<w;i+=0.55) for(let j=0.4;j<d;j+=0.55){ ctx.beginPath(); ctx.arc(X(x+i),Y(y+j),0.18*s,0,Math.PI*2); ctx.strokeStyle=C.ink2; ctx.lineWidth=0.4; ctx.stroke(); } break; }
    case 'tank': ctx.beginPath(); ctx.arc(X(cx),Y(cy),w/2*s,0,Math.PI*2); ctx.fillStyle=C.paper; ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=0.75; ctx.stroke(); break;
    case 'chain': ctx.beginPath(); ctx.arc(X(x),Y(y),0.35*s,0,Math.PI*2); ctx.fillStyle=C.ink2; ctx.fill(); break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------- section
// items: ['ground',y0,y1,z] ['cut',pts] ['beyond',pts,close] ['glass',y,z0,z1] ['fill',pts]
//        ['sun',y,z,deg,len,label,dashed] ['label',text,y,z,opt]   (y runs north to south, left to right)
const box = (y0,z0,y1,z1) => [y0,z0, y1,z0, y1,z1, y0,z1];
// opt.z, opt.narrow and opt.full as for drawPlan
function drawSect(canvas, o, s, opt){
  opt = opt||{};
  const v = o.sect.view, W = (v.y1-v.y0)*s, H = (v.z1-v.z0)*s, lab = {sites:[], rays:[], walls:[]};
  paintSect(LAB.scratch(), o, s, lab);
  // a sun label written as a section label goes with the nearest ray of its solstice
  const gap = (p, r) => { const [x0,y0,x1,y1] = r, L = (x1-x0)**2+(y1-y0)**2 || 1, t = Math.max(0, Math.min(1, ((p[0]-x0)*(x1-x0)+(p[1]-y0)*(y1-y0))/L)); return Math.hypot(p[0]-x0-t*(x1-x0), p[1]-y0-t*(y1-y0)); };
  for(const st of lab.sites) if(st.kind==='sun' && !st.ray){ const p = [st.calls[0].x, st.calls[0].y], rs = lab.rays.filter(r => r.deg===st.deg);
    let best = null; for(const r of rs.length ? rs : lab.rays){ const g = gap(p, r.r); if(!best || g<best.g) best = {g, r:r.r}; } st.ray = best && best.r; }
  const out = LAB.place(lab.sites, {W:Math.round(W), H:Math.round(H), shown:LAB.shownOf(W, opt.z), narrow:!!opt.narrow, full:!!opt.full, plan:false, rays:lab.rays, walls:lab.walls});
  paintSect(canvas, o, s, {out});
}
// lab as for paintPlan
function paintSect(canvas, o, s, lab){
  const S = o.sect, v = S.view, W = (v.y1-v.y0)*s, H = (v.z1-v.z0)*s;
  const ctx = setup(canvas, W, H, lab.sites ? 1 : 0);
  const X = y => (y-v.y0)*s, Y = z => (v.z1-z)*s;
  const path = (pts, close) => { ctx.beginPath(); for(let i=0;i<pts.length;i+=2){ const px=X(pts[i]), py=Y(pts[i+1]); i?ctx.lineTo(px,py):ctx.moveTo(px,py); } if(close) ctx.closePath(); };
  // one fillText as the section draws it, at (y, z) in ft
  const call = (t,y,z,opt) => { opt=opt||{}; return {t:String(t), x:X(y), y:Y(z), size:opt.size||9, w:opt.w||400, ls:null, col:opt.col==='pencil'?C.pencil:(opt.col||C.ink2), align:opt.align||'center', rot:opt.rot||0, halo:null}; };
  let li = 0;
  const put = site => { const i = li++; if(lab.sites) lab.sites.push(site); else for(const c of lab.out[i]) LAB.draw(ctx, c); };
  const sun = sunProfile(rotOf(o));
  for(const it of sectItems(o)){
    const k = it[0];
    if(k==='fill'){ path(it[1],true); ctx.fillStyle=C.tint; ctx.fill(); }
    else if(k==='ground'){ const [,y0,y1,z]=it; ctx.save(); ctx.strokeStyle=C.ink; ctx.lineWidth=1.1; ctx.beginPath(); ctx.moveTo(X(y0),Y(z)); ctx.lineTo(X(y1),Y(z)); ctx.stroke(); ctx.strokeStyle=C.ink2; ctx.lineWidth=0.5; for(let y=y0; y<y1; y+=0.9){ ctx.beginPath(); ctx.moveTo(X(y),Y(z)); ctx.lineTo(X(y-0.6),Y(z-0.6)); ctx.stroke(); } ctx.restore(); }
    else if(k==='cut'){ path(it[1],true); ctx.fillStyle=C.ink; ctx.fill(); }
    else if(k==='beyond'){ ctx.save(); path(it[1],it[2]); ctx.strokeStyle=C.ink2; ctx.lineWidth=0.75; if(it[3]) ctx.setLineDash(it[3]); ctx.stroke(); ctx.restore(); }
    else if(k==='glass'){ const [,y,z0,z1]=it; if(lab.walls) lab.walls.push([X(y)-2, Y(z1), X(y)+2, Y(z0)]); ctx.save(); ctx.fillStyle=C.paper; ctx.fillRect(X(y)-2,Y(z1),4,(z1-z0)*s); ctx.strokeStyle=C.ink; ctx.lineWidth=0.75; [-1.5,1.5].forEach(d=>{ ctx.beginPath(); ctx.moveTo(X(y)+d,Y(z0)); ctx.lineTo(X(y)+d,Y(z1)); ctx.stroke(); }); ctx.restore(); }
    else if(k==='sun'){ const [,y,z,deg,len,label,dashed]=it, a=deg*Math.PI/180, ye=y-Math.cos(a)*len, ze=z-Math.sin(a)*len;
      ctx.save(); ctx.strokeStyle=C.pencil; ctx.fillStyle=C.pencil; ctx.lineWidth=1.1; if(dashed) ctx.setLineDash([5,3]);
      ctx.beginPath(); ctx.moveTo(X(y),Y(z)); ctx.lineTo(X(ye),Y(ze)); ctx.stroke(); ctx.setLineDash([]);
      const ang = Math.atan2(Y(ze)-Y(z), X(ye)-X(y)); ctx.beginPath(); ctx.moveTo(X(ye),Y(ze)); ctx.lineTo(X(ye)-7*Math.cos(ang-0.35),Y(ze)-7*Math.sin(ang-0.35)); ctx.lineTo(X(ye)-7*Math.cos(ang+0.35),Y(ze)-7*Math.sin(ang+0.35)); ctx.closePath(); ctx.fill();
      ctx.restore(); const ray = [X(y),Y(z),X(ye),Y(ze)]; if(lab.rays) lab.rays.push({deg, r:ray});
      if(label) put({kind:'sun', prio:5, calls:[call(label, y+0.6, z+0.9, {col:C.pencil, align:'left', size:9, w:500})], ray}); }
    else if(k==='label'){ const c = call(it[1], it[2], it[3], Object.assign({size:9}, it[4]||{}));
      put(it[4] && it[4].col==='pencil' ? {kind:'sun', prio:5, calls:[c], deg:/Jun/.test(it[1]) ? sun.jun : /Dec/.test(it[1]) ? sun.dec : null} : {kind:'note', prio:4, calls:[c]}); }
  }
  // the section's ends, plan north on the left and plan south on the right, named by their true compass points
  const ends = [compass(trueBearing(o, 0)), compass(trueBearing(o, 180))];
  put({kind:'mark', prio:3, calls:[call(ends[0], v.y0+1.2, v.z1-1.2, {size:9, w:500, align:'left'})]}); put({kind:'mark', prio:3, calls:[call(ends[1], v.y1-1.2, v.z1-1.2, {size:9, w:500, align:'right'})]});
}

// ---------------------------------------------------------------- axon
const AXC = {wallS:'#2E3833', wallW:'#212925', plinth:'#5A5F5A', slabS:'#A3A59F', slabW:'#8D8F89', stemS:'#7A7E78', stemW:'#686C66', roof:'#CBCEC9', fascia:'#3A433D', glass:'#8C9DA2', deck:'#BDB6A8', screen:'#A9B0AC', edge:'rgba(20,20,18,.75)'};
const PR = (x,y,z) => [0.7071*(x+y), 0.3536*(x-y)+0.866*z, 0.6124*(x-y)-0.5*z];
const M = {
  shed(b){ // box with a shed roof sloping in y; zn/zs are wall-top heights at the north and south faces
    const f=[], zAt = y => b.zn + (b.zs-b.zn)*(y-b.y0)/(b.y1-b.y0);
    if(!b.noS) f.push({L:1,k:'wallS',p:[[b.x0,b.y1,0],[b.x1,b.y1,0],[b.x1,b.y1,zAt(b.y1)],[b.x0,b.y1,zAt(b.y1)]],glass:(b.gS||[]).map(g=>[[g[0],b.y1,g[2]],[g[1],b.y1,g[2]],[g[1],b.y1,g[3]],[g[0],b.y1,g[3]]])});
    if(!b.noW) f.push({L:1,k:'wallW',p:[[b.x0,b.y0,0],[b.x0,b.y1,0],[b.x0,b.y1,zAt(b.y1)],[b.x0,b.y0,zAt(b.y0)]],glass:(b.gW||[]).map(g=>[[b.x0,g[0],g[2]],[b.x0,g[1],g[2]],[b.x0,g[1],g[3]],[b.x0,g[0],g[3]]])});
    if(!b.noRoof) f.push(...M.roof(b.x0-(b.oW||0), b.y0-(b.oN||0), b.x1+(b.oE||0), b.y1+(b.oS||0), zAt(b.y0-(b.oN||0)), zAt(b.y1+(b.oS||0))));
    return f;
  },
  shedX(b){ // box with a shed roof sloping in x; zw/ze are wall-top heights at the west and east faces
    const f=[], zAt = x => b.zw + (b.ze-b.zw)*(x-b.x0)/(b.x1-b.x0);
    if(!b.noS) f.push({L:1,k:'wallS',p:[[b.x0,b.y1,0],[b.x1,b.y1,0],[b.x1,b.y1,zAt(b.x1)],[b.x0,b.y1,zAt(b.x0)]],glass:(b.gS||[]).map(g=>[[g[0],b.y1,g[2]],[g[1],b.y1,g[2]],[g[1],b.y1,Math.min(g[3],zAt(g[1])-0.3)],[g[0],b.y1,Math.min(g[3],zAt(g[0])-0.3)]])});
    if(!b.noW) f.push({L:1,k:'wallW',p:[[b.x0,b.y0,0],[b.x0,b.y1,0],[b.x0,b.y1,b.zw],[b.x0,b.y0,b.zw]],glass:(b.gW||[]).map(g=>[[b.x0,g[0],g[2]],[b.x0,g[1],g[2]],[b.x0,g[1],g[3]],[b.x0,g[0],g[3]]])});
    if(!b.noRoof){ const x0=b.x0-(b.oW||0), x1=b.x1+(b.oE||0), y0=b.y0-(b.oN||0), y1=b.y1+(b.oS||0), t=0.8, zw=zAt(x0), ze=zAt(x1);
      f.push({L:2,k:'roof',p:[[x0,y0,zw],[x1,y0,ze],[x1,y1,ze],[x0,y1,zw]]});
      f.push({L:2,k:'fascia',p:[[x0,y1,zw-t],[x1,y1,ze-t],[x1,y1,ze],[x0,y1,zw]]});
      f.push({L:2,k:'fascia',p:[[x0,y0,zw-t],[x0,y1,zw-t],[x0,y1,zw],[x0,y0,zw]]}); }
    return f;
  },
  // the floor platform's south and west faces, 0.9 ft deep; each carries its box in `found`, and massOf (below) draws the
  // option's foundation in their place
  plinth(x0,y0,x1,y1){ const b=[x0,y0,x1,y1]; return [{L:1,k:'plinth',found:b,p:[[x0,y1,-0.9],[x1,y1,-0.9],[x1,y1,0],[x0,y1,0]]}, {L:1,k:'plinth',found:b,p:[[x0,y0,-0.9],[x0,y1,-0.9],[x0,y1,0],[x0,y0,0]]}]; },
  roof(x0,y0,x1,y1,zn,zs,noRake){ const t=0.8, f=[
      {L:2,k:'roof',p:[[x0,y0,zn],[x1,y0,zn],[x1,y1,zs],[x0,y1,zs]]},
      {L:2,k:'fascia',p:[[x0,y1,zs-t],[x1,y1,zs-t],[x1,y1,zs],[x0,y1,zs]]}];
    if(!noRake) f.push({L:2,k:'fascia',p:[[x0,y0,zn-t],[x0,y1,zs-t],[x0,y1,zs],[x0,y0,zn]]});
    return f; },
  wall(pts,k,glass){ return {L:1,k:k||'wallS',p:pts,glass:glass||[]}; },
  deck(x0,y0,x1,y1,screen,z){ z=z||0; return {L:0,k:screen?'screen':'deck',p:[[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]]}; },
  posts(pts,zOf,z0){ return pts.map(([x,y])=>({L:1,k:'post',line:[[x,y,z0||0],[x,y,zOf(x,y)]]})); },
  // any roof plane or face: pts [[x,y,z]...], k 'roof' | 'fascia' | 'wallS' | 'wallW' | 'deck' ...
  plane(pts,k,L){ return {L:L==null?2:L,k:k||'roof',p:pts}; },
  // gable box, ridge east-west at y = (y0+y1)/2 unless b.yr; ze = eave height, zr = ridge height; b.z0 = floor of the box (default 0)
  gable(b){ const f=[], z0=b.z0||0, yr=b.yr==null?(b.y0+b.y1)/2:b.yr, t=0.8;
    const zAt = y => y<=yr ? b.ze+(b.zr-b.ze)*(y-b.y0)/(yr-b.y0) : b.zr+(b.ze-b.zr)*(y-yr)/(b.y1-yr);
    if(!b.noS) f.push({L:1,k:'wallS',p:[[b.x0,b.y1,z0],[b.x1,b.y1,z0],[b.x1,b.y1,b.ze],[b.x0,b.y1,b.ze]],glass:(b.gS||[]).map(g=>[[g[0],b.y1,g[2]],[g[1],b.y1,g[2]],[g[1],b.y1,g[3]],[g[0],b.y1,g[3]]])});
    if(!b.noW) f.push({L:1,k:'wallW',p:[[b.x0,b.y0,z0],[b.x0,b.y1,z0],[b.x0,b.y1,b.ze],[b.x0,yr,b.zr],[b.x0,b.y0,b.ze]],glass:(b.gW||[]).map(g=>[[b.x0,g[0],g[2]],[b.x0,g[1],g[2]],[b.x0,g[1],Math.min(g[3],zAt(g[1])-0.3)],[b.x0,g[0],Math.min(g[3],zAt(g[0])-0.3)]])});
    if(!b.noRoof){ const x0=b.x0-(b.oW||0), x1=b.x1+(b.oE||0), y0=b.y0-(b.oN||0), y1=b.y1+(b.oS||0);
      const zn = b.ze-(b.zr-b.ze)*(b.oN||0)/(yr-b.y0), zs = b.ze-(b.zr-b.ze)*(b.oS||0)/(b.y1-yr);
      f.push({L:2,k:'roof',p:[[x0,y0,zn],[x1,y0,zn],[x1,yr,b.zr],[x0,yr,b.zr]]});
      f.push({L:2,k:'roof',p:[[x0,yr,b.zr],[x1,yr,b.zr],[x1,y1,zs],[x0,y1,zs]]});
      f.push({L:2,k:'fascia',p:[[x0,y1,zs-t],[x1,y1,zs-t],[x1,y1,zs],[x0,y1,zs]]});
      f.push({L:2,k:'fascia',p:[[x0,y0,zn-t],[x0,yr,b.zr-t],[x0,yr,b.zr],[x0,y0,zn]]});
      f.push({L:2,k:'fascia',p:[[x0,yr,b.zr-t],[x0,y1,zs-t],[x0,y1,zs],[x0,yr,b.zr]]}); }
    return f; },
  // gable box, ridge north-south at x = (x0+x1)/2 unless b.xr; the south wall is the gable end
  gableY(b){ const f=[], z0=b.z0||0, xr=b.xr==null?(b.x0+b.x1)/2:b.xr, t=0.8;
    const zAt = x => x<=xr ? b.ze+(b.zr-b.ze)*(x-b.x0)/(xr-b.x0) : b.zr+(b.ze-b.zr)*(x-xr)/(b.x1-xr);
    if(!b.noS) f.push({L:1,k:'wallS',p:[[b.x0,b.y1,z0],[b.x1,b.y1,z0],[b.x1,b.y1,b.ze],[xr,b.y1,b.zr],[b.x0,b.y1,b.ze]],glass:(b.gS||[]).map(g=>[[g[0],b.y1,g[2]],[g[1],b.y1,g[2]],[g[1],b.y1,Math.min(g[3],zAt(g[1])-0.3)],[g[0],b.y1,Math.min(g[3],zAt(g[0])-0.3)]])});
    if(!b.noW) f.push({L:1,k:'wallW',p:[[b.x0,b.y0,z0],[b.x0,b.y1,z0],[b.x0,b.y1,b.ze],[b.x0,b.y0,b.ze]],glass:(b.gW||[]).map(g=>[[b.x0,g[0],g[2]],[b.x0,g[1],g[2]],[b.x0,g[1],g[3]],[b.x0,g[0],g[3]]])});
    if(!b.noRoof){ const x0=b.x0-(b.oW||0), x1=b.x1+(b.oE||0), y0=b.y0-(b.oN||0), y1=b.y1+(b.oS||0);
      const zw = b.ze-(b.zr-b.ze)*(b.oW||0)/(xr-b.x0), ze = b.ze-(b.zr-b.ze)*(b.oE||0)/(b.x1-xr);
      f.push({L:2,k:'roof',p:[[x0,y0,zw],[xr,y0,b.zr],[xr,y1,b.zr],[x0,y1,zw]]});
      f.push({L:2,k:'roof',p:[[xr,y0,b.zr],[x1,y0,ze],[x1,y1,ze],[xr,y1,b.zr]]});
      f.push({L:2,k:'fascia',p:[[x0,y1,zw-t],[xr,y1,b.zr-t],[xr,y1,b.zr],[x0,y1,zw]]});
      f.push({L:2,k:'fascia',p:[[xr,y1,b.zr-t],[x1,y1,ze-t],[x1,y1,ze],[xr,y1,b.zr]]});
      f.push({L:2,k:'fascia',p:[[x0,y0,zw-t],[x0,y1,zw-t],[x0,y1,zw],[x0,y0,zw]]}); }
    return f; },
  // hipped or pyramid roof over the rectangle x0..x1, y0..y1 (overhangs included by the caller) from eave height ze to ridge zr;
  // the ridge runs along the longer side; a square gives a pyramid
  hip(x0,y0,x1,y1,ze,zr){ const w=x1-x0, d=y1-y0, t=0.8, f=[];
    if(w>=d){ const h=d/2, xa=x0+h, xb=x1-h, ym=(y0+y1)/2;
      f.push({L:2,k:'roof',p:[[x0,y0,ze],[x1,y0,ze],[xb,ym,zr],[xa,ym,zr]]}, {L:2,k:'roof',p:[[xa,ym,zr],[xb,ym,zr],[x1,y1,ze],[x0,y1,ze]]},
        {L:2,k:'roof',p:[[x0,y0,ze],[xa,ym,zr],[x0,y1,ze]]}, {L:2,k:'roof',p:[[x1,y0,ze],[x1,y1,ze],[xb,ym,zr]]}); }
    else { const h=w/2, ya=y0+h, yb=y1-h, xm=(x0+x1)/2;
      f.push({L:2,k:'roof',p:[[x0,y0,ze],[xm,ya,zr],[xm,yb,zr],[x0,y1,ze]]}, {L:2,k:'roof',p:[[xm,ya,zr],[x1,y0,ze],[x1,y1,ze],[xm,yb,zr]]},
        {L:2,k:'roof',p:[[x0,y0,ze],[x1,y0,ze],[xm,ya,zr]]}, {L:2,k:'roof',p:[[x0,y1,ze],[xm,yb,zr],[x1,y1,ze]]}); }
    f.push({L:2,k:'fascia',p:[[x0,y1,ze-t],[x1,y1,ze-t],[x1,y1,ze],[x0,y1,ze]]}, {L:2,k:'fascia',p:[[x0,y0,ze-t],[x0,y1,ze-t],[x0,y1,ze],[x0,y0,ze]]});
    return f; },
  // move faces to another draw layer: layers draw in ascending order, far to near within a layer
  layer(faces,L){ return faces.map(f=>Object.assign({},f,{L})); }
};
// a noon sun ray that passes through the edge point (yp,zp), stops where it reaches z = zEnd, and starts `back` ft before the edge
function sunRay(yp, zp, deg, zEnd, back, label, dashed){
  const a = deg*Math.PI/180, t = (zp-zEnd)/Math.sin(a), b = back==null?6:back;
  return ['sun', yp+Math.cos(a)*b, zp+Math.sin(a)*b, deg, b+t, label||null, !!dashed];
}
function axonBounds(o){ let a=[1e9,-1e9,1e9,-1e9]; for(const f of massOf(o)){ for(const q of (f.p||f.line)){ const [sx,su]=PR(...q); a[0]=Math.min(a[0],sx); a[1]=Math.max(a[1],sx); a[2]=Math.min(a[2],su); a[3]=Math.max(a[3],su); } } return a; }
function drawAxon(canvas, o, k){
  const edge = parseInt((C.paper||'#ffffff').slice(1,3),16) < 128 ? 'rgba(236,232,221,.45)' : AXC.edge;
  const b = axonBounds(o), pad = 8, W = (b[1]-b[0])*k+pad*2, H = (b[3]-b[2])*k+pad*2;
  const ctx = setup(canvas, W, H);
  const P2 = q => { const [sx,su] = PR(...q); return [(sx-b[0])*k+pad, (b[3]-su)*k+pad]; };
  const depth = f => { const pts=f.p||f.line; return pts.reduce((a,q)=>a+PR(...q)[2],0)/pts.length; };
  const poly = (pts, fill) => { ctx.beginPath(); pts.forEach((q,i)=>{ const [x,y]=P2(q); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); ctx.strokeStyle=edge; ctx.lineWidth=0.6; ctx.stroke(); };
  const mass = massOf(o);
  for(const L of [...new Set(mass.map(f=>f.L))].sort((a,c)=>a-c)){
    const fs = mass.filter(f=>f.L===L).sort((a,c)=>depth(c)-depth(a));
    for(const f of fs){
      if(f.line){ const [a,c]=f.line.map(P2); ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(c[0],c[1]); ctx.strokeStyle = f.k==='pier'?AXC.plinth:AXC.fascia; ctx.lineWidth = f.k==='pier'?1.4:1.2; ctx.stroke(); continue; }
      poly(f.p, AXC[f.k]||AXC.wallS);
      for(const g of f.glass||[]) poly(g, AXC.glass);
    }
  }
}

// ---------------------------------------------------------------- the brief, the site and the house's place on it
const BR = () => (typeof BRIEF !== 'undefined' && BRIEF) || {};
const CO = () => (typeof COSTS !== 'undefined' && COSTS) || {rates:{}, markup:{}, location:{states:{}, default:{name:'national average', factor:1}}};
const rotOf = o => +((o && o.site && o.site.rotation) || 0);
const norm360 = a => ((a % 360) + 360) % 360;
const angDiff = (a, b) => { const d = Math.abs(norm360(a) - norm360(b)); return d > 180 ? 360 - d : d; };
// the true compass bearing (0 north, 90 east) of a direction given as a bearing in the house's own plan (0 plan north, 90 plan east)
const trueBearing = (o, b) => norm360(b - rotOf(o));
const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const COMPASS_W = ['north','north-north-east','north-east','east-north-east','east','east-south-east','south-east','south-south-east',
  'south','south-south-west','south-west','west-south-west','west','west-north-west','north-west','north-north-west'];
const compass = b => COMPASS[Math.round(norm360(b)/22.5) % 16];
const compassWord = b => COMPASS_W[Math.round(norm360(b)/22.5) % 16];
const bearingTxt = b => Math.round(norm360(b))+'° ('+compass(b)+')';
// a plan point (x to plan east, y to plan south) on the lot (x east, y north, true): turned rotation degrees counter-clockwise, origin at site.at
function toLot(o, x, y){ const r = rotOf(o)*Math.PI/180, c = Math.cos(r), s = Math.sin(r), at = (o.site && o.site.at) || [0,0]; return [at[0] + x*c + y*s, at[1] + x*s - y*c]; }
// every level of an option, the ground floor first; an upper floor is drawn on the ground floor's view unless it has its own
const levelsOf = o => [Object.assign({label: o.levels && o.levels.length ? 'Ground floor' : 'Plan'}, o)]
  .concat((o.levels||[]).map((l,i,a) => Object.assign({view:o.view, rot:rotOf(o), label: a.length>1 ? 'Floor '+(i+2) : 'Upper floor'}, l)));

// ---------------------------------------------------------------- sun
const latOf = () => +((BR().site||{}).lat);
const altDec = lat => 90 - lat - 23.44, altJun = lat => Math.min(90, 90 - lat + 23.44);
// The noon sun at the solstices as the section sees it. The section is cut along the plan's north-south axis, plan north
// on the left; the sun stands at true south (northern hemisphere), so on a turned house it is not in the section plane.
// The ray is its profile angle: the altitude projected into the section plane, tan p = tan(altitude) / cos(rotation),
// measured from the plan-south horizontal, so over 90 when the sun comes from the plan-north side. Whole degrees, as the
// section rays and their labels use them; the labels show the angle above the horizon.
function sunProfile(rot, lat){
  lat = lat==null ? latOf() : lat; const c = Math.cos((rot||0)*Math.PI/180);
  const p = alt => Math.round(Math.atan2(Math.tan(alt*Math.PI/180), c)*180/Math.PI), shown = d => d > 90 ? 180-d : d;
  const dec = p(altDec(lat)), jun = p(altJun(lat));
  return {dec, jun, altDec: Math.round(altDec(lat)), altJun: Math.round(altJun(lat)), decLabel: '21 Dec, '+shown(dec)+'°', junLabel: '21 Jun, '+shown(jun)+'°'};
}

// ---------------------------------------------------------------- foundations
// The option's `foundation` sets the ground: a slab floor stands 8 in above grade, a crawlspace or pier floor 30 in.
const GRADE = {slab:-0.67, crawl:-2.5, piers:-2.5};
const foundOf = o => (o && GRADE[o.foundation] != null) ? o.foundation : (GRADE[(BR().program||{}).foundation] != null ? BR().program.foundation : 'piers');
const gradeOf = o => GRADE[foundOf(o)];
// the section's items as drawn: ['found', y0, y1, kind] becomes the floor and foundation between the exterior faces y0
// and y1 (kind 'porch' for a porch or deck at floor level), and ['ground', y0, y1] without a z sits at grade
function sectItems(o){
  const g = gradeOf(o), f = foundOf(o), out = [];
  for(const it of (o.sect && o.sect.items) || []){
    if(it[0]==='ground' && it[3]==null){ out.push(['ground', it[1], it[2], g]); continue; }
    if(it[0]!=='found'){ out.push(it); continue; }
    const [, y0, y1, kind] = it, porch = kind==='porch';
    if(f==='slab'){
      // a 4 in slab on grade with thickened edges a foot wide, down 16 in below grade
      out.push(['cut', box(y0, -0.33, y1, 0)]);
      for(const [a, b] of [[y0, y0+1], [y1-1, y1]]) out.push(['cut', [a,-0.33, b,-0.33, b-(a===y0?0.25:0),g-1.33, a+(a===y0?0:0.25),g-1.33]]);
      continue;
    }
    const top = porch ? -0.6 : -0.9;
    out.push(['cut', box(y0, top, y1, 0)]);   // framed floor
    if(f==='crawl' && !porch){
      // 8 in stem walls on footings, a vapour barrier on the crawlspace floor, piers under the middle
      out.push(['cut', box(y0, g-0.67, y0+0.667, top)], ['cut', box(y1-0.667, g-0.67, y1, top)]);
      out.push(['cut', box(y0-0.33, g-1.5, y0+1, g-0.67)], ['cut', box(y1-1, g-1.5, y1+0.33, g-0.67)]);
      out.push(['beyond', [y0+0.667, g+0.05, y1-0.667, g+0.05], false, [4,3]]);
      for(let y = y0+8; y < y1-4; y += 8) out.push(['beyond', box(y-0.33, g, y+0.33, top), true]);
      continue;
    }
    // piers (and a porch's piers under any framed floor): one about every 8 ft, on footing pads below grade
    const n = Math.max(1, Math.ceil((y1-y0-0.8)/8));
    for(let i=0;i<=n;i++){ const y = y0+0.4+(y1-y0-0.8)*i/n; out.push(['beyond', [y, top, y, g]], ['beyond', box(y-0.6, g-1, y+0.6, g-0.6), true, [2,2]]); }
  }
  return out;
}
// the axon's faces as drawn: each M.plinth marker becomes the option's foundation, seen from the south-west
function massOf(o){
  const f = foundOf(o), g = gradeOf(o), out = [];
  const done = new Set();
  for(const m of o.mass||[]){
    if(!m.found){ out.push(m); continue; }
    const id = m.found.join(); if(done.has(id)) continue; done.add(id);
    const [x0,y0,x1,y1] = m.found, S = (z0,z1,k) => ({L:1,k,p:[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]]}), Wf = (z0,z1,k) => ({L:1,k,p:[[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]]});
    if(f==='slab'){ out.push(S(g,0,'slabS'), Wf(g,0,'slabW')); continue; }
    if(f==='crawl'){ out.push(S(g,-0.9,'stemS'), Wf(g,-0.9,'stemW'), S(-0.9,0,'plinth'), Wf(-0.9,0,'plinth')); continue; }
    out.push(S(-0.9,0,'plinth'), Wf(-0.9,0,'plinth'));
    for(let x=x0+0.8; x<=x1-0.4; x+=8) out.push({L:1,k:'pier',line:[[x,y1-0.8,g],[x,y1-0.8,-0.9]]});
    for(let y=y0+0.8; y<=y1-0.4; y+=8) out.push({L:1,k:'pier',line:[[x0+0.8,y,g],[x0+0.8,y,-0.9]]});
  }
  return out;
}

// ---------------------------------------------------------------- the lot and the setback line
const polyArea = P => { let a = 0; for(let i=0;i<P.length;i++){ const [x0,y0] = P[i], [x1,y1] = P[(i+1)%P.length]; a += x0*y1 - x1*y0; } return a/2; };
// the polygon with each edge i moved inward by d[i] (straight edges, consecutive offset lines intersected)
function insetPoly(P, d){
  const n = P.length, ccw = polyArea(P) > 0, L = [];
  for(let i=0;i<n;i++){ const [x0,y0] = P[i], [x1,y1] = P[(i+1)%n], len = Math.hypot(x1-x0, y1-y0) || 1, ux = (x1-x0)/len, uy = (y1-y0)/len;
    const nx = ccw ? -uy : uy, ny = ccw ? ux : -ux, s = +((d||[])[i] || 0); L.push([x0+nx*s, y0+ny*s, ux, uy]); }
  return L.map((b, i) => { const a = L[(i-1+n)%n], den = a[2]*b[3]-a[3]*b[2];
    if(Math.abs(den) < 1e-9) return [b[0], b[1]];
    const t = ((b[0]-a[0])*b[3]-(b[1]-a[1])*b[2])/den; return [a[0]+a[2]*t, a[1]+a[3]*t]; });
}
const inPoly = (x, y, P) => { let c = false; for(let i=0, j=P.length-1; i<P.length; j=i++){ const [xi,yi] = P[i], [xj,yj] = P[j]; if((yi>y)!==(yj>y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) c = !c; } return c; };
const segCross = (p, q, r, s) => { const d = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const d1 = d(r,s,p), d2 = d(r,s,q), d3 = d(p,q,r), d4 = d(p,q,s); return ((d1>1e-9&&d2<-1e-9)||(d1<-1e-9&&d2>1e-9)) && ((d3>1e-9&&d4<-1e-9)||(d3<-1e-9&&d4>1e-9)); };
// the distance from a point to a polygon's nearest edge, and that edge's index
function edgeDist(x, y, P){ let best = {d:1e9, i:-1};
  P.forEach((a, i) => { const b = P[(i+1)%P.length], L2 = (b[0]-a[0])**2+(b[1]-a[1])**2 || 1, t = Math.max(0, Math.min(1, ((x-a[0])*(b[0]-a[0])+(y-a[1])*(b[1]-a[1]))/L2));
    const d = Math.hypot(x-a[0]-t*(b[0]-a[0]), y-a[1]-t*(b[1]-a[1])); if(d < best.d) best = {d, i}; });
  return best; }
// the lot inset by its setbacks: where every wall, porch and deck must stand
const buildable = () => { const S = BR().site || {}; return (S.lot && S.lot.length >= 3) ? insetPoly(S.lot, S.setbacks || []) : null; };
// the outline on the lot of everything the house puts on the ground or over it: kind 'vol' (ground-floor rooms), 'upper'
// (an upper floor's rooms), 'floor' (porches, decks, screened rooms), 'stair' (steps to grade), 'roof' (roof edges);
// pts are lot points
function footprints(o){
  const out = [], quad = r => [toLot(o,r[0],r[1]), toLot(o,r[2],r[1]), toLot(o,r[2],r[3]), toLot(o,r[0],r[3])];
  levelsOf(o).forEach((l, li) => {
    for(const r of l.vols||[]) out.push({kind: li ? 'upper' : 'vol', level: li, r, pts: quad(r)});
    for(const f of l.floors||[]) if(!['void','bare','court','yard'].includes(f.k)) out.push({kind:'floor', k:f.k, level: li, r:f.r, pts: quad(f.r)});
    if(!li) for(const st of l.stairs||[]) out.push({kind:'stair', level: li, r:st.r, pts: quad(st.r)});
    for(const p of l.roofs||[]){ const pts = []; for(let i=0;i<p.length;i+=2) pts.push(toLot(o, p[i], p[i+1])); out.push({kind:'roof', level: li, pts}); }
  });
  return out;
}
// how a footprint sits against a polygon: inside, or the point furthest outside and by how much
function outside(pts, P){
  let worst = null;
  for(const [x,y] of pts) if(!inPoly(x, y, P)){ const e = edgeDist(x, y, P); if(!worst || e.d > worst.d) worst = {x, y, d:e.d, edge:e.i}; }
  if(!worst) for(let i=0;i<pts.length;i++) for(let j=0;j<P.length;j++) if(segCross(pts[i], pts[(i+1)%pts.length], P[j], P[(j+1)%P.length])) return {x:pts[i][0], y:pts[i][1], d:0, edge:j, crosses:true};
  return worst;
}

// ---------------------------------------------------------------- rough cost: category rates x measured quantities x a location factor
// costs.json holds national-average rates; the brief's region picks the location factor. A planning figure, never a quote.
function locationOf(){
  const reg = String((BR().site||{}).region || '').trim(), L = CO().location || {}, S = L.states || {}, d = L.default || {name:'national average', factor:1};
  if(!reg) return Object.assign({code:null}, d);
  const up = reg.toUpperCase();
  if(S[up]) return Object.assign({code:up}, S[up]);
  for(const [code, s] of Object.entries(S)) if(new RegExp('\\b'+s.name+'\\b', 'i').test(reg)) return Object.assign({code}, s);
  const m = up.match(/\b([A-Z]{2})\b/); if(m && S[m[1]]) return Object.assign({code:m[1]}, S[m[1]]);
  return Object.assign({code:null}, d);
}
function costOf(o){
  const C0 = CO(), R = C0.rates || {}, M = C0.markup || {}, q = o.q || {}, f = foundOf(o), lines = [];
  const add = (key, r, qty) => { if(!r) return; lines.push({key, label:r.label, qty:qty, unit:r.unit, rate:r.rate, amount:qty*r.rate, src:r.src}); };
  add('foundation', (R.foundation||{})[f], q.footprint||0);
  add('floorFraming', R.floorFraming, Math.max(0, (q.floorArea||0) - (f==='slab' ? (q.footprint||0) : 0)));
  add('walls', R.walls, q.wallArea||0);
  add('roof', R.roof, q.roofPlan||0);
  add('glass', R.glass, q.glass||0);
  add('mep', R.mep, q.cond||0);
  add('bath', R.bath, q.baths||0);
  add('plumbingBase', R.plumbingBase, 1);
  add('finishes', R.finishes, q.cond||0);
  add('kitchen', R.kitchen, 1);
  add('stair', R.stair, q.stairs||0);
  add('porch', R.porch, q.porch||0);
  add('site', R.site, 1);
  const sub = lines.reduce((s, l) => s + l.amount, 0), loc = locationOf(), local = sub*loc.factor;
  const ov = (M.overhead||{}).rate || 0, ct = (M.contingency||{}).rate || 0, overhead = local*ov, contingency = (local+overhead)*ct, total = local+overhead+contingency;
  const budget = +((BR().budget||{}).total) || null;
  return {lines, sub, location:loc, local, overhead, contingency, total, perSf: q.cond ? total/q.cond : null, budget, gap: budget ? total-budget : null,
    rates:{overhead:ov, contingency:ct}, unpriced: o.unpriced || null};
}
const roughCost = o => costOf(o).total;

// ---------------------------------------------------------------- site plan
// North up: the lot, the setback line (dashed), the house turned and placed (ground-floor rooms solid, porches and decks
// in outline, an upper floor's overhang dashed, roof edges dotted), the arrival arrow at its edge, the views as short rays,
// the north arrow and a scale bar. s is px per ft; the same lot on every sheet, so one scale.
const SITE_PAD = 18, SITE_R = 30, SITE_B = 20;   // px: around the lot, the north arrow's strip at the right, the scale bar's at the bottom
function siteBox(){ const P = (BR().site||{}).lot || [[0,0],[1,0],[1,1]]; const b = [1e9,1e9,-1e9,-1e9]; for(const [x,y] of P){ b[0]=Math.min(b[0],x); b[1]=Math.min(b[1],y); b[2]=Math.max(b[2],x); b[3]=Math.max(b[3],y); } return b; }
const siteSize = s => { const b = siteBox(); return [(b[2]-b[0])*s + 2*SITE_PAD + SITE_R, (b[3]-b[1])*s + 2*SITE_PAD + SITE_B]; };
function drawSite(canvas, o, s){
  const S = BR().site || {}, P = S.lot || [], b = siteBox(), [W, H] = siteSize(s), ctx = setup(canvas, W, H);
  const X = x => SITE_PAD + (x-b[0])*s, Y = y => SITE_PAD + (b[3]-y)*s;
  const path = (pts, close) => { ctx.beginPath(); pts.forEach(([x,y], i) => i ? ctx.lineTo(X(x),Y(y)) : ctx.moveTo(X(x),Y(y))); if(close) ctx.closePath(); };
  const stroke = (col, lw, dash) => { ctx.save(); if(dash) ctx.setLineDash(dash); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); };
  if(P.length < 3) return;
  path(P, true); ctx.fillStyle = C.tint; ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1; stroke(C.ink, 1.2);
  const B = buildable(); if(B){ path(B, true); ctx.fillStyle = C.paper; ctx.fill(); stroke(C.ink2, 0.8, [5,3]); }
  const fp = footprints(o);
  for(const f of fp.filter(f => f.kind==='roof')){ path(f.pts, true); stroke(C.ink2, 0.6, [2,2]); }
  for(const f of fp.filter(f => f.kind==='floor' || f.kind==='stair')){ path(f.pts, true); ctx.fillStyle = C.paper; ctx.fill(); stroke(C.ink2, 0.8); }
  for(const f of fp.filter(f => f.kind==='vol')){ path(f.pts, true); ctx.fillStyle = C.ink; ctx.fill(); }
  for(const f of fp.filter(f => f.kind==='upper')){ path(f.pts, true); stroke(C.ink, 0.9, [4,2]); }
  // the views (only those the person gave), as short rays from the house's middle
  const g = fp.filter(f => f.kind==='vol').flatMap(f => f.pts); const cx = g.reduce((a,p) => a+p[0], 0)/(g.length||1), cy = g.reduce((a,p) => a+p[1], 0)/(g.length||1);
  if((S.known||[]).includes('views')) for(const v of S.views||[]){ const a = v.dir*Math.PI/180, L = 46/s, x1 = cx+Math.sin(a)*L, y1 = cy+Math.cos(a)*L;
    ctx.beginPath(); ctx.moveTo(X(cx+Math.sin(a)*14/s), Y(cy+Math.cos(a)*14/s)); ctx.lineTo(X(x1), Y(y1)); stroke(C.pencil, 1, [3,2]);
    arrowHead(ctx, X(x1), Y(y1), Math.atan2(Y(y1)-Y(cy), X(x1)-X(cx)), C.pencil, 5); }
  // the arrival: a block arrow from outside the lot across its edge
  const A = S.arrival; if(A && P[A.edge]){ const p0 = P[A.edge], p1 = P[(A.edge+1)%P.length], t = A.at==null ? 0.5 : A.at, px = p0[0]+(p1[0]-p0[0])*t, py = p0[1]+(p1[1]-p0[1])*t;
    const len = Math.hypot(p1[0]-p0[0], p1[1]-p0[1]) || 1, ccw = polyArea(P) > 0, ux = (p1[0]-p0[0])/len, uy = (p1[1]-p0[1])/len, nx = ccw ? -uy : uy, ny = ccw ? ux : -ux;
    const sx = X(px), sy = Y(py), dx = nx, dy = -ny;   // inward, on the canvas
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(sx-dx*16, sy-dy*16); ctx.lineTo(sx+dx*4, sy+dy*4); ctx.stroke(); ctx.restore();
    arrowHead(ctx, sx+dx*10, sy+dy*10, Math.atan2(dy, dx), C.ink, 7); }
  // north arrow in the right strip, and a scale bar under the lot
  const nx0 = W - SITE_R/2, ny0 = SITE_PAD + 22;
  ctx.save(); ctx.strokeStyle = C.ink2; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(nx0, ny0+12); ctx.lineTo(nx0, ny0-6); ctx.stroke(); ctx.restore();
  arrowHead(ctx, nx0, ny0-12, -Math.PI/2, C.ink2, 7);
  LAB.draw(ctx, {t:'N', x:nx0, y:ny0-20, size:9, w:500, ls:null, col:C.ink2, align:'center', rot:0, halo:null});
  const step = [10,20,25,50,100,200].find(v => v*s >= 36) || 200, sy = H - SITE_B/2 - 2;
  ctx.fillStyle = C.ink2; ctx.fillRect(SITE_PAD, sy-1.5, step*s/2, 3); ctx.strokeStyle = C.ink2; ctx.lineWidth = 0.75; ctx.strokeRect(SITE_PAD+0.5, sy-1.5, step*s-0.5, 3);
  LAB.draw(ctx, {t:step+' ft', x:SITE_PAD+step*s+5, y:sy, size:8.5, w:400, ls:null, col:C.ink2, align:'left', rot:0, halo:null});
}
function arrowHead(ctx, x, y, ang, col, len){ ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x+Math.cos(ang)*len*0.6, y+Math.sin(ang)*len*0.6);
  ctx.lineTo(x-Math.cos(ang-0.5)*len*0.6, y-Math.sin(ang-0.5)*len*0.6); ctx.lineTo(x-Math.cos(ang+0.5)*len*0.6, y-Math.sin(ang+0.5)*len*0.6); ctx.closePath(); ctx.fill(); ctx.restore(); }

// ---------------------------------------------------------------- wishes, measured from the plan data (DATA.md lists the predicates)
// Every room on every floor: its name, floor, the box it covers (the option's `zones` entry of that name on that floor,
// else the clear rectangle around its label as far as the nearest wall, partition, wardrobe or door), its area (the
// area written on the plan, else the box's) and whether it is outdoors.
const nameOf = t => String(t).replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
function roomsOf(o){
  const out = [];
  levelsOf(o).forEach((l, li) => {
    for(const rm of l.rooms||[]){
      const [name, x, y, area, halo] = rm, nm = nameOf(name), z = (l.zones||[]).find(z => nameOf(z[0]).toLowerCase() === nm.toLowerCase());
      const box = z ? z.slice(1, 5) : LAB.roomBox(l, x, y), inside = (l.vols||[]).some(v => x>v[0] && x<v[2] && y>v[1] && y<v[3]);
      out.push({name:nm, level:li, x, y, box, area: area || Math.round((box[2]-box[0])*(box[3]-box[1])), stated:!!area, zone:!!z, outdoor: halo==='paper' || !inside});
    }
  });
  return out;
}
const BEDROOM = /\b(bed\s?rooms?|br\d*|bunk\s?rooms?|bunks?|primary|master|guest room|nursery)\b/i;
// rooms whose name holds every word of `want` at a word's start ("bed" finds "Bedroom"); 'bedroom' or 'bedrooms' finds every
// sleeping room
function findRooms(o, want, all){
  const rs = (all || roomsOf(o)), w = String(want||'').toLowerCase().trim();
  // an exact name wins: "Bedroom" is the kids' rooms, not also "Primary bedroom"
  const exact = rs.filter(r => r.name.toLowerCase().replace(/\s*\|\s*/g, ' ').trim() === w);
  if(exact.length) return exact;
  // 'bedrooms' (or 'bedroom' with no room of that exact name) finds every sleeping room
  if(/^bedrooms?$/.test(w)) return rs.filter(r => !r.outdoor && BEDROOM.test(r.name));
  const ws = w.split(/[\s,|]+/).filter(Boolean);
  return rs.filter(r => ws.length && ws.every(t => new RegExp('\\b'+t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(r.name.toLowerCase())));
}
const GLAZED = new Set(['glass','win','hi','slide']);
// the glazed openings in a room's exterior walls: each with its width in ft and the true bearing it faces
function roomGlass(o, r){
  const l = levelsOf(o)[r.level], b = r.box, out = [];
  for(const op of l.open||[]){
    const v = (l.vols||[])[op.v]; if(!v || !GLAZED.has(op.k)) continue;
    const hz = op.w==='N' || op.w==='S', face = {N:v[1]+EXT, S:v[3]-EXT, W:v[0]+EXT, E:v[2]-EXT}[op.w], edge = {N:b[1], S:b[3], W:b[0], E:b[2]}[op.w];
    if(Math.abs(face-edge) > 1.0) continue;
    const w = Math.min(op.b, hz ? b[2] : b[3]) - Math.max(op.a, hz ? b[0] : b[1]); if(w <= 0.05) continue;
    const pb = {N:0, E:90, S:180, W:270}[op.w]; out.push({w, plan:pb, dir:trueBearing(o, pb), k:op.k});
  }
  return out;
}
// two rooms share a wall: on one floor, their boxes overlap (one open room) or face each other across at most 1.5 ft (a
// partition, or two exterior walls) for at least 2 ft
function shareWall(a, b){
  if(a.level !== b.level) return false;
  const A = a.box, B = b.box, ox = Math.min(A[2],B[2])-Math.max(A[0],B[0]), oy = Math.min(A[3],B[3])-Math.max(A[1],B[1]);
  if(ox > 0.05 && oy > 0.05) return true;
  const gx = Math.max(B[0]-A[2], A[0]-B[2]), gy = Math.max(B[1]-A[3], A[1]-B[3]);
  return (gx >= -0.05 && gx <= 1.5 && oy >= 2) || (gy >= -0.05 && gy <= 1.5 && ox >= 2);
}
const ft = v => (Math.round(v*10)/10)+' ft';
const lc = s => /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;   // 'Kitchen' -> 'kitchen', 'BR2' stays
// each predicate: (option, check, rooms) -> {pass: true | false | null (cannot be measured), says: what was measured}
const WISH = {
  glassFacing(o, c, R){
    const rs = findRooms(o, c.room, R); if(!rs.length) return {pass:false, says:'no room named "'+c.room+'"'};
    const within = c.within==null ? 45 : c.within, min = c.minFt || 0;
    let best = null;
    for(const r of rs){ const g = roomGlass(o, r), ok = g.filter(e => angDiff(e.dir, c.dir) <= within), w = ok.reduce((s,e) => s+e.w, 0);
      const main = (ok.length ? ok : g).slice().sort((a,b) => b.w-a.w)[0];
      if(!best || w > best.w) best = {r, w, main, any: g.length}; }
    const nm = lc(best.r.name);
    if(!best.main) return {pass:false, says:nm+' has no glass in an outside wall'};
    if(!best.w) return {pass:false, says:nm+' glass faces '+bearingTxt(best.main.dir)+', none within '+within+'° of '+bearingTxt(c.dir)};
    return {pass: best.w >= min, says:nm+' glass faces '+bearingTxt(best.main.dir)+', '+ft(best.w)+(min ? ' (wants '+ft(min)+')' : '')};
  },
  roomMinSf(o, c, R){
    const rs = findRooms(o, c.room, R).filter(r => !r.outdoor); if(!rs.length) return {pass:false, says:'no room named "'+c.room+'"'};
    const ok = rs.filter(r => r.area >= c.sf), pass = c.all ? ok.length === rs.length : ok.length > 0;
    return {pass, says: rs.map(r => lc(r.name)+' '+num(r.area)+' sf'+(r.stated ? '' : ' (measured)')).join(', ')+' (wants '+num(c.sf)+' sf)'};
  },
  roomOnFloor(o, c, R){
    const want = c.floor==='upper' ? 1 : c.floor==='ground' || c.floor==null ? 0 : +c.floor, rs = findRooms(o, c.room, R);
    if(!rs.length) return {pass:false, says:'no room named "'+c.room+'"'};
    const fl = i => i ? (i===1 ? 'upper floor' : 'floor '+(i+1)) : 'ground floor';
    return {pass: (c.all ? rs.every(r => r.level===want) : rs.some(r => r.level===want)), says: rs.map(r => lc(r.name)+' on the '+fl(r.level)).join(', ')};
  },
  adjacent(o, c, R){
    const a = findRooms(o, c.a, R), b = findRooms(o, c.b, R); if(!a.length || !b.length) return {pass:false, says:'no room named "'+(a.length ? c.b : c.a)+'"'};
    const hit = a.flatMap(x => b.filter(y => x!==y && shareWall(x, y)).map(y => [x, y]))[0];
    return {pass: !!hit, says: hit ? lc(hit[0].name)+' shares a wall with '+lc(hit[1].name) : lc(a[0].name)+' shares no wall with '+lc(b[0].name)};
  },
  notAdjacent(o, c, R){ const r = WISH.adjacent(o, c, R); if(/^no room/.test(r.says)) return r; return {pass: !r.pass, says: r.says}; },
  separatedBy(o, c, R){
    const a = findRooms(o, c.a, R), b = findRooms(o, c.b, R), min = c.min==null ? 1 : c.min; if(!a.length || !b.length) return {pass:false, says:'no room named "'+(a.length ? c.b : c.a)+'"'};
    let best = null;
    for(const x of a) for(const y of b){ if(x===y) continue;
      if(x.level !== y.level){ if(!best || best.n < 99) best = {n: 99, x, y}; continue; }
      // the fewest rooms between them, room to room through shared walls on their floor
      const rs = R.filter(r => r.level===x.level), seen = new Map([[x, 0]]), qu = [x];
      while(qu.length){ const u = qu.shift(); for(const v of rs) if(!seen.has(v) && shareWall(u, v)){ seen.set(v, seen.get(u)+1); qu.push(v); } }
      const n = seen.has(y) ? seen.get(y)-1 : 99; if(!best || n < best.n) best = {n, x, y}; }
    if(!best) return {pass:false, says:'no pair to measure'};
    const t = best.x.level !== best.y.level ? 'on different floors' : best.n >= 99 ? 'not connected room to room' : best.n+' room'+(best.n===1 ? '' : 's')+' between';
    return {pass: best.n >= min, says: lc(best.x.name)+' and '+lc(best.y.name)+': '+t+' (wants '+min+')'};
  },
  viewFrom(o, c, R){
    const S = BR().site || {}, vs = (S.views||[]).map((v,i) => Object.assign({i}, v)), pick = c.dir!=null ? [{dir:c.dir, note:bearingTxt(c.dir)}] : c.view!=null ? vs.filter(v => v.i===c.view) : vs;
    if(!pick.length) return {pass:null, says:'no view in the brief to measure against'};
    const rs = findRooms(o, c.room, R); if(!rs.length) return {pass:false, says:'no room named "'+c.room+'"'};
    const within = c.within==null ? 45 : c.within; let best = null;
    for(const r of rs) for(const g of roomGlass(o, r)) for(const v of pick){ const d = angDiff(g.dir, v.dir); if(!best || d < best.d || (d===best.d && g.w > best.g.w)) best = {d, g, v, r}; }
    if(!best) return {pass:false, says:lc(rs[0].name)+' has no glass in an outside wall'};
    return {pass: best.d <= within, says: lc(best.r.name)+' glass faces '+bearingTxt(best.g.dir)+', '+Math.round(best.d)+'° off the view at '+bearingTxt(best.v.dir)+(best.d <= within ? '' : ' (wants within '+within+'°)')};
  },
  countOf(o, c, R){
    const what = String(c.what||'').toLowerCase(); let n, says;
    if(/^baths?$/.test(what)){ n = (o.q||{}).baths || 0; const f = Math.floor(n+1e-6), p = n-f > 0.2; says = (f ? f+' full bath'+(f>1?'s':'') : '')+(p ? (f ? ' and ' : '')+'a powder room' : '') || 'no bath'; n = c.full ? f : n; }
    else { const rs = findRooms(o, what, R).filter(r => !r.outdoor); n = rs.length; says = n+' '+(/^bedrooms?$/.test(what) ? 'bedroom'+(n===1?'':'s') : 'room'+(n===1?'':'s')+' named "'+c.what+'"')+(rs.length ? ' ('+rs.map(r => lc(r.name)).join(', ')+')' : ''); }
    const pass = (c.min==null || n >= c.min) && (c.max==null || n <= c.max);
    return {pass, says: says+(c.min!=null || c.max!=null ? ' (wants '+(c.min!=null && c.max!=null ? c.min+' to '+c.max : c.min!=null ? 'at least '+c.min : 'at most '+c.max)+')' : '')};
  },
  porchFacing(o, c){
    const g = (o.vols||[]), cx = g.reduce((s,v) => s+(v[0]+v[2])/2*(v[2]-v[0])*(v[3]-v[1]), 0)/(g.reduce((s,v) => s+(v[2]-v[0])*(v[3]-v[1]), 0)||1), cy = g.reduce((s,v) => s+(v[1]+v[3])/2*(v[2]-v[0])*(v[3]-v[1]), 0)/(g.reduce((s,v) => s+(v[2]-v[0])*(v[3]-v[1]), 0)||1);
    const within = c.within==null ? 45 : c.within, ps = (o.floors||[]).filter(f => f.k==='porch' || f.k==='deck').map(f => { const x = (f.r[0]+f.r[2])/2, y = (f.r[1]+f.r[3])/2;
      return {dir: trueBearing(o, Math.atan2(x-cx, -(y-cy))*180/Math.PI), sf: (f.r[2]-f.r[0])*(f.r[3]-f.r[1]), k:f.k}; });
    if(!ps.length) return {pass:false, says:'no porch or deck'};
    const ok = ps.filter(p => angDiff(p.dir, c.dir) <= within), sf = ok.reduce((s,p) => s+p.sf, 0), main = (ok.length ? ok : ps).slice().sort((a,b) => b.sf-a.sf)[0];
    return {pass: ok.length > 0 && sf >= (c.minSf||0), says: main.k+' on the '+bearingTxt(main.dir)+' side'+(ok.length ? ', '+num(sf)+' sf within '+within+'° of '+bearingTxt(c.dir) : ', none within '+within+'° of '+bearingTxt(c.dir))+(c.minSf ? ' (wants '+num(c.minSf)+' sf)' : '')};
  },
  storeys(o, c){
    const n = o.storeys || 1, pass = (c.is==null || n===c.is) && (c.min==null || n >= c.min) && (c.max==null || n <= c.max);
    return {pass, says: n+' storey'+(n===1 ? '' : 's')};
  }
};
// each of the brief's wishes against one option: {id, text, result: 'yes' | 'no' | 'judged', checks: [{type, pass, says}], says}.
// A wish without checks, or with a check no predicate can measure, is 'judged': the graders read it, it is never a pass.
function evalWishes(o, wishes){
  const R = roomsOf(o);
  return (wishes || BR().wishes || []).map(w => {
    if(!w.checks || !w.checks.length) return {id:w.id, text:w.text, result:'judged', checks:[], says:'judged by the graders'};
    const checks = w.checks.map(c => { const f = WISH[c.type];
      if(!f) return {type:c.type, pass:null, says:'no predicate "'+c.type+'": judged'};
      try { return Object.assign({type:c.type}, f(o, c, R)); } catch(e){ return {type:c.type, pass:null, says:'could not measure: '+e.message}; } });
    const result = checks.some(c => c.pass===false) ? 'no' : checks.some(c => c.pass==null) ? 'judged' : 'yes';
    return {id:w.id, text:w.text, result, checks, says: checks.map(c => c.says).join('; ')};
  });
}
