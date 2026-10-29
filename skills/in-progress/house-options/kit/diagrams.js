// diagrams.js: the BIG-style diagram set for each option, on 2D canvas, driven only by the option's data and the brief.
//   1. The parti: the option's `mass` as a white model seen from the house's own south-west corner, over a soft shadow;
//      its `key` in red; a red block arrow on the ground for the low winter sun from true south (site.rotation turns it
//      into the house's axes, brief.site.lat gives its height); a black block arrow for the arrival (brief.site.arrival);
//      boxed labels on leaders for the red volume, the arrows and the main rooms.
//   2. The step sequence: one small frame per `steps` entry (3 to 5), the same style and scale, registered on one
//      another so the form visibly changes; the previous frame's form is a dashed ghost; each frame's `says` is its caption.
//   3. The site: the lot north up and to scale, the setback line dashed, the house's roof outline placed by site.at and
//      site.rotation, the north arrow, the arrival and one open arrow per known view.
// The page puts <div class="diagrams" data-opt="oNN"></div> where the set goes and sets window.BRIEF; this script finds
// every such mount (now and whenever one is added) and draws into it. It reads OPT[oNN] and window.BRIEF only.
// API: window.HouseDiagrams.renderAll(), .render(el), .ready (a promise: fonts loaded, every mount drawn).
// A missing `key` draws the parti with no red; missing `steps` leaves the sequence out; a missing site or brief leaves
// the site plan out and draws the sun from the house's own south.
(function(){
'use strict';
if (typeof window === 'undefined' || window.HouseDiagrams) return;

const RED = '#E4402F', INK = '#111111', GHOST = '#8A8A86';
const RED_FACE = {roof:'#E4402F', fascia:'#C9382A', wallS:'#D93D2D', wallW:'#C4362A', plinth:'#B5311F', deck:'#E4402F', screen:'#E4402F'};
const RED_EDGE = '#7E2116';
const FONT_FAMILY = "Geist, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const LABEL_PX = 11, BOX_H = 21, PADX = 7;
const D2R = Math.PI / 180;
// the kit's axon (lib.js PR): x east, y south, z up in the house's own axes, seen from its south-west corner; [screen x, screen up, depth]
const PR = (x, y, z) => [0.7071 * (x + y), 0.3536 * (x - y) + 0.866 * z, 0.6124 * (x - y) - 0.5 * z];
// block arrows on the ground, ft: gap to the house, shaft length and half-width, head length and half-width
const AR = {gap: 3, sh: 10, sw: 2.3, hd: 7, hw: 5.6};

const OPTS = () => (typeof OPT !== 'undefined' ? OPT : window.OPT) || {};
const BRIEF = () => window.BRIEF || null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ptsOf = f => f.p || f.line;
const bbox = pts => { let a = [1e9, 1e9, -1e9, -1e9]; for (const q of pts) { a[0] = Math.min(a[0], q[0]); a[1] = Math.min(a[1], q[1]); a[2] = Math.max(a[2], q[0]); a[3] = Math.max(a[3], q[1]); } return a; };
const area = r => (r[2] - r[0]) * (r[3] - r[1]);
const ov = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j];
  if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const pairs = flat => { const o = []; for (let i = 0; i + 1 < flat.length; i += 2) o.push([flat[i], flat[i + 1]]); return o; };
const levelsOf = o => [o].concat(o.levels || []);
// a name the plan breaks over two lines: "Living|dining" reads "Living, dining"; "Porch room,|screened" keeps its comma
// '|' is only a line break on the plan: 'Primary|bedroom' reads 'Primary bedroom', 'Pantry,|laundry' keeps its comma
const nameOf = t => String(t).split('|').map(w => w.trim()).filter(Boolean).reduce((a, w) => a + ' ' + w);
const sfTxt = n => Math.round(n).toLocaleString('en-US') + ' sf';
const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const compass = deg => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

// ---------------------------------------------------------------- the site: rotation, the house on the lot, the sun
function siteOf(o, B) {
  const s = o.site || {}, r = +s.rotation || 0, at = s.at || [0, 0], c = Math.cos(r * D2R), n = Math.sin(r * D2R);
  const site = B && B.site || null, known = site && site.known;
  const knows = f => !!site && site[f] != null && (!Array.isArray(known) || known.includes(f));
  return {
    placed: !!(o.site && site && site.lot),
    rot: r,
    // house plan (x east, y south, in the house's axes) to lot (x east, y north, true) and back (BRIEF.md: site.rotation, site.at)
    toLot: ([x, y]) => [at[0] + x * c + y * n, at[1] + x * n - y * c],
    toHouse: ([X, Y]) => { const dx = X - at[0], dy = Y - at[1]; return [dx * c + dy * n, dx * n - dy * c]; },
    // a true compass bearing as a unit vector in the house's plan
    dirOf: bearing => { const b = (bearing + r) * D2R; return [Math.sin(b), -Math.cos(b)]; },
    lat: site && typeof site.lat === 'number' ? site.lat : null,
    knows, site
  };
}
function arrivalPoint(B) {
  const s = B && B.site, a = s && s.arrival; if (!a || !s.lot) return null;
  const L = s.lot, i = ((a.edge | 0) % L.length + L.length) % L.length, p = L[i], q = L[(i + 1) % L.length], t = a.at == null ? 0.5 : +a.at;
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
}
function groundZ(o) {
  if (window.HOKIT && HOKIT.gradeOf) return HOKIT.gradeOf(o);
  if (typeof PROJECT !== 'undefined' && PROJECT && typeof PROJECT.grade === 'number') return PROJECT.grade;
  return {slab: -0.6, crawl: -2, piers: -2.5}[o.foundation] || -2;
}

// ---------------------------------------------------------------- geometry of faces
// the height of a face's plane at (x, y), or null for an upright face
function planeZ(p, x, y) {
  for (let i = 2; i < p.length; i++) { const a = p[0], b = p[1], c = p[i];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (Math.hypot(...n) < 1e-6) continue; if (Math.abs(n[2]) < 1e-6) return null;
    return a[2] - (n[0] * (x - a[0]) + n[1] * (y - a[1])) / n[2]; }
  return null;
}
const isRoof = f => f.p && (f.k === 'roof' || (f.L === 2 && f.k !== 'fascia'));
// the lowest roof over (x, y) at least 2 ft above z0 (the underside a room sees), or the highest (the top a label sits on)
function roofAt(faces, x, y, z0, top) { let z = null;
  for (const f of faces) if (isRoof(f) && inPoly(f.p, x, y)) { const h = planeZ(f.p, x, y);
    if (h == null) continue; if (top ? (z == null || h > z) : (h > z0 + 2 && (z == null || h < z))) z = h; }
  return z; }
// a floor rectangle less the rooms on it, as rectangles: a wraparound porch comes out as its sides
function freeRects(r, vols) {
  const xs = [...new Set([r[0], r[2], ...vols.flatMap(v => [v[0], v[2]]).filter(x => x > r[0] && x < r[2])])].sort((a, b) => a - b);
  const ys = [...new Set([r[1], r[3], ...vols.flatMap(v => [v[1], v[3]]).filter(y => y > r[1] && y < r[3])])].sort((a, b) => a - b);
  let open = [], done = [];
  for (let j = 0; j + 1 < ys.length; j++) {
    const cy = (ys[j] + ys[j + 1]) / 2, runs = [];
    for (let i = 0; i + 1 < xs.length; i++) { const cx = (xs[i] + xs[i + 1]) / 2;
      if (vols.some(v => cx > v[0] && cx < v[2] && cy > v[1] && cy < v[3])) continue;
      if (runs.length && runs[runs.length - 1][2] === xs[i]) runs[runs.length - 1][2] = xs[i + 1]; else runs.push([xs[i], ys[j], xs[i + 1], ys[j + 1]]); }
    const next = [];
    for (const q of runs) { const up = open.find(u => u[0] === q[0] && u[2] === q[2]); if (up) { up[3] = q[3]; next.push(up); open = open.filter(u => u !== up); } else next.push(q); }
    done.push(...open); open = next;
  }
  return done.concat(open).filter(q => area(q) > 1);
}
function hull(pts) {
  const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function centroid(poly) { let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1]; a += f; cx += (poly[j][0] + poly[i][0]) * f; cy += (poly[j][1] + poly[i][1]) * f; }
  if (Math.abs(a) < 1e-9) { const b = bbox(poly); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
  return [cx / (3 * a), cy / (3 * a)]; }
// how far from c along d before leaving the polygon
function exitT(poly, c, d) { let lo = 0, hi = 1; while (inPoly(poly, c[0] + d[0] * hi, c[1] + d[1] * hi) && hi < 1e4) hi *= 2;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (inPoly(poly, c[0] + d[0] * m, c[1] + d[1] * m)) lo = m; else hi = m; } return hi; }

