// Geometry and data checks for one option file, against brief.json.
// usage: NODE check.cjs o01        (a worked example's key, such as F, checks examples/F.js)
// ERROR lines must be fixed; WARN lines must be fixed or explained in your report.
const fs = require('fs'), path = require('path');
const key = process.argv[2];
if (!key) { console.log('usage: check.cjs <key>'); process.exit(1); }
const dir = __dirname, read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const PJ = require('./project.js'), { optPath } = require('./build.cjs');
let K;
try { K = require('./wishes.cjs').load([key]); }
catch (e) { console.log('ERROR does not evaluate: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')); process.exit(2); }
const { OPT, EXT, BRIEF, levelsOf, rotOf, trueBearing, bearingTxt, sunProfile, foundOf, sectItems, massOf, buildable, footprints, outside, costOf, evalWishes } = K, o = OPT[key];
let nE = 0, nW = 0;
const E = m => { nE++; console.log('ERROR ' + m); }, W = m => { nW++; console.log('WARN  ' + m); }, I = m => console.log('info  ' + m);
if (!o) { E('OPT.' + key + ' is not defined'); process.exit(2); }
const r1 = v => Math.round(v * 10) / 10, S0 = BRIEF.site || {}, G0 = BRIEF.program || {};
const angDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };

// fields
for (const f of ['no', 'name', 'storeys', 'sub', 'plan', 'borrowed', 'pros', 'cons', 'sectCap', 'bed', 'view', 'vols', 'open', 'rooms', 'dims', 'na', 'sb', 'sect', 'mass', 'q', 'site', 'foundation'])
  if (o[f] == null) E('missing field ' + f);
if ((o.borrowed || []).length < 3) W('borrowed: fewer than 3 precedents');
if ((o.pros || []).length < 2 || (o.cons || []).length < 2) W('pros/cons: want at least 2 of each');

// the site: where the house sits and how it is turned (DATA.md, site)
const st = o.site || {};
if (typeof st.rotation !== 'number' || !isFinite(st.rotation)) E('site.rotation must be a number of degrees (0 = plan north is true north)');
if (!Array.isArray(st.at) || st.at.length !== 2 || st.at.some(v => typeof v !== 'number')) E('site.at must be [x, y], the lot point (ft, x east, y north) under the plan\'s 0,0');
const rot = rotOf(o);
I(`on the lot: turned ${rot}° counter-clockwise; plan north faces ${bearingTxt(trueBearing(o, 0))}, plan south ${bearingTxt(trueBearing(o, 180))}`);
// the foundation, and the brief's
if (!['slab', 'crawl', 'piers'].includes(o.foundation)) E(`foundation must be 'slab', 'crawl' or 'piers' (it is ${JSON.stringify(o.foundation)})`);
else if (G0.foundation && G0.foundation !== 'any' && G0.foundation !== o.foundation) W(`foundation '${o.foundation}' differs from the brief's '${G0.foundation}'`);
if (!(o.sect && o.sect.items || []).some(it => it[0] === 'found')) W(`the section has no ['found', y0, y1] item, so it draws no ${foundOf(o)} foundation (DATA.md, foundation)`);
if (!(o.mass || []).some(f => f.found)) W(`the axon has no M.plinth(...), so it draws no ${foundOf(o)} foundation (DATA.md, foundation)`);
// storeys against the brief and the levels drawn
const nLv = 1 + (o.levels || []).length;
if (G0.storeys && o.storeys > G0.storeys) E(`storeys ${o.storeys} is more than the brief allows (${G0.storeys})`);
if (Math.ceil(o.storeys || 1) !== nLv) W(`storeys ${o.storeys} but ${nLv} floor plan(s) drawn (the option plus ${nLv - 1} in levels)`);
// the diagrams' fields (DATA.md, steps and key)
if (o.key == null) W('no key: the diagrams colour no volume red (DATA.md, key)');
const steps = o.steps || [];
if (steps.length < 3 || steps.length > 5) W(`steps: ${steps.length} frame(s), want 3 to 5 (DATA.md, steps)`);
steps.forEach((s, i) => { if (!s || typeof s.says !== 'string' || !s.says.trim()) W(`steps[${i}] has no says`); if (!Array.isArray(s && s.mass) || !s.mass.length) W(`steps[${i}] has no mass`);
  else if (s.mass.some(f => !(f.p || f.line))) E(`steps[${i}].mass holds an entry with no p or line: use the M helpers' faces`); });

