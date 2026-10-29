// Every label on every catalog sheet sits inside its drawing and clear of every other label, at every width.
// Labels are drawn at fixed pixel sizes while the drawings shrink to fit a narrow screen, so on a phone B's section
// lost the end of its December sun label past the canvas edge and option 10's cabin labels ran into each other
// (2026-09-25, found in the version 6 captures after fit.cjs passed; fit.cjs checks drawings, not text).
// Records every fillText on the page's sheet canvases as a box in the canvas's own pixels (the glyphs' drawn extent,
// through the canvas transform, so rotated labels count too) and fails on:
//   - a label that runs past its canvas's edge;
//   - two labels on one canvas that overlap;
//   - a room name missing at any width: each of its words must be drawn on the sheet's plans or listed in a room key (an
//     element with class "roomkey" in the sheet). A fix may drop secondary labels on a phone, never a room's name;
//   - from 768 px up, any label missing from the baseline, the labels the desktop sheet draws at 1320 (tablets and
//     laptops keep the complete sheet); and at 1320 any label that moved more than 1 px from its baseline box (the
//     published desktop sheet stays as it is). `--baseline` writes labels-1320.json from the current page: run it
//     once before changing anything;
//   - a label shown smaller than MIN_PX on screen, or a room name smaller than MIN_ROOM_PX (its font size times the
//     canvas's shown width over its drawn width), so no fix can clear a collision by shrinking text past reading;
//   - below 768 px, a plan note or room name (an area line or a room's number too) whose box overlaps a wall by more
//     than 1 px both ways. Walls are the rects check.cjs reads: each vol's exterior walls at EXT thickness, `parts` and
//     `ward`. Dimensions, stair labels, the N and the scale bar are exempt. On a phone o33's "work counter under the
//     north glass" crossed two walls and o08's "Entry, stair hall" ran over its east wall (2026-09-25, in fixer A's
//     captures after this script passed: a placer that only prices walls still crosses one when nothing else is free).
// Room names and walls come from the options' own data, loaded from this script's folder the way check.cjs loads them.
// usage: NODE labels.cjs [--baseline] [key ...]      (LAB_WIDTHS=1320,390 in the environment for a quick look; no server:
// the page is opened over file://)
const fs = require('fs'), path = require('path'), { playwright, pageURL, settle } = require('./shoot.cjs');
const { chromium } = playwright();
const WIDTHS = [1320, 1240, 1100, 1024, 960, 930, 900, 890, 881, 880, 820, 768, 600, 414, 390, 360, 320];
const TOL = 1;   // px of overlap, or of overrun past an edge, that still passes
// on-screen floors: the smallest label the page draws today is 5.0 px (a stair's "UP" at 320), and a room name 6.3 px
const MIN_PX = 5, MIN_ROOM_PX = 6, FULL_FROM = 768;
const args = process.argv.slice(2), baseline = args.includes('--baseline'), only = args.filter(a => a !== '--baseline');
const BL = path.join(__dirname, 'labels-1320.json');