// ---------------------------------------------------------------- the key (BRIEF.md: `key`, and "Added by diagrams")
function keyOf(key) {
  if (key == null || key === false) return null;
  if (typeof key === 'number') return {idx: [key]};
  if (Array.isArray(key) && key.length === 4 && key.every(v => typeof v === 'number')) return {r: key};
  if (typeof key === 'object' && (key.r || key.idx)) return Object.assign({}, key, key.idx ? {idx: [].concat(key.idx)} : {});
  return null;
}
const WALL = k => k === 'wallS' || k === 'wallW';
// the faces of `mass` the key holds: by index, or every face whose plan centre is in the rect and whose extent is within
// 4 ft of it (a roof's overhang); a rect holding a wall is a volume of the house (it turns red), one holding none is an
// outdoor room (a red volume is drawn in it, from its floor to the roof over it)
function keyFaces(mass, K) {
  if (!K) return {faces: new Set(), mode: null};
  if (K.idx) return {faces: new Set(K.idx.map(i => mass[i]).filter(Boolean)), mode: 'mass'};
  const r = K.r, t = 4, faces = new Set();
  for (const f of mass) { const pts = ptsOf(f); if (!pts || f.k === 'pier') continue; const b = bbox(pts);
    let cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    // an upright face belongs to the volume behind it: the kit draws only south faces (whose volume is to the north)
    // and west faces (volume to the east), so a wall on the rect's north or east edge is a neighbour's, not the key's
    if (f.p && b[3] - b[1] < 0.01) cy -= 0.3; else if (f.p && b[2] - b[0] < 0.01) cx += 0.3;
    if (cx >= r[0] - 0.01 && cx <= r[2] + 0.01 && cy >= r[1] - 0.01 && cy <= r[3] + 0.01 && b[0] >= r[0] - t && b[2] <= r[2] + t && b[1] >= r[1] - t && b[3] <= r[3] + t) faces.add(f); }
  const mode = K.as || ([...faces].some(f => WALL(f.k)) ? 'mass' : 'room');
  return {faces, mode};
}
const ROOM_RANK = [[/living|great|family|hearth/i, 6], [/kitchen/i, 5], [/dining/i, 4], [/primary|main bed|master/i, 4], [/studio|office|library|workshop/i, 3], [/^bedroom|^bed\b/i, 3], [/bed|br\d|bunk|sleep/i, 1]];
const rankOf = name => { for (const [re, v] of ROOM_RANK) if (re.test(name)) return v; return 0; };
function roomsOf(o) { return levelsOf(o).flatMap((l, li) => (l.rooms || []).map(r => ({name: nameOf(r[0]).trim(), x: r[1], y: r[2], sf: r[3] || 0, out: r[4] === 'paper', level: li}))); }