// the house's own text: no site fact the brief does not give, no cost figures, true directions on a turned house
const own = [['sub', o.sub], ['sectCap', o.sectCap], ...['plan', 'pros', 'cons'].flatMap(f => (o[f] || []).map((t, i) => [f + '[' + i + ']', t])),
  ...steps.map((s, i) => ['steps[' + i + '].says', s && s.says]),
  ...(o.borrowed || []).map((b, i) => ['borrowed[' + i + '] after "here"', String(b[1] || '').split(/\bhere\b/).slice(1).join('here')])];
const known = S0.known || [];
for (const [topic, re] of Object.entries(PJ.siteWords || {})) if (!known.includes(topic))
  for (const [f, t] of own) { const m = String(t || '').match(re); if (m) W(`${f} names "${m[1] || m[0]}" as if it were on the site, and brief.json site.known does not list ${topic}: say what the plan gives where a site has one`); }
for (const [f, t] of own) { const m = String(t || '').match(/\$\s?\d[\d,.]*\s?k?\b/i); if (m) W(`${f} quotes a cost ("${m[0]}"): the page shows the rough cost; take it out of the text`); }
// "south" in the text means true south: on a house turned more than 30°, plan south is not south
const southOff = angDiff(trueBearing(o, 180), 180);
if (southOff > 30) for (const [f, t] of own) if (/\bsouth(?:ern)?\b|\bnorth(?:ern)?\b/i.test(String(t || '')))
  W(`${f} names north or south, but this house is turned ${rot}°: plan south faces ${bearingTxt(trueBearing(o, 180))}. Make sure it means the true direction`);

// q (DATA.md lists the keys and what each measures)
const QK = ['footprint', 'floorArea', 'roofPlan', 'perim', 'wallArea', 'glass', 'porch', 'porchRoofed', 'cond', 'baths', 'stairs'];
for (const k of QK) if (typeof (o.q || {})[k] !== 'number' || !isFinite(o.q[k])) E('q.' + k + ' missing or not a number');
const q = o.q || {};