// room names, per option, from the option files that are on the page
const dir = __dirname, read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const acc = read('accepted.txt').split('\n').map(s => s.trim()).filter(s => /^o\d\d$/.test(s));
const { OPT, EXT, rotOf } = require('./wishes.cjs').load([...new Set(acc)]), ROOMS = {}, PLANS = {};
for (const [k, o] of Object.entries(OPT)) ROOMS[k] = [o, ...(o.levels || [])].flatMap(l => (l.rooms || []).flatMap(r => String(r[0]).split('|')));
// each plan canvas (data-lvl i is the sheet's level i, an upper floor on the ground floor's view unless it has its own), in
// ft: its walls, and the exempt marks it draws: stair labels, and the N and scale-bar figures at their anchors
for (const [k, o] of Object.entries(OPT)) PLANS[k] = [o, ...(o.levels || []).map(l => Object.assign({ view: o.view }, l))].map(l => ({
  view: l.view, vols: l.vols || [],
  walls: [...(l.vols || []).flatMap(([x0, y0, x1, y1]) => [[x0, y0, x1, y0 + EXT], [x0, y1 - EXT, x1, y1], [x0, y0, x0 + EXT, y1], [x1 - EXT, y0, x1, y1]].map(r => ['exterior wall', r])),
    ...(l.parts || []).map(r => ['partition', r]), ...(l.ward || []).map(r => ['wardrobe', r])],
  stairs: new Set((l.stairs || []).map(st => String(st.label || 'DN'))),
  // the N stands 3.2 ft behind the arrow's middle, along the turned arrow (lib.js paintPlan)
  marks: [...(l.na ? [['N', l.na[0] - Math.sin(rotOf(o) * Math.PI / 180) * 3.2, l.na[1] + Math.cos(rotOf(o) * Math.PI / 180) * 3.2]] : []), ...(l.sb ? [...[0, 4, 8, 16].map(v => [String(v), l.sb[0] + v, l.sb[1] + 1.4]), ['feet', l.sb[0] + 17.2, l.sb[1] + 0.25]] : [])]
}));
const DIM = /^\d+'-\d+"$/;   // a dimension figure, as FT writes it

const count = a => a.reduce((m, t) => (m[t] = (m[t] || 0) + 1, m), {});
const words = ts => ts.flatMap(t => String(t).split(/[\s,]+/)).filter(Boolean);