// ---------------------------------------------------------------- the model of one drawing, in feet
// mass: the faces to draw; o: the option (rooms, vols, key); env: {site, arrows (shared by the frames)}
// frame: a step frame, where an outdoor room shows only once the frame has its floor
function modelOf(o, mass, K, env, withLabels, frame) {
  const faces = mass.filter(f => f.k !== 'pier' && ptsOf(f));
  const kf = keyFaces(mass, K), red = new Set(), under = new Set(), vols = [], labels = [];
  let keyLabel = null;
  if (kf.faces.size && kf.mode === 'mass') kf.faces.forEach(f => { if (f.p) red.add(f); });
  const r0 = K && K.r, isFloor = f => f.p && f.L === 0 && (f.k === 'deck' || f.k === 'screen') && ov(bbox(f.p), r0) >= 0.5 * Math.min(area(bbox(f.p)), area(r0));
  const slab = r0 ? faces.find(isFloor) : null;
  if (r0 && kf.mode !== 'mass' && (frame ? slab : true)) {
    // the outdoor room: its floor red, a translucent red volume up to the roof over it; a court or
    // yard floor in the plan sits at grade
    const r = K.r, l0 = levelsOf(o)[K.level || 0] || o, rv = l0.vols || [];
    const atGrade = !slab && (l0.floors || []).some(f => /court|yard/.test(f.k) && ov(f.r, r) >= 0.5 * area(r));
    const z0 = K.z0 != null ? K.z0 : slab ? slab.p[0][2] : atGrade ? env.grade : 0;
    const rects = freeRects(r, rv);
    const free = (x, y) => rects.some(q => x > q[0] && x < q[2] && y > q[1] && y < q[3]) || rv.some(q => x > q[0] && x < q[2] && y > q[1] && y < q[3]);
    const boxes = rects.map(q => { const [x0, y0, x1, y1] = q, e = 0.3;
      const cs = [[x0 + e, y0 + e], [x1 - e, y0 + e], [x1 - e, y1 - e], [x0 + e, y1 - e]].map(([x, y]) => { if (K.z1 != null) return K.z1; const z = roofAt(faces, x, y, z0, false); return z == null ? null : z - 0.8; });
      const got = cs.filter(z => z != null), fill = got.length ? got.reduce((a, z) => a + z, 0) / got.length : z0 + 8.5;
      const [a, b, c, d] = cs.map(z => z == null ? fill : z);
      vols.push({floor: true, p: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]});
      vols.push({p: [[x0, y0, a], [x1, y0, b], [x1, y1, c], [x0, y1, d]]});
      if (!free((x0 + x1) / 2, y1 + 0.2)) vols.push({p: [[x0, y1, z0], [x1, y1, z0], [x1, y1, c], [x0, y1, d]]});
      if (!free(x0 - 0.2, (y0 + y1) / 2)) vols.push({p: [[x0, y0, z0], [x0, y1, z0], [x0, y1, d], [x0, y0, a]]});
      return {q, z0, c, d}; });
    // the floor faces inside the room are covered by the red floor
    kf.faces.forEach(f => { if (f.p && f.L === 0) under.add(f); });
    if (boxes.length) { const near = boxes.slice().sort((a, b) => PR((a.q[0] + a.q[2]) / 2, a.q[3], a.z0)[2] - PR((b.q[0] + b.q[2]) / 2, b.q[3], b.z0)[2])[0];
      keyLabel = {at: [(near.q[0] + near.q[2]) / 2, near.q[3], near.z0 + ((near.c + near.d) / 2 - near.z0) * 0.45], sf: rects.reduce((s, q) => s + area(q), 0)}; }
  }
  if (red.size) {
    const roofs = [...red].filter(isRoof).sort((a, b) => area(bbox(b.p)) - area(bbox(a.p)));
    const src = roofs.length ? roofs[0].p : [...red].flatMap(f => f.p);
    const at = [0, 1, 2].map(i => src.reduce((s, q) => s + q[i], 0) / src.length);
    // its area on every floor, inside the key's rect (or the red faces' extent, less the overhangs' 1.5 ft)
    const e = bbox([...red].flatMap(f => f.p)), b = K && K.r || [e[0] + 1.5, e[1] + 1.5, e[2] - 1.5, e[3] - 1.5], rv = levelsOf(o).flatMap(l => l.vols || []);
    const sf = rv.reduce((s, v) => s + ov(v, b), 0) || area(e);
    keyLabel = {at, sf};
  }
  if (withLabels && keyLabel && K) {
    const r = K.r || bbox([...red].flatMap(f => f.p));
    const inside = roomsOf(o).filter(rm => rm.x >= r[0] && rm.x <= r[2] && rm.y >= r[1] && rm.y <= r[3]);
    const pick = inside.slice().sort((a, b) => rankOf(b.name) - rankOf(a.name) || b.sf - a.sf)[0];
    const name = K.name || (pick ? pick.name : kf.mode === 'room' ? 'Outdoor room' : 'The key volume');
    const sf = K.sf || (inside.length === 1 && inside[0].sf ? inside[0].sf : keyLabel.sf);
    labels.push({t: `${name} · ${sfTxt(sf)}`, at: keyLabel.at, kind: 'key'});
  }
  if (withLabels) {
    // the main rooms: living, kitchen, dining, the main bedroom, a studio; two beside a key, else three; none in the key,
    // one bedroom, none within 14 ft of another (one big room with three names gets one label)
    const r = K && K.r, seen = new Set(), at = []; let beds = 0;
    const cap = keyLabel ? 2 : 3;
    const cands = roomsOf(o).filter(rm => !rm.out && rankOf(rm.name) > 0 && !(r && rm.x >= r[0] && rm.x <= r[2] && rm.y >= r[1] && rm.y <= r[3]))
      .sort((a, b) => rankOf(b.name) - rankOf(a.name) || b.sf - a.sf);
    for (const rm of cands) {
      if (at.length >= cap) break;
      const key = rm.name.toLowerCase(); if (seen.has(key)) continue;
      if (at.some(p => p[3] === rm.level && Math.hypot(p[0] - rm.x, p[1] - rm.y) < 14)) continue;
      if (/bed|br\d/i.test(rm.name) && beds) continue;
      const z = roofAt(faces, rm.x, rm.y, 0, true); if (z == null) continue;
      if (/bed|br\d/i.test(rm.name)) beds++;
      seen.add(key); at.push([rm.x, rm.y, z, rm.level]); labels.push({t: rm.name, at: [rm.x, rm.y, z], kind: 'room'});
    }
  }
  const arrows = env.arrows || [];
  if (withLabels) for (const a of arrows) if (a.label) labels.push({t: a.label, at: a.labelAt, kind: 'arrow'});
  return {faces, red, under, vols, arrows, labels, grade: env.grade, light: env.light};
}