// areas and perimeter
const lv = levelsOf(o);
let gross = 0, net = 0;
lv.forEach((l, i) => (l.vols || []).forEach(v => { const w = v[2] - v[0], d = v[3] - v[1]; if (w <= 0 || d <= 0) E(`level ${i} vol ${JSON.stringify(v)} has no area`); gross += w * d; net += (w - 2 * EXT) * (d - 2 * EXT); }));
I(`vols: gross ${Math.round(gross)} sf over all floors, inside walls ${Math.round(net)} sf; q.cond ${q.cond}, q.floorArea ${q.floorArea}`);
if (q.cond < net * 0.9 || q.cond > gross) W(`q.cond ${q.cond} is outside the range the vols allow (${Math.round(net * 0.9)} to ${Math.round(gross)}): cond is measured inside the exterior walls`);
if (Math.abs(q.floorArea - gross) > gross * 0.06) W(`q.floorArea ${q.floorArea} differs from the gross vol area ${Math.round(gross)} by more than 6%`);
const AR = G0.areaRange;
if (AR && (q.cond < AR[0] || q.cond > AR[1])) W(`q.cond ${q.cond} is outside the brief's ${AR.map(v => v.toLocaleString('en-US')).join(' to ')} sf`);
const g = lv[0].vols || [];
const fpA = g.reduce((s, v) => s + (v[2] - v[0]) * (v[3] - v[1]), 0);
if (Math.abs(q.footprint - fpA) > fpA * 0.06) W(`q.footprint ${q.footprint} differs from the ground-floor vol area ${Math.round(fpA)} by more than 6%`);
// A stair drawn inside an upper floor's vol is an opening in that floor, and so is a 'void': cond counts a stairwell once,
// on the floor its stair starts from. The check reads the comment lines that mention cond.
const within = (r, vs) => vs.some(v => (r[0] + r[2]) / 2 > v[0] && (r[0] + r[2]) / 2 < v[2] && (r[1] + r[3]) / 2 > v[1] && (r[1] + r[3]) / 2 < v[3]);
const holes = lv.slice(1).flatMap(l => [...(l.stairs || []).map(t => t.r), ...(l.floors || []).filter(f => f.k === 'void').map(f => f.r)].filter(r => within(r, l.vols || [])));
const holeA = holes.reduce((s, r) => s + (r[2] - r[0]) * (r[3] - r[1]), 0);
if (holeA > 0) {
  I(`openings in the upper floors (stairwells and voids) ${r1(holeA)} sf; cond counts each stairwell once, on the floor its stair starts from`);
  const cl = read(optPath(key)).split('\n').map((t, i, a) => /\/\/.*\bcond\b/.test(t) ? t + ' ' + (a[i + 1] || '') : '').join(' ');
  if (!/stair|opening|void|well/i.test(cl)) W(`an upper floor has ${r1(holeA)} sf of stairwell or void, and no comment on cond takes it off: subtract each opening once and say so`);
}
let per = 0; for (const v of g) per += 2 * (v[2] - v[0] + v[3] - v[1]);
for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
  const a = g[i], b = g[j];
  const ox = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), oy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  if ((Math.abs(a[2] - b[0]) < 0.01 || Math.abs(b[2] - a[0]) < 0.01) && oy > 0) per -= 2 * oy;
  if ((Math.abs(a[3] - b[1]) < 0.01 || Math.abs(b[3] - a[1]) < 0.01) && ox > 0) per -= 2 * ox;
  if (ox > 0.01 && oy > 0.01) W(`ground vols ${i} and ${j} overlap`);
}
I(`ground-floor exterior wall length from vols ${r1(per)} ft; q.perim ${q.perim}`);
// perim counts each exterior wall once: the ground floor's, plus every upper-floor outside wall that does not stand on a
// ground-floor exterior wall, and each rect in `rise` (a part with no floor of its own whose walls stand above a roof).
const inAny = (x, y, vs, t) => vs.some(v => x > v[0] - t && x < v[2] + t && y > v[1] - t && y < v[3] + t);
for (const r of o.rise || []) if (!inAny((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, g, 0)) E(`rise ${JSON.stringify(r)} is not over a ground-floor vol`);
let over = 0;
[...lv.slice(1), ...(o.rise || []).map(r => ({ vols: [r] }))].forEach(l => { const vs = l.vols || []; for (const v of vs)
  for (const [x0, y0, x1, y1, nx, ny] of [[v[0], v[1], v[2], v[1], 0, -1], [v[2], v[1], v[2], v[3], 1, 0], [v[0], v[3], v[2], v[3], 0, 1], [v[0], v[1], v[0], v[3], -1, 0]]) {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 0.1));
    for (let k = 0; k < n; k++) {
      const x = x0 + (x1 - x0) * (k + 0.5) / n, y = y0 + (y1 - y0) * (k + 0.5) / n;
      if (inAny(x + nx * 0.05, y + ny * 0.05, vs, -0.001)) continue;
      if (inAny(x - nx * 0.3, y - ny * 0.3, l.cuts || [], 0.05)) continue;
      if (inAny(x, y, g, 0.05) && !inAny(x + nx * 0.8, y + ny * 0.8, g, -0.001)) continue;
      over += L / n;
    }
  } });
if (over > 0.05) I(`upper-floor exterior wall not standing on a ground-floor exterior wall ${r1(over)} ft, so perim should be about ${r1(per + over)}`);
if (Math.abs(q.perim - (per + over)) > (per + over) * 0.12) W(`q.perim ${q.perim} differs from the exterior wall length ${r1(per + over)} by more than 12%`);
const mh = (q.wallArea + q.glass) / q.perim;
I(`implied mean wall height (wallArea + glass) / perim = ${r1(mh)} ft`);
if (mh < 7 || mh > 30) W('implied mean wall height is implausible: check wallArea (net opaque wall area, all floors) and glass');
if (q.porchRoofed > q.porch) W('q.porchRoofed exceeds q.porch');