(async () => {
  const fails = [], perW = {}, smallest = {}, scales = [], browser = await chromium.launch();
  const drawn = {};   // drawn[w][k][kind] = [texts]
  const widths = baseline ? [1320] : process.env.LAB_WIDTHS ? process.env.LAB_WIDTHS.split(',').map(Number) : WIDTHS;   // LAB_WIDTHS=1320,390 for a quick look
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => {
      const P = CanvasRenderingContext2D.prototype, fill = P.fillText;
      P.fillText = function (t, x, y) {
        try {
          const m = this.measureText(t), T = this.getTransform();
          const L = m.actualBoundingBoxLeft, R = m.actualBoundingBoxRight, A = m.actualBoundingBoxAscent, D = m.actualBoundingBoxDescent;
          const p = [[x - L, y - A], [x + R, y - A], [x + R, y + D], [x - L, y + D]].map(([u, v]) => [T.a * u + T.c * v + T.e, T.b * u + T.d * v + T.f]);
          const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
          (this.canvas.__labels = this.canvas.__labels || []).push({ t: String(t), font: this.font, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
        } catch (e) {}
        return fill.apply(this, arguments);
      };
      // the size of every rect traced, for a plan's scale (see the wall check)
      const rect = P.rect;
      P.rect = function (x, y, w, h) { (this.canvas.__rects = this.canvas.__rects || []).push([w, h]); return rect.apply(this, arguments); };
      // setting a canvas's width clears it, so it clears its record too (a redraw must not count twice)
      const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
      Object.defineProperty(HTMLCanvasElement.prototype, 'width', { get() { return d.get.call(this); }, set(v) { this.__labels = []; this.__rects = []; d.set.call(this, v); }, configurable: true });
    });
    const page = await ctx.newPage();
    await page.goto(pageURL(), { waitUntil: 'load' });
    await settle(page, '__drawn');
    // every sheet is on the page at once; the diagrams' canvases are diagrams.js's, checked by its own tool
    let keys = await page.evaluate(() => [...document.querySelectorAll('#sheets .sheet[data-k]')].map(s => s.dataset.k));
    if (only.length) keys = keys.filter(k => only.includes(k));
    drawn[w] = {}; perW[w] = 0;
    const plansAt = [];
    for (const k of keys) {
      const cvs = await page.evaluate(k => [...document.getElementById(k).querySelectorAll('canvas.plan, canvas.sect, canvas.axon, canvas.site')].map(c => ({ kind: c.className + (c.dataset.lvl || ''), W: c.width, H: c.height, shown: c.getBoundingClientRect().width / (c.width || 1), labels: c.__labels || [], rects: c.className === 'plan' ? c.__rects || [] : [] })), k);
      const key = await page.evaluate(k => [...document.getElementById(k).querySelectorAll('.roomkey')].map(e => e.textContent).join(' '), k);
      drawn[w][k] = {};
      const bad = m => { fails.push(`${k} at ${w}: ${m}`); perW[w]++; };
      const roomWords = new Set(words(ROOMS[k] || []));
      // the plans, for the wall check once every sheet at this width is open
      for (const c of cvs) if (w < FULL_FROM && /^plan\d+$/.test(c.kind) && PLANS[k] && PLANS[k][+c.kind.slice(4)]) plansAt.push({ k, c, bad });
      for (const c of cvs) {
        drawn[w][k][c.kind] = c.labels.map(l => ({ t: l.t, x0: +l.x0.toFixed(1), y0: +l.y0.toFixed(1), x1: +l.x1.toFixed(1), y1: +l.y1.toFixed(1) }));
        for (const l of c.labels) {
          const px = parseFloat((String(l.font).match(/([\d.]+)px/) || [])[1] || '0') * c.shown;
          const room = c.kind.startsWith('plan') && words([l.t]).every(t => roomWords.has(t)), min = room ? MIN_ROOM_PX : MIN_PX;
          if (!smallest[w] || px < smallest[w].px) smallest[w] = { px, t: l.t, k, kind: c.kind };
          if (px < min) bad(`${c.kind} ${room ? 'room name ' : ''}"${l.t}" shown at ${px.toFixed(1)} px, under ${min}`);
        }
        for (const l of c.labels) {
          const o = [['left', -l.x0], ['right', l.x1 - c.W], ['top', -l.y0], ['bottom', l.y1 - c.H]].filter(([, v]) => v > TOL);
          for (const [e, v] of o) bad(`${c.kind} "${l.t}" runs ${Math.round(v)} px past the ${e} edge`);
        }
        const ls = c.labels;
        for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
          const a = ls[i], b = ls[j], ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
          if (ix > TOL && iy > TOL) bad(`${c.kind} "${a.t}" and "${b.t}" overlap by ${Math.round(ix)} x ${Math.round(iy)} px`);
        }
      }
      // every room named on the sheet's plans or in its room key, word by word, at every width
      const got = count(words([...Object.entries(drawn[w][k]).filter(([kind]) => kind.startsWith('plan')).flatMap(([, ls]) => ls.map(l => l.t)), key]));
      for (const [t, n] of Object.entries(count(words(ROOMS[k] || [])))) if ((got[t] || 0) < n) bad(`room name word "${t}" shown ${got[t] || 0} of ${n} times`);
    }
    // below 768 px, no plan note or room name crosses a wall. A plan's scale, px per ft, is read off its drawing (at 1
    // backing px per CSS px, as here): the size it traced a vol's tint at, the rect in a vol's proportions nearest the
    // scale its canvas's width rounds from; a plan with no vol (o25's undercroft) is drawn at the others' scale
    const scaleOf = ({ k, c }) => { const P = PLANS[k][+c.kind.slice(4)], v = P.view, near = c.W / (v.x1 - v.x0); let s = null;
      for (const [x0, y0, x1, y1] of P.vols) for (const [rw, rh] of c.rects) { const a = rw / (x1 - x0), b = rh / (y1 - y0);
        if (Math.abs(a - b) < 1e-9 * a && Math.abs(a - near) < 0.02 * near && (!s || Math.abs(a - near) < Math.abs(s - near))) s = a; }
      return s; };
    const found = plansAt.map(scaleOf), seen = new Set(found.filter(Boolean).map(s => +s.toFixed(4)));
    for (const [i, { k, c, bad }] of plansAt.entries()) {
      const P = PLANS[k][+c.kind.slice(4)], v = P.view, scale = found[i] || (seen.size === 1 ? found.find(Boolean) : null);
      if (!P.walls.length) continue;
      if (!scale) { bad(`${c.kind}: no scale found for the wall check`); continue; }
      const X = x => (x - v.x0) * scale, Y = y => (y - v.y0) * scale;
      for (const l of c.labels) {
        if (DIM.test(l.t) || P.stairs.has(l.t)) continue;
        // the N and the scale bar's figures, within the 12 px their placement may move them of their anchors
        if (P.marks.some(([t, x, y]) => t === l.t && X(x) >= l.x0 - 16 && X(x) <= l.x1 + 16 && Y(y) >= l.y0 - 16 && Y(y) <= l.y1 + 16)) continue;
        const hit = P.walls.map(([what, r]) => ({ what, ix: Math.min(l.x1, X(r[2])) - Math.max(l.x0, X(r[0])), iy: Math.min(l.y1, Y(r[3])) - Math.max(l.y0, Y(r[1])) }))
          .filter(h => h.ix > TOL && h.iy > TOL).sort((a, b) => Math.min(b.ix, b.iy) - Math.min(a.ix, a.iy));
        if (hit.length) bad(`${c.kind} "${l.t}" crosses ${hit.length > 1 ? hit.length + ' walls' : 'a wall'} (${[...new Set(hit.map(h => h.what))].join(', ')}), by ${hit[0].ix.toFixed(1)} x ${hit[0].iy.toFixed(1)} px`);
      }
    }
    if (seen.size) scales.push(`${w} ${[...seen].join(', ')}`);
    await ctx.close();
  }
  await browser.close();
  if (baseline) { fs.writeFileSync(BL, JSON.stringify(drawn[1320])); console.log(`wrote ${BL}: ${Object.keys(drawn[1320]).length} sheets at 1320`); return; }
  // the complete sheet from 768 px up: every label the baseline draws at 1320 is still drawn, on the same canvas
  if (fs.existsSync(BL)) {
    const b = JSON.parse(fs.readFileSync(BL, 'utf8'));
    for (const w of widths.filter(w => w >= FULL_FROM)) for (const [k, kinds] of Object.entries(b)) for (const [kind, bl] of Object.entries(kinds)) {
      if (!drawn[w][k]) continue;
      const got = count((drawn[w][k][kind] || []).map(l => l.t));
      for (const [t, n] of Object.entries(count(bl.map(l => l.t)))) if ((got[t] || 0) < n) { fails.push(`${k} at ${w}: ${kind} "${t}" drawn ${got[t] || 0} of ${n} times, against the 1320 baseline`); perW[w]++; }
      // at 1320 the published desktop sheet is unchanged: every label within 1 px of where the baseline drew it
      if (w !== 1320) continue;
      const left = [...(drawn[w][k][kind] || [])];
      for (const e of bl) {
        const i = left.findIndex(d => d.t === e.t && ['x0', 'y0', 'x1', 'y1'].every(p => Math.abs(d[p] - e[p]) <= 1));
        if (i < 0) { fails.push(`${k} at 1320: ${kind} "${e.t}" moved from where the baseline drew it`); perW[w]++; } else left.splice(i, 1);
      }
    }
  } else console.log('no labels-1320.json: run with --baseline first to guard the complete sheet');
  const n = Object.values(drawn).reduce((s, o) => s + Object.keys(o).length, 0);
  console.log(`${n} sheet openings at ${widths.length} widths; problems per width: ` + widths.map(w => `${w} ${perW[w]}`).join(', '));
  if (scales.length) console.log('plan scale for the wall check, px per ft: ' + scales.join('; '));
  console.log('smallest label on screen: ' + widths.map(w => smallest[w] ? `${w} ${smallest[w].px.toFixed(1)} px ("${smallest[w].t}", ${smallest[w].k} ${smallest[w].kind})` : `${w} -`).join('; '));
  if (fails.length) {
    fs.writeFileSync(path.join(__dirname, 'labels-report.txt'), fails.join('\n') + '\n');
    console.log(fails.slice(0, 40).join('\n') + (fails.length > 40 ? `\n... ${fails.length - 40} more in labels-report.txt` : ''));
    console.log(`FAIL: ${fails.length} problem(s)`); process.exit(1);
  }
  console.log('PASS: every label sits inside its drawing, clear of the others and, on a phone, of the walls, with every room named, at every width');
})();