// the arrows on the ground for an option, from its final massing: the sun from true south, the arrival from the drive
function arrowsOf(o, S, B, grade) {
  const pts = o.mass.filter(f => f.k !== 'pier' && ptsOf(f)).flatMap(ptsOf).map(q => [q[0], q[1]]);
  const H = hull(pts); if (H.length < 3) return [];
  const vols = levelsOf(o)[0].vols || [];
  const C = vols.length ? centroid(hull(vols.flatMap(v => [[v[0], v[1]], [v[2], v[1]], [v[2], v[3]], [v[0], v[3]]]))) : centroid(H);
  const out = [], dirs = [];
  const sunDir = S.dirOf(180);                         // toward the sun, in the house's plan
  let arrDir = null;
  if (S.knows('arrival') && S.placed) { const A = arrivalPoint(B); if (A) { const a = S.toHouse(A), d = [a[0] - C[0], a[1] - C[1]], L = Math.hypot(...d); if (L > 1) arrDir = [d[0] / L, d[1] / L]; } }
  const across = d => { const n = [-d[1], d[0]]; let lo = 1e9, hi = -1e9; for (const q of H) { const v = (q[0] - C[0]) * n[0] + (q[1] - C[1]) * n[1]; lo = Math.min(lo, v); hi = Math.max(hi, v); } return [lo, hi]; };
  // two arrows from nearly the same side step apart, each into its own half of that side
  let sunOff = 0, arrOff = 0;
  if (arrDir) { const cosA = sunDir[0] * arrDir[0] + sunDir[1] * arrDir[1];
    if (cosA > Math.cos(50 * D2R)) { const [lo, hi] = across(sunDir), side = (arrDir[0] * -sunDir[1] + arrDir[1] * sunDir[0]) >= 0 ? 1 : -1;
      arrOff = side * Math.min(hi, -lo) * 0.45; sunOff = -arrOff; } }
  // an arrow from the north or east lies behind the house in this view, where the house would hide it: it floats just
  // over the roof instead, and casts its shadow on the ground
  const top = Math.max(...o.mass.filter(f => f.k !== 'pier' && ptsOf(f)).flatMap(ptsOf).map(q => q[2]));
  const make = (d, off, kind) => {
    const n = [-d[1], d[0]], c = [C[0] + n[0] * off, C[1] + n[1] * off], t = exitT(H, c, d), u = [-d[0], -d[1]];   // u: pointing in
    const lifted = 0.6124 * (d[0] - d[1]) > 0.2, z = lifted ? top + 3 : grade;
    const T = [c[0] + d[0] * (t + AR.gap), c[1] + d[1] * (t + AR.gap)];
    const P = (a, b) => [T[0] + u[0] * a + n[0] * b, T[1] + u[1] * a + n[1] * b, z];
    const L = AR.sh + AR.hd;
    const poly = [P(-L, -AR.sw), P(-AR.hd, -AR.sw), P(-AR.hd, -AR.hw), P(0, 0), P(-AR.hd, AR.hw), P(-AR.hd, AR.sw), P(-L, AR.sw)];
    return {kind, poly, lifted, u, labelAt: P(-AR.hd * 0.55, 0)};
  };
  // the sun's height is the low winter noon sun at the brief's latitude; the view looks down at 30°, so a ray drawn at
  // that height toward a sun behind the viewer would dip on the page: the height goes in the label, the arrow on the ground
  const alt = S.lat != null ? Math.round(90 - S.lat - 23.44) : null;
  const sun = make(sunDir, sunOff, 'sun');
  sun.label = alt != null ? `Winter sun, ${alt}° at noon` : 'Sun from the south';
  out.push(sun);
  if (arrDir) { const a = make(arrDir, arrOff, 'arrival'); a.label = 'Arrival'; out.push(a); }
  return out;
}

// ---------------------------------------------------------------- projection and bounds
function shadeOf(m) {
  // the light for the shadow: from the true south-south-east, 50° up, so the shadow agrees with the sun arrow
  const d = m.light, T = Math.tan(50 * D2R), g = m.grade;
  return q => [q[0] - d[0] * (q[2] - g) / T, q[1] - d[1] * (q[2] - g) / T, g];
}
function boundsOf(models) {
  const a = [1e9, -1e9, 1e9, -1e9];
  const add = q => { const [sx, su] = PR(q[0], q[1], q[2]); a[0] = Math.min(a[0], sx); a[1] = Math.max(a[1], sx); a[2] = Math.min(a[2], su); a[3] = Math.max(a[3], su); };
  for (const m of models) { const sh = shadeOf(m);
    for (const f of m.faces) for (const q of ptsOf(f)) { add(q); add(sh(q)); }
    for (const v of m.vols) v.p.forEach(add);
    for (const ar of m.arrows) { ar.poly.forEach(add); if (ar.lifted) ar.poly.forEach(q => add(sh(q))); } }
  return a;
}
// the scale, as px per ft per px of canvas width, that fits bounds b in a canvas of aspect w/h with a margin
const fitFrac = (b, aspect, pad) => Math.min((1 - 2 * pad) / (b[1] - b[0]), (1 / aspect - 2 * pad) / (b[3] - b[2]));

