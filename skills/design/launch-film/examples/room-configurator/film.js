// Frame-exact 3D shots for the film, rendered on the GPU in a room-from-photos page opened with #debug (its ROOM.ev hook reaches
// the engine) and POSTed to that skill's snapsink.py (python3 snapsink.py <frames-dir>, listening on 127.0.0.1:8794).
//   const F = await import('/film/film.js?v=' + Date.now()); F.size(3840, 2160); await F.run('reveal', 0, 10);
// Every frame is a pure function of (shot, frame index) except the wall cuts, which carry over frame to frame
// the way the app eases them, so shots render in order.
const E = window.ROOM.ev, T = window.ROOM.T, SINK = 'http://127.0.0.1:8794/';
export const FPS = 30, GROUND = 0xf2f2ef;
let W = 1920, H = 1080;
const clamp = (x) => Math.min(1, Math.max(0, x)), lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => (x = clamp(x), x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3), easeIn = (x) => Math.pow(clamp(x), 3);
const rad = (d) => d * Math.PI / 180;
const V = (x, y, z) => new T.Vector3(x, y, z);

export function size(w, h){ W = w; H = h;
  E(`MV = {w: ${w}, h: ${h}}; renderer.setPixelRatio(1); renderer.setSize(${w}, ${h}, false); composer.setPixelRatio(1); composer.setSize(${w}, ${h}); renderer.setClearColor(${GROUND}, 1);`); }

/* ---- camera: every shot drives the model camera directly (the gizmo sizes itself from it) ---- */
const mcam = () => E('mcam');
function pose(pos, look, fov, roll){ const c = mcam(); c.position.copy(pos); c.up.set(0, 1, 0); c.lookAt(look); if (roll) c.rotateZ(-rad(roll));
  c.fov = fov; c.aspect = W / H; c.near = 2; c.far = 6000; c.updateProjectionMatrix(); c.updateMatrixWorld(true); }
// Orbit: target, azimuth/elevation (degrees) of the camera seen from the target, half-height r framed at the target, lens.
function orbit(o){ const fov = o.fov || 26, D = o.r / Math.tan(rad(fov / 2)), az = rad(o.az), el = rad(o.el);
  const t = V(...o.t), dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  return {pos: t.clone().addScaledVector(dir, D), look: t, fov, az: o.az}; }
// Where a photo's phone stood, framed the way the film covers the 4:3 photo: a wider frame keeps its width (centre band),
// a narrower one (4:5) keeps its height, so the vertical lens is the photo's own.
export function photoPose(i){ const ph = E('PH')[i], y = rad(ph.yaw || 0), p = rad(ph.pitch || 0), pos = V(ph.at[0], ph.h || 60, ph.at[1]);
  const dir = V(Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)), crop = Math.min(1, (4 / 3) / (W / H));
  const fov = 2 * Math.atan(Math.tan(rad(ph.fov || 55) / 2) * crop) * 180 / Math.PI;
  return {pos, dir, fov, roll: ph.roll || 0}; }

/* ---- walls: the dollhouse cut, eased frame to frame like the app (0.2 per 60 Hz frame = 0.36 per film frame) ---- */
function cutsFor(azDeg, k = 0.36, force){ const h = [Math.sin(rad(azDeg)), Math.cos(rad(azDeg))], RH = E('RH'), CUT = E('CUT'), applyCut = E('applyCut');
  E('SEG').forEach((sg) => { const tg = sg.w.n[0] * h[0] + sg.w.n[1] * h[1] > 0.2 ? CUT : RH;
    const c = force != null ? lerp(RH, tg, force) : sg.cut + (tg - sg.cut) * k; sg.cut = sg.target = Math.abs(c - tg) < 0.3 ? tg : c; applyCut(sg); }); }
function allWalls(){ const RH = E('RH'), applyCut = E('applyCut'); E('SEG').forEach((sg) => { sg.cut = sg.target = RH; applyCut(sg); }); }

function render(){ E(`mountVis(); gtao.enabled = true; renderer.shadowMap.needsUpdate = true; composer.render(); renderer.autoClear = false; renderer.render(OVER, mcam); renderer.autoClear = true; dirty3 = false; shadowsDirty = false;`); }
const post = (name, q = 0.94) => new Promise((ok) => E('mc').toBlob((b) => fetch(SINK + name, {method: 'POST', body: b}).then(() => ok(name)), 'image/jpeg', q));