// the setback line: every wall, porch and deck inside the lot inset by its setbacks; steps and roof edges warn
const BLD = buildable();
if (!BLD) E('brief.json site.lot is missing, so the setback line cannot be checked');
else {
  const kinds = { vol: 'ground-floor room', upper: 'upper-floor room', floor: 'porch or deck', stair: 'step', roof: 'roof edge' };
  let n = 0;
  for (const f of footprints(o)) {
    const out = outside(f.pts, BLD); if (!out) continue; n++;
    const what = `${kinds[f.kind]}${f.r ? ' ' + JSON.stringify(f.r) : ''}${f.level ? ' on level ' + f.level : ''}`;
    const msg = `${what} ${out.crosses ? 'crosses' : 'is ' + r1(out.d) + ' ft past'} the setback line of lot edge ${out.edge} (lot point ${r1(out.x)}, ${r1(out.y)}): move site.at or turn the house`;
    if (f.kind === 'stair' || f.kind === 'roof') W(msg); else E(msg);
  }
  if (!n) I('everything stands inside the setback line');
}

// openings, fixtures, labels, per level
const inR = (x, y, r, m) => x >= r[0] - (m || 0) && x <= r[2] + (m || 0) && y >= r[1] - (m || 0) && y <= r[3] + (m || 0);
const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
lv.forEach((l, li) => {
  const V = l.vols || [], F = (l.floors || []).map(f => f.r), VW = l.view || o.view;
  const walls = {};
  for (const op of l.open || []) {
    const v = V[op.v]; if (!v) { E(`level ${li}: opening on missing vol ${op.v}`); continue; }
    if (!(op.a < op.b)) E(`level ${li}: opening a >= b ${JSON.stringify(op)}`);
    const hz = op.w === 'N' || op.w === 'S', lo = hz ? v[0] : v[1], hi = hz ? v[2] : v[3];
    if (op.a < lo - 0.01 || op.b > hi + 0.01) E(`level ${li}: opening ${JSON.stringify(op)} runs past its wall (${lo} to ${hi})`);
    const wk = op.v + op.w; (walls[wk] = walls[wk] || []).push(op);
  }
  for (const wk in walls) { const s = walls[wk].slice().sort((a, b) => a.a - b.a); for (let i = 1; i < s.length; i++) if (s[i].a < s[i - 1].b - 0.01) W(`level ${li}: openings overlap on wall ${wk}: ${s[i - 1].a}-${s[i - 1].b} and ${s[i].a}-${s[i].b}`); }
  const roofBB = (l.roofs || []).map(p => { const xs = p.filter((_, i) => i % 2 === 0), ys = p.filter((_, i) => i % 2 === 1); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; });
  const fxBoxes = [];
  for (const f of l.fx || []) {
    const [k, x, y, w, d] = f; if (k === 'chain') continue;
    const cx = x + (w || 0) / 2, cy = y + (d || 0) / 2;
    if (!V.some(r => inR(cx, cy, r)) && !F.some(r => inR(cx, cy, r)) && !roofBB.some(r => inR(cx, cy, r))) W(`level ${li}: fixture ${k} at (${x},${y}) is outside every room, floor and roof`);
    fxBoxes.push([k, [x, y, x + w, y + d]]);
  }
  // label boxes at 9 px/ft (the sheet scale): about 0.66 ft per character, 1.28 ft per line
  const lab = (l.rooms || []).map(rm => { const lines = rm[0].split('|'), n = lines.length + (rm[3] ? 1 : 0), w = Math.max(...lines.map(t => t.length), rm[3] ? 6 : 0) * 0.66, h = n * 1.28;
    return [rm[0].replace(/\|/g, ' '), [rm[1] - w / 2, rm[2] - h / 2, rm[1] + w / 2, rm[2] + h / 2]]; });
  for (const n of l.notes || []) { if (n[3] && n[3].rot) continue; const w = n[0].length * 0.52, al = (n[3] || {}).align; const x0 = al === 'left' ? n[1] : al === 'right' ? n[1] - w : n[1] - w / 2; lab.push(['note "' + n[0] + '"', [x0, n[2] - 0.5, x0 + w, n[2] + 0.5]]); }
  const shrink = (b, m) => [b[0] + m, b[1] + m, b[2] - m, b[3] - m];
  for (let i = 0; i < lab.length; i++) {
    const [t, b] = lab[i];
    if (b[0] < VW.x0 || b[2] > VW.x1 || b[1] < VW.y0 || b[3] > VW.y1) W(`level ${li}: label ${t} runs outside the view`);
    for (let j = i + 1; j < lab.length; j++) if (hit(shrink(b, 0.1), shrink(lab[j][1], 0.1))) W(`level ${li}: labels overlap: ${t} / ${lab[j][0]}`);
    for (const p of l.parts || []) if (hit(shrink(b, 0.15), p)) W(`level ${li}: label ${t} crosses a partition at ${JSON.stringify(p)}`);
    for (const v of V) for (const e of [[v[0], v[1], v[2], v[1] + EXT], [v[0], v[3] - EXT, v[2], v[3]], [v[0], v[1], v[0] + EXT, v[3]], [v[2] - EXT, v[1], v[2], v[3]]]) if (hit(shrink(b, 0.15), e)) W(`level ${li}: label ${t} crosses an exterior wall`);
    for (const [k, fb] of fxBoxes) if (hit(shrink(b, 0.2), fb)) W(`level ${li}: label ${t} sits on the ${k} at (${fb[0]},${fb[1]})`);
  }
  if (li && !l.na && !o.na) W(`level ${li}: no north arrow`);
});