// ---------------------------------------------------------------- painting an axon
function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function sizeCanvas(cv, W, H) {
  const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px';
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return {x, dpr};
}
// draws model m into ctx (CSS px W x H); view {s, b, ox, oy}; opt {ghost: model, labels: bool, lw}; returns the ink mask
function paintAxon(ctx, dpr, W, H, m, view, opt) {
  const {s, b, ox, oy} = view, lw = opt.lw;
  const P2 = q => { const [sx, su] = PR(q[0], q[1], q[2]); return [(sx - b[0]) * s + ox, (b[3] - su) * s + oy]; };
  const off = () => { const c = canvasOf(W * dpr, H * dpr), x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.lineJoin = 'round'; x.lineCap = 'round'; return [c, x]; };
  const path = (cx, pts) => { cx.beginPath(); pts.forEach((q, i) => { const [px, py] = P2(q); i ? cx.lineTo(px, py) : cx.moveTo(px, py); }); cx.closePath(); };
  const blit = (c, alpha) => { ctx.save(); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(c, 0, 0, W, H); ctx.restore(); };
  const mask = canvasOf(W, H), mx = mask.getContext('2d', {willReadFrequently: true}); mx.fillStyle = '#000';
  const mpath = pts => { mx.beginPath(); pts.forEach((q, i) => { const [px, py] = P2(q); i ? mx.lineTo(px, py) : mx.moveTo(px, py); }); mx.closePath(); mx.fill(); };
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the shadow: every face cast on the ground, merged, laid down pale and softened
  { const [c, x] = off(), sh = shadeOf(m); x.fillStyle = '#000';
    for (const f of m.faces) if (f.p) { path(x, f.p.map(sh)); x.fill(); }
    for (const ar of m.arrows) if (ar.lifted) { path(x, ar.poly.map(sh)); x.fill(); }
    ctx.save(); ctx.globalAlpha = 0.09; ctx.filter = `blur(${(2.2 * dpr).toFixed(1)}px)`; ctx.drawImage(c, 0, 0, W, H); ctx.restore(); }
  // the previous frame's form, dashed, where this one does not cover it
  if (opt.ghost) { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = GHOST; ctx.lineWidth = Math.max(0.6, lw * 0.7);
    for (const f of opt.ghost.faces) if (f.p && f.L !== 0) { path(ctx, f.p); ctx.stroke(); } ctx.restore(); }
  // the arrows on the ground lie under anything in front of them; a floating one goes over everything, last
  const drawArrow = ar => { path(ctx, ar.poly); ctx.fillStyle = ar.kind === 'sun' ? RED : INK; ctx.fill(); mpath(ar.poly); };
  for (const ar of m.arrows) if (!ar.lifted) drawArrow(ar);
  // the massing in the kit's painter's order: layers ascending, far to near within a layer. A red room's volume sorts in
  // with the walls a little nearer, onto a layer of its own that every nearer face then clears: what is left is the red
  // the building does not hide
  const depth = f => { const pts = ptsOf(f); return pts.reduce((a, q) => a + PR(q[0], q[1], q[2])[2], 0) / pts.length; };
  const rv = m.vols.filter(v => !v.floor), rf = m.vols.filter(v => v.floor);
  const all = m.faces.filter(f => !m.under.has(f)).concat(rf.map(v => ({L: 0.5, k: 'redfloor', p: v.p})), rv.map(v => ({L: 1, k: 'redvol', p: v.p})));
  const dep = f => depth(f) - (f.k === 'redvol' ? 0.5 : 0);
  const order = [...new Set(all.map(f => f.L))].sort((a, e) => a - e).flatMap(L => all.filter(f => f.L === L).sort((a, e) => dep(e) - dep(a)));
  const [R, rx] = off();
  const planeOf = pp => pp.every(q => Math.abs(q[1] - pp[0][1]) < 0.01) ? ['S', pp[0][1]] : pp.every(q => Math.abs(q[0] - pp[0][0]) < 0.01) ? ['W', pp[0][0]] : null;
  const redPlanes = rv.map(v => planeOf(v.p)).filter(Boolean), own = f => { const pl = planeOf(f.p); return pl && redPlanes.some(r => r[0] === pl[0] && Math.abs(r[1] - pl[1]) < 0.35); };
  for (const f of order) {
    if (f.line) { const [a, e] = f.line.map(P2); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(e[0], e[1]); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
      mx.beginPath(); mx.moveTo(a[0], a[1]); mx.lineTo(e[0], e[1]); mx.lineWidth = 2; mx.strokeStyle = '#000'; mx.stroke(); continue; }
    if (f.k === 'redvol') { path(rx, f.p); rx.fillStyle = RED; rx.fill(); continue; }
    path(ctx, f.p);
    if (f.k === 'redfloor') { ctx.fillStyle = RED; ctx.fill(); ctx.strokeStyle = RED; ctx.lineWidth = lw; ctx.stroke(); }
    else if (m.red.has(f)) { ctx.fillStyle = RED_FACE[f.k] || RED; ctx.fill(); ctx.strokeStyle = RED_EDGE; ctx.lineWidth = lw; ctx.stroke(); }
    else { ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke(); }
    if (!own(f)) { rx.save(); rx.globalCompositeOperation = 'destination-out'; path(rx, f.p); rx.fill(); rx.restore(); }
    mpath(f.p);
  }
  if (rv.length) {
    const [c, x] = off(); x.fillStyle = RED; for (const v of rv) { path(x, v.p); x.fill(); mpath(v.p); }
    blit(c, 0.16); blit(R, 0.34);
    ctx.save(); ctx.setLineDash([5 * lw, 4 * lw]); ctx.strokeStyle = RED; ctx.lineWidth = lw * 0.85; for (const v of rv) { path(ctx, v.p); ctx.stroke(); } ctx.restore();
    // solid edges where the room shows: the red edges, kept only over the visible red (grown a little)
    const [Rd, rd] = off(), [E, ed] = off(); rd.setTransform(1, 0, 0, 1, 0, 0);
    for (const [dx, dy] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) rd.drawImage(R, dx, dy);
    ed.strokeStyle = RED; ed.lineWidth = lw * 1.15; for (const v of rv) { path(ed, v.p); ed.stroke(); }
    ed.setTransform(1, 0, 0, 1, 0, 0); ed.globalCompositeOperation = 'destination-in'; ed.drawImage(Rd, 0, 0); blit(E);
  }
  for (const ar of m.arrows) if (ar.lifted) drawArrow(ar);
  return mx.getImageData(0, 0, mask.width, mask.height).data;
}

// ---------------------------------------------------------------- boxed labels on leaders, where they cover the least
function placeLabels(ctx, W, H, mask, items, opt) {
  const lw = opt.lw, I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += mask[(y * W + x) * 4 + 3] > 0 ? 1 : 0; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
  const inkIn = (x0, y0, x1, y1) => { x0 = clamp(Math.floor(x0), 0, W); y0 = clamp(Math.floor(y0), 0, H); x1 = clamp(Math.ceil(x1), 0, W); y1 = clamp(Math.ceil(y1), 0, H);
    return x1 <= x0 || y1 <= y0 ? 0 : I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]; };
  const crosses = (x0, y0, x1, y1, r) => { let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
    for (const [pp, qq] of [[-dx, x0 - r[0]], [dx, r[2] - x0], [-dy, y0 - r[1]], [dy, r[3] - y0]]) {
      if (pp === 0) { if (qq < 0) return false; continue; } const t = qq / pp;
      if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
    return t0 < t1; };
  // how much of the drawing a leader runs over, sampled every 2 px past the first 5 (it starts on the drawing)
  const inkOn = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0); let n = 0;
    for (let t = 5; t < L; t += 2) { const x = Math.round(x0 + (x1 - x0) * t / L), y = Math.round(y0 + (y1 - y0) * t / L);
      if (x >= 0 && y >= 0 && x < W && y < H && mask[(y * W + x) * 4 + 3] > 0) n++; } return n; };
  const segX = (a, b) => { const d = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const p1 = [a[0], a[1]], p2 = [a[2], a[3]], p3 = [b[0], b[1]], p4 = [b[2], b[3]];
    return d(p3, p4, p1) * d(p3, p4, p2) < 0 && d(p1, p2, p3) * d(p1, p2, p4) < 0; };
  ctx.save(); ctx.font = `500 ${LABEL_PX}px ${FONT_FAMILY}`; if ('letterSpacing' in ctx) ctx.letterSpacing = (LABEL_PX * 0.07).toFixed(2) + 'px';
  const placed = [], leaders = [], M = 6, drawn = [];
  const RINGS = opt.rings || [30, 46, 64, 86, 112, 142, 176, 214];
  for (const lb of items) {
    const t = lb.t.toUpperCase(), w = Math.ceil(ctx.measureText(t).width) + 2 * PADX, [ax, ay] = lb.xy;
    let best = null;
    for (const d of RINGS) for (let i = 0; i < 24; i++) { const th = i * Math.PI / 12, cx = ax + d * Math.cos(th), cy = ay + d * Math.sin(th);
      const bx = cx - w / 2, by = cy - BOX_H / 2; if (bx < M || by < M || bx + w > W - M || by + BOX_H > H - M) continue;
      const ex = clamp(ax, bx, bx + w), ey = clamp(ay, by, by + BOX_H), box = [bx - 5, by - 5, bx + w + 5, by + BOX_H + 5];
      const hit = placed.some(q => bx < q[2] + 8 && bx + w > q[0] - 8 && by < q[3] + 8 && by + BOX_H > q[1] - 8) ||
        placed.some(q => crosses(ax, ay, ex, ey, [q[0] - 3, q[1] - 3, q[2] + 3, q[3] + 3])) || leaders.some(sg => crosses(...sg, box)) ||
        drawn.some(p => p[0] > box[0] && p[0] < box[2] && p[1] > box[1] && p[1] < box[3]);
      const cross = leaders.some(sg => segX(sg, [ax, ay, ex, ey]));
      const score = inkIn(...box) * 1.0 + inkOn(ax, ay, ex, ey) * 3 + (hit ? 1e7 : 0) + (cross ? 4e4 : 0) + d * 0.9;
      if (!best || score < best.score) best = {score, bx, by, ex, ey, w}; }
    if (!best || (best.score >= 1e7 && lb.optional)) continue;
    const {bx, by, ex, ey} = best; leaders.push([ax, ay, ex, ey]); drawn.push([ax, ay]);
    placed.push([bx, by, bx + best.w, by + BOX_H]);
    lb.__box = [bx, by, ex, ey, t, best.w];
  }
  // leaders first, then the boxes over them
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = Math.max(0.75, lw * 0.85);
  for (const lb of items) if (lb.__box) { const [bx, by, ex, ey] = lb.__box, [ax, ay] = lb.xy;
    if (Math.hypot(ex - ax, ey - ay) > 1) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(ax, ay, Math.max(1.9, lw * 2), 0, 2 * Math.PI); ctx.fill(); }
  for (const lb of items) if (lb.__box) { const [bx, by, , , t, w] = lb.__box;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(bx, by, w, BOX_H); ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, BOX_H - 1);
    ctx.fillStyle = INK; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(t, bx + PADX, by + BOX_H / 2 + 0.5); delete lb.__box; }
  ctx.restore();
}