/* ---- layouts: pieces glide from one option to the next ---- */
const LAY = () => E('LAYOUTS');
const dims = (L, k) => { const it = E('itemsFor')(L)[k]; return it && [it.w, it.d, it.h, it.mount || 0].join(); };
function setLayout(i){ if (E('cur') !== i) E('setLayout')(i); E('sel = null; attachGizmo()'); }
function placeObj(k, x, z, rot, s = 1, sx = 1, sz = 1){ const g = E('OBJ')[k], it = E('ITEMS')[k]; if (!g) return;
  const piv = it.mount ? it.mount + it.h / 2 : 0; g.position.set(x, piv * (1 - s), z); g.rotation.y = -rad(rot); g.scale.set(s * sx, s, s * sz); }
const shortRot = (a, b, k) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d * k; };
const ORDER = ['rug', 'sofa', 'table', 'poang', 'grey', 'ottoman', 'tv', 'lamp', 'stool', 'side', 'dogbed', 'stands', 'tripod', 'arc', 'shelf', 'tree', 'snake', 'mantel', 'poster', 'print'];
// u in [0,1]: in layout a, shared pieces glide to b's spots (staggered), the rug stretches to b's size, pieces b drops shrink away.
function glide(a, b, u){ setLayout(a); const A = LAY()[a], B = LAY()[b], ks = Object.keys(E('OBJ')), n = ORDER.length;
  ks.forEach((k) => { const pa = A.place[k], pb = B.place[k], i = Math.max(0, ORDER.indexOf(k));
    if (pb && (dims(A, k) === dims(B, k) || k === 'rug')){ const e = ease((u - 0.3 * i / n) / 0.7);
      const IA = E('itemsFor')(A)[k], IB = E('itemsFor')(B)[k];
      placeObj(k, lerp(pa[0], pb[0], e), lerp(pa[1], pb[1], e), shortRot(pa[2] || 0, pb[2] || 0, e), 1, lerp(1, IB.w / IA.w, e), lerp(1, IB.d / IA.d, e)); }
    else placeObj(k, pa[0], pa[1], pa[2] || 0, 1 - easeIn(u / 0.45)); }); }
// v in [0,1]: in layout b, the pieces a didn't have (or had in another form) grow in, staggered.
function arrive(a, b, v){ setLayout(b); const A = LAY()[a], B = LAY()[b], ks = Object.keys(E('OBJ'));
  let j = 0; ks.forEach((k) => { const pb = B.place[k], fresh = !A.place[k] || (dims(A, k) !== dims(B, k) && k !== 'rug');
    placeObj(k, pb[0], pb[1], pb[2] || 0, fresh ? easeOut((v - 0.18 * j++) / 0.6) : 1); }); }
function rest(i){ setLayout(i); const L = LAY()[i]; Object.keys(E('OBJ')).forEach((k) => { const p = L.place[k]; placeObj(k, p[0], p[1], p[2] || 0); }); }

/* ---- finishes: the paneling repainted, colours eased through sRGB ---- */
const HONEY = 0xb98457;
export let FIN = 1;   // the finishes push-in's framed half-height, scaled up for a tall frame (4:5 shows less of the wall's width)
export let DEL = 0;   // degrees added to the dollhouse camera's elevation: a tall frame looks further down so the room fills more of its height
export function tune(o){ if (o.fin) FIN = o.fin; if (o.el != null) DEL = o.el; }
function paneling(hex){ const L = LAY()[E('cur')]; L.colors.paneling = hex; E('paintRoom()'); }
const mix = (a, b, k) => new T.Color(a).lerp(new T.Color(b), k).getHex();

/* ---- shots: each returns the state for frame f; run() renders a range in order ---- */
// Frame the whole room the way the app's view buttons do (fitView), a touch tighter.
function fit(azDeg, elDeg, zoom = 1.06){ const v = E('fitView')(rad(azDeg), rad(elDeg)); return {t: [v.tx, v.ty, v.tz], r: v.r / zoom}; }
// The film shows the options as authored in config.js, not whatever is saved in this browser; restore() puts those back.
let SAVED = null;
const cl = (o) => JSON.parse(JSON.stringify(o || {}));
export function useBase(){ const L = E('LAYOUTS'), B = E('BASE');
  if (!SAVED) SAVED = L.map((l) => ({place: cl(l.place), colors: cl(l.colors), variants: cl(l.variants)}));
  B.forEach((b, i) => { L[i].place = cl(b.place); L[i].colors = cl(b.colors); L[i].variants = cl(b.variants); });
  E('ITEMS = itemsFor(LAYOUTS[cur]); sel = null; buildItems(); paintRoom();'); }