// interior stairs (those inside a vol) at the code minimums: treads of 10 in (the run over n) and a width of 36 in
const vertOf = s => s.dir === 'N' || s.dir === 'S', runOf = s => vertOf(s) ? s.r[3] - s.r[1] : s.r[2] - s.r[0];
const allSt = lv.flatMap((l, li) => (l.stairs || []).map(s => [li, s]));
lv.forEach((l, li) => (l.stairs || []).forEach(s => {
  const r = s.r, n = s.n || 4, vert = vertOf(s), run = runOf(s);
  if (!(l.vols || []).some(v => inR((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, v))) return;
  if (allSt.some(([lj, t]) => lj !== li && vertOf(t) === vert && runOf(t) > run + 0.05 && inR(r[0], r[1], t.r, 0.05) && inR(r[2], r[3], t.r, 0.05))) {
    I(`level ${li}: stair ${JSON.stringify(r)} is the cut end of a longer flight drawn on another floor, checked there`); return; }
  const wd = vert ? r[2] - r[0] : r[3] - r[1], t = run / n * 12;
  I(`level ${li}: interior stair ${JSON.stringify(r)} ${s.dir}, ${n} treads of ${r1(t)} in, ${r1(wd * 12)} in wide`);
  if (t < 9.95) W(`level ${li}: stair treads are ${r1(t)} in (a ${r1(run)} ft run over ${n}), under the 10 in code minimum: lengthen the flight or turn it at a landing`);
  if (wd < 2.95) W(`level ${li}: stair is ${r1(wd * 12)} in wide, under the 36 in code minimum`);
}));
if (nLv > 1 && !lv.slice(1).some(l => (l.stairs || []).length)) W('an upper floor is drawn with no stair on it');
if (nLv > 1 && !(o.stairs || []).some(s => (o.vols || []).some(v => inR((s.r[0] + s.r[2]) / 2, (s.r[1] + s.r[3]) / 2, v)))) W('the ground floor has no interior stair up');

// section: sun rays at the angles for this rotation, clear of solid (cut) polygons, inside the view
const S = o.sect || { items: [], view: {} }, sv = S.view, sun = sunProfile(rot);
const items = sectItems(o), cuts = items.filter(it => it[0] === 'cut').map(it => it[1]);
I(`noon sun in this section (turned ${rot}°): 21 Dec ${sun.dec}°, 21 Jun ${sun.jun}° (sunProfile(rotOf(o)); above 90 the sun comes from the plan-north side)`);
const pip = (x, y, p) => { let c = false; for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) { const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
items.filter(it => it[0] === 'sun').forEach((it, n) => {
  const [, y, z, deg, len, label, dashed] = it, a = deg * Math.PI / 180, ye = y - Math.cos(a) * len, ze = z - Math.sin(a) * len;
  I(`sun ray ${n} (${deg}°${dashed ? ', dashed' : ''}${label ? ', "' + label + '"' : ''}): from (${r1(y)}, ${r1(z)}) to (${r1(ye)}, ${r1(ze)})`);
  if (Math.max(y, ye) > sv.y1 || Math.min(y, ye) < sv.y0 || z > sv.z1 || ze < sv.z0) W(`sun ray ${n} runs outside the section view`);
  if (deg !== sun.dec && deg !== sun.jun) W(`sun ray ${n} is at ${deg}°, which is neither 21 Dec (${sun.dec}°) nor 21 Jun (${sun.jun}°) for this rotation: use sunRay(..., sunProfile(rotOf(o)).dec, ...)`);
  for (let t = 0.3; t < len - 0.3; t += 0.05) { const py = y - Math.cos(a) * t, pz = z - Math.sin(a) * t; const c = cuts.findIndex(p => pip(py, pz, p)); if (c >= 0) { E(`sun ray ${n} passes through solid cut #${c} at (${r1(py)}, ${r1(pz)}): the ray is drawn where the sun cannot reach`); break; } }
});
if (!items.some(it => it[0] === 'sun' && it[3] === sun.dec)) W(`section has no 21 December (${sun.dec}°) ray`);
if (!items.some(it => it[0] === 'sun' && it[3] === sun.jun)) W(`section has no 21 June (${sun.jun}°) ray`);

// axon faces, with the foundation as drawn
for (const f of massOf(o)) { const pts = f.p || f.line; if (!pts || pts.some(p => p.length !== 3 || p.some(v => typeof v !== 'number' || !isFinite(v)))) { E('mass face with bad points: ' + JSON.stringify(f).slice(0, 120)); break; } }

// cost
const c = costOf(o), k$ = v => '$' + Math.round(v / 1000) + 'k';
I(`rough cost ${k$(c.total)} (${c.lines.filter(l => l.amount > 0).map(l => l.key + ' ' + k$(l.amount)).join(', ')}; × ${c.location.factor} ${c.location.name}; + overhead and contingency)` +
  (c.perSf ? `, $${Math.round(c.perSf)}/sf` : '') + (c.gap != null ? `, ${k$(Math.abs(c.gap))} ${c.gap > 0 ? 'over' : 'under'} the budget` : ''));
// Text that says the rough cost leaves work out needs that work named in `unpriced`, which puts "not counting …" on the sheet
const OMIT = /\b(?:cost|estimate|pric\w*)\b[^.]{0,40}?\b(?:does not|doesn't|leaves? out|left out|not count\w*|exclud\w*|omit\w*|not includ\w*)|\bleft out of the (?:rough )?cost\b/i;
if (!o.unpriced) for (const [f, t] of own) for (const s of String(t || '').split(/(?<=\.)\s+|[;:]\s+/))
  if (OMIT.test(s)) E(`${f} says the rough cost leaves work out ("${s.slice(0, 90)}…") but \`unpriced\` is empty: name that work in \`unpriced\``);

// wishes (wishes.cjs prints them in full)
for (const w of evalWishes(o)) I(`wish ${w.id}: ${w.result}${w.result === 'judged' ? '' : ' (' + w.says + ')'}`);
console.log(`${key}: ${nE} error(s), ${nW} warning(s)`);
process.exit(nE ? 2 : 0);