// ---------------------------------------------------------------- the site plan, north up
function insetPoly(L, d) {
  let a2 = 0; for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length]; a2 += p[0] * q[1] - q[0] * p[1]; }
  const sgn = a2 > 0 ? 1 : -1, lines = L.map((p, i) => { const q = L[(i + 1) % L.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), n = [-dy / l * sgn, dx / l * sgn], o = d[i] || 0;
    return [[p[0] + n[0] * o, p[1] + n[1] * o], [dx, dy]]; });
  return lines.map((ln, i) => { const pv = lines[(i - 1 + lines.length) % lines.length], [p, r] = pv, [q, s] = ln, den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return q; const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / den; return [p[0] + r[0] * t, p[1] + r[1] * t]; });
}
function footprintOf(o) {
  const roofs = levelsOf(o).flatMap(l => (l.roofs || []).filter(p => p.length >= 6).map(pairs));
  if (roofs.length) return roofs;
  return levelsOf(o).flatMap(l => (l.vols || []).map(v => [[v[0], v[1]], [v[2], v[1]], [v[2], v[3]], [v[0], v[3]]]));
}
function paintSite(ctx, dpr, W, H, o, B, S, K, lw) {
  const site = B.site, L = site.lot, sb = insetPoly(L, site.setbacks || []);
  const toLot = S.toLot, house = footprintOf(o).map(p => p.map(toLot));
  const decks = levelsOf(o)[0].floors ? levelsOf(o)[0].floors.filter(f => f.k !== 'void' && f.k !== 'court').map(f => { const r = f.r; return [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]].map(toLot); }) : [];
  let keyPoly = null;
  if (K && K.r) { const r = K.r; keyPoly = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]].map(toLot); }
  // room above for the north arrow, below for the scale bar
  const b = bbox(L), pad = Math.max(30, W * 0.09), padTop = Math.max(40, H * 0.1), padBot = Math.max(48, pad);
  const s = Math.min((W - 2 * pad) / (b[2] - b[0]), (H - padTop - padBot) / (b[3] - b[1]));
  const ox = (W - (b[2] - b[0]) * s) / 2, oy = padTop + ((H - padTop - padBot) - (b[3] - b[1]) * s) / 2;
  const P = q => [(q[0] - b[0]) * s + ox, (b[3] - q[1]) * s + oy];
  const mask = canvasOf(W, H), mx = mask.getContext('2d', {willReadFrequently: true}); mx.fillStyle = '#000'; mx.strokeStyle = '#000';
  const path = (cx, pts, close) => { cx.beginPath(); pts.forEach((q, i) => { const [x, y] = P(q); i ? cx.lineTo(x, y) : cx.moveTo(x, y); }); if (close !== false) cx.closePath(); };
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the lot, a pale ground, and the setback line dashed
  path(ctx, L); ctx.fillStyle = '#F3F3F1'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.1; ctx.stroke();
  mx.lineWidth = 3; path(mx, L); mx.stroke();
  ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = lw * 0.85; path(ctx, sb); ctx.stroke(); ctx.restore(); path(mx, sb); mx.lineWidth = 2; mx.stroke();
  // the house: decks pale, roofs white over a soft shadow to the north, the key red
  { const c = canvasOf(W * dpr, H * dpr), x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#000';
    for (const p of house) { path(x, p); x.fill(); }
    ctx.save(); ctx.globalAlpha = 0.16; ctx.filter = `blur(${(1.6 * dpr).toFixed(1)}px)`; ctx.drawImage(c, 0, -Math.max(2, s * 1.6), W, H); ctx.restore(); }
  for (const p of decks) { path(ctx, p); ctx.fillStyle = '#E2E2DE'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.6; ctx.stroke(); path(mx, p); mx.fill(); }
  for (const p of house) { path(ctx, p); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke(); path(mx, p); mx.fill(); }
  if (keyPoly) { path(ctx, keyPoly); ctx.fillStyle = RED; ctx.fill(); }
  const pts = house.flat(), H0 = hull(pts.length ? pts : L), C = centroid(H0);
  const labels = [];
  // block arrows in px: shaft, head; a = start (tail), d = unit direction on the screen
  const arrow = (tail, d, len, fill, stroke) => { const n = [-d[1], d[0]], sw = 3.2, hw = 8, hd = 10;
    const Q = (a, c) => [tail[0] + d[0] * a + n[0] * c, tail[1] + d[1] * a + n[1] * c];
    const poly = [Q(0, -sw), Q(len - hd, -sw), Q(len - hd, -hw), Q(len, 0), Q(len - hd, hw), Q(len - hd, sw), Q(0, sw)];
    ctx.beginPath(); poly.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw * 0.9; ctx.stroke(); }
    mx.beginPath(); poly.forEach((q, i) => i ? mx.lineTo(q[0], q[1]) : mx.moveTo(q[0], q[1])); mx.closePath(); mx.fill(); return Q(len * 0.55, 0); };
  // views: open arrows from the house toward each view the person named
  if (S.knows('views')) for (const v of site.views || []) { const br = v.dir * D2R, d = [Math.sin(br), -Math.cos(br)];   // screen: y down
    const dl = [Math.sin(br), Math.cos(br)], t = exitT(H0, C, dl), st = P([C[0] + dl[0] * (t + 5), C[1] + dl[1] * (t + 5)]);
    const at = arrow(st, d, 42, '#FFFFFF', INK); labels.push({t: v.note || ('View ' + compass(v.dir)), xy: at}); }
  // the arrival: a black arrow from the lot's edge, pointing in
  if (S.knows('arrival')) { const A = arrivalPoint(B); if (A) { const a = P(A), c = P(C), dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1, d = [dx / l, dy / l];
    const at = arrow([a[0] - d[0] * 16, a[1] - d[1] * 16], d, 32, INK); labels.push({t: 'Arrival', xy: at}); } }
  // the setback line's label, at the point of the line farthest from the house, the arrival and the views' arrows
  { const busy = pts.concat([C]); const A = S.knows('arrival') && arrivalPoint(B); if (A) busy.push(A);
    if (S.knows('views')) for (const v of site.views || []) { const br = v.dir * D2R, dl = [Math.sin(br), Math.cos(br)], t = exitT(H0, C, dl) + 5 + 42 / s; busy.push([C[0] + dl[0] * t, C[1] + dl[1] * t]); }
    let best = null;
    for (let i = 0; i < sb.length; i++) for (const f of [0.3, 0.5, 0.7]) { const p = sb[i], q = sb[(i + 1) % sb.length], m = [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
      const dmin = Math.min(...busy.map(b2 => Math.hypot(b2[0] - m[0], b2[1] - m[1]))); if (!best || dmin > best.d) best = {d: dmin, m}; }
    labels.push({t: 'Setback line', xy: P(best.m), optional: true}); }
  // the north arrow and the scale bar
  { const nx = W - 26, ny = 18; ctx.save(); ctx.beginPath(); ctx.moveTo(nx, ny + 4); ctx.lineTo(nx + 7, ny + 24); ctx.lineTo(nx, ny + 19); ctx.lineTo(nx - 7, ny + 24); ctx.closePath();
    ctx.fillStyle = INK; ctx.fill(); ctx.font = `600 ${LABEL_PX}px ${FONT_FAMILY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('N', nx, ny + 2); ctx.restore();
    mx.fillRect(nx - 12, ny - 12, 24, 40); }
  { const steps = [10, 20, 25, 50, 100, 200], ft = steps.find(v => v * s >= 50) || 200, len = ft * s, x0 = 14, y0 = H - 16;
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y0 - 4); ctx.lineTo(x0, y0); ctx.lineTo(x0 + len, y0); ctx.lineTo(x0 + len, y0 - 4); ctx.moveTo(x0 + len / 2, y0 - 2.5); ctx.lineTo(x0 + len / 2, y0); ctx.stroke();
    ctx.font = `500 ${LABEL_PX - 1}px ${FONT_FAMILY}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '0.6px'; ctx.fillStyle = INK; ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
    ctx.fillText('0', x0 - 2, y0 - 6); ctx.textAlign = 'right'; ctx.fillText(ft + ' FT', x0 + len + 4, y0 - 6); ctx.restore(); mx.fillRect(x0 - 4, y0 - 20, len + 30, 24); }
  placeLabels(ctx, W, H, mx.getImageData(0, 0, W, H).data, labels, {lw, rings: [22, 34, 48, 64, 84, 108, 136]});
}