export const SHOTS = {
  // Photo 1's camera, then up and back out of the room into the model: one continuous move.
  reveal: {frames: 4 * FPS, at(f){ const k = ease(f / (4 * FPS - 1)), ph = photoPose(0), s0 = 96;
    const T0 = ph.pos.clone().addScaledVector(ph.dir, s0), F1 = fit(-62, 34 + DEL), end = orbit({t: F1.t, az: -62, el: 34 + DEL, r: F1.r});
    const T1 = end.look, u0 = ph.dir.clone().negate(), u1 = end.pos.clone().sub(T1).normalize(), D1 = end.pos.distanceTo(T1);
    const u = u0.clone().lerp(u1, k).normalize(), D = Math.exp(lerp(Math.log(s0), Math.log(D1), k));
    const hh = Math.exp(lerp(Math.log(s0 * Math.tan(rad(ph.fov / 2))), Math.log(F1.r), k)), fov = 2 * Math.atan(hh / D) * 180 / Math.PI;
    const t = T0.clone().lerp(T1, k), pos = t.clone().addScaledVector(u, D);
    rest(0); paneling(HONEY);
    const ceil = E('CEIL'); ceil.visible = k < 0.35; ceil.material.transparent = true; ceil.material.opacity = 1 - clamp((k - 0.04) / 0.28);
    if (f === 0) allWalls(); cutsFor(-62, 0, ease((k - 0.06) / 0.4));
    pose(pos, t, fov, ph.roll * (1 - k)); }},
  // From the fly-out's resting camera, a slow orbit while the pieces rearrange A -> B -> C.
  layouts: {frames: 6 * FPS, at(f){ const s = f / FPS, az = lerp(-62, -30, ease(s / 6)), el = lerp(34, 40, ease(s / 6)) + DEL;
    if (s < 0.5) rest(0); else if (s < 1.6) glide(0, 1, (s - 0.5) / 1.1); else if (s < 2.2) arrive(0, 1, (s - 1.6) / 0.6);
    else if (s < 3.2) rest(1); else if (s < 4.3) glide(1, 2, (s - 3.2) / 1.1); else if (s < 4.9) arrive(1, 2, (s - 4.3) / 0.6); else rest(2);
    E('CEIL').visible = false; cutsFor(az); const F2 = fit(az, el, lerp(1.06, 1.1, ease(s / 6))), o = orbit({t: F2.t, az, el, r: F2.r}); pose(o.pos, o.look, o.fov); }},
  // Push in on the fireplace wall while the paneling goes honey -> deep green -> limewashed.
  finishes: {frames: Math.round(3.2 * FPS), at(f){ const s = f / FPS, k = s / 3.2;
    rest(0); const c = s < 0.8 ? HONEY : s < 1.3 ? mix(HONEY, 0x3e4a3d, ease((s - 0.8) / 0.5)) : s < 2.1 ? 0x3e4a3d : mix(0x3e4a3d, 0xd9cbb4, ease((s - 2.1) / 0.5)); paneling(c);
    E('CEIL').visible = false; const az = lerp(-78, -66, k); cutsFor(az, f === 0 ? 1 : 0.36); const o = orbit({t: [138, 38, 121], az, el: lerp(22, 17, k), r: lerp(84, 68, ease(k)) * FIN, fov: 30}); pose(o.pos, o.look, o.fov); }},
};

export async function run(name, a = 0, b, opt = {}){ const sh = SHOTS[name]; b = b == null ? sh.frames : b; const out = [];
  for (let f = a; f < b; f++){ sh.at(f); render(); out.push(await post(`${opt.prefix || name}_${String(f).padStart(4, '0')}.jpg`, opt.q)); }
  return out.length; }
export function restore(){ const L = E('LAYOUTS'); if (SAVED) SAVED.forEach((sv, i) => { L[i].place = sv.place; L[i].colors = sv.colors; L[i].variants = sv.variants; }); SAVED = null; const ceil = E('CEIL'); ceil.material.opacity = 1; ceil.material.transparent = false; ceil.visible = false;
  E('cur = -1'); E('setLayout')(0); E('renderer.setClearColor(0xffffff, 0); sizeModel(); goView("sw", true); SEG.forEach(function(sg){ sg.cut = sg.target; applyCut(sg); }); paintRoom();'); }