// ---------------------------------------------------------------- the mount: figures, captions, sizes
const CSS = `
.diagrams{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(0,1fr);gap:22px 22px;align-items:start;margin:18px 0 6px}
.diagrams .dg-fig{margin:0;min-width:0}
.diagrams canvas{display:block;width:100%;background:#fff;border-radius:2px}
.diagrams .dg-steps{grid-column:1/-1;display:grid;grid-template-columns:repeat(var(--dg-n,4),minmax(0,1fr));gap:14px}
.diagrams .dg-steps figcaption{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:baseline;max-width:none}
.diagrams .dg-n{font-weight:600;color:var(--ink,#111);font-variant-numeric:tabular-nums}
.diagrams figcaption{font-size:12px;line-height:1.45}
@media (max-width:760px){.diagrams{grid-template-columns:minmax(0,1fr)}.diagrams .dg-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
function injectCSS() { if (document.getElementById('dg-style')) return; const st = document.createElement('style'); st.id = 'dg-style'; st.textContent = CSS; document.head.appendChild(st); }
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

function prepare(k) {
  const o = OPTS()[k]; if (!o || !Array.isArray(o.mass)) return null;
  const B = BRIEF(), S = siteOf(o, B), K = keyOf(o.key), grade = groundZ(o);
  const arrows = arrowsOf(o, S, B, grade), light = S.dirOf(157.5);
  const env = {arrows, grade, light};
  const parti = modelOf(o, o.mass, K, env, true);
  const steps = (Array.isArray(o.steps) ? o.steps : []).filter(st => st && Array.isArray(st.mass) && st.mass.length).slice(0, 5)
    .map(st => ({says: st.says || '', model: modelOf(o, st.mass, st.key != null ? keyOf(st.key) : (K && K.r ? K : null), env, false, st.key == null)}));
  return {k, o, B, S, K, parti, steps, pb: boundsOf([parti]), sb: steps.length ? boundsOf(steps.map(s => s.model)) : null};
}

const PARTI_ASPECT = 1.5, STEP_ASPECT = 1.3, PAD = 0.05;
let shared = null;
function render(mount, frac, D) {
  const k = mount.getAttribute('data-opt'); D = D || prepare(k);
  if (!D) { mount.textContent = ''; return; }
  const B = D.B, siteOK = !!(B && B.site && B.site.lot && D.S.placed);
  if (!mount.__dg || mount.__dg.k !== k || mount.__dg.nSteps !== D.steps.length || mount.__dg.site !== siteOK) {
    mount.textContent = ''; mount.classList.add('dg');
    const fp = el('figure', 'dg-fig dg-parti'), cp = el('canvas'); fp.appendChild(cp);
    const alt = D.S.lat != null ? Math.round(90 - D.S.lat - 23.44) : null;
    const kl = D.parti.labels.find(l => l.kind === 'key'), keyTxt = kl ? ` Red is the key move, the ${kl.t.split(' · ')[0].toLowerCase()}.` : '';
    fp.appendChild(el('figcaption', null, `The idea: a white model seen from the house's own south-west corner.${keyTxt} The red arrow is the ${alt != null ? `noon sun on 21 December, ${alt}° above the horizon` : 'sun from the south'}${D.parti.arrows.some(a => a.kind === 'arrival') ? '; the black arrow is the way in' : ''}.`));
    mount.appendChild(fp);
    let cs = null;
    if (siteOK) { const fs = el('figure', 'dg-fig dg-site'); cs = el('canvas'); fs.appendChild(cs);
      fs.appendChild(el('figcaption', null, `On the lot, north up, to scale${D.S.rot ? `, the house turned ${Math.abs(Math.round(D.S.rot))}° ${D.S.rot > 0 ? 'anticlockwise' : 'clockwise'}` : ''}. The dashed line is the setback: the house stays inside it.`));
      mount.appendChild(fs); }
    const cv = [];
    if (D.steps.length) { const row = el('div', 'dg-steps'); row.style.setProperty('--dg-n', D.steps.length);
      D.steps.forEach((st, i) => { const f = el('figure', 'dg-fig dg-step'), c = el('canvas'); f.appendChild(c);
        const cap = el('figcaption'); cap.appendChild(el('span', 'dg-n', String(i + 1))); cap.appendChild(el('span', null, st.says)); f.appendChild(cap); row.appendChild(f); cv.push(c); });
      mount.appendChild(row); }
    mount.__dg = {k, nSteps: D.steps.length, site: siteOK, cp, cs, cv};
  }
  const R = mount.__dg;
  // the parti, at the shared scale
  { const W = Math.floor(R.cp.parentNode.getBoundingClientRect().width); if (W < 40) return; const H = Math.round(W / PARTI_ASPECT);
    const {x, dpr} = sizeCanvas(R.cp, W, H), f = Math.min(frac || 1e9, fitFrac(D.pb, PARTI_ASPECT, PAD)), s = f * W, b = D.pb;
    const view = {s, b, ox: (W - (b[1] - b[0]) * s) / 2, oy: (H - (b[3] - b[2]) * s) / 2}, lw = clamp(W / 820, 0.8, 1.2);
    const mask = paintAxon(x, dpr, W, H, D.parti, view, {lw});
    const P2 = q => { const [sx, su] = PR(q[0], q[1], q[2]); return [(sx - b[0]) * s + view.ox, (b[3] - su) * s + view.oy]; };
    const order = {arrow: 0, key: 1, room: 2};
    const items = D.parti.labels.slice().sort((a, e) => order[a.kind] - order[e.kind]).map(l => ({t: l.t, xy: P2(l.at), optional: l.kind === 'room'}));
    placeLabels(x, W, H, mask, items, {lw});
    if (R.cs) { const Ws = Math.floor(R.cs.parentNode.getBoundingClientRect().width), stacked = Ws > W * 0.8, Hs = stacked ? Math.round(Ws * 0.9) : H;
      const c2 = sizeCanvas(R.cs, Ws, Hs); paintSite(c2.x, c2.dpr, Ws, Hs, D.o, B, D.S, D.K, clamp(Ws / 420, 0.8, 1.1)); }
  }
  // the steps, registered on one another at one scale
  if (R.cv.length) { const b = D.sb; let prev = null;
    R.cv.forEach((c, i) => { const W = Math.floor(c.parentNode.getBoundingClientRect().width); if (W < 30) return; const H = Math.round(W / STEP_ASPECT);
      const {x, dpr} = sizeCanvas(c, W, H), s = fitFrac(b, STEP_ASPECT, 0.04) * W;
      const view = {s, b, ox: (W - (b[1] - b[0]) * s) / 2, oy: (H - (b[3] - b[2]) * s) / 2};
      paintAxon(x, dpr, W, H, D.steps[i].model, view, {lw: clamp(W / 300, 0.75, 1.05), ghost: prev, ray: false});
      prev = D.steps[i].model; }); }
}

function mounts() { return [...document.querySelectorAll('.diagrams[data-opt]')]; }
function renderAll() {
  injectCSS();
  const ms = mounts(); if (!ms.length) return;
  // one scale for every parti on the page, so the options compare
  const Ds = ms.map(m => { try { return prepare(m.getAttribute('data-opt')); } catch (e) { console.error('diagrams ' + m.getAttribute('data-opt') + ': ' + e.message); return null; } });
  shared = Math.min(...Ds.map(D => D ? fitFrac(D.pb, PARTI_ASPECT, PAD) : Infinity));
  for (const [i, m] of ms.entries()) { try { render(m, shared, Ds[i]); } catch (e) { console.error('diagrams ' + m.getAttribute('data-opt') + ': ' + e.message); if (window.__errs) window.__errs.push('diagrams: ' + e.message); } }
}
let queued = false;
const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; renderAll(); }); };
const fontsReady = () => (document.fonts && document.fonts.load ? Promise.race([document.fonts.load(`500 ${LABEL_PX}px Geist`).catch(() => null), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve());
const ready = new Promise(res => {
  const go = () => fontsReady().then(() => { renderAll(); res(true);
    if (window.ResizeObserver) { const widths = new WeakMap(), ro = new ResizeObserver(es => { for (const e of es) { const w = Math.round(e.contentRect.width); if (widths.get(e.target) !== w) { widths.set(e.target, w); queue(); } } });
      const watch = () => mounts().forEach(m => { if (!m.__dgWatched) { m.__dgWatched = true; ro.observe(m); } }); watch();
      if (window.MutationObserver) new MutationObserver(ms => { if (ms.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches('.diagrams[data-opt]') || n.querySelector && n.querySelector('.diagrams[data-opt]'))))) { watch(); queue(); } })
        .observe(document.body, {childList: true, subtree: true}); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
    // a page that sets window.BRIEF or OPT late gets drawn again once it has loaded (or call HouseDiagrams.renderAll())
    if (document.readyState !== 'complete') window.addEventListener('load', queue); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
});
window.HouseDiagrams = {renderAll, render: m => render(m, shared), ready, prepare};
})();
